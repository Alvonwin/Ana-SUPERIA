@echo off
title ANA CORE BACKEND - Port 3338
cd /d E:\ANA\server
echo.
echo ========================================
echo    ANA CORE BACKEND
echo    Multi-LLM Router + Memory
echo    Port: 3338
echo ========================================
echo.
echo Demarrage du serveur...
echo.
node ana-core.cjs
echo.
if errorlevel 1 (
    echo.
    echo ========================================
    echo    ERREUR BACKEND DETECTEE
    echo ========================================
    echo.
) else (
    echo.
    echo ========================================
    echo    Backend arrete normalement
    echo ========================================
    echo.
)
pause
