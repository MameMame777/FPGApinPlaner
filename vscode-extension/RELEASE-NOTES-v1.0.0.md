# FPGA Pin Planner v1.0.0 Release

## 🎉 初回リリース: FPGA Pin Planner VS Code Extension

### 📥 インストール方法

#### 方法1: VSIXファイルからインストール
1. [fpga-pin-planner-1.0.0.vsix](https://github.com/MameMame777/FPGApinPlaner/releases/download/v1.0.0/fpga-pin-planner-1.0.0.vsix) をダウンロード
2. VS Codeを開く
3. コマンドパレット（`Ctrl+Shift+P`）→ "Extensions: Install from VSIX..."
4. ダウンロードしたVSIXファイルを選択

#### 方法2: コマンドラインからインストール
```bash
code --install-extension fpga-pin-planner-1.0.0.vsix
```

### ✨ 主要機能

- 📥 **CSV Import**: ピンデータのCSVファイルインポート機能
- 📤 **Multi-Format Export**: XDC、SDC、QSF形式での制約ファイルエクスポート
- ⚡ **Voltage & I/O Standards**: 電圧レベルとI/O規格の包括的管理
- 🔍 **Pin Validation**: リアルタイム制約検証とエラー検出
- 📊 **Interactive Interface**: ユーザーフレンドリーなWebViewインターフェース

### 🚀 使用方法

1. VS Codeでプロジェクトを開く
2. コマンドパレット（`Ctrl+Shift+P`）→ "FPGA" で検索
3. "FPGA: Open Pin Planner" でメインインターフェースを開始

### 🎯 コマンド一覧

- `FPGA: Open Pin Planner` - メインピンプランナーインターフェースを開く
- `FPGA: Import CSV Pin Data` - CSVファイルからピン割り当てをインポート
- `FPGA: Export XDC Constraints` - Xilinx Design Constraints (XDC) をエクスポート
- `FPGA: Export SDC Constraints` - Synopsys Design Constraints (SDC) をエクスポート
- `FPGA: Export QSF Constraints` - Quartus Settings File (QSF) をエクスポート
- `FPGA: Load Sample Data` - サンプルデータを読み込み

### 🛡️ セキュリティ

- ✅ Content Security Policy (CSP) 実装済み
- ✅ 入力データの安全性検証
- ✅ ローカル処理のみ（外部送信なし）

### 📋 サポートファイル形式

**Import**: CSV (Xilinx公式フォーマット対応)  
**Export**: XDC (Vivado), SDC (Synopsys), QSF (Quartus)  
**Project**: .fpgaproj形式での状態保存

### 🐛 Issue報告・機能要求

[GitHub Issues](https://github.com/MameMame777/FPGApinPlaner/issues)

### 📄 ライセンス

MIT License

---

**開発者**: MameMame777  
**プロジェクト**: [FPGA Pin Planner](https://github.com/MameMame777/FPGApinPlaner)
