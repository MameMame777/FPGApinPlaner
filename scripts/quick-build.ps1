#!/usr/bin/env pwsh
# FPGA Pin Planner - Quick Development Build Script
# For faster development cycles - skips some cleanup steps

param(
    [switch]$OnlyExtension = $false,
    [switch]$OnlyMain = $false,
    [switch]$NoInstall = $false
)

$ErrorActionPreference = "Stop"
$OriginalLocation = Get-Location

function Write-Step {
    param([string]$Message)
    Write-Host "`n⚡ $Message" -ForegroundColor Yellow
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

try {
    Write-Host "⚡ FPGA Pin Planner - Quick Development Build" -ForegroundColor Yellow
    Write-Host "=============================================" -ForegroundColor Yellow

    $RootDir = Split-Path -Parent $PSScriptRoot
    $ExtensionDir = Join-Path $RootDir "vscode-extension"

    # Quick main app build
    if (-not $OnlyExtension) {
        Write-Step "Quick build of main application..."
        Set-Location $RootDir
        npm run build
        Write-Success "Main app built"
    }

    # Quick extension build
    if (-not $OnlyMain) {
        Write-Step "Quick build of VS Code extension..."
        Set-Location $ExtensionDir
        
        # Only remove .vsix files for quick build
        Get-ChildItem -Filter "*.vsix" | Remove-Item -Force -ErrorAction SilentlyContinue
        
        npm run package
        Write-Success "Extension built"
        
        # Quick install
        if (-not $NoInstall) {
            Write-Step "Installing extension..."
            $VsixFiles = Get-ChildItem -Filter "*.vsix" | Sort-Object LastWriteTime -Descending
            if ($VsixFiles.Count -gt 0) {
                $VsixFile = $VsixFiles[0]
                & code --install-extension $VsixFile.FullName --force
                Write-Success "Extension installed: $($VsixFile.Name)"
            }
        }
    }

    Write-Host "`n⚡ Quick build completed!" -ForegroundColor Green

} catch {
    Write-Host "❌ Quick build failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
} finally {
    Set-Location $OriginalLocation
}
