# Copilot Instructions for FPGA Pin Planner

## Project Overview
This is a TypeScript-based FPGA Pin Planner GUI tool with VS Code extension support.

## Build Instructions

### Main Application Build
```bash
npm run build
```

### VS Code Extension Build
When building the VS Code extension, **always perform a clean build** to prevent old build artifacts from causing issues:

```bash
# Navigate to the extension directory
cd vscode-extension

# CRITICAL: First build the main application to ensure latest changes
cd ..
npm run build
cd vscode-extension

# Clean previous build artifacts
rm -rf out/ dist/ node_modules/.cache/

# Install dependencies (if needed)
npm install

# Clean build and package (uses automated webview sync)
npm run package
```

**Important**: Always use clean builds for the extension to avoid:
- Stale TypeScript compilation artifacts
- Cached module resolution issues
- Mixed build environments
- Inconsistent packaging results
- **OLD WEBVIEW CONTENT** - The most common issue!

### Critical Build Order
1. **ALWAYS build main app first**: `npm run build` (in root directory)
2. **Then build extension**: `npm run package` (in vscode-extension directory)
3. The extension build automatically syncs the latest webview content

### Extension Installation
After building, install the extension with:
```bash
code --install-extension fpga-pin-planner-1.0.1.vsix --force
```

**Note**: Use `--force` flag to overwrite previous installations

## Development Guidelines

### Key Components
- **Main App**: `src/App.tsx` - Main application logic
- **Pin Components**: `src/components/common/PinItem.tsx` - Pin display and interaction
- **Differential Pair Utils**: `src/utils/differential-pair-utils.ts` - Differential pin logic
- **VS Code Extension**: `vscode-extension/` - Extension source code

### Recent Features
- Differential pin sorting: When a differential pin is selected in the viewer, its pair partner automatically appears as the second item in the list
- Visual indicators for differential pair partners
- Enhanced pin selection and sorting logic

### Build Process
1. **Main application build creates optimized production assets** (`dist/` directory)
2. **Extension build automatically copies webview assets** from `dist/` to `webview-dist/`
3. **Extension compiles TypeScript** and packages everything into `.vsix` file
4. **Always follow proper build order**: main app → extension
5. Test both standalone web version and VS Code extension after changes

### Webview Synchronization
The extension uses automated scripts to sync webview content:
- `copy-webview`: Copies latest build from `../dist/*` to `webview-dist/`
- `build`: Runs clean → copy-webview → compile in sequence
- `package`: Runs full build → vsce package

## Troubleshooting
- **If extension behaves unexpectedly**: Check if main app was built first
- **If new features don't appear**: Verify webview-dist contains latest assets
- **If extension won't load**: Perform clean build and check for TypeScript errors
- **If old behavior persists**: Manually delete webview-dist and rebuild
- Check for TypeScript compilation errors in both main app and extension
- Verify that webview assets are properly bundled in the extension package

### Common Issues
1. **Forgot to build main app first** → Extension uses old webview content
2. **Cached build artifacts** → Features don't update properly
3. **Missing --force flag** → Old extension version still active
4. **JSON syntax errors** → Extension fails to load