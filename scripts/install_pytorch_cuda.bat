@echo off
REM ============================================
REM PyTorch CUDA Installation Script for Ana
REM Optimized for RTX 3070 (CUDA 12.1)
REM ============================================

echo.
echo === PyTorch CUDA Installation for Ana ===
echo Optimized for RTX 3070 8GB VRAM
echo.

REM Check Python
where python >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python not found!
    echo Please install Python 3.10+ first
    pause
    exit /b 1
)

echo Python found:
python --version

echo.
echo Installing PyTorch with CUDA 12.1 support...
echo This may take several minutes (downloading ~2GB)...
echo.

REM Best practice 2025: Use CUDA 12.1 for RTX 30xx series
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

if errorlevel 1 (
    echo.
    echo Installation failed. Try these alternatives:
    echo.
    echo 1. CPU only: pip install torch torchvision torchaudio
    echo 2. CUDA 11.8: pip install torch --index-url https://download.pytorch.org/whl/cu118
    echo.
    pause
    exit /b 1
)

echo.
echo === Verifying CUDA Installation ===
echo.

python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA version: {torch.version.cuda if torch.cuda.is_available() else \"N/A\"}'); print(f'GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"

if errorlevel 1 (
    echo.
    echo Verification failed. PyTorch may need CUDA toolkit.
    echo Download CUDA Toolkit 12.1 from:
    echo https://developer.nvidia.com/cuda-12-1-0-download-archive
)

echo.
echo === Installation Complete ===
pause
