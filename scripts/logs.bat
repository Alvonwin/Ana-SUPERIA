@echo off
chcp 65001 >nul
title ANA - Visualisation Logs
color 0F

echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║             ANA SUPERIA - VISUALISATION LOGS              ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.

cd /d "E:\ANA"

echo Sélectionne les logs à afficher:
echo.
echo   [1] Conversation courante (current_conversation_ana.txt)
echo   [2] Mémoires Ana (ana_memories.json)
echo   [3] Log de consolidation (consolidation_log.json)
echo   [4] État de conscience (consciousness.json)
echo   [5] Compétences apprises (skills.json - dernières entrées)
echo   [6] Feedback utilisateur (feedback.json - dernières entrées)
echo   [0] Quitter
echo.

set /p CHOICE="Choix: "

if "%CHOICE%"=="1" goto log_conversation
if "%CHOICE%"=="2" goto log_memories
if "%CHOICE%"=="3" goto log_consolidation
if "%CHOICE%"=="4" goto log_consciousness
if "%CHOICE%"=="5" goto log_skills
if "%CHOICE%"=="6" goto log_feedback
if "%CHOICE%"=="0" exit /b 0

echo Choix invalide
pause
goto :eof

:log_conversation
echo.
echo ═══════════════════════════════════════════════════════════
echo  CONVERSATION COURANTE (50 dernières lignes)
echo ═══════════════════════════════════════════════════════════
echo.
if exist "E:\ANA\memory\current_conversation_ana.txt" (
    powershell -Command "Get-Content 'E:\ANA\memory\current_conversation_ana.txt' -Tail 50"
) else (
    echo Fichier non trouvé
)
echo.
pause
goto :eof

:log_memories
echo.
echo ═══════════════════════════════════════════════════════════
echo  MÉMOIRES ANA
echo ═══════════════════════════════════════════════════════════
echo.
if exist "E:\ANA\memory\ana_memories.json" (
    powershell -Command "Get-Content 'E:\ANA\memory\ana_memories.json' | ConvertFrom-Json | ConvertTo-Json -Depth 3"
) else (
    echo Fichier non trouvé
)
echo.
pause
goto :eof

:log_consolidation
echo.
echo ═══════════════════════════════════════════════════════════
echo  LOG DE CONSOLIDATION (dernières entrées)
echo ═══════════════════════════════════════════════════════════
echo.
if exist "E:\ANA\memory\consolidation_log.json" (
    powershell -Command "$json = Get-Content 'E:\ANA\memory\consolidation_log.json' | ConvertFrom-Json; $json | Select-Object -Last 5 | ConvertTo-Json -Depth 3"
) else (
    echo Fichier non trouvé
)
echo.
pause
goto :eof

:log_consciousness
echo.
echo ═══════════════════════════════════════════════════════════
echo  ÉTAT DE CONSCIENCE
echo ═══════════════════════════════════════════════════════════
echo.
if exist "E:\ANA\memory\consciousness.json" (
    type "E:\ANA\memory\consciousness.json"
) else (
    echo Fichier non trouvé
)
echo.
pause
goto :eof

:log_skills
echo.
echo ═══════════════════════════════════════════════════════════
echo  COMPÉTENCES APPRISES (aperçu)
echo ═══════════════════════════════════════════════════════════
echo.
if exist "E:\ANA\knowledge\learned\skills.json" (
    for %%A in ("E:\ANA\knowledge\learned\skills.json") do echo Taille: %%~zA bytes
    echo.
    powershell -Command "$json = Get-Content 'E:\ANA\knowledge\learned\skills.json' | ConvertFrom-Json; $json.PSObject.Properties | Select-Object -First 10 | ForEach-Object { Write-Host ('- ' + $_.Name) }"
) else (
    echo Fichier non trouvé
)
echo.
pause
goto :eof

:log_feedback
echo.
echo ═══════════════════════════════════════════════════════════
echo  FEEDBACK UTILISATEUR (dernières entrées)
echo ═══════════════════════════════════════════════════════════
echo.
if exist "E:\ANA\knowledge\learned\feedback.json" (
    powershell -Command "$json = Get-Content 'E:\ANA\knowledge\learned\feedback.json' | ConvertFrom-Json; if ($json -is [array]) { $json | Select-Object -Last 5 | ConvertTo-Json -Depth 2 } else { $json | ConvertTo-Json -Depth 2 }"
) else (
    echo Fichier non trouvé
)
echo.
pause
goto :eof
