# FPGA Pin Planner GUI Tool - 詳細仕様書

## 1. システム構成

### 1.1 アーキテクチャ概要
```
┌─────────────────────────────────────────┐
│                GUI Layer                │
├─────────────────────────────────────────┤
│              Business Logic             │
├─────────────────────────────────────────┤
│               Data Layer                │
├─────────────────────────────────────────┤
│              File System                │
└─────────────────────────────────────────────┘
```

### 1.2 技術スタック
- **フロントエンド**: React + TypeScript
- **デスクトップ**: Electron
- **状態管理**: Redux Toolkit
- **UI Components**: Material-UI
- **Canvas描画**: Konva.js

## 2. データモデル

### 2.1 Pin型定義
```typescript
interface Pin {
  id: string;                    // 一意識別子
  pinNumber: string;             // ピン番号
  signalName: string;            // 信号名
  direction: PinDirection;       // 方向
  voltage: string;               // 電圧レベル
  packagePin: string;            // パッケージピン名
  position: Position;            // 位置情報
  isAssigned: boolean;           // 割り当て状態
  
  // Xilinx特有のプロパティ
  bank?: string;                 // バンク情報
  memoryByteGroup?: string;      // メモリバイトグループ
  vccauxGroup?: string;          // VCCAUX グループ
  superLogicRegion?: string;     // Super Logic Region
  ioType?: string;               // I/O Type (HR, HP, GTP等)
  noConnect?: boolean;           // No-Connect フラグ
  
  attributes?: Record<string, string>; // 追加属性
}

type PinDirection = 
  | 'Input' 
  | 'Output' 
  | 'InOut' 
  | 'Power' 
  | 'Ground'
  | 'Clock'           // クロック専用
  | 'Reset'           // リセット専用
  | 'Config'          // コンフィグ用
  | 'NoConnect'       // 未接続
  | 'Reserved';       // 予約済み

interface Position {
  row: string;                   // Y軸（A, B, C...）
  col: number;                   // X軸（1, 2, 3...）
  x: number;                     // 描画用X座標
  y: number;                     // 描画用Y座標
}
```

### 2.2 Package型定義
```typescript
interface Package {
  id: string;
  name: string;                  // パッケージ名
  type: PackageType;             // パッケージタイプ
  dimensions: Dimensions;        // 寸法情報
  pins: Pin[];                   // ピン配列
  metadata: PackageMetadata;     // メタデータ
}

type PackageType = 'BGA' | 'QFP' | 'PLCC' | 'DIP';

interface Dimensions {
  rows: number;                  // 行数
  cols: number;                  // 列数
  pinPitch: number;              // ピンピッチ
}

interface PackageMetadata {
  manufacturer: string;
  partNumber: string;
  description: string;
  datasheet?: string;
}
```

### 2.3 ViewState型定義
```typescript
interface ViewState {
  rotation: Rotation;            // 回転状態
  viewType: ViewType;            // ビュータイプ
  zoomLevel: number;             // ズームレベル
  centerPoint: Point;            // 中心点
  selectedPins: string[];        // 選択中のピン
  showGrid: boolean;             // グリッド表示
  showPinNumbers: boolean;       // ピン番号表示
}

type Rotation = 0 | 90 | 180 | 270;
type ViewType = 'top' | 'bottom';

interface Point {
  x: number;
  y: number;
}
```

## 3. 機能詳細仕様

### 3.1 ファイル入出力

#### 3.1.1 CSVファイル読み込み
```typescript
interface CSVImporter {
  importPins(filePath: string): Promise<Result<Pin[], ImportError>>;
  validateCSV(content: string): ValidationResult;
  parseCSVContent(content: string): Pin[];
  
  // 拡張機能
  detectFormat(content: string): CSVFormat;
  mapColumns(headers: string[], userMapping?: ColumnMapping): ColumnMapping;
  previewImport(filePath: string, lines: number): Promise<PreviewResult>;
}

interface CSVFormat {
  type: 'xilinx' | 'generic' | 'custom';
  hasHeader: boolean;
  commentPrefix: string;
  delimiter: string;
  expectedColumns: string[];
}

interface ColumnMapping {
  pin: number;
  signalName: number;
  direction: number;
  voltage: number;
  packagePin: number;
  bank?: number;
  memoryByteGroup?: number;
  ioType?: number;
}

interface PreviewResult {
  format: CSVFormat;
  sampleData: Pin[];
  totalRows: number;
  warnings: string[];
}

interface ImportError {
  code: string;
  message: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
}

// サポートするCSV形式
const CSV_FORMATS = {
  XILINX: {
    headers: ['Pin', 'Pin Name', 'Memory Byte Group', 'Bank', 'VCCAUX Group', 'Super Logic Region', 'I/O Type', 'No-Connect'],
    commentPrefix: '#'
  },
  GENERIC: {
    headers: ['Pin', 'Signal', 'Direction', 'Voltage', 'Package_Pin', 'Row', 'Col'],
    commentPrefix: '//'
  }
};
```

#### 3.1.2 制約ファイル出力
```typescript
interface ConstraintExporter {
  exportXDC(pins: Pin[], filePath: string): Promise<Result<void, ExportError>>;
  exportSDC(pins: Pin[], filePath: string): Promise<Result<void, ExportError>>;
  generateXDCContent(pins: Pin[]): string;
  generateSDCContent(pins: Pin[]): string;
}

// XDC出力例
const XDC_TEMPLATE = `
set_property PACKAGE_PIN {packagePin} [get_ports {signalName}]
set_property IOSTANDARD {voltage} [get_ports {signalName}]
`;

// SDC出力例
const SDC_TEMPLATE = `
set_location_assignment PIN_{packagePin} -to {signalName}
set_instance_assignment -name IO_STANDARD "{voltage}" -to {signalName}
`;
```

### 3.2 座標変換システム

#### 3.2.1 座標系変換
```typescript
interface CoordinateTransformer {
  // 論理座標→描画座標変換
  logicalToCanvas(position: Position, viewState: ViewState): Point;
  
  // 描画座標→論理座標変換
  canvasToLogical(point: Point, viewState: ViewState): Position;
  
  // 回転変換
  applyRotation(point: Point, rotation: Rotation, center: Point): Point;
  
  // ミラー変換（トップ/ボトム切り替え用）
  applyMirror(point: Point, center: Point): Point;
}

// 座標変換マトリックス
interface TransformMatrix {
  a: number; b: number; c: number;
  d: number; e: number; f: number;
}
```

#### 3.2.2 ビュー変換
```typescript
class ViewTransformer {
  private getRotationMatrix(rotation: Rotation): TransformMatrix {
    switch (rotation) {
      case 0:   return { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
      case 90:  return { a: 0, b: -1, c: 1, d: 0, e: 0, f: 0 };
      case 180: return { a: -1, b: 0, c: 0, d: -1, e: 0, f: 0 };
      case 270: return { a: 0, b: 1, c: -1, d: 0, e: 0, f: 0 };
    }
  }
  
  private getMirrorMatrix(viewType: ViewType): TransformMatrix {
    return viewType === 'bottom' 
      ? { a: -1, b: 0, c: 0, d: 1, e: 0, f: 0 }
      : { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 };
  }
}
```

### 3.3 レンダリングシステム

#### 3.3.1 Canvas描画エンジン
```typescript
interface PinRenderer {
  renderPin(pin: Pin, viewState: ViewState): void;
  renderGrid(dimensions: Dimensions, viewState: ViewState): void;
  renderPackage(pkg: Package, viewState: ViewState): void;
  updateView(viewState: ViewState): void;
}

interface RenderOptions {
  showPinNumbers: boolean;
  showSignalNames: boolean;
  colorScheme: ColorScheme;
  pinSize: number;
  gridSize: number;
}

interface ColorScheme {
  input: string;      // 入力ピンの色
  output: string;     // 出力ピンの色
  inout: string;      // 双方向ピンの色
  power: string;      // 電源ピンの色
  ground: string;     // グランドピンの色
  unassigned: string; // 未割り当てピンの色
  grid: string;       // グリッドの色
  background: string; // 背景色
}
```

### 3.4 状態管理

#### 3.4.1 Redux Store構造
```typescript
interface RootState {
  package: PackageState;
  pins: PinsState;
  view: ViewState;
  ui: UIState;
  files: FilesState;
}

interface PackageState {
  current: Package | null;
  history: Package[];
  isDirty: boolean;
}

interface PinsState {
  items: Record<string, Pin>;
  selectedIds: string[];
  searchQuery: string;
  filters: PinFilters;
}

interface PinFilters {
  direction?: PinDirection;
  voltage?: string;
  assigned?: boolean;
}

interface UIState {
  loading: boolean;
  error: string | null;
  dialogs: DialogState;
  panels: PanelState;
}

interface FilesState {
  recentFiles: string[];
  currentFile: string | null;
  exportSettings: ExportSettings;
}
```

### 3.5 ユーザーインターフェース

#### 3.5.1 メインレイアウト
```
┌─────────────────────────────────────────────────────────┐
│  Menu Bar                                               │
├─────────────────────────────────────────────────────────┤
│  Tool Bar                                               │
├───────┬─────────────────────────────────────────┬───────┤
│       │                                         │       │
│ Pin   │           Canvas Area                   │ Props │
│ List  │         (Package View)                  │ Panel │
│       │                                         │       │
├───────┴─────────────────────────────────────────┴───────┤
│  Status Bar                                             │
└─────────────────────────────────────────────────────────┘
```

#### 3.5.2 コンポーネント構成
```typescript
// メインコンポーネント
const App = () => (
  <Provider store={store}>
    <MainLayout>
      <MenuBar />
      <ToolBar />
      <div className="main-content">
        <PinListPanel />
        <CanvasArea />
        <PropertiesPanel />
      </div>
      <StatusBar />
    </MainLayout>
  </Provider>
);

// キャンバスコンポーネント
interface CanvasAreaProps {
  package: Package;
  viewState: ViewState;
  onPinSelect: (pinId: string) => void;
  onPinMove: (pinId: string, newPosition: Position) => void;
}
```

## 4. API仕様

### 4.1 ファイル操作API
```typescript
interface FileAPI {
  // ファイル読み込み
  openFile(filePath: string): Promise<Package>;
  saveFile(package: Package, filePath: string): Promise<void>;
  
  // エクスポート
  exportXDC(pins: Pin[], filePath: string): Promise<void>;
  exportSDC(pins: Pin[], filePath: string): Promise<void>;
  
  // インポート
  importCSV(filePath: string): Promise<Pin[]>;
  importJSON(filePath: string): Promise<Package>;
}
```

### 4.2 座標変換API
```typescript
interface TransformAPI {
  rotateView(rotation: Rotation): void;
  toggleView(viewType: ViewType): void;
  zoomToFit(): void;
  zoomIn(): void;
  zoomOut(): void;
  panTo(point: Point): void;
}
```

## 5. エラーハンドリング

### 5.1 エラー型定義
```typescript
type AppError = 
  | FileError 
  | ValidationError 
  | RenderError 
  | NetworkError;

interface FileError {
  type: 'FILE_ERROR';
  code: 'FILE_NOT_FOUND' | 'PERMISSION_DENIED' | 'INVALID_FORMAT';
  message: string;
  filePath: string;
}

interface ValidationError {
  type: 'VALIDATION_ERROR';
  field: string;
  value: any;
  message: string;
}
```

## 6. パフォーマンス最適化

### 6.1 仮想化
- 大規模パッケージ（1000ピン以上）での描画最適化
- 可視領域のピンのみを描画
- レイヤー分離による部分更新

### 6.2 メモリ管理
- ピンデータの遅延読み込み
- 不要なレンダリングオブジェクトの解放
- 画像キャッシュの効率的な管理

## 7. テスト仕様

### 7.1 単体テスト
- 座標変換関数のテスト
- ファイル入出力のテスト
- バリデーション関数のテスト

### 7.2 統合テスト
- GUI操作のE2Eテスト
- ファイル読み込み→編集→保存の一連の流れ
- 異なるパッケージタイプでの動作確認

## 8. 改善機能仕様

### 8.1 高度なバリデーション機能

#### 8.1.1 バリデーションエンジン
```typescript
interface ValidationEngine {
  validatePins(pins: Pin[]): ValidationResult;
  validatePackage(pkg: Package): ValidationResult;
  addCustomRule(rule: ValidationRule): void;
  removeRule(ruleId: string): void;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: Suggestion[];
}

interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  column?: number;
  field?: string;
  suggestedFix?: string;
}

interface ValidationRule {
  id: string;
  name: string;
  check: (pin: Pin) => ValidationError | null;
  enabled: boolean;
}

// 組み込みバリデーションルール
const BUILT_IN_RULES = {
  PIN_NUMBER_FORMAT: /^[A-Z]+\d+$/,
  VOLTAGE_LEVELS: ['1.2V', '1.8V', '2.5V', '3.3V'],
  DIRECTION_VALUES: ['Input', 'Output', 'InOut', 'Power', 'Ground'],
  REQUIRED_FIELDS: ['pinNumber', 'packagePin', 'position']
};
```

### 8.2 インポートウィザード機能

#### 8.2.1 ウィザードコンポーネント
```typescript
interface ImportWizardProps {
  onComplete: (pins: Pin[], mapping: ColumnMapping) => void;
  onCancel: () => void;
}

interface ImportWizardState {
  currentStep: ImportStep;
  selectedFile?: File;
  detectedFormat?: CSVFormat;
  previewData?: PreviewResult;
  columnMapping?: ColumnMapping;
  validationResult?: ValidationResult;
}

type ImportStep = 
  | 'file-selection'
  | 'format-detection'
  | 'column-mapping'
  | 'validation'
  | 'import-complete';

interface StepComponentProps {
  state: ImportWizardState;
  onNext: (data: any) => void;
  onBack: () => void;
  onCancel: () => void;
}
```

### 8.3 高度な検索・フィルタ機能

#### 8.3.1 アドバンスドフィルタ
```typescript
interface AdvancedFilters {
  pinRange?: { start: string; end: string };    // A1-H24等
  bankFilter?: string[];                         // バンク指定
  voltageFilter?: string[];                      // 電圧レベル
  assignmentStatus?: 'assigned' | 'unassigned' | 'all';
  signalPattern?: string;                        // 正規表現対応
  customFilters?: CustomFilter[];
}

interface CustomFilter {
  id: string;
  name: string;
  field: keyof Pin;
  operator: FilterOperator;
  value: string;
  enabled: boolean;
}

type FilterOperator = 
  | 'equals'
  | 'contains'
  | 'startsWith'
  | 'endsWith'
  | 'regex'
  | 'greaterThan'
  | 'lessThan';

interface SearchEngine {
  search(query: string, options: SearchOptions): SearchResult[];
  applyFilters(pins: Pin[], filters: AdvancedFilters): Pin[];
  saveFilter(name: string, filters: AdvancedFilters): void;
  loadFilter(name: string): AdvancedFilters;
}

interface SearchOptions {
  fuzzySearch: boolean;
  caseSensitive: boolean;
  wholeWord: boolean;
  fields: (keyof Pin)[];
}
```

### 8.4 設定管理システム

#### 8.4.1 アプリケーション設定
```typescript
interface AppSettings {
  display: DisplaySettings;
  import: ImportSettings;
  export: ExportSettings;
  ui: UISettings;
  validation: ValidationSettings;
}

interface DisplaySettings {
  defaultColorScheme: 'light' | 'dark' | 'auto';
  pinSize: number;
  gridSize: number;
  showPinNumbers: boolean;
  showSignalNames: boolean;
  autoZoomToFit: boolean;
  animationEnabled: boolean;
  highDPI: boolean;
}

interface ImportSettings {
  defaultFormat: CSVFormat;
  autoDetectFormat: boolean;
  defaultColumnMapping: ColumnMapping;
  skipEmptyRows: boolean;
  validateOnImport: boolean;
  maxPreviewLines: number;
}

interface ExportSettings {
  defaultFormat: 'xdc' | 'sdc';
  includeComments: boolean;
  groupByBank: boolean;
  sortBySignalName: boolean;
  customTemplates: Record<string, string>;
}

interface UISettings {
  language: string;
  theme: string;
  panelLayout: PanelLayout;
  shortcuts: Record<string, string>;
  recentFilesLimit: number;
}

interface ValidationSettings {
  enabledRules: string[];
  customRules: ValidationRule[];
  autoValidate: boolean;
  showWarnings: boolean;
}
```

### 8.5 パッケージ比較機能

#### 8.5.1 比較エンジン
```typescript
interface PackageComparator {
  compare(pkg1: Package, pkg2: Package): ComparisonResult;
  highlightDifferences(result: ComparisonResult): void;
  generateReport(result: ComparisonResult): ComparisonReport;
}

interface ComparisonResult {
  identical: boolean;
  differences: PackageDifference[];
  summary: ComparisonSummary;
}

interface PackageDifference {
  type: 'pin-added' | 'pin-removed' | 'pin-modified' | 'metadata-changed';
  pinId?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
  severity: 'major' | 'minor' | 'cosmetic';
}

interface ComparisonSummary {
  totalPins: { pkg1: number; pkg2: number };
  addedPins: number;
  removedPins: number;
  modifiedPins: number;
  metadataChanges: number;
}

interface ComparisonReport {
  title: string;
  timestamp: Date;
  packages: { pkg1: Package; pkg2: Package };
  result: ComparisonResult;
  exportFormats: ('pdf' | 'html' | 'json')[];
}
```

### 8.6 プロジェクト管理機能

#### 8.6.1 プロジェクト管理
```typescript
interface Project {
  id: string;
  name: string;
  description: string;
  created: Date;
  modified: Date;
  files: ProjectFile[];
  settings: ProjectSettings;
  metadata: ProjectMetadata;
}

interface ProjectFile {
  id: string;
  name: string;
  type: 'package' | 'constraints' | 'report';
  path: string;
  lastModified: Date;
  checksum: string;
}

interface ProjectSettings {
  defaultPackage?: string;
  exportDefaults: ExportSettings;
  validationRules: string[];
  customColors: Record<string, string>;
}

interface ProjectMetadata {
  author: string;
  version: string;
  tags: string[];
  notes: string;
  links: { name: string; url: string }[];
}

interface ProjectManager {
  createProject(name: string, description: string): Project;
  openProject(projectPath: string): Promise<Project>;
  saveProject(project: Project): Promise<void>;
  exportProject(project: Project, format: 'zip' | 'tar'): Promise<Blob>;
  importProject(projectFile: File): Promise<Project>;
}
```

### 8.7 エクスポート機能の拡張

#### 8.7.1 レポート生成機能
```typescript
interface ReportGenerator {
  generatePinReport(pkg: Package, options: ReportOptions): Promise<Report>;
  generateComparisonReport(comparison: ComparisonResult): Promise<Report>;
  generateValidationReport(validation: ValidationResult): Promise<Report>;
  exportReport(report: Report, format: ReportFormat): Promise<Blob>;
}

interface ReportOptions {
  includeUnassigned: boolean;
  groupByBank: boolean;
  includeStatistics: boolean;
  customSections: ReportSection[];
  template?: string;
}

interface Report {
  title: string;
  generated: Date;
  sections: ReportSection[];
  statistics: ReportStatistics;
  metadata: Record<string, any>;
}

interface ReportSection {
  title: string;
  content: any;
  type: 'table' | 'chart' | 'text' | 'image';
}

type ReportFormat = 'pdf' | 'html' | 'excel' | 'json';

interface ReportStatistics {
  totalPins: number;
  assignedPins: number;
  pinsByDirection: Record<PinDirection, number>;
  pinsByVoltage: Record<string, number>;
  pinsByBank: Record<string, number>;
  utilizationRate: number;
}
```

### 8.8 協業機能

#### 8.8.1 コメント・注釈システム
```typescript
interface Comment {
  id: string;
  pinId?: string;
  author: string;
  content: string;
  created: Date;
  modified?: Date;
  resolved: boolean;
  replies: Comment[];
  priority: 'low' | 'medium' | 'high';
}

interface Annotation {
  id: string;
  type: 'note' | 'warning' | 'highlight';
  position: Position;
  content: string;
  color: string;
  visible: boolean;
  author: string;
  created: Date;
}

interface CommentManager {
  addComment(pinId: string, content: string, author: string): Comment;
  replyToComment(commentId: string, content: string, author: string): Comment;
  resolveComment(commentId: string): void;
  getComments(pinId?: string): Comment[];
  exportComments(format: 'json' | 'csv'): Promise<Blob>;
}
```