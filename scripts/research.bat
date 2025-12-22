@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion
title ANA - Gestion Recherches
color 0E

cd /d "E:\ANA"

REM Créer le dossier si nécessaire
if not exist ".claude\research\actives" mkdir ".claude\research\actives"

if "%~1"=="" goto menu
if /i "%~1"=="nouveau" goto nouveau
if /i "%~1"=="new" goto nouveau
if /i "%~1"=="liste" goto liste
if /i "%~1"=="list" goto liste
if /i "%~1"=="ouvrir" goto ouvrir
if /i "%~1"=="open" goto ouvrir
goto menu

:menu
echo.
echo ╔═══════════════════════════════════════════════════════════╗
echo ║         ANA - GESTION DES RECHERCHES                      ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo   [1] Nouvelle recherche
echo   [2] Lister les recherches actives
echo   [3] Ouvrir la méthodologie
echo   [4] Ouvrir le template
echo   [0] Quitter
echo.
set /p CHOICE="Choix: "

if "%CHOICE%"=="1" goto nouveau_interactive
if "%CHOICE%"=="2" goto liste
if "%CHOICE%"=="3" goto methodologie
if "%CHOICE%"=="4" goto template
if "%CHOICE%"=="0" exit /b 0
goto menu

:nouveau_interactive
echo.
set /p TITRE="Titre de la recherche: "
goto creer_recherche

:nouveau
set "TITRE=%~2"
if "%TITRE%"=="" (
    echo ❌ Usage: scripts\research.bat nouveau "Titre"
    pause
    exit /b 1
)
goto creer_recherche

:creer_recherche
REM Créer un nom de fichier sécurisé
set "FILENAME=%TITRE: =_%"
set "FILENAME=%FILENAME::=-%"
set "FILENAME=%FILENAME:/=-%"
set "DATE=%date:~6,4%-%date:~3,2%-%date:~0,2%"

set "FILEPATH=.claude\research\actives\recherche_%FILENAME%.md"

REM Copier le template
copy ".claude\research\TEMPLATE_RECHERCHE.md" "%FILEPATH%" >nul

REM Remplacer le titre et la date
powershell -Command "(Get-Content '%FILEPATH%') -replace '\[TITRE\]', '%TITRE%' -replace 'YYYY-MM-DD', '%DATE%' | Set-Content '%FILEPATH%'"

echo.
echo ✓ Recherche créée: %FILEPATH%
echo.
echo Prochaines étapes:
echo   1. Ouvrir le fichier et définir la question
echo   2. Collecter les données initiales
echo   3. Formuler 2-3 hypothèses
echo.

REM Ouvrir le fichier
start notepad "%FILEPATH%"
pause
exit /b 0

:liste
echo.
echo ═══════════════════════════════════════════════════════════
echo  RECHERCHES ACTIVES
echo ═══════════════════════════════════════════════════════════
echo.
if exist ".claude\research\actives\*.md" (
    for %%f in (.claude\research\actives\*.md) do (
        echo   📋 %%~nf
    )
) else (
    echo   Aucune recherche active
)
echo.
pause
exit /b 0

:ouvrir
set "NOM=%~2"
if "%NOM%"=="" (
    echo.
    echo Recherches disponibles:
    for %%f in (.claude\research\actives\*.md) do echo   - %%~nf
    echo.
    set /p NOM="Nom à ouvrir: "
)
if exist ".claude\research\actives\%NOM%.md" (
    start notepad ".claude\research\actives\%NOM%.md"
) else if exist ".claude\research\actives\recherche_%NOM%.md" (
    start notepad ".claude\research\actives\recherche_%NOM%.md"
) else (
    echo ❌ Recherche non trouvée: %NOM%
)
pause
exit /b 0

:methodologie
start notepad ".claude\research\METHODOLOGIE.md"
exit /b 0

:template
start notepad ".claude\research\TEMPLATE_RECHERCHE.md"
exit /b 0
