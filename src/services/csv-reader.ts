import { Pin, Package, CSVFormat, ImportResult, ColumnMapping, Position, GridPosition } from '@/types';

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
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    if (lines.length === 0) {
      return {
        success: false,
        pins: [],
        warnings: [],
        errors: ['CSV file is empty'],
        format: this.getDefaultFormat(),
      };
    }

    console.log('🔍 CSV Lines:', lines.slice(0, 5));

    // Skip comment lines, license headers, and device info lines
    const dataLines = lines.filter(line => 
      !line.startsWith('#') && 
      !line.startsWith('//') &&
      !line.toLowerCase().includes('copyright') &&
      !line.toLowerCase().includes('license') &&
      !line.toLowerCase().startsWith('device/package') &&
      line.trim() !== '' &&
      !line.match(/^,+$/) // Skip lines with only commas
    );

    if (dataLines.length === 0) {
      return {
        success: false,
        pins: [],
        warnings: [],
        errors: ['No data found in CSV file'],
        format: this.getDefaultFormat(),
      };
    }

    console.log('🔍 Data Lines:', dataLines.slice(0, 5));

    // Find the header line for Xilinx format (usually the line that contains "Pin,Pin Name,...")
    let headerLineIndex = 0;
    for (let i = 0; i < Math.min(5, dataLines.length); i++) {
      const line = dataLines[i];
      const columns = this.parseCSVLine(line);
      console.log(`🔍 Line ${i}:`, columns);
      
      if (line.toLowerCase().includes('pin,pin name') || 
          line.toLowerCase().includes('pin,signal') ||
          columns.some(col => col.toLowerCase().trim() === 'pin')) {
        headerLineIndex = i;
        console.log(`✅ Found header at line ${i}:`, line);
        break;
      }
    }

    const headerLine = dataLines[headerLineIndex];
    const format = this.detectFormat(headerLine);
    const mapping = this.getColumnMapping(format, headerLine);
    
    console.log('🔍 Format:', format);
    console.log('🔍 Mapping:', mapping);
    
    const pins: Pin[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Process data lines (skip header and any lines before it)
    const startIndex = headerLineIndex + 1;
    
    for (let i = startIndex; i < dataLines.length; i++) {
      const line = dataLines[i];
      
      // Skip empty lines or lines with only commas
      if (!line || line.replace(/,/g, '').trim() === '') {
        continue;
      }
      
      const columns = this.parseCSVLine(line);
      
      try {
        const pin = this.parsePin(columns, mapping, i + 1);
        if (pin) {
          pins.push(pin);
        }
      } catch (error) {
        console.warn(`Line ${i + 1}: ${(error as Error).message}`);
        // Don't add to errors array, just log as warning
      }
    }

    console.log(`✅ Parsed ${pins.length} pins successfully`);

    return {
      success: pins.length > 0,  // Success if we found any pins
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
    
    const findColumn = (searchTerms: string[]): number => {
      for (const term of searchTerms) {
        const index = headers.findIndex(h => h.includes(term.toLowerCase()));
        if (index !== -1) return index;
      }
      return -1;
    };

    return {
      pin: findColumn(['pin', 'pin_number', 'pin number']),
      pinName: findColumn(['pin name', 'pin_name', 'name']),
      signalName: findColumn(['signal', 'signal_name', 'net']),
      direction: findColumn(['direction', 'dir', 'type']),
      voltage: findColumn(['voltage', 'volt', 'io_standard']),
      bank: findColumn(['bank', 'bank_number']),
      memoryByteGroup: findColumn(['memory byte group', 'byte_group', 'mbg']),
      ioType: findColumn(['i/o type', 'io_type', 'type']),
    };
  }

  private static parsePin(columns: string[], mapping: ColumnMapping, lineNumber: number): Pin | null {
    if (columns.length === 0) return null;

    // Check if pin column exists and has valid data
    if (mapping.pin === -1 || !columns[mapping.pin]) {
      console.warn(`Line ${lineNumber}: Pin column not found or empty`);
      return null;
    }

    const pinNumber = columns[mapping.pin]?.trim();
    if (!pinNumber || pinNumber === 'NA' || pinNumber === '') {
      console.warn(`Line ${lineNumber}: Invalid pin number "${pinNumber}"`);
      return null;
    }

    // Validate pin number format - should be alphanumeric (like A1, B12, etc.)
    // Reject obvious metadata or invalid pin numbers
    if (pinNumber.toLowerCase().includes('device') ||
        pinNumber.toLowerCase().includes('package') ||
        pinNumber.toLowerCase().includes('total') ||
        pinNumber.toLowerCase().includes('number') ||
        pinNumber.length > 10 ||  // Pin numbers shouldn't be too long
        /[^A-Za-z0-9]/.test(pinNumber)) {  // Only allow alphanumeric characters
      console.warn(`Line ${lineNumber}: Invalid pin number format "${pinNumber}"`);
      return null;
    }

    const pinName = columns[mapping.pinName]?.trim() || pinNumber;
    const gridPosition = this.parseGridPosition(pinNumber);
    
    // Skip pins with invalid grid positions
    if (!gridPosition) {
      console.warn(`Line ${lineNumber}: Could not parse grid position for pin "${pinNumber}"`);
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
      const gridPos = {
        row: match[1],
        col: parseInt(match[2], 10),
      };
      
      // Debug specific pins to understand the parsing issue
      if (pinNumber === 'J3' || pinNumber === 'J4' || pinNumber === 'A1' || pinNumber === 'B1' || pinNumber === 'D2') {
        console.log(`🔍 parseGridPosition(${pinNumber}):`, gridPos);
      }
      
      return gridPos;
    }
    
    // Return null for invalid pin numbers instead of fallback
    console.warn(`⚠️ Could not parse pin number: ${pinNumber}`);
    return null;
  }

  private static gridToPosition(grid: GridPosition): Position {
    // Convert grid position to pixel coordinates that exactly match grid labels
    // This ensures perfect alignment with the visual grid system
    
    const rowOffset = grid.row.charCodeAt(0) - 'A'.charCodeAt(0);
    
    // Tile spacing parameters - ensure tiles fit properly
    const tileSize = 88; // Tile size from PackageCanvas
    const gridSpacing = tileSize; // Exact spacing to prevent overlap
    
    // Use exact grid positioning without jitter for perfect alignment
    // Grid coordinates start from (0,0) for A1
    const x = (grid.col - 1) * gridSpacing;
    const y = rowOffset * gridSpacing;
    
    const position = { x: Math.round(x), y: Math.round(y) };
    
    // Debug output for verification
    console.log(`� Grid ${grid.row}${grid.col} → Position (${position.x}, ${position.y})`);
    
    return position;
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

    // Calculate dimensions from pin positions
    const maxRow = Math.max(...pins.map(p => p.gridPosition.row.charCodeAt(0) - 'A'.charCodeAt(0))) + 1;
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
