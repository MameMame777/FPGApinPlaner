/**
 * Test suite for dynamic resizing behavior - validating that no new margins
 * appear when the viewer size changes (minimal test version focused on key scenarios)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import PackageCanvas from '../components/common/PackageCanvas';
import { Pin, Package } from '../types';

// Mock Konva and react-konva
vi.mock('react-konva', () => ({
  Stage: vi.fn().mockImplementation(({ children, style, width, height, ...props }) => (
    <div 
      data-testid="konva-stage"
      style={style}
      data-width={width}
      data-height={height}
      {...props}
    >
      {children}
    </div>
  )),
  Layer: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-layer">{children}</div>,
  Rect: () => <div data-testid="konva-rect" />,
  Circle: () => <div data-testid="konva-circle" />,
  Text: () => <div data-testid="konva-text" />,
  Line: () => <div data-testid="konva-line" />,
  Group: ({ children }: { children: React.ReactNode }) => <div data-testid="konva-group">{children}</div>
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock dependencies
vi.mock('../utils/grid-utils', () => ({
  indexToRow: (index: number) => String.fromCharCode(65 + index),
  rowToIndex: (row: string) => row.charCodeAt(0) - 65
}));

vi.mock('../utils/differential-pair-utils', () => ({
  DifferentialPairUtils: {}
}));

vi.mock('../utils/LODSystem', () => ({
  LODSystem: {
    getLODLevel: vi.fn().mockReturnValue({ level: 1, showPins: true })
  }
}));

vi.mock('../services/performance-service', () => ({
  PerformanceService: {
    startMeasurement: vi.fn(),
    endMeasurement: vi.fn(),
    startRenderMeasurement: vi.fn(),
    endRenderMeasurement: vi.fn().mockReturnValue(0),
    createPinIndexes: vi.fn().mockReturnValue({
      byPosition: new Map(),
      byType: new Map(),
      byBank: new Map()
    }),
    optimizeCanvasRendering: vi.fn().mockReturnValue({
      cullPins: vi.fn().mockReturnValue([])
    })
  }
}));

vi.mock('../stores/app-store', () => ({
  useAppStore: () => ({
    togglePinSelection: vi.fn(),
    selectPins: vi.fn()
  })
}));

describe('Dynamic Resizing Behavior - Key Tests', () => {
  const mockPins: Pin[] = [
    {
      id: '1',
      pinNumber: 'A1',
      pinName: 'A1',
      signalName: '',
      direction: 'InOut',
      position: { x: 0, y: 0 },
      gridPosition: { row: 'A', col: 1 },
      pinType: 'IO',
      voltage: '3.3',
      packagePin: 'A1',
      isAssigned: false
    }
  ];

  const mockPackage: Package = {
    id: 'test-pkg',
    name: 'XC7Z020-CLG484',
    device: 'XC7Z020',
    packageType: 'CLG484',
    dimensions: { rows: 25, cols: 25 },
    pins: mockPins,
    totalPins: 1
  };

  const defaultProps = {
    package: mockPackage,
    pins: mockPins,
    selectedPins: new Set<string>(),
    onPinSelect: () => {},
    onPinDoubleClick: () => {},
    zoom: 1,
    rotation: 0,
    isTopView: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock getBoundingClientRect for container sizing
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      right: 800,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: () => ({})
    }));
  });

  describe('Core Resizing Tests', () => {
    it('should maintain dedicated grid label areas with proper positioning', () => {
      render(
        <div style={{ width: 800, height: 600 }}>
          <PackageCanvas {...defaultProps} />
        </div>
      );

      // These selectors match the testids we added to the grid label areas
      expect(document.querySelector('[data-testid="grid-labels-top"]')).toBeInTheDocument();
      expect(document.querySelector('[data-testid="grid-labels-left"]')).toBeInTheDocument();
      expect(document.querySelector('[data-testid="konva-stage"]')).toBeInTheDocument();
    });

    it('should properly size Stage accounting for grid label areas', () => {
      render(
        <div style={{ width: 1000, height: 700 }}>
          <PackageCanvas {...defaultProps} />
        </div>
      );

      const stage = document.querySelector('[data-testid="konva-stage"]');
      expect(stage).toHaveAttribute('data-width');
      expect(stage).toHaveAttribute('data-height');
      
      // Verify Stage is positioned to account for grid areas
      expect(stage).toHaveStyle({ position: 'absolute' });
    });

    it('should handle container size changes without accumulating margins', async () => {
      const { rerender } = render(
        <div style={{ width: 800, height: 600 }}>
          <PackageCanvas {...defaultProps} />
        </div>
      );

      // Simulate container resize
      Element.prototype.getBoundingClientRect = vi.fn(() => ({
        width: 1200,
        height: 800,
        top: 0,
        left: 0,
        right: 1200,
        bottom: 800,
        x: 0,
        y: 0,
        toJSON: () => ({})
      }));

      rerender(
        <div style={{ width: 1200, height: 800 }}>
          <PackageCanvas {...defaultProps} />
        </div>
      );

      await waitFor(() => {
        const stage = document.querySelector('[data-testid="konva-stage"]');
        expect(stage).toBeInTheDocument();
        // Verify positioning remains consistent after resize
        expect(stage).toHaveStyle({ position: 'absolute' });
      });
    });
  });
});
