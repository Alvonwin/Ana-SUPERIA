$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("C:\Users\niwno\Desktop\ANA.lnk")
$Shortcut.TargetPath = "E:\ANA\START_ANA_OPTIMIZED.bat"
$Shortcut.WorkingDirectory = "E:\ANA"
$Shortcut.Description = "Ana SUPERIA IA Locale Optimisee"
$Shortcut.WindowStyle = 1
$Shortcut.Save()

Write-Host "Shortcut fixed successfully!" -ForegroundColor Green
Write-Host "TargetPath: $($Shortcut.TargetPath)" -ForegroundColor Cyan
