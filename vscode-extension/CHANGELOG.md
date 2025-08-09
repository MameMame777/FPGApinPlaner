# Change Log

All notable changes to the "FPGA Pin Planner" extension will be documented in this file.

## [1.0.5] - 2025-08-09

### Changed

- 🚀 **CI/CD Pipeline Enhancement**: Fixed GitHub Actions workflows for improved reliability
- 🛠️ **Code Quality Improvements**: Achieved zero ESLint warnings with optimized configuration
- ⚡ **Test Suite Stability**: All 54 tests now passing consistently
- 📦 **Build Process Optimization**: Enhanced build scripts for better developer experience

### Fixed

- 🔧 **ESLint Configuration**: Added argsIgnorePattern for underscore-prefixed parameters
- 🔧 **Dependency Review**: Disabled dependency-review-action for private repositories
- 🧹 **Code Cleanup**: Removed empty test files and resolved all warnings
- 📋 **Webview Assets**: Updated webview distribution with latest build artifacts

### Enhanced

- 📈 **Release Process**: Streamlined dual-platform release (GitHub + VS Code Marketplace)
- 🏗️ **Build Automation**: Improved automated build scripts with proper sequencing
- 📊 **Quality Metrics**: Maintained 100% test coverage with zero-warning policy
- 🔄 **Version Management**: Synchronized version management across main app and extension

## [1.0.3] - 2025-08-07

### Updates

- 🔄 **Core Updates**: Applied latest user modifications and improvements
- 🛠️ **Code Enhancements**: Updated service modules and core application logic
- 📝 **Documentation**: Updated README and configuration files
- ⚡ **Build Optimization**: Refreshed build process with latest changes

### Bug Fixes

- 🔧 **Asset Synchronization**: Ensured latest webview assets are properly bundled
- 📦 **Package Integrity**: Verified all user modifications are included in the build

## [1.0.2] - 2025-08-07

### Performance Improvements

- 🚀 **Performance Optimization**: Removed BGM audio functionality for improved stability and performance
- 🧹 **Code Refactoring**: Streamlined codebase by eliminating unused audio components
- 📦 **Bundle Size Reduction**: Reduced extension size by removing audio-related dependencies
- 🎨 **Enhanced UI**: Cleaner interface with better user experience and responsiveness

### Removed Features

- 🎵 **BGM Audio System**: Removed background music functionality to resolve playback issues
- 📱 **Audio Controls**: Removed BGM control components from the interface
- 🔧 **Audio Dependencies**: Cleaned up audio-related imports and stores

### Bug Fixes

- 🐛 **Audio Loop Issues**: Resolved continuous audio playback loop problems
- ⚡ **Memory Usage**: Improved memory efficiency by removing audio processing overhead
- 🔧 **Build Process**: Enhanced clean build process for better consistency

## [1.0.1] - 2025-08-03

### Icon Updates

- 🎨 **Icon Update**: Updated extension icon to use `icon.png` for better visibility
- 📦 **Package Enhancement**: Improved marketplace presentation with new icon

### Icon Fixes

- 🔧 **Icon Display**: Fixed icon display issues in VS Code marketplace and extension list

## [1.0.0] - 2025-08-03

### Added
- 🎉 **初回リリース**: FPGA Pin Planner VS Code拡張機能
- � **VS Code Marketplace公開**: [marketplace.visualstudio.com](https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner)
- �📥 **CSV Import**: ピンデータのCSVファイルインポート機能
- 📤 **Multi-Format Export**: XDC、SDC、QSF形式での制約ファイルエクスポート
- ⚡ **Voltage & I/O Standards**: 電圧レベルとI/O規格の包括的管理
- 🔍 **Pin Validation**: リアルタイム制約検証とエラー検出
- 📊 **Interactive Interface**: ユーザーフレンドリーなWebViewインターフェース
- 🎯 **Context Integration**: CSVおよび制約ファイル用の右クリックコンテキストメニュー

### Features
- **WebView Integration**: VS Code内でのネイティブ風UI体験
- **Command Palette**: `Ctrl+Shift+P` → "FPGA"で全機能にアクセス
- **Sample Data Loading**: サンプルデータの自動読み込み機能
- **Keyboard Shortcuts**: 効率的なキーボード操作
- **Theme Support**: VS Codeテーマとの統合

### Security
- ✅ **Content Security Policy**: XSS攻撃防止のCSP実装
- ✅ **Input Validation**: 入力データの安全性検証
- ✅ **Local Processing**: 外部送信なしのローカル処理

### Supported Formats
- **Import**: CSV (Xilinx公式フォーマット対応)
- **Export**: XDC (Vivado), SDC (Synopsys), QSF (Quartus)
- **Project**: .fpgaproj形式での状態保存

### Technical Details
- **Runtime**: VS Code 1.74.0+
- **Languages**: TypeScript, React
- **Build**: Webpack + Vite
- **Testing**: Comprehensive unit and integration tests

---

**Installation**: VS Code Marketplace または VSIXファイルからインストール
**Support**: GitHub Issues および GitHub Discussions
