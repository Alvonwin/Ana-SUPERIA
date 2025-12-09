@echo off
powershell -Command "$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('C:\Users\niwno\Desktop\ANA.lnk'); $s.TargetPath = 'E:\ANA\START_ANA.bat'; $s.WorkingDirectory = 'E:\ANA'; $s.Save()"
echo Shortcut updated to START_ANA.bat
pause
