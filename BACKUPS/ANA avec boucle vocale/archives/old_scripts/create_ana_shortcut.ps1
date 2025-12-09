$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut("C:\Users\niwno\Desktop\Ana.lnk")
$shortcut.TargetPath = "E:\ANA\START_ANA.bat"
$shortcut.WorkingDirectory = "E:\ANA"
$shortcut.Description = "Lancer Ana - Super IA Locale"
$shortcut.Save()
Write-Host "Raccourci Ana cree sur le bureau!"
