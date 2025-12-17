# Apply tunnel fix to START_ANA.bat
$file = "E:\ANA\START_ANA.bat"

# Read all lines
$lines = Get-Content $file -Encoding UTF8

# Find line numbers to replace
$startLine = -1
$endLine = -1
for ($i = 0; $i -lt $lines.Count; $i++) {
    if ($lines[$i] -match "REM.*tunnels Cloudflare") {
        $startLine = $i
    }
    if ($lines[$i] -eq "exit") {
        $endLine = $i
        break
    }
}

if ($startLine -ge 0 -and $endLine -ge 0) {
    # Build new content
    $newLines = $lines[0..($startLine-1)]
    $newLines += "REM Demarrage des tunnels Cloudflare avec mise a jour automatique de config.js"
    $newLines += 'powershell -ExecutionPolicy Bypass -File "E:\ANA\start_tunnels.ps1"'
    $newLines += ""
    $newLines += "echo --------------------------------------------------------"
    $newLines += "echo   Ana est prete! Acces mobile via URL Frontend ci-dessus."
    $newLines += "echo   Pour arreter Ana: Settings - Fermer Ana"
    $newLines += "echo --------------------------------------------------------"
    $newLines += "pause"
    $newLines += ""

    # Write with BOM
    $encoding = New-Object System.Text.UTF8Encoding($true)
    $content = $newLines -join "`r`n"
    [System.IO.File]::WriteAllText($file, $content, $encoding)

    Write-Host "START_ANA.bat mis a jour avec succes!" -ForegroundColor Green
    Write-Host "Lignes $startLine a $endLine remplacees" -ForegroundColor Gray
} else {
    Write-Host "Erreur: Section Cloudflare non trouvee" -ForegroundColor Red
}
