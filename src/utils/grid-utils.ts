// Grid position utilities for FPGA pin planning

/**
 * Convert row letter(s) to numeric index for proper sorting
 * A=0, B=1, ..., Z=25, AA=26, AB=27, ..., AZ=51, BA=52, etc.
 */
export function rowToIndex(row: string): number {
  if (row.length === 1) {
    // Single letter: A=0, B=1, ..., Z=25
    const index = row.charCodeAt(0) - 65;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Single letter ${row} -> index ${index}`);
    }
    return index;
  } else if (row.length === 2) {
    // Double letter: AA=26, AB=27, ..., AZ=51, BA=52, etc.
    const firstChar = row.charCodeAt(0) - 65;
    const secondChar = row.charCodeAt(1) - 65;
    const index = 26 + firstChar * 26 + secondChar;
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Double letter ${row} -> first:${firstChar}, second:${secondChar}, index:${index}`);
    }
    return index;
  }
  // Fallback for longer strings (though unlikely in FPGA packages)
  if (process.env.NODE_ENV === 'development') {
    console.log(`⚠️ Unexpected row format: ${row}, using index 0`);
  }
  return 0;
}

/**
 * Convert numeric index to row letter(s)
 * 0=A, 1=B, ..., 25=Z, 26=AA, 27=AB, ..., 51=AZ, 52=BA, etc.
 */
export function indexToRow(index: number): string {
  if (index < 26) {
    // Single letter: 0=A, 1=B, ..., 25=Z
    const result = String.fromCharCode(65 + index);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Index ${index} -> single letter ${result}`);
    }
    return result;
  } else {
    // Double letter: 26=AA, 27=AB, ..., 51=AZ, 52=BA, etc.
    const adjustedIndex = index - 26;
    const firstChar = Math.floor(adjustedIndex / 26);
    const secondChar = adjustedIndex % 26;
    const result = String.fromCharCode(65 + firstChar) + String.fromCharCode(65 + secondChar);
    if (process.env.NODE_ENV === 'development') {
      console.log(`📍 Index ${index} -> double letter ${result} (first:${firstChar}, second:${secondChar})`);
    }
    return result;
  }
}

/**
 * Compare two row strings with proper alphabetical ordering
 * Handles single and double letter rows correctly
 */
export function compareRows(rowA: string, rowB: string): number {
  const indexA = rowToIndex(rowA);
  const indexB = rowToIndex(rowB);
  
  // Debug logging to help troubleshoot ordering issues
  if (process.env.NODE_ENV === 'development') {
    console.log(`🔄 Comparing rows: ${rowA}(${indexA}) vs ${rowB}(${indexB}) = ${indexA - indexB}`);
  }
  
  return indexA - indexB;
}

/**
 * Sort pins by grid position (row first, then column)
 * This ensures proper A, B, C...Z, AA, AB ordering
 */
export function sortPinsByGridPosition(pins: any[]): any[] {
  return [...pins].sort((a, b) => {
    if (!a.gridPosition || !b.gridPosition) {
      return 0;
    }
    
    // Compare rows first
    const rowComparison = compareRows(a.gridPosition.row, b.gridPosition.row);
    if (rowComparison !== 0) {
      return rowComparison;
    }
    
    // If rows are equal, compare columns
    return a.gridPosition.col - b.gridPosition.col;
  });
}
