#!/usr/bin/env node

/**
 * Antigravity Tokens HUD - Background Daemon (v1.1.1)
 * Injects token & quota monitors into Antigravity 2.0 via Chrome DevTools Protocol.
 * Responds dynamically to enabled/disabled states and self-uninstalls cleanly on plugin removal.
 */

const fs = require("fs");
const path = require("path");
const os = require("os");
const { execFile, spawn } = require("child_process");

// Global fail-safe: prevent process from ever terminating unexpectedly
process.on("uncaughtException", (err) => {
  // Silent fail-safe
});
process.on("unhandledRejection", (reason) => {
  // Silent fail-safe
});

const home = os.homedir();
const OFFICIAL_PLUGIN_DIR = path.join(home, ".gemini", "config", "plugins", "antigravity-tokens-hud");
const CONFIG_JSON_PATH = path.join(home, ".gemini", "config", "config.json");
const PID_FILE = path.join(__dirname, "daemon.pid");

// Single instance enforcement: kill previous instance if running
try {
  if (fs.existsSync(PID_FILE)) {
    const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
    if (!isNaN(oldPid) && oldPid !== process.pid) {
      try { process.kill(oldPid, "SIGTERM"); } catch (_) {}
    }
  }
  fs.writeFileSync(PID_FILE, String(process.pid), "utf8");
} catch (_) {}

function getDevToolsFilePath() {
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

function findPythonBinary() {
  if (process.platform === "win32") {
    const directCandidates = [
      path.join(process.env.LOCALAPPDATA || "", "Programs", "Python", "Python312", "python.exe"),
      "C:\\Users\\cared\\AppData\\Local\\Programs\\Python\\Python312\\python.exe"
    ];
    for (const cand of directCandidates) {
      if (cand && fs.existsSync(cand)) return cand;
    }

    const baseDir = path.join(process.env.LOCALAPPDATA || "", "Programs", "Python");
    if (fs.existsSync(baseDir)) {
      try {
        const subdirs = fs.readdirSync(baseDir);
        for (const sub of subdirs) {
          const cand = path.join(baseDir, sub, "python.exe");
          if (fs.existsSync(cand)) return cand;
        }
      } catch (_) {}
    }
    return "python";
  }
  return "python3";
}

const DEVTOOLS_FILE = getDevToolsFilePath();
const TOKEN_STATS_SCRIPT = path.join(__dirname, "token_stats.py");
const CLIENT_SCRIPT_PATH = fs.existsSync(path.join(__dirname, "client_widget.js"))
  ? path.join(__dirname, "client_widget.js")
  : path.join(__dirname, "client_widget_injector.js");
const CONFIG_FILE = path.join(__dirname, "config.json");
const PYTHON_BIN = findPythonBinary();

let cdpMessageId = 1;
function nextCdpId() {
  cdpMessageId = (cdpMessageId + 1) & 0x7fffffff;
  return cdpMessageId;
}

// Map of pageId -> { ws, pageId, url }
const activePages = new Map();
let currentPort = null;
let isUpdating = false;

// Check if plugin is installed in Antigravity Customizations
function isPluginInstalled() {
  try {
    return fs.existsSync(OFFICIAL_PLUGIN_DIR);
  } catch (_) {
    return true; // fail-safe: assume installed if check fails
  }
}

// Check if plugin is enabled in config.json
let cachedConfigState = { enabled: true, lastMtime: 0 };
function isPluginEnabled() {
  try {
    if (!fs.existsSync(CONFIG_JSON_PATH)) return true;
    const stat = fs.statSync(CONFIG_JSON_PATH);
    if (stat.mtimeMs === cachedConfigState.lastMtime) {
      return cachedConfigState.enabled;
    }
    cachedConfigState.lastMtime = stat.mtimeMs;
    const content = fs.readFileSync(CONFIG_JSON_PATH, "utf8");
    const cfg = JSON.parse(content);
    if (cfg && cfg.plugins && cfg.plugins["antigravity-tokens-hud"]) {
      cachedConfigState.enabled = cfg.plugins["antigravity-tokens-hud"].enabled !== false;
    } else {
      cachedConfigState.enabled = true;
    }
  } catch (_) {}
  return cachedConfigState.enabled;
}

function getConfigLang() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const cfg = JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
      if (cfg && cfg.lang) return cfg.lang;
    }
  } catch (_) {}
  return "es";
}

function getDevToolsInfo() {
  if (!fs.existsSync(DEVTOOLS_FILE)) return null;
  try {
    const content = fs.readFileSync(DEVTOOLS_FILE, "utf8").trim().split("\n");
    if (content.length >= 1 && content[0]) {
      const port = parseInt(content[0].trim(), 10);
      if (!isNaN(port) && port > 0) return { port };
    }
  } catch (_) {}
  return null;
}

async function listAntigravityPages(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) });
    if (!res.ok) return [];
    const list = await res.json();
    return list.filter(p => p.type === "page" && p.url && (p.url.includes("127.0.0.1") || p.url.includes("localhost") || p.url.includes("antigravity")));
  } catch (_) {
    return [];
  }
}

function fetchTokenStats() {
  return new Promise((resolve) => {
    const env = { ...process.env };
    if (process.platform !== "win32") {
      env.PATH = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", process.env.PATH || ""].join(":");
    }
    execFile(PYTHON_BIN, [TOKEN_STATS_SCRIPT, "--json"], { timeout: 8000, env }, (err, stdout) => {
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
      const entry = { ws, pageId: page.id, url: page.url };

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

function cleanupPages() {
  for (const [id, entry] of activePages) {
    try { entry.ws.close(); } catch (_) {}
  }
  activePages.clear();
}

async function cleanWidgetFromAllPages() {
  const cleanupExpr = `
    (() => {
      window.__AGY_ENABLED__ = false;
      if (window.__AGY_CLEANUP__) {
        try { window.__AGY_CLEANUP__(); } catch (_) {}
      }
      const w = document.getElementById("antigravity-token-widget");
      if (w) w.remove();
      const p = document.getElementById("agy-hud-popover");
      if (p) p.remove();
    })();
  `;

  for (const [id, entry] of activePages) {
    if (entry.ws.readyState !== WebSocket.OPEN) continue;
    try {
      entry.ws.send(JSON.stringify({
        id: nextCdpId(),
        method: "Runtime.evaluate",
        params: {
          expression: cleanupExpr,
          returnByValue: false
        }
      }));
    } catch (_) {
      activePages.delete(id);
    }
  }
}

async function handleCompleteSelfUninstall() {
  console.log("[Antigravity Tokens HUD] Plugin directory removed. Executing complete self-uninstallation...");

  // 1. Clean widget from Antigravity DOM
  await cleanWidgetFromAllPages();
  cleanupPages();

  // 2. Remove Windows Startup entries
  if (process.platform === "win32") {
    try {
      const startupFolder = path.join(process.env.APPDATA || "", "Microsoft/Windows/Start Menu/Programs/Startup");
      const vbsFile = path.join(startupFolder, "antigravity-tokens-hud.vbs");
      const lnkFile = path.join(startupFolder, "Antigravity Tokens HUD.lnk");
      if (fs.existsSync(vbsFile)) fs.unlinkSync(vbsFile);
      if (fs.existsSync(lnkFile)) fs.unlinkSync(lnkFile);
    } catch (_) {}

    try {
      execFile("reg.exe", ["delete", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run", "/v", "Antigravity Tokens HUD", "/f"], () => {});
    } catch (_) {}

    // 3. Schedule self folder deletion after process exits
    const installDir = path.join(home, ".antigravity-tokens-hud");
    const cmd = `timeout /t 2 /nobreak >nul & rmdir /s /q "${installDir}"`;
    try {
      const child = spawn("cmd.exe", ["/c", cmd], {
        detached: true,
        stdio: "ignore",
        windowsHide: true
      });
      child.unref();
    } catch (_) {}
  }

  process.exit(0);
}

async function updateLoop() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    // Check 1: Has the plugin been uninstalled/removed from Customizations?
    if (!isPluginInstalled()) {
      await handleCompleteSelfUninstall();
      return;
    }

    const info = getDevToolsInfo();
    if (!info) {
      if (activePages.size > 0) cleanupPages();
      currentPort = null;
      return;
    }

    if (currentPort !== info.port) {
      cleanupPages();
      currentPort = info.port;
    }

    const pages = await listAntigravityPages(currentPort);
    if (!pages || pages.length === 0) {
      if (activePages.size > 0) cleanupPages();
      return;
    }

    const currentPageIds = new Set(pages.map(p => p.id));

    // Remove closed pages
    for (const [id, entry] of activePages) {
      if (!currentPageIds.has(id)) {
        try { entry.ws.close(); } catch (_) {}
        activePages.delete(id);
      }
    }

    // Connect any new pages
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

    // Check 2: Has the plugin been disabled (Toggle OFF) in Customizations?
    const enabled = isPluginEnabled();
    if (!enabled) {
      // Clean widget from DOM and skip calling Python / stats
      await cleanWidgetFromAllPages();
      return;
    }

    // Normal operation: plugin is enabled
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

      const evalCode = `
        window.__AGY_ENABLED__ = true;
        window.__AGY_DATA__ = ${payload};
        window.__AGY_LANG__ = ${JSON.stringify(lang)};
        ${clientScript}
      `;

      try {
        entry.ws.send(JSON.stringify({
          id: nextCdpId(),
          method: "Runtime.evaluate",
          params: {
            expression: evalCode,
            returnByValue: false
          }
        }));
      } catch (_) {
        activePages.delete(id);
      }
    }
  } catch (_) {
    // Silent fail-safe
  } finally {
    isUpdating = false;
  }
}

console.log("[Antigravity Tokens HUD] Daemon running. Python:", PYTHON_BIN);
setInterval(updateLoop, 1000);
updateLoop();
