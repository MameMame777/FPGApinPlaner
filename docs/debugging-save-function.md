# FPGA Pin Planner - デバッグチェックリスト

## 🔍 セーブ機能デバッグ手順

### 1. 基本確認
- [ ] VS Code拡張機能がインストールされている (`code --list-extensions | findstr fpga`)
- [ ] Developer Tools でコンソールエラーがないか確認
- [ ] `typeof window.vscode !== 'undefined'` がtrueか確認

### 2. メッセージフロー確認
実際の処理フロー:
```
webview: showSaveDialog送信
  ↓
extension: saveDialogResult返送
  ↓  
webview: saveFile送信
  ↓
extension: saveFileResult返送
```

### 3. デバッグログで確認すべき項目
- `🔧 [DEBUG] Received showSaveDialog:` - ダイアログリクエスト受信
- `📁 [DEBUG] Save dialog result:` - ダイアログ結果
- `✅ [DEBUG] Sent saveDialogResult to webview` - レスポンス送信
- `💾 [DEBUG] Received saveFile request:` - ファイル保存リクエスト
- `🎯 [DEBUG] Save operation result:` - 保存結果
- `✅ [DEBUG] Sent saveFileResult to webview:` - 保存結果レスポンス

### 4. エラーパターンと対処法

#### パターン1: ダイアログが表示されない
- **症状**: `showSaveDialog`メッセージが送信されるがダイアログが開かない
- **確認**: Developer Toolsで拡張機能側のエラーログ
- **対処**: メッセージハンドラーが正しく登録されているか確認

#### パターン2: ダイアログは開くがファイルが保存されない
- **症状**: ダイアログで場所を選択しても保存されない
- **確認**: `saveFile`メッセージとURIの形式
- **対処**: URI.toString()の結果とhandleFileSaveの処理

#### パターン3: 権限エラー
- **症状**: `File system provider for ... is not available`
- **確認**: ファイルパスとVS Code workspace API
- **対処**: vscode.workspace.fs.writeFileの使用確認

### 5. 手動テスト手順

1. **VS Code Developer Tools 開く**:
   ```
   Ctrl+Shift+P → "Toggle Developer Tools"
   ```

2. **FPGA GUI 開く**:
   ```
   Ctrl+Shift+P → "Open FPGA GUI"
   ```

3. **セーブテスト実行**:
   - エクスポートドロップダウンから「XDCエクスポート」選択
   - Console でデバッグログ確認

4. **詳細デバッグ**:
   - `debug-save-function.html` をブラウザで開いてテスト
   - VS Code webview として開いてテスト

### 6. ログ分析

正常な場合のログ例:
```
🔧 [DEBUG] Starting save dialog with options: {...}
📤 [DEBUG] Sending showSaveDialog message
🔧 [DEBUG] Received showSaveDialog: {...}
📁 [DEBUG] Save dialog result: {...}
✅ [DEBUG] Sent saveDialogResult to webview
📨 [DEBUG] Received message: {"command":"saveDialogResult",...}
📁 [DEBUG] Save dialog resolved with: {...}
💾 [DEBUG] Starting file save operation
📤 [DEBUG] Sending saveFile message
💾 [DEBUG] Received saveFile request: {...}
💾 Handling file save: ...
✅ File saved successfully: ...
🎯 [DEBUG] Save operation result: true
✅ [DEBUG] Sent saveFileResult to webview: true
```

### 7. トラブルシューティング

#### 問題: メッセージが送信されない
- **確認**: `window.vscode` の存在
- **対処**: webview HTMLの`acquireVsCodeApi()`確認

#### 問題: メッセージハンドラーが呼ばれない  
- **確認**: `addEventListener('message', handler)` の登録
- **対処**: イベントリスナーの重複登録防止

#### 問題: ファイル保存でエラー
- **確認**: URI形式とパス変換
- **対処**: Windows パス形式とURI形式の正しい変換

## 🚀 次のステップ

1. 上記チェックリストに従ってテスト実行
2. エラーが発生した場合は該当するパターンで対処
3. Developer Tools のログを共有して詳細分析
