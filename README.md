# FPGA Pin Planner

## 概要
FPGAのピン配置を視覚的に行うためのGUIツールです。

## 機能
- CSV形式ピン情報の読み込み（Xilinx公式フォーマット対応）
- ピン配置の視覚的表示（座標系、グリッド表示）
- 90度回転、トップ/ボトムビュー切り替え
- 高度な検索・フィルタ機能
- XDC/SDC/QSF制約ファイル出力
- 外部ツール連携（Vivado, Quartus, KiCad等）

## 技術スタック
- **フロントエンド**: React + TypeScript
- **デスクトップ**: Electron
- **状態管理**: Zustand + Immer
- **描画エンジン**: Konva.js
- **ビルドツール**: Vite

## 開発計画
### Phase 1: MVP機能（6ヶ月）
- ファイル入出力: 3週間
- 基本表示機能: 4週間
- 座標変換: 2週間
- 基本UI: 6週間
- 検索・フィルタ: 3週間
- 制約ファイル出力: 2週間
- 外部ツール連携: 3週間
- テスト・統合: 4週間

### Phase 2: 拡張機能（6-12ヶ月）
- 差動ペア管理: 6週間
- 制約ルールチェック: 8週間
- レポート生成: 4週間
- プロジェクト管理: 6週間

## ドキュメント
- [要件定義書](docs/requirements.md)
- [詳細仕様書](docs/detailed-spec.md)
- [技術的実現性分析](docs/technical-feasibility.md)

## サンプルデータ
- [Xilinx XC7A12T CSG325](docs/sample/a7all/a7all/xc7a12tcsg325pkg.csv)

## 開発環境
Node.js 18+が必要です。

```bash
# 依存関係のインストール（プロトタイプ作成後）
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