import { Pin } from '@/types';

export interface ArrayPatternConfig {
  baseName: string;          // "DATA"
  startIndex: number;        // 0
  endIndex: number;          // 31
  indexFormat: string;       // "[{i}]", "_{i}", "{i}", etc.
  padding: number;           // 0 = no padding, 2 = "01", "02", etc.
  step: number;              // 1 = sequential, 2 = every other, etc.
}

export interface DifferentialPatternConfig {
  baseName: string;          // "CLK"
  positiveFormat: string;    // "_P", "+", "_DIFF_P", etc.
  negativeFormat: string;    // "_N", "-", "_DIFF_N", etc.
  startIndex?: number;       // Optional for numbered pairs
  endIndex?: number;
  indexFormat?: string;      // For numbered diff pairs: "CLK{i}_P"
  padding?: number;
}

export interface BatchOperationResult {
  success: boolean;
  processedPins: number;
  skippedPins: number;
  errors: string[];
  assignments: Array<{
    pinId: string;
    pinNumber: string;
    oldSignal?: string;
    newSignal: string;
  }>;
}

export interface PinSelectionCriteria {
  pinTypes?: string[];       // ["IO", "CLOCK"]
  banks?: string[];         // ["14", "15"]
  voltages?: string[];      // ["1.8V", "3.3V"]
  assignmentStatus?: 'assigned' | 'unassigned' | 'any';
  pinNumberPattern?: string; // Regex pattern for pin numbers
  gridRange?: {
    rowStart?: string;       // "A"
    rowEnd?: string;         // "Z"
    colStart?: number;       // 1
    colEnd?: number;         // 50
  };
}

export class BatchOperationService {
  /**
   * Array pattern assignment (DATA[0:31])
   */
  static assignArrayPattern(
    pins: Pin[],
    config: ArrayPatternConfig
  ): BatchOperationResult {
    const result: BatchOperationResult = {
      success: true,
      processedPins: 0,
      skippedPins: 0,
      errors: [],
      assignments: []
    };

    try {
      // Validate configuration
      if (!config.baseName.trim()) {
        throw new Error('Base name is required');
      }
      
      if (config.startIndex > config.endIndex) {
        throw new Error('Start index must be less than or equal to end index');
      }

      const totalIndices = Math.floor((config.endIndex - config.startIndex) / config.step) + 1;
      
      if (pins.length < totalIndices) {
        result.errors.push(`Not enough pins selected. Need ${totalIndices} pins, got ${pins.length}`);
      }

      // Generate signal names
      const signals: string[] = [];
      for (let i = config.startIndex; i <= config.endIndex; i += config.step) {
        const paddedIndex = config.padding > 0 ? 
          i.toString().padStart(config.padding, '0') : 
          i.toString();
        
        const signalName = config.indexFormat
          .replace('{i}', paddedIndex)
          .replace('{index}', paddedIndex);
        
        signals.push(config.baseName + signalName);
      }

      // Assign signals to pins
      for (let pinIndex = 0; pinIndex < Math.min(pins.length, signals.length); pinIndex++) {
        const pin = pins[pinIndex];
        const newSignal = signals[pinIndex];
        
        // Check if pin is assignable
        if (pin.pinType && ['POWER', 'GROUND', 'NC'].includes(pin.pinType)) {
          result.skippedPins++;
          result.errors.push(`Skipped ${pin.pinNumber}: Cannot assign to ${pin.pinType} pin`);
          continue;
        }

        result.assignments.push({
          pinId: pin.id,
          pinNumber: pin.pinNumber,
          oldSignal: pin.signalName,
          newSignal: newSignal
        });
        
        result.processedPins++;
      }

      // Handle remaining pins if more pins than signals
      if (pins.length > signals.length) {
        result.skippedPins += pins.length - signals.length;
        result.errors.push(`${pins.length - signals.length} pins skipped: More pins selected than pattern indices`);
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
    }

    return result;
  }

  /**
   * Differential pair pattern assignment
   */
  static assignDifferentialPattern(
    pins: Pin[],
    config: DifferentialPatternConfig
  ): BatchOperationResult {
    const result: BatchOperationResult = {
      success: true,
      processedPins: 0,
      skippedPins: 0,
      errors: [],
      assignments: []
    };

    try {
      // Validate configuration
      if (!config.baseName.trim()) {
        throw new Error('Base name is required');
      }
      
      if (!config.positiveFormat || !config.negativeFormat) {
        throw new Error('Both positive and negative formats are required');
      }

      // Check if we have even number of pins for differential pairs
      if (pins.length % 2 !== 0) {
        result.errors.push(`Warning: Odd number of pins (${pins.length}). Last pin will be skipped.`);
      }

      const pairCount = Math.floor(pins.length / 2);
      
      // Generate differential pair names
      for (let pairIndex = 0; pairIndex < pairCount; pairIndex++) {
        const positivePin = pins[pairIndex * 2];
        const negativePin = pins[pairIndex * 2 + 1];

        // Skip non-assignable pins
        const skipPositive = positivePin.pinType && ['POWER', 'GROUND', 'NC'].includes(positivePin.pinType);
        const skipNegative = negativePin.pinType && ['POWER', 'GROUND', 'NC'].includes(negativePin.pinType);

        if (skipPositive || skipNegative) {
          result.skippedPins += 2;
          result.errors.push(`Skipped pair ${positivePin.pinNumber}/${negativePin.pinNumber}: Cannot assign to ${positivePin.pinType}/${negativePin.pinType} pins`);
          continue;
        }

        // Generate signal names
        let baseName = config.baseName;
        if (config.indexFormat && config.startIndex !== undefined) {
          const index = (config.startIndex || 0) + pairIndex;
          const paddedIndex = config.padding && config.padding > 0 ? 
            index.toString().padStart(config.padding, '0') : 
            index.toString();
          
          baseName = config.indexFormat.replace('{i}', paddedIndex).replace('{index}', paddedIndex);
          baseName = config.baseName + baseName;
        }

        const positiveSignal = baseName + config.positiveFormat;
        const negativeSignal = baseName + config.negativeFormat;

        result.assignments.push({
          pinId: positivePin.id,
          pinNumber: positivePin.pinNumber,
          oldSignal: positivePin.signalName,
          newSignal: positiveSignal
        });

        result.assignments.push({
          pinId: negativePin.id,
          pinNumber: negativePin.pinNumber,
          oldSignal: negativePin.signalName,
          newSignal: negativeSignal
        });

        result.processedPins += 2;
      }

      // Handle odd pin
      if (pins.length % 2 !== 0) {
        result.skippedPins++;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
    }

    return result;
  }

  /**
   * Filter pins by criteria for large-scale operations
   */
  static filterPinsByCriteria(
    allPins: Pin[],
    criteria: PinSelectionCriteria
  ): Pin[] {
    return allPins.filter(pin => {
      // Pin type filter
      if (criteria.pinTypes && criteria.pinTypes.length > 0) {
        if (!pin.pinType || !criteria.pinTypes.includes(pin.pinType)) {
          return false;
        }
      }

      // Bank filter
      if (criteria.banks && criteria.banks.length > 0) {
        if (!pin.bank || !criteria.banks.includes(pin.bank)) {
          return false;
        }
      }

      // Voltage filter
      if (criteria.voltages && criteria.voltages.length > 0) {
        if (!pin.voltage || !criteria.voltages.includes(pin.voltage)) {
          return false;
        }
      }

      // Assignment status filter
      if (criteria.assignmentStatus) {
        const isAssigned = pin.signalName && pin.signalName.trim() !== '';
        if (criteria.assignmentStatus === 'assigned' && !isAssigned) {
          return false;
        }
        if (criteria.assignmentStatus === 'unassigned' && isAssigned) {
          return false;
        }
      }

      // Pin number pattern filter
      if (criteria.pinNumberPattern) {
        try {
          const regex = new RegExp(criteria.pinNumberPattern);
          if (!regex.test(pin.pinNumber)) {
            return false;
          }
        } catch {
          // Invalid regex, skip this filter
        }
      }

      // Grid range filter
      if (criteria.gridRange && pin.gridPosition) {
        const { rowStart, rowEnd, colStart, colEnd } = criteria.gridRange;
        
        if (rowStart && pin.gridPosition.row < rowStart) return false;
        if (rowEnd && pin.gridPosition.row > rowEnd) return false;
        if (colStart && pin.gridPosition.col < colStart) return false;
        if (colEnd && pin.gridPosition.col > colEnd) return false;
      }

      return true;
    });
  }

  /**
   * Bulk clear signal assignments
   */
  static clearSignals(pins: Pin[]): BatchOperationResult {
    const result: BatchOperationResult = {
      success: true,
      processedPins: 0,
      skippedPins: 0,
      errors: [],
      assignments: []
    };

    try {
      for (const pin of pins) {
        if (pin.signalName && pin.signalName.trim() !== '') {
          result.assignments.push({
            pinId: pin.id,
            pinNumber: pin.pinNumber,
            oldSignal: pin.signalName,
            newSignal: ''
          });
          result.processedPins++;
        } else {
          result.skippedPins++;
        }
      }
    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
    }

    return result;
  }

  /**
   * Validate batch operation before execution
   */
  static validateBatchOperation(pins: Pin[], operation: 'array' | 'differential'): string[] {
    const errors: string[] = [];

    if (pins.length === 0) {
      errors.push('No pins selected for batch operation');
      return errors;
    }

    // Check for performance considerations on large datasets
    if (pins.length > 1000) {
      errors.push(`Warning: Large dataset (${pins.length} pins). Operation may take some time.`);
    }

    // Check for mixed pin types
    const pinTypes = new Set(pins.map(p => p.pinType).filter(Boolean));
    if (pinTypes.size > 1 && (pinTypes.has('POWER') || pinTypes.has('GROUND'))) {
      errors.push('Warning: Selection includes power/ground pins which cannot be assigned signals');
    }

    // Differential pair specific validation
    if (operation === 'differential') {
      if (pins.length < 2) {
        errors.push('At least 2 pins required for differential pair assignment');
      }
      
      // Check if pins are in same bank (recommended for differential pairs)
      const banks = new Set(pins.map(p => p.bank).filter(Boolean));
      if (banks.size > 1) {
        errors.push('Warning: Differential pairs should typically be in the same bank');
      }
    }

    return errors;
  }

  /**
   * Generate preview of batch operation results
   */
  static previewBatchOperation(
    pins: Pin[],
    config: ArrayPatternConfig | DifferentialPatternConfig,
    operation: 'array' | 'differential'
  ): Array<{ pinNumber: string; currentSignal: string; newSignal: string }> {
    try {
      let result: BatchOperationResult;
      
      if (operation === 'array') {
        result = this.assignArrayPattern(pins, config as ArrayPatternConfig);
      } else {
        result = this.assignDifferentialPattern(pins, config as DifferentialPatternConfig);
      }

      return result.assignments.map(assignment => ({
        pinNumber: assignment.pinNumber,
        currentSignal: assignment.oldSignal || '',
        newSignal: assignment.newSignal
      }));
    } catch {
      return [];
    }
  }
}
