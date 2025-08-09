#!/usr/bin/env pwsh
# FPGA Pin Planner - Full Build and Install Script
# This script performs a clean build of both the main app and VS Code extension,
# then installs the extension automatically.

param(
    [switch]$SkipMainBuild = $false,
    [switch]$SkipExtensionBuild = $false,
    [switch]$SkipInstall = $false,
    [switch]$Force = $true
)

$ErrorActionPreference = "Stop"
$OriginalLocation = Get-Location

function Write-Step {
    param([string]$Message)
    Write-Host "`n🔄 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️ $Message" -ForegroundColor Yellow
}

try {
    Write-Host "🚀 FPGA Pin Planner - Full Build and Install Script" -ForegroundColor Magenta
    Write-Host "=================================================" -ForegroundColor Magenta

    # Get root directory
    $RootDir = Split-Path -Parent $PSScriptRoot
    $ExtensionDir = Join-Path $RootDir "vscode-extension"
    
    Write-Host "📁 Root Directory: $RootDir"
    Write-Host "📁 Extension Directory: $ExtensionDir"

    # Step 1: Build Main Application
    if (-not $SkipMainBuild) {
        Write-Step "Building main FPGA Pin Planner application..."
        Set-Location $RootDir
        
        # Clean previous build
        if (Test-Path "dist") {
            Remove-Item -Recurse -Force "dist"
            Write-Host "   🧹 Cleaned previous dist/ directory"
        }
        
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "   📦 Installing dependencies..."
            npm install
        }
        
        # Build main app
        npm run build
        Write-Success "Main application build completed"
    } else {
        Write-Warning "Skipping main application build"
    }

    # Step 2: Build VS Code Extension
    if (-not $SkipExtensionBuild) {
        Write-Step "Building VS Code extension..."
        Set-Location $ExtensionDir
        
        # Clean previous extension build
        $CleanupPaths = @("out", "dist", "webview-dist", "node_modules\.cache")
        foreach ($path in $CleanupPaths) {
            if (Test-Path $path) {
                Remove-Item -Recurse -Force $path
                Write-Host "   🧹 Cleaned $path"
            }
        }
        
        # Remove old .vsix files
        Get-ChildItem -Filter "*.vsix" | Remove-Item -Force
        Write-Host "   🧹 Removed old .vsix files"
        
        # Install dependencies if needed
        if (-not (Test-Path "node_modules")) {
            Write-Host "   📦 Installing extension dependencies..."
            npm install
        }
        
        # Package extension (includes clean build and webview sync)
        npm run package
        Write-Success "VS Code extension build completed"
    } else {
        Write-Warning "Skipping VS Code extension build"
    }

    # Step 3: Install Extension
    if (-not $SkipInstall) {
        Write-Step "Installing VS Code extension..."
        Set-Location $ExtensionDir
        
        # Find the latest .vsix file
        $VsixFiles = Get-ChildItem -Filter "*.vsix" | Sort-Object LastWriteTime -Descending
        if ($VsixFiles.Count -eq 0) {
            throw "No .vsix file found. Extension build may have failed."
        }
        
        $VsixFile = $VsixFiles[0]
        Write-Host "   📦 Installing: $($VsixFile.Name)"
        
        # Install extension
        $InstallArgs = @("--install-extension", $VsixFile.FullName)
        if ($Force) {
            $InstallArgs += "--force"
        }
        
        & code @InstallArgs
        Write-Success "Extension installed successfully: $($VsixFile.Name)"
    } else {
        Write-Warning "Skipping extension installation"
    }

    Write-Host "`n🎉 Full build and install completed successfully!" -ForegroundColor Green
    Write-Host "=================================================" -ForegroundColor Magenta
    
    # Show summary
    Set-Location $ExtensionDir
    $VsixFiles = Get-ChildItem -Filter "*.vsix" | Sort-Object LastWriteTime -Descending
    if ($VsixFiles.Count -gt 0) {
        $VsixFile = $VsixFiles[0]
        $VsixSize = [math]::Round($VsixFile.Length / 1MB, 2)
        Write-Host "📊 Extension Package: $($VsixFile.Name) ($VsixSize MB)"
    }

} catch {
    Write-Error "Build failed: $($_.Exception.Message)"
    exit 1
} finally {
    Set-Location $OriginalLocation
}
