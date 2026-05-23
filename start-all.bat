@echo off
cd /d "%~dp0"
echo Launching DocDoctor backend and frontend in separate windows...
start "DocDoctor Backend" cmd /k "cd /d "%~dp0backend" && echo Starting backend... && python main.py"
start "DocDoctor Frontend" cmd /k "cd /d "%~dp0frontend" && echo Starting frontend... && npm run dev"
echo All services started. Close this window if you do not need it.
