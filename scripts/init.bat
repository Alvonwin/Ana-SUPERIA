@echo off
chcp 65001 >nul
title ANA - Installation des dépendances
color 0A

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║           ANA SUPERIA - INITIALISATION                    ║
echo ║       Installation de toutes les dépendances              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

REM Vérifier Node.js
echo [1/5] Vérification de Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ ERREUR: Node.js n'est pas installé!
    echo    Télécharge depuis: https://nodejs.org
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node -v') do echo    ✓ Node.js %%i détecté
echo.

REM Vérifier Python (pour ChromaDB)
echo [2/5] Vérification de Python...
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ ATTENTION: Python n'est pas dans le PATH
    echo    ChromaDB nécessite Python pour fonctionner
) else (
    for /f "tokens=*" %%i in ('python --version') do echo    ✓ %%i détecté
)
echo.

REM Installation dépendances backend
echo [3/5] Installation dépendances Backend (server/)...
cd /d "E:\ANA\server"
if exist "node_modules" (
    echo    ✓ node_modules existe déjà
    echo    Mise à jour des dépendances...
)
call npm install
if %errorlevel% neq 0 (
    echo ❌ ERREUR lors de l'installation backend
    pause
    exit /b 1
)
echo    ✓ Backend prêt
echo.

REM Installation dépendances frontend
echo [4/5] Installation dépendances Frontend (ana-interface/)...
cd /d "E:\ANA\ana-interface"
if exist "node_modules" (
    echo    ✓ node_modules existe déjà
    echo    Mise à jour des dépendances...
)
call npm install
if %errorlevel% neq 0 (
    echo ❌ ERREUR lors de l'installation frontend
    pause
    exit /b 1
)
echo    ✓ Frontend prêt
echo.

REM Installation dépendances agents
echo [5/5] Vérification Agents (agents/)...
cd /d "E:\ANA\agents"
if exist "package.json" (
    call npm install
    echo    ✓ Agents prêts
) else (
    echo    ✓ Pas de package.json dans agents/
)
echo.

REM Vérifier ChromaDB
echo Vérification ChromaDB...
where chroma >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ ChromaDB n'est pas dans le PATH
    echo    Installation recommandée: pip install chromadb
) else (
    echo    ✓ ChromaDB disponible
)
echo.

REM Créer les dossiers nécessaires
echo Vérification des dossiers...
if not exist "E:\ANA\memory" mkdir "E:\ANA\memory"
if not exist "E:\ANA\server\memory\chroma_data" mkdir "E:\ANA\server\memory\chroma_data"
if not exist "E:\ANA\knowledge\learned" mkdir "E:\ANA\knowledge\learned"
echo    ✓ Structure de dossiers vérifiée
echo.

echo ╔═══════════════════════════════════════════════════════════╗
echo ║              ✓ INITIALISATION TERMINÉE                    ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo Prochaine étape: Lancer START_ANA.bat pour démarrer le système
echo.
pause
