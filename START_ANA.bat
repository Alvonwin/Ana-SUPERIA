@echo off
chcp 65001 >nul
title ?? D�marrage ANA - SUPERIA
color 0B

echo.
echo +-----------------------------------------------------------+
echo �                                                           �
echo �            ?? D�MARRAGE ANA - SUPERIA IA ??              �
echo �                                                           �
echo �         100%% Local � $0 � M�moire Infinie                �
echo �                                                           �
echo +-----------------------------------------------------------+
echo.

REM Aller dans le dossier ANA
cd /d "E:\ANA"

REM Lib�rer les ports critiques (3338 et 5173)
echo ?? Nettoyage des ports critiques...
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":3338" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":5173" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo ? Ports 3338 et 5173 lib�r�s
echo.

REM R�initialiser errorlevel
cmd /c "exit /b 0"

REM V�rifier si Node.js est install�
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo ? ERREUR: Node.js n'est pas install�!
    echo    T�l�charge Node.js depuis: https://nodejs.org
    pause
    exit /b 1
)

REM V�rifier si le dossier server existe
if not exist "E:\ANA\server" (
    echo ? ERREUR: Le dossier E:\ANA\server n'existe pas!
    pause
    exit /b 1
)

REM Lib�rer le port ChromaDB
for /f "tokens=5" %%a in ('netstat -ano 2^>nul ^| findstr ":8000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM D�marrer ChromaDB (m�moire vectorielle)
echo [1/3] ?? D�marrage ChromaDB (port 8000)...
start "ChromaDB Server" /MIN cmd /c ""C:\Users\niwno\AppData\Local\Programs\Python\Python310\Scripts\chroma.exe" run --path "E:\ANA\server\memory\chroma_data" --host localhost --port 8000"
echo    Attente de ChromaDB...
timeout /t 3 /nobreak >nul

REM D�marrer le backend (ports d�j� nettoy�s plus haut)
echo [2/5] ?? D�marrage Ana Core Backend (port 3338)...
start "Ana Core Backend" cmd /c "cd /d E:\ANA\server && node ana-core.cjs"
echo    Attente du backend...
timeout /t 5 /nobreak >nul

echo [3/5] ?? D�marrage Interface React (port 5173)...
start "Ana Interface Frontend" cmd /c "cd /d E:\ANA\ana-interface && npm run dev"

echo [4/5] ?? D�marrage Agents Autonomes (port 3336)...
start "Ana Agents Autonomes" cmd /c "cd /d E:\ANA\agents && node start_agents.cjs"

echo [5/5] ?? D�marrage ComfyUI (port 8188)...
start "ComfyUI" cmd /c "cd /d E:\AI_Tools\ComfyUI && run_nvidia_gpu.bat"

echo.
echo ? ANA est en cours de d�marrage!
echo.
echo ?? ChromaDB (m�moire):   http://localhost:8000
echo ?? Backend Ana Core:     http://localhost:3338
echo ?? Interface Ana:        http://localhost:5173
echo ?? Agents Dashboard:     http://localhost:3336
echo ?? ComfyUI:              http://localhost:8188
echo.
echo ??  Attendre ~15 secondes que tout d�marre...
echo.
echo ------------------------------------------------------------
echo ?? CONSEIL: Garde cette fen�tre ouverte pour voir les logs.
echo ? Pour arr�ter Ana: Ferme les fen�tres noires qui se sont ouvertes.
echo ------------------------------------------------------------
echo.

REM Attendre 15 secondes puis ouvrir le navigateur
timeout /t 15 /nobreak
echo ?? Ouverture de l'interface Ana dans le navigateur...
start http://localhost:5173

echo.
echo ? ANA est maintenant ACTIVE! ?
echo.

REM Demarrage des tunnels Cloudflare avec mise a jour automatique de config.js
powershell -ExecutionPolicy Bypass -File "E:\ANA\start_tunnels.ps1"

echo --------------------------------------------------------
echo   Cette fenetre va se fermer dans 5 secondes...
echo   URLs dans Settings > Acces Distant
echo --------------------------------------------------------
timeout /t 5 /nobreak >nul
exit
