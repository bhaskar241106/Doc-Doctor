@echo off
title DocDoctor Frontend Controller
setlocal enabledelayedexpansion

:: Set colors (0F = Bright White)
color 0F

:menu
cls
echo ===================================================
echo   DOCDOCTOR FRONTEND MANAGER
echo ===================================================
echo   1. Start Frontend (Standard)
echo   2. Start Frontend (Clear Compiler Cache first)
echo   3. Force-Kill Zombie Node Processes (Free RAM)
echo   4. Exit
echo ===================================================
set /p choice="Select an option (1-4): "

if "%choice%"=="1" goto start_normal
if "%choice%"=="2" goto start_clean
if "%choice%"=="3" goto kill_zombies
if "%choice%"=="4" goto exit_script
goto menu

:kill_zombies
echo.
echo [!] Scanning and terminating zombie node processes...
taskkill /F /IM node.exe /T >nul 2>&1
if !errorlevel! equ 0 (
    echo [✓] Successfully terminated lingering node.exe processes.
) else (
    echo [i] No active zombie node.exe processes found.
)
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
echo [!] Terminating any existing node processes to prevent port conflicts...
taskkill /F /IM node.exe /T >nul 2>&1

echo.
echo [!] Setting Node memory limits to prevent device lag...
:: Limit Node RAM allocation to 1.5GB to prevent system freezes/disk thrashing
set NODE_OPTIONS=--max-old-space-size=1536

echo [✓] RAM limit set to 1536MB.
echo [!] Starting Next.js Dev Server...
echo.
cd /d "%~dp0frontend"
npm run dev
pause
goto menu

:exit_script
exit

