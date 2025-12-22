@echo off
chcp 65001 >nul
title ANA - Arrêt des Services
color 0C

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║             ANA SUPERIA - ARRÊT DES SERVICES              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

REM Confirmation
echo ⚠ Cette action va arrêter tous les services ANA.
echo.
set /p CONFIRM="Continuer? (O/N): "
if /i not "%CONFIRM%"=="O" (
    echo Annulé.
    pause
    exit /b 0
)
echo.

REM Arrêter les processus sur les ports
echo [1/5] Arrêt Backend (port 3338)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3338" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    ✓ PID %%a arrêté
)
echo.

echo [2/5] Arrêt Frontend (port 5173)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    ✓ PID %%a arrêté
)
echo.

echo [3/5] Arrêt Dashboard Agents (port 3336)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3336" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    ✓ PID %%a arrêté
)
echo.

echo [4/5] Arrêt ChromaDB (port 8000)...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    ✓ PID %%a arrêté
)
echo.

echo [5/5] Nettoyage processus Node.js orphelins...
REM Trouver les processus node liés à ANA
for /f "tokens=2" %%a in ('wmic process where "name='node.exe' and commandline like '%%ANA%%'" get processid 2^>nul ^| findstr /r "[0-9]"') do (
    taskkill /F /PID %%a >nul 2>&1
    echo    ✓ Processus Node.js ANA %%a arrêté
)
echo.

echo ═══════════════════════════════════════════════════════════
echo  VÉRIFICATION POST-ARRÊT
echo ═══════════════════════════════════════════════════════════
echo.

REM Vérifier que tout est bien arrêté
set "STILL_RUNNING=0"

netstat -ano 2>nul | findstr ":3338" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 set "STILL_RUNNING=1"

netstat -ano 2>nul | findstr ":5173" | findstr "LISTENING" >nul 2>&1
if %errorlevel%==0 set "STILL_RUNNING=1"

if "%STILL_RUNNING%"=="0" (
    echo ✓ Tous les services ANA sont arrêtés
) else (
    echo ⚠ Certains services sont encore actifs
    echo   Ferme manuellement les fenêtres CMD restantes
)
echo.
pause
