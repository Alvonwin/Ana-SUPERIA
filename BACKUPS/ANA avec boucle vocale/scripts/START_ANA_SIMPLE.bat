@echo off
title ANA - Demarrage
color 0B
echo.
echo ========================================
echo    DEMARRAGE ANA - SUPERIA IA
echo    100%% Local - $0 - Memoire Infinie
echo ========================================
echo.
echo [INFO] Lancement agents + backend + frontend...
echo.

REM Lancer agents autonomes en arriere-plan
start "ANA Agents" /MIN cmd /c "cd /d E:\ANA\agents && node start_agents.cjs"

REM Attendre 3 secondes (agents demarrent)
timeout /t 3 /nobreak >nul

REM Lancer backend dans nouvelle fenetre
start "ANA Backend" cmd /c "cd /d E:\ANA\server && node ana-core.cjs"

REM Attendre 8 secondes
timeout /t 8 /nobreak >nul

REM Lancer frontend dans nouvelle fenetre
start "ANA Frontend" cmd /c "cd /d E:\ANA\ana-interface && npm run dev"

REM Attendre 15 secondes
timeout /t 15 /nobreak >nul

REM Ouvrir navigateur
start http://localhost:5173

echo.
echo ========================================
echo    ANA EST MAINTENANT ACTIVE!
echo ========================================
echo.
echo Agents:   17 agents autonomes actifs
echo Backend:  http://localhost:3338
echo Frontend: http://localhost:5173
echo.
echo Ferme les 3 fenetres (agents/backend/frontend) pour arreter Ana.
echo.
pause
