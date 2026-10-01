#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile } = require("child_process");

function getDevToolsFilePath() {
  const home = os.homedir();
  if (process.platform === "darwin") {
    return path.join(home, "Library/Application Support/Antigravity/DevToolsActivePort");
  } else if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(home, "AppData/Roaming");
    return path.join(appData, "Antigravity/DevToolsActivePort");
  } else {
    const configHome = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
    return path.join(configHome, "Antigravity/DevToolsActivePort");
  }
}

const DEVTOOLS_FILE = getDevToolsFilePath();
const TOKEN_STATS_SCRIPT = path.join(__dirname, "token_stats.py");
const CLIENT_SCRIPT_PATH = fs.existsSync(path.join(__dirname, "client_widget.js"))
  ? path.join(__dirname, "client_widget.js")
  : path.join(__dirname, "client_widget_injector.js");
const CONFIG_FILE = path.join(__dirname, "config.json");

let cdpMessageId = 1;
function nextCdpId() {
  cdpMessageId = (cdpMessageId + 1) & 0x7fffffff;
  return cdpMessageId;
}

// Map of pageId -> { ws, injected: boolean, url: string }
const activePages = new Map();
let currentPort = null;
let isUpdating = false;

function getConfigLang() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && cfg.lang) return cfg.lang;
    }
  } catch (_) {}
  return "en";
}

function getDevToolsInfo() {
  if (!fs.existsSync(DEVTOOLS_FILE)) return null;
  try {
    const content = fs.readFileSync(DEVTOOLS_FILE, "utf8").trim().split("\n");
    if (content.length >= 1 && content[0]) {
      return { port: parseInt(content[0].trim(), 10) };
    }
  } catch (_) {}
  return null;
}

async function listAntigravityPages(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) });
    const list = await res.json();
    return list.filter(p => p.type === "page" && p.url && (p.url.includes("127.0.0.1") || p.url.includes("localhost") || p.url.includes("antigravity")));
  } catch (_) {
    return [];
  }
}

function fetchTokenStats() {
  return new Promise((resolve) => {
    const pythonBin = process.platform === "win32" ? "python" : "python3";
    const env = { ...process.env };
    if (process.platform !== "win32") {
      env.PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":");
    }
    execFile(pythonBin, [TOKEN_STATS_SCRIPT, "--json"], { timeout: 10000, env }, (err, stdout) => {
      if (err || !stdout) {
        resolve(null);
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (_) {
        resolve(null);
      }
    });
  });
}

function connectPageWebSocket(page) {
  return new Promise((resolve) => {
    let resolved = false;
    let ws = null;
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { if (ws) ws.close(); } catch (_) {}
        resolve(null);
      }
    }, 2000);

    try {
      ws = new WebSocket(page.webSocketDebuggerUrl);
      const entry = { ws, injected: false, pageId: page.id, url: page.url };

      ws.onopen = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          activePages.set(page.id, entry);
          resolve(entry);
        }
      };

      ws.onmessage = (msg) => {
        try {
          const data = JSON.parse(msg.data);
          if (data.error) {
            const msgText = data.error.message || "";
            if (msgText.includes("execution context") || msgText.includes("detached") || msgText.includes("Target closed")) {
              entry.injected = false;
              try { ws.close(); } catch (_) {}
              activePages.delete(page.id);
            }
          }
        } catch (_) {}
      };

      ws.onerror = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timer);
          resolve(null);
        }
        activePages.delete(page.id);
      };

      ws.onclose = () => {
        activePages.delete(page.id);
      };
    } catch (_) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve(null);
      }
    }
  });
}

async function updateLoop() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const info = getDevToolsInfo();
    if (!info) {
      for (const [id, entry] of activePages) {
        try { entry.ws.close(); } catch (_) {}
      }
      activePages.clear();
      return;
    }

    if (currentPort !== info.port) {
      currentPort = info.port;
      for (const [id, entry] of activePages) {
        try { entry.ws.close(); } catch (_) {}
      }
      activePages.clear();
    }

    const pages = await listAntigravityPages(currentPort);
    const currentPageIds = new Set(pages.map(p => p.id));

    // Remove dead pages
    for (const [id, entry] of activePages) {
      if (!currentPageIds.has(id)) {
        try { entry.ws.close(); } catch (_) {}
        activePages.delete(id);
      }
    }

    // Connect new pages
    for (const page of pages) {
      const existing = activePages.get(page.id);
      if (!existing || existing.ws.readyState !== WebSocket.OPEN) {
        if (existing) {
          try { existing.ws.close(); } catch (_) {}
          activePages.delete(page.id);
        }
        await connectPageWebSocket(page);
      }
    }

    if (activePages.size === 0) return;

    const stats = await fetchTokenStats();
    if (!stats) return;

    let clientScript = "";
    try {
      clientScript = fs.readFileSync(CLIENT_SCRIPT_PATH, "utf8");
    } catch (_) {}

    const lang = getConfigLang();
    const payload = JSON.stringify(stats);

    for (const [id, entry] of activePages) {
      if (entry.ws.readyState !== WebSocket.OPEN) continue;

      let evalCode = "";
      if (!entry.injected) {
        evalCode = `
          window.__AGY_DATA__ = ${payload};
          window.__AGY_LANG__ = ${JSON.stringify(lang)};
          ${clientScript}
        `;
        entry.injected = true;
      } else {
        evalCode = `
          window.__AGY_DATA__ = ${payload};
          window.__AGY_LANG__ = ${JSON.stringify(lang)};
          if (window.__AGY_RENDER__) {
            window.__AGY_RENDER__();
          } else {
            ${clientScript}
          }
        `;
      }

      entry.ws.send(JSON.stringify({
        id: nextCdpId(),
        method: "Runtime.evaluate",
        params: {
          expression: evalCode,
          returnByValue: false
        }
      }));
    }
  } catch (_) {
    // Non-fatal, retry next tick
  } finally {
    isUpdating = false;
  }
}

console.log("[Antigravity Tokens HUD] Daemon running. Monitoring Antigravity DevTools...");
setInterval(updateLoop, 1000);
updateLoop();
