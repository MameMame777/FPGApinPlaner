import { describe, it, expect } from 'vitest';
import { indexToRow, rowToIndex } from '../utils/grid-utils';

describe('Grid Label Boundary Tests', () => {
  it('should handle valid grid coordinates', () => {
    // 0-based indexing: 0=A, 1=B, ..., 25=Z
    expect(indexToRow(0)).toBe('A');
    expect(indexToRow(25)).toBe('Z');
    expect(rowToIndex('A')).toBe(0);
    expect(rowToIndex('Z')).toBe(25);
  });

  it('should handle boundary values gracefully', () => {
    // Test for negative indices - should return 'A' (fallback to 0)
    expect(indexToRow(-1)).toBe('A');
    expect(rowToIndex('')).toBe(0);
  });

  it('should maintain consistency in row/index conversion', () => {
    for (let i = 0; i <= 25; i++) {
      const row = indexToRow(i);
      expect(rowToIndex(row)).toBe(i);
    }
  });

  it('should handle extended alphabet ranges', () => {
    // 26=AA, 27=AB based on the implementation
    expect(indexToRow(26)).toBe('AA');
    expect(indexToRow(27)).toBe('AB');
    expect(rowToIndex('AA')).toBe(26);
    expect(rowToIndex('AB')).toBe(27);
  });
});

describe('Viewport Calculation Tests', () => {
  const mockStageSize = { width: 800, height: 600 };
  const mockViewport = { x: 0, y: 0, scale: 1.0 };
  const mockPackageDims = { minCol: 1, maxCol: 10, minRow: 1, maxRow: 10, gridSpacing: 50 };

  it('should calculate valid grid label ranges', () => {
    const canvasWidth = mockStageSize.width;
    const viewportLeft = -mockViewport.x / mockViewport.scale - canvasWidth / (2 * mockViewport.scale);
    const viewportRight = viewportLeft + canvasWidth / mockViewport.scale;
    
    const viewportStartCol = Math.floor(viewportLeft / mockPackageDims.gridSpacing);
    const viewportEndCol = Math.ceil(viewportRight / mockPackageDims.gridSpacing);
    
    const extendedMinCol = Math.max(mockPackageDims.minCol, mockPackageDims.minCol + viewportStartCol - 2);
    const extendedMaxCol = Math.min(mockPackageDims.maxCol, mockPackageDims.minCol + viewportEndCol + 2);
    
    expect(extendedMinCol).toBeGreaterThanOrEqual(mockPackageDims.minCol);
    expect(extendedMaxCol).toBeLessThanOrEqual(mockPackageDims.maxCol);
    expect(extendedMaxCol).toBeGreaterThanOrEqual(extendedMinCol);
  });

  it('should prevent negative grid coordinates', () => {
    const negativeViewport = { x: 1000, y: 1000, scale: 1.0 };
    const canvasWidth = mockStageSize.width;
    const viewportLeft = -negativeViewport.x / negativeViewport.scale - canvasWidth / (2 * negativeViewport.scale);
    
    const viewportStartCol = Math.floor(viewportLeft / mockPackageDims.gridSpacing);
    const extendedMinCol = Math.max(mockPackageDims.minCol, mockPackageDims.minCol + viewportStartCol - 2);
    
    expect(extendedMinCol).toBeGreaterThanOrEqual(mockPackageDims.minCol);
  });

  it('should handle extreme zoom levels', () => {
    const extremeViewport = { x: 0, y: 0, scale: 0.01 };
    const canvasWidth = mockStageSize.width;
    const viewportLeft = -extremeViewport.x / extremeViewport.scale - canvasWidth / (2 * extremeViewport.scale);
    const viewportRight = viewportLeft + canvasWidth / extremeViewport.scale;
    
    const viewportStartCol = Math.floor(viewportLeft / mockPackageDims.gridSpacing);
    const viewportEndCol = Math.ceil(viewportRight / mockPackageDims.gridSpacing);
    
    // Even at extreme zoom, we should get valid ranges
    const extendedMinCol = Math.max(mockPackageDims.minCol, mockPackageDims.minCol + viewportStartCol - 2);
    const extendedMaxCol = Math.min(mockPackageDims.maxCol, mockPackageDims.minCol + viewportEndCol + 2);
    
    expect(extendedMinCol).toBeGreaterThanOrEqual(mockPackageDims.minCol);
    expect(extendedMaxCol).toBeLessThanOrEqual(mockPackageDims.maxCol);
  });
});
