@echo off
title DocDoctor Backend Controller
setlocal enabledelayedexpansion
color 0F

:menu
cls
echo ===================================================
echo   DOCDOCTOR BACKEND MANAGER
echo ===================================================
echo   1. Start Backend (Standard)
echo   2. Force-Kill Zombie Python Processes (Free RAM)
echo   3. Exit
echo ===================================================
set /p choice="Select an option (1-3): "

if "%choice%"=="1" goto start_normal
if "%choice%"=="2" goto kill_zombies
if "%choice%"=="3" goto exit_script
goto menu

:kill_zombies
echo.
echo [!] Scanning and terminating zombie python processes...
taskkill /F /IM python.exe /T >nul 2>&1
if !errorlevel! equ 0 (
    echo [✓] Successfully terminated lingering python.exe processes.
) else (
    echo [i] No active zombie python.exe processes found.
)
timeout /t 2 >nul
goto menu

:start_normal
echo.
echo [!] Terminating any existing python processes to prevent port conflicts...
taskkill /F /IM python.exe /T >nul 2>&1

echo [!] Starting DocDoctor backend...
echo.
cd /d "%~dp0backend"
python main.py
pause
goto menu

:exit_script
exit

