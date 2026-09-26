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
const CLIENT_SCRIPT_PATH = path.join(__dirname, "client_widget.js");

let currentWs = null;
let currentPort = null;
let isUpdating = false;

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

async function findAntigravityPage(port) {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(1500) });
    const list = await res.json();
    const page = list.find(p => p.type === "page" && p.url && (p.url.includes("127.0.0.1") || p.url.includes("localhost")));
    return page || list.find(p => p.type === "page");
  } catch (_) {
    return null;
  }
}

function fetchTokenStats() {
  return new Promise((resolve) => {
    execFile("python3", [TOKEN_STATS_SCRIPT, "--json"], (err, stdout) => {
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

function connectWebSocket(wsUrl) {
  return new Promise((resolve) => {
    try {
      const ws = new WebSocket(wsUrl);
      ws.onopen = () => resolve(ws);
      ws.onerror = () => resolve(null);
      ws.onclose = () => {
        if (currentWs === ws) currentWs = null;
      };
    } catch (_) {
      resolve(null);
    }
  });
}

async function updateLoop() {
  if (isUpdating) return;
  isUpdating = true;

  try {
    const info = getDevToolsInfo();
    if (!info) {
      if (currentWs) {
        try { currentWs.close(); } catch (_) {}
        currentWs = null;
      }
      isUpdating = false;
      return;
    }

    if (!currentWs || currentPort !== info.port || currentWs.readyState !== WebSocket.OPEN) {
      currentPort = info.port;
      const page = await findAntigravityPage(currentPort);
      if (!page || !page.webSocketDebuggerUrl) {
        isUpdating = false;
        return;
      }

      currentWs = await connectWebSocket(page.webSocketDebuggerUrl);
      if (!currentWs) {
        isUpdating = false;
        return;
      }
    }

    const stats = await fetchTokenStats();
    if (stats && currentWs && currentWs.readyState === WebSocket.OPEN) {
      let clientScript = "";
      try {
        clientScript = fs.readFileSync(CLIENT_SCRIPT_PATH, "utf8");
      } catch (_) {}

      const payload = JSON.stringify(stats);
      const evalCode = `
        window.__AGY_DATA__ = ${payload};
        ${clientScript}
      `;

      currentWs.send(JSON.stringify({
        id: Date.now(),
        method: "Runtime.evaluate",
        params: {
          expression: evalCode,
          returnByValue: false
        }
      }));
    }
  } catch (_) {
    if (currentWs) {
      try { currentWs.close(); } catch (_) {}
      currentWs = null;
    }
  } finally {
    isUpdating = false;
  }
}

console.log("[Antigravity Tokens HUD] Daemon started. Monitoring DevTools on port...");
setInterval(updateLoop, 1500);
updateLoop();
