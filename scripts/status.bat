@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title ANA - État des Services
color 0B

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║             ANA SUPERIA - ÉTAT DES SERVICES               ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

set "ALL_OK=1"

REM Vérifier ChromaDB (port 8000) via curl
echo [ChromaDB - Port 8000]
curl -s --max-time 2 http://localhost:8000/api/v2/heartbeat >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ EN LIGNE - http://localhost:8000
) else (
    echo    ✗ HORS LIGNE
    set "ALL_OK=0"
)
echo.

REM Vérifier Backend (port 3338) via curl
echo [Backend Ana Core - Port 3338]
curl -s --max-time 2 http://localhost:3338/api/health >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ EN LIGNE - http://localhost:3338
    REM Afficher uptime
    for /f "tokens=*" %%i in ('curl -s http://localhost:3338/api/health 2^>nul') do (
        echo    %%i
    )
) else (
    echo    ✗ HORS LIGNE
    set "ALL_OK=0"
)
echo.

REM Vérifier Frontend (port 5173) via curl
echo [Frontend Interface - Port 5173]
curl -s --max-time 2 http://localhost:5173/ >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ EN LIGNE - http://localhost:5173
) else (
    echo    ✗ HORS LIGNE
    set "ALL_OK=0"
)
echo.

REM Vérifier Dashboard Agents (port 3336) via curl
echo [Dashboard Agents - Port 3336]
curl -s --max-time 2 http://localhost:3336/ >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ EN LIGNE - http://localhost:3336
) else (
    echo    ✗ HORS LIGNE
    set "ALL_OK=0"
)
echo.

REM Vérifier ComfyUI (port 8188) via curl
echo [ComfyUI - Port 8188]
curl -s --max-time 2 http://localhost:8188/ >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ EN LIGNE - http://localhost:8188
) else (
    echo    - HORS LIGNE (optionnel)
)
echo.

REM Vérifier Ollama (port 11434)
echo [Ollama - Port 11434]
curl -s --max-time 2 http://localhost:11434/api/tags >nul 2>&1
if %errorlevel%==0 (
    echo    ✓ EN LIGNE - http://localhost:11434
) else (
    echo    - HORS LIGNE (optionnel pour embeddings)
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  PROCESSUS NODE.JS ACTIFS
echo ═══════════════════════════════════════════════════════════
echo.
tasklist /FI "IMAGENAME eq node.exe" 2>nul | findstr "node.exe"
if %errorlevel% neq 0 (
    echo    Aucun processus Node.js en cours
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  RÉSUMÉ
echo ═══════════════════════════════════════════════════════════
echo.
if "%ALL_OK%"=="1" (
    echo ✓ Tous les services principaux sont EN LIGNE
) else (
    echo ⚠ Certains services sont HORS LIGNE
    echo   Exécute START_ANA.bat pour démarrer le système
)
echo.
pause
