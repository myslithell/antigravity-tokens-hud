#!/usr/bin/env bash
set -e

REPO_RAW_URL="https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main"
INSTALL_DIR="$HOME/.antigravity-tokens-hud"

echo "=========================================="
echo "  🚀 Antigravity Tokens HUD Installer     "
echo "  Real-time Token & Quota Visualizer      "
echo "=========================================="
echo ""

# 1. Check Antigravity 2.0
echo "🔍 Checking for Google Antigravity 2.0..."
IS_INSTALLED=0

if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ -d "/Applications/Antigravity.app" ] || [ -d "$HOME/Applications/Antigravity.app" ] || [ -d "$HOME/Library/Application Support/Antigravity" ]; then
    IS_INSTALLED=1
  fi
else
  if command -v antigravity >/dev/null 2>&1 || [ -d "$HOME/.config/Antigravity" ] || [ -d "/opt/Antigravity" ]; then
    IS_INSTALLED=1
  fi
fi

if [ $IS_INSTALLED -eq 0 ]; then
  echo ""
  echo "❌ Google Antigravity 2.0 is not installed! / Antigravity 2.0 не установлена!"
  echo "👉 Please install Antigravity 2.0 first: https://antigravity.google/download"
  echo "   После установки запустите этот скрипт снова."
  echo ""
  exit 1
fi
echo "✅ Antigravity 2.0 detected."

# 2. Check and automatically install Node.js
echo "🔍 Checking Node.js..."
NEED_NODE_INSTALL=0
NEED_NODE_UPDATE=0

if ! command -v node >/dev/null 2>&1; then
  NEED_NODE_INSTALL=1
else
  NODE_VER=$(node -v | sed 's/v//' | cut -d'.' -f1)
  if [ "$NODE_VER" -lt 18 ]; then
    NEED_NODE_UPDATE=1
  fi
fi

if [ $NEED_NODE_INSTALL -eq 1 ]; then
  echo "⚠️ Node.js is not installed. Starting automatic installation..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew >/dev/null 2>&1; then
      echo "🍺 Installing Node.js via Homebrew..."
      brew install node
    else
      echo "⬇️ Downloading and extracting standalone Node.js LTS..."
      ARCH="$(uname -m)"
      [ "$ARCH" = "x86_64" ] && ARCH="x64"
      NODE_LTS="v20.18.0"
      mkdir -p "$INSTALL_DIR/node"
      curl -fsSL "https://nodejs.org/dist/$NODE_LTS/node-$NODE_LTS-darwin-$ARCH.tar.gz" | tar -xz -C "$INSTALL_DIR/node" --strip-components=1
      export PATH="$INSTALL_DIR/node/bin:$PATH"
    fi
  elif [[ "$OSTYPE" == "linux"* ]]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y nodejs npm || true
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y nodejs || true
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm nodejs npm || true
    fi
    if ! command -v node >/dev/null 2>&1; then
      ARCH="$(uname -m)"
      [ "$ARCH" = "x86_64" ] && ARCH="x64"
      [ "$ARCH" = "aarch64" ] && ARCH="arm64"
      NODE_LTS="v20.18.0"
      mkdir -p "$INSTALL_DIR/node"
      curl -fsSL "https://nodejs.org/dist/$NODE_LTS/node-$NODE_LTS-linux-$ARCH.tar.gz" | tar -xz -C "$INSTALL_DIR/node" --strip-components=1
      export PATH="$INSTALL_DIR/node/bin:$PATH"
    fi
  fi
elif [ $NEED_NODE_UPDATE -eq 1 ]; then
  echo "⚠️ Legacy Node.js version detected ($(node -v)). v18+ is recommended."
  REPLY="y"
  if [ -e /dev/tty ]; then
    read -p "Would you like to update Node.js now? [Y/n] " -r REPLY < /dev/tty || REPLY="y"
  fi
  if [[ "$REPLY" =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null 2>&1; then
      brew upgrade node || brew install node
    else
      echo "⬇️ Downloading latest Node.js LTS to isolated directory..."
      ARCH="$(uname -m)"
      [ "$ARCH" = "x86_64" ] && ARCH="x64"
      NODE_LTS="v20.18.0"
      mkdir -p "$INSTALL_DIR/node"
      curl -fsSL "https://nodejs.org/dist/$NODE_LTS/node-$NODE_LTS-darwin-$ARCH.tar.gz" | tar -xz -C "$INSTALL_DIR/node" --strip-components=1
      export PATH="$INSTALL_DIR/node/bin:$PATH"
    fi
  fi
fi

if ! command -v node >/dev/null 2>&1 && [ ! -f "$INSTALL_DIR/node/bin/node" ]; then
  echo "❌ Automatic Node.js installation failed. Please install manually: https://nodejs.org/"
  exit 1
fi
[ -f "$INSTALL_DIR/node/bin/node" ] && export PATH="$INSTALL_DIR/node/bin:$PATH"
echo "✅ Node.js ($(node -v)) ready."

# 3. Check and automatically install Python 3
echo "🔍 Checking Python 3..."
NEED_PY_INSTALL=0
NEED_PY_UPDATE=0

if ! command -v python3 >/dev/null 2>&1; then
  NEED_PY_INSTALL=1
else
  PY_MAJOR=$(python3 -c "import sys; print(sys.version_info.major)" 2>/dev/null || echo "0")
  PY_MINOR=$(python3 -c "import sys; print(sys.version_info.minor)" 2>/dev/null || echo "0")
  if [ "$PY_MAJOR" -lt 3 ] || ([ "$PY_MAJOR" -eq 3 ] && [ "$PY_MINOR" -lt 8 ]); then
    NEED_PY_UPDATE=1
  fi
fi

if [ $NEED_PY_INSTALL -eq 1 ]; then
  echo "⚠️ Python 3 is not installed. Starting automatic installation..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew >/dev/null 2>&1; then
      echo "🍺 Installing Python 3 via Homebrew..."
      brew install python3
    else
      echo "🍎 Starting macOS developer tools installation (includes python3)..."
      xcode-select --install 2>/dev/null || true
    fi
  elif [[ "$OSTYPE" == "linux"* ]]; then
    if command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y python3 || true
    elif command -v dnf >/dev/null 2>&1; then
      sudo dnf install -y python3 || true
    elif command -v pacman >/dev/null 2>&1; then
      sudo pacman -Sy --noconfirm python || true
    fi
  fi
elif [ $NEED_PY_UPDATE -eq 1 ]; then
  echo "⚠️ Legacy Python version detected ($(python3 --version 2>&1)). 3.8+ is recommended."
  REPLY="y"
  if [ -e /dev/tty ]; then
    read -p "Would you like to update Python 3 now? [Y/n] " -r REPLY < /dev/tty || REPLY="y"
  fi
  if [[ "$REPLY" =~ ^[Yy]$ ]] || [ -z "$REPLY" ]; then
    if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null 2>&1; then
      brew upgrade python3 || brew install python3
    elif [[ "$OSTYPE" == "linux"* ]] && command -v apt-get >/dev/null 2>&1; then
      sudo apt-get update && sudo apt-get install -y python3
    fi
  fi
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "❌ Automatic Python 3 installation failed. Please install manually: https://www.python.org/downloads/"
  exit 1
fi
echo "✅ Python 3 ($(python3 --version | cut -d' ' -f2)) ready."

# 4. Install files
echo "📦 Installing files to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
if [ -f "$SCRIPT_DIR/index.js" ] && [ -f "$SCRIPT_DIR/client_widget.js" ] && [ -f "$SCRIPT_DIR/token_stats.py" ]; then
  # Local copy
  cp "$SCRIPT_DIR/index.js" "$INSTALL_DIR/"
  cp "$SCRIPT_DIR/client_widget.js" "$INSTALL_DIR/"
  cp "$SCRIPT_DIR/token_stats.py" "$INSTALL_DIR/"
  cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/" 2>/dev/null || true
  cp "$SCRIPT_DIR/uninstall.sh" "$INSTALL_DIR/" 2>/dev/null || true
else
  # Remote download via curl
  echo "⬇️ Downloading latest release files..."
  curl -fsSL "$REPO_RAW_URL/index.js" -o "$INSTALL_DIR/index.js"
  curl -fsSL "$REPO_RAW_URL/client_widget.js" -o "$INSTALL_DIR/client_widget.js"
  curl -fsSL "$REPO_RAW_URL/token_stats.py" -o "$INSTALL_DIR/token_stats.py"
  curl -fsSL "$REPO_RAW_URL/package.json" -o "$INSTALL_DIR/package.json" || true
  curl -fsSL "$REPO_RAW_URL/uninstall.sh" -o "$INSTALL_DIR/uninstall.sh" || true
fi

chmod +x "$INSTALL_DIR/index.js"
chmod +x "$INSTALL_DIR/token_stats.py"
[ -f "$INSTALL_DIR/uninstall.sh" ] && chmod +x "$INSTALL_DIR/uninstall.sh"
echo '{"lang":"en"}' > "$INSTALL_DIR/config.json"

# 5. Setup Autostart Service
echo "⚙️ Configuring background autostart service..."

NODE_PATH="$(command -v node)"

if [[ "$OSTYPE" == "darwin"* ]]; then
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$PLIST_DIR/com.antigravity.tokens-hud.plist"
  mkdir -p "$PLIST_DIR"

  # Unload previous version if running
  launchctl unload "$PLIST_FILE" 2>/dev/null || true

  cat <<EOF > "$PLIST_FILE"
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.antigravity.tokens-hud</string>
    <key>ProgramArguments</key>
    <array>
        <string>$NODE_PATH</string>
        <string>$INSTALL_DIR/index.js</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/antigravity-tokens-hud.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/antigravity-tokens-hud.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$INSTALL_DIR/node/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.nvm/versions/node/$(node -v 2>/dev/null)/bin:$PATH</string>
    </dict>
</dict>
</plist>
EOF

  launchctl load -w "$PLIST_FILE"
  echo "✅ macOS LaunchAgent registered and started."

elif [[ "$OSTYPE" == "linux"* ]]; then
  SERVICE_DIR="$HOME/.config/systemd/user"
  SERVICE_FILE="$SERVICE_DIR/antigravity-tokens-hud.service"
  mkdir -p "$SERVICE_DIR"

  cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=Antigravity Tokens HUD Daemon
After=network.target

[Service]
Type=simple
ExecStart=$NODE_PATH $INSTALL_DIR/index.js
Restart=always
RestartSec=3
Environment=PATH=$INSTALL_DIR/node/bin:/usr/local/bin:/usr/bin:/bin:$PATH

[Install]
WantedBy=default.target
EOF

  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user daemon-reload
    systemctl --user enable --now antigravity-tokens-hud.service 2>/dev/null || true
    echo "✅ Linux systemd user service enabled and started."
  else
    # Fallback to background process
    nohup "$NODE_PATH" "$INSTALL_DIR/index.js" > /tmp/antigravity-tokens-hud.log 2>&1 &
    echo "✅ Background daemon started (PID: $!)."
  fi
fi

echo ""
echo "=========================================="
echo "🎉 SUCCESS! Antigravity Tokens HUD is ready!"
echo "✨ Open or focus Antigravity 2.0 — the HUD is right above Settings."
echo "🗑️ To uninstall anytime, run: ~/.antigravity-tokens-hud/uninstall.sh"
echo "=========================================="
