@echo off
chcp 65001 >nul
echo.
echo ================================================================
echo      MISE A JOUR SHORTCUT ANA - VERSION OPTIMISEE
echo ================================================================
echo.

powershell -Command "& {$shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut('C:\Users\niwno\Desktop\ANA.lnk'); $shortcut.TargetPath = 'E:\ANA\START_ANA_OPTIMIZED.bat'; $shortcut.WorkingDirectory = 'E:\ANA'; $shortcut.Description = 'Ana SUPERIA IA Locale Optimisee'; $shortcut.WindowStyle = 1; $shortcut.Save()}"

if %errorlevel% equ 0 (
    echo ✅ Shortcut mis à jour avec succès!
    echo.
    echo 📋 Configuration:
    echo    Shortcut: C:\Users\niwno\Desktop\ANA.lnk
    echo    Target: E:\ANA\START_ANA_OPTIMIZED.bat
    echo.
    echo 💡 Le shortcut ANA.lnk pointe maintenant vers la version OPTIMISÉE!
    echo.
    echo 🚀 Avantages:
    echo    • Backend + Frontend démarrent immédiatement (Chat ready)
    echo    • Agents/ComfyUI/n8n démarrent automatiquement sur appel
    echo    • Économie RAM: ~2-3 GB au lieu de ~5-6 GB
    echo.
) else (
    echo ❌ Erreur lors de la mise à jour du shortcut
    echo.
)

echo ================================================================
echo.
pause
