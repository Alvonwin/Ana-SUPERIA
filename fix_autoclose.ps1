# Restore auto-close in START_ANA.bat
$file = "E:\ANA\START_ANA.bat"
$content = Get-Content $file -Raw -Encoding UTF8

$oldEnd = @"
echo --------------------------------------------------------
echo   Ana est prete! Acces mobile via URL Frontend ci-dessus.
echo   Pour arreter Ana: Settings - Fermer Ana
echo --------------------------------------------------------
pause
"@

$newEnd = @"
echo --------------------------------------------------------
echo   Cette fenetre va se fermer dans 5 secondes...
echo   URLs dans Settings > Acces Distant
echo --------------------------------------------------------
timeout /t 5 /nobreak >nul
exit
"@

$content = $content.Replace($oldEnd, $newEnd)

$encoding = New-Object System.Text.UTF8Encoding($true)
[System.IO.File]::WriteAllText($file, $content, $encoding)
Write-Host "START_ANA.bat: auto-close restaure" -ForegroundColor Green
