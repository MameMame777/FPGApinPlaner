# 回転機能のバグ修正サマリー

## 問題の概要
FPGA Pin Plannerの90度回転機能において、グリッドラベルとタイルの座標が一致しないバグが発生していました。

## バグの詳細
- **症状**: 90度回転使用時にグリッドラベル（A, B, C...と1, 2, 3...）がタイルの位置と一致しない
- **原因**: `transformGridLabelPosition`関数が回転変換を適用せず、タイルは回転するがラベルは元の位置に留まっていた
- **影響**: ユーザーがピンの正確な座標を把握できない

## 修正内容

### 1. 座標変換ロジックの修正
**修正前:**
```typescript
// Transform coordinates for grid labels WITHOUT rotation (labels stay in place)
const transformGridLabelPosition = (pin: Pin) => {
  let { x, y } = pin.position;
  
  // Don't apply rotation for grid labels - they should stay aligned with the original grid
  // Only apply mirroring for bottom view
  if (!isTopView) {
    x = -x;
  }
  
  // Apply viewport scaling and offset
  const canvasWidth = stageSize.width;
  const canvasHeight = stageSize.height;
  const transformedX = x * viewport.scale + viewport.x + canvasWidth / 2;
  const transformedY = y * viewport.scale + viewport.y + canvasHeight / 2;
  
  return { x: transformedX, y: transformedY };
};
```

**修正後:**
```typescript
// Transform coordinates for grid labels WITH rotation (labels should match tile positions)
const transformGridLabelPosition = (pin: Pin) => {
  let { x, y } = pin.position;
  
  // Apply rotation for grid labels - they should match the rotated tile positions
  if (rotation !== 0) {
    const rad = (rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const newX = x * cos - y * sin;
    const newY = x * sin + y * cos;
    x = newX;
    y = newY;
  }
  
  // Apply mirroring for bottom view
  if (!isTopView) {
    x = -x;
  }
  
  // Apply viewport scaling and offset
  const canvasWidth = stageSize.width;
  const canvasHeight = stageSize.height;
  const transformedX = x * viewport.scale + viewport.x + canvasWidth / 2;
  const transformedY = y * viewport.scale + viewport.y + canvasHeight / 2;
  
  return { x: transformedX, y: transformedY };
};
```

### 2. 修正されたファイル
- `src/components/common/PackageCanvas.tsx` - メインの座標変換ロジック
- `docs/rotation-bug-fix-test-spec.md` - テスト仕様書の更新
- `tests/unit/PackageCanvas.rotation.test.tsx` - ユニットテストの説明更新

## 技術的詳細

### 座標変換の数学的根拠
90度回転の変換行列:
```
[cos(90°)  -sin(90°)]   [0  -1]
[sin(90°)   cos(90°)] = [1   0]
```

これにより、ポイント(x, y)は(-y, x)に変換されます。

### 変更の影響範囲
- ✅ グリッドラベルがタイルの回転に追従
- ✅ 0度、90度、180度、270度の全ての回転角度で正確な位置表示
- ✅ ズーム・パン操作への影響なし
- ✅ 既存のピン選択・表示機能への影響なし

## テスト方法

### 手動テスト手順
1. アプリケーションを起動
2. サンプルデータを読み込み
3. Grid Viewに切り替え
4. 🔄ボタンを使用して90度回転を実行
5. グリッドラベル（A, B, C...）がタイルの位置と一致することを確認
6. 継続して回転させ、全ての角度（180度、270度、0度）で確認

### 期待される結果
- グリッドラベルが常にタイルの位置と正確に一致
- 回転後もピンの座標情報が正しく表示される
- ユーザーが直感的にピン位置を把握できる

## 実装のポイント

### 一貫性の確保
- `transformPosition`（ピン用）と`transformGridLabelPosition`（ラベル用）で同じ回転変換を適用
- 両関数で同じ数学的変換ロジックを使用

### パフォーマンスへの配慮
- 既存の最適化（LOD、ビューポートカリング等）は維持
- 回転計算は軽量な三角関数のみ使用

## 関連Issue・PR
- 回転機能のグリッドラベル座標不一致の修正
- ユーザビリティ向上
- 座標表示の正確性確保

## 今後の改善点
- 回転アニメーションの追加検討
- より詳細なE2Eテストの実装
- 大規模データセットでのパフォーマンス検証
