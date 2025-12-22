@echo off
chcp 65001 >nul
title ANA - Vérification Santé Système
color 0A

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ANA SUPERIA - VÉRIFICATION SANTÉ SYSTÈME          ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

set "ISSUES=0"

echo ═══════════════════════════════════════════════════════════
echo  1. DÉPENDANCES SYSTÈME
echo ═══════════════════════════════════════════════════════════
echo.

REM Node.js
echo [Node.js]
where node >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('node -v') do echo    ✓ %%i
) else (
    echo    ✗ Non installé
    set "ISSUES=1"
)

REM npm
echo [npm]
where npm >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('npm -v') do echo    ✓ v%%i
) else (
    echo    ✗ Non installé
    set "ISSUES=1"
)

REM Python
echo [Python]
where python >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=*" %%i in ('python --version') do echo    ✓ %%i
) else (
    echo    ⚠ Non dans PATH (requis pour ChromaDB)
)

REM Git
echo [Git]
where git >nul 2>&1
if %errorlevel%==0 (
    for /f "tokens=3" %%i in ('git --version') do echo    ✓ v%%i
) else (
    echo    ⚠ Non installé (optionnel)
)

REM curl
echo [curl]
where curl >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ Disponible
) else (
    echo    ⚠ Non disponible
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  2. STRUCTURE PROJET
echo ═══════════════════════════════════════════════════════════
echo.

REM Vérifier dossiers essentiels
if exist "E:\ANA\server" (echo    ✓ server/) else (echo    ✗ server/ MANQUANT & set "ISSUES=1")
if exist "E:\ANA\ana-interface" (echo    ✓ ana-interface/) else (echo    ✗ ana-interface/ MANQUANT & set "ISSUES=1")
if exist "E:\ANA\agents" (echo    ✓ agents/) else (echo    ⚠ agents/ manquant)
if exist "E:\ANA\memory" (echo    ✓ memory/) else (echo    ⚠ memory/ manquant)
if exist "E:\ANA\knowledge" (echo    ✓ knowledge/) else (echo    ⚠ knowledge/ manquant)
echo.

echo ═══════════════════════════════════════════════════════════
echo  3. FICHIERS DE CONFIGURATION
echo ═══════════════════════════════════════════════════════════
echo.

if exist "E:\ANA\server\.env" (
    echo    ✓ server/.env existe
) else (
    echo    ⚠ server/.env MANQUANT - Crée-le avec tes clés API
)

if exist "E:\ANA\server\config\system-prompt.json" (
    echo    ✓ system-prompt.json OK
) else (
    echo    ✗ system-prompt.json MANQUANT
    set "ISSUES=1"
)

if exist "E:\ANA\server\config\llm-profiles.cjs" (
    echo    ✓ llm-profiles.cjs OK
) else (
    echo    ✗ llm-profiles.cjs MANQUANT
    set "ISSUES=1"
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  4. NODE_MODULES
echo ═══════════════════════════════════════════════════════════
echo.

if exist "E:\ANA\server\node_modules" (
    echo    ✓ server/node_modules installé
) else (
    echo    ✗ server/node_modules MANQUANT - Exécute scripts\init.bat
    set "ISSUES=1"
)

if exist "E:\ANA\ana-interface\node_modules" (
    echo    ✓ ana-interface/node_modules installé
) else (
    echo    ✗ ana-interface/node_modules MANQUANT - Exécute scripts\init.bat
    set "ISSUES=1"
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  5. FICHIERS MÉMOIRE
echo ═══════════════════════════════════════════════════════════
echo.

if exist "E:\ANA\memory\ana_memories.json" (
    for %%A in ("E:\ANA\memory\ana_memories.json") do echo    ✓ ana_memories.json (%%~zA bytes)
) else (
    echo    ⚠ ana_memories.json n'existe pas encore
)

if exist "E:\ANA\memory\consciousness.json" (
    echo    ✓ consciousness.json OK
) else (
    echo    ⚠ consciousness.json n'existe pas encore
)

if exist "E:\ANA\server\memory\chroma_data" (
    echo    ✓ chroma_data/ existe
) else (
    echo    ⚠ chroma_data/ n'existe pas - sera créé au premier lancement
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  6. ESPACE DISQUE
echo ═══════════════════════════════════════════════════════════
echo.

for /f "tokens=3" %%a in ('dir E:\ 2^>nul ^| findstr "libre"') do (
    echo    Espace libre sur E: %%a
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  RÉSUMÉ
echo ═══════════════════════════════════════════════════════════
echo.

if "%ISSUES%"=="0" (
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║           ✓ SYSTÈME EN BONNE SANTÉ                        ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Prêt à démarrer avec START_ANA.bat
) else (
    echo ╔═══════════════════════════════════════════════════════════╗
    echo ║           ⚠ PROBLÈMES DÉTECTÉS                            ║
    echo ╚═══════════════════════════════════════════════════════════╝
    echo.
    echo Corrige les problèmes marqués ✗ avant de continuer
)
echo.
pause
