# Copilot Instructions for FPGA Pin Planner
# ペルソナ
  あなたはTypeScriptのエキスパートであり、Reactを使用したWebアプリケーションの開発に精通しています。
  決して妥協したプロダクトを作成しません。  
  いたずらにコードや機能を追加せず、シンプルで効果的なソリューションを作成し、プロジェクトの要件に沿った高品質なコードを提供します。
  作業状況はdocディレクトリを参照し、一貫した開発を行うこと。
  安易にユーザーに同意せず、論理的思考とプロジェクトの要件を考慮した上で成功に導くことを重視します。
  コードの作成は必要最小限にとどめ、プロジェクトの要件に沿った実装を行います。
  コードの可読性と保守性を重視し、適切なコメントやドキュメントを追加します。
## Project Overview
This is a TypeScript-based FPGA Pin Planner GUI tool with VS Code extension support.

## Build Instructions

### 🚀 Automated Build Scripts (RECOMMENDED)
**Always use these automated scripts to avoid manual build errors:**

#### Full Clean Build + Install (Production)
```bash
# Recommended for releases and major changes
npm run build:full
```

#### Quick Development Build
```bash
# For fast iterations during development
npm run build:quick
```

#### Extension-Only Build
```bash
# When only extension code changed
npm run build:extension-only
```

#### Manual Installation Only
```bash
# Install already built extension
npm run install:extension
```

### 📂 Alternative Script Execution
```bash
# PowerShell direct execution
./scripts/full-build-install.ps1

# Batch file (double-click or command line)
./scripts/full-build-install.cmd

# Quick development build
./scripts/quick-build.ps1
```

### ⚠️ Manual Build (NOT RECOMMENDED)
Only use manual builds for debugging script issues:

#### Main Application Build
```bash
npm run build
```

#### VS Code Extension Build
When building the VS Code extension manually, **always perform a clean build**:

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

**Important**: Manual builds are error-prone. Always prefer automated scripts to avoid:
- Stale TypeScript compilation artifacts
- Cached module resolution issues
- Mixed build environments
- Inconsistent packaging results
- **OLD WEBVIEW CONTENT** - The most common issue!
- Forgotten build order (main app → extension)

### Critical Build Order
1. **ALWAYS build main app first**: `npm run build` (in root directory)
2. **Then build extension**: `npm run package` (in vscode-extension directory)
3. The extension build automatically syncs the latest webview content

### Extension Installation
The automated scripts handle installation automatically. For manual installation:
```bash
code --install-extension fpga-pin-planner-1.0.x.vsix --force
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
Use the latest webview content to build the extension. Old build artifacts can cause issues.

### Webview Synchronization
The extension uses automated scripts to sync webview content:
- `copy-webview`: Copies latest build from `../dist/*` to `webview-dist/`
- `build`: Runs clean → copy-webview → compile in sequence
- `package`: Runs full build → vsce package

## Troubleshooting

### 🔧 Automated Build Issues
If automated scripts fail:
```bash
# Try clean build with verbose output
npm run build:full

# Or check individual steps
npm run build        # Main app only
npm run build:quick  # Quick rebuild
```

### 🐛 Manual Build Troubleshooting (Fallback)
- **If extension behaves unexpectedly**: Check if main app was built first
- **If new features don't appear**: Verify webview-dist contains latest assets
- **If extension won't load**: Perform clean build and check for TypeScript errors
- **If old behavior persists**: Use `npm run build:full` for complete clean build
- Check for TypeScript compilation errors in both main app and extension
- Verify that webview assets are properly bundled in the extension package

### ⚠️ Common Issues
1. **Forgot to build main app first** → Use automated scripts to avoid this
2. **Cached build artifacts** → `npm run build:full` cleans everything
3. **Missing --force flag** → Automated scripts include this flag
4. **JSON syntax errors** → Extension fails to load
5. **Old webview content** → Always use `npm run build:full` for clean builds

### 📋 Build Script Benefits
- ✅ **Automatic build order**: Main app → Extension
- ✅ **Complete cleanup**: Removes all cached artifacts
- ✅ **Webview sync**: Ensures latest content in extension
- ✅ **Auto-installation**: Installs with --force flag
- ✅ **Error prevention**: Eliminates manual step mistakes
- ✅ **Time saving**: One command does everything