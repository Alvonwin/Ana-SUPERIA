$file = "E:\ANA\START_ANA.bat"
$content = Get-Content $file -Raw -Encoding UTF8

# Remplacer la section Cloudflare par l'appel au script PowerShell
$oldSection = @"
REM Démarrage des tunnels Cloudflare pour accès distant
echo [5/5] 🌍 Démarrage Tunnels Cloudflare (accès distant)...
start "Cloudflare Frontend" cmd /c "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:5173"
start "Cloudflare Backend" cmd /c "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --url http://localhost:3338"
echo    Les URLs distantes s'affichent dans les fenêtres Cloudflare.
echo.

echo ────────────────────────────────────────────────────────────
echo   Cette fenêtre va se fermer dans 5 secondes...
echo   Pour arrêter Ana: Settings ^> Fermer Ana
echo ────────────────────────────────────────────────────────────
timeout /t 5 /nobreak >nul
exit
"@

$newSection = @"
REM Démarrage des tunnels Cloudflare avec mise à jour automatique de config.js
powershell -ExecutionPolicy Bypass -File "E:\ANA\start_tunnels.ps1"

echo ────────────────────────────────────────────────────────────
echo   Ana est prête! Accès mobile via l'URL Frontend ci-dessus.
echo   Pour arrêter Ana: Settings ^> Fermer Ana
echo ────────────────────────────────────────────────────────────
pause
"@

$content = $content.Replace($oldSection, $newSection)

# Ecrire avec BOM UTF-8
$encoding = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($file, $content, $encoding)

Write-Host "START_ANA.bat mis a jour avec script de tunnels automatique"
