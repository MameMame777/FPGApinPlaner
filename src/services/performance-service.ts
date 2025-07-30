// Performance optimization utilities for FPGA Pin Planner
import { Pin } from '@/types';

export class PerformanceService {
  private static renderMetrics = new Map<string, number>();
  private static frameCount = 0;
  private static lastFrameTime = performance.now();

  // Virtualization for large pin lists
  static createVirtualizedPinList(pins: Pin[], containerHeight: number, itemHeight: number) {
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 5; // Buffer items
    
    return {
      getVisibleRange: (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, pins.length);
        return { startIndex, endIndex };
      },
      
      getVisiblePins: (scrollTop: number) => {
        const startIndex = Math.floor(scrollTop / itemHeight);
        const endIndex = Math.min(startIndex + visibleCount, pins.length);
        const { startIndex: calculatedStart, endIndex: calculatedEnd } = { startIndex, endIndex };
        return pins.slice(calculatedStart, calculatedEnd).map((pin, index) => ({
          pin,
          index: calculatedStart + index,
          top: (calculatedStart + index) * itemHeight,
        }));
      },
      
      getTotalHeight: () => pins.length * itemHeight,
    };
  }

  // Debounced search for better performance
  static createDebouncedSearch<T>(
    searchFn: (query: string) => T[],
    delay: number = 300
  ) {
    let timeoutId: NodeJS.Timeout;
    let lastResults: T[] = [];

    return {
      search: (query: string): Promise<T[]> => {
        return new Promise((resolve) => {
          clearTimeout(timeoutId);
          
          if (!query.trim()) {
            resolve([]);
            return;
          }

          timeoutId = setTimeout(() => {
            lastResults = searchFn(query);
            resolve(lastResults);
          }, delay);
        });
      },
      
      getLastResults: () => lastResults,
      
      cancel: () => {
        clearTimeout(timeoutId);
      }
    };
  }

  // Canvas rendering optimization
  static optimizeCanvasRendering() {
    return {
      // Level-of-Detail rendering based on zoom
      getLODLevel: (zoom: number) => {
        if (zoom < 0.3) return 'ultra-low';
        if (zoom < 0.6) return 'low';
        if (zoom < 1.2) return 'medium';
        if (zoom < 2.5) return 'high';
        return 'ultra-high';
      },

      // Culling for off-screen pins
      cullPins: (pins: Pin[], viewport: { x: number, y: number, width: number, height: number, scale: number }) => {
        const margin = 100; // Extra margin for smooth scrolling
        const visibleArea = {
          left: viewport.x - margin,
          right: viewport.x + viewport.width + margin,
          top: viewport.y - margin,
          bottom: viewport.y + viewport.height + margin,
        };

        return pins.filter(pin => {
          const scaledX = pin.position.x * viewport.scale;
          const scaledY = pin.position.y * viewport.scale;
          
          return scaledX >= visibleArea.left && 
                 scaledX <= visibleArea.right &&
                 scaledY >= visibleArea.top && 
                 scaledY <= visibleArea.bottom;
        });
      },

      // Batch DOM updates
      batchDOMUpdates: (updates: Array<() => void>) => {
        requestAnimationFrame(() => {
          updates.forEach(update => update());
        });
      },
    };
  }

  // Memory optimization
  static createPinIndexes(pins: Pin[]) {
    const byId = new Map<string, Pin>();
    const byPinNumber = new Map<string, Pin>();
    const bySignalName = new Map<string, Pin[]>();
    const byBank = new Map<string, Pin[]>();
    const byPinType = new Map<string, Pin[]>();

    pins.forEach(pin => {
      byId.set(pin.id, pin);
      byPinNumber.set(pin.pinNumber, pin);
      
      // Signal name index (multiple pins can have same signal for differential pairs)
      if (pin.signalName) {
        if (!bySignalName.has(pin.signalName)) {
          bySignalName.set(pin.signalName, []);
        }
        bySignalName.get(pin.signalName)!.push(pin);
      }
      
      // Bank index
      if (pin.bank) {
        if (!byBank.has(pin.bank)) {
          byBank.set(pin.bank, []);
        }
        byBank.get(pin.bank)!.push(pin);
      }
      
      // Pin type index
      if (!byPinType.has(pin.pinType)) {
        byPinType.set(pin.pinType, []);
      }
      byPinType.get(pin.pinType)!.push(pin);
    });

    return {
      byId,
      byPinNumber,
      bySignalName,
      byBank,
      byPinType,
      
      // Fast lookup methods
      findById: (id: string) => byId.get(id),
      findByPinNumber: (pinNumber: string) => byPinNumber.get(pinNumber),
      findBySignalName: (signalName: string) => bySignalName.get(signalName) || [],
      findByBank: (bank: string) => byBank.get(bank) || [],
      findByPinType: (pinType: string) => byPinType.get(pinType) || [],
    };
  }

  // Performance monitoring
  static startRenderMeasurement(name: string) {
    this.renderMetrics.set(name, performance.now());
  }

  static endRenderMeasurement(name: string): number {
    const startTime = this.renderMetrics.get(name);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    this.renderMetrics.delete(name);
    return duration;
  }

  static trackFrameRate() {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFrameTime >= 1000) {
      const fps = this.frameCount / ((now - this.lastFrameTime) / 1000);
      this.frameCount = 0;
      this.lastFrameTime = now;
      return fps;
    }
    
    return null;
  }

  // Efficient filtering with early termination
  static createSmartFilter<T>(items: T[]) {
    return {
      filter: (predicates: Array<(item: T) => boolean>, maxResults?: number) => {
        const results: T[] = [];
        
        for (const item of items) {
          // Early termination if max results reached
          if (maxResults && results.length >= maxResults) {
            break;
          }
          
          // Apply all predicates - fail fast
          let matches = true;
          for (const predicate of predicates) {
            if (!predicate(item)) {
              matches = false;
              break;
            }
          }
          
          if (matches) {
            results.push(item);
          }
        }
        
        return results;
      }
    };
  }

  // Efficient pin search with ranking
  static createPinSearchRanker() {
    return {
      rankPins: (pins: Pin[], query: string): Array<{pin: Pin, score: number}> => {
        const normalizedQuery = query.toLowerCase();
        const results: Array<{pin: Pin, score: number}> = [];
        
        pins.forEach(pin => {
          let score = 0;
          
          // Exact pin number match gets highest score
          if (pin.pinNumber.toLowerCase() === normalizedQuery) {
            score += 100;
          } else if (pin.pinNumber.toLowerCase().startsWith(normalizedQuery)) {
            score += 80;
          } else if (pin.pinNumber.toLowerCase().includes(normalizedQuery)) {
            score += 40;
          }
          
          // Signal name matching
          if (pin.signalName && pin.signalName.toLowerCase().includes(normalizedQuery)) {
            score += 60;
          }
          
          // Pin name matching
          if (pin.pinName.toLowerCase().includes(normalizedQuery)) {
            score += 30;
          }
          
          // Bank matching
          if (pin.bank && pin.bank.toLowerCase().includes(normalizedQuery)) {
            score += 20;
          }
          
          if (score > 0) {
            results.push({ pin, score });
          }
        });
        
        return results.sort((a, b) => b.score - a.score);
      }
    };
  }
}
