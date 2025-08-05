import { Pin, Package, FPGAProject } from '@/types';
import { rowToIndex } from '@/utils/grid-utils';

// セーブデータの型定義
export interface FPGAProjectSaveData {
  // メタデータ
  metadata: {
    version: string;          // セーブ形式のバージョン
    created: string;          // 作成日時 (ISO format)
    modified: string;         // 最終更新日時
    appVersion: string;       // アプリケーションバージョン
    description?: string;     // プロジェクト説明
    author?: string;          // 作成者
  };

  // パッケージ情報
  package: {
    device: string;           // "xc7z020clg400-1"
    packageType: string;      // "clg400"
    speedGrade?: string;      // "-1"
    originalCsvFile?: string; // 元のCSVファイル名
  };

  // ピン設定データ
  pins: {
    id: string;
    pinNumber: string;
    pinName: string;
    originalSignalName?: string;  // 元の信号名
    assignedSignalName?: string;  // ユーザー割り当て信号名
    comment?: string;             // ユーザーコメント
    bank?: string;
    pinType: string;
    gridPosition?: {
      row: string;
      col: number;
    };
    // 差動ペア情報
    differentialPair?: {
      pair: string;
      type: 'positive' | 'negative';
      partnerId?: string;
    };
    // カスタムプロパティ（拡張用）
    custom?: Record<string, any>;
  }[];

  // ビュー設定
  viewSettings: {
    zoom: number;
    rotation: number;
    isTopView: boolean;
    viewport?: { x: number; y: number; scale: number };
    selectedPins: string[];   // 選択状態の保存
    filters?: Record<string, any>;
  };

  // プロジェクト設定
  projectSettings: {
    listViewActiveTab?: string;
    sidebarWidth?: number;
    showDifferentialPairs?: boolean;
    customSettings?: Record<string, any>;
  };

  // 制約情報（将来拡張用）
  constraints?: {
    timing?: any[];
    placement?: any[];
    routing?: any[];
  };

  // 変更履歴（Undo/Redo情報）
  history?: {
    currentIndex: number;
    actions: any[];
  };
}

// アプリケーション状態の簡易型定義（実際のapp-storeに合わせて調整）
export interface AppState {
  package: Package | null;
  pins: Pin[];
  selectedPins: Set<string>;
  viewConfig: {
    zoom: number;
    rotation: number;
    isTopView: boolean;
    viewport?: { x: number; y: number; scale: number };
  };
  listView?: {
    activeTab: string;
  };
  ui?: {
    sidebarWidth?: number;
    showDifferentialPairs?: boolean;
  };
  filters?: Record<string, any>;
  history?: {
    currentIndex: number;
    actions: any[];
  };
  projectSettings?: Record<string, any>;
}

export class ProjectSaveService {
  private static readonly SAVE_VERSION = "1.0.0";
  private static readonly FILE_EXTENSION = ".fpgaproj";
  private static readonly QUICKSAVE_KEY = 'fpga-planner-quicksave';
  private static readonly QUICKSAVE_TIMESTAMP_KEY = 'fpga-planner-quicksave-timestamp';

  /**
   * 現在の作業状況をセーブデータに変換
   */
  static createSaveData(appState: AppState): FPGAProjectSaveData {
    const now = new Date().toISOString();

    return {
      metadata: {
        version: this.SAVE_VERSION,
        created: now,
        modified: now,
        appVersion: "1.0.0", // package.jsonから取得（実際の実装では動的に）
        description: `FPGA Pin Planning Project - ${appState.package?.device || 'Unknown Device'}`,
        author: "FPGA Pin Planner User"
      },

      package: {
        device: appState.package?.device || '',
        packageType: appState.package?.packageType || '',
        // speedGrade: appState.package?.speedGrade || '', // Package型にないため削除
        // originalCsvFile: appState.package?.originalCsvFile // Package型にないため削除
      },

      pins: appState.pins.map(pin => ({
        id: pin.id,
        pinNumber: pin.pinNumber,
        pinName: pin.pinName,
        // originalSignalName: pin.originalSignalName, // Pin型にないため削除
        assignedSignalName: pin.signalName,
        comment: pin.comment,
        bank: pin.bank,
        pinType: pin.pinType,
        gridPosition: pin.gridPosition,
        differentialPair: pin.differentialPair,
        // custom: pin.custom || {} // Pin型にないため削除
      })),

      viewSettings: {
        zoom: appState.viewConfig.zoom,
        rotation: appState.viewConfig.rotation,
        isTopView: appState.viewConfig.isTopView,
        viewport: appState.viewConfig.viewport || { x: 0, y: 0, scale: 1 },
        selectedPins: Array.from(appState.selectedPins),
        filters: appState.filters
      },

      projectSettings: {
        listViewActiveTab: appState.listView?.activeTab || 'overview',
        sidebarWidth: appState.ui?.sidebarWidth || 300,
        showDifferentialPairs: appState.ui?.showDifferentialPairs || false,
        customSettings: appState.projectSettings || {}
      },

      history: appState.history || {
        currentIndex: 0,
        actions: []
      }
    };
  }

  /**
   * ファイルに保存
   */
  static async saveToFile(saveData: FPGAProjectSaveData, filename?: string): Promise<void> {
    const deviceName = saveData.package.device.replace(/[^a-zA-Z0-9]/g, '_');
    const timestamp = new Date().toISOString().split('T')[0];
    const defaultFilename = `${deviceName}_project_${timestamp}${this.FILE_EXTENSION}`;
    const finalFilename = filename || defaultFilename;

    const jsonString = JSON.stringify(saveData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    // ブラウザダウンロード
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = finalFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * ファイルから読み込み
   */
  static async loadFromFile(file: File): Promise<FPGAProjectSaveData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const jsonString = event.target?.result as string;
          const saveData = JSON.parse(jsonString) as FPGAProjectSaveData;
          
          // バージョン互換性チェック
          if (!this.isCompatibleVersion(saveData.metadata.version)) {
            throw new Error(`Incompatible save file version: ${saveData.metadata.version}`);
          }
          
          // 必須フィールドの検証
          if (!saveData.package || !saveData.pins || !Array.isArray(saveData.pins)) {
            throw new Error('Invalid save file format: missing required fields');
          }
          
          resolve(saveData);
        } catch (error) {
          reject(new Error(`Failed to parse save file: ${error}`));
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  /**
   * セーブデータをアプリケーション状態に復元
   */
  /**
   * セーブデータからFPGAProjectを復元
   */
  static restoreProject(saveData: FPGAProjectSaveData): FPGAProject {
    // パッケージデータの復元
    const packageData: Package = {
      id: `package-${Date.now()}`,
      name: saveData.package.device,
      device: saveData.package.device,
      packageType: saveData.package.packageType,
      dimensions: {
        rows: Math.max(...saveData.pins.map(p => rowToIndex(p.gridPosition?.row || 'A') + 1)),
        cols: Math.max(...saveData.pins.map(p => p.gridPosition?.col || 1))
      },
      totalPins: saveData.pins.length,
      pins: saveData.pins.map(pin => ({
        id: pin.id,
        pinNumber: pin.pinNumber,
        pinName: pin.pinName,
        signalName: pin.assignedSignalName || pin.originalSignalName || '',
        direction: 'InOut' as any, // Default direction
        pinType: pin.pinType as any,
        voltage: '3.3V', // Default voltage
        packagePin: pin.pinNumber,
        position: this.gridToPosition(pin.gridPosition || { row: 'A', col: 1 }),
        gridPosition: pin.gridPosition || { row: 'A', col: 1 },
        isAssigned: Boolean(pin.assignedSignalName),
        bank: pin.bank || 'NA',
        comment: pin.comment || '',
        differentialPair: pin.differentialPair
      }))
    };

    // FPGAProjectを構築
    const project: FPGAProject = {
      id: `project-${Date.now()}`,
      name: saveData.metadata.description || `Restored Project ${new Date().toLocaleDateString()}`,
      description: saveData.metadata.description || '',
      created: new Date(saveData.metadata.created),
      modified: new Date(saveData.metadata.modified),
      projectInfo: {
        device: saveData.package.device,
        package: saveData.package.packageType,
        speedGrade: saveData.package.speedGrade || '-1',
        temperature: 'C'
      },
      packageData,
      pinAssignments: packageData.pins,
      viewConfig: {
        rotation: saveData.viewSettings.rotation,
        isTopView: saveData.viewSettings.isTopView,
        zoom: saveData.viewSettings.zoom,
        showPinNumbers: true,
        showSignalNames: true,
        showPinTypes: false,
        resetTrigger: 0
      },
      filters: {
        pinTypes: [],
        banks: [],
        searchText: '',
        voltageFilter: [],
        assignmentStatus: 'all',
        showOnlyDifferentialPairs: false,
        sortField: 'pinNumber',
        sortOrder: 'asc'
      }
    };

    return project;
  }

  static restoreAppState(saveData: FPGAProjectSaveData, currentState: AppState): Partial<AppState> {
    // ピンデータの復元（差分更新）
    const restoredPins = currentState.pins.map(currentPin => {
      const savedPin = saveData.pins.find(p => p.id === currentPin.id || p.pinNumber === currentPin.pinNumber);
      if (!savedPin) {
        return currentPin; // セーブデータにない場合は現在の状態を維持
      }

      return {
        ...currentPin,
        signalName: savedPin.assignedSignalName || currentPin.signalName,
        comment: savedPin.comment || currentPin.comment,
        differentialPair: savedPin.differentialPair || currentPin.differentialPair,
        // custom: savedPin.custom || currentPin.custom // Pin型にないため削除
      };
    });

    return {
      pins: restoredPins,
      selectedPins: new Set(saveData.viewSettings.selectedPins),
      viewConfig: {
        zoom: saveData.viewSettings.zoom,
        rotation: saveData.viewSettings.rotation,
        isTopView: saveData.viewSettings.isTopView,
        viewport: saveData.viewSettings.viewport
      },
      filters: saveData.viewSettings.filters,
      listView: {
        activeTab: saveData.projectSettings.listViewActiveTab || 'overview'
      },
      ui: {
        sidebarWidth: saveData.projectSettings.sidebarWidth,
        showDifferentialPairs: saveData.projectSettings.showDifferentialPairs
      },
      history: saveData.history,
      projectSettings: saveData.projectSettings.customSettings
    };
  }

  /**
   * バージョン互換性チェック
   */
  private static isCompatibleVersion(version: string): boolean {
    const [major] = version.split('.').map(Number);
    const [currentMajor] = this.SAVE_VERSION.split('.').map(Number);
    
    return major <= currentMajor; // 下位互換性を保証
  }

  /**
   * クイックセーブ（ローカルストレージ）
   */
  static quickSave(appState: AppState): void {
    try {
      const saveData = this.createSaveData(appState);
      const compressed = this.compressData(saveData);
      localStorage.setItem(this.QUICKSAVE_KEY, compressed);
      localStorage.setItem(this.QUICKSAVE_TIMESTAMP_KEY, new Date().toISOString());
      
      console.log('📁 Quick save completed');
    } catch (error) {
      console.error('Failed to quick save:', error);
      throw new Error(`Quick save failed: ${error}`);
    }
  }

  /**
   * クイックロード（ローカルストレージ）
   */
  static quickLoad(): FPGAProjectSaveData | null {
    try {
      const compressed = localStorage.getItem(this.QUICKSAVE_KEY);
      if (!compressed) return null;
      
      return this.decompressData(compressed);
    } catch (error) {
      console.error('Failed to load quicksave:', error);
      return null;
    }
  }

  /**
   * クイックセーブの存在確認と日時取得
   */
  static getQuickSaveInfo(): { exists: boolean; timestamp?: string } {
    const timestamp = localStorage.getItem(this.QUICKSAVE_TIMESTAMP_KEY);
    const hasData = localStorage.getItem(this.QUICKSAVE_KEY) !== null;
    
    return {
      exists: hasData,
      timestamp: timestamp || undefined
    };
  }

  /**
   * クイックセーブの削除
   */
  static clearQuickSave(): void {
    localStorage.removeItem(this.QUICKSAVE_KEY);
    localStorage.removeItem(this.QUICKSAVE_TIMESTAMP_KEY);
  }

  /**
   * データ圧縮（ローカルストレージ用）
   */
  private static compressData(data: FPGAProjectSaveData): string {
    // 簡単な圧縮：不要なフィールドを除去してクイックセーブ用に最適化
    const compressed = {
      metadata: {
        version: data.metadata.version,
        created: data.metadata.created
      },
      package: data.package,
      pins: data.pins.map(pin => ({
        id: pin.id,
        pinNumber: pin.pinNumber,
        assignedSignalName: pin.assignedSignalName,
        comment: pin.comment,
        ...(pin.differentialPair && { differentialPair: pin.differentialPair }),
        ...(pin.custom && Object.keys(pin.custom).length > 0 && { custom: pin.custom })
      })),
      viewSettings: data.viewSettings,
      projectSettings: data.projectSettings
    };
    
    return JSON.stringify(compressed);
  }

  private static decompressData(compressed: string): FPGAProjectSaveData {
    const data = JSON.parse(compressed);
    
    // 展開時に不足フィールドを補完
    return {
      metadata: {
        version: data.metadata.version,
        created: data.metadata.created,
        modified: new Date().toISOString(),
        appVersion: "1.0.0",
        description: "Quick Save Data"
      },
      package: data.package,
      pins: data.pins,
      viewSettings: data.viewSettings,
      projectSettings: data.projectSettings || {},
      constraints: {},
      history: { currentIndex: 0, actions: [] }
    };
  }

  private static gridToPosition(grid: { row: string; col: number }): { x: number; y: number } {
    // Convert grid position to pixel coordinates that exactly match grid labels
    // This ensures perfect alignment with the visual grid system
    
    const rowOffset = rowToIndex(grid.row);
    
    // Tile spacing parameters - ensure tiles fit properly
    const tileSize = 88; // Tile size from PackageCanvas
    const gridSpacing = tileSize; // Exact spacing to prevent overlap
    
    // Use exact grid positioning without jitter for perfect alignment
    // Grid coordinates start from (0,0) for A1
    const x = (grid.col - 1) * gridSpacing;
    const y = rowOffset * gridSpacing;
    
    const position = { x: Math.round(x), y: Math.round(y) };
    
    return position;
  }
}
