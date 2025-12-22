@echo off
chcp 65001 >nul
title ANA - Exécution des Tests
color 0E

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║             ANA SUPERIA - TESTS                           ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

REM Parser les arguments
set "WATCH_MODE=0"
set "COVERAGE=0"
set "TARGET=all"

:parse_args
if "%~1"=="" goto run_tests
if /i "%~1"=="--watch" set "WATCH_MODE=1"
if /i "%~1"=="-w" set "WATCH_MODE=1"
if /i "%~1"=="--coverage" set "COVERAGE=1"
if /i "%~1"=="-c" set "COVERAGE=1"
if /i "%~1"=="--backend" set "TARGET=backend"
if /i "%~1"=="--frontend" set "TARGET=frontend"
shift
goto parse_args

:run_tests

REM Tests Backend
if "%TARGET%"=="all" goto test_backend
if "%TARGET%"=="backend" goto test_backend
goto skip_backend

:test_backend
echo ═══════════════════════════════════════════════════════════
echo  TESTS BACKEND (server/)
echo ═══════════════════════════════════════════════════════════
echo.
cd /d "E:\ANA\server"

if not exist "node_modules" (
    echo ⚠ node_modules manquant. Exécute scripts\init.bat d'abord.
    goto skip_backend
)

if "%WATCH_MODE%"=="1" (
    echo Mode watch activé (Ctrl+C pour arrêter)
    call npm run test:watch
) else if "%COVERAGE%"=="1" (
    echo Exécution avec couverture de code...
    call npm run test:coverage
) else (
    call npm test
)

if %errorlevel% neq 0 (
    echo.
    echo ❌ Certains tests backend ont échoué
) else (
    echo.
    echo ✓ Tests backend réussis
)
echo.

:skip_backend

REM Tests Frontend (si disponibles)
if "%TARGET%"=="all" goto test_frontend
if "%TARGET%"=="frontend" goto test_frontend
goto end_tests

:test_frontend
echo ═══════════════════════════════════════════════════════════
echo  TESTS FRONTEND (ana-interface/)
echo ═══════════════════════════════════════════════════════════
echo.
cd /d "E:\ANA\ana-interface"

if not exist "node_modules" (
    echo ⚠ node_modules manquant. Exécute scripts\init.bat d'abord.
    goto end_tests
)

REM Vérifier si des tests existent
if exist "vitest.config.*" (
    call npm test
) else if exist "jest.config.*" (
    call npm test
) else (
    echo ℹ Pas de suite de tests configurée pour le frontend
)
echo.

:end_tests

echo ═══════════════════════════════════════════════════════════
echo  RÉSUMÉ
echo ═══════════════════════════════════════════════════════════
echo.
echo Options disponibles:
echo   --watch, -w      Mode watch (relance auto)
echo   --coverage, -c   Avec couverture de code
echo   --backend        Tests backend uniquement
echo   --frontend       Tests frontend uniquement
echo.
echo Exemple: scripts\test.bat --watch --backend
echo.
pause
