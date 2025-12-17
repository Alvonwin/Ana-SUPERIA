@echo off
chcp 65001 >nul
cd /d E:\ANA\server
echo.
echo ========================================
echo    ANA BACKEND - Démarrage...
echo ========================================
echo.
node ana-core.cjs
if errorlevel 1 (
    echo.
    echo ========================================
    echo    ❌ ERREUR BACKEND DÉTECTÉE
    echo ========================================
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo    ✅ Backend arrêté normalement
    echo ========================================
    echo.
    pause
)
