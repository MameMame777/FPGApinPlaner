# Change Log

All notable changes to the "FPGA Pin Planner" extension will be documented in this file.

## [1.0.2] - 2025-08-07

### Changed
- 🚀 **Performance Optimization**: Removed BGM audio functionality for improved stability and performance
- 🧹 **Code Refactoring**: Streamlined codebase by eliminating unused audio components
- 📦 **Bundle Size Reduction**: Reduced extension size by removing audio-related dependencies
- 🎨 **Enhanced UI**: Cleaner interface with better user experience and responsiveness

### Removed
- 🎵 **BGM Audio System**: Removed background music functionality to resolve playback issues
- 📱 **Audio Controls**: Removed BGM control components from the interface
- 🔧 **Audio Dependencies**: Cleaned up audio-related imports and stores

### Fixed
- 🐛 **Audio Loop Issues**: Resolved continuous audio playback loop problems
- ⚡ **Memory Usage**: Improved memory efficiency by removing audio processing overhead
- 🔧 **Build Process**: Enhanced clean build process for better consistency

## [1.0.1] - 2025-08-03

### Changed
- 🎨 **Icon Update**: Updated extension icon to use `icon.png` for better visibility
- 📦 **Package Enhancement**: Improved marketplace presentation with new icon

### Fixed
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
