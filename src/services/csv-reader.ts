import { Pin, Package, GridPosition, Position, ImportResult, CSVFormat, ColumnMapping } from '@/types';
import { rowToIndex } from '@/utils/grid-utils';

export class CSVReader {
  private static readonly XILINX_HEADERS = [
    'Pin', 'Pin Name', 'Memory Byte Group', 'Bank', 
    'VCCAUX Group', 'Super Logic Region', 'I/O Type', 'No-Connect'
  ];

  private static readonly GENERIC_HEADERS = [
    'Pin', 'Signal', 'Direction', 'Voltage', 'Package_Pin', 'Row', 'Col'
  ];

  static async parseCSVFile(file: File): Promise<ImportResult> {
    try {
      const content = await this.readFileContent(file);
      return this.parseCSVContent(content);
    } catch (error) {
      return {
        success: false,
        pins: [],
        warnings: [],
        errors: [(error as Error).message],
        format: this.getDefaultFormat(),
      };
    }
  }

  static async parseCSVContent(content: string): Promise<ImportResult> {
    console.log('🚀 Starting ultra-fast CSV parsing...');
    
    // Try ultra-fast Versal pattern matching first
    const versalResult = this.tryVersalPatternMatching(content);
    if (versalResult) {
      return versalResult;
    }
    
    // Fallback to generic parsing
    console.log('📋 Versal pattern not found, using generic approach...');
    return this.parseCSVContentGeneric(content);
  }

  static async parseCSVContentGeneric(content: string): Promise<ImportResult> {
    console.log('🔄 Fallback to generic CSV processing...');
    
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    console.log(`📄 Processing ${lines.length} lines with generic approach`);

    // Simple header detection - look for lines with Pin columns
    let headerLineIndex = -1;
    let dataStartIndex = -1;
    
    for (let i = 0; i < Math.min(1000, lines.length); i++) {
      const line = lines[i];
      if (!line || !line.includes(',')) continue;
      
      // Skip license content
      const lowerLine = line.toLowerCase();
      if (lowerLine.includes('copyright') || lowerLine.includes('license') || 
          lowerLine.includes('xilinx') || line.startsWith('#')) continue;
      
      const columns = this.parseCSVLine(line);
      if (columns.length >= 3) {
        const hasPinColumn = columns.some(col => {
          const trimmed = col.toLowerCase().trim();
          return trimmed === 'pin' || trimmed === 'ball' || trimmed.includes('pin');
        });
        
        if (hasPinColumn) {
          headerLineIndex = i;
          dataStartIndex = i + 1;
          break;
        }
      }
    }

    if (headerLineIndex === -1) {
      return {
        success: false,
        pins: [],
        warnings: [],
        errors: ['Pin column not found or empty'],
        format: this.getDefaultFormat(),
      };
    }

    const headerLine = lines[headerLineIndex];
    console.log(`📋 Found header at line ${headerLineIndex + 1}:`, headerLine);

    const format = this.detectFormat(headerLine);
    const mapping = this.getColumnMapping(format, headerLine);

    console.log('🔍 Format:', format);
    console.log('🔍 Mapping:', mapping);

    const pins: Pin[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Process data lines after header
    let processed = 0;
    let validPins = 0;

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      
      if (!line || line.replace(/,/g, '').trim() === '') {
        continue;
      }
      
      const columns = this.parseCSVLine(line);
      
      try {
        const pin = this.parsePin(columns, mapping, i + 1);
        if (pin) {
          pins.push(pin);
          validPins++;
        }
      } catch (error) {
        if (errors.length < 20) {
          errors.push(`Line ${i + 1}: ${(error as Error).message}`);
        }
      }
      
      processed++;
      
      if (processed % 1000 === 0) {
        console.log(`🔄 Generic processing: ${processed} lines, ${validPins} pins`);
      }
    }

    console.log(`✅ Generic processing complete: ${validPins} pins found from ${processed} lines`);

    return {
      success: pins.length > 0,
      pins,
      warnings,
      errors,
      format,
    };
  }

  static tryVersalPatternMatching(content: string): Promise<ImportResult> | null {
    console.log('⚡ Trying ultra-fast Versal pattern matching...');
    const lines = content.split('\n').map(line => line.trim());
    console.log(`📄 Total lines: ${lines.length}`);
    
    let headerLineIndex = -1;
    let dataStartIndex = -1;
    
    // Ultra-fast scan for Versal header pattern
    for (let i = 0; i < Math.min(7000, lines.length); i++) {
      const line = lines[i];
      
      // Progress indicator every 1000 lines
      if (i % 1000 === 0) {
        console.log(`⚡ Pattern matching line ${i + 1}...`);
      }
      
      // Look for exact Versal header pattern
      if (line && line.toLowerCase().startsWith('pin,pin name,')) {
        headerLineIndex = i;
        dataStartIndex = i + 1;
        console.log(`✅ Found Versal header at line ${i + 1}: ${line.substring(0, 100)}`);
        break;
      }
      
      // Alternative pattern
      if (line && line.toLowerCase().startsWith('pin,') && 
          line.toLowerCase().includes('pin name') && 
          line.split(',').length >= 3) {
        headerLineIndex = i;
        dataStartIndex = i + 1;
        console.log(`✅ Found Versal header variant at line ${i + 1}: ${line.substring(0, 100)}`);
        break;
      }
    }
    
    if (headerLineIndex === -1) {
      console.log('❌ Versal pattern not found');
      return null;
    }
    
    // Continue with fast processing
    return this.parseCSVWithKnownHeader(lines, headerLineIndex, dataStartIndex);
  }

  static async parseCSVWithKnownHeader(lines: string[], headerLineIndex: number, dataStartIndex: number): Promise<ImportResult> {
    console.log('⚡ Fast processing with known header...');
    
    // Extract data lines efficiently
    const dataLines = lines.slice(dataStartIndex).filter(line => {
      if (!line || line.trim() === '') return false;
      const withoutCommas = line.replace(/,/g, '').trim();
      return withoutCommas !== '';
    });

    console.log(`📋 Found ${dataLines.length} data lines after header`);
    
    // Parse header and continue with existing logic
    const headerLine = lines[headerLineIndex];
    console.log(`📋 Using header line ${headerLineIndex}:`, headerLine);
    const format = this.detectFormat(headerLine);
    const mapping = this.getColumnMapping(format, headerLine);
    
    console.log('🔍 Format:', format);
    console.log('🔍 Mapping:', mapping);
    
    const pins: Pin[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Optimized processing
    let processed = 0;
    let validPins = 0;
    const processingBatchSize = 1000;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      
      if (!line || line.replace(/,/g, '').trim() === '') {
        continue;
      }
      
      const columns = this.parseCSVLine(line);
      
      try {
        const pin = this.parsePin(columns, mapping, i + dataStartIndex + 1);
        if (pin) {
          pins.push(pin);
          validPins++;
        }
      } catch (error) {
        if (errors.length < 20) {
          errors.push(`Line ${i + dataStartIndex + 1}: ${(error as Error).message}`);
        }
      }
      
      processed++;
      
      if (processed % processingBatchSize === 0) {
        console.log(`⚡ Processed ${processed}/${dataLines.length} lines, found ${validPins} pins`);
      }
    }

    console.log(`✅ Ultra-fast processing complete: ${validPins} pins found from ${processed} lines`);

    return {
      success: pins.length > 0,
      pins,
      warnings,
      errors,
      format,
    };
  }

  private static async readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }

  private static detectFormat(headerLine: string): CSVFormat {
    const headers = this.parseCSVLine(headerLine).map(h => h.trim());
    
    // Check for Xilinx format
    const xilinxMatches = this.XILINX_HEADERS.filter(h => 
      headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
    );
    
    if (xilinxMatches.length >= 4) {
      return {
        type: 'xilinx',
        hasHeader: true,
        commentPrefix: '#',
        delimiter: ',',
        expectedColumns: this.XILINX_HEADERS,
      };
    }

    // Check for generic format
    const genericMatches = this.GENERIC_HEADERS.filter(h => 
      headers.some(header => header.toLowerCase().includes(h.toLowerCase()))
    );
    
    if (genericMatches.length >= 3) {
      return {
        type: 'generic',
        hasHeader: true,
        commentPrefix: '#',
        delimiter: ',',
        expectedColumns: this.GENERIC_HEADERS,
      };
    }

    // Default to generic with no header
    return {
      type: 'generic',
      hasHeader: false,
      commentPrefix: '#',
      delimiter: ',',
      expectedColumns: this.GENERIC_HEADERS,
    };
  }

  private static getColumnMapping(_format: CSVFormat, headerLine: string): ColumnMapping {
    const headers = this.parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
    console.log('🔍 Detected headers:', headers);
    
    const findColumn = (searchTerms: string[]): number => {
      for (const term of searchTerms) {
        const index = headers.findIndex(h => h.includes(term.toLowerCase()));
        if (index !== -1) {
          console.log(`✅ Found column "${term}" at index ${index}: "${headers[index]}"`);
          return index;
        }
      }
      return -1;
    };

    const mapping = {
      pin: findColumn(['pin', 'pin_number', 'pin number', 'package pin', 'package_pin', 'ball', 'ball_id']),
      pinName: findColumn(['pin name', 'pin_name', 'name', 'ball name', 'ball_name']),
      signalName: findColumn(['signal', 'signal_name', 'net', 'net name', 'signal name']),
      direction: findColumn(['direction', 'dir', 'type', 'i/o type', 'io_type']),
      voltage: findColumn(['voltage', 'volt', 'io_standard', 'io standard', 'vccio']),
      bank: findColumn(['bank', 'bank_number', 'bank number', 'io bank']),
      memoryByteGroup: findColumn(['memory byte group', 'byte_group', 'mbg', 'memory_byte_group']),
      ioType: findColumn(['i/o type', 'io_type', 'type', 'function', 'io_standard']),
    };
    
    console.log('📋 Column mapping result:', mapping);
    return mapping;
  }

  private static parsePin(columns: string[], mapping: ColumnMapping, _lineNumber: number): Pin | null {
    if (columns.length === 0) return null;

    // Quick validation without excessive logging
    if (mapping.pin === -1 || !columns[mapping.pin]) {
      return null; // Skip logging for performance
    }

    const pinNumber = columns[mapping.pin]?.trim();
    if (!pinNumber || pinNumber === 'NA' || pinNumber === '') {
      return null; // Skip logging for performance
    }

    // Optimized validation - fewer regex operations
    if (pinNumber.length > 10 || pinNumber.toLowerCase().includes('device')) {
      return null; // Quick rejection of obvious non-pins
    }

    // Simple alphanumeric check (more efficient than complex regex)
    if (!/^[A-Za-z0-9]+$/.test(pinNumber)) {
      return null;
    }

    const pinName = columns[mapping.pinName]?.trim() || pinNumber;
    const gridPosition = this.parseGridPosition(pinNumber);
    
    // Skip pins with invalid grid positions (no logging for performance)
    if (!gridPosition) {
      return null;
    }
    
    const position = this.gridToPosition(gridPosition);

    const pin: Pin = {
      id: crypto.randomUUID(),
      pinNumber,
      pinName,
      signalName: columns[mapping.signalName || -1]?.trim() || '',
      direction: this.parseDirection(columns[mapping.direction || -1]),
      pinType: this.determinePinType(pinName),
      voltage: columns[mapping.voltage || -1]?.trim() || '3.3V',
      packagePin: pinNumber,
      position,
      gridPosition,
      isAssigned: false,
      
      // Extended properties
      bank: columns[mapping.bank || -1]?.trim(),
      memoryByteGroup: columns[mapping.memoryByteGroup || -1]?.trim(),
      ioType: columns[mapping.ioType || -1]?.trim(),
    };

    // Set isAssigned if signal name exists
    if (pin.signalName) {
      pin.isAssigned = true;
    }

    return pin;
  }

  private static parseGridPosition(pinNumber: string): GridPosition | null {
    const match = pinNumber.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      return {
        row: match[1],
        col: parseInt(match[2], 10),
      };
    }
    
    // Return null for invalid pin numbers (no logging for performance)
    return null;
  }

  private static gridToPosition(grid: GridPosition): Position {
    // Use proper grid to position conversion with support for double letter rows
    const rowOffset = rowToIndex(grid.row);
    const gridSpacing = 88; // Tile size from PackageCanvas
    
    return {
      x: Math.round((grid.col - 1) * gridSpacing),
      y: Math.round(rowOffset * gridSpacing)
    };
  }

  private static parseDirection(directionStr: string | undefined): Pin['direction'] {
    if (!directionStr) return 'InOut';
    
    const dir = directionStr.toLowerCase().trim();
    if (dir.includes('input') || dir.includes('in')) return 'Input';
    if (dir.includes('output') || dir.includes('out')) return 'Output';
    if (dir.includes('inout') || dir.includes('bidirectional')) return 'InOut';
    if (dir.includes('power') || dir.includes('vcc')) return 'Power';
    if (dir.includes('ground') || dir.includes('gnd')) return 'Ground';
    if (dir.includes('clock') || dir.includes('clk')) return 'Clock';
    if (dir.includes('reset') || dir.includes('rst')) return 'Reset';
    
    return 'InOut';
  }

  private static determinePinType(pinName: string): Pin['pinType'] {
    const name = pinName.toLowerCase();
    
    if (name.includes('io_l') || name.includes('io_') || name.startsWith('io')) return 'IO';
    if (name.includes('config') || name.includes('tck') || name.includes('tdi') || 
        name.includes('tdo') || name.includes('tms') || name.includes('done')) return 'CONFIG';
    if (name.includes('vcc') || name.includes('vdd')) return 'POWER';
    if (name.includes('gnd') || name.includes('vss')) return 'GROUND';
    if (name.includes('mgt') || name.includes('gt')) return 'MGT';
    if (name.includes('clk') || name.includes('clock')) return 'CLOCK';
    if (name.includes('adc') || name.includes('dac')) return 'ADC';
    if (name.includes('vref') || name.includes('special')) return 'SPECIAL';
    if (name.includes('nc') || name === '') return 'NC';
    if (name.includes('rsvd') || name.includes('reserved')) return 'RESERVED';
    
    return 'IO'; // Default
  }

  private static parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  }

  private static getDefaultFormat(): CSVFormat {
    return {
      type: 'generic',
      hasHeader: true,
      commentPrefix: '#',
      delimiter: ',',
      expectedColumns: this.GENERIC_HEADERS,
    };
  }

  static createPackageFromPins(pins: Pin[], packageName: string = 'Unknown'): Package {
    if (pins.length === 0) {
      return {
        id: crypto.randomUUID(),
        name: packageName,
        device: 'Unknown',
        packageType: 'Unknown',
        dimensions: { rows: 0, cols: 0 },
        pins: [],
        totalPins: 0,
      };
    }

    // Calculate dimensions from pin positions using proper row indexing
    const maxRow = Math.max(...pins.map(p => rowToIndex(p.gridPosition.row))) + 1;
    const maxCol = Math.max(...pins.map(p => p.gridPosition.col));

    return {
      id: crypto.randomUUID(),
      name: packageName,
      device: packageName.split('-')[0] || 'Unknown',
      packageType: packageName.split('-')[1] || 'Unknown',
      dimensions: {
        rows: maxRow,
        cols: maxCol,
      },
      pins,
      totalPins: pins.length,
    };
  }
}
