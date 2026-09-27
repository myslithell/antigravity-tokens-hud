#!/usr/bin/env bash

echo "🛑 Uninstalling Antigravity Tokens HUD..."

INSTALL_DIR="$HOME/.antigravity-tokens-hud"

if [[ "$OSTYPE" == "darwin"* ]]; then
  OLD_PLIST="$HOME/Library/LaunchAgents/com.google.antigravity.token-widget.plist"
  if [ -f "$OLD_PLIST" ]; then
    launchctl unload "$OLD_PLIST" 2>/dev/null || true
    rm -f "$OLD_PLIST"
  fi
  PLIST_FILE="$HOME/Library/LaunchAgents/com.antigravity.tokens-hud.plist"
  if [ -f "$PLIST_FILE" ]; then
    launchctl unload "$PLIST_FILE" 2>/dev/null || true
    rm -f "$PLIST_FILE"
    echo "✅ Removed macOS LaunchAgent."
  fi
elif [[ "$OSTYPE" == "linux"* ]]; then
  SERVICE_FILE="$HOME/.config/systemd/user/antigravity-tokens-hud.service"
  if [ -f "$SERVICE_FILE" ]; then
    systemctl --user stop antigravity-tokens-hud.service 2>/dev/null || true
    systemctl --user disable antigravity-tokens-hud.service 2>/dev/null || true
    rm -f "$SERVICE_FILE"
    systemctl --user daemon-reload 2>/dev/null || true
    echo "✅ Removed Linux systemd service."
  fi
fi

# Kill any leftover running daemon process
pkill -f "sidebar_widget.js" 2>/dev/null || true
pkill -f "antigravity-tokens-hud/index.js" 2>/dev/null || true

if [ -d "$INSTALL_DIR" ]; then
  rm -rf "$INSTALL_DIR"
  echo "✅ Removed $INSTALL_DIR."
fi

echo "✨ Antigravity Tokens HUD completely uninstalled."
