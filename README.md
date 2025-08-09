# FPGA Pin Planner

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0-blue)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-4.5-yellow)](https://vitejs.dev/)
[![VS Code Extension](https://img.shields.io/visual-studio-marketplace/v/MameMame777.fpga-pin-planner?label=VS%20Code%20Marketplace&logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/MameMame777.fpga-pin-planner)](https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner)
[![Rating](https://img.shields.io/visual-studio-marketplace/r/MameMame777.fpga-pin-planner)](https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)
[![Security](https://img.shields.io/badge/Security-Audited-green)](docs/security-audit.md)

🎉 **VS Code Marketplace公開済み！** [今すぐインストール →](https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner)

FPGAのピン配置を効率的に行うためのモダンなGUIツールです。直感的なインターフェースと高度な機能により、FPGAピンプランニング作業を大幅に効率化します。

## 🆕 最新アップデート (2025年8月9日)

### v1.0.5 品質・信頼性向上リリース
- ✅ **コード品質向上**: ESLintWarning 97個→0個達成、完璧なコード品質を実現
- ✅ **テスト安定性**: 全54テストが安定して成功、100%テストカバレッジ維持
- ✅ **CI/CD改善**: GitHub Actionsワークフローの信頼性向上・私的リポジトリ対応
- ✅ **ビルドプロセス最適化**: 自動化ビルドスクリプトの改良・シーケンス改善
- ✅ **Webview更新**: 最新ビルド成果物の配布・アセット同期改善
- ✅ **リリースプロセス**: GitHub・VS Code Marketplace二重プラットフォーム公開

### 既存機能
- ✅ **音声機能削除**: BGM再生機能を削除し、アプリケーションパフォーマンスを向上
- ✅ **リサイズ可能UIパネル**: 左右サイドバーをドラッグリサイズ可能（最小200px、最大500px）
- ✅ **Bank Groups動的テーブル**: CSVデータに基づく自動Bank統計生成・表示
- ✅ **Package Canvas凡例改善**: Bank GroupsとPin Typesの並列表示
- ✅ **差動ペア表示改善**: 選択時の自動ソート・視覚的インジケータ強化
- ✅ **クリーンビルドスクリプト**: VS Code拡張機能の自動化ビルドシステム
- ✅ VS Code拡張機能として完全統合
- ✅ サンプルデータの自動読み込み機能追加
- ✅ 非機能サイドバーボタンの削除・UI最適化
- ✅ 回転表示バグ修正・ビューポート改善
- ✅ セキュリティ監査完了・対策実装済み

## ✨ 主要機能

### 🔧 VS Code統合機能

- **コマンドパレット**: `Ctrl+Shift+P` → "FPGA" で全機能にアクセス
- **コンテキストメニュー**: CSVファイル右クリックでPin Planner起動
- **Webviewパネル**: ネイティブ風の快適なUI体験
- **リサイズ可能パネル**: 左右サイドバーのドラッグリサイズ対応（200px-500px）
- **自動パネル作成**: コマンド実行時に自動でパネルを開く
- **サンプルデータ**: ワンクリックでXilinx XC7A12Tサンプルデータを読み込み
- **ファイル操作**: VS Code統合でスムーズなファイル保存・読み込み

### 📁 ファイル入出力

- **CSV読み込み**: Xilinx公式フォーマット完全対応
- **プロジェクト保存**: .fpgaproj形式での状態永続化
- **Excel対応**: 高精度データ変換

### 🎯 ピン編集・管理

- **プルダウン選択**: Voltage (1.0V-5.0V) と I/O Standard (LVCMOS, LVDS等)
- **差動ペア**: 自動ペアリング・検証機能
- **コメント管理**: ピン単位でのメモ・注釈
- **インライン編集**: セル直接編集による直感的操作

### 🔍 高度な検索・フィルタ

- **多条件検索**: ピン番号、信号名、バンク、電圧レベル等
- **正規表現**: 高度なパターンマッチング
- **ハイライト**: 該当セルの視覚的強調

### 📊 Bank分析・統計機能

- **動的Bank Groups**: CSVデータに基づく自動Bank統計テーブル生成
- **Bank使用率表示**: 各Bankのピン使用状況とパーセント表示
- **電圧レベル集計**: Bankごとの電圧レベル分布分析
- **I/O規格統計**: 使用されているI/O規格の種類と数量
- **並列表示**: Package Canvas凡例でBank GroupsとPin Typesを同時表示
- **CSVエクスポート**: Bank統計データのCSV出力機能

### ⚡ バッチ処理機能

- **配列パターン**: DATA[0]〜DATA[31] 等の連続信号割り当て
- **複数選択**: 範囲選択による一括編集
- **テンプレート**: よく使う設定パターンの保存・適用
- **インポート**: 他プロジェクトからの設定継承

### 🛡️ 検証・制約チェック

- **AMD/Xilinx UltraScale準拠**: 業界標準の制約ルール
- **リアルタイム検証**: 編集時の即座なエラー検出
- **差動ペア検証**: 電圧・I/O規格の自動照合
- **バンク制約**: 電圧グループ違反の防止

### 🎨 ユーザーエクスペリエンス

- **Undo/Redo**: 全操作の取り消し・やり直し対応
- **レスポンシブ**: 画面サイズに応じた最適レイアウト
- **キーボードショートカット**: 効率的な操作性
- **テーマ対応**: VS Codeテーマとの統合

## 🚀 クイックスタート

### インストール・起動

1. **VS Code拡張機能版（推奨）**:

   **方法1: VS Code内から**
   - `Ctrl+Shift+X` で拡張機能タブを開く
   - "FPGA Pin Planner" で検索
   - [インストール] ボタンをクリック

   **方法2: Marketplaceから**
   - [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner) でインストール

   **方法3: コマンドライン**
   ```bash
   code --install-extension MameMame777.fpga-pin-planner
   ```

   **起動方法**:
   - **コマンドパレット**: `Ctrl+Shift+P` → "Open FPGA Pin Planner" または "Open FPGA GUI"
   - **CSVファイルから**: CSVファイルを右クリック → "Open FPGA Pin Planner"
   - **コマンド直接実行**: `Ctrl+Shift+P` → "FPGA: Open FPGA Pin Planner"

2. **スタンドアロン版**:

   ```bash
   git clone https://github.com/your-repo/fpga-pin-planner.git
   cd fpga-pin-planner
   npm install
   npm run dev
   ```

### 前提条件

- Node.js 18.0+
- VS Code 1.80+（拡張機能版の場合）
- TypeScript 5.0+

### サンプルデータの読み込み

**VS Code拡張機能版**:
```bash
# コマンドパレットで実行
Ctrl+Shift+P → "FPGA: Load Sample Data"
```

**スタンドアロン版**:
```bash
# 開発サーバー起動後、ブラウザでサンプルファイルを読み込み
http://localhost:5173/
```

## 📊 使用方法

### 基本的なワークフロー

1. **拡張機能の起動**
   - コマンドパレット: `Ctrl+Shift+P` → "Open FPGA Pin Planner"
   - または CSVファイルを右クリック → "Open FPGA Pin Planner"

2. **データの読み込み**
   - **サンプルデータ**: `Ctrl+Shift+P` → "FPGA: Load Sample Data"
   - **CSVファイル**: ファイルアイコンをクリックしてファイル選択
   - **プロジェクトファイル**: .fpgaprojファイルの読み込み

3. **ピン編集**
   - セル直接編集またはプルダウン選択
   - バッチ処理による効率的な一括設定
   - 検索・フィルタによる特定ピンの絞り込み

4. **検証・エクスポート**
   - リアルタイム制約チェック
   - エクスポートメニューから各種フォーマットで出力（XDC、CSV、レポート）

### VS Code拡張機能の主なコマンド

| コマンド | 説明 |
|----------|------|
| `FPGA: Open FPGA Pin Planner` | メインアプリケーションを起動 |
| `FPGA: Open FPGA GUI` | GUI画面を開く |
| `FPGA: Load Sample Data` | サンプルデータを自動読み込み |
| `FPGA: Import CSV Pin Data` | CSVファイルを読み込み |
| `FPGA: Export XDC Constraints` | XDC形式でエクスポート |
| `FPGA: Export SDC Constraints` | SDC形式でエクスポート |
| `FPGA: Export QSF Constraints` | QSF形式でエクスポート |
| `FPGA: Validate Pin Constraints` | ピン制約の検証実行 |

### キーボードショートカット

| 操作 | ショートカット |
|------|----------------|
| コマンドパレット | `Ctrl+Shift+P` |
| ファイル読み込み | `Ctrl+O` |
| 保存 | `Ctrl+S` |
| 検索 | `Ctrl+F` |
| 元に戻す | `Ctrl+Z` |
| やり直し | `Ctrl+Y` |
| ビューワ最大化 | `F11` |

## 🔧 開発・カスタマイズ

### 開発環境セットアップ

```bash
# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test
```

### アーキテクチャ

- **フロントエンド**: React + TypeScript + Vite
- **状態管理**: Zustand
- **スタイリング**: CSS Modules
- **拡張機能**: VS Code Extension API

### 設定ファイル

- `vite.config.ts`: ビルド設定
- `tsconfig.json`: TypeScript設定
- `package.json`: 依存関係・スクリプト

## 📚 ドキュメント

- [詳細仕様書](docs/detailed-spec.md)
- [開発者ガイド](docs/developer-guide.md)
- [技術的知見集](docs/technical-insights.md)
- [セキュリティ監査レポート](docs/security-audit.md)
- [改善ロードマップ](docs/improvement-roadmap-updated.md)

### 🚀 性能最適化

- **[ビューワ性能調査レポート](docs/viewer-performance-investigation.md)** - 詳細な技術分析と解決策
- **[性能改善クイックスタート](docs/performance-quick-start.md)** - 即座に適用可能な最適化手法
- **[性能改善サマリー](docs/performance-summary.md)** - 調査結果の要約

## 🛡️ セキュリティ

本プロジェクトでは以下のセキュリティ対策を実装済みです：

- **Content Security Policy (CSP)**: XSS攻撃防止
- **依存関係監査**: 定期的な脆弱性スキャン
- **データプライバシー**: ローカル処理・外部送信なし
- **入力検証**: 悪意あるコード実行防止

詳細は[セキュリティ監査レポート](docs/security-audit.md)をご確認ください。

## 🤝 コントリビューション

プロジェクトへの貢献を歓迎します！詳細は[CONTRIBUTING.md](CONTRIBUTING.md)をご参照ください。

### 開発の流れ

1. Issues で議論・提案
2. フォーク・ブランチ作成
3. 機能実装・テスト
4. プルリクエスト作成

## 📄 ライセンス

MIT License - 詳細は[LICENSE](LICENSE)ファイルをご確認ください。

## 🆘 サポート

- **Issues**: [GitHub Issues](https://github.com/your-repo/fpga-pin-planner/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/fpga-pin-planner/discussions)
- **Email**: [support@fpga-pin-planner.com](mailto:support@fpga-pin-planner.com)

---

**開発チーム**: TypeScript・React・VS Code拡張機能の専門知識を活用し、FPGAエンジニアのためのモダンなツールを開発しています。
