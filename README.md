# Antigravity Tokens HUD

<p align="center">
  <img src="assets/preview.png" alt="Antigravity Tokens HUD Preview" width="340" />
</p>

<p align="center">
  <b>Minimalistic real-time context & quota HUD embedded into Google Antigravity 2.0 sidebar.</b>
  <br />
  <a href="README.ru.md">🇷🇺 Читать на русском</a>
</p>

---

## ⚡ What is it?

**Antigravity Tokens HUD** adds a clean, native-feeling status bar directly above the **Settings** button in Google Antigravity 2.0:

1. **Active Model & Context Window**: Current session token usage and fill percentage (e.g. `gemini-3.8-flash 2.7% (26k/1M)`), filling left-to-right in solid emerald. Automatically updates when switching between conversations with zero latency.
2. **5-Hour Quota Remaining**: Real-time remaining percentage and time left until reset (e.g. `5-Hour 77% (3h 50m)`), shrinking smoothly in muted slate.
3. **Weekly Quota Remaining**: Exact weekly allowance status (e.g. `Weekly 96% (6d 22h)`).

Designed to be lightweight, distraction-free, and always visible where you need it.

---

## 🎯 Requirements

- **[Google Antigravity 2.0](https://antigravity.google/download)**
- **Node.js** (v18 or higher)
- **Python 3** (uses standard libraries only — zero pip dependencies)

---

## 🚀 1-Minute Quick Install

### macOS / Linux

Run in your Terminal:
```bash
curl -fsSL https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main/install.sh | bash
```

### Windows (PowerShell)

Run in PowerShell:
```powershell
irm https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main/install.ps1 | iex
```

> **That's it!** Launch or open Antigravity 2.0 — the HUD is immediately active. The background service autostarts with your system.

---

## 🛠 Manual Installation

If you prefer to clone and inspect the source code:

```bash
git clone https://github.com/myslithell/antigravity-tokens-hud.git
cd antigravity-tokens-hud
bash install.sh
```

---

## 🗑️ Uninstallation

### macOS / Linux
```bash
~/.antigravity-tokens-hud/uninstall.sh
```

### Windows
```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.antigravity-tokens-hud\uninstall.ps1"
```

---

## 📄 License

MIT © [myslithell](https://github.com/myslithell)
