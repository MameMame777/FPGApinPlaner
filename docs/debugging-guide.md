# FPGA Pin Planner - デバッグ・トラブルシューティングガイド

## 🔍 **デバッグツールと手法**

### **1. ブラウザ開発者ツール活用**

#### **React DevTools**
```typescript
// プロファイラーでのパフォーマンス分析手順
1. React DevTools → Profiler タブ
2. 「Start profiling」でレコード開始
3. 問題のある操作を実行（回転、ズーム、ピン選択等）
4. 「Stop profiling」でレコード終了
5. 各コンポーネントのレンダー時間を分析

// 重いコンポーネントの特定
- Flame graph で時間のかかるコンポーネントを特定
- Ranked chart で最も時間を消費するコンポーネントをリストアップ
- Interactions で特定のユーザー操作の影響を分析
```

#### **Chrome Performance Tab**
```javascript
// FPS監視
performance.mark('operation-start');
// 重い処理...
performance.mark('operation-end');
performance.measure('operation', 'operation-start', 'operation-end');

// メモリ使用量監視
console.log('Memory usage:', {
  used: Math.round(performance.memory.usedJSHeapSize / 1048576) + 'MB',
  total: Math.round(performance.memory.totalJSHeapSize / 1048576) + 'MB',
  limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + 'MB'
});
```

### **2. アプリケーション固有のデバッグ**

#### **グリッドラベル問題のデバッグ手法**
```typescript
// デバッグ用ログ追加例
const debugGridLabels = (pins: Pin[], rotation: number, viewport: ViewportState) => {
  console.group(`🏷️ Grid Labels Debug - Rotation: ${rotation}°`);
  
  // 変換前の情報
  console.log('Original pins (first 5):', pins.slice(0, 5).map(p => ({
    pinNumber: p.pinNumber,
    gridPosition: p.gridPosition,
    originalPosition: p.position
  })));
  
  // 変換後の情報
  const transformedPins = pins.slice(0, 5).map(pin => ({
    pinNumber: pin.pinNumber,
    original: pin.position,
    transformed: transformPosition(pin, rotation, viewport)
  }));
  console.log('Transformed positions:', transformedPins);
  
  // 重複チェック
  const positions = pins.map(pin => {
    const pos = transformPosition(pin, rotation, viewport);
    return `${Math.round(pos.x)},${Math.round(pos.y)}`;
  });
  const duplicates = positions.filter((pos, index) => positions.indexOf(pos) !== index);
  if (duplicates.length > 0) {
    console.warn('Duplicate positions found:', duplicates);
  }
  
  console.groupEnd();
};
```

#### **CSV パース問題のデバッグ**
```typescript
// CSVパースデバッグ
const debugCSVParsing = (content: string, result: ParseResult) => {
  console.group('📄 CSV Parsing Debug');
  
  // 原始データ分析
  console.log('Raw content preview:', content.substring(0, 500));
  console.log('Line endings:', {
    '\r\n': (content.match(/\r\n/g) || []).length,
    '\n': (content.match(/(?<!\r)\n/g) || []).length,
    '\r': (content.match(/\r(?!\n)/g) || []).length
  });
  
  // パース結果分析
  console.log('Parse result:', {
    success: result.success,
    pinCount: result.success ? result.data.length : 0,
    errors: result.success ? [] : result.error,
    samplePins: result.success ? result.data.slice(0, 3) : null
  });
  
  // 問題のある行を特定
  if (!result.success) {
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.trim() && !line.startsWith('#')) {
        try {
          CSVParser.parseCSVLine(line);
        } catch (error) {
          console.error(`Line ${index + 1} parsing failed:`, { line, error });
        }
      }
    });
  }
  
  console.groupEnd();
};
```

### **3. パフォーマンス診断**

#### **レンダリングパフォーマンス**
```typescript
// フレームレート監視
class PerformanceMonitor {
  private frames: number[] = [];
  private lastTime = 0;
  
  startMonitoring() {
    const monitor = (currentTime: number) => {
      if (this.lastTime) {
        const fps = 1000 / (currentTime - this.lastTime);
        this.frames.push(fps);
        
        // 直近100フレームの平均FPS
        if (this.frames.length > 100) {
          this.frames.shift();
        }
        
        const avgFPS = this.frames.reduce((a, b) => a + b) / this.frames.length;
        
        if (avgFPS < 30) {
          console.warn(`⚠️ Low FPS detected: ${avgFPS.toFixed(1)} fps`);
        }
      }
      
      this.lastTime = currentTime;
      requestAnimationFrame(monitor);
    };
    
    requestAnimationFrame(monitor);
  }
  
  getStats() {
    const avg = this.frames.reduce((a, b) => a + b) / this.frames.length;
    return {
      averageFPS: avg,
      minFPS: Math.min(...this.frames),
      maxFPS: Math.max(...this.frames)
    };
  }
}
```

#### **メモリリーク検出**
```typescript
// メモリリーク検出ツール
class MemoryLeakDetector {
  private measurements: Array<{ time: number; used: number }> = [];
  private interval: NodeJS.Timeout | null = null;
  
  startMonitoring() {
    this.interval = setInterval(() => {
      if (performance.memory) {
        const measurement = {
          time: Date.now(),
          used: performance.memory.usedJSHeapSize
        };
        
        this.measurements.push(measurement);
        
        // 過去10分間のデータのみ保持
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        this.measurements = this.measurements.filter(m => m.time > tenMinutesAgo);
        
        // メモリ増加トレンドを検出
        if (this.measurements.length > 10) {
          const trend = this.calculateTrend();
          if (trend > 1048576) { // 1MB/分以上の増加
            console.warn(`🚨 Potential memory leak detected. Trend: +${Math.round(trend / 1048576)}MB/min`);
          }
        }
      }
    }, 30000); // 30秒ごと
  }
  
  stopMonitoring() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
  
  private calculateTrend(): number {
    if (this.measurements.length < 2) return 0;
    
    // 線形回帰で傾きを計算
    const n = this.measurements.length;
    const sumX = this.measurements.reduce((sum, m) => sum + m.time, 0);
    const sumY = this.measurements.reduce((sum, m) => sum + m.used, 0);
    const sumXY = this.measurements.reduce((sum, m) => sum + m.time * m.used, 0);
    const sumXX = this.measurements.reduce((sum, m) => sum + m.time * m.time, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // スロープを1分あたりのメモリ増加量に変換
    return slope * 60000; // ミリ秒を分に変換
  }
}
```

## 🚨 **よくある問題と解決法**

### **問題1: ピンが正しく表示されない**

#### **症状チェックリスト**
- [ ] CSVファイルが正しく読み込まれているか
- [ ] ピン座標が妥当な範囲内か
- [ ] viewport設定が適切か
- [ ] 回転・フリップ設定が影響していないか

#### **デバッグ手順**
```typescript
// Step 1: CSVデータ確認
console.log('Loaded pins:', pins.length);
console.log('Sample pins:', pins.slice(0, 5));

// Step 2: 座標変換確認
pins.slice(0, 5).forEach(pin => {
  const original = pin.position;
  const transformed = transformPosition(pin);
  console.log(`Pin ${pin.pinNumber}:`, {
    original,
    transformed,
    visible: isInViewport(transformed, viewport)
  });
});

// Step 3: レンダリング確認
console.log('Viewport:', viewport);
console.log('Stage size:', stageSize);
```

### **問題2: アプリケーションが重い**

#### **パフォーマンス診断チェックリスト**
- [ ] レンダリングされるピン数
- [ ] 不要な再レンダリングの発生
- [ ] メモリ使用量の推移
- [ ] イベントリスナーの重複

#### **最適化手順**
```typescript
// 1. レンダリング数制限
const visiblePins = useMemo(() => {
  const viewport = getViewport();
  return pins.filter(pin => {
    const pos = transformPosition(pin);
    return isInViewport(pos, viewport);
  });
}, [pins, viewport]);

// 2. メモ化の追加
const MemoizedPinComponent = React.memo(PinComponent, (prevProps, nextProps) => {
  return (
    prevProps.pin.id === nextProps.pin.id &&
    prevProps.pin.signalName === nextProps.pin.signalName &&
    prevProps.pin.isSelected === nextProps.pin.isSelected
  );
});

// 3. デバウンス処理
const debouncedViewportUpdate = useMemo(
  () => debounce((newViewport: ViewportState) => {
    setViewport(newViewport);
  }, 16), // 60fps
  []
);
```

### **問題3: CSV読み込みエラー**

#### **エラーパターンと対策**

**パターン1: 文字エンコーディング問題**
```typescript
// 文字エンコーディング検出
const detectEncoding = (buffer: ArrayBuffer): string => {
  const uint8Array = new Uint8Array(buffer);
  
  // BOM検出
  if (uint8Array[0] === 0xEF && uint8Array[1] === 0xBB && uint8Array[2] === 0xBF) {
    return 'utf-8';
  }
  if (uint8Array[0] === 0xFF && uint8Array[1] === 0xFE) {
    return 'utf-16le';
  }
  
  // Shift_JIS検出（簡易）
  for (let i = 0; i < Math.min(1000, uint8Array.length); i++) {
    if (uint8Array[i] >= 0x80 && uint8Array[i] <= 0x9F) {
      return 'shift_jis';
    }
  }
  
  return 'utf-8';
};
```

**パターン2: CSVフォーマット問題**
```typescript
// 堅牢なCSVパーサー
const parseCSVWithValidation = (content: string): ParseResult => {
  const lines = content.split(/\r?\n/).filter(line => line.trim());
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // ヘッダー検証
  const header = lines[0];
  const expectedColumns = ['Pin', 'Signal', 'Bank'];
  const actualColumns = CSVParser.parseCSVLine(header);
  
  for (const expected of expectedColumns) {
    if (!actualColumns.some(col => col.toLowerCase().includes(expected.toLowerCase()))) {
      warnings.push(`Expected column '${expected}' not found`);
    }
  }
  
  // データ行検証
  const pins: Pin[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    try {
      const values = CSVParser.parseCSVLine(line);
      const pin = createPinFromCSVRow(values, actualColumns);
      pins.push(pin);
    } catch (error) {
      errors.push(`Line ${i + 1}: ${error.message}`);
    }
  }
  
  return {
    success: errors.length === 0,
    data: pins,
    errors,
    warnings
  };
};
```

## 🔧 **開発環境の最適化**

### **VSCode設定推奨**
```json
// .vscode/settings.json
{
  "typescript.preferences.strictNullChecks": true,
  "typescript.preferences.noImplicitAny": true,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true,
    "source.organizeImports": true
  },
  "emmet.includeLanguages": {
    "typescript": "html"
  },
  "typescript.updateImportsOnFileMove.enabled": "always"
}

// .vscode/extensions.json（推奨拡張機能）
{
  "recommendations": [
    "bradlc.vscode-tailwindcss",
    "ms-vscode.vscode-typescript-next",
    "esbenp.prettier-vscode",
    "dbaeumer.vscode-eslint",
    "ms-vscode.vscode-json"
  ]
}
```

### **デバッグ設定**
```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Chrome",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/src",
      "sourceMapPathOverrides": {
        "webpack:///./src/*": "${webRoot}/*"
      }
    }
  ]
}
```

### **ホットリロード最適化**
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: {
      overlay: false // エラーオーバーレイを無効化
    }
  },
  build: {
    sourcemap: true, // 本番でもソースマップ生成
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          graphics: ['konva', 'react-konva'],
          utils: ['zustand']
        }
      }
    }
  }
});
```

## 📊 **監視とアラート**

### **エラー追跡システム**
```typescript
// エラー監視サービス
class ErrorTracker {
  private static errors: Array<{ timestamp: number; error: Error; context?: any }> = [];
  
  static track(error: Error, context?: any) {
    const errorInfo = {
      timestamp: Date.now(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      },
      context,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.errors.push(errorInfo);
    
    // 重大なエラーの検出
    if (this.errors.length > 10) {
      console.error('🚨 Multiple errors detected:', this.errors);
    }
    
    // 外部サービスに送信（本番環境）
    if (process.env.NODE_ENV === 'production') {
      // Sentry、LogRocket等への送信
    }
  }
  
  static getErrorSummary() {
    const recent = this.errors.filter(e => e.timestamp > Date.now() - 60000); // 1分以内
    return {
      totalErrors: this.errors.length,
      recentErrors: recent.length,
      errorTypes: [...new Set(this.errors.map(e => e.error.name))]
    };
  }
}

// グローバルエラーハンドリング
window.addEventListener('error', (event) => {
  ErrorTracker.track(event.error, { type: 'unhandled' });
});

window.addEventListener('unhandledrejection', (event) => {
  ErrorTracker.track(new Error(event.reason), { type: 'promise_rejection' });
});
```

### **ユーザー行動分析**
```typescript
// ユーザー操作追跡
class UserActionTracker {
  private static actions: Array<{ type: string; timestamp: number; data?: any }> = [];
  
  static track(type: string, data?: any) {
    this.actions.push({
      type,
      timestamp: Date.now(),
      data
    });
    
    // 最新100アクションのみ保持
    if (this.actions.length > 100) {
      this.actions.shift();
    }
  }
  
  static getActionSequence() {
    return this.actions.slice(-10); // 直近10アクション
  }
  
  static detectPatterns() {
    // 問題のあるパターンを検出
    const recentActions = this.actions.slice(-20);
    const errorActions = recentActions.filter(a => a.type === 'error');
    
    if (errorActions.length > 3) {
      console.warn('🚨 Multiple errors in recent actions:', errorActions);
    }
  }
}

// 使用例
UserActionTracker.track('pin_selected', { pinId: 'A1' });
UserActionTracker.track('csv_imported', { pinCount: 256 });
```

このガイドにより、開発者は効率的にデバッグを行い、問題を早期に発見・解決できるようになります。
