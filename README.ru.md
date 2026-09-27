# Antigravity Tokens HUD

<p align="center">
  <img src="assets/preview.png" alt="Antigravity Tokens HUD Preview" width="340" />
</p>

<p align="center">
  <b>Минималистичный виджет контекста и лимитов для Google Antigravity 2.0.</b>
  <br />
  <a href="README.md">🇬🇧 Read in English</a>
</p>

---

## ⚡ Что показывает

Виджет аккуратно встраивается в боковую панель прямо над кнопкой **Settings**:

- **Контекст чата:** процент и объём токенов активной сессии (наполняется слева направо). Мгновенно обновляется при смене чатов.
- **5-часовой лимит:** остаток квоты и таймер до сброса.
- **Недельный лимит:** общий недельный остаток квоты.
- **RU / EN:** клик по виджету мгновенно переключает язык.

---

## 🚀 Установка в одну команду

Все зависимости (Node.js и Python 3) проверяются и устанавливаются **автоматически**.

### macOS / Linux
```bash
curl -fsSL https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main/install-ru.sh | bash
```

### Windows (PowerShell)
```powershell
irm https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main/install-ru.ps1 | iex
```

> **Готово!** Откройте Antigravity 2.0 — виджет уже работает над кнопкой Settings. Фоновая служба запускается автоматически вместе с системой.

---

## 🗑️ Удаление

- **macOS / Linux:** `~/.antigravity-tokens-hud/uninstall.sh`
- **Windows:** `powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.antigravity-tokens-hud\uninstall.ps1"`

---

## 📢 Больше интересного тут:
👉 [https://t.me/+vmtcTYAm2UdhNTFi](https://t.me/+vmtcTYAm2UdhNTFi)

---

## 📄 Лицензия
MIT © [myslithell](https://github.com/myslithell)
