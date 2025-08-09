@echo off
REM FPGA Pin Planner - Full Build and Install Script (Batch version)
REM This script performs a clean build and install in one command

echo.
echo 🚀 FPGA Pin Planner - Full Build and Install
echo =================================================
echo.

REM Get script directory
set "SCRIPT_DIR=%~dp0"
set "ROOT_DIR=%SCRIPT_DIR%.."
set "EXTENSION_DIR=%ROOT_DIR%\vscode-extension"

echo 📁 Root Directory: %ROOT_DIR%
echo 📁 Extension Directory: %EXTENSION_DIR%
echo.

REM Step 1: Build Main Application
echo 🔄 Building main FPGA Pin Planner application...
cd /d "%ROOT_DIR%"

REM Clean previous build
if exist "dist" (
    rmdir /s /q "dist"
    echo    🧹 Cleaned previous dist/ directory
)

REM Build main app
call npm run build
if errorlevel 1 (
    echo ❌ Main application build failed
    pause
    exit /b 1
)
echo ✅ Main application build completed
echo.

REM Step 2: Build VS Code Extension
echo 🔄 Building VS Code extension...
cd /d "%EXTENSION_DIR%"

REM Clean previous extension build
if exist "out" rmdir /s /q "out"
if exist "dist" rmdir /s /q "dist"
if exist "webview-dist" rmdir /s /q "webview-dist"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
echo    🧹 Cleaned previous build directories

REM Remove old .vsix files
for %%f in (*.vsix) do (
    del "%%f"
    echo    🧹 Removed old %%f
)

REM Package extension (includes clean build and webview sync)
call npm run package
if errorlevel 1 (
    echo ❌ VS Code extension build failed
    pause
    exit /b 1
)
echo ✅ VS Code extension build completed
echo.

REM Step 3: Install Extension
echo 🔄 Installing VS Code extension...

REM Find the latest .vsix file
for %%f in (*.vsix) do set "VSIX_FILE=%%f"

if not defined VSIX_FILE (
    echo ❌ No .vsix file found. Extension build may have failed.
    pause
    exit /b 1
)

echo    📦 Installing: %VSIX_FILE%

REM Install extension with force flag
code --install-extension "%VSIX_FILE%" --force
if errorlevel 1 (
    echo ❌ Extension installation failed
    pause
    exit /b 1
)

echo ✅ Extension installed successfully: %VSIX_FILE%
echo.
echo 🎉 Full build and install completed successfully!
echo =================================================

REM Show file info
for %%f in ("%VSIX_FILE%") do (
    set /a "SIZE_MB=%%~zf / 1048576"
    echo 📊 Extension Package: %%~nxf (!SIZE_MB! MB^)
)

echo.
echo Press any key to exit...
pause >nul
