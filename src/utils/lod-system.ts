/**
 * Level of Detail (LOD) system for performance optimization
 */
export class LODSystem {
  static getLODLevel(scale: number): 'ultra-low' | 'low' | 'medium' | 'high' | 'ultra-high' {
    if (scale < 0.2) return 'ultra-low';
    if (scale < 0.5) return 'low';
    if (scale < 1.0) return 'medium';
    if (scale < 2.0) return 'high';
    return 'ultra-high';
  }

  static shouldRenderDetails(scale: number): boolean {
    return scale > 0.4;
  }

  static shouldRenderPinNames(scale: number): boolean {
    return scale > 0.6;
  }

  static shouldRenderSignalNames(scale: number): boolean {
    return scale > 0.8;
  }

  static shouldRenderDifferentialLines(scale: number): boolean {
    return scale > 0.3;
  }

  static shouldRenderBankBoundaries(scale: number): boolean {
    return scale > 0.2;
  }

  static getGridLineOpacity(scale: number): number {
    if (scale < 0.3) return 0;
    if (scale < 0.6) return 0.1;
    if (scale < 1.0) return 0.3;
    return 0.5;
  }

  static getFontSizeMultiplier(scale: number): number {
    if (scale < 0.3) return 0.5;
    if (scale < 0.6) return 0.7;
    if (scale < 1.0) return 0.8;
    return 1.0;
  }

  static getMaxVisiblePins(scale: number): number {
    if (scale < 0.2) return 100;
    if (scale < 0.5) return 500;
    if (scale < 1.0) return 1000;
    return Infinity; // No limit at high zoom
  }
}
