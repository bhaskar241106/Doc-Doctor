@echo off
title DocDoctor Suite Controller
setlocal enabledelayedexpansion
color 0F

:menu
cls
echo ===================================================
echo   DOCDOCTOR FULL SUITE MANAGER
echo ===================================================
echo   1. Start Backend + Frontend (Clean Start)
echo   2. Start Backend + Frontend (Clear Cache first)
echo   3. Force-Kill Zombie Processes (Free RAM)
echo   4. Exit
echo ===================================================
set /p choice="Select an option (1-4): "

if "%choice%"=="1" goto start_normal
if "%choice%"=="2" goto start_clean
if "%choice%"=="3" goto kill_all
if "%choice%"=="4" goto exit_script
goto menu

:kill_all
echo.
echo [!] Scanning and terminating zombie node/python processes...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1
echo [✓] System cleanup completed. Lingering processes terminated.
timeout /t 2 >nul
goto menu

:start_clean
echo.
echo [!] Cleaning Next.js compilation cache (.next)...
if exist "%~dp0frontend\.next" (
    rd /s /q "%~dp0frontend\.next"
    echo [✓] Next.js cache deleted successfully.
) else (
    echo [i] No cache folder found. Proceeding.
)
goto start_normal

:start_normal
echo.
echo [!] Cleaning up zombie processes before launching...
taskkill /F /IM node.exe /T >nul 2>&1
taskkill /F /IM python.exe /T >nul 2>&1

echo [!] Setting Node memory limits to prevent device lag...
set NODE_OPTIONS=--max-old-space-size=1536
echo [✓] RAM limit set to 1536MB.

echo [!] Launching Backend in a separate window...
start "DocDoctor Backend" cmd /k "cd /d "%~dp0backend" && title DocDoctor Backend && echo Starting backend... && python main.py"

:: Adding a small delay to stagger startup spikes
echo [!] Staggering startup (waiting 3 seconds for backend initialization)...
timeout /t 3 >nul

echo [!] Launching Frontend in a separate window...
start "DocDoctor Frontend" cmd /k "cd /d "%~dp0frontend" && title DocDoctor Frontend && set NODE_OPTIONS=--max-old-space-size=1536 && echo Starting frontend... && npm run dev"

echo.
echo [✓] All services successfully launched.
echo     Backend and Frontend are running in separate dedicated windows.
echo     You can close this controller or keep it open for process management.
echo.
pause
goto menu

:exit_script
exit
