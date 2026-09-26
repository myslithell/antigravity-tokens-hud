# Antigravity Tokens HUD

<p align="center">
  <img src="assets/preview.png" alt="Antigravity Tokens HUD Preview" width="340" />
</p>

<p align="center">
  <b>Минималистичный статус-виджет контекста и лимитов для Google Antigravity 2.0.</b>
  <br />
  <a href="README.md">🇬🇧 Read in English</a>
</p>

---

## ⚡ Что это такое?

**Antigravity Tokens HUD** встраивает аккуратный, лаконичный информер прямо в боковую панель Google Antigravity 2.0 (над кнопкой **Settings**):

1. **Модель и контекст сессии**: Текущая загрузка окна контекста (например, `gemini-3.8-flash 2.7% (26k/1M)`), наполняющаяся слева направо в изумрудном цвете. Мгновенно переключается при смене чатов без задержек.
2. **Остаток 5-часового лимита**: Официальный процент остатка квоты и точное время до сброса (например, `5-часовой 77% (3ч 50м)`), уменьшающийся в приглушенном сером цвете.
3. **Остаток недельного лимита**: Официальный недельный остаток (например, `Недельный 96% (6д 22ч)`).

Никаких лишних градиентов, миганий или отвлекающих элементов — всё выполнено строго в нативном стиле интерфейса.

---

## 🎯 Требования

- **[Google Antigravity 2.0](https://antigravity.google/download)**
- **Node.js** (версия 18 или новее)
- **Python 3** (только стандартные библиотеки — никаких дополнительных `pip install`)

---

## 🚀 Быстрая установка в 1 команду (Русская версия)

### macOS / Linux

Вставьте в ваш терминал:
```bash
curl -fsSL https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main/install-ru.sh | bash
```

### Windows (PowerShell)

Вставьте в окно PowerShell:
```powershell
irm https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main/install-ru.ps1 | iex
```

> **Готово!** Откройте Antigravity 2.0 — виджет уже работает над кнопкой Settings на русском языке. Клик по виджету переключает язык (RU / EN) в реальном времени.

---

## 🛠 Ручная установка

Если хотите склонировать и посмотреть код:

```bash
git clone https://github.com/myslithell/antigravity-tokens-hud.git
cd antigravity-tokens-hud
bash install-ru.sh
```

---

## 🗑️ Удаление

### macOS / Linux
```bash
~/.antigravity-tokens-hud/uninstall.sh
```

### Windows
```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.antigravity-tokens-hud\uninstall.ps1"
```

---

## 📄 Лицензия

MIT © [myslithell](https://github.com/myslithell)
