@echo off
chcp 65001 >nul
cd /d E:\ANA\ana-interface
echo.
echo ========================================
echo    ANA FRONTEND - Démarrage Vite...
echo ========================================
echo.
npm run dev
if errorlevel 1 (
    echo.
    echo ========================================
    echo    ❌ ERREUR FRONTEND DÉTECTÉE
    echo ========================================
    echo.
    pause
) else (
    echo.
    echo ========================================
    echo    ✅ Frontend arrêté normalement
    echo ========================================
    echo.
    pause
)
