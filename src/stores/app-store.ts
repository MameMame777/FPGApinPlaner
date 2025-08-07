import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { enableMapSet } from 'immer';
import { Pin, Package, ViewConfig, FilterState, FPGAProject, SortField, SortOrder, ListViewState, ViewMode, PinColorMode } from '@/types';
import { UndoRedoService, Action } from '@/services/undo-redo-service';
import { compareRows } from '@/utils/grid-utils';

// Enable Immer MapSet plugin
enableMapSet();

interface AppState {
  // Current project state
  currentProject: FPGAProject | null;
  
  // Package and pin data
  package: Package | null;
  pins: Pin[];
  filteredPins: Pin[];
  selectedPins: Set<string>;
  
  // View configuration
  viewConfig: ViewConfig;
  
  // List view state
  listView: ListViewState;
  
  // Pin color mode
  pinColorMode: PinColorMode;
  
  // Filter state
  filters: FilterState;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Recent files
  recentFiles: string[];

  // Undo/Redo state
  canUndo: boolean;
  canRedo: boolean;
  currentActionDescription: string | null;
  nextRedoActionDescription: string | null;
}

interface AppActions {
  // Project management
  loadProject: (project: FPGAProject) => void;
  createNewProject: (name: string, packageData: Package) => void;
  saveProject: () => void;
  
  // Package and pin management
  loadPackage: (packageData: Package) => void;
  updatePin: (pinId: string, updates: Partial<Pin>) => void;
  updatePins: (updates: Map<string, Partial<Pin>>) => void;
  assignSignal: (pinId: string, signalName: string) => void;
  clearSignal: (pinId: string) => void;
  
  // Selection management
  selectPin: (pinId: string) => void;
  selectPins: (pinIds: string[]) => void;
  clearSelection: () => void;
  togglePinSelection: (pinId: string) => void;
  
  // View management
  setRotation: (rotation: number) => void;
  toggleView: () => void;
  setZoom: (zoom: number) => void;
  resetZoom: () => void;
  updateViewConfig: (config: Partial<ViewConfig>) => void;
  
  // List view management
  setViewMode: (mode: ViewMode) => void;
  setActiveTab: (tabId: string) => void;
  setSearchQuery: (query: string) => void;
  setCommentFilter: (filter: 'all' | 'with-comments' | 'without-comments') => void;
  updateListViewState: (updates: Partial<ListViewState>) => void;
  bulkUpdateComments: (pinIds: string[], comment: string) => void;
  
  // Pin color mode management
  setPinColorMode: (mode: PinColorMode) => void;
  
  // Filter management
  updateFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  setSortField: (field: SortField) => void;
  setSortOrder: (order: SortOrder) => void;
  
  // Differential pair management
  assignDifferentialPair: (positiveId: string, negativeId: string, baseName: string) => void;
  clearDifferentialPair: (pinId: string) => void;
  
  // Coordinate transformations
  rotatePins: (degrees: number) => void;
  flipView: () => void;
  
  // Utility actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  addRecentFile: (filePath: string) => void;

  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  updateUndoRedoState: () => void;
  clearHistory: () => void;
  handleUndoRedoAction: (action: Action, operation: 'undo' | 'redo') => void;
}

const initialViewConfig: ViewConfig = {
  rotation: 0,
  isTopView: true,
  zoom: 1.0,
  showPinNumbers: true,
  showSignalNames: true,
  showPinTypes: false,
  // resetTrigger removed - was causing unwanted automatic viewport changes
};

const initialFilters: FilterState = {
  pinTypes: [],
  banks: [],
  searchText: '',
  voltageFilter: [],
  assignmentStatus: 'all',
  showOnlyDifferentialPairs: false,
  sortField: 'grid',
  sortOrder: 'asc',
};

const initialListView: ListViewState = {
  activeTab: 'overview',
  viewMode: 'grid',
  searchQuery: '',
  selectedRows: new Set(),
  sortColumn: undefined,
  sortDirection: 'asc',
  commentFilter: 'all',
};

export const useAppStore = create<AppState & AppActions>()(
  immer((set, get) => ({
    // Initial state
    currentProject: null,
    package: null,
    pins: [],
    filteredPins: [],
    selectedPins: new Set(),
    viewConfig: initialViewConfig,
    listView: initialListView,
    pinColorMode: 'bank',
    filters: initialFilters,
    isLoading: false,
    error: null,
    recentFiles: [],

    // Undo/Redo initial state
    canUndo: false,
    canRedo: false,
    currentActionDescription: null,
    nextRedoActionDescription: null,

    // Project management
    loadProject: (project) => {
      set((state) => {
        state.currentProject = project;
        state.package = project.packageData;
        state.pins = project.pinAssignments;
        state.viewConfig = project.viewConfig;
        state.filters = project.filters;
        // filteredPinsはapplyFilters()で設定されるので、ここでは設定しない
      });
      
      // フィルタを適用してfilteredPinsを正しく設定
      get().applyFilters();
    },

    createNewProject: (name, packageData) =>
      set((state) => {
        const newProject: FPGAProject = {
          id: crypto.randomUUID(),
          name,
          description: '',
          created: new Date(),
          modified: new Date(),
          projectInfo: {
            device: packageData.device,
            package: packageData.packageType,
            speedGrade: '-1',
            temperature: 'C',
          },
          packageData,
          pinAssignments: packageData.pins,
          viewConfig: initialViewConfig,
          filters: initialFilters,
        };
        
        state.currentProject = newProject;
        state.package = packageData;
        state.pins = packageData.pins;
        state.filteredPins = packageData.pins;
        state.viewConfig = initialViewConfig;
        state.filters = initialFilters;
        
        // Apply initial filters and sorting
        get().applyFilters();
      }),

    saveProject: () =>
      set((state) => {
        if (state.currentProject) {
          state.currentProject.modified = new Date();
          state.currentProject.pinAssignments = state.pins;
          state.currentProject.viewConfig = state.viewConfig;
          state.currentProject.filters = state.filters;
        }
      }),

    // Package and pin management
    loadPackage: (packageData) =>
      set((state) => {
        console.log('🏪 ストア: loadPackage開始', packageData);
        state.package = packageData;
        state.pins = packageData.pins;
        state.filteredPins = packageData.pins;
        state.selectedPins.clear();
        console.log('🏪 ストア更新完了:', {
          packageName: state.package?.name,
          pinsCount: state.pins.length,
          filteredPinsCount: state.filteredPins.length
        });
      }),

    updatePin: (pinId, updates) =>
      set((state) => {
        const pin = state.pins.find(p => p.id === pinId);
        if (pin) {
          Object.assign(pin, updates);
          if (updates.signalName !== undefined) {
            pin.isAssigned = updates.signalName !== '';
          }
        }
      }),

    updatePins: (updates) =>
      set((state) => {
        updates.forEach((update, pinId) => {
          const pin = state.pins.find(p => p.id === pinId);
          if (pin) {
            Object.assign(pin, update);
            if (update.signalName !== undefined) {
              pin.isAssigned = update.signalName !== '';
            }
          }
        });
      }),

    assignSignal: (pinId, signalName) => {
      const state = get();
      const pin = state.pins.find(p => p.id === pinId);
      if (!pin) return;

      const oldSignal = pin.signalName;
      
      // Record the action for undo/redo
      const actionData = UndoRedoService.createPinAssignmentAction(pinId, oldSignal, signalName);
      UndoRedoService.recordAction(
        actionData.type,
        actionData.data,
        signalName ? `信号 "${signalName}" をピン ${pinId} に割り当て` : `ピン ${pinId} の信号割り当てを解除`
      );

      set((state) => {
        const pin = state.pins.find(p => p.id === pinId);
        if (pin) {
          pin.signalName = signalName;
          pin.isAssigned = signalName !== '';
        }
      });
      
      // Apply filters after state update
      get().applyFilters();
      get().updateUndoRedoState();
    },

    clearSignal: (pinId) => {
      const state = get();
      const pin = state.pins.find(p => p.id === pinId);
      if (!pin || !pin.signalName) return;

      const oldSignal = pin.signalName;
      
      // Record the action for undo/redo
      const actionData = UndoRedoService.createPinAssignmentAction(pinId, oldSignal, '');
      UndoRedoService.recordAction(
        actionData.type,
        actionData.data,
        `ピン ${pinId} の信号割り当てを解除`
      );

      set((state) => {
        const pin = state.pins.find(p => p.id === pinId);
        if (pin) {
          pin.signalName = '';
          pin.isAssigned = false;
        }
      });
      
      get().applyFilters();
      get().updateUndoRedoState();
    },

    // Selection management
    selectPin: (pinId) =>
      set((state) => {
        state.selectedPins.clear();
        state.selectedPins.add(pinId);
      }),

    selectPins: (pinIds) =>
      set((state) => {
        state.selectedPins.clear();
        pinIds.forEach(id => state.selectedPins.add(id));
      }),

    clearSelection: () =>
      set((state) => {
        state.selectedPins.clear();
      }),

    togglePinSelection: (pinId) =>
      set((state) => {
        if (state.selectedPins.has(pinId)) {
          state.selectedPins.delete(pinId);
        } else {
          state.selectedPins.add(pinId);
        }
      }),

    // View management
    setRotation: (rotation) =>
      set((state) => {
        state.viewConfig.rotation = rotation % 360;
      }),

    toggleView: () =>
      set((state) => {
        state.viewConfig.isTopView = !state.viewConfig.isTopView;
      }),

    setZoom: (zoom) =>
      set((state) => {
        state.viewConfig.zoom = Math.max(0.1, Math.min(5.0, zoom));
      }),

    resetZoom: () =>
      set((state) => {
        state.viewConfig.zoom = 1.0;
        // resetTrigger removed - no longer triggering automatic viewport changes
      }),

    updateViewConfig: (config) =>
      set((state) => {
        Object.assign(state.viewConfig, config);
      }),

    // Filter management
    updateFilters: (filters) =>
      set((state) => {
        Object.assign(state.filters, filters);
        
        // Apply filters immediately within the same state update
        let filtered = [...state.pins];

        // Filter by pin types
        if (state.filters.pinTypes.length > 0) {
          filtered = filtered.filter(pin => 
            state.filters.pinTypes.includes(pin.pinType)
          );
        }

        // Filter by banks
        if (state.filters.banks.length > 0) {
          filtered = filtered.filter(pin => 
            pin.bank && state.filters.banks.includes(pin.bank)
          );
        }

        // Filter by search text
        if (state.filters.searchText) {
          const searchLower = state.filters.searchText.toLowerCase();
          filtered = filtered.filter(pin => 
            pin.pinNumber.toLowerCase().includes(searchLower) ||
            pin.pinName.toLowerCase().includes(searchLower) ||
            pin.signalName.toLowerCase().includes(searchLower)
          );
        }

        // Filter by voltage
        if (state.filters.voltageFilter.length > 0) {
          filtered = filtered.filter(pin => 
            state.filters.voltageFilter.includes(pin.voltage)
          );
        }

        // Filter by assignment status
        if (state.filters.assignmentStatus !== 'all') {
          filtered = filtered.filter(pin => 
            state.filters.assignmentStatus === 'assigned' ? pin.isAssigned : !pin.isAssigned
          );
        }

        // Filter differential pairs only
        if (state.filters.showOnlyDifferentialPairs) {
          filtered = filtered.filter(pin => pin.differentialPair);
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let valueA: string;
          let valueB: string;

          switch (state.filters.sortField) {
            case 'pinNumber':
              valueA = a.pinNumber;
              valueB = b.pinNumber;
              break;
            case 'pinName':
              valueA = a.pinName;
              valueB = b.pinName;
              break;
            case 'signalName':
              valueA = a.signalName;
              valueB = b.signalName;
              break;
            case 'pinType':
              valueA = a.pinType;
              valueB = b.pinType;
              break;
            case 'bank':
              valueA = a.bank || '';
              valueB = b.bank || '';
              break;
            case 'grid':
              // Grid position sorting: compare rows first, then columns
              if (a.gridPosition && b.gridPosition) {
                const rowComparison = compareRows(a.gridPosition.row, b.gridPosition.row);
                if (process.env.NODE_ENV === 'development') {
                  console.log(`🔄 Store grid sort: ${a.gridPosition.row} vs ${b.gridPosition.row} = ${rowComparison}`);
                }
                if (rowComparison !== 0) {
                  return state.filters.sortOrder === 'asc' ? rowComparison : -rowComparison;
                }
                // If rows are equal, compare columns
                const colComparison = a.gridPosition.col - b.gridPosition.col;
                return state.filters.sortOrder === 'asc' ? colComparison : -colComparison;
              }
              valueA = a.gridPosition?.row || '';
              valueB = b.gridPosition?.row || '';
              break;
            default:
              valueA = a.pinNumber;
              valueB = b.pinNumber;
          }

          // Natural sort for alphanumeric values (A1, A2, A10, B1, etc.)
          const result = valueA.localeCompare(valueB, undefined, { 
            numeric: true, 
            sensitivity: 'base' 
          });
          
          return state.filters.sortOrder === 'asc' ? result : -result;
        });

        state.filteredPins = filtered;
      }),

    clearFilters: () =>
      set((state) => {
        state.filters = { ...initialFilters };
        state.filteredPins = state.pins;
      }),

    applyFilters: () =>
      set((state) => {
        let filtered = [...state.pins];

        // Filter by pin types
        if (state.filters.pinTypes.length > 0) {
          filtered = filtered.filter(pin => 
            state.filters.pinTypes.includes(pin.pinType)
          );
        }

        // Filter by banks
        if (state.filters.banks.length > 0) {
          filtered = filtered.filter(pin => 
            pin.bank && state.filters.banks.includes(pin.bank)
          );
        }

        // Filter by search text
        if (state.filters.searchText) {
          const searchLower = state.filters.searchText.toLowerCase();
          filtered = filtered.filter(pin => 
            pin.pinNumber.toLowerCase().includes(searchLower) ||
            pin.pinName.toLowerCase().includes(searchLower) ||
            pin.signalName.toLowerCase().includes(searchLower)
          );
        }

        // Filter by voltage
        if (state.filters.voltageFilter.length > 0) {
          filtered = filtered.filter(pin => 
            state.filters.voltageFilter.includes(pin.voltage)
          );
        }

        // Filter by assignment status
        if (state.filters.assignmentStatus !== 'all') {
          filtered = filtered.filter(pin => 
            state.filters.assignmentStatus === 'assigned' ? pin.isAssigned : !pin.isAssigned
          );
        }

        // Filter differential pairs only
        if (state.filters.showOnlyDifferentialPairs) {
          filtered = filtered.filter(pin => pin.differentialPair);
        }

        // Apply sorting
        filtered.sort((a, b) => {
          let valueA: string;
          let valueB: string;

          switch (state.filters.sortField) {
            case 'pinNumber':
              valueA = a.pinNumber;
              valueB = b.pinNumber;
              break;
            case 'pinName':
              valueA = a.pinName;
              valueB = b.pinName;
              break;
            case 'signalName':
              valueA = a.signalName || '';
              valueB = b.signalName || '';
              break;
            case 'pinType':
              valueA = a.pinType;
              valueB = b.pinType;
              break;
            case 'bank':
              valueA = a.bank || '';
              valueB = b.bank || '';
              break;
            default:
              valueA = a.pinNumber;
              valueB = b.pinNumber;
          }

          // Natural sort for alphanumeric values (A1, A2, A10, B1, etc.)
          const result = valueA.localeCompare(valueB, undefined, { 
            numeric: true, 
            sensitivity: 'base' 
          });
          
          return state.filters.sortOrder === 'asc' ? result : -result;
        });

        state.filteredPins = filtered;
      }),

    setSortField: (field) =>
      set((state) => {
        if (process.env.NODE_ENV === 'development') {
          console.log(`🎯 Changing sort field from ${state.filters.sortField} to ${field}`);
        }
        state.filters.sortField = field;
        // Re-apply sorting immediately
        get().applyFilters();
      }),

    setSortOrder: (order) =>
      set((state) => {
        state.filters.sortOrder = order;
        // Re-apply sorting immediately
        get().applyFilters();
      }),

    // Differential pair management
    assignDifferentialPair: (positiveId, negativeId, baseName) =>
      set((state) => {
        const posPin = state.pins.find(p => p.id === positiveId);
        const negPin = state.pins.find(p => p.id === negativeId);
        
        if (posPin && negPin) {
          posPin.signalName = `${baseName}_P`;
          posPin.isAssigned = true;
          posPin.differentialPair = { 
            pair: negativeId, 
            type: 'positive' 
          };
          
          negPin.signalName = `${baseName}_N`;
          negPin.isAssigned = true;
          negPin.differentialPair = { 
            pair: positiveId, 
            type: 'negative' 
          };
        }
      }),

    clearDifferentialPair: (pinId) =>
      set((state) => {
        const pin = state.pins.find(p => p.id === pinId);
        if (pin && pin.differentialPair) {
          const pairPin = state.pins.find(p => p.id === pin.differentialPair!.pair);
          
          // Clear both pins
          pin.differentialPair = undefined;
          pin.signalName = '';
          pin.isAssigned = false;
          
          if (pairPin) {
            pairPin.differentialPair = undefined;
            pairPin.signalName = '';
            pairPin.isAssigned = false;
          }
        }
      }),

    // Coordinate transformations
    rotatePins: (degrees) =>
      set((state) => {
        state.viewConfig.rotation = (state.viewConfig.rotation + degrees) % 360;
      }),

    flipView: () =>
      set((state) => {
        state.viewConfig.isTopView = !state.viewConfig.isTopView;
      }),

    // Utility actions
    setLoading: (loading) =>
      set((state) => {
        state.isLoading = loading;
      }),

    setError: (error) =>
      set((state) => {
        state.error = error;
      }),

    // List view management
    setViewMode: (mode) =>
      set((state) => {
        state.listView.viewMode = mode;
      }),

    setActiveTab: (tabId) =>
      set((state) => {
        state.listView.activeTab = tabId;
      }),

    setSearchQuery: (query) =>
      set((state) => {
        state.listView.searchQuery = query;
      }),

    setCommentFilter: (filter) =>
      set((state) => {
        state.listView.commentFilter = filter;
      }),

    updateListViewState: (updates) =>
      set((state) => {
        Object.assign(state.listView, updates);
      }),

    bulkUpdateComments: (pinIds, comment) =>
      set((state) => {
        const timestamp = new Date();
        pinIds.forEach(pinId => {
          const pin = state.pins.find(p => p.id === pinId);
          if (pin) {
            pin.comment = comment;
            pin.commentTimestamp = timestamp;
            pin.commentAuthor = 'current_user'; // TODO: Get from auth system
          }
        });
        // Clear selection after bulk update
        state.listView.selectedRows.clear();
      }),

    // Pin color mode management
    setPinColorMode: (mode) =>
      set((state) => {
        state.pinColorMode = mode;
      }),

    addRecentFile: (filePath) =>
      set((state) => {
        const filtered = state.recentFiles.filter(f => f !== filePath);
        state.recentFiles = [filePath, ...filtered].slice(0, 10);
      }),

    // Undo/Redo actions
    undo: () => {
      const action = UndoRedoService.undo();
      if (action) {
        get().handleUndoRedoAction(action, 'undo');
        get().updateUndoRedoState();
      }
    },

    redo: () => {
      const action = UndoRedoService.redo();
      if (action) {
        get().handleUndoRedoAction(action, 'redo');
        get().updateUndoRedoState();
      }
    },

    updateUndoRedoState: () =>
      set((state) => {
        state.canUndo = UndoRedoService.canUndo();
        state.canRedo = UndoRedoService.canRedo();
        
        const history = UndoRedoService.getHistory();
        const currentIndex = UndoRedoService.getCurrentIndex();
        
        if (currentIndex >= 0 && currentIndex < history.length) {
          state.currentActionDescription = UndoRedoService.getActionDescription(history[currentIndex]);
        } else {
          state.currentActionDescription = null;
        }
        
        if (currentIndex + 1 < history.length) {
          state.nextRedoActionDescription = UndoRedoService.getActionDescription(history[currentIndex + 1]);
        } else {
          state.nextRedoActionDescription = null;
        }
      }),

    clearHistory: () => {
      UndoRedoService.clear();
      get().updateUndoRedoState();
    },

    // Helper method to handle undo/redo actions
    handleUndoRedoAction: (action: Action, operation: 'undo' | 'redo') => {
      const { type, data } = action;
      
      switch (type) {
        case 'PIN_ASSIGNMENT':
          const { pinId, oldSignal, newSignal } = data;
          const targetSignal = operation === 'undo' ? oldSignal : newSignal;
          set((state) => {
            const pin = state.pins.find(p => p.id === pinId);
            if (pin) {
              pin.signalName = targetSignal || '';
              pin.isAssigned = Boolean(targetSignal);
            }
          });
          get().applyFilters();
          break;

        case 'BULK_ASSIGNMENT':
          const { assignments } = data;
          set((state) => {
            assignments.forEach(({ pinId, oldSignal, newSignal }: any) => {
              const pin = state.pins.find(p => p.id === pinId);
              if (pin) {
                const targetSignal = operation === 'undo' ? oldSignal : newSignal;
                pin.signalName = targetSignal || '';
                pin.isAssigned = Boolean(targetSignal);
              }
            });
          });
          get().applyFilters();
          break;

        case 'SELECTION_CHANGE':
          const { oldSelection, newSelection } = data;
          const targetSelection = operation === 'undo' ? oldSelection : newSelection;
          set((state) => {
            state.selectedPins = new Set(targetSelection);
          });
          break;

        case 'VIEW_CHANGE':
          const { oldView, newView } = data;
          const targetView = operation === 'undo' ? oldView : newView;
          set((state) => {
            Object.assign(state.viewConfig, targetView);
          });
          break;

        default:
          console.warn(`Unhandled undo/redo action type: ${type}`);
          break;
      }
    },
  }))
);
