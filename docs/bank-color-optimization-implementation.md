# Bank Color Optimization Implementation - Issue #23

## Summary

Implemented optimizations for BANK color coding as requested in issue #23:

### 1. **Removed Grid Lines Around BANK Boundaries** ✅

**Files Modified:**
- `src/components/common/PackageCanvas.tsx`

**Changes Made:**
- Removed stroke lines and dash patterns from bank boundary rectangles
- Replaced with subtle background tinting using transparent colors (`${bankColor}10`)
- Eliminated visual clutter while maintaining bank grouping visibility
- Removed unused `dashPatterns` and overlap detection code

**Before:**
```tsx
stroke={bankColor}
strokeWidth={hasOverlap ? 1.5 : 2}
dash={dashPattern}
```

**After:**
```tsx
fill={`${bankColor}10`} // Very subtle background tint (6% opacity)
stroke="transparent" // No stroke lines
```

### 2. **Improved BANK Color Assignment** ✅

**Files Created:**
- `src/utils/bank-color-utils.ts` - New comprehensive color management system

**Files Modified:**
- `src/components/common/PackageCanvas.tsx` - Updated to use new color system
- `src/utils/ui-utils.ts` - Updated to use optimized colors for consistency

**Key Features:**

#### **Color Collision Avoidance:**
- Automatically detects and avoids colors too similar to text colors:
  - `#e0e0e0` (Main labels)
  - `#ccc`, `#cccccc` (Headers)
  - `#FFF` (Pin text)
  - `#000` (Black text)
  - Other UI text colors
- Uses distance calculation in RGB space to ensure minimum 80-unit separation

#### **Distinct Color Generation:**
- Uses HSL color space with golden ratio (0.618) for optimal distribution
- Generates visually distinct colors automatically
- Fallback system for edge cases
- Consistent color assignment across sessions

#### **Special Case Handling:**
```tsx
// Power/Ground pins maintain distinct colors
'POWER' → '#8B4513' (Brown)
'GROUND' → '#2C2C2C' (Dark gray)
'NA' → '#708090' (Slate gray)
```

#### **Dynamic Bank Support:**
- Handles any number of banks automatically
- Non-numeric bank names supported via hash-based assignment
- Predefined high-quality colors for common banks (0-15)
- Auto-generation for additional banks

### 3. **Dynamic Legend Updates** ✅

**Files Modified:**
- `src/components/common/PackageCanvas.tsx`

**Changes Made:**
- Legend now shows only banks actually present in the current dataset
- Automatic sorting (numeric banks first, then alphabetical)
- Uses optimized color system for consistency
- Limits display to 6 banks to avoid clutter

**Before:**
```tsx
// Hardcoded bank colors
'Bank 0': '#FF6B6B',
'Bank 34': '#4ECDC4',
// ...
```

**After:**
```tsx
// Dynamic based on actual data
const uniqueBanks = Array.from(new Set(pins.map(p => p.bank).filter(Boolean)))
  .sort((a, b) => {
    const aNum = parseInt(a!);
    const bNum = parseInt(b!);
    return isNaN(aNum) || isNaN(bNum) ? a!.localeCompare(b!) : aNum - bNum;
  })
  .slice(0, 6);
```

### 4. **Consistency Across Components** ✅

**Files Modified:**
- `src/utils/ui-utils.ts` - Updated `getBankBackgroundColor()` to use new system
- Background colors now derived from optimized bank colors with darkening

## Testing

**Created:**
- `tests/unit/bank-color-optimization.test.ts` - Comprehensive test suite

**Test Coverage:**
- Color distinctness verification
- Text color collision detection
- Special case handling (POWER/GROUND/NA)
- Non-numeric bank name support
- Color map generation
- Consistency across calls

## Technical Benefits

### **Performance:**
- Reduced rendering complexity (no stroke calculations)
- Fewer DOM elements (removed grid lines)
- Optimized color calculations

### **Visual Quality:**
- Cleaner, less cluttered appearance
- Better color contrast and visibility
- No visual conflicts with text elements
- Professional, modern appearance

### **Maintainability:**
- Centralized color management
- Automatic color generation
- No hardcoded color mappings
- Easy to extend for new bank types

## Files Summary

### **New Files:**
1. `src/utils/bank-color-utils.ts` - Main color optimization system
2. `tests/unit/bank-color-optimization.test.ts` - Test suite

### **Modified Files:**
1. `src/components/common/PackageCanvas.tsx` - Core rendering updates
2. `src/utils/ui-utils.ts` - Background color consistency

## Verification

Build completed successfully with no errors:
```
✓ 266 modules transformed.
✓ built in 2.06s
```

All requirements from issue #23 have been implemented:
- ✅ Removed grid lines around BANK boundaries
- ✅ Optimized color assignment to avoid collisions
- ✅ Ensured colors don't clash with label text colors
- ✅ Dynamic legend based on actual data
- ✅ Comprehensive testing coverage
