# VS Code Extension Clean Build Script for FPGA Pin Planner
# This script performs a complete clean build of the VS Code extension

Write-Host "🔧 Starting VS Code Extension Clean Build..." -ForegroundColor Cyan

# Step 1: Clean previous build artifacts
Write-Host "`n📁 Cleaning previous build artifacts..." -ForegroundColor Yellow
if (Test-Path "out") {
    Remove-Item "out" -Recurse -Force
    Write-Host "   ✓ Removed out/ directory" -ForegroundColor Green
}
if (Test-Path "dist") {
    Remove-Item "dist" -Recurse -Force
    Write-Host "   ✓ Removed dist/ directory" -ForegroundColor Green
}
if (Test-Path "webview-dist") {
    Remove-Item "webview-dist" -Recurse -Force
    Write-Host "   ✓ Removed webview-dist/ directory" -ForegroundColor Green
}
if (Test-Path "node_modules\.cache") {
    Remove-Item "node_modules\.cache" -Recurse -Force
    Write-Host "   ✓ Removed node_modules/.cache/ directory" -ForegroundColor Green
}

# Step 2: Ensure main application is built (critical step)
Write-Host "`n🏗️  Building main application first..." -ForegroundColor Yellow
Set-Location ".."
& npm.cmd run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Main application build failed!" -ForegroundColor Red
    exit 1
}
Set-Location "vscode-extension"
Write-Host "   ✓ Main application built successfully" -ForegroundColor Green

# Step 3: Install dependencies if needed
Write-Host "`n📦 Installing dependencies..." -ForegroundColor Yellow
& npm.cmd install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ npm install failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Dependencies installed" -ForegroundColor Green

# Step 4: Copy latest webview content
Write-Host "`n📋 Copying latest webview content..." -ForegroundColor Yellow
& npm.cmd run copy-webview
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Webview copy failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Webview content copied" -ForegroundColor Green

# Step 5: Compile TypeScript
Write-Host "`n⚙️  Compiling TypeScript..." -ForegroundColor Yellow
& npm.cmd run compile
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ TypeScript compilation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ TypeScript compiled successfully" -ForegroundColor Green

# Step 6: Package extension
Write-Host "`n📦 Packaging extension..." -ForegroundColor Yellow
& npm.cmd run package
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Extension packaging failed!" -ForegroundColor Red
    exit 1
}
Write-Host "   ✓ Extension packaged successfully" -ForegroundColor Green

# Step 7: Show results
Write-Host "`n🎉 Clean build completed successfully!" -ForegroundColor Green
$vsixFiles = Get-ChildItem "*.vsix" | Sort-Object LastWriteTime -Descending
if ($vsixFiles) {
    $latestVsix = $vsixFiles[0]
    Write-Host "   📄 Generated: $($latestVsix.Name)" -ForegroundColor Cyan
    Write-Host "   📏 Size: $([math]::Round($latestVsix.Length / 1MB, 2)) MB" -ForegroundColor Cyan
    
    Write-Host "`n💡 To install the extension:" -ForegroundColor Magenta
    Write-Host "   code --install-extension $($latestVsix.Name) --force" -ForegroundColor White
} else {
    Write-Host "⚠️  No .vsix file found!" -ForegroundColor Yellow
}

Write-Host "`n✨ Build process completed!" -ForegroundColor Green
