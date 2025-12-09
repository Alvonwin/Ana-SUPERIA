$WshShell = New-Object -comObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut("$Home\Desktop\ANA BACKEND.lnk")
$Shortcut.TargetPath = "E:\ANA\LANCER_ANA_BACKEND.bat"
$Shortcut.WorkingDirectory = "E:\ANA\server"
$Shortcut.Description = "Ana Core Backend - Multi-LLM Router (Port 3338)"
$Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,168"
$Shortcut.Save()
Write-Host "Raccourci cree sur le bureau: ANA BACKEND.lnk"
