@echo off
setlocal
cd /d "%~dp0"
echo ===================================================
echo   Antigravity Tokens HUD - Desinstalador
echo ===================================================
echo.
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0uninstall.ps1"
echo.
pause
