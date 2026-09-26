# Antigravity Tokens HUD - Windows Установщик (Русская версия)
$ErrorActionPreference = "Stop"

$RepoRawUrl = "https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main"
$InstallDir = "$env:USERPROFILE\.antigravity-tokens-hud"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  🚀 Antigravity Tokens HUD (Русская версия)" -ForegroundColor Cyan
Write-Host "  Виджет контекста и лимитов в реальном времени" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Проверка Antigravity 2.0
Write-Host "🔍 Проверка наличия Google Antigravity 2.0..." -ForegroundColor Yellow
$appDataAntigravity = "$env:APPDATA\Antigravity"
$localAppAntigravity = "$env:LOCALAPPDATA\Programs\Antigravity"

if (-not (Test-Path $appDataAntigravity) -and -not (Test-Path $localAppAntigravity)) {
    Write-Host ""
    Write-Host "❌ Google Antigravity 2.0 не найдена!" -ForegroundColor Red
    Write-Host "👉 Пожалуйста, сначала установите Antigravity 2.0: https://antigravity.google/download" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Antigravity 2.0 обнаружена." -ForegroundColor Green

# 2. Проверка Node.js
Write-Host "🔍 Проверка Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "❌ Node.js не найден!" -ForegroundColor Red
    Write-Host "👉 Установите Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Node.js обнаружен." -ForegroundColor Green

# 3. Проверка Python
Write-Host "🔍 Проверка Python..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "❌ Python 3 не найден!" -ForegroundColor Red
    Write-Host "👉 Установите Python 3: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Python обнаружен." -ForegroundColor Green

# 4. Установка файлов
Write-Host "📦 Установка файлов в $InstallDir..." -ForegroundColor Yellow
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$files = @("index.js", "client_widget.js", "token_stats.py", "package.json", "uninstall.ps1")
foreach ($f in $files) {
    if (Test-Path "$PSScriptRoot\$f") {
        Copy-Item "$PSScriptRoot\$f" "$InstallDir\$f" -Force
    } else {
        Invoke-WebRequest -Uri "$RepoRawUrl/$f" -OutFile "$InstallDir\$f" -UseBasicParsing
    }
}

# Запись конфигурации на русском языке
Set-Content -Path "$InstallDir\config.json" -Value '{"lang":"ru"}'

# 5. Автозапуск через Windows Startup
Write-Host "⚙️ Настройка автозапуска..." -ForegroundColor Yellow
$startupFolder = [Environment]::GetFolderPath("Startup")
$vbsPath = "$startupFolder\antigravity-tokens-hud.vbs"
$vbsContent = "CreateObject(`"Wscript.Shell`").Run `"node `"`" & `"$InstallDir\index.js`" & `"`"`, 0, True"
[System.IO.File]::WriteAllText($vbsPath, $vbsContent)

Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`""

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎉 УСПЕШНО! Antigravity Tokens HUD установлен!" -ForegroundColor Green
Write-Host "✨ Откройте Antigravity 2.0 — виджет активен над Settings." -ForegroundColor Green
Write-Host "💡 Клик по виджету переключает язык (RU / EN) на лету." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
