@echo off
cd /d "%~dp0"
echo Closing any servers on port 3000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F 2>nul
timeout /t 1 /nobreak >nul
echo.
echo Starting server. Open in your browser:
echo   http://localhost:3000/primid_v1_10/
echo.
echo Press Ctrl+C to stop the server.
echo.
python -m http.server 3000
pause
