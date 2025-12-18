@echo off
REM Ana Whisper STT Service - Script de demarrage
REM Port: 5001

echo ============================================================
echo   ANA WHISPER STT SERVICE
echo   Whisper Medium - French Speech-to-Text
echo ============================================================
echo.

cd /d "E:\ANA\services\whisper"

REM Verifier si Python est disponible
python --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Python non trouve dans le PATH
    echo Installez Python 3.11+ et reessayez
    pause
    exit /b 1
)

echo Demarrage du service Whisper STT sur le port 5001...
echo.
python whisper_stt.py

pause
