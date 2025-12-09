@echo off
chcp 65001 >nul
title Démarrage ANA - SUPERIA
color 0B

echo.
echo ========================================
echo      DEMARRAGE ANA - SUPERIA IA
echo      100%% Local - Memoire Infinie
echo ========================================
echo.

REM Aller dans le dossier ANA
cd /d "E:\ANA"

REM Libérer les ports critiques (3338 et 5173)
echo Nettoyage des ports critiques...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3338" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Ports 3338 et 5173 liberes
echo.

REM Reinitialiser errorlevel
cmd /c "exit /b 0"

REM Verifier si Node.js est installe
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Node.js n est pas installe!
    pause
    exit /b 1
)

REM Verifier si le dossier server existe
if not exist "E:\ANA\server" (
    echo ERREUR: Le dossier E:\ANA\server n existe pas!
    pause
    exit /b 1
)

REM Liberer le port ChromaDB
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM Demarrer ChromaDB
echo [1/5] Demarrage ChromaDB (port 8000)...
start "ChromaDB Server" /MIN cmd /c ""C:\Users\niwno\AppData\Local\Programs\Python\Python310\Scripts\chroma.exe" run --path "E:\ANA\server\memory\chroma_data" --host localhost --port 8000"
timeout /t 3 /nobreak >nul

REM Demarrer le backend
echo [2/5] Demarrage Ana Core Backend (port 3338)...
start "Ana Core Backend" cmd /c "cd /d E:\ANA\server && node ana-core.cjs"
timeout /t 5 /nobreak >nul

echo [3/5] Demarrage Interface React (port 5173)...
start "Ana Interface Frontend" cmd /c "cd /d E:\ANA\ana-interface && npm run dev"

echo [4/5] Demarrage Agents Autonomes (port 3336)...
start "Ana Agents Autonomes" cmd /c "cd /d E:\ANA\agents && node start_agents.cjs"

echo.
echo ANA est en cours de demarrage!
echo.
echo ChromaDB:        http://localhost:8000
echo Backend:         http://localhost:3338
echo Interface:       http://localhost:5173
echo Agents:          http://localhost:3336
echo.

REM Attendre puis ouvrir le navigateur
timeout /t 15 /nobreak
start http://localhost:5173

echo.
echo ANA est maintenant ACTIVE!
echo.

REM Demarrage des tunnels Cloudflare
echo [5/5] Demarrage Tunnels Cloudflare...
call "E:\ANA\setup_tunnels.bat"

echo ----------------------------------------
echo Pour arreter Ana: Settings - Fermer Ana
echo ----------------------------------------
pause
