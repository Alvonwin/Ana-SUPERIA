@echo off
chcp 65001 >nul
title 🤖 ANA SUPERIA - Port 3339

echo ═══════════════════════════════════════════
echo    🦋 DÉMARRAGE ANA - PORT ALTERNATIF
echo ═══════════════════════════════════════════
echo.

cd /d "E:\ANA"

REM Démarrer backend sur port 3339
echo [1/2] 🚀 Démarrage Backend (port 3339)...
start "Ana Backend" cmd /c "cd /d E:\ANA\server && set PORT=3339 && node ana-core.cjs"

timeout /t 5 /nobreak >nul

REM Démarrer frontend
echo [2/2] 🌐 Démarrage Frontend (port 5173)...
start "Ana Frontend" cmd /c "cd /d E:\ANA\ana-interface && npm run dev"

echo.
echo ✅ Ana démarre sur:
echo    Backend: http://localhost:3339
echo    Frontend: http://localhost:5173
echo.
echo ⏱️ Ouverture dans 10 secondes...

timeout /t 10 /nobreak
start http://localhost:5173

echo.
echo ✨ ANA EST PRÊTE! ✨
pause