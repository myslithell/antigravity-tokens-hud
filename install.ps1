# Antigravity Tokens HUD - Windows Installer
$ErrorActionPreference = "Stop"

$RepoRawUrl = "https://raw.githubusercontent.com/myslithell/antigravity-tokens-hud/main"
$InstallDir = "$env:USERPROFILE\.antigravity-tokens-hud"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  🚀 Antigravity Tokens HUD Installer     " -ForegroundColor Cyan
Write-Host "  Real-time Token & Quota Visualizer      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Antigravity 2.0
Write-Host "🔍 Checking for Google Antigravity 2.0..." -ForegroundColor Yellow
$appDataAntigravity = "$env:APPDATA\Antigravity"
$localAppAntigravity = "$env:LOCALAPPDATA\Programs\Antigravity"

if (-not (Test-Path $appDataAntigravity) -and -not (Test-Path $localAppAntigravity)) {
    Write-Host ""
    Write-Host "❌ Google Antigravity 2.0 is not installed! / Antigravity 2.0 не установлена!" -ForegroundColor Red
    Write-Host "👉 Please install Antigravity 2.0 first: https://antigravity.google/download" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Antigravity 2.0 detected." -ForegroundColor Green

# 2. Check Node.js
Write-Host "🔍 Checking Node.js..." -ForegroundColor Yellow
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "❌ Node.js is required but not installed! / Node.js не найден!" -ForegroundColor Red
    Write-Host "👉 Please install Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Node.js detected." -ForegroundColor Green

# 3. Check Python
Write-Host "🔍 Checking Python..." -ForegroundColor Yellow
if (-not (Get-Command python -ErrorAction SilentlyContinue) -and -not (Get-Command python3 -ErrorAction SilentlyContinue)) {
    Write-Host ""
    Write-Host "❌ Python 3 is required but not installed! / Python 3 не найден!" -ForegroundColor Red
    Write-Host "👉 Please install Python 3: https://www.python.org/downloads/" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Python detected." -ForegroundColor Green

# 4. Download / Install files
Write-Host "📦 Installing files to $InstallDir..." -ForegroundColor Yellow
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

# Set English config
Set-Content -Path "$InstallDir\config.json" -Value '{"lang":"en"}'

# 5. Autostart via Windows Startup
Write-Host "⚙️ Configuring Windows Startup..." -ForegroundColor Yellow
$startupFolder = [Environment]::GetFolderPath("Startup")
$vbsPath = "$startupFolder\antigravity-tokens-hud.vbs"
$vbsContent = "CreateObject(`"Wscript.Shell`").Run `"node `"`" & `"$InstallDir\index.js`" & `"`"`, 0, True"
[System.IO.File]::WriteAllText($vbsPath, $vbsContent)

# Start process now
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`""

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS! Antigravity Tokens HUD is ready!" -ForegroundColor Green
Write-Host "✨ Open Antigravity 2.0 — HUD is active above Settings." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
