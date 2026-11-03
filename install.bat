@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo   Antigravity Tokens HUD - Instalador Windows
echo ===================================================
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
