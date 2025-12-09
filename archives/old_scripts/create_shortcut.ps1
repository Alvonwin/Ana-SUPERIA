$WS = New-Object -ComObject WScript.Shell
$Shortcut = $WS.CreateShortcut("C:\Users\niwno\Desktop\ANA.lnk")
$Shortcut.TargetPath = "E:\ANA\START_ANA_SIMPLE.bat"
$Shortcut.WorkingDirectory = "E:\ANA"
$Shortcut.Description = "Lancer ANA - Super IA Locale"
$Shortcut.Save()
Write-Host "Raccourci cree sur le bureau: C:\Users\niwno\Desktop\ANA.lnk"
