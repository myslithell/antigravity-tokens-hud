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

# 2. Check and automatically install Node.js
Write-Host "🔍 Checking Node.js..." -ForegroundColor Yellow
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
    Write-Host "⚠️ Node.js is not found. Starting automatic installation..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "📦 Installing Node.js LTS via winget..." -ForegroundColor Cyan
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install nodejs-lts -y
    } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        scoop install nodejs-lts
    } else {
        Write-Host "⬇️ Downloading Node.js installer..." -ForegroundColor Cyan
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = "$env:TEMP\node_setup.msi"
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} elseif ($needNodeUpdate) {
    Write-Host "⚠️ Legacy Node.js version detected ($((node -v))). v18+ is recommended." -ForegroundColor Yellow
    $ans = Read-Host "Would you like to update Node.js now? [Y/n]"
    if ($ans -eq "" -or $ans -match "^[Yy]") {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget upgrade OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
        } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
            choco upgrade nodejs-lts -y
        }
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}
Write-Host "✅ Node.js ready." -ForegroundColor Green

# 3. Check and automatically install Python 3
Write-Host "🔍 Checking Python 3..." -ForegroundColor Yellow
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
    Write-Host "⚠️ Python 3 is not found. Starting automatic installation..." -ForegroundColor Yellow
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        Write-Host "📦 Installing Python 3.12 via winget..." -ForegroundColor Cyan
        winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
    } elseif (Get-Command choco -ErrorAction SilentlyContinue) {
        choco install python3 -y
    } elseif (Get-Command scoop -ErrorAction SilentlyContinue) {
        scoop install python
    } else {
        Write-Host "⬇️ Downloading official Python installer..." -ForegroundColor Cyan
        $pyUrl = "https://www.python.org/ftp/python/3.12.6/python-3.12.6-amd64.exe"
        $pyPath = "$env:TEMP\python_setup.exe"
        Invoke-WebRequest -Uri $pyUrl -OutFile $pyPath -UseBasicParsing
        Start-Process -FilePath $pyPath -ArgumentList "/quiet InstallAllUsers=0 PrependPath=1 Include_test=0" -Wait
        Remove-Item $pyPath -Force -ErrorAction SilentlyContinue
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} elseif ($needPyUpdate) {
    Write-Host "⚠️ Legacy Python version detected. 3.8+ is recommended." -ForegroundColor Yellow
    $ans = Read-Host "Would you like to update Python 3 now? [Y/n]"
    if ($ans -eq "" -or $ans -match "^[Yy]") {
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget upgrade Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        }
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}
Write-Host "✅ Python 3 ready." -ForegroundColor Green

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
$vbsContent = "CreateObject(`"Wscript.Shell`").Run `"node `"`"$InstallDir\index.js`"`"`, 0, False"
[System.IO.File]::WriteAllText($vbsPath, $vbsContent, [System.Text.Encoding]::UTF8)

# Start process now
Start-Process -FilePath "wscript.exe" -ArgumentList "`"$vbsPath`""

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🎉 SUCCESS! Antigravity Tokens HUD is ready!" -ForegroundColor Green
Write-Host "✨ Open Antigravity 2.0 — HUD is active above Settings." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
