#!/usr/bin/env bash
set -e

REPO_RAW_URL="https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main"
INSTALL_DIR="$HOME/.antigravity-tokens-hud"

echo "=========================================="
echo "  🚀 Antigravity Tokens HUD (Русская версия)"
echo "  Виджет контекста и лимитов в реальном времени"
echo "=========================================="
echo ""

# 1. Проверка Antigravity 2.0
echo "🔍 Проверка наличия Google Antigravity 2.0..."
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
  echo "❌ Google Antigravity 2.0 не найдена!"
  echo "👉 Пожалуйста, сначала установите Antigravity 2.0: https://antigravity.google/download"
  echo "   После установки запустите этот скрипт снова."
  echo ""
  exit 1
fi
echo "✅ Antigravity 2.0 обнаружена."

# 2. Проверка Node.js
echo "🔍 Проверка Node.js..."
if ! command -v node >/dev/null 2>&1; then
  echo ""
  echo "❌ Для работы требуется Node.js, но он не установлен!"
  echo "👉 Установите Node.js (рекомендуется v18+): https://nodejs.org/"
  if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null 2>&1; then
    echo "💡 Или выполните: brew install node"
  fi
  echo ""
  exit 1
fi
echo "✅ Node.js $(node -v) обнаружен."

# 3. Проверка Python 3
echo "🔍 Проверка Python 3..."
if ! command -v python3 >/dev/null 2>&1; then
  echo ""
  echo "❌ Для работы требуется Python 3, но он не установлен!"
  echo "👉 Установите Python 3: https://www.python.org/downloads/"
  if [[ "$OSTYPE" == "darwin"* ]] && command -v brew >/dev/null 2>&1; then
    echo "💡 Или выполните: brew install python3"
  fi
  echo ""
  exit 1
fi
echo "✅ Python 3 $(python3 --version | cut -d' ' -f2) обнаружен."

# 4. Установка файлов
echo "📦 Установка файлов в $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" 2>/dev/null && pwd || echo "")"
if [ -f "$SCRIPT_DIR/index.js" ] && [ -f "$SCRIPT_DIR/client_widget.js" ] && [ -f "$SCRIPT_DIR/token_stats.py" ]; then
  # Локальное копирование
  cp "$SCRIPT_DIR/index.js" "$INSTALL_DIR/"
  cp "$SCRIPT_DIR/client_widget.js" "$INSTALL_DIR/"
  cp "$SCRIPT_DIR/token_stats.py" "$INSTALL_DIR/"
  cp "$SCRIPT_DIR/package.json" "$INSTALL_DIR/" 2>/dev/null || true
  cp "$SCRIPT_DIR/uninstall.sh" "$INSTALL_DIR/" 2>/dev/null || true
else
  # Загрузка через curl
  echo "⬇️ Загрузка актуальных файлов..."
  curl -fsSL "$REPO_RAW_URL/index.js" -o "$INSTALL_DIR/index.js"
  curl -fsSL "$REPO_RAW_URL/client_widget.js" -o "$INSTALL_DIR/client_widget.js"
  curl -fsSL "$REPO_RAW_URL/token_stats.py" -o "$INSTALL_DIR/token_stats.py"
  curl -fsSL "$REPO_RAW_URL/package.json" -o "$INSTALL_DIR/package.json" || true
  curl -fsSL "$REPO_RAW_URL/uninstall.sh" -o "$INSTALL_DIR/uninstall.sh" || true
fi

chmod +x "$INSTALL_DIR/index.js"
chmod +x "$INSTALL_DIR/token_stats.py"
[ -f "$INSTALL_DIR/uninstall.sh" ] && chmod +x "$INSTALL_DIR/uninstall.sh"
echo '{"lang":"ru"}' > "$INSTALL_DIR/config.json"

# 5. Настройка автозапуска
echo "⚙️ Настройка автозапуска демона..."

NODE_PATH="$(command -v node)"

if [[ "$OSTYPE" == "darwin"* ]]; then
  PLIST_DIR="$HOME/Library/LaunchAgents"
  PLIST_FILE="$PLIST_DIR/com.antigravity.tokens-hud.plist"
  mkdir -p "$PLIST_DIR"

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
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$HOME/.nvm/versions/node/$(node -v)/bin:$PATH</string>
    </dict>
</dict>
</plist>
EOF

  launchctl load -w "$PLIST_FILE"
  echo "✅ macOS LaunchAgent зарегистрирован и запущен."

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
Environment=PATH=/usr/local/bin:/usr/bin:/bin:$PATH

[Install]
WantedBy=default.target
EOF

  if command -v systemctl >/dev/null 2>&1; then
    systemctl --user daemon-reload
    systemctl --user enable --now antigravity-tokens-hud.service 2>/dev/null || true
    echo "✅ Linux systemd сервис включен и запущен."
  else
    nohup "$NODE_PATH" "$INSTALL_DIR/index.js" > /tmp/antigravity-tokens-hud.log 2>&1 &
    echo "✅ Фоновый демон запущен (PID: $!)."
  fi
fi

echo ""
echo "=========================================="
echo "🎉 УСПЕШНО! Antigravity Tokens HUD установлен!"
echo "✨ Откройте Antigravity 2.0 — виджет активен над кнопкой Settings."
echo "💡 Клик по виджету переключает язык (RU / EN) на лету."
echo "🗑️ Для удаления выполните: ~/.antigravity-tokens-hud/uninstall.sh"
echo "=========================================="
