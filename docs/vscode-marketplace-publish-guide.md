# 🚀 VS Code Marketplace リリース手順書

## 📋 前提条件

### 1. 必要なツール
- ✅ `vsce` CLI tool (v3.6.0 インストール済み)
- ✅ `fpga-pin-planner-1.0.2.vsix` パッケージ作成済み
- ✅ Publisher: `MameMame777`

### 2. アカウント準備
- Azure DevOps アカウント (Microsoft アカウント)
- Personal Access Token (PAT) の取得

## 🔧 Step-by-Step リリース手順

### Step 1: Azure DevOps Personal Access Token の作成

1. **Azure DevOps にアクセス**: [https://dev.azure.com](https://dev.azure.com)
2. **Microsoft アカウントでサインイン**
3. **User Settings → Personal Access Tokens**
4. **New Token** をクリック
5. **設定項目**:
   - **Name**: `VS Code Marketplace - FPGA Pin Planner`
   - **Expiration**: Custom defined (1年推奨)
   - **Scopes**: `Marketplace (manage)`
6. **Create** をクリックしてトークンを保存 (⚠️ 一度しか表示されません)

### Step 2: vsce にログイン

```bash
# Personal Access Token を使用してログイン
vsce login MameMame777
```

入力を求められたら、Step 1で作成したPATを入力してください。

### Step 3: Publisher の確認・作成

```bash
# 現在のpublisher設定を確認
vsce show MameMame777

# もしpublisherが存在しない場合は作成
vsce create-publisher MameMame777
```

### Step 4: パッケージの検証

```bash
# パッケージの内容を検証
vsce ls

# より詳細な検証
vsce package --no-dependencies
```

### Step 5: Marketplace への公開

```bash
# 方法1: 直接公開 (推奨)
vsce publish

# 方法2: 明示的にバージョン指定
vsce publish 1.0.2

# 方法3: 既存のVSIXファイルから公開
vsce publish --packagePath fpga-pin-planner-1.0.2.vsix
```

### Step 6: 公開確認

公開完了後、以下のURLで確認:
- **Marketplace URL**: `https://marketplace.visualstudio.com/items?itemName=MameMame777.fpga-pin-planner`
- **検索**: VS Code内で "FPGA Pin Planner" で検索

## 🎯 追加の公開設定

### バージョン更新公開

```bash
# パッチバージョンを自動的に上げて公開
vsce publish patch

# マイナーバージョンを上げて公開
vsce publish minor

# メジャーバージョンを上げて公開
vsce publish major
```

### 特定のファイルを含める/除外する

`.vscodeignore` ファイルで制御 (既に設定済み):
```
out/test/**
src/**
.vscode-test/**
.gitignore
vsc-extension-quickstart.md
**/tsconfig.json
**/tslint.json
**/*.map
**/*.ts
```

## 🔍 トラブルシューティング

### よくある問題

1. **Publisher not found エラー**
   ```bash
   vsce create-publisher MameMame777
   ```

2. **Authentication failed エラー**
   ```bash
   vsce logout
   vsce login MameMame777
   ```

3. **Package validation エラー**
   - `package.json` の必須フィールドを確認
   - `README.md` の存在確認
   - アイコンファイルの存在確認

### 再公開時の注意点

- 同じバージョン番号では再公開できません
- バージョンを上げるか、`vsce unpublish` で削除してから再公開

## 📊 公開後の管理

### 統計確認
```bash
# ダウンロード統計等を確認
vsce show MameMame777.fpga-pin-planner
```

### アップデート公開
```bash
# package.json でバージョンを更新後
vsce publish
```

### 削除 (緊急時のみ)
```bash
# ⚠️ 慎重に実行
vsce unpublish MameMame777.fpga-pin-planner
```

## 🎉 公開完了後のタスク

1. **GitHub Release の作成**
2. **README.md の更新** (Marketplace バッジの確認)
3. **CHANGELOG.md の更新**
4. **SNS/コミュニティでの告知**

---

**注意**: この手順書は v1.0.2 のリリースを想定しています。実際の公開前に必ずテスト環境での動作確認を行ってください。
