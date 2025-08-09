# FPGA Pin Planner - Build Scripts

このディレクトリには、FPGA Pin Plannerの自動ビルドとインストールスクリプトが含まれています。

## 利用可能なスクリプト

### 1. フルビルド・インストール（推奨）

**PowerShell版**
```bash
# フルクリーンビルド + インストール
./scripts/full-build-install.ps1

# オプション付き実行
./scripts/full-build-install.ps1 -SkipMainBuild     # メインアプリのビルドをスキップ
./scripts/full-build-install.ps1 -SkipExtensionBuild # 拡張のビルドをスキップ 
./scripts/full-build-install.ps1 -SkipInstall      # インストールをスキップ
```

**Batch版**
```bash
# 簡単実行（ダブルクリックでも可能）
./scripts/full-build-install.cmd
```

**NPM版**
```bash
# フルビルド + インストール
npm run build:full

# 拡張のインストールのみ
npm run install:extension
```

### 2. 高速開発ビルド

**PowerShell版**
```bash
# 高速ビルド（開発用）
./scripts/quick-build.ps1

# 拡張のみビルド
./scripts/quick-build.ps1 -OnlyExtension

# メインアプリのみビルド
./scripts/quick-build.ps1 -OnlyMain

# インストールなしでビルド
./scripts/quick-build.ps1 -NoInstall
```

**NPM版**
```bash
# 高速ビルド
npm run build:quick

# 拡張のみビルド
npm run build:extension-only
```

## スクリプトの動作

### full-build-install.ps1 / .cmd
1. **メインアプリビルド**: `dist/`ディレクトリをクリーンして再構築
2. **拡張ビルド**: 
   - `out/`, `dist/`, `webview-dist/`, キャッシュをクリーン
   - 古い`.vsix`ファイルを削除
   - `npm run package`でWebviewコンテンツと拡張を同期ビルド
3. **自動インストール**: 生成された`.vsix`ファイルを`--force`フラグでインストール

### quick-build.ps1
1. **高速ビルド**: クリーンアップを最小限に
2. **キャッシュ活用**: 既存のnode_modulesやビルドキャッシュを活用
3. **開発効率**: 素早いイテレーション向け

## 推奨される使い方

### 初回セットアップや重要な変更後
```bash
npm run build:full
```

### 日常的な開発作業
```bash
npm run build:quick
```

### 拡張のみ更新したい場合
```bash
npm run build:extension-only
```

## トラブルシューティング

### PowerShell実行ポリシーエラー
```bash
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 古いWebviewコンテンツが残る場合
```bash
# 手動でクリーンビルド
cd vscode-extension
rm -rf webview-dist/ out/ *.vsix
npm run package
```

### VS Code拡張が更新されない場合
```bash
# 強制再インストール
code --uninstall-extension MameMame777.fpga-pin-planner
npm run build:full
```

## ビルド成果物

- **メインアプリ**: `dist/` - Webアプリケーション成果物
- **VS Code拡張**: `vscode-extension/*.vsix` - インストール可能な拡張パッケージ
- **Webviewコンテンツ**: `vscode-extension/webview-dist/` - 拡張内蔵Webview

## 注意事項

1. **ビルド順序が重要**: 必ずメインアプリ → 拡張の順序でビルド
2. **Webview同期**: 拡張ビルド時に最新のWebviewコンテンツが自動同期
3. **クリーンビルド**: 問題がある場合は必ずクリーンビルドを実行
4. **古い成果物**: 古い`.vsix`ファイルは自動削除される
