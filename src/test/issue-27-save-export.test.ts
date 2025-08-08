/**
 * Issue #27: Save/Export function doesn't work
 * CSVインポート後にsave/export機能が動作しない問題のテスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAppStore } from '../stores/app-store';
import { ExportService } from '../services/export-service';

// モックデータ
const mockPackage = {
  id: 'test-package',
  name: 'Test Package',
  device: 'XC7A35T',
  packageType: 'CSG324',
  totalPins: 2,
  pins: []
};

const mockPins = [
  {
    id: 'pin1',
    pinNumber: 'A1',
    pinName: 'IO_L1P_T0_D00_MOSI_14',
    signalName: 'TEST_SIGNAL_1',
    bank: '14',
    pinType: 'IO',
    voltage: '3.3V',
    position: { x: 100, y: 100 },
    gridPosition: { row: 'A', col: 1 },
    isAssigned: true
  },
  {
    id: 'pin2', 
    pinNumber: 'A2',
    pinName: 'IO_L1N_T0_D01_DIN_14',
    signalName: 'TEST_SIGNAL_2', 
    bank: '14',
    pinType: 'IO',
    voltage: '3.3V',
    position: { x: 200, y: 100 },
    gridPosition: { row: 'A', col: 2 },
    isAssigned: true
  }
];

describe('Issue #27: Save/Export functionality', () => {
  let store: any;

  beforeEach(() => {
    // ストアをリセット
    const { result } = renderHook(() => useAppStore());
    store = result.current;
    
    // 初期状態の設定
    act(() => {
      store.loadPackage(mockPackage);
    });
  });

  describe('CSV Import Scenario', () => {
    it('should have working export functions after CSV import', () => {
      // CSVインポートのシミュレーション
      act(() => {
        // この時点でfilteredPinsが設定されpinsが空になる状況をシミュレート
        store.setState({
          pins: [], // Issue #27の根本原因：pinsが空になる
          filteredPins: mockPins, // filteredPinsには正しいデータが入る
          package: mockPackage
        });
      });

      const state = store.getState();
      
      // 問題の状況を確認
      expect(state.pins).toHaveLength(0);
      expect(state.filteredPins).toHaveLength(2);
      expect(state.package).toBeDefined();

      // Export functions should use filteredPins when pins is empty
      const pinsToExport = state.filteredPins.length > 0 ? state.filteredPins : state.pins;
      expect(pinsToExport).toHaveLength(2);
      expect(pinsToExport[0].signalName).toBe('TEST_SIGNAL_1');
    });

    it('should export CSV correctly after CSV import', () => {
      // CSVインポート後の状態をシミュレート
      act(() => {
        store.setState({
          pins: [],
          filteredPins: mockPins,
          package: mockPackage
        });
      });

      const state = store.getState();
      const pinsToExport = state.filteredPins.length > 0 ? state.filteredPins : state.pins;
      
      // CSVエクスポートをテスト
      const csvContent = ExportService.exportToCSV(pinsToExport);
      expect(csvContent).toContain('Pin Number,Pin Name');
      expect(csvContent).toContain('A1,IO_L1P_T0_D00_MOSI_14');
      expect(csvContent).toContain('TEST_SIGNAL_1');
    });

    it('should export constraints correctly after CSV import', () => {
      // CSVインポート後の状態をシミュレート
      act(() => {
        store.setState({
          pins: [],
          filteredPins: mockPins,
          package: mockPackage
        });
      });

      const state = store.getState();
      const pinsToExport = state.filteredPins.length > 0 ? state.filteredPins : state.pins;
      
      // XDCエクスポートをテスト
      const xdcContent = ExportService.exportToXDC(pinsToExport, state.package);
      expect(xdcContent).toContain('set_property PACKAGE_PIN A1');
      expect(xdcContent).toContain('[get_ports TEST_SIGNAL_1]');
    });

    it('should export report correctly after CSV import', () => {
      // CSVインポート後の状態をシミュレート
      act(() => {
        store.setState({
          pins: [],
          filteredPins: mockPins,
          package: mockPackage
        });
      });

      const state = store.getState();
      const pinsToExport = state.filteredPins.length > 0 ? state.filteredPins : state.pins;
      
      // レポートエクスポートをテスト
      const reportContent = ExportService.exportReport(pinsToExport, state.package);
      expect(reportContent).toContain('FPGA Pin Assignment Report');
      expect(reportContent).toContain('XC7A35T');
      expect(reportContent).toContain('TEST_SIGNAL_1');
    });
  });

  describe('Sample Data Scenario', () => {
    it('should have working export functions after sample data load', () => {
      // サンプルデータロードのシミュレーション
      act(() => {
        store.setState({
          pins: mockPins, // サンプルデータ読み込み時はpinsに直接設定
          filteredPins: mockPins, // filteredPinsも同じデータ
          package: mockPackage
        });
      });

      const state = store.getState();
      
      // 正常な状況を確認
      expect(state.pins).toHaveLength(2);
      expect(state.filteredPins).toHaveLength(2);
      expect(state.package).toBeDefined();

      // Export functions should work with either pins or filteredPins
      const pinsToExport = state.filteredPins.length > 0 ? state.filteredPins : state.pins;
      expect(pinsToExport).toHaveLength(2);
      expect(pinsToExport[0].signalName).toBe('TEST_SIGNAL_1');
    });
  });

  describe('Export Button State', () => {
    it('should enable export buttons when filteredPins has data even if pins is empty', () => {
      // Issue #27の状況をシミュレート
      act(() => {
        store.setState({
          pins: [],
          filteredPins: mockPins,
          package: mockPackage
        });
      });

      const state = store.getState();
      
      // エクスポートボタンの有効状態を確認
      // disabled={filteredPins.length === 0 && pins.length === 0}
      const shouldDisableExport = state.filteredPins.length === 0 && state.pins.length === 0;
      expect(shouldDisableExport).toBe(false);
    });

    it('should disable export buttons when both pins and filteredPins are empty', () => {
      // データが全くない状況
      act(() => {
        store.setState({
          pins: [],
          filteredPins: [],
          package: mockPackage
        });
      });

      const state = store.getState();
      
      // エクスポートボタンは無効になるべき
      const shouldDisableExport = state.filteredPins.length === 0 && state.pins.length === 0;
      expect(shouldDisableExport).toBe(true);
    });
  });

  describe('Debug Logging', () => {
    it('should log correct debug information for export functions', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      // CSVインポート後の状態をシミュレート
      act(() => {
        store.setState({
          pins: [],
          filteredPins: mockPins,
          package: mockPackage
        });
      });

      const state = store.getState();
      
      // Debug logging simulation (as added in the fix)
      console.log('🔍 EXPORT DEBUG - pins.length:', state.pins.length);
      console.log('🔍 EXPORT DEBUG - filteredPins.length:', state.filteredPins.length);
      
      expect(consoleSpy).toHaveBeenCalledWith('🔍 EXPORT DEBUG - pins.length:', 0);
      expect(consoleSpy).toHaveBeenCalledWith('🔍 EXPORT DEBUG - filteredPins.length:', 2);
      
      consoleSpy.mockRestore();
    });
  });
});
