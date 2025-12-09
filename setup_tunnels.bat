@echo off
chcp 65001 >nul

REM Script pour lancer les tunnels Cloudflare et mettre à jour config.js automatiquement

echo 🌍 Configuration des tunnels Cloudflare...

REM Nettoyer anciens tunnels
taskkill /F /IM cloudflared.exe >nul 2>&1
del "E:\ANA\tunnel_backend.log" >nul 2>&1

REM Lancer tunnel backend en arrière-plan et capturer dans log
echo    Lancement tunnel backend...
start /b "" "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://localhost:3338 2>&1 | findstr /C:"trycloudflare.com" > "E:\ANA\tunnel_backend.log"

REM Attendre que l'URL soit générée (max 15 secondes)
set count=0
:wait_url
timeout /t 1 /nobreak >nul
set /a count+=1
findstr /C:"trycloudflare.com" "E:\ANA\tunnel_backend.log" >nul 2>&1
if %errorlevel%==0 goto url_found
if %count% lss 15 goto wait_url
echo    ⚠️ Timeout - URL backend non trouvée
goto start_frontend

:url_found
REM Extraire l'URL du log
for /f "tokens=*" %%a in ('findstr /C:"trycloudflare.com" "E:\ANA\tunnel_backend.log"') do set BACKEND_LINE=%%a

REM Extraire juste l'URL (entre les pipes)
for /f "tokens=2 delims=|" %%b in ("%BACKEND_LINE%") do set BACKEND_URL=%%b
set BACKEND_URL=%BACKEND_URL: =%

echo    ✅ URL Backend: %BACKEND_URL%

REM Mettre à jour config.js
powershell -Command "(Get-Content 'E:\ANA\ana-interface\src\config.js') -replace 'https://[a-z0-9\-]+\.trycloudflare\.com', '%BACKEND_URL%' | Set-Content 'E:\ANA\ana-interface\src\config.js'"
echo    ✅ config.js mis à jour

:start_frontend
REM Lancer tunnel frontend (fenêtre visible pour voir l'URL mobile)
echo    Lancement tunnel frontend...
start "📱 URL MOBILE - Cloudflare Frontend" cmd /k "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:5173"

echo.
echo ✅ Tunnels configurés!
echo    Regarde la fenêtre "URL MOBILE" pour l'adresse de ton téléphone.
echo.
