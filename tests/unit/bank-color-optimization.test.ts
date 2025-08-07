/**
 * Test for bank color optimization - issue #23
 */

import { getOptimizedBankColor, getAllBankColors, areColorsSimilar } from '../../src/utils/bank-color-utils';

describe('Bank Color Optimization - Issue #23', () => {
  test('should generate distinct colors for different banks', () => {
    const banks = ['0', '34', '35', '500', '501', '502'];
    const colors = banks.map(bank => getOptimizedBankColor(bank));
    
    // Check that all colors are different
    const uniqueColors = new Set(colors);
    expect(uniqueColors.size).toBe(colors.length);
  });

  test('should avoid text color collisions', () => {
    const textColors = ['#e0e0e0', '#ccc', '#cccccc', '#FFF', '#000', '#374151', '#666'];
    const bankColors = ['0', '34', '35', '500', '501', '502'].map(bank => getOptimizedBankColor(bank));
    
    // Check that bank colors are not too similar to text colors
    bankColors.forEach(bankColor => {
      textColors.forEach(textColor => {
        expect(areColorsSimilar(bankColor, textColor, 80)).toBe(false);
      });
    });
  });

  test('should handle special power/ground cases', () => {
    expect(getOptimizedBankColor('POWER')).toBe('#8B4513');
    expect(getOptimizedBankColor('GROUND')).toBe('#2C2C2C');
    expect(getOptimizedBankColor('NA')).toBe('#708090');
  });

  test('should handle non-numeric bank names', () => {
    const color1 = getOptimizedBankColor('CUSTOM_BANK_A');
    const color2 = getOptimizedBankColor('CUSTOM_BANK_B');
    
    expect(color1).toBeDefined();
    expect(color2).toBeDefined();
    expect(color1).not.toBe(color2);
  });

  test('should generate color map for bank list', () => {
    const banks = ['0', '34', '35', undefined, 'POWER'];
    const colorMap = getAllBankColors(banks);
    
    expect(colorMap.has('0')).toBe(true);
    expect(colorMap.has('34')).toBe(true);
    expect(colorMap.has('35')).toBe(true);
    expect(colorMap.has('POWER')).toBe(true);
    expect(colorMap.has('undefined')).toBe(false); // undefined should be filtered out
  });

  test('should maintain consistency across calls', () => {
    const bank = '34';
    const color1 = getOptimizedBankColor(bank);
    const color2 = getOptimizedBankColor(bank);
    
    expect(color1).toBe(color2);
  });
});
