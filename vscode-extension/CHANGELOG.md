# Change Log

All notable changes to the "FPGA Pin Planner" extension will be documented in this file.

## [1.0.0] - 2025-08-03

### Added
- 🎉 **初回リリース**: FPGA Pin Planner VS Code拡張機能
- 📥 **CSV Import**: ピンデータのCSVファイルインポート機能
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
