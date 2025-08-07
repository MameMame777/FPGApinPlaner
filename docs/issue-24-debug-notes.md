# FPGA Pin Planner - Issue #24 Debug Notes and Lessons Learned

## Issue #24: XLSX Support and Intel/Altera Format Processing

### Problem Statement
- Need to support XLSX files for Intel/Altera FPGA pin definitions
- Original implementation only supported CSV format
- Required both power pins (VCC/GND) and I/O pins to be processed correctly
- Need SDC export functionality with proper signal name handling

### Investigation Process

#### 1. Initial Problem: Only Power Pins Loaded
**Symptoms:**
- Only 6 pins loaded (all VCC/GND)
- I/O pins were filtered out
- Generic CSV processing was used instead of Intel/Altera specific processing

**Root Cause:**
```typescript
// WRONG: Promise object is always truthy
if (versalResult) { /* always true */ }

// CORRECT: Check for actual null return
if (versalResult !== null) { /* works correctly */ }
```

#### 2. Second Problem: Intel/Altera Format Not Detected
**Symptoms:**
- `🔍 Detecting Intel/Altera format...` log never appeared
- Fell back to generic CSV processing
- Wrong processing path taken

**Root Cause:**
```typescript
// WRONG: Calling static method as instance method
this.detectIntelAlteraFormat(csvContent)

// CORRECT: Call static method properly
CSVReader.detectIntelAlteraFormat(csvContent)
```

#### 3. Third Problem: Signal Name Encoding Issues
**Symptoms:**
- Generated SDC contained full-width Japanese characters: `１`, `２`
- FPGA tools don't handle non-ASCII signal names well

**Solution:**
```typescript
const sanitizeSignalName = (signalName: string): string => {
  return signalName
    .replace(/[^\w_]/g, '_')      // ASCII only
    .replace(/^(\d)/, 'sig_$1')   // No leading numbers
    .replace(/_{2,}/g, '_')       // Clean multiple underscores
    .replace(/^_|_$/g, '');       // Remove edge underscores
};
```

### Debug Techniques Used

#### 1. Progressive Logging Strategy
- Added detailed logs at each processing step
- Used emoji prefixes for easy log filtering: `🔍`, `✅`, `❌`, `⚠️`
- Logged first 10 pins with full details to avoid log spam

#### 2. Format Detection Debugging
```typescript
console.log('🔍 Detecting Intel/Altera format...');
for (let i = 0; i < Math.min(5, csvLines.length); i++) {
  console.log(`Row ${i}: "${csvLines[i]}"`);
}
```

#### 3. Build Process Verification
- Always build main app first: `npm run build`
- Then clean build extension: `cd vscode-extension && npm run package`
- Verify new build artifacts with different hash: `main-[hash].js`

### Key Learnings

#### 1. Promise Handling Gotchas
- Always check Promise results explicitly against `null`/`undefined`
- Don't rely on truthy/falsy checks with Promise objects

#### 2. Static Method Calls
- Be careful with `this.` vs `ClassName.` for static methods
- TypeScript doesn't always catch these at compile time

#### 3. XLSX vs CSV Processing Paths
- XLSX files need special handling before CSV parsing
- Format detection must happen before processing pipeline starts
- Different file types may need completely different processing logic

#### 4. International Character Handling
- FPGA tools are often ASCII-only for signal names
- Always sanitize user input for hardware constraints
- Test with various character encodings

#### 5. Development Server vs Production Builds
- Hot reload helps with rapid iteration
- But final testing must use production builds
- Extension testing requires full build cycle

### Testing Checklist for Similar Issues

1. **Format Detection**
   - [ ] Correct format detected from file headers
   - [ ] Processing path logs show expected flow
   - [ ] Debug logs appear in correct sequence

2. **Pin Processing**
   - [ ] Both I/O and power pins included
   - [ ] Pin counts match expectations
   - [ ] All required pin data extracted

3. **File Export**
   - [ ] Generated files have valid syntax
   - [ ] Signal names are tool-compatible
   - [ ] All assigned pins included in output

4. **Build Verification**
   - [ ] Main app built first
   - [ ] Extension uses latest webview content
   - [ ] New build hash in dev tools

### Future Considerations

1. **Add Format Auto-Detection Tests**
   - Unit tests for various XLSX formats
   - Regression tests for format detection

2. **Improve Error Handling**
   - Better error messages for unsupported formats
   - Graceful fallback for partial parsing failures

3. **Extended Format Support**
   - Consider supporting more vendor formats
   - Add format-specific validation rules

4. **Signal Name Validation**
   - Add real-time validation in UI
   - Preview sanitized names before export

### Implementation Details

#### SDC Export Enhancement
- Added signal name sanitization for FPGA tool compatibility
- Improved IO standard mapping (LVCMOS33 vs "3.3-V LVCMOS")
- Fixed drive strength units (12mA vs 12MA)
- ASCII-only constraint generation

#### XLSX Processing Pipeline
1. File reading with xlsx library
2. Format detection based on header patterns
3. Intel/Altera specific processing for both power and I/O pins
4. Proper data extraction and validation

#### UI Integration
- Added ConstraintFormatSelector component
- Modal dialog for XDC/SDC format selection
- Preview functionality before export
- Unified export menu structure
