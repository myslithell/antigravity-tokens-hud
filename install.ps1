# Antigravity Tokens HUD - Windows Installer
$ErrorActionPreference = "Stop"

$RepoRawUrl = "https://raw.githubusercontent.com/Collazos022/antigravity-tokens-hud/main"
$InstallDir = "$env:USERPROFILE\.antigravity-tokens-hud"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  🚀 Antigravity Tokens HUD Installer     " -ForegroundColor Cyan
Write-Host "  Visualizador de Cuotas y Tokens en Vivo " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# 1. Comprobar instalación de Antigravity 2.0
Write-Host "🔍 Verificando Google Antigravity 2.0..." -ForegroundColor Yellow
$appDataAntigravity = "$env:APPDATA\Antigravity"
$localAppAntigravity = "$env:LOCALAPPDATA\Programs\Antigravity"

if (-not (Test-Path $appDataAntigravity) -and -not (Test-Path $localAppAntigravity)) {
    Write-Host ""
    Write-Host "❌ Google Antigravity 2.0 no está instalado en este sistema." -ForegroundColor Red
    Write-Host "👉 Por favor instala Antigravity 2.0 primero: https://antigravity.google/download" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}
Write-Host "✅ Antigravity 2.0 detectado." -ForegroundColor Green

# 2. Comprobar / Instalar Node.js
Write-Host "🔍 Verificando Node.js..." -ForegroundColor Yellow
$nodeCmd = Get-Command node -ErrorAction SilentlyContinue
$needNodeInstall = $false

if (-not $nodeCmd) {
    $needNodeInstall = $true
} else {
    try {
        $nodeVerStr = (node -v) -replace 'v',''
        $nodeMajor = [int]($nodeVerStr.Split('.')[0])
        if ($nodeMajor -lt 18) {
            $needNodeInstall = $true
        }
    } catch {
        $needNodeInstall = $true
    }
}

if ($needNodeInstall) {
    Write-Host "⚠️ Instalando Node.js LTS vía winget..." -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install OpenJS.NodeJS.LTS --silent --accept-package-agreements --accept-source-agreements
    } else {
        $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
        $msiPath = "$env:TEMP\node_setup.msi"
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath -UseBasicParsing
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /qn /norestart" -Wait
        Remove-Item $msiPath -Force -ErrorAction SilentlyContinue
    }
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
}
Write-Host "✅ Node.js listo." -ForegroundColor Green

# 3. Comprobar / Instalar Python 3.12 y configurar PATH prioritario
Write-Host "🔍 Verificando Python 3..." -ForegroundColor Yellow
$pyTargetDir = "$env:LOCALAPPDATA\Programs\Python\Python312"
$pyExe = "$pyTargetDir\python.exe"
$needPyInstall = $false

if (-not (Test-Path $pyExe)) {
    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if (-not $pyCmd -or $pyCmd.Source -like "*WindowsApps*") {
        $needPyInstall = $true
    }
}

if ($needPyInstall) {
    Write-Host "⚠️ Instalando Python 3.12 vía winget..." -ForegroundColor Cyan
    if (Get-Command winget -ErrorAction SilentlyContinue) {
        winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
    }
}

# Asegurar prioridad en el PATH para evitar alias de Windows Store
if (Test-Path $pyTargetDir) {
    $currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
    $pyPaths = "$pyTargetDir;$pyTargetDir\Scripts;"
    if (-not ($currentPath.StartsWith($pyPaths))) {
        $cleanedPath = $currentPath.Replace($pyPaths, "").Replace(";;", ";")
        [Environment]::SetEnvironmentVariable("Path", $pyPaths + $cleanedPath, "User")
        $env:Path = $pyPaths + $env:Path
    }
}
Write-Host "✅ Python 3 listo." -ForegroundColor Green

# 4. Instalar o actualizar archivos en ~/.antigravity-tokens-hud
Write-Host "📦 Copiando archivos a $InstallDir..." -ForegroundColor Yellow
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}
if (-not (Test-Path "$InstallDir\assets")) {
    New-Item -ItemType Directory -Path "$InstallDir\assets" -Force | Out-Null
}

$files = @("index.js", "client_widget.js", "token_stats.py", "package.json", "config.json", "launcher.cs", "uninstall.ps1")
foreach ($f in $files) {
    $localSource = Join-Path $PSScriptRoot $f
    if ($PSScriptRoot -and (Test-Path $localSource)) {
        Copy-Item $localSource "$InstallDir\$f" -Force
    } else {
        Invoke-WebRequest -Uri "$RepoRawUrl/$f" -OutFile "$InstallDir\$f" -UseBasicParsing
    }
}

# Copiar assets (icono y logos)
$assetFiles = @("icon.ico", "icon.png", "preview.png")
foreach ($af in $assetFiles) {
    $localAsset = Join-Path $PSScriptRoot "assets\$af"
    if (Test-Path $localAsset) {
        Copy-Item $localAsset "$InstallDir\assets\$af" -Force
    }
}

# Compilar lanzador nativo con icono oficial para Administrador de Tareas
$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$exePath = "$InstallDir\Antigravity Tokens HUD.exe"
$csSource = "$InstallDir\launcher.cs"
if ((Test-Path $csc) -and (Test-Path $csSource)) {
    & $csc /nologo /target:winexe /win32icon:"$InstallDir\assets\icon.ico" /out:"$exePath" "$csSource" | Out-Null
}

# Configuración de idioma por defecto (español)
if (-not (Test-Path "$InstallDir\config.json")) {
    Set-Content -Path "$InstallDir\config.json" -Value '{"lang":"es"}' -Encoding UTF8
}

# 5. Configurar inicio automático con Windows con Logo e Icono en Aplicaciones de Inicio
Write-Host "⚙️ Configurando arranque automático e icono en Aplicaciones de Inicio..." -ForegroundColor Yellow
$startupFolder = [Environment]::GetFolderPath("Startup")
$oldVbs = Join-Path $startupFolder "antigravity-tokens-hud.vbs"
if (Test-Path $oldVbs) { Remove-Item -Path $oldVbs -Force -ErrorAction SilentlyContinue }
$oldLnk = Join-Path $startupFolder "Antigravity Tokens HUD.lnk"
if (Test-Path $oldLnk) { Remove-Item -Path $oldLnk -Force -ErrorAction SilentlyContinue }

# Registro único en HKCU:\...\Run para visualización limpia sin duplicados en el Administrador de Tareas
if (Test-Path $exePath) {
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Antigravity Tokens HUD" -Value "`"$exePath`"" -Force
} else {
    Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Antigravity Tokens HUD" -Value "`"node.exe`" `"$InstallDir\index.js`"" -Force
}

# 6. Registrar Plugin Oficial en Antigravity (Customizations)
Write-Host "🔌 Registrando plugin oficial en Antigravity Customizations..." -ForegroundColor Yellow
$officialPluginDir = "$env:USERPROFILE\.gemini\config\plugins\antigravity-tokens-hud"
if (-not (Test-Path "$officialPluginDir\assets")) { New-Item -ItemType Directory -Path "$officialPluginDir\assets" -Force | Out-Null }

if ($PSScriptRoot) {
    Copy-Item "$PSScriptRoot\plugin.json" "$officialPluginDir\plugin.json" -Force -ErrorAction SilentlyContinue
    Copy-Item "$PSScriptRoot\assets\icon.png" "$officialPluginDir\assets\logo.png" -Force -ErrorAction SilentlyContinue
    Copy-Item "$PSScriptRoot\token_stats.py" "$officialPluginDir\token_stats.py" -Force -ErrorAction SilentlyContinue
    Copy-Item "$PSScriptRoot\README.md" "$officialPluginDir\README.md" -Force -ErrorAction SilentlyContinue
}
Write-Host "✅ Plugin registrado en Customizations > Installed." -ForegroundColor Green

# Detener instancias previas y arrancar servicio
Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { 
    $_.Name -like "*node*" -and $_.CommandLine -like "*antigravity-tokens-hud*" 
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

if (Test-Path $exePath) {
    Start-Process -FilePath $exePath
} else {
    Start-Process -FilePath "node.exe" -ArgumentList "`"$InstallDir\index.js`"" -WindowStyle Hidden
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "🎉 ¡INSTALACIÓN EXITOSA! Antigravity Tokens HUD está activo" -ForegroundColor Green
Write-Host "✨ Abre Antigravity 2.0: El widget se ubica sobre Settings " -ForegroundColor Green
Write-Host "   (Idiomas: Español, Inglés, Ruso, Francés y Chino)      " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
