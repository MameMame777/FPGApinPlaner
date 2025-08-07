/**
 * Improved BANK color utilities for issue #23
 * Generates distinct colors that avoid collisions with text colors and each other
 */

// Text colors used in the application that we need to avoid
const TEXT_COLORS = [
  '#e0e0e0', // Main label text
  '#ccc',    // Header text
  '#cccccc', // Legend text
  '#FFF',    // White pin text
  '#000',    // Black text
  '#374151', // Gray text
  '#666',    // Secondary text
];

// Colors that are too close to text colors (to avoid)
const FORBIDDEN_COLOR_RANGES = [
  { min: 0xe0, max: 0xff, channels: ['r', 'g', 'b'] }, // Too close to light colors
  { min: 0x00, max: 0x30, channels: ['r', 'g', 'b'] }, // Too close to black
  { min: 0xc0, max: 0xd0, channels: ['r', 'g', 'b'] }, // Too close to #ccc
];

/**
 * Check if a color is too similar to text colors
 */
function isColorForbidden(r: number, g: number, b: number): boolean {
  // Check against forbidden ranges
  for (const range of FORBIDDEN_COLOR_RANGES) {
    const inRange = range.channels.every(channel => {
      const value = channel === 'r' ? r : channel === 'g' ? g : b;
      return value >= range.min && value <= range.max;
    });
    if (inRange) return true;
  }
  
  // Check specific text color distances
  for (const textColor of TEXT_COLORS) {
    const textR = parseInt(textColor.slice(1, 3), 16);
    const textG = parseInt(textColor.slice(3, 5), 16);
    const textB = parseInt(textColor.slice(5, 7), 16);
    
    const distance = Math.sqrt(
      Math.pow(r - textR, 2) + 
      Math.pow(g - textG, 2) + 
      Math.pow(b - textB, 2)
    );
    
    // If too close to any text color, forbid it
    if (distance < 80) return true;
  }
  
  return false;
}

/**
 * Generate visually distinct colors using HSL color space
 */
function generateDistinctColors(count: number): string[] {
  const colors: string[] = [];
  const goldenRatio = 0.618033988749895;
  const saturation = 0.7; // Good saturation for visibility
  const lightness = 0.5;  // Medium lightness for good contrast
  
  for (let i = 0; i < count; i++) {
    let hue = (i * goldenRatio) % 1;
    
    // Convert HSL to RGB to check if forbidden
    let attempts = 0;
    let validColor = false;
    
    while (!validColor && attempts < 10) {
      const rgb = hslToRgb(hue, saturation, lightness);
      
      if (!isColorForbidden(rgb.r, rgb.g, rgb.b)) {
        colors.push(`#${rgb.r.toString(16).padStart(2, '0')}${rgb.g.toString(16).padStart(2, '0')}${rgb.b.toString(16).padStart(2, '0')}`);
        validColor = true;
      } else {
        // Adjust hue slightly and try again
        hue = (hue + 0.1) % 1;
        attempts++;
      }
    }
    
    // Fallback if no valid color found
    if (!validColor) {
      colors.push(`#${Math.floor(Math.random() * 128 + 64).toString(16)}${Math.floor(Math.random() * 128 + 64).toString(16)}${Math.floor(Math.random() * 128 + 64).toString(16)}`);
    }
  }
  
  return colors;
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255)
  };
}

/**
 * Predefined high-quality bank colors that avoid text color collisions
 */
const PREDEFINED_BANK_COLORS = [
  '#FF6B6B', // Soft Red
  '#4ECDC4', // Turquoise
  '#45B7D1', // Sky Blue
  '#96CEB4', // Mint Green
  '#FFEAA7', // Soft Yellow (adjusted to avoid text collision)
  '#DDA0DD', // Plum
  '#F39C12', // Orange
  '#E74C3C', // Red
  '#9B59B6', // Purple
  '#3498DB', // Blue
  '#1ABC9C', // Emerald
  '#2ECC71', // Green
  '#F1C40F', // Yellow
  '#E67E22', // Carrot
  '#E91E63', // Pink
  '#673AB7', // Deep Purple
];

/**
 * Get optimized bank color - improved version for issue #23
 */
export function getOptimizedBankColor(bank: string | undefined): string {
  if (!bank || bank === 'NA') {
    return '#708090'; // Slate Gray for non-bank pins
  }

  // Special handling for power/ground (these should remain distinct)
  if (bank === 'POWER' || bank === 'VCC') {
    return '#8B4513'; // Brown for power
  }
  if (bank === 'GROUND' || bank === 'GND') {
    return '#2C2C2C'; // Dark gray for ground
  }

  // Parse bank number
  const bankNum = parseInt(bank);
  
  if (!isNaN(bankNum)) {
    // Use predefined colors for known banks, generate new ones for unknown banks
    if (bankNum < PREDEFINED_BANK_COLORS.length) {
      return PREDEFINED_BANK_COLORS[bankNum];
    } else {
      // Generate additional colors for banks beyond predefined set
      const additionalColors = generateDistinctColors(bankNum - PREDEFINED_BANK_COLORS.length + 1);
      return additionalColors[additionalColors.length - 1];
    }
  }

  // For non-numeric bank names, use hash-based approach
  let hash = 0;
  for (let i = 0; i < bank.length; i++) {
    hash = ((hash << 5) - hash + bank.charCodeAt(i)) & 0xffffffff;
  }
  
  const colorIndex = Math.abs(hash) % PREDEFINED_BANK_COLORS.length;
  return PREDEFINED_BANK_COLORS[colorIndex];
}

/**
 * Get all bank colors that will be used in the current dataset
 */
export function getAllBankColors(bankList: (string | undefined)[]): Map<string, string> {
  const colorMap = new Map<string, string>();
  const uniqueBanks = Array.from(new Set(bankList.filter(Boolean)));
  
  uniqueBanks.forEach(bank => {
    colorMap.set(bank!, getOptimizedBankColor(bank));
  });
  
  return colorMap;
}

/**
 * Check if two colors are visually similar
 */
export function areColorsSimilar(color1: string, color2: string, threshold: number = 50): boolean {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const distance = Math.sqrt(
    Math.pow(r1 - r2, 2) + 
    Math.pow(g1 - g2, 2) + 
    Math.pow(b1 - b2, 2)
  );
  
  return distance < threshold;
}
