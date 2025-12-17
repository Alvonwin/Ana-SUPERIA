@echo off
echo ========================================
echo FIX VISION PROMPT - Anti-hallucination
echo ========================================
echo.

cd /d E:\ANA\server

echo Backup ana-core.cjs...
copy ana-core.cjs ana-core.cjs.backup_vision_fix

echo.
echo Applying patch with PowerShell...
powershell -Command "(Get-Content ana-core.cjs -Raw) -replace 'content: fullPrompt,\s*\n\s*images: images', 'content: visionPrompt,`n              images: images' | Set-Content ana-core.cjs"

echo.
echo Verifying...
findstr /C:"visionPrompt" ana-core.cjs >nul
if %errorlevel%==0 (
    echo [OK] Patch applied successfully!
) else (
    echo [FAIL] Patch not applied. Manual fix needed.
)

echo.
echo NOTE: You still need to add the visionPrompt variable.
echo See E:\ANA\server\patches\vision-prompt-fix.cjs for instructions.
echo.
pause
