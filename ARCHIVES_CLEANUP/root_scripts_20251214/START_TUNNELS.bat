@echo off
chcp 65001 >nul
title Tunnels Cloudflare - Accès Distant Ana
color 0E

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║       TUNNELS CLOUDFLARE - Accès Distant Ana              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo Lance ce script APRES avoir lancé ANA.lnk
echo.

echo [1/2] Tunnel Frontend (port 5173)...
start "Cloudflare Frontend" cmd /k "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:5173"

timeout /t 3 /nobreak >nul

echo [2/2] Tunnel Backend (port 3338)...
start "Cloudflare Backend" cmd /k "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:3338"

echo.
echo ════════════════════════════════════════════════════════════
echo Les URLs s'affichent dans les nouvelles fenêtres.
echo.
echo 1. Copie l'URL FRONTEND (celle du port 5173)
echo 2. Mets à jour E:\ANA\ana-interface\src\config.js
echo    avec l'URL BACKEND (celle du port 3338)
echo 3. Accède à Ana depuis ton portable!
echo ════════════════════════════════════════════════════════════
echo.
pause
