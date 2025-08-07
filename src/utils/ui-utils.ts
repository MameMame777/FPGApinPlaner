import { getOptimizedBankColor } from './bank-color-utils';

/**
 * Get background color for BANK-based styling - improved for issue #23
 */
export const getBankBackgroundColor = (bank: string | undefined, isSelected: boolean, isHovered: boolean): string => {
  if (isSelected) return '#2d4f75';
  
  if (!bank) {
    return isHovered ? '#2a2a2a' : '#1a1a1a'; // BANKが未定義の場合はデフォルト色
  }

  // Use optimized color system for consistency
  const baseColor = getOptimizedBankColor(bank);
  
  // Convert to darker version for background use
  const darkenedColor = darkenColor(baseColor, 0.7);
  
  return isHovered ? lightenColor(darkenedColor, 0.2) : darkenedColor;
};

/**
 * Darken a hex color by a factor (0-1)
 */
export const darkenColor = (hex: string, factor: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * factor * 100);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, (num >> 8 & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
};

/**
 * Lighten a hex color by a factor (0-1)
 */
export const lightenColor = (hex: string, factor: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * factor * 100);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, (num >> 8 & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  
  return `#${(0x1000000 + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
};
