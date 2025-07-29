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

    // Skip comment lines and license headers
    const dataLines = lines.filter(line => 
      !line.startsWith('#') && 
      !line.startsWith('//') &&
      !line.toLowerCase().includes('copyright') &&
      !line.toLowerCase().includes('license')
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

    const format = this.detectFormat(dataLines[0]);
    const mapping = this.getColumnMapping(format, dataLines[0]);
    
    const pins: Pin[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    // Process data lines (skip header if present)
    const startIndex = format.hasHeader ? 1 : 0;
    
    for (let i = startIndex; i < dataLines.length; i++) {
      const line = dataLines[i];
      const columns = this.parseCSVLine(line);
      
      try {
        const pin = this.parsePin(columns, mapping, i + 1);
        if (pin) {
          pins.push(pin);
        }
      } catch (error) {
        errors.push(`Line ${i + 1}: ${(error as Error).message}`);
      }
    }

    return {
      success: errors.length === 0,
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

  private static getColumnMapping(format: CSVFormat, headerLine: string): ColumnMapping {
    const headers = this.parseCSVLine(headerLine).map(h => h.trim().toLowerCase());
    
    const findColumn = (searchTerms: string[]): number => {
      for (const term of searchTerms) {
        const index = headers.findIndex(h => h.includes(term.toLowerCase()));
        if (index !== -1) return index;
      }
      return -1;
    };

    return {
      pin: Math.max(0, findColumn(['pin', 'pin_number', 'pin number'])),
      pinName: Math.max(0, findColumn(['pin name', 'pin_name', 'name'])),
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

    const pinNumber = columns[mapping.pin]?.trim();
    if (!pinNumber) {
      throw new Error(`Missing pin number`);
    }

    const pinName = columns[mapping.pinName]?.trim() || pinNumber;
    const gridPosition = this.parseGridPosition(pinNumber);
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

  private static parseGridPosition(pinNumber: string): GridPosition {
    const match = pinNumber.match(/^([A-Z]+)(\d+)$/);
    if (match) {
      return {
        row: match[1],
        col: parseInt(match[2], 10),
      };
    }
    
    // Fallback for unusual pin numbering
    return {
      row: 'A',
      col: 1,
    };
  }

  private static gridToPosition(grid: GridPosition): Position {
    // Convert grid position to pixel coordinates
    // This is a simplified conversion - real implementation would depend on package layout
    const rowOffset = grid.row.charCodeAt(0) - 'A'.charCodeAt(0);
    return {
      x: grid.col * 20, // 20px spacing
      y: rowOffset * 20,
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
