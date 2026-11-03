# Antigravity Tokens HUD - Windows Uninstaller
$ErrorActionPreference = "SilentlyContinue"

Write-Host "🛑 Uninstalling Antigravity Tokens HUD..." -ForegroundColor Yellow

$InstallDir = "$env:USERPROFILE\.antigravity-tokens-hud"
$startupFolder = [Environment]::GetFolderPath("Startup")
$vbsPath = "$startupFolder\antigravity-tokens-hud.vbs"
$lnkPath = "$startupFolder\Antigravity Tokens HUD.lnk"

if (Test-Path $vbsPath) { Remove-Item $vbsPath -Force }
if (Test-Path $lnkPath) { Remove-Item $lnkPath -Force }
Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run" -Name "Antigravity Tokens HUD" -ErrorAction SilentlyContinue
Write-Host "✅ Removed Startup shortcut and registry entries." -ForegroundColor Green

Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | Where-Object { 
    ($_.Name -like "*node*" -and $_.CommandLine -like "*antigravity-tokens-hud*") -or
    ($_.Name -like "*Antigravity Tokens HUD*")
} | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

if (Test-Path $InstallDir) {
    Remove-Item $InstallDir -Recurse -Force
    Write-Host "✅ Removed $InstallDir." -ForegroundColor Green
}

$officialPluginDir = "$env:USERPROFILE\.gemini\config\plugins\antigravity-tokens-hud"
if (Test-Path $officialPluginDir) {
    Remove-Item $officialPluginDir -Recurse -Force
    Write-Host "✅ Removed plugin from Antigravity Customizations." -ForegroundColor Green
}

Write-Host "✨ Antigravity Tokens HUD completely uninstalled." -ForegroundColor Green
