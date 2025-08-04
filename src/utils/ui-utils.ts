/**
 * Get background color for BANK-based styling
 */
export const getBankBackgroundColor = (bank: string | undefined, isSelected: boolean, isHovered: boolean): string => {
  if (isSelected) return '#2d4f75';
  
  if (!bank) {
    return isHovered ? '#2a2a2a' : '#1a1a1a'; // BANKが未定義の場合はデフォルト色
  }

  // BANK番号に基づいて色を決定
  const bankNum = parseInt(bank);
  const bankColors = [
    '#1a2332', // Bank 0 - 深い青
    '#1a3221', // Bank 1 - 深い緑
    '#321a32', // Bank 2 - 深い紫
    '#322a1a', // Bank 3 - 深い茶
    '#1a3232', // Bank 4 - 深いティール
    '#321a1a', // Bank 5 - 深い赤
    '#2a1a32', // Bank 6 - 深いマゼンタ
    '#323221', // Bank 7 - 深いオリーブ
    '#1a1a32', // Bank 8 - 深いネイビー
    '#32321a', // Bank 9 - 深いイエロー
    '#1a3232', // Bank 10+ - ティールの繰り返し
  ];

  const colorIndex = isNaN(bankNum) ? 0 : bankNum % bankColors.length;
  const baseColor = bankColors[colorIndex];
  
  return isHovered ? lightenColor(baseColor, 0.2) : baseColor;
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
