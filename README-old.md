# FPGA Pin Planner

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.5-yellow)](https://vitejs.dev/)
[![VS Code Extension](https://img.shields.io/badge/VS%20Code-Extension-blue)](https://marketplace.visualstudio.com/vscode)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Audited-green)](docs/security-audit.md)

FPGAのピン配置を効率的に行うためのモダンなGUIツールです。直感的なインターフェースと高度な機能により、FPGAピンプランニング作業を大幅に効率化します。

**🆕 最新アップデート (2025年8月3日)**
- ✅ VS Code拡張機能として完全統合
- ✅ 大きなCSVファイルでのビューポート改善
- ✅ コマンドパレット経由でのサンプルデータ読み込み
- ✅ セキュリティ監査完了・対策実装済み

## ✨ 主要機能

### 🔧 VS Code統合機能
- **コマンドパレット**: `Ctrl+Shift+P` → "FPGA" で機能検索
- **ワークスペース統合**: プロジェクトファイルとの連携
- **WebView**: ネイティブ風の快適なUI体験
- **キーボード操作**: VS Codeの操作感を維持

### 📁 ファイル入出力
- **CSV読み込み**: Xilinx公式フォーマット完全対応
- **制約ファイル出力**: XDC (Xilinx)、SDC、QSF (Intel) 形式
- **プロジェクト管理**: .fpgaproj 独自形式での保存/読み込み

### 🎯 ピン編集・管理
- **プルダウン選択**: Voltage (1.0V-5.0V) と I/O Standard (LVCMOS, LVDS等)
- **スマート連携**: 電圧変更時のI/O規格自動更新
- **バッチ操作**: 複数ピンの一括設定 (信号、電圧、I/O規格、方向)
- **差動ペア管理**: 自動検出・検証・制約チェック

### 🔍 高度な検索・フィルタ
- **多条件検索**: ピン番号、信号名、バンク、電圧レベル等
- **タブ別表示**: Overview、Signals、Banks、Differential Pairs
- **リアルタイムフィルタ**: 条件変更時の即座な結果更新

### ⚡ バッチ処理機能
- **配列パターン**: DATA[0]〜DATA[31] 等の連続信号割り当て
- **差動ペア**: CLK_P/CLK_N ペアの一括生成
- **電圧・I/O規格**: 互換性チェック付き一括設定
- **プレビュー機能**: 実行前の変更内容確認

### 🛡️ 検証・制約チェック
- **AMD/Xilinx UltraScale準拠**: 業界標準の制約ルール
- **バンク互換性**: 電圧レベル・I/O規格の適合性チェック
- **差動ペア検証**: 物理的近接性・電気的特性の確認
- **リアルタイム警告**: 設定エラーの即座通知

### 🎨 ユーザーエクスペリエンス
- **Undo/Redo**: 全操作の取り消し・やり直し対応
- **コメント機能**: テンプレート・自動生成・履歴管理
- **カスタマイズ**: 設定パネルでの表示・動作調整

## 🚀 技術スタック

- **Frontend**: React 18 + TypeScript 5.0
- **State Management**: Zustand + Immer
- **UI Framework**: Modern CSS with custom components
- **Build Tool**: Vite 4.5
- **Testing**: Vitest + React Testing Library
- **Development**: Hot Module Replacement (HMR)

## 📦 クイックスタート

### 前提条件
- Node.js 18.0+ 
- npm 9.0+

### インストール & 起動

#### VS Code拡張機能 (推奨)

最も簡単な使用方法はVS Code拡張機能です：

1. **拡張機能のインストール:**
   - リリースから `fpga-pin-planner-1.0.0.vsix` をダウンロード
   - VS Codeで: `Ctrl+Shift+P` → "Extensions: Install from VSIX..."
   - ダウンロードしたファイルを選択

2. **使用開始:**
   - `Ctrl+Shift+P` → "FPGA: Open Pin Planner"
   - CSVファイルを右クリック → "Import CSV Pin Data"
   - コマンドパレットから制約ファイルをエクスポート

#### Webアプリケーション

スタンドアロン使用または開発用：

```bash
# リポジトリをクローン
git clone https://github.com/your-username/fpga-pin-planner.git
cd fpga-pin-planner

# 依存関係のインストール
npm install

# 開発サーバー起動
npm run dev

# ブラウザで http://localhost:5173 を開く
```

### ビルド & テスト

```bash
# プロダクションビルド
npm run build

# テスト実行
npm run test

# 型チェック
npm run type-check
```
npm install

# 開発サーバー起動（プロトタイプ作成後）
npm run dev

# Electronアプリ起動（プロトタイプ作成後）
npm run electron:dev
```

## ライセンス
MIT License

## 作成者
GitHub Copilot