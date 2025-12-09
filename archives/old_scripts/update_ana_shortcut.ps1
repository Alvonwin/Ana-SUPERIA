# UPDATE_ANA_SHORTCUT.ps1
# Met à jour le shortcut ANA.lnk pour pointer vers START_ANA_OPTIMIZED.bat

$ShortcutPath = "C:\Users\niwno\Desktop\ANA.lnk"
$TargetPath = "E:\ANA\START_ANA_OPTIMIZED.bat"
$WorkingDirectory = "E:\ANA"
$IconLocation = "%SystemRoot%\System32\SHELL32.dll,13"

Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host "     MISE A JOUR SHORTCUT ANA - VERSION OPTIMISEE" -ForegroundColor Cyan
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Créer objet WScript.Shell
$WScriptShell = New-Object -ComObject WScript.Shell

# Charger ou créer le shortcut
$Shortcut = $WScriptShell.CreateShortcut($ShortcutPath)

# Configurer propriétés
$Shortcut.TargetPath = $TargetPath
$Shortcut.WorkingDirectory = $WorkingDirectory
$Shortcut.Description = "Ana SUPERIA - IA Locale Optimisée (Lazy Loading)"
$Shortcut.IconLocation = $IconLocation
$Shortcut.WindowStyle = 1

# Sauvegarder
$Shortcut.Save()

Write-Host "✅ Shortcut mis à jour avec succès!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Configuration:" -ForegroundColor Yellow
Write-Host "   Shortcut: $ShortcutPath" -ForegroundColor White
Write-Host "   Target: $TargetPath" -ForegroundColor White
Write-Host "   WorkDir: $WorkingDirectory" -ForegroundColor White
Write-Host ""
Write-Host "💡 Le shortcut ANA.lnk pointe maintenant vers la version OPTIMISÉE!" -ForegroundColor Green
Write-Host ""
Write-Host "🚀 Avantages:" -ForegroundColor Yellow
Write-Host "   • Backend + Frontend démarrent immédiatement (Chat ready)" -ForegroundColor White
Write-Host "   • Agents/ComfyUI/n8n démarrent automatiquement sur appel" -ForegroundColor White
Write-Host "   • Économie RAM: ~2-3 GB au lieu de ~5-6 GB" -ForegroundColor White
Write-Host ""
Write-Host "================================================================" -ForegroundColor Cyan
Write-Host ""

# Cleanup
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($WScriptShell) | Out-Null

Write-Host "Appuie sur une touche pour fermer..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
