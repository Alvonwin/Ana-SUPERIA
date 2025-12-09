@echo off
REM ============================================
REM FFmpeg Installation Script for Ana
REM Best Practice 2025: Use winget
REM ============================================

echo.
echo === FFmpeg Installation for Ana ===
echo.

REM Check if winget is available
where winget >nul 2>&1
if errorlevel 1 (
    echo ERROR: winget not found!
    echo Please install App Installer from Microsoft Store
    echo Or download FFmpeg manually from: https://ffmpeg.org/download.html
    pause
    exit /b 1
)

REM Check if FFmpeg is already installed
where ffmpeg >nul 2>&1
if not errorlevel 1 (
    echo FFmpeg is already installed!
    ffmpeg -version | findstr "ffmpeg version"
    pause
    exit /b 0
)

echo Installing FFmpeg via winget...
echo This may take a few minutes...
echo.

winget install Gyan.FFmpeg -h

if errorlevel 1 (
    echo.
    echo Installation may have failed. Try these alternatives:
    echo.
    echo 1. Manual download: https://www.gyan.dev/ffmpeg/builds/
    echo 2. Download ffmpeg-release-essentials.zip
    echo 3. Extract to C:\ffmpeg
    echo 4. Add C:\ffmpeg\bin to system PATH
    echo.
    pause
    exit /b 1
)

echo.
echo === Installation Complete ===
echo.
echo Please restart your terminal for PATH changes to take effect.
echo.

REM Verify installation
echo Verifying installation...
where ffmpeg 2>nul
if errorlevel 1 (
    echo.
    echo FFmpeg installed but not in PATH yet.
    echo Restart terminal or add to PATH manually.
) else (
    ffmpeg -version | findstr "ffmpeg version"
)

pause
