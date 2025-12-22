@echo off
chcp 65001 >nul
title ANA - Linting du Code
color 0D

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║             ANA SUPERIA - LINTING                         ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

REM Parser les arguments
set "FIX_MODE=0"
set "TARGET=all"

:parse_args
if "%~1"=="" goto run_lint
if /i "%~1"=="--fix" set "FIX_MODE=1"
if /i "%~1"=="-f" set "FIX_MODE=1"
if /i "%~1"=="--backend" set "TARGET=backend"
if /i "%~1"=="--frontend" set "TARGET=frontend"
shift
goto parse_args

:run_lint

set "ERRORS=0"

REM Lint Frontend
if "%TARGET%"=="all" goto lint_frontend
if "%TARGET%"=="frontend" goto lint_frontend
goto skip_frontend

:lint_frontend
echo ═══════════════════════════════════════════════════════════
echo  LINT FRONTEND (ana-interface/) - ESLint
echo ═══════════════════════════════════════════════════════════
echo.
cd /d "E:\ANA\ana-interface"

if not exist "node_modules" (
    echo ⚠ node_modules manquant. Exécute scripts\init.bat d'abord.
    goto skip_frontend
)

if "%FIX_MODE%"=="1" (
    echo Mode fix activé - correction automatique...
    call npx eslint . --fix
) else (
    call npm run lint
)

if %errorlevel% neq 0 (
    echo.
    echo ⚠ Problèmes ESLint détectés dans le frontend
    set "ERRORS=1"
) else (
    echo.
    echo ✓ Frontend OK - Aucun problème ESLint
)
echo.

:skip_frontend

REM Lint Backend (vérification syntaxe basique)
if "%TARGET%"=="all" goto lint_backend
if "%TARGET%"=="backend" goto lint_backend
goto end_lint

:lint_backend
echo ═══════════════════════════════════════════════════════════
echo  VÉRIFICATION BACKEND (server/) - Syntaxe Node.js
echo ═══════════════════════════════════════════════════════════
echo.
cd /d "E:\ANA\server"

REM Vérifier la syntaxe des fichiers principaux
echo Vérification syntaxe ana-core.cjs...
node --check ana-core.cjs >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur syntaxe dans ana-core.cjs
    set "ERRORS=1"
) else (
    echo ✓ ana-core.cjs OK
)

echo Vérification core/llm-orchestrator.cjs...
node --check core\llm-orchestrator.cjs >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur syntaxe dans llm-orchestrator.cjs
    set "ERRORS=1"
) else (
    echo ✓ llm-orchestrator.cjs OK
)

echo Vérification core/tool-groups.cjs...
node --check core\tool-groups.cjs >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Erreur syntaxe dans tool-groups.cjs
    set "ERRORS=1"
) else (
    echo ✓ tool-groups.cjs OK
)

echo.
echo ✓ Vérification syntaxe backend terminée
echo.

:end_lint

echo ═══════════════════════════════════════════════════════════
echo  RÉSUMÉ
echo ═══════════════════════════════════════════════════════════
echo.

if "%ERRORS%"=="1" (
    echo ⚠ Des problèmes ont été détectés
    echo   Utilise --fix pour corriger automatiquement
) else (
    echo ✓ Aucun problème détecté
)

echo.
echo Options disponibles:
echo   --fix, -f        Corriger automatiquement (ESLint)
echo   --backend        Backend uniquement
echo   --frontend       Frontend uniquement
echo.
echo Exemple: scripts\lint.bat --fix --frontend
echo.
pause
