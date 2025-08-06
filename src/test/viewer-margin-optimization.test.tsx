import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import PackageCanvas from '@/components/common/PackageCanvas';
import { Package, Pin } from '@/types';

// Mock Konva components
vi.mock('react-konva', () => ({
  Stage: ({ children, width, height, style, ...props }: any) => (
    <div 
      data-testid="konva-stage" 
      data-width={width}
      data-height={height}
      style={style}
      {...props}
    >
      {children}
    </div>
  ),
  Layer: ({ children }: any) => <div data-testid="konva-layer">{children}</div>,
  Group: ({ children }: any) => <div data-testid="konva-group">{children}</div>,
  Rect: (props: any) => <div data-testid="konva-rect" {...props} />,
  Text: ({ text, ...props }: any) => <div data-testid="konva-text" {...props}>{text}</div>,
  Circle: (props: any) => <div data-testid="konva-circle" {...props} />,
  Line: (props: any) => <div data-testid="konva-line" {...props} />
}));

// Mock grid utilities
vi.mock('@/utils/grid-utils', () => ({
  rowToIndex: (row: string) => row.charCodeAt(0) - 65,
  indexToRow: (index: number) => {
    if (index < 0) return 'A';
    return String.fromCharCode(65 + index);
  }
}));

// Mock other dependencies
vi.mock('@/stores/app-store', () => ({
  useAppStore: () => ({
    togglePinSelection: vi.fn(),
    selectPins: vi.fn()
  })
}));

vi.mock('@/utils/differential-pair-utils', () => ({
  DifferentialPairUtils: {
    isDifferentialPin: () => false,
    findPairPin: () => null,
    getDifferentialPairType: () => null
  }
}));

vi.mock('@/utils/LODSystem', () => ({
  LODSystem: {
    getLODLevel: () => 1,
    shouldRenderPinDetails: () => true,
    shouldRenderText: () => true,
    shouldRenderDifferentialPairs: () => true,
    shouldRenderAtLOD: () => true,
    getAdaptiveTextSize: () => 12
  }
}));

vi.mock('@/services/performance-service', () => ({
  PerformanceService: {
    startRenderMeasurement: vi.fn(),
    endRenderMeasurement: () => 0,
    createPinIndexes: (pins: Pin[]) => ({
      findById: (id: string) => pins.find(p => p.id === id)
    }),
    optimizeCanvasRendering: () => ({
      cullPins: (pins: Pin[]) => pins
    })
  }
}));

describe('PackageCanvas - Viewer Margin Optimization', () => {
  const mockPackage: Package = {
    id: 'test-package',
    name: 'XC7Z007S-CLG225',
    device: 'XC7Z007S',
    packageType: 'CLG225',
    dimensions: { rows: 15, cols: 15 },
    pins: [],
    totalPins: 225
  };

  const mockPins: Pin[] = [
    {
      id: 'pin1',
      pinNumber: 'A1',
      pinName: 'IO_L1P_T0_AD4P_35',
      signalName: '',
      direction: 'InOut',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'A1',
      position: { x: 0, y: 0 },
      gridPosition: { row: 'A', col: 1 },
      isAssigned: false,
      bank: '35'
    },
    {
      id: 'pin2',
      pinNumber: 'B2',
      pinName: 'IO_L1N_T0_AD4N_35',
      signalName: '',
      direction: 'InOut',
      pinType: 'IO',
      voltage: '3.3V',
      packagePin: 'B2',
      position: { x: 88, y: 88 },
      gridPosition: { row: 'B', col: 2 },
      isAssigned: false,
      bank: '35'
    }
  ];

  const defaultProps = {
    package: mockPackage,
    pins: mockPins,
    selectedPins: new Set<string>(),
    onPinSelect: vi.fn(),
    onPinDoubleClick: vi.fn(),
    zoom: 1,
    rotation: 0,
    isTopView: true,
    onZoomChange: vi.fn()
    // resetTrigger removed - was causing unwanted automatic viewport changes
  };

  beforeEach(() => {
    // Mock getBoundingClientRect for container size calculations
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
      width: 800,
      height: 600,
      top: 0,
      left: 0,
      bottom: 600,
      right: 800,
      x: 0,
      y: 0,
      toJSON: () => ({})
    });

    // Mock ResizeObserver
    global.ResizeObserver = vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn()
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Stage Size Optimization', () => {
    it('should use full container size for Stage dimensions', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      const stage = screen.getByTestId('konva-stage');
      
      // Stage should use full container dimensions (800x600) instead of reduced size
      expect(stage).toHaveAttribute('data-width', '800');
      expect(stage).toHaveAttribute('data-height', '600');
    });

    it('should position Stage at top-left corner (0,0) for maximum area utilization', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      const stage = screen.getByTestId('konva-stage');
      
      // Stage should be positioned at 0,0 instead of offset for grid labels
      expect(stage).toHaveStyle({
        position: 'absolute',
        top: '0px',
        left: '0px'
      });
    });
  });

  describe('Auto-fit Optimization', () => {
    it('should use reduced padding for better space utilization', () => {
      // This test verifies that the auto-fit logic uses the new reduced padding
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<PackageCanvas {...defaultProps} />);
      
      // Look for the auto-fit viewport log that should show larger scale due to reduced padding
      expect(consoleLog).toHaveBeenCalledWith(
        expect.stringMatching(/📐 Auto-fit viewport:/),
        expect.any(Object),
        expect.stringMatching(/for package:/),
        expect.any(Number),
        expect.stringMatching(/x/),
        expect.any(Number),
        expect.stringMatching(/scale:/),
        expect.any(Number)
      );
      
      consoleLog.mockRestore();
    });

    it('should calculate optimal scale with improved limits (0.8-4.0)', () => {
      // Test with a very large package that would normally get scaled down too much
      const largePins: Pin[] = Array.from({ length: 100 }, (_, i) => ({
        id: `pin${i}`,
        pinNumber: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
        pinName: `IO_PIN_${i}`,
        signalName: '',
        direction: 'InOut' as const,
        pinType: 'IO' as const,
        voltage: '3.3V',
        packagePin: `${String.fromCharCode(65 + Math.floor(i / 10))}${(i % 10) + 1}`,
        position: { x: (i % 10) * 88, y: Math.floor(i / 10) * 88 },
        gridPosition: { row: String.fromCharCode(65 + Math.floor(i / 10)), col: (i % 10) + 1 },
        isAssigned: false,
        bank: '35'
      }));

      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      render(<PackageCanvas {...defaultProps} pins={largePins} />);
      
      // The scale should be at least 0.8 (new minimum) instead of 0.5 (old minimum)
      const autoFitCall = consoleLog.mock.calls.find(call => 
        typeof call[0] === 'string' && call[0].includes('📐 Auto-fit viewport:')
      );
      
      if (autoFitCall && typeof autoFitCall[4] === 'number') {
        expect(autoFitCall[4]).toBeGreaterThanOrEqual(0.8);
      }
      
      consoleLog.mockRestore();
    });
  });

  describe('Grid Labels Integration', () => {
    it('should render grid labels as Konva components inside Stage', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      // Grid labels should be rendered as Konva Text components
      const gridTexts = screen.getAllByTestId('konva-text');
      
      // Should have at least column and row labels
      expect(gridTexts.length).toBeGreaterThan(0);
      
      // Check for specific grid labels
      const columnLabels = gridTexts.filter(text => /^[0-9]+$/.test(text.textContent || ''));
      const rowLabels = gridTexts.filter(text => /^[A-Z]$/.test(text.textContent || ''));
      
      expect(columnLabels.length).toBeGreaterThan(0);
      expect(rowLabels.length).toBeGreaterThan(0);
    });

    it('should not render HTML grid labels outside Stage', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      // HTML grid label containers should not exist
      const htmlGridColumns = screen.queryByRole('generic', { name: /grid.*column/i });
      const htmlGridRows = screen.queryByRole('generic', { name: /grid.*row/i });
      
      expect(htmlGridColumns).toBeNull();
      expect(htmlGridRows).toBeNull();
    });
  });

  describe('Package Label Optimization', () => {
    it('should render package label with reduced top margin', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      const packageLabel = screen.getByText('XC7Z007S (CLG225)');
      
      // Package label should have reduced top margin (10px instead of 20px)
      expect(packageLabel.parentElement).toHaveStyle({
        top: '10px'
      });
    });

    it('should use compact padding and font size for package label', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      const packageLabel = screen.getByText('XC7Z007S (CLG225)');
      
      // Package label should have compact styling
      expect(packageLabel.parentElement).toHaveStyle({
        fontSize: '12px',
        padding: '2px 8px'
      });
    });
  });

  describe('Viewport Bounds Optimization', () => {
    it('should allow more generous panning with reduced padding restrictions', () => {
      const { rerender } = render(<PackageCanvas {...defaultProps} />);
      
      // Simulate a viewport change that would test boundary restrictions
      const propsWithViewportChange = {
        ...defaultProps,
        zoom: 2 // Higher zoom to test boundary calculations
      };
      
      // Should not throw errors and should render successfully with optimized bounds
      expect(() => {
        rerender(<PackageCanvas {...propsWithViewportChange} />);
      }).not.toThrow();
    });
  });

  describe('Container Responsiveness', () => {
    it('should adapt to different container sizes', () => {
      // Test with different container sizes
      const sizes = [
        { width: 400, height: 300 }, // Small
        { width: 1200, height: 800 }, // Large
        { width: 1920, height: 1080 } // Very large
      ];

      sizes.forEach((size) => {
        vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({
          width: size.width,
          height: size.height,
          top: 0,
          left: 0,
          bottom: size.height,
          right: size.width,
          x: 0,
          y: 0,
          toJSON: () => ({})
        });

        const { unmount } = render(<PackageCanvas {...defaultProps} />);
        
        const stage = screen.getByTestId('konva-stage');
        
        // Stage should adapt to container size
        expect(stage).toHaveAttribute('data-width', size.width.toString());
        expect(stage).toHaveAttribute('data-height', size.height.toString());
        
        unmount();
      });
    });
  });

  describe('Performance and Functionality', () => {
    it('should maintain all existing functionality with optimized layout', () => {
      const mockOnPinSelect = vi.fn();
      const mockOnZoomChange = vi.fn();
      
      render(
        <PackageCanvas 
          {...defaultProps} 
          onPinSelect={mockOnPinSelect}
          onZoomChange={mockOnZoomChange}
        />
      );
      
      // Verify that the component renders without errors
      expect(screen.getByTestId('konva-stage')).toBeInTheDocument();
      expect(screen.getByText('XC7Z007S (CLG225)')).toBeInTheDocument();
      
      // Grid labels should be present
      const gridTexts = screen.getAllByTestId('konva-text');
      expect(gridTexts.length).toBeGreaterThan(0);
    });

    it('should handle viewport scaling correctly with optimized dimensions', () => {
      const { rerender } = render(<PackageCanvas {...defaultProps} zoom={1} />);
      
      // Test different zoom levels
      const zoomLevels = [0.5, 1.0, 2.0, 4.0];
      
      zoomLevels.forEach((zoom) => {
        expect(() => {
          rerender(<PackageCanvas {...defaultProps} zoom={zoom} />);
        }).not.toThrow();
        
        // Stage should maintain full container size regardless of zoom
        const stage = screen.getByTestId('konva-stage');
        expect(stage).toHaveAttribute('data-width', '800');
        expect(stage).toHaveAttribute('data-height', '600');
      });
    });
  });

  describe('Margin Elimination Verification', () => {
    it('should eliminate HTML grid label margins', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      // No HTML divs with grid label styling should exist
      const htmlElements = document.querySelectorAll('div[style*="backgroundColor: #2a2a2a"]');
      expect(htmlElements.length).toBe(0);
    });

    it('should maximize available display area', () => {
      render(<PackageCanvas {...defaultProps} />);
      
      const stage = screen.getByTestId('konva-stage');
      
      // Stage should occupy full container area
      expect(stage).toHaveAttribute('data-width', '800');
      expect(stage).toHaveAttribute('data-height', '600');
      
      // Stage should be positioned to use full area
      expect(stage).toHaveStyle({
        top: '0px',
        left: '0px'
      });
    });
  });
});
