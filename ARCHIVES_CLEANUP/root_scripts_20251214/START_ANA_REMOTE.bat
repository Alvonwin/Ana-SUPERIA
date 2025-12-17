@echo off
title Ana SUPERIA - Mode Distant
color 0A

echo ==========================================
echo    ANA SUPERIA - Demarrage Mode Distant
echo ==========================================
echo.

:: Demarrer Ana normalement
echo [1/3] Demarrage Ana Backend...
start "Ana Backend" cmd /c "cd /d E:\ANA && node server\ana-core.cjs"
timeout /t 5 /nobreak >nul

echo [2/3] Demarrage Ana Frontend...
start "Ana Frontend" cmd /c "cd /d E:\ANA\ana-interface && npm run dev -- --host"
timeout /t 5 /nobreak >nul

echo [3/3] Demarrage Tunnels Cloudflare...

:: Tunnel Frontend (port 5173)
start "Cloudflare Frontend" cmd /c "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:5173"

:: Tunnel Backend (port 3338)
start "Cloudflare Backend" cmd /c "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:3338"

echo.
echo ==========================================
echo    Ana est prete!
echo ==========================================
echo.
echo Les URLs Cloudflare s'affichent dans les fenetres separees.
echo Copiez l'URL du Frontend pour acceder a Ana depuis votre portable.
echo.
echo IMPORTANT: Mettez a jour l'URL du backend dans:
echo   E:\ANA\ana-interface\src\config.js
echo.
pause
