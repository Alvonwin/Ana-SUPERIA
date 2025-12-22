@echo off
chcp 65001 >nul
title ANA - Mode Développement
color 0E

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ANA SUPERIA - MODE DÉVELOPPEMENT                  ║
echo ║        (Backend avec nodemon + Frontend Vite)             ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

REM Libérer les ports
echo Nettoyage des ports...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3338" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo ✓ Ports libérés
echo.

REM Vérifier ChromaDB
echo Vérification ChromaDB...
netstat -ano 2>nul | findstr ":8000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠ ChromaDB n'est pas démarré
    echo   Démarrage de ChromaDB...
    start "ChromaDB" /MIN cmd /c ""C:\Users\niwno\AppData\Local\Programs\Python\Python310\Scripts\chroma.exe" run --path "E:\ANA\server\memory\chroma_data" --host localhost --port 8000"
    timeout /t 3 /nobreak >nul
) else (
    echo ✓ ChromaDB déjà actif
)
echo.

REM Démarrer Backend en mode dev (nodemon)
echo [1/2] Démarrage Backend (nodemon - hot reload)...
start "Ana Backend DEV" cmd /c "cd /d E:\ANA\server && npm run dev"
echo    ✓ Backend lancé avec nodemon
echo.

REM Attendre que le backend soit prêt
echo Attente du backend...
timeout /t 3 /nobreak >nul

REM Démarrer Frontend
echo [2/2] Démarrage Frontend (Vite - hot reload)...
start "Ana Frontend DEV" cmd /c "cd /d E:\ANA\ana-interface && npm run dev"
echo    ✓ Frontend lancé avec Vite HMR
echo.

echo ═══════════════════════════════════════════════════════════
echo  MODE DÉVELOPPEMENT ACTIF
echo ═══════════════════════════════════════════════════════════
echo.
echo  Backend (nodemon):  http://localhost:3338
echo  Frontend (Vite):    http://localhost:5173
echo.
echo  ✓ Hot reload activé sur les deux services
echo  ✓ Les modifications sont rechargées automatiquement
echo.
echo  Pour arrêter: scripts\stop.bat ou fermer les fenêtres CMD
echo ═══════════════════════════════════════════════════════════
echo.

REM Ouvrir le navigateur après un délai
timeout /t 8 /nobreak >nul
start http://localhost:5173

pause
