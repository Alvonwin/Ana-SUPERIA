@echo off
chcp 65001 >nul
title 🤖 Démarrage Ana OPTIMISÉ - SUPERIA
color 0B

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║                                                           ║
echo ║         🤖 DÉMARRAGE ANA OPTIMISÉ - SUPERIA IA 🤖        ║
echo ║                                                           ║
echo ║         100%% Local • $0 • Mémoire Infinie                ║
echo ║         🚀 LAZY LOADING - Économie Ressources            ║
echo ║                                                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

REM Aller dans le dossier ANA
cd /d "E:\ANA"

REM ============================================================
REM VÉRIFICATIONS PRÉ-DÉMARRAGE
REM ============================================================

echo [1/4] 🔍 Vérifications...

REM Vérifier si Node.js est installé
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé!
    echo    Télécharge Node.js depuis: https://nodejs.org
    pause
    exit /b 1
)
echo    ✅ Node.js trouvé

REM Vérifier si Ollama est installé (requis pour LLMs)
where ollama >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Ollama n'est pas installé!
    echo    Télécharge Ollama depuis: https://ollama.com
    pause
    exit /b 1
)
echo    ✅ Ollama trouvé

REM Vérifier si le dossier server existe
if not exist "E:\ANA\server" (
    echo ❌ ERREUR: Le dossier E:\ANA\server n'existe pas!
    pause
    exit /b 1
)
echo    ✅ Backend trouvé

REM Vérifier si le dossier ana-interface existe
if not exist "E:\ANA\ana-interface" (
    echo ❌ ERREUR: Le dossier E:\ANA\ana-interface n'existe pas!
    pause
    exit /b 1
)
echo    ✅ Frontend trouvé

echo.

REM ============================================================
REM DÉMARRAGE ESSENTIELS UNIQUEMENT (Backend + Frontend)
REM ============================================================

REM Vérifier si le backend est déjà en cours d'exécution
echo [2/4] 🔌 Backend Ana Core...
curl -s http://localhost:3338/api/llms >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Backend Ana Core déjà actif sur port 3338
) else (
    echo    🚀 Démarrage Ana Core Backend (port 3338)...
    start "Ana Core Backend" "%SystemRoot%\System32\cmd.exe" /k "cd /d E:\ANA\server && node ana-core.cjs"
    REM Attendre 5 secondes pour que le backend démarre complètement
    echo    ⏱️  Attente backend...
    timeout /t 5 /nobreak >nul
    echo    ✅ Backend démarré
)

echo.

REM Vérifier si le frontend est déjà en cours d'exécution
echo [3/4] 🌐 Interface React...
curl -s http://localhost:5173 >nul 2>&1
if %errorlevel% equ 0 (
    echo    ✅ Frontend déjà actif sur port 5173
) else (
    echo    🚀 Démarrage Interface React (port 5173)...
    start "Ana Interface Frontend" "%SystemRoot%\System32\cmd.exe" /k "cd /d E:\ANA\ana-interface && npm run dev"
    echo    ⏱️  Attente frontend (15s)...
    timeout /t 15 /nobreak >nul
    echo    ✅ Frontend démarré
)

echo.

REM ============================================================
REM INFO: SERVICES LAZY LOADING
REM ============================================================

echo [4/4] 📋 Services en lazy loading...
echo.
echo    Les services suivants démarreront AUTOMATIQUEMENT quand nécessaires:
echo.
echo    🤖 Agents Ana (17 agents autonomes)
echo       → Démarre quand tu visites: /dashboard
echo.
echo    🎨 ComfyUI (génération d'images AI)
echo       → Démarre quand tu visites: /images
echo.
echo    ⚙️  n8n (workflows automation)
echo       → Démarre quand tu visites: /workflows
echo.
echo    Tu verras une notification "En chargement..." lors du démarrage.
echo.

REM ============================================================
REM OUVERTURE NAVIGATEUR
REM ============================================================

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║               ✨ ANA EST MAINTENANT ACTIVE! ✨           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 📡 Backend Ana Core:  http://localhost:3338
echo 🌐 Interface Ana:     http://localhost:5173
echo.
echo 💡 OPTIMISATION ACTIVÉE:
echo    ✅ Backend + Frontend démarrés (essentiels pour Chat)
echo    🔄 Agents/ComfyUI/n8n démarrent sur appel (lazy loading)
echo    📉 Économie RAM: ~2-3 GB au démarrage vs ~5-6 GB avant
echo.
echo ────────────────────────────────────────────────────────────
echo 💡 CONSEIL: Garde cette fenêtre ouverte pour voir les logs.
echo ❌ Pour arrêter Ana: Ferme les 2 fenêtres noires.
echo ────────────────────────────────────────────────────────────
echo.

REM Ouverture automatique navigateur
echo 🌐 Ouverture de l'interface Ana dans le navigateur...
timeout /t 2 /nobreak >nul
start http://localhost:5173

echo.
echo ✅ Ana est prête! Commence par le Chat, les autres services
echo    démarreront automatiquement quand tu en auras besoin.
echo.
pause
