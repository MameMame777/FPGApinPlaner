# VS Code Webview初期化デバッグガイド

## 問題の概要

VS Code拡張機能のwebview環境において、React + Konva.jsアプリケーションの初期化時にCanvasサイズが正しく計算されず、大きな余白が表示される問題が発生した。

### 症状

- **拡張機能起動直後**: 画面に大きな余白（右側・下側の黒い領域）が表示
- **List→Grid表示切り替え後**: 余白が消失し、正常な表示に戻る
- **通常ブラウザ環境**: 同様の問題は発生しない

## 根本原因

### 1. 初期化タイミングの問題

```typescript
// 問題のあるコード
useEffect(() => {
  const updateCanvasSize = () => {
    const container = stageRef.current?.container();
    if (container) {
      // stageRef.currentがまだnullの可能性
    }
  };
  updateCanvasSize(); // 即座に実行
}, []); // 空の依存配列
```

**原因**: Konva.jsのStageコンポーネントがまだDOMにマウントされていない状態で、サイズ計算が実行されていた。

### 2. VS Code Webview環境の特殊性

- 通常のブラウザと異なり、webview環境ではコンテナの初期化により長い時間が必要
- ResizeObserverの初回発火タイミングが遅い
- DOM要素のBoundingClientRectが安定するまでに遅延がある

## 解決策

### 1. 初期化遅延の追加

```typescript
// 修正後のコード
useEffect(() => {
  const updateCanvasSize = () => {
    const container = stageRef.current?.container();
    if (container) {
      const rect = container.getBoundingClientRect();
      const newSize = {
        width: Math.max(400, rect.width),
        height: Math.max(300, rect.height)
      };
      setStageSize(newSize);
    }
  };

  // VS Code webview環境のために延長された遅延
  const timeoutId = setTimeout(() => {
    updateCanvasSize();
  }, 200); // 100ms → 200msに延長

  return () => {
    clearTimeout(timeoutId);
  };
}, []);
```

### 2. Stageマウント時の確実な更新

```typescript
// Stageコンポーネントのref設定を改善
<Stage
  ref={(ref) => {
    stageRef.current = ref;
    // Stageがマウントされた瞬間に強制的にサイズ更新
    if (ref) {
      setTimeout(() => {
        const container = ref.container();
        if (container) {
          const rect = container.getBoundingClientRect();
          const newSize = {
            width: Math.max(400, rect.width),
            height: Math.max(300, rect.height)
          };
          setStageSize(prevSize => {
            if (prevSize.width !== newSize.width || prevSize.height !== newSize.height) {
              console.log('📐 Stage mounted - Canvas size updated:', newSize);
              return newSize;
            }
            return prevSize;
          });
        }
      }, 50); // マウント直後の迅速な更新
    }
  }}
  // ... その他のprops
>
```

### 3. デバッグログの追加

```typescript
console.log('📐 Stage mounted - Canvas size updated:', newSize);
console.log('📐 Canvas size updated for dynamic maximization:', newSize);
```

これらのログにより、初期化プロセスの追跡が可能になった。

## 技術的な学習点

### VS Code Webview環境の特徴

1. **DOM初期化の遅延**: 通常のブラウザより長い初期化時間が必要
2. **ResizeObserver動作**: 初回発火のタイミングが不安定
3. **コンテナサイズ計算**: getBoundingClientRect()の結果が安定するまでに時間がかかる

### React + Konva.js統合の注意点

1. **useRef依存**: StageのrefがマウントされるタイミングでuseEffectが実行される保証はない
2. **サイズ同期**: ReactコンポーネントのstateとKonva Stageのサイズ同期の重要性
3. **初期化順序**: DOM → Konva Stage → サイズ計算の順序を確実に守る必要性

### 解決パターン

```typescript
// ベストプラクティス
const MyKonvaComponent = () => {
  const stageRef = useRef<Konva.Stage>(null);
  
  // 1. 遅延初期化
  useEffect(() => {
    const timer = setTimeout(() => {
      updateSize();
    }, 200); // 環境に応じた適切な遅延
    return () => clearTimeout(timer);
  }, []);
  
  // 2. ref コールバックでの確実な初期化
  const handleStageRef = useCallback((ref: Konva.Stage | null) => {
    stageRef.current = ref;
    if (ref) {
      setTimeout(() => updateSize(), 50);
    }
  }, []);
  
  // 3. ResizeObserver での継続的な監視
  useEffect(() => {
    const container = stageRef.current?.container()?.parentElement;
    if (container) {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(container);
      return () => observer.disconnect();
    }
  }, []);
  
  return <Stage ref={handleStageRef} /* ... */ />;
};
```

## まとめ

VS Code拡張機能のwebview環境では、通常のブラウザ環境とは異なる初期化パターンが必要である。特にKonva.jsのようなCanvas系ライブラリを使用する場合は、DOM要素の初期化完了を確実に待つ仕組みが重要である。

この知見は他のwebview拡張機能開発においても応用可能である。
