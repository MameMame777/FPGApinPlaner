/**
 * Debug utility for development logging
 * Logs are only shown in development environment
 */

// Development mode detection
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     (typeof window !== 'undefined' && window.location.hostname === 'localhost');

// Debug categories for better organization
export enum DebugCategory {
  SELECTION = '🎯',
  CHECKBOX = '☑️', 
  RANGE = '📋',
  BULK_EDIT = '🔧',
  PIN_RENDER = '📌',
  STORE = '🏪',
  EXPORT = '📤',
  IMPORT = '📥',
  PERFORMANCE = '⚡',
  ERROR = '❌',
  WARNING = '⚠️',
  SUCCESS = '✅'
}

/**
 * Conditional debug logger that only logs in development
 */
export const debug = {
  log: (category: DebugCategory, message: string, data?: any) => {
    if (!isDevelopment) return;
    
    if (data !== undefined) {
      console.log(`${category} ${message}`, data);
    } else {
      console.log(`${category} ${message}`);
    }
  },

  warn: (category: DebugCategory, message: string, data?: any) => {
    if (!isDevelopment) return;
    
    if (data !== undefined) {
      console.warn(`${category} ${message}`, data);
    } else {
      console.warn(`${category} ${message}`);
    }
  },

  error: (category: DebugCategory, message: string, error?: any) => {
    if (!isDevelopment) return;
    
    if (error !== undefined) {
      console.error(`${category} ${message}`, error);
    } else {
      console.error(`${category} ${message}`);
    }
  },

  group: (category: DebugCategory, title: string, fn: () => void) => {
    if (!isDevelopment) return;
    
    console.group(`${category} ${title}`);
    fn();
    console.groupEnd();
  },

  time: (label: string) => {
    if (!isDevelopment) return;
    console.time(label);
  },

  timeEnd: (label: string) => {
    if (!isDevelopment) return;
    console.timeEnd(label);
  }
};

/**
 * Performance monitoring utility
 */
export const perf = {
  mark: (name: string) => {
    if (!isDevelopment) return;
    performance.mark(name);
  },

  measure: (name: string, startMark: string, endMark?: string) => {
    if (!isDevelopment) return;
    try {
      if (endMark) {
        performance.measure(name, startMark, endMark);
      } else {
        performance.measure(name, startMark);
      }
      const measurement = performance.getEntriesByName(name)[0];
      debug.log(DebugCategory.PERFORMANCE, `${name}: ${measurement.duration.toFixed(2)}ms`);
    } catch (error) {
      debug.error(DebugCategory.ERROR, `Performance measurement failed: ${name}`, error);
    }
  }
};

/**
 * Feature flag for enabling/disabling specific debug categories
 */
export const debugFlags = {
  SELECTION: true,
  CHECKBOX: true,
  RANGE: true,
  BULK_EDIT: true,
  PIN_RENDER: false, // Usually too verbose
  STORE: true,
  EXPORT: true,
  IMPORT: true,
  PERFORMANCE: true
};

/**
 * Conditional debug logger with feature flags
 */
export const debugIf = (flag: keyof typeof debugFlags, category: DebugCategory, message: string, data?: any) => {
  if (!isDevelopment || !debugFlags[flag]) return;
  debug.log(category, message, data);
};
