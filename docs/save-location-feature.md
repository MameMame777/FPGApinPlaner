# 保存場所選択機能 - 実装ドキュメント

## 概要

FPGA Pin Plannerに保存場所を選択できる機能を実装しました。プロジェクトの保存とエクスポート（XDC、CSV、レポート）時に、ユーザーが任意のファイル名と保存場所を選択できます。

## 実装した機能

### 1. プロジェクト保存機能

**場所**: `src/components/common/SaveLoadControls.tsx`

- **VS Code環境**: `showSaveDialog`でファイル保存ダイアログを表示
- **ブラウザ環境**: 従来通りブラウザダウンロード
- **ファイル形式**: `.fpgaproj`, `.json`
- **デフォルトファイル名**: `{デバイス名}_project_{日付}.fpgaproj`

### 2. XDC/CSV/レポートエクスポート機能

**場所**: `src/App.tsx`

- **エクスポートドロップダウンメニュー**: 3つの形式（XDC、CSV、レポート）から選択
- **VS Code環境**: 各形式に応じた保存ダイアログ
- **ブラウザ環境**: 直接ダウンロード

#### サポート形式:
1. **XDC (Xilinx Design Constraints)**
   - 拡張子: `.xdc`
   - 用途: Xilinx制約ファイル

2. **CSV Data**
   - 拡張子: `.csv`
   - 用途: スプレッドシートで編集可能なピンデータ

3. **レポート**
   - 拡張子: `.txt`
   - 用途: 人間が読める形式のピン配置レポート

### 3. VS Code拡張機能連携

**場所**: `vscode-extension/src/extension.ts`

- **メッセージハンドリング改善**: `saveDialogResult`で結果を返信
- **ファイル保存処理**: webviewからのファイル保存要求を処理
- **パス正規化**: Windows環境での正しいファイルパス処理

## 使用方法

### VS Code環境での使用

1. **プロジェクト保存**:
   - 💾ボタンクリック → ファイル保存ダイアログ → 場所・ファイル名選択 → 保存

2. **エクスポート**:
   - "💾 Export ▼"ボタンクリック → 形式選択 → ファイル保存ダイアログ → 保存

### ブラウザ環境での使用

- 従来通りブラウザのダウンロード機能を使用
- ファイル名は自動生成（`デバイス名_pins.xdc`など）

## 技術的詳細

### VS Code API連携

```typescript
// webview → VS Code
vscode.postMessage({
  command: 'showSaveDialog',
  options: {
    saveLabel: 'Export XDC Constraints',
    filters: {
      'XDC Files': ['xdc'],
      'All Files': ['*']
    },
    defaultUri: defaultFilename
  }
});

// VS Code → webview (結果返信)
panel.webview.postMessage({
  command: 'saveDialogResult',
  result: uri
});
```

### 環境検出

```typescript
const isInVSCode = () => {
  return typeof (window as any).vscode !== 'undefined';
};
```

### ファイル保存ヘルパー関数

```typescript
const saveFileInVSCode = async (
  content: string, 
  defaultFilename: string, 
  filters: Record<string, string[]>, 
  saveLabel: string
) => {
  // VS Code環境でのファイル保存処理
  // フォールバック: ブラウザダウンロード
};
```

## UI改善

### エクスポートドロップダウンメニュー

- **デザイン**: ダークテーマに統一されたドロップダウン
- **操作性**: ホバー効果、クリック外で閉じる機能
- **アクセシビリティ**: キーボードナビゲーション対応

### アイコンと視覚的フィードバック

- **📄 XDC (Xilinx)**: 制約ファイル
- **📊 CSV Data**: データファイル  
- **📋 Report**: レポートファイル

## ファイル構成

```
src/
├── App.tsx                           # エクスポートドロップダウン、VS Code連携
├── components/common/
│   └── SaveLoadControls.tsx         # プロジェクト保存機能
└── services/
    └── export-service.ts             # エクスポート処理（既存）

vscode-extension/src/
├── extension.ts                      # VS Code API、メッセージハンドリング
└── services/
    └── ConstraintExporter.ts         # 制約ファイル生成（既存）
```

## 動作テスト

### テスト項目

- [x] VS Code環境でのプロジェクト保存ダイアログ
- [x] VS Code環境でのXDCエクスポートダイアログ
- [x] VS Code環境でのCSVエクスポートダイアログ
- [x] VS Code環境でのレポートエクスポートダイアログ
- [x] ブラウザ環境でのフォールバック動作
- [x] エクスポートメニューのUI操作
- [x] ファイル保存処理の成功・失敗ハンドリング

### 既知の制限

1. **ブラウザ環境**: 保存場所選択は不可（ブラウザの制限）
2. **大きなファイル**: 大規模なプロジェクトではパフォーマンスに注意

## 今後の改善点

1. **保存設定の記憶**: 前回の保存場所を記憶
2. **一括エクスポート**: 複数形式の同時エクスポート
3. **プリセット保存場所**: よく使う保存場所の管理
4. **クラウド連携**: OneDrive、Google Drive等への直接保存

## 更新履歴

- **2025-08-02**: 初期実装完了
  - プロジェクト保存場所選択
  - エクスポート場所選択（XDC/CSV/レポート）
  - VS Code拡張機能連携
  - エクスポートドロップダウンメニューUI
