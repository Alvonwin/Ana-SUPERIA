Set WshShell = CreateObject("WScript.Shell")
Set Shortcut = WshShell.CreateShortcut("C:\Users\niwno\Desktop\ANA.lnk")
WScript.Echo "TargetPath: " & Shortcut.TargetPath
WScript.Echo "Arguments: " & Shortcut.Arguments
WScript.Echo "WorkingDirectory: " & Shortcut.WorkingDirectory
WScript.Echo "Description: " & Shortcut.Description
