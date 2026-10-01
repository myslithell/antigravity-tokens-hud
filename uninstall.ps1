# Antigravity Tokens HUD - Windows Uninstaller
$ErrorActionPreference = "SilentlyContinue"

Write-Host "🛑 Uninstalling Antigravity Tokens HUD..." -ForegroundColor Yellow

$InstallDir = "$env:USERPROFILE\.antigravity-tokens-hud"
$startupFolder = [Environment]::GetFolderPath("Startup")
$vbsPath = "$startupFolder\antigravity-tokens-hud.vbs"

if (Test-Path $vbsPath) {
    Remove-Item $vbsPath -Force
    Write-Host "✅ Removed Startup shortcut." -ForegroundColor Green
}

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { $_.Name -like "*node*" -and $_.CommandLine -like "*antigravity-tokens-hud*" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force
    Write-Host "✅ Removed $InstallDir." -ForegroundColor Green
}

Write-Host "✨ Antigravity Tokens HUD completely uninstalled." -ForegroundColor Green
