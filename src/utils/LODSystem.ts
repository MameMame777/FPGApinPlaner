/**
 * Level of Detail (LOD) System for Performance Optimization
 * 
 * This system provides adaptive rendering based on zoom levels to maintain
 * smooth performance with large datasets while preserving visual quality
 * when users need detailed information.
 */

export interface LODLevel {
  level: number;
  threshold: number;
  description: string;
}

/**
 * LOD Levels Configuration:
 * - Level 0: Ultra Low (zoom < 0.1) - Only package outline
 * - Level 1: Low (zoom < 0.3) - Package + major banks
 * - Level 2: Medium (zoom < 0.7) - + pin circles without labels
 * - Level 3: High (zoom < 1.5) - + pin names + signal names
 * - Level 4: Ultra High (zoom >= 1.5) - All details + grid lines
 */
export const LOD_LEVELS: LODLevel[] = [
  { level: 0, threshold: 0.1, description: 'Ultra Low - Package outline only' },
  { level: 1, threshold: 0.3, description: 'Low - Package + major banks' },
  { level: 2, threshold: 0.7, description: 'Medium - + pin circles' },
  { level: 3, threshold: 1.5, description: 'High - + pin/signal names' },
  { level: 4, threshold: Infinity, description: 'Ultra High - All details' }
];

/**
 * Get LOD level based on current zoom/scale
 */
export function getLODLevel(scale: number): number {
  for (let i = 0; i < LOD_LEVELS.length; i++) {
    if (scale < LOD_LEVELS[i].threshold) {
      return LOD_LEVELS[i].level;
    }
  }
  return LOD_LEVELS[LOD_LEVELS.length - 1].level;
}

/**
 * Check if a feature should be rendered at the current LOD level
 */
export function shouldRenderAtLOD(currentLevel: number, requiredLevel: number): boolean {
  return currentLevel >= requiredLevel;
}

/**
 * Get performance multiplier based on LOD level
 * Higher levels = more detail but lower performance multiplier
 */
export function getPerformanceMultiplier(lodLevel: number): number {
  switch (lodLevel) {
    case 0: return 1.0;   // Ultra fast
    case 1: return 0.8;   // Fast
    case 2: return 0.6;   // Medium
    case 3: return 0.4;   // Detailed
    case 4: return 0.2;   // Ultra detailed
    default: return 0.5;
  }
}

/**
 * Get maximum number of elements to render based on LOD
 */
export function getMaxElements(lodLevel: number): number {
  switch (lodLevel) {
    case 0: return 50;     // Minimal elements
    case 1: return 200;    // Basic elements
    case 2: return 500;    // Medium detail
    case 3: return 1000;   // High detail
    case 4: return 5000;   // All elements
    default: return 1000;
  }
}

/**
 * Check if text should be rendered at current scale
 */
export function shouldRenderText(scale: number, textType: 'pin' | 'signal' | 'bank' = 'pin'): boolean {
  const minScales = {
    pin: 0.7,     // Pin names at medium zoom
    signal: 0.7,  // Signal names at medium zoom  
    bank: 0.3     // Bank labels at low zoom
  };
  
  return scale >= minScales[textType];
}

/**
 * Get adaptive text size based on zoom level
 */
export function getAdaptiveTextSize(scale: number, baseSize: number = 12): number {
  if (scale < 0.5) return 0; // Don't render text at very low zoom
  
  // Scale text size with zoom, but with limits
  const scaledSize = baseSize * Math.min(scale, 2.0);
  return Math.max(8, Math.min(scaledSize, 24));
}

/**
 * Check if differential pairs should be rendered
 */
export function shouldRenderDifferentialPairs(scale: number): boolean {
  return scale >= 0.5; // Only render diff pairs at medium+ zoom
}

/**
 * Check if pin details should be rendered
 */
export function shouldRenderPinDetails(scale: number): boolean {
  return scale >= 0.7; // Pin details at high zoom
}

/**
 * Main LOD System class
 */
export class LODSystem {
  static getLODLevel = getLODLevel;
  static shouldRenderAtLOD = shouldRenderAtLOD;
  static getPerformanceMultiplier = getPerformanceMultiplier;
  static getMaxElements = getMaxElements;
  static shouldRenderText = shouldRenderText;
  static getAdaptiveTextSize = getAdaptiveTextSize;
  static shouldRenderDifferentialPairs = shouldRenderDifferentialPairs;
  static shouldRenderPinDetails = shouldRenderPinDetails;
}

export default LODSystem;
