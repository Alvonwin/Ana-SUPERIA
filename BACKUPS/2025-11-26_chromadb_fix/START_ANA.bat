@echo off
chcp 65001 >nul
title 🤖 Démarrage ANA - SUPERIA
color 0B

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║            🤖 DÉMARRAGE ANA - SUPERIA IA 🤖              ║
echo ║                                                           ║
echo ║         100%% Local • $0 • Mémoire Infinie                ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Aller dans le dossier ANA
cd /d "E:\ANA"

REM Libérer les ports critiques (3338 et 5173)
echo 🧹 Nettoyage des ports critiques...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3338" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo ✅ Ports 3338 et 5173 libérés
echo.

REM Réinitialiser errorlevel
cmd /c "exit /b 0"

REM Vérifier si Node.js est installé
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé!
    echo    Télécharge Node.js depuis: https://nodejs.org
    pause
    exit /b 1
)

REM Vérifier si le dossier server existe
if not exist "E:\ANA\server" (
    echo ❌ ERREUR: Le dossier E:\ANA\server n'existe pas!
    pause
    exit /b 1
)

REM Démarrer le backend (ports déjà nettoyés plus haut)
echo [1/2] 🚀 Démarrage Ana Core Backend (port 3338)...
start "Ana Core Backend" cmd /k "cd /d E:\ANA\server && node ana-core.cjs"
echo    Attente du backend...
timeout /t 5 /nobreak >nul

echo [2/2] 🌐 Démarrage Interface React (port 5173)...
start "Ana Interface Frontend" cmd /k "cd /d E:\ANA\ana-interface && npm run dev"

echo.
echo ✅ ANA est en cours de démarrage!
echo.
echo 📡 Backend Ana Core:  http://localhost:3338
echo 🌐 Interface Ana:     http://localhost:5173
echo.
echo ⏱️  Attendre ~15 secondes que tout démarre...
echo.
echo ────────────────────────────────────────────────────────────
echo 💡 CONSEIL: Garde cette fenêtre ouverte pour voir les logs.
echo ❌ Pour arrêter Ana: Ferme les 2 fenêtres noires qui se sont ouvertes.
echo ────────────────────────────────────────────────────────────
echo.

REM Attendre 15 secondes puis ouvrir le navigateur
timeout /t 15 /nobreak
echo 🌐 Ouverture de l'interface Ana dans le navigateur...
start http://localhost:5173

echo.
echo ✨ ANA est maintenant ACTIVE! ✨
echo.
pause
