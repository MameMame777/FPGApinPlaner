// Core data types for FPGA Pin Planner

export interface Position {
  x: number;
  y: number;
}

export interface GridPosition {
  row: string;    // A, B, C, etc.
  col: number;    // 1, 2, 3, etc.
}

export type PinDirection = 
  | 'Input' 
  | 'Output' 
  | 'InOut' 
  | 'Power' 
  | 'Ground'
  | 'Clock'
  | 'Reset'
  | 'NoConnect'
  | 'Reserved';

export type PinType = 
  | 'IO'           // General I/O pins
  | 'CONFIG'       // Configuration pins (DONE, TCK, TDI, etc.)
  | 'POWER'        // Power pins (VCCINT, VCCAUX, VCCO_XX)
  | 'GROUND'       // Ground pins (GND)
  | 'MGT'          // Multi-Gigabit Transceiver
  | 'CLOCK'        // Clock-specific pins
  | 'ADC'          // ADC-related pins
  | 'SPECIAL'      // Special purpose (VREFP, VREFN, etc.)
  | 'NC'           // Not Connected
  | 'RESERVED';    // Reserved pins

export interface DifferentialPair {
  pair: string;           // ID of the paired pin
  type: 'positive' | 'negative';
}

// 拡張された差動ペア管理用の型定義
export interface DifferentialPairGroup {
  id: string;
  name: string;
  positivePinId: string;
  negativePinId: string;
  constraints?: DifferentialConstraints;
  verified?: boolean;
  status: 'valid' | 'invalid' | 'warning' | 'unverified';
  errors?: string[];
  warnings?: string[];
  category?: 'LVDS' | 'TMDS' | 'MIPI' | 'CUSTOM';
  created: Date;
  modified: Date;
}

export interface DifferentialConstraints {
  maxSkew?: number; // ps単位
  impedance?: number; // 単端インピーダンス (Ohm)
  diffImpedance?: number; // 差動インピーダンス (Ohm)
  ioStandard?: string; // LVDS, TMDS_33, など
  driveStrength?: string;
  slewRate?: 'SLOW' | 'FAST';
  terminationResistor?: number; // 終端抵抗値 (Ohm)
  couplingCoefficient?: number; // 結合係数 (0-1)
  routingRules?: {
    maxLength?: number; // mm単位
    minSpacing?: number; // mm単位
    viaCount?: number;
    layerRestrictions?: string[];
  };
}

export interface DifferentialValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions?: string[];
  bankCompatibility?: boolean;
  voltageCompatibility?: boolean;
  physicalProximity?: {
    distance: number;
    acceptable: boolean;
  };
}

export interface DifferentialPairTemplate {
  id: string;
  name: string;
  constraints: DifferentialConstraints;
  description?: string;
  category: 'LVDS' | 'TMDS' | 'MIPI' | 'CUSTOM';
  isBuiltIn: boolean;
  compatibleDevices?: string[];
}

export interface Pin {
  id: string;                    // Unique identifier
  pinNumber: string;             // Physical pin number (A1, B2, etc.)
  pinName: string;               // Pin name from datasheet
  signalName: string;            // User-assigned signal name
  direction: PinDirection;
  pinType: PinType;
  voltage: string;               // 3.3V, 1.8V, etc.
  packagePin: string;            // Package-specific pin designation
  position: Position;            // Physical position for rendering
  gridPosition: GridPosition;    // Grid-based position
  isAssigned: boolean;           // Whether signal is assigned
  
  // Extended properties for Xilinx/FPGA-specific data
  bank?: string;                 // Bank information (0, 14, 15, etc.)
  memoryByteGroup?: string;      // Memory byte group (0, 1, 2, 3)
  vccauxGroup?: string;         // VCCAUX group
  superLogicRegion?: string;    // Super Logic Region
  ioType?: string;              // I/O Type (HR, HP, CONFIG, etc.)
  differentialPair?: DifferentialPair;
  
  // Generic attributes for extensibility
  attributes?: Record<string, string>;
  
  // Comment and annotation fields
  comment?: string;              // User comment
  autoComment?: string;          // Auto-generated comment
  commentTimestamp?: Date;       // Comment last modified
  commentAuthor?: string;        // Comment author
}

export interface Package {
  id: string;
  name: string;                  // e.g., "XC7A12T-CPG238"
  device: string;                // Device part number
  packageType: string;           // CPG238, CSG324, etc.
  dimensions: {
    rows: number;                // Number of rows (A-Z)
    cols: number;                // Number of columns (1-N)
  };
  pins: Pin[];
  totalPins: number;
}

export interface ViewConfig {
  rotation: number;              // 0, 90, 180, 270 degrees
  isTopView: boolean;           // true for top view, false for bottom
  zoom: number;                 // Zoom level (0.1 - 5.0)
  showPinNumbers: boolean;
  showSignalNames: boolean;
  showPinTypes: boolean;
  // resetTrigger removed - was causing unwanted automatic viewport changes
}

export type SortField = 'pinNumber' | 'pinName' | 'signalName' | 'pinType' | 'bank' | 'grid';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  pinTypes: PinType[];
  banks: string[];
  searchText: string;
  voltageFilter: string[];
  assignmentStatus: 'all' | 'assigned' | 'unassigned';
  showOnlyDifferentialPairs: boolean;
  sortField: SortField;
  sortOrder: SortOrder;
}

export interface FPGAProject {
  id: string;
  name: string;
  description?: string;
  created: Date;
  modified: Date;
  
  projectInfo: {
    device: string;              // "xc7a12tcsg325"
    package: string;             // "csg325"
    speedGrade: string;          // "-1", "-2", "-3"
    temperature: string;         // "C", "I", "E"
  };
  
  packageData: Package | null;
  pinAssignments: Pin[];
  viewConfig: ViewConfig;
  filters: FilterState;
  
  metadata?: {
    version: string;
    tags: string[];
    author: string;
    notes: string;
  };
}

// CSV Import/Export related types
export interface CSVFormat {
  type: 'xilinx' | 'quartus' | 'generic' | 'custom';
  hasHeader: boolean;
  commentPrefix: string;
  delimiter: string;
  expectedColumns: string[];
}

export interface ColumnMapping {
  pin: number;                   // Column index for pin number
  pinName: number;              // Column index for pin name
  signalName?: number;          // Column index for signal name
  direction?: number;           // Column index for direction
  voltage?: number;             // Column index for voltage
  bank?: number;                // Column index for bank
  memoryByteGroup?: number;     // Column index for memory byte group
  ioType?: number;              // Column index for I/O type
}

export interface ImportResult {
  success: boolean;
  pins: Pin[];
  warnings: string[];
  errors: string[];
  format: CSVFormat;
}

export interface ValidationError {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  line?: number;
  column?: number;
  field?: string;
  suggestedFix?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  suggestions: string[];
}

// Export formats
export interface ExportOptions {
  format: 'xdc' | 'qsf' | 'sdc' | 'csv' | 'excel' | 'kicad';
  includeComments: boolean;
  includeTimestamp: boolean;
  groupByBank?: boolean;
  customTemplate?: string;
}

// Search and filter types
export interface SearchQuery {
  text: string;
  useRegex: boolean;
  caseSensitive: boolean;
  searchFields: ('pinNumber' | 'pinName' | 'signalName')[];
}

export interface AdvancedFilters {
  pinRange?: { start: string; end: string };    // A1-H24
  bankFilter?: string[];
  voltageFilter?: string[];
  assignmentStatus?: 'assigned' | 'unassigned' | 'all';
  signalPattern?: string;                       // Regex pattern
  differentialPairsOnly?: boolean;
}

// Result type for error handling
export type Result<T, E = Error> = {
  success: true;
  data: T;
} | {
  success: false;
  error: E;
};

// Tab and list view types
export interface ColumnConfig {
  key: keyof Pin | string;
  title: string;
  width: number;
  editable?: boolean;
  render?: 'text' | 'datetime' | 'boolean' | 'custom';
  customRender?: (value: any, pin: Pin) => React.ReactNode;
  sortable?: boolean;
}

export interface TabConfiguration {
  id: string;
  title: string;
  icon?: string;
  columns: ColumnConfig[];
  filter?: (pin: Pin) => boolean;
  sort?: (a: Pin, b: Pin) => number;
  description?: string;
  showSearch?: boolean;
  showFilters?: boolean;
}

export type ViewMode = 'grid' | 'list';

export interface ListViewState {
  activeTab: string;
  viewMode: ViewMode;
  searchQuery: string;
  selectedRows: Set<string>;
  sortColumn?: string;
  sortDirection: 'asc' | 'desc';
  commentFilter: 'all' | 'with-comments' | 'without-comments';
}

export interface CommentTemplate {
  id: string;
  name: string;
  template: string;
  category: 'power' | 'clock' | 'io' | 'differential' | 'custom';
  variables?: string[];
}

export interface CommentHistoryEntry {
  timestamp: Date;
  author: string;
  comment: string;
  action: 'created' | 'updated' | 'deleted';
}
