import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../stores/app-store';
import { Pin, Package } from '../types';

describe('Multi-Pin Selection and Bulk Editing', () => {
  let store: ReturnType<typeof useAppStore>;

  const mockPins: Pin[] = [
    {
      id: 'pin1',
      pinNumber: 'A1',
      pinName: 'IO_L1P_T0_D00_MOSI_14',
      signalName: '',
      direction: 'InOut',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'A1',
      position: { x: 0, y: 0 },
      gridPosition: { row: 'A', col: 1 },
      isAssigned: false,
      bank: '14'
    },
    {
      id: 'pin2',
      pinNumber: 'A2',
      pinName: 'IO_L1N_T0_D01_DIN_14',
      signalName: '',
      direction: 'InOut',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'A2',
      position: { x: 0, y: 1 },
      gridPosition: { row: 'A', col: 2 },
      isAssigned: false,
      bank: '14'
    },
    {
      id: 'pin3',
      pinNumber: 'B1',
      pinName: 'IO_L2P_T0_D02_14',
      signalName: '',
      direction: 'Input',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'B1',
      position: { x: 1, y: 0 },
      gridPosition: { row: 'B', col: 1 },
      isAssigned: false,
      bank: '14'
    }
  ];

  const mockPackage: Package = {
    id: 'test-package',
    name: 'Test Package',
    device: 'XC7A35T',
    packageType: 'CSG324',
    dimensions: { rows: 2, cols: 2 },
    pins: mockPins,
    totalPins: 3
  };

  beforeEach(() => {
    // Reset store state
    store = useAppStore.getState();
    store.loadPackage(mockPackage);
    store.updateListViewState({ 
      selectedRows: new Set(),
      lastSelectedPinId: null 
    });
  });

  describe('Selection Management', () => {
    it('should select individual pins', () => {
      const { listView, updateListViewState } = store;
      
      // Select first pin
      const newSelection = new Set(listView.selectedRows);
      newSelection.add('pin1');
      updateListViewState({ 
        selectedRows: newSelection,
        lastSelectedPinId: 'pin1'
      });

      const updatedState = useAppStore.getState();
      expect(updatedState.listView.selectedRows.has('pin1')).toBe(true);
      expect(updatedState.listView.selectedRows.size).toBe(1);
      expect(updatedState.listView.lastSelectedPinId).toBe('pin1');
    });

    it('should support multiple pin selection', () => {
      const { listView, updateListViewState } = store;
      
      // Select multiple pins
      const newSelection = new Set(['pin1', 'pin2', 'pin3']);
      updateListViewState({ 
        selectedRows: newSelection,
        lastSelectedPinId: 'pin3'
      });

      const updatedState = useAppStore.getState();
      expect(updatedState.listView.selectedRows.size).toBe(3);
      expect(updatedState.listView.selectedRows.has('pin1')).toBe(true);
      expect(updatedState.listView.selectedRows.has('pin2')).toBe(true);
      expect(updatedState.listView.selectedRows.has('pin3')).toBe(true);
      expect(updatedState.listView.lastSelectedPinId).toBe('pin3');
    });

    it('should clear selection', () => {
      const { updateListViewState } = store;
      
      // First select some pins
      updateListViewState({ 
        selectedRows: new Set(['pin1', 'pin2']),
        lastSelectedPinId: 'pin2'
      });

      // Then clear selection
      updateListViewState({ 
        selectedRows: new Set(),
        lastSelectedPinId: null
      });

      const updatedState = useAppStore.getState();
      expect(updatedState.listView.selectedRows.size).toBe(0);
      expect(updatedState.listView.lastSelectedPinId).toBe(null);
    });
  });

  describe('Range Selection', () => {
    it('should support range selection using selectPinRange', () => {
      const { selectPinRange, filteredPins } = store;
      
      // Select range from pin1 to pin3 (indices 0 to 2)
      selectPinRange('pin1', 'pin3', filteredPins);

      const updatedState = useAppStore.getState();
      expect(updatedState.selectedPins.size).toBe(3);
      expect(updatedState.selectedPins.has('pin1')).toBe(true);
      expect(updatedState.selectedPins.has('pin2')).toBe(true);
      expect(updatedState.selectedPins.has('pin3')).toBe(true);
    });

    it('should handle reverse range selection', () => {
      const { selectPinRange, filteredPins } = store;
      
      // Select range from pin3 to pin1 (should work in reverse)
      selectPinRange('pin3', 'pin1', filteredPins);

      const updatedState = useAppStore.getState();
      expect(updatedState.selectedPins.size).toBe(3);
      expect(updatedState.selectedPins.has('pin1')).toBe(true);
      expect(updatedState.selectedPins.has('pin2')).toBe(true);
      expect(updatedState.selectedPins.has('pin3')).toBe(true);
    });
  });

  describe('Bulk Signal Operations', () => {
    it('should apply signal to multiple selected pins', () => {
      const { updatePin, updateListViewState } = store;
      
      // Select pins for bulk operation
      updateListViewState({ 
        selectedRows: new Set(['pin1', 'pin2'])
      });

      // Apply signal to selected pins
      const selectedPins = ['pin1', 'pin2'];
      const signalName = 'TEST_SIGNAL';
      
      selectedPins.forEach(pinId => {
        updatePin(pinId, { 
          signalName: signalName,
          isAssigned: true
        });
      });

      const updatedState = useAppStore.getState();
      const pin1 = updatedState.pins.find(p => p.id === 'pin1');
      const pin2 = updatedState.pins.find(p => p.id === 'pin2');
      const pin3 = updatedState.pins.find(p => p.id === 'pin3');

      expect(pin1?.signalName).toBe('TEST_SIGNAL');
      expect(pin1?.isAssigned).toBe(true);
      expect(pin2?.signalName).toBe('TEST_SIGNAL');
      expect(pin2?.isAssigned).toBe(true);
      expect(pin3?.signalName).toBe(''); // Should remain unchanged
      expect(pin3?.isAssigned).toBe(false);
    });

    it('should clear signals from multiple selected pins', () => {
      const { updatePin, updateListViewState } = store;
      
      // First set signals on pins
      updatePin('pin1', { signalName: 'SIGNAL_1', isAssigned: true });
      updatePin('pin2', { signalName: 'SIGNAL_2', isAssigned: true });
      updatePin('pin3', { signalName: 'SIGNAL_3', isAssigned: true });

      // Select pins for bulk clear
      updateListViewState({ 
        selectedRows: new Set(['pin1', 'pin3'])
      });

      // Clear signals from selected pins
      const selectedPins = ['pin1', 'pin3'];
      selectedPins.forEach(pinId => {
        updatePin(pinId, { 
          signalName: '',
          isAssigned: false
        });
      });

      const updatedState = useAppStore.getState();
      const pin1 = updatedState.pins.find(p => p.id === 'pin1');
      const pin2 = updatedState.pins.find(p => p.id === 'pin2');
      const pin3 = updatedState.pins.find(p => p.id === 'pin3');

      expect(pin1?.signalName).toBe('');
      expect(pin1?.isAssigned).toBe(false);
      expect(pin2?.signalName).toBe('SIGNAL_2'); // Should remain unchanged
      expect(pin2?.isAssigned).toBe(true);
      expect(pin3?.signalName).toBe('');
      expect(pin3?.isAssigned).toBe(false);
    });
  });

  describe('State Management Integration', () => {
    it('should maintain selection state consistency', () => {
      const { updateListViewState } = store;
      
      // Test that Set operations work correctly
      const selection1 = new Set(['pin1']);
      updateListViewState({ selectedRows: selection1 });
      
      let state = useAppStore.getState();
      expect(state.listView.selectedRows.size).toBe(1);
      expect(state.listView.selectedRows.has('pin1')).toBe(true);

      // Add to selection
      const selection2 = new Set(state.listView.selectedRows);
      selection2.add('pin2');
      updateListViewState({ selectedRows: selection2 });
      
      state = useAppStore.getState();
      expect(state.listView.selectedRows.size).toBe(2);
      expect(state.listView.selectedRows.has('pin1')).toBe(true);
      expect(state.listView.selectedRows.has('pin2')).toBe(true);

      // Remove from selection
      const selection3 = new Set(state.listView.selectedRows);
      selection3.delete('pin1');
      updateListViewState({ selectedRows: selection3 });
      
      state = useAppStore.getState();
      expect(state.listView.selectedRows.size).toBe(1);
      expect(state.listView.selectedRows.has('pin1')).toBe(false);
      expect(state.listView.selectedRows.has('pin2')).toBe(true);
    });

    it('should handle lastSelectedPinId correctly', () => {
      const { updateListViewState } = store;
      
      // Set last selected pin
      updateListViewState({ 
        selectedRows: new Set(['pin1']),
        lastSelectedPinId: 'pin1'
      });
      
      let state = useAppStore.getState();
      expect(state.listView.lastSelectedPinId).toBe('pin1');

      // Change last selected pin
      updateListViewState({ 
        selectedRows: new Set(['pin1', 'pin2']),
        lastSelectedPinId: 'pin2'
      });
      
      state = useAppStore.getState();
      expect(state.listView.lastSelectedPinId).toBe('pin2');

      // Clear selection should clear lastSelectedPinId
      updateListViewState({ 
        selectedRows: new Set(),
        lastSelectedPinId: null
      });
      
      state = useAppStore.getState();
      expect(state.listView.lastSelectedPinId).toBe(null);
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle large selections efficiently', () => {
      const { updateListViewState } = store;
      
      // Create large selection set
      const largeSelection = new Set<string>();
      for (let i = 0; i < 1000; i++) {
        largeSelection.add(`pin_${i}`);
      }

      const startTime = performance.now();
      updateListViewState({ selectedRows: largeSelection });
      const endTime = performance.now();

      const state = useAppStore.getState();
      expect(state.listView.selectedRows.size).toBe(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should support fast O(1) selection lookup', () => {
      const { updateListViewState } = store;
      
      const selection = new Set(['pin1', 'pin2', 'pin3']);
      updateListViewState({ selectedRows: selection });
      
      const state = useAppStore.getState();
      
      // O(1) lookup operations
      const startTime = performance.now();
      const hasPin1 = state.listView.selectedRows.has('pin1');
      const hasPin2 = state.listView.selectedRows.has('pin2');
      const hasPin999 = state.listView.selectedRows.has('pin999');
      const endTime = performance.now();
      
      expect(hasPin1).toBe(true);
      expect(hasPin2).toBe(true);
      expect(hasPin999).toBe(false);
      expect(endTime - startTime).toBeLessThan(10); // Should be very fast
    });
  });
});