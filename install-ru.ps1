# Antigravity Tokens HUD - Windows Установщик (Русская версия)
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
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

# 2. Проверка и автоматическая установка Node.js
Write-Host "🔍 Проверка Node.js..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$needNodeInstall = $false
$needNodeUpdate = $false

if (-not $nodeCmd) {
    $needNodeInstall = $true
} else {
    try {
        $nodeVerStr = (node -v) -replace 'v',''
        $nodeMajor = [int]($nodeVerStr.Split('.')[0])
        if ($nodeMajor -lt 18) {
            $needNodeUpdate = $true
        }
    } catch {
        $needNodeInstall = $true
    }
}

if ($needNodeInstall) {
    Write-Host "⚠️ Node.js не найден. Выполняется автоматическая установка..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "📦 Установка Node.js LTS через winget..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
    } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        scoop install nodejs-lts
    } else {
        Write-Host "⬇️ Загрузка установщика Node.js..." -ForegroundColor Cyan
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = "$env:TEMP\node_setup.msi"
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} elseif ($needNodeUpdate) {
    Write-Host "⚠️ Обнаружена устаревшая версия Node.js ($((node -v))). Рекомендуется v18+." -ForegroundColor Yellow
    $ans = Read-Host "Желаете обновить Node.js сейчас? [Y/n]"
    if ($ans -eq "" -or $ans -match "^[Yy]") {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget upgrade OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
            choco upgrade nodejs-lts -y
        }
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}
Write-Host "✅ Node.js готов." -ForegroundColor Green

# 3. Проверка и автоматическая установка Python 3
Write-Host "🔍 Проверка Python 3..." -ForegroundColor Yellow
$pyCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pyCmd) { $pyCmd = Get-Command python3 -ErrorAction SilentlyContinue }
$needPyInstall = $false
$needPyUpdate = $false

if (-not $pyCmd) {
    $needPyInstall = $true
} else {
    try {
        $pyVer = & $pyCmd.Source -c "import sys; print(sys.version_info.major, sys.version_info.minor)"
        $parts = $pyVer.Trim().Split(" ")
        $major = [int]$parts[0]
        $minor = [int]$parts[1]
        if ($major -lt 3 -or ($major -eq 3 -and $minor -lt 8)) {
            $needPyUpdate = $true
        }
    } catch {
        $needPyInstall = $true
    }
}

if ($needPyInstall) {
    Write-Host "⚠️ Python 3 не найден. Выполняется автоматическая установка..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "📦 Установка Python 3.12 через winget..." -ForegroundColor Cyan
        winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install python3 -y
    } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        scoop install python
    } else {
        Write-Host "⬇️ Загрузка официального установщика Python..." -ForegroundColor Cyan
        $pyUrl = "https://www.python.org/ftp/python/3.12.6/python-3.12.6-amd64.exe"
        $pyPath = "$env:TEMP\python_setup.exe"
        Invoke-WebRequest -Uri $pyUrl -OutFile $pyPath -UseBasicParsing
        Start-Process -FilePath $pyPath -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait
        Remove-Item $pyPath -Force -ErrorAction SilentlyContinue
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} elseif ($needPyUpdate) {
    Write-Host "⚠️ Обнаружена устаревшая версия Python. Рекомендуется 3.8+." -ForegroundColor Yellow
    $ans = Read-Host "Желаете обновить Python 3 сейчас? [Y/n]"
    if ($ans -eq "" -or $ans -match "^[Yy]") {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget upgrade Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        }
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}
Write-Host "✅ Python 3 готов." -ForegroundColor Green

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
$vbsContent = "CreateObject(`"Wscript.Shell`").Run `"node `"`"$InstallDir\index.js`"`"`"`, 0, False"
[System.IO.File]::WriteAllText($vbsPath, $vbsContent, [System.Text.Encoding]::UTF8)

Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`""

# Проверка запуска процесса
Start-Sleep -Seconds 2
$running = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -like "*node*" -and $_.CommandLine -like "*antigravity-tokens-hud*"
}
if (-not $running) {
    $running = Get-Process node -ErrorAction SilentlyContinue
}

if ($running) {
    Write-Host ""
    Write-Host "==========================================" -ForegroundColor Green
    Write-Host "🎉 УСПЕШНО! Antigravity Tokens HUD установлен!" -ForegroundColor Green
    Write-Host "✨ Откройте Antigravity 2.0 — виджет активен над Settings." -ForegroundColor Green
    Write-Host "💡 Клик по виджету переключает язык (RU / EN) на лету." -ForegroundColor Green
    Write-Host "==========================================" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "⚠️ Внимание: фоновый процесс HUD не запустился автоматически." -ForegroundColor Yellow
    Write-Host "👉 Запустите вручную для проверки: node `"$InstallDir\index.js`"" -ForegroundColor Yellow
}

