/**
 * FPGA pin configuration constants
 */

// Voltage levels supported by FPGAs
export const VOLTAGE_LEVELS = [
  '1.0V',  // Core voltage
  '1.2V',  // Low voltage I/O
  '1.5V',  // Low voltage I/O
  '1.8V',  // Low voltage I/O (common)
  '2.5V',  // Medium voltage I/O
  '3.3V',  // Standard voltage I/O (most common)
  '5.0V'   // Legacy voltage I/O (rare)
] as const;

// I/O Standards for Xilinx FPGAs
export const IO_STANDARDS = [
  // LVCMOS Standards
  'LVCMOS12',   // 1.2V LVCMOS
  'LVCMOS15',   // 1.5V LVCMOS
  'LVCMOS18',   // 1.8V LVCMOS
  'LVCMOS25',   // 2.5V LVCMOS
  'LVCMOS33',   // 3.3V LVCMOS (most common)
  
  // LVTTL Standards
  'LVTTL',      // 3.3V LVTTL
  
  // Differential Standards
  'LVDS_25',    // Low Voltage Differential Signaling
  'RSDS_25',    // Reduced Swing Differential Signaling
  'BLVDS_25',   // Bus Low Voltage Differential Signaling
  'MINI_LVDS_25', // Mini Low Voltage Differential Signaling
  
  // High Performance Standards
  'SSTL135',    // Stub Series Terminated Logic 1.35V
  'SSTL15',     // Stub Series Terminated Logic 1.5V
  'SSTL18_I',   // Stub Series Terminated Logic 1.8V Class I
  'SSTL18_II',  // Stub Series Terminated Logic 1.8V Class II
  
  // Memory Standards
  'POD10',      // Pseudo Open Drain 1.0V
  'POD12',      // Pseudo Open Drain 1.2V
  'POD135',     // Pseudo Open Drain 1.35V
  
  // Special Standards
  'HSTL_I',     // High Speed Transceiver Logic Class I
  'HSTL_II',    // High Speed Transceiver Logic Class II
  'HSTL_I_18',  // High Speed Transceiver Logic 1.8V Class I
  'HSTL_II_18', // High Speed Transceiver Logic 1.8V Class II
  
  // Auto-detect based on voltage
  'AUTO'        // Automatically determine based on voltage
] as const;

// Default I/O standard for each voltage level
export const DEFAULT_IO_STANDARD_MAP: Record<string, string> = {
  '1.0V': 'POD10',
  '1.2V': 'LVCMOS12',
  '1.5V': 'LVCMOS15',
  '1.8V': 'LVCMOS18',
  '2.5V': 'LVCMOS25',
  '3.3V': 'LVCMOS33',
  '5.0V': 'LVTTL'
};

// Compatible I/O standards for each voltage level
export const COMPATIBLE_IO_STANDARDS: Record<string, string[]> = {
  '1.0V': ['POD10'],
  '1.2V': ['LVCMOS12', 'POD12', 'SSTL135'],
  '1.5V': ['LVCMOS15', 'SSTL15', 'HSTL_I', 'HSTL_II'],
  '1.8V': ['LVCMOS18', 'SSTL18_I', 'SSTL18_II', 'HSTL_I_18', 'HSTL_II_18'],
  '2.5V': ['LVCMOS25', 'LVDS_25', 'RSDS_25', 'BLVDS_25', 'MINI_LVDS_25'],
  '3.3V': ['LVCMOS33', 'LVTTL'],
  '5.0V': ['LVTTL']
};

// Drive strength options (in mA)
export const DRIVE_STRENGTHS = [
  2, 4, 6, 8, 12, 16, 20, 24
] as const;

// Slew rate options
export const SLEW_RATES = [
  'SLOW',
  'FAST'
] as const;

// Termination options
export const TERMINATION_OPTIONS = [
  'NONE',
  'UNTUNED_SPLIT_40',
  'UNTUNED_SPLIT_50',
  'UNTUNED_SPLIT_60'
] as const;

/**
 * Get compatible I/O standards for a given voltage
 */
export function getCompatibleIOStandards(voltage: string): string[] {
  return COMPATIBLE_IO_STANDARDS[voltage] || ['LVCMOS33'];
}

/**
 * Get default I/O standard for a given voltage
 */
export function getDefaultIOStandard(voltage: string): string {
  return DEFAULT_IO_STANDARD_MAP[voltage] || 'LVCMOS33';
}

/**
 * Check if an I/O standard is compatible with a voltage
 */
export function isIOStandardCompatible(voltage: string, ioStandard: string): boolean {
  if (ioStandard === 'AUTO') return true;
  const compatible = COMPATIBLE_IO_STANDARDS[voltage] || [];
  return compatible.includes(ioStandard);
}

/**
 * Get voltage level from I/O standard
 */
export function getVoltageFromIOStandard(ioStandard: string): string {
  const voltageMap: Record<string, string> = {
    'LVCMOS12': '1.2V',
    'LVCMOS15': '1.5V',
    'LVCMOS18': '1.8V',
    'LVCMOS25': '2.5V',
    'LVCMOS33': '3.3V',
    'LVTTL': '3.3V',
    'POD10': '1.0V',
    'POD12': '1.2V',
    'POD135': '1.35V',
    'SSTL135': '1.35V',
    'SSTL15': '1.5V',
    'SSTL18_I': '1.8V',
    'SSTL18_II': '1.8V',
    'HSTL_I': '1.5V',
    'HSTL_II': '1.5V',
    'HSTL_I_18': '1.8V',
    'HSTL_II_18': '1.8V',
    'LVDS_25': '2.5V',
    'RSDS_25': '2.5V',
    'BLVDS_25': '2.5V',
    'MINI_LVDS_25': '2.5V'
  };
  
  return voltageMap[ioStandard] || '3.3V';
}
