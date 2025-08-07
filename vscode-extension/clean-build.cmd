@echo off
echo 🔧 Starting VS Code Extension Clean Build...

:: Clean build artifacts
echo 📁 Cleaning previous build artifacts...
if exist "out" rmdir /s /q "out"
if exist "dist" rmdir /s /q "dist"
if exist "webview-dist" rmdir /s /q "webview-dist"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"

:: Build main application first
echo 🏗️  Building main application first...
cd ..
call npm run build
if %errorlevel% neq 0 (
    echo ❌ Main application build failed!
    exit /b 1
)
cd vscode-extension

:: Install dependencies
echo 📦 Installing dependencies...
call npm install
if %errorlevel% neq 0 (
    echo ❌ npm install failed!
    exit /b 1
)

:: Package extension (includes copy-webview and compile)
echo 📦 Packaging extension...
call npm run package
if %errorlevel% neq 0 (
    echo ❌ Extension packaging failed!
    exit /b 1
)

echo 🎉 Clean build completed successfully!
echo 💡 To install: code --install-extension fpga-pin-planner-1.0.2.vsix --force
