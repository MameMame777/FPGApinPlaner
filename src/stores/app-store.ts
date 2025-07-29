import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Pin, Package, ViewConfig, FilterState, FPGAProject } from '@/types';

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
  
  // Filter state
  filters: FilterState;
  
  // UI state
  isLoading: boolean;
  error: string | null;
  
  // Recent files
  recentFiles: string[];
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
  updateViewConfig: (config: Partial<ViewConfig>) => void;
  
  // Filter management
  updateFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  applyFilters: () => void;
  
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
}

const initialViewConfig: ViewConfig = {
  rotation: 0,
  isTopView: true,
  zoom: 1.0,
  showPinNumbers: true,
  showSignalNames: true,
  showPinTypes: false,
};

const initialFilters: FilterState = {
  pinTypes: [],
  banks: [],
  searchText: '',
  voltageFilter: [],
  assignmentStatus: 'all',
  showOnlyDifferentialPairs: false,
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
    filters: initialFilters,
    isLoading: false,
    error: null,
    recentFiles: [],

    // Project management
    loadProject: (project) =>
      set((state) => {
        state.currentProject = project;
        state.package = project.packageData;
        state.pins = project.pinAssignments;
        state.viewConfig = project.viewConfig;
        state.filters = project.filters;
        state.filteredPins = project.pinAssignments;
      }),

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
        state.package = packageData;
        state.pins = packageData.pins;
        state.filteredPins = packageData.pins;
        state.selectedPins.clear();
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

    assignSignal: (pinId, signalName) =>
      set((state) => {
        const pin = state.pins.find(p => p.id === pinId);
        if (pin) {
          pin.signalName = signalName;
          pin.isAssigned = signalName !== '';
        }
      }),

    clearSignal: (pinId) =>
      set((state) => {
        const pin = state.pins.find(p => p.id === pinId);
        if (pin) {
          pin.signalName = '';
          pin.isAssigned = false;
        }
      }),

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

    updateViewConfig: (config) =>
      set((state) => {
        Object.assign(state.viewConfig, config);
      }),

    // Filter management
    updateFilters: (filters) =>
      set((state) => {
        Object.assign(state.filters, filters);
        // Apply filters immediately
        get().applyFilters();
      }),

    clearFilters: () =>
      set((state) => {
        state.filters = { ...initialFilters };
        state.filteredPins = state.pins;
      }),

    applyFilters: () =>
      set((state) => {
        let filtered = state.pins;

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

        state.filteredPins = filtered;
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

    addRecentFile: (filePath) =>
      set((state) => {
        const filtered = state.recentFiles.filter(f => f !== filePath);
        state.recentFiles = [filePath, ...filtered].slice(0, 10);
      }),
  }))
);
