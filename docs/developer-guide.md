# FPGA Pin Planner - 開発者ガイド

## 📋 **目次**
1. [技術スタック](#技術スタック)
2. [開発環境セットアップ](#開発環境セットアップ)
3. [アーキテクチャ概要](#アーキテクチャ概要)
4. [バグ解決事例集](#バグ解決事例集)
5. [パフォーマンス最適化](#パフォーマンス最適化)
6. [開発のベストプラクティス](#開発のベストプラクティス)
7. [トラブルシューティング](#トラブルシューティング)
8. [今後の開発者への知見](#今後の開発者への知見)

---

## 🛠️ **技術スタック**

### **フロントエンド**
```typescript
// Core Framework
React 18.2.0 + TypeScript 5.x
├── State Management: Zustand
├── Graphics: Konva.js + react-konva
├── Build Tool: Vite
├── Styling: Inline styles (performance optimized)
└── Testing: Vitest + React Testing Library

// Key Dependencies
{
  "react": "^18.2.0",
  "react-konva": "^18.2.10", 
  "konva": "^9.2.0",
  "zustand": "^4.4.1",
  "vite": "^4.5.14",
  "typescript": "^5.0.2"
}
```

### **開発ツール**
```bash
# Package Manager
npm (推奨) / yarn

# Development Server
Vite Dev Server (HMR対応)

# Code Quality
ESLint + TypeScript Compiler
├── Strict type checking
├── Import organization
└── Code formatting rules

# Version Control
Git with conventional commits
```

---

## 🏗️ **アーキテクチャ概要**

### **ディレクトリ構造**
```
src/
├── components/          # React コンポーネント
│   ├── common/         # 共通コンポーネント
│   │   ├── PackageCanvas.tsx    # メインキャンバス
│   │   ├── PinItem.tsx         # ピン表示
│   │   ├── SettingsPanel.tsx   # 設定UI
│   │   └── DifferentialPairManager.tsx
│   └── pages/          # ページコンポーネント
├── services/           # ビジネスロジック
│   ├── csv-reader.ts           # CSVパース
│   ├── export-service.ts       # エクスポート機能
│   ├── undo-redo-service.ts    # 操作履歴
│   ├── differential-pair-service.ts
│   ├── keyboard-service.ts
│   └── performance-service.ts
├── stores/             # 状態管理
│   ├── app-store.ts           # メインアプリケーション状態
│   └── audio-store.ts         # オーディオ設定
├── types/              # TypeScript型定義
│   ├── core.ts               # コア型定義
│   └── index.ts
├── utils/              # ユーティリティ
│   ├── sample-data.ts
│   └── differential-pair-utils.ts
├── constants/          # 定数定義
├── hooks/             # カスタムフック
├── App.tsx            # メインアプリケーション
└── main.tsx          # エントリーポイント
```

### **状態管理パターン**
```typescript
// Zustand Store Pattern
interface AppStore {
  // State
  pins: Pin[];
  selectedPins: Set<string>;
  viewport: ViewportState;
  
  // Actions
  setPins: (pins: Pin[]) => void;
  selectPin: (pinId: string) => void;
  updateViewport: (viewport: ViewportState) => void;
}

// Usage
const useAppStore = create<AppStore>((set, get) => ({
  pins: [],
  selectedPins: new Set(),
  
  setPins: (pins) => set({ pins }),
  selectPin: (pinId) => set((state) => ({
    selectedPins: new Set([...state.selectedPins, pinId])
  }))
}));
```

---

## 🐛 **バグ解決事例集**

### **1. グリッドラベル回転問題**

#### **問題の詳細**
- **症状**: 90°/270°回転時にグリッドラベルが重複表示される
- **影響範囲**: 全ての回転操作でユーザビリティが大幅に低下
- **発生条件**: 特定の回転角度でのみ発生

#### **原因分析**
```typescript
// 問題のあったコード (修正前)
for (let col = minCol; col <= maxCol; col++) {
  // 静的な範囲でのグリッド生成
  // → 回転時に座標系が変わるが、ラベル生成ロジックが対応していない
  const labelX = (col - 1) * gridSpacing;
  // ...
}
```

**根本原因:**
1. **静的グリッド生成**: 固定範囲でのループ処理
2. **座標変換の不整合**: 回転による座標系変更に未対応
3. **ラベル内容の固定化**: 回転に応じたラベル内容変更なし

#### **解決策**
```typescript
// 修正後のコード
// Pin-based dynamic label generation
const validPins = pins.filter(pin => pin.gridPosition);
const processedPositions = new Set();

validPins.forEach(pin => {
  const transformedPos = transformPosition(pin);
  
  // 重複防止のための位置正規化
  const positionKey = `${Math.round(transformedPos.x)},${Math.round(transformedPos.y)}`;
  
  if (!processedPositions.has(positionKey)) {
    processedPositions.add(positionKey);
    
    // 回転に応じたラベル内容選択
    const displayText = (() => {
      switch (rotation) {
        case 0:
        case 180:
          return pin.gridPosition.col.toString();
        case 90:
        case 270:
          return pin.gridPosition.row;
        default:
          return pin.gridPosition.col.toString();
      }
    })();
    
    // ラベル生成...
  }
});
```

**学んだ教訓:**
- 静的なループ処理は回転・変換操作に脆弱
- ピンベースの動的生成が安全で柔軟
- 状態に応じたコンテンツ選択ロジックが必要

---

### **2. パフォーマンス劣化問題**

#### **問題の詳細**
- **症状**: 大規模ピンリスト（1000+ピン）でのスクロール・ズーム操作が重い
- **影響範囲**: ユーザビリティの大幅な低下
- **測定値**: 60fps → 15fps低下

#### **原因分析**
```typescript
// 問題のあったコード
{pins.map(pin => (
  <Circle
    key={pin.id}
    x={pin.position.x}
    y={pin.position.y}
    // 全ピンを毎フレーム再描画
    fill={getColor(pin)}
  />
))}
```

**根本原因:**
1. **無制限レンダリング**: 画面外ピンも含めて全描画
2. **不必要な再計算**: 毎フレームでの色計算・変換処理
3. **メモ化不足**: React.memo未使用

#### **解決策**
```typescript
// ビューポート範囲外フィルタリング
const visiblePins = useMemo(() => {
  return pins.filter(pin => {
    const transformed = transformPosition(pin);
    return (
      transformed.x >= viewport.x - 100 &&
      transformed.x <= viewport.x + stageSize.width + 100 &&
      transformed.y >= viewport.y - 100 &&
      transformed.y <= viewport.y + stageSize.height + 100
    );
  });
}, [pins, viewport, stageSize]);

// メモ化されたピンコンポーネント
const PinComponent = React.memo(({ pin }: { pin: Pin }) => {
  const position = useMemo(() => transformPosition(pin), [pin, viewport]);
  const color = useMemo(() => getPinColor(pin), [pin.isSelected, pin.signalName]);
  
  return (
    <Circle
      x={position.x}
      y={position.y}
      fill={color}
      // ... other props
    />
  );
});
```

**パフォーマンス改善結果:**
- **描画ピン数**: 1000+ → 50-100 (viewport filtering)
- **フレームレート**: 15fps → 60fps
- **メモリ使用量**: 30%削減

---

### **3. CSV パース精度問題**

#### **問題の詳細**
- **症状**: 特定のCSVファイルでピン情報が正しく読み込まれない
- **影響範囲**: データの不整合による設計ミス
- **エラーパターン**: 空行、コメント行、特殊文字の処理

#### **原因分析**
```typescript
// 問題のあったコード
const lines = csvContent.split('\n');
lines.forEach(line => {
  const values = line.split(','); // 単純分割
  // → クォート内のカンマ、エスケープ文字を考慮していない
});
```

#### **解決策**
```typescript
// 堅牢なCSVパーサー実装
class CSVParser {
  static parseCSVLine(line: string, delimiter: string = ','): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let i = 0;
    
    while (i < line.length) {
      const char = line[i];
      const nextChar = line[i + 1];
      
      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // エスケープされたクォート
          current += '"';
          i += 2;
          continue;
        }
        inQuotes = !inQuotes;
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
      i++;
    }
    
    result.push(current.trim());
    return result;
  }
  
  static parseCSVContent(content: string, options: CSVOptions): ParseResult {
    const lines = content
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .filter(line => !line.startsWith(options.commentPrefix));
    
    // ... robust parsing logic
  }
}
```

---

### **4. メモリリーク問題**

#### **問題の詳細**
- **症状**: 長時間使用後にアプリケーションが重くなる
- **影響範囲**: 継続使用でのパフォーマンス劣化
- **原因**: イベントリスナーとタイマーの未解放

#### **解決策**
```typescript
// キーボードサービスでのクリーンアップ
export class KeyboardService {
  private static handleKeyDown = (event: KeyboardEvent) => {
    // ... event handling
  };

  static initialize() {
    window.addEventListener('keydown', this.handleKeyDown);
  }

  static cleanup() {
    window.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
  }
}

// Reactコンポーネントでの適切なクリーンアップ
useEffect(() => {
  KeyboardService.initialize();
  
  return () => {
    KeyboardService.cleanup(); // 重要: クリーンアップ
  };
}, []);
```

---

## ⚡ **パフォーマンス最適化**

### **1. レンダリング最適化**

#### **仮想化の実装**
```typescript
// 大規模リスト用の仮想化
const VirtualizedPinList = ({ pins }: { pins: Pin[] }) => {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  
  const handleScroll = useCallback((e: Event) => {
    const scrollTop = (e.target as HTMLElement).scrollTop;
    const itemHeight = 32;
    const containerHeight = 400;
    
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(start + Math.ceil(containerHeight / itemHeight) + 5, pins.length);
    
    setVisibleRange({ start, end });
  }, [pins.length]);
  
  return (
    <div onScroll={handleScroll} style={{ height: 400, overflow: 'auto' }}>
      <div style={{ height: pins.length * 32 }}>
        <div style={{ transform: `translateY(${visibleRange.start * 32}px)` }}>
          {pins.slice(visibleRange.start, visibleRange.end).map(pin => (
            <PinItem key={pin.id} pin={pin} />
          ))}
        </div>
      </div>
    </div>
  );
};
```

#### **Canvas最適化**
```typescript
// 効率的な描画更新
const PackageCanvas = () => {
  const layerRef = useRef<Konva.Layer>(null);
  const [needsRedraw, setNeedsRedraw] = useState(false);
  
  useEffect(() => {
    if (needsRedraw && layerRef.current) {
      // 部分的な再描画
      layerRef.current.batchDraw();
      setNeedsRedraw(false);
    }
  }, [needsRedraw]);
  
  // デバウンスされた更新
  const debouncedUpdate = useMemo(
    () => debounce(() => setNeedsRedraw(true), 16), // 60fps
    []
  );
};
```

### **2. メモリ最適化**

```typescript
// 効率的な状態更新
const useAppStore = create<AppStore>((set, get) => ({
  // Immer使用で不変性を保ちつつ効率的な更新
  updatePin: (pinId: string, updates: Partial<Pin>) =>
    set(produce((state) => {
      const pin = state.pins.find(p => p.id === pinId);
      if (pin) {
        Object.assign(pin, updates);
      }
    })),
    
  // バッチ更新
  updatePins: (updates: Array<{ id: string; updates: Partial<Pin> }>) =>
    set(produce((state) => {
      updates.forEach(({ id, updates: pinUpdates }) => {
        const pin = state.pins.find(p => p.id === id);
        if (pin) {
          Object.assign(pin, pinUpdates);
        }
      });
    }))
}));
```

---

## 🎯 **開発のベストプラクティス**

### **1. TypeScript活用**

```typescript
// 厳密な型定義
interface Pin {
  readonly id: string;  // 不変プロパティ
  pinNumber: string;
  position: Readonly<Position>; // ネストした不変性
  signalName?: string;
  // Union typesで状態を制限
  status: 'unassigned' | 'assigned' | 'error';
}

// Type Guardsの活用
function isValidPin(obj: unknown): obj is Pin {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'pinNumber' in obj &&
    typeof (obj as Pin).id === 'string'
  );
}

// Utility Typesの活用
type PinUpdate = Partial<Pick<Pin, 'signalName' | 'status'>>;
type PinSummary = Pick<Pin, 'id' | 'pinNumber' | 'signalName'>;
```

### **2. エラーハンドリング**

```typescript
// Result型パターン
type Result<T, E = string> = 
  | { success: true; data: T }
  | { success: false; error: E };

// 使用例
export class CSVReader {
  static async parseCSV(file: File): Promise<Result<Pin[], string>> {
    try {
      const content = await file.text();
      const pins = this.parseContent(content);
      
      return { success: true, data: pins };
    } catch (error) {
      return { 
        success: false, 
        error: `CSV parsing failed: ${error.message}` 
      };
    }
  }
}

// エラーバウンダリーの実装
class ErrorBoundary extends React.Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }
  
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Application error:', error, errorInfo);
    // エラー報告サービスに送信
  }
  
  render() {
    if (this.state.hasError) {
      return <ErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}
```

### **3. テスト戦略**

```typescript
// ユニットテスト例
describe('DifferentialPairService', () => {
  it('should create valid differential pair', () => {
    const positivePin: Pin = createMockPin({ pinNumber: 'A1' });
    const negativePin: Pin = createMockPin({ pinNumber: 'A2' });
    
    const result = DifferentialPairService.createDifferentialPair(
      'test_pair',
      positivePin,
      negativePin
    );
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.positivePinId).toBe(positivePin.id);
      expect(result.data.negativePinId).toBe(negativePin.id);
    }
  });
});

// インテグレーションテスト
describe('CSV Import Integration', () => {
  it('should handle complete import workflow', async () => {
    const csvContent = `Pin,Signal,Bank\nA1,CLK_P,1\nA2,CLK_N,1`;
    const file = new File([csvContent], 'test.csv', { type: 'text/csv' });
    
    const result = await CSVReader.parseCSV(file);
    expect(result.success).toBe(true);
    
    if (result.success) {
      expect(result.data).toHaveLength(2);
      expect(result.data[0].pinNumber).toBe('A1');
    }
  });
});
```

---

## 🚨 **トラブルシューティング**

### **一般的な問題と解決法**

#### **1. ビルドエラー**
```bash
# 依存関係の問題
npm ci  # package-lock.jsonからクリーンインストール
npm run build  # 型エラーの確認

# TypeScriptエラー
npx tsc --noEmit  # 型チェックのみ実行
```

#### **2. パフォーマンス問題**
```typescript
// React DevTools Profilerを使用
// Chrome DevTools Performance tabで分析

// デバッグ用フック
const useRenderCount = (componentName: string) => {
  const renderCount = useRef(0);
  renderCount.current++;
  console.log(`${componentName} rendered ${renderCount.current} times`);
};
```

#### **3. メモリリーク検出**
```typescript
// メモリ使用量監視
const useMemoryMonitor = () => {
  useEffect(() => {
    const interval = setInterval(() => {
      if (performance.memory) {
        console.log('Memory usage:', {
          used: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
          total: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB'
        });
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
};
```

---

## 💡 **今後の開発者への知見**

### **1. アーキテクチャ設計原則**

#### **状態管理**
- **Zustandを選択した理由**: Redux比で軽量、TypeScript親和性、ボイラープレート削減
- **状態の分割**: 機能別ストア分割でメンテナンス性向上
- **不変性**: Immerでパフォーマンスと安全性を両立

#### **コンポーネント設計**
```typescript
// 単一責任原則
const PinComponent = ({ pin, onSelect, onEdit }) => {
  // ピン表示のみに集中
};

const PinContainer = ({ pin }) => {
  // ロジックとUIの分離
  const { handleSelect, handleEdit } = usePinActions(pin);
  return <PinComponent pin={pin} onSelect={handleSelect} onEdit={handleEdit} />;
};
```

### **2. パフォーマンス考慮事項**

#### **レンダリング最適化の優先順位**
1. **仮想化**: 大規模リスト対応
2. **メモ化**: 計算量の多い処理
3. **遅延読み込み**: 非同期コンポーネント
4. **バッチ更新**: 状態変更の集約

#### **メモリ効率**
```typescript
// WeakMapを活用したキャッシュ
const pinCache = new WeakMap<Pin, ProcessedPin>();

const getProcessedPin = (pin: Pin): ProcessedPin => {
  if (!pinCache.has(pin)) {
    pinCache.set(pin, processPin(pin));
  }
  return pinCache.get(pin)!;
};
```

### **3. 保守性向上のポイント**

#### **ログ戦略**
```typescript
// 構造化ログ
const logger = {
  info: (message: string, context?: object) => {
    console.log(`[INFO] ${message}`, context);
  },
  error: (message: string, error: Error, context?: object) => {
    console.error(`[ERROR] ${message}`, { error: error.message, stack: error.stack, ...context });
  }
};

// 使用例
logger.info('Pin selected', { pinId: pin.id, signalName: pin.signalName });
```

#### **設定の外部化**
```typescript
// 環境別設定
const config = {
  development: {
    logLevel: 'debug',
    enablePerformanceMonitoring: true,
    maxPinsInViewport: 1000
  },
  production: {
    logLevel: 'error',
    enablePerformanceMonitoring: false,
    maxPinsInViewport: 500
  }
};
```

### **4. 今後の技術的課題**

#### **スケーラビリティ**
- **WebWorker**: 重い計算処理の並列化
- **WebAssembly**: パフォーマンス重視の処理
- **IndexedDB**: 大量データのローカル保存

#### **拡張性**
- **プラグイン仕組み**: 動的機能追加
- **API抽象化**: 外部ツール連携
- **国際化対応**: i18n実装

---

## 📚 **参考資料**

### **公式ドキュメント**
- [React公式](https://reactjs.org/)
- [TypeScript公式](https://www.typescriptlang.org/)
- [Konva.js公式](https://konvajs.org/)
- [Zustand公式](https://github.com/pmndrs/zustand)

### **パフォーマンス最適化**
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Chrome DevTools](https://developer.chrome.com/docs/devtools/)

### **ベストプラクティス**
- [TypeScript Best Practices](https://typescript-eslint.io/rules/)
- [React Testing](https://testing-library.com/docs/react-testing-library/intro/)

---

## 🤝 **開発者へのメッセージ**

このプロジェクトは段階的に成長してきました。各機能の実装において、**パフォーマンス**、**保守性**、**拡張性**のバランスを重視してください。

特に重要なのは：
1. **ユーザー体験を最優先**にする
2. **段階的な改善**を心がける
3. **技術的負債**を積極的に解消する
4. **テスト**と**ドキュメント**を疎かにしない

皆さんの継続的な改善により、このツールがFPGA設計者にとってより価値あるものになることを期待しています！

---

**作成日**: 2025年1月31日  
**バージョン**: 1.0  
**最終更新**: グリッドラベル機能完成後
