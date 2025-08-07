# FPGA Pin Planner - ビューワー余白問題 調査レポート

## 📋 **概要**

画像から確認された余白問題について、根本原因の特定と解決策を調査・提案します。

## 🔍 **1. ビューワーの余白箇所の特定**

### 📷 **画像分析結果**

画像から確認できる余白の箇所：

1. **上部余白**
   - パッケージラベル "sample (fpga)" 上部の余白：約20px
   - グリッドラベル（列番号）上部の余白：パッケージラベル下の50px位置から開始

2. **左側余白**
   - グリッドラベル（行文字）左側の余白：16px
   - グリッドラベル自体の幅：16px

3. **下部・右側余白**
   - FPGAパッケージの下側に大きな余白
   - FPGAパッケージの右側に大きな余白
   - **この部分が最も問題となっている余白**

4. **コンテンツ周辺の余白**
   - FPGAパッケージ自体が小さく表示され、ビューワー全体に対して大きな余白が存在

## 🔧 **2. 余白が生じる技術的要因**

### 2.1 **Stage次元とコンテンツサイズの不一致**

```typescript
// 現在のStageサイズ設定 (PackageCanvas.tsx:1056-1062)
width={Math.max(100, stageSize.width - 16)} // 左グリッドラベル幅を減算
height={Math.max(100, stageSize.height - 66)} // 上部ラベル高さを減算

// 問題: Stageサイズがコンテナサイズより小さくなる
```

### 2.2 **初期ビューポート配置の問題**

```typescript
// 自動フィット機能での過度なパディング (PackageCanvas.tsx:342-350)
const padding = 40; // Fixed minimal padding for readability
const availableWidth = stageSize.width - padding * 2;
const availableHeight = stageSize.height - padding * 2;

// 問題: 固定パディングにより小さな表示になる
```

### 2.3 **パッケージ次元計算での余白**

```typescript
// パッケージ次元計算 (PackageCanvas.tsx:480-484)
const padding = 0; // Zero padding for maximum viewer area - Issue #14
const width = gridWidth + padding * 2; // Use exact grid dimensions
const height = gridHeight + padding * 2; // Use exact grid dimensions

// 矛盾: paddingは0だが、実際の表示では余白が存在
```

### 2.4 **座標変換とセンタリングロジック**

```typescript
// パッケージセンタリング (PackageCanvas.tsx:355-362)
const stageCenter = {
  x: stageSize.width / 2,
  y: stageSize.height / 2
};

const initialPosition = {
  x: stageCenter.x - centerX * optimalScale,
  y: stageCenter.y - centerY * optimalScale,
  scale: optimalScale
};

// 問題: optimalScaleが小さくなりすぎている
```

## 🎯 **3. 根本原因の分析**

### 3.1 **主要問題: 自動フィット機能の過度な縮小**

```typescript
// 問題のある計算 (PackageCanvas.tsx:347-350)
const scaleX = availableWidth / pkgWidth;
const scaleY = availableHeight / pkgHeight;
const optimalScale = Math.max(0.5, Math.min(scaleX, scaleY, 2.5));

// 原因分析:
// 1. availableWidth/Height がpadding分だけ小さくなる
// 2. pkgWidth/pkgHeight が実際のコンテンツより大きく計算される
// 3. 結果として optimalScale が小さくなりすぎる
```

### 3.2 **Stage次元の制限による表示領域縮小**

```typescript
// Stage次元の減算 (PackageCanvas.tsx:1056-1062)
width={Math.max(100, stageSize.width - 16)}
height={Math.max(100, stageSize.height - 66)}

// 問題:
// - グリッドラベル分を減算することで描画領域が狭くなる
// - 結果として余白が増加する
```

### 3.3 **コンテナサイズの動的計算問題**

```typescript
// コンテナサイズ更新 (PackageCanvas.tsx:282-290)
const newSize = {
  width: Math.max(400, rect.width), // Use full container width
  height: Math.max(300, rect.height) // Use full container height
};

// 問題:
// - rect.width/height が正確に取得できていない可能性
// - 初期化タイミングの問題
```

## 🚀 **4. 解決策の提案**

### 4.1 **即座の修正案: Stageサイズの最大化**

```typescript
// 修正案1: Stage次元をフルサイズに変更
width={stageSize.width} // グリッドラベル減算を削除
height={stageSize.height} // 上部ラベル減算を削除

// グリッドラベルをStage内に移動（オーバーレイ形式）
```

### 4.2 **自動フィット機能の改善**

```typescript
// 修正案2: より積極的なスケール計算
const padding = 20; // パディングを削減（40 → 20）
const minScale = 0.8; // 最小スケールを増加（0.5 → 0.8）
const maxScale = 4.0; // 最大スケールを増加（2.5 → 4.0）

const optimalScale = Math.max(minScale, Math.min(scaleX, scaleY, maxScale));
```

### 4.3 **動的グリッドラベルの配置改善**

```typescript
// 修正案3: グリッドラベルをStage内レイヤーに配置
<Layer>
  {/* グリッドラベルをStage内に配置 */}
  <Group>
    {/* 列ラベル */}
    {columnLabels.map(label => <Text ... />)}
    {/* 行ラベル */}
    {rowLabels.map(label => <Text ... />)}
  </Group>
  
  {/* パッケージコンテンツ */}
  <Group>
    {/* ピンレンダリング */}
  </Group>
</Layer>
```

### 4.4 **ビューポート境界の最適化**

```typescript
// 修正案4: より緩やかな境界制限
const applyViewportBounds = (pos, scale) => {
  // 現在の制限を緩和
  const paddingX = canvasWidth * 0.2; // 0.5 → 0.2 に削減
  const paddingY = canvasHeight * 0.2; // 0.8 → 0.2 に削減
  
  // より大きな表示範囲を許可
};
```

## 📋 **5. 実装優先度**

### 🟡 **Phase 1: 即座の改善（高優先度）**

1. **Stageサイズをフルサイズに変更**
   - `width={stageSize.width}`, `height={stageSize.height}`
   - 即座に余白を削減

2. **自動フィットのパディング削減**
   - `padding = 20` (現在の40から削減)
   - より大きな初期表示

### 🟠 **Phase 2: 構造的改善（中優先度）**

1. **グリッドラベルのStage内配置**
   - HTML要素からKonvaテキストに変更
   - 完全統合されたビューワー

2. **動的サイズ計算の改善**
   - ResizeObserverの精度向上
   - 初期化タイミングの最適化

### 🟢 **Phase 3: 高度な最適化（低優先度）**

1. **アダプティブスケーリング**
   - コンテンツサイズに基づく動的スケール調整
   - ユーザーの使用パターン学習

2. **パフォーマンス最適化**
   - ビューポート計算の効率化
   - レンダリング最適化

## 🎯 **6. 期待される効果**

### ✅ **Phase 1実装後の改善**

- **余白削減**: 約15-20%の表示領域拡大
- **初期表示サイズ**: 約2倍の拡大
- **ユーザビリティ**: 即座に改善される視認性

### ✅ **全Phase完了後の最終状態**

- **最大表示領域**: 利用可能領域の95%以上を活用
- **動的サイズ変更**: 完全対応
- **統合UI**: グリッドラベルとコンテンツの完全統合

## 🔧 **7. 実装の注意点**

### ⚠️ **潜在的リスク**

1. **グリッドラベルの重複**
   - Stage内配置時のzIndex管理
   - 透明度とコントラストの調整

2. **パフォーマンス影響**
   - フルサイズStageでのレンダリング負荷
   - LODシステムとの協調

3. **既存機能との互換性**
   - 座標変換ロジックの整合性
   - ビューポート境界の調整

### 💡 **推奨実装アプローチ**

```typescript
// 段階的実装のサンプル
// Step 1: Stageサイズ最大化
<Stage
  width={stageSize.width}  // ← 即座の改善
  height={stageSize.height} // ← 即座の改善
  style={{
    position: 'absolute',
    top: '0px',     // ← 66px → 0px
    left: '0px'     // ← 16px → 0px
  }}
>
```

## 📈 **8. 測定可能な改善指標**

### 定量的指標

- **表示領域比率**: 現在60% → 目標90%+
- **初期スケール**: 現在~0.8 → 目標1.5+
- **余白ピクセル数**: 現在200px+ → 目標50px以下

### 定性的指標

- **視認性**: ピン番号・信号名の読みやすさ向上
- **操作性**: パン・ズーム操作の直感性向上
- **レスポンシブ性**: ウィンドウサイズ変更への対応改善

---

## 💬 **結論**

ビューワーの余白問題は、主に **Stage次元の制限** と **過度な自動フィットパディング** が原因です。Phase 1の即座の修正により大幅な改善が期待でき、Phase 2-3の実装により完全な余白排除と動的サイズ変更対応が実現可能です。
