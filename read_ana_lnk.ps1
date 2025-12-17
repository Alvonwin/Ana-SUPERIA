$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut("C:\Users\niwno\Desktop\ANA.lnk")
Write-Host "=== ANA.lnk ==="
Write-Host "Target:" $lnk.TargetPath
Write-Host "Arguments:" $lnk.Arguments
Write-Host "WorkingDir:" $lnk.WorkingDirectory
