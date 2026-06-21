@echo off
title CyberPanel SOC Dashboard v2.1
color 0A

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo.
echo  ============================================
echo    CyberPanel ^| SOC Threat Intelligence v2.1
echo    Web Scanner + Threat Map + Alert Rules
echo  ============================================
echo.
echo  Root: %ROOT%

where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found! Install: https://nodejs.org/
    pause & exit /b 1
)
echo  [OK] Node.js found
node -v

echo.
echo  [1/4] Installing backend...
cd /d "%ROOT%\backend"
call npm install
if %errorlevel% neq 0 ( echo  [ERROR] Backend install failed & pause & exit /b 1 )

echo.
echo  [2/4] Installing frontend...
cd /d "%ROOT%\frontend"
call npm install --legacy-peer-deps
if %errorlevel% neq 0 ( echo  [ERROR] Frontend install failed & pause & exit /b 1 )

echo.
echo  [3/4] Starting Backend on port 3001...
start "CyberPanel Backend" cmd /k "cd /d "%ROOT%\backend" && node server.js"
timeout /t 4 /nobreak >nul

echo.
echo  [4/4] Starting Frontend on port 3000...
start "CyberPanel Frontend" cmd /k "cd /d "%ROOT%\frontend" && npm run dev"

echo.
echo  ============================================
echo    CyberPanel is starting...
echo.
echo    Frontend  :  http://localhost:3000
echo    Backend   :  http://localhost:3001
echo.
echo    Username  :  admin
echo    Password  :  admin123
echo.
echo    New features:
echo    - Web Security Scanner (/scanner)
echo    - Threat Map (/threatmap)
echo    - Alert Rules Engine (/rules)
echo    - Command Palette (Ctrl+K)
echo  ============================================
echo.
pause
