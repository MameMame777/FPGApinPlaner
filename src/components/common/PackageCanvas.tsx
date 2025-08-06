import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Pin, Package } from '@/types';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';
import { rowToIndex, indexToRow } from '@/utils/grid-utils';
import { LODSystem } from '@/utils/LODSystem';
import { PerformanceService } from '@/services/performance-service';
import { useAppStore } from '@/stores/app-store';

// Header Bar Component for displaying information in the red frame area
const HeaderBar: React.FC<{ fileName: string; viewInfo: string }> = ({ fileName, viewInfo }) => (
  <div
    style={{
      width: '100%',
      height: '32px',
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'flex-start',
      padding: '0 16px',
      position: 'relative',
      zIndex: 2,
      color: '#e0e0e0',
      fontSize: '12px',
      fontWeight: 500,
      boxSizing: 'border-box',
      borderBottom: '1px solid #333'
    }}
  >
    <span style={{ transform: 'translateY(-2px)' }}>{viewInfo}</span>
    <span style={{ transform: 'translateY(-2px)', marginLeft: '360px' }}>{fileName}</span>
  </div>
);

interface PackageCanvasProps {
  package: Package | null;
  pins: Pin[];
  selectedPins: Set<string>;
  onPinSelect: (pinId: string) => void;
  onPinDoubleClick: (pinId: string) => void;
  zoom: number;
  rotation: number;
  isTopView: boolean;
  onZoomChange?: (zoom: number) => void;
  resetTrigger?: number; // Counter to force reset even when zoom is already 100%
}

const PackageCanvas: React.FC<PackageCanvasProps> = ({
  package: pkg,
  pins,
  selectedPins,
  onPinSelect,
  onPinDoubleClick,
  zoom,
  rotation,
  isTopView,
  onZoomChange,
  resetTrigger = 0
}) => {
  const { togglePinSelection, selectPins } = useAppStore();
  const stageRef = useRef<any>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For debouncing resize - Issue #14
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
  // Last selected pin for shift-click range selection
  const [lastSelectedPinId, setLastSelectedPinId] = useState<string | null>(null);
  
  // Viewport management for pan and zoom
  const [viewport, setViewport] = useState({
    x: 0,
    y: 0,
    scale: 1
  });
  
  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  const [mouseDownTime, setMouseDownTime] = useState(0);
  const [mouseDownPosition, setMouseDownPosition] = useState({ x: 0, y: 0 });
  
  // LOD System integration
  const currentLOD = LODSystem.getLODLevel(viewport.scale);
  
  // Performance-optimized pin indexing and culling
  const pinIndexes = useMemo(() => {
    PerformanceService.startRenderMeasurement('pin-indexing');
    const indexes = PerformanceService.createPinIndexes(pins);
    const duration = PerformanceService.endRenderMeasurement('pin-indexing');
    console.log(`📊 Pin indexing took ${duration.toFixed(2)}ms`);
    return indexes;
  }, [pins]);
  
  // Smart viewport culling based on user use cases
  const visiblePins = useMemo(() => {
    PerformanceService.startRenderMeasurement('viewport-culling');
    
    // Calculate current viewport bounds (zero margins for maximum viewer area - Issue #14)
    const canvasWidth = stageSize.width; // Use full viewer area - no margins
    const canvasHeight = stageSize.height; // Use full viewer area - no margins
    const viewportBounds = {
      x: -viewport.x / viewport.scale - canvasWidth / (2 * viewport.scale),
      y: -viewport.y / viewport.scale - canvasHeight / (2 * viewport.scale),
      width: canvasWidth / viewport.scale,
      height: canvasHeight / viewport.scale,
      scale: viewport.scale
    };
    
    // Use case 1: Detail view (high zoom) - show all pins in focused area + selected pins
    if (viewport.scale > 0.6) {
      const margin = 200 / viewport.scale; // Adaptive margin based on zoom
      const extendedBounds = {
        ...viewportBounds,
        x: viewportBounds.x - margin,
        y: viewportBounds.y - margin * 1.5, // Extra margin for upper rows (U, V, W)
        width: viewportBounds.width + margin * 2,
        height: viewportBounds.height + margin * 2.5 // Extra height for upper rows
      };
      
      // Always include selected pins regardless of viewport
      const selectedPinObjects = Array.from(selectedPins)
        .map(id => pinIndexes.findById(id))
        .filter(Boolean) as Pin[];
      
      const culledPins = PerformanceService.optimizeCanvasRendering().cullPins(pins, extendedBounds);
      
      // Combine culled pins with selected pins (remove duplicates)
      const allVisiblePins = new Map<string, Pin>();
      culledPins.forEach(pin => allVisiblePins.set(pin.id, pin));
      selectedPinObjects.forEach(pin => allVisiblePins.set(pin.id, pin));
      
      const result = Array.from(allVisiblePins.values());
      const duration = PerformanceService.endRenderMeasurement('viewport-culling');
      console.log(`🎯 Detail view: ${result.length}/${pins.length} pins visible (${duration.toFixed(2)}ms)`);
      return result;
    }
    
    // Use case 2: Overview mode (low zoom) - show all pins for complete overview
    else {
      // Ultra-low zoom: show ALL pins for complete overview
      if (viewport.scale <= 0.2) {
        const duration = PerformanceService.endRenderMeasurement('viewport-culling');
        console.log(`🌍 Ultra-wide overview: ${pins.length}/${pins.length} pins visible (${duration.toFixed(2)}ms)`);
        return pins; // Show all pins for complete overview
      }
      
      // Low to medium zoom: show most pins with some optimization
      else if (viewport.scale <= 0.4) {
        // Show 85% of pins - still good overview but with slight optimization
        const sampleRate = 0.85;
        const bankGroups = new Map<string, Pin[]>();
        pins.forEach(pin => {
          const bank = pin.bank || 'NA';
          if (!bankGroups.has(bank)) {
            bankGroups.set(bank, []);
          }
          bankGroups.get(bank)!.push(pin);
        });
        
        const overviewPins: Pin[] = [];
        
        // Always include all selected pins
        const selectedPinObjects = Array.from(selectedPins)
          .map(id => pinIndexes.findById(id))
          .filter(Boolean) as Pin[];
        overviewPins.push(...selectedPinObjects);
        
        // Sample from each bank proportionally
        bankGroups.forEach((bankPins) => {
          const targetCount = Math.max(1, Math.floor(bankPins.length * sampleRate));
          const step = Math.max(1, Math.floor(bankPins.length / targetCount));
          
          for (let i = 0; i < bankPins.length; i += step) {
            const pin = bankPins[i];
            if (!selectedPins.has(pin.id)) { // Avoid duplicates
              overviewPins.push(pin);
            }
          }
        });
        
        const duration = PerformanceService.endRenderMeasurement('viewport-culling');
        console.log(`🌎 Wide overview: ${overviewPins.length}/${pins.length} pins visible (${duration.toFixed(2)}ms)`);
        return overviewPins;
      }
      
      // Medium zoom: hybrid approach - viewport-aware sampling for focus areas
      else if (viewport.scale <= 0.6) {
        // Calculate visible area with generous margins for context, extra for upper rows
        const margin = 300 / viewport.scale;
        const focusArea = {
          x: viewportBounds.x - margin,
          y: viewportBounds.y - margin * 1.5, // Extra margin for upper rows (U, V, W)
          width: viewportBounds.width + margin * 2,
          height: viewportBounds.height + margin * 2.5 // Extra height for upper rows
        };
        
        // Always include all selected pins
        const selectedPinObjects = Array.from(selectedPins)
          .map(id => pinIndexes.findById(id))
          .filter(Boolean) as Pin[];
        
        // Include all pins in the focus area
        const focusPins = pins.filter(pin => 
          pin.position.x >= focusArea.x && pin.position.x <= focusArea.x + focusArea.width &&
          pin.position.y >= focusArea.y && pin.position.y <= focusArea.y + focusArea.height
        );
        
        // Sample from remaining pins for context
        const remainingPins = pins.filter(pin => 
          !focusPins.some(fp => fp.id === pin.id) && 
          !selectedPins.has(pin.id)
        );
        const sampleStep = Math.max(1, Math.floor(remainingPins.length / 200)); // Show ~200 context pins
        const contextPins = remainingPins.filter((_, index) => index % sampleStep === 0);
        
        // Combine all pin sets
        const mediumZoomPins = new Map<string, Pin>();
        selectedPinObjects.forEach(pin => mediumZoomPins.set(pin.id, pin));
        focusPins.forEach(pin => mediumZoomPins.set(pin.id, pin));
        contextPins.forEach(pin => mediumZoomPins.set(pin.id, pin));
        
        const result = Array.from(mediumZoomPins.values());
        const duration = PerformanceService.endRenderMeasurement('viewport-culling');
        console.log(`🎯 Medium zoom focus: ${result.length}/${pins.length} pins visible (focus: ${focusPins.length}, context: ${contextPins.length}, selected: ${selectedPinObjects.length}) (${duration.toFixed(2)}ms)`);
        return result;
      }
      
      // High-medium zoom: balanced view with more optimization
      else {
        // Show representative sample from each bank (original logic)
        const bankGroups = new Map<string, Pin[]>();
        pins.forEach(pin => {
          const bank = pin.bank || 'NA';
          if (!bankGroups.has(bank)) {
            bankGroups.set(bank, []);
          }
          bankGroups.get(bank)!.push(pin);
        });
        
        // Sample pins from each bank to maintain overview clarity
        const maxPinsPerBank = Math.max(10, Math.floor(800 / bankGroups.size)); // Increased from 500
        const overviewPins: Pin[] = [];
        
        bankGroups.forEach((bankPins) => {
          // Always include selected pins from this bank
          const selectedFromBank = bankPins.filter(pin => selectedPins.has(pin.id));
          overviewPins.push(...selectedFromBank);
          
          // Sample remaining pins from this bank
          const remainingSlots = maxPinsPerBank - selectedFromBank.length;
          if (remainingSlots > 0) {
            const nonSelectedPins = bankPins.filter(pin => !selectedPins.has(pin.id));
            const step = Math.max(1, Math.floor(nonSelectedPins.length / remainingSlots));
            
            for (let i = 0; i < nonSelectedPins.length && overviewPins.length - selectedFromBank.length < remainingSlots; i += step) {
              overviewPins.push(nonSelectedPins[i]);
            }
          }
        });
        
        const duration = PerformanceService.endRenderMeasurement('viewport-culling');
        console.log(`📊 Balanced overview: ${overviewPins.length}/${pins.length} pins visible (${duration.toFixed(2)}ms)`);
        return overviewPins;
      }
    }
  }, [pins, viewport, selectedPins, stageSize, pinIndexes]);
  
  // Constants for mouse interaction
  const DRAG_THRESHOLD_TIME = 200; // ms - time before starting drag (slightly longer for better UX)
  const DRAG_THRESHOLD_DISTANCE = 8; // pixels - distance before starting drag (slightly more forgiving)

  // Handle multiple pin selection with keyboard modifiers
  const handlePinSelection = (pinId: string, mouseEvent: MouseEvent) => {
    if (mouseEvent.ctrlKey || mouseEvent.metaKey) {
      // Ctrl+Click: Toggle individual pin selection
      togglePinSelection(pinId);
      setLastSelectedPinId(pinId);
    } else if (mouseEvent.shiftKey && lastSelectedPinId) {
      // Shift+Click: Range selection
      const currentIndex = pins.findIndex(p => p.id === pinId);
      const lastIndex = pins.findIndex(p => p.id === lastSelectedPinId);
      
      if (currentIndex !== -1 && lastIndex !== -1) {
        const startIndex = Math.min(currentIndex, lastIndex);
        const endIndex = Math.max(currentIndex, lastIndex);
        const rangeIds = pins.slice(startIndex, endIndex + 1).map(p => p.id);
        
        // Merge with existing selection
        const newSelection = new Set(selectedPins);
        rangeIds.forEach(id => newSelection.add(id));
        selectPins(Array.from(newSelection));
        
        // Don't update lastSelectedPinId for range selection to allow extending
      }
    } else {
      // Normal click: Single selection
      onPinSelect(pinId);
      setLastSelectedPinId(pinId);
    }
  };

  // Canvas size management - Enhanced for Issue #14: dynamic maximization support
  useEffect(() => {
    const updateCanvasSize = () => {
      const container = stageRef.current?.container();
      if (container) {
        const rect = container.getBoundingClientRect();
        // Maximum viewer area utilization: use full available space to eliminate footer area
        const newSize = {
          width: Math.max(400, rect.width), // Use full container width
          height: Math.max(300, rect.height) // Use full container height to eliminate footer
        };
        
        // Only update if size actually changed to prevent unnecessary re-renders
        setStageSize(prevSize => {
          if (prevSize.width !== newSize.width || prevSize.height !== newSize.height) {
            console.log('📐 Canvas size updated for dynamic maximization:', newSize);
            return newSize;
          }
          return prevSize;
        });
      }
    };

    // Delay initial size calculation to ensure Stage is mounted
    // VS Code webview environment may need longer initialization time
    const timeoutId = setTimeout(() => {
      updateCanvasSize();
    }, 200); // Extended delay for webview environment

    // Use ResizeObserver for responsive layout - Issue #14
    const container = stageRef.current?.container()?.parentElement;
    if (container) {
      const resizeObserver = new ResizeObserver(() => {
        // Debounce resize events
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeTimeoutRef.current = setTimeout(() => {
          updateCanvasSize();      }, 16); // ~60fps
      });

      resizeObserver.observe(container);
      
      return () => {
        clearTimeout(timeoutId);
        if (resizeTimeoutRef.current) {
          clearTimeout(resizeTimeoutRef.current);
        }
        resizeObserver.disconnect();
      };
    }
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Set initial viewport position when package is loaded with auto-fit for Issue #14
  useEffect(() => {
    if (pkg && pins.length > 0 && stageSize.width > 0 && stageSize.height > 0) {
      // Calculate optimal zoom and position to fit package in available space
      const packageDims = getPackageDimensions();
      if (packageDims) {
        const { width: pkgWidth, height: pkgHeight, centerX, centerY } = packageDims;
        
        // Calculate zoom to fit package in available space - zero margins for maximum viewer area (Issue #14)
        // Use full viewer area without any padding for complete margin elimination
        const dynamicPadding = 0; // Zero padding for maximum viewer area - Issue #14
        const availableWidth = stageSize.width - dynamicPadding * 2; // Full width
        const availableHeight = stageSize.height - dynamicPadding * 2; // Full height
        
        const scaleX = availableWidth / pkgWidth;
        const scaleY = availableHeight / pkgHeight;
        // Ensure minimum scale of 0.8 for readability, maximum of 2.0
        const optimalScale = Math.max(0.8, Math.min(scaleX, scaleY, 2.0));
        
        // Center the package in the stage with slight upward bias to show more upper rows
        const stageCenter = {
          x: stageSize.width / 2,
          y: stageSize.height / 2 + 30 // Shift down slightly to show more upper rows (U, V, W)
        };
        
        const initialPosition = {
          x: stageCenter.x - centerX * optimalScale,
          y: stageCenter.y - centerY * optimalScale,
          scale: optimalScale
        };
        
        console.log('📐 Auto-fit viewport:', initialPosition, 'for package:', pkgWidth, 'x', pkgHeight, 'scale:', optimalScale);
        setViewport(initialPosition);
      }
    }
  }, [pkg, pins.length, stageSize]);

  // Bank-based color logic for tiles
  const getBankColor = (pin: Pin) => {
    // Special handling for power/ground pins
    if (pin.pinType === 'GROUND' || pin.pinName === 'GND') {
      return '#2C2C2C'; // Dark gray for GND
    }
    if (pin.pinType === 'POWER' || pin.pinName?.includes('VCC')) {
      return '#8B4513'; // Brown for power
    }
    
    // Bank-based colors
    const bankColors = {
      '0': '#FF6B6B',      // Red - CONFIG bank
      '34': '#4ECDC4',     // Teal - HR I/O bank 34
      '35': '#45B7D1',     // Light Blue - HR I/O bank 35
      '500': '#96CEB4',    // Light Green - MIO bank 500
      '501': '#FFEAA7',    // Light Yellow - MIO bank 501
      '502': '#DDA0DD',    // Plum - DDR bank 502
      'NA': '#708090',     // Slate Gray - Non-bank pins
    };
    
    const bankKey = pin.bank || 'NA';
    return bankColors[bankKey as keyof typeof bankColors] || '#708090';
  };

  // Get circle color based on pin type (for inner circle)
  const getPinTypeColor = (pin: Pin) => {
    const typeColors = {
      IO: '#FFF',          // White for I/O
      CONFIG: '#FFD700',   // Gold for CONFIG
      POWER: '#FF4500',    // Orange Red for POWER
      GROUND: '#000',      // Black for GROUND
      MGT: '#9B4AE2',      // Purple for MGT
      CLOCK: '#FF69B4',    // Hot Pink for CLOCK
      ADC: '#00FFFF',      // Cyan for ADC
      SPECIAL: '#FF1493',  // Deep Pink for SPECIAL
      MIO: '#32CD32',      // Lime Green for MIO
      DDR: '#8A2BE2',      // Blue Violet for DDR
      NC: '#696969',       // Dim Gray for NC
      RESERVED: '#999999', // Light Gray for RESERVED
    };
    
    return typeColors[pin.pinType as keyof typeof typeColors] || '#FFF';
  };

  // Get differential pair highlight color
  const getDifferentialHighlightColor = (pin: Pin, allPins: Pin[], selectedPins: Set<string>) => {
    if (!DifferentialPairUtils.isDifferentialPin(pin)) {
      return null; // 差動ピンでない場合はハイライトしない
    }

    const pairPin = DifferentialPairUtils.findPairPin(pin, allPins);
    if (!pairPin) {
      return null; // ペアピンが見つからない場合
    }

    const isThisPinSelected = selectedPins.has(pin.id);
    const isPairPinSelected = selectedPins.has(pairPin.id);

    // 選択されたピンまたはそのペアが選択されている場合のみハイライト
    if (isThisPinSelected || isPairPinSelected) {
      const pinType = DifferentialPairUtils.getDifferentialPairType(pin.pinName) || 
                     (pin.signalName ? DifferentialPairUtils.getDifferentialPairType(pin.signalName) : null);
      
      // Enhanced colors for better visibility
      // Positive: bright red, Negative: bright orange
      return pinType === 'positive' ? '#FF3333' : '#FF9933';
    }

    return null;
  };

  // Check if pin has differential pair (for subtle indication)
  const hasDifferentialPair = (pin: Pin, allPins: Pin[]) => {
    if (!DifferentialPairUtils.isDifferentialPin(pin)) {
      return false;
    }
    const pairPin = DifferentialPairUtils.findPairPin(pin, allPins);
    return pairPin !== null;
  };

  // Calculate package dimensions based on actual grid layout
  const getPackageDimensions = () => {
    if (!pkg || pins.length === 0) {
      return { width: 600, height: 600, centerX: 300, centerY: 300, minX: 0, minY: 0, maxX: 600, maxY: 600 };
    }

    // Calculate grid bounds from pin data
    const rows = pins.map(pin => pin.gridPosition?.row).filter(Boolean);
    const cols = pins.map(pin => pin.gridPosition?.col).filter(Boolean);
    
    console.log(`🔍 Found rows: ${rows.join(', ')}`);
    
    const minRow = Math.min(...rows.map(r => rowToIndex(r!)));
    const maxRow = Math.max(...rows.map(r => rowToIndex(r!)));
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    
    console.log(`🔍 Row indices - min: ${minRow} (${indexToRow(minRow)}), max: ${maxRow} (${indexToRow(maxRow)})`);
    console.log(`🔍 Col indices - min: ${minCol}, max: ${maxCol}`);
    
    // Grid spacing matches CSV reader
    const tileSize = 88;
    const gridSpacing = tileSize;
    
    // Calculate package dimensions based on grid layout
    const gridWidth = (maxCol - minCol + 1) * gridSpacing;
    const gridHeight = (maxRow - minRow + 1) * gridSpacing;
    
    // Add zero padding for maximum viewer area - Issue #14
    const padding = 0; // Zero padding for complete margin elimination - Issue #14
    const width = gridWidth + padding * 2; // Use exact grid dimensions
    const height = gridHeight + padding * 2; // Use exact grid dimensions
    
    // Calculate grid center position
    const gridCenterX = (minCol + maxCol - 1) * gridSpacing / 2;
    const gridCenterY = (minRow + maxRow) * gridSpacing / 2;
    
    return { 
      width, 
      height, 
      centerX: gridCenterX, 
      centerY: gridCenterY, 
      minX: (minCol - 1) * gridSpacing, 
      minY: minRow * gridSpacing, 
      maxX: maxCol * gridSpacing, 
      maxY: (maxRow + 1) * gridSpacing,
      gridSpacing,
      minRow,
      maxRow,
      minCol,
      maxCol
    };
  };

  const packageDims = getPackageDimensions();

  // Package initialization logging
  useEffect(() => {
    if (pins.length > 0) {
      console.log('📦 PackageCanvas: Package loaded with', pins.length, 'pins');
    }
  }, [pins.length]);

  // Transform coordinates for pins with rotation and mirroring
  const transformPosition = (pin: Pin) => {
    let { x, y } = pin.position;
    
    // Use fixed grid spacing instead of zoom for stable layout
    // Apply rotation first (at original scale)
    if (rotation !== 0) {
      const rad = (rotation * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const newX = x * cos - y * sin;
      const newY = x * sin + y * cos;
      x = newX;
      y = newY;
    }
    
    // Apply mirroring for bottom view
    if (!isTopView) {
      x = -x;
    }
    
    // Apply viewport scaling and offset (zero margins for maximum viewer area - Issue #14)
    const canvasWidth = stageSize.width; // Use full viewer area - no margins
    const canvasHeight = stageSize.height; // Use full viewer area - no margins
    const transformedX = x * viewport.scale + viewport.x + canvasWidth / 2;
    const transformedY = y * viewport.scale + viewport.y + canvasHeight / 2;
    
    return { x: transformedX, y: transformedY };
  };

  // Apply viewport boundaries to prevent canvas from disappearing off screen
  // Updated for Issue #14: maximized display area with reduced margins
  const applyViewportBounds = (pos: { x: number; y: number }, scale: number) => {
    // Get actual content dimensions
    const packageDims = getPackageDimensions();
    const contentWidth = packageDims.width * scale;
    const contentHeight = packageDims.height * scale;
    
    // Calculate how much we can pan based on content vs stage size
    const canvasWidth = stageSize.width;
    const canvasHeight = stageSize.height;
    
    // Allow generous panning beyond content boundaries to show all pins, especially for upper rows
    const paddingX = canvasWidth * 0.5; // Allow half screen padding horizontally
    const paddingY = canvasHeight * 0.8; // Increased vertical padding for better access to upper rows
    
    // Calculate bounds that ensure content is accessible, with extra allowance for upper rows
    const minX = -(contentWidth / 2 + paddingX);
    const maxX = contentWidth / 2 + paddingX;
    const minY = -(contentHeight / 2 + paddingY * 1.5); // Extra allowance for upper rows (U, V, W)
    const maxY = contentHeight / 2 + paddingY;
    
    return {
      x: Math.max(minX, Math.min(maxX, pos.x)),
      y: Math.max(minY, Math.min(maxY, pos.y))
    };
  };

  // Mouse event handlers
  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    const scaleBy = 1.05;
    
    if (e.evt.ctrlKey) {
      // Ctrl + Wheel: Zoom
      const oldScale = viewport.scale;
      const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
      
      // Limit zoom range
      const clampedScale = Math.max(0.1, Math.min(5, newScale));
      
      // Calculate new viewport position to zoom around mouse pointer
      const mousePointTo = {
        x: (pointer.x - viewport.x) / oldScale,
        y: (pointer.y - viewport.y) / oldScale,
      };
      
      const newPos = {
        x: pointer.x - mousePointTo.x * clampedScale,
        y: pointer.y - mousePointTo.y * clampedScale,
      };
      
      // Apply viewport boundaries to prevent canvas from disappearing
      const boundedPos = applyViewportBounds(newPos, clampedScale);
      
      setViewport({
        scale: clampedScale,
        x: boundedPos.x,
        y: boundedPos.y,
      });
      
      // Notify parent component of zoom change
      onZoomChange?.(clampedScale);
    } else {
      // Wheel: Pan up/down
      const newY = viewport.y - e.evt.deltaY * 0.5;
      const boundedPos = applyViewportBounds({ x: viewport.x, y: newY }, viewport.scale);
      
      setViewport(prev => ({
        ...prev,
        x: boundedPos.x,
        y: boundedPos.y,
      }));
    }
  };
  
  const handleMouseDown = () => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    const currentTime = Date.now();
    
    setMouseDownTime(currentTime);
    setMouseDownPosition(pointer);
    setLastPointerPosition(pointer);
    
    // Don't start dragging immediately for any target, wait for time/distance threshold
    setIsDragging(false);
  };
  
  const handleMouseMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    const currentTime = Date.now();
    
    // Check if we should start dragging based on time or distance
    if (!isDragging && mouseDownTime > 0) {
      const timeDiff = currentTime - mouseDownTime;
      const distance = Math.sqrt(
        Math.pow(pointer.x - mouseDownPosition.x, 2) + 
        Math.pow(pointer.y - mouseDownPosition.y, 2)
      );
      
      // Start dragging if enough time has passed OR mouse moved enough distance
      if (timeDiff > DRAG_THRESHOLD_TIME || distance > DRAG_THRESHOLD_DISTANCE) {
        setIsDragging(true);
      }
    }
    
    // Perform dragging if active
    if (isDragging) {
      const dx = pointer.x - lastPointerPosition.x;
      const dy = pointer.y - lastPointerPosition.y;
      
      const newPos = {
        x: viewport.x + dx,
        y: viewport.y + dy
      };
      
      const boundedPos = applyViewportBounds(newPos, viewport.scale);
      
      setViewport(prev => ({
        ...prev,
        x: boundedPos.x,
        y: boundedPos.y,
      }));
    }
    
    setLastPointerPosition(pointer);
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
    setMouseDownTime(0);
  };

  const handleMouseLeave = () => {
    // Reset drag state when mouse leaves canvas
    setIsDragging(false);
    setMouseDownTime(0);
  };

  // Reset viewport to screen center (100% zoom + screen center position)
  const resetViewport = () => {
    // console.log('🔄 Manual reset - returning to screen center'); // ログ無効化
    
    // Always return to screen center (0, 0) regardless of current state
    const centeredPosition = {
      x: 0,
      y: 0,
      scale: 1
    };
    
    // console.log('📐 Resetting to screen center (0, 0)'); // ログ無効化
    
    setViewport(centeredPosition);
    onZoomChange?.(1);
  };

  // Reset viewport when zoom is reset to 1.0 OR when resetTrigger changes
  useEffect(() => {
    // console.log('🔄 Zoom prop changed to:', zoom, 'resetTrigger:', resetTrigger); // ログ無効化
    if (Math.abs(zoom - 1.0) < 0.001) {
      // console.log('📍 Zoom is 1.0, returning to screen center'); // ログ無効化
      
      // Always return to screen center (0, 0) for consistent behavior
      setViewport({
        x: 0,
        y: 0,
        scale: 1
      });
    } else {
      // Always sync viewport scale with zoom prop
      setViewport(prev => ({
        ...prev,
        scale: zoom
      }));
    }
  }, [zoom, resetTrigger]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'r' || e.key === 'R') {
        resetViewport();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handlePinClick = (e: KonvaEventObject<MouseEvent>, pin: Pin) => {
    const currentTime = Date.now();
    
    // Only handle pin selection if it was a quick click (not a drag)
    if (mouseDownTime > 0) {
      const timeDiff = currentTime - mouseDownTime;
      const stage = stageRef.current;
      
      if (stage && timeDiff < DRAG_THRESHOLD_TIME) {
        const pointer = stage.getPointerPosition();
        const distance = Math.sqrt(
          Math.pow(pointer.x - mouseDownPosition.x, 2) + 
          Math.pow(pointer.y - mouseDownPosition.y, 2)
        );
        
        // Only treat as pin click if mouse didn't move much and it was quick
        if (distance < DRAG_THRESHOLD_DISTANCE && !isDragging) {
          e.cancelBubble = true;
          handlePinSelection(pin.id, e.evt);
        }
      }
    }
  };

  const handlePinDoubleClick = (e: KonvaEventObject<MouseEvent>, pin: Pin) => {
    // Always handle double-click regardless of drag state
    e.cancelBubble = true;
    onPinDoubleClick(pin.id);
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const currentTime = Date.now();
    
    // Only clear selection if it was a quick click on empty stage area (not a drag)
    if (!isDragging && mouseDownTime > 0) {
      const timeDiff = currentTime - mouseDownTime;
      const stage = stageRef.current;
      
      if (stage && timeDiff < DRAG_THRESHOLD_TIME) {
        const pointer = stage.getPointerPosition();
        const distance = Math.sqrt(
          Math.pow(pointer.x - mouseDownPosition.x, 2) + 
          Math.pow(pointer.y - mouseDownPosition.y, 2)
        );
        
        // Only treat as click if mouse didn't move much and clicked on stage
        if (distance < DRAG_THRESHOLD_DISTANCE && e.target === e.target.getStage()) {
          onPinSelect('');
        }
      }
    }
  };

  if (!pkg || pins.length === 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '18px'
      }}>
        No package loaded. Please import a CSV file.
      </div>
    );
  }

  // Prevent rendering if stage size is invalid to avoid canvas errors
  if (stageSize.width <= 0 || stageSize.height <= 0) {
    return (
      <div style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '18px'
      }}>
        Loading canvas...
      </div>
    );
  }

  // Information for header bar
  const viewInfo = `View: ${isTopView ? 'TOP' : 'BOTTOM'} | Rotation: ${rotation}° | Zoom: ${Math.round(zoom * 100)}%`;
  const fileName = pkg ? `${pkg.device}pkg.csv (${pkg.packageType})` : 'No package loaded';

  return (
    <div style={{ 
      width: '100%', 
      height: '100%', 
      backgroundColor: '#1a1a1a', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header Bar in red frame area (tiles-free zone) */}
      <HeaderBar fileName={fileName} viewInfo={viewInfo} />
      
      {/* Main Canvas Area */}
      <div style={{ 
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Grid Labels - Fixed 4-direction layout with rotation-aware content */}
        
        {/* Top Labels */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 16,
          right: 16,
          height: 16,
          backgroundColor: '#2a2a2a',
          border: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'row',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          {viewport.scale > 0.1 && (() => {
            const { gridSpacing, minCol, maxCol, minRow, maxRow } = packageDims as any;
            if (!gridSpacing) return null;
            
            const topLabels: JSX.Element[] = [];
            
            // Top area content depends on rotation
            const shouldShowColumns = rotation === 0 || rotation === 180;
            
            if (shouldShowColumns) {
              // Show columns when rotation is 0° or 180°
              for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.col === colIndex
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: pinTransformed.x - 10, top: -5 };
                
                if (labelPosition.left >= -50 && labelPosition.left <= stageSize.width + 50) {
                  topLabels.push(
                    <div
                      key={`top-col-${colIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {colIndex}
                    </div>
                  );
                }
              }
            } else {
              // Show rows when rotation is 90° or 270°
              for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const rowLetter = indexToRow(rowIndex);
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.row === rowLetter
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: pinTransformed.x - 10, top: -5 };
                
                if (labelPosition.left >= -50 && labelPosition.left <= stageSize.width + 50) {
                  topLabels.push(
                    <div
                      key={`top-row-${rowIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {rowLetter}
                    </div>
                  );
                }
              }
            }
            
            return topLabels;
          })()}
        </div>

        {/* Right Labels */}
        <div style={{
          position: 'absolute',
          top: 16,
          right: 0,
          bottom: 16,
          width: 16,
          backgroundColor: '#2a2a2a',
          border: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          {viewport.scale > 0.1 && (() => {
            const { gridSpacing, minCol, maxCol, minRow, maxRow } = packageDims as any;
            if (!gridSpacing) return null;
            
            const rightLabels: JSX.Element[] = [];
            
            // Right area content depends on rotation
            const shouldShowRows = rotation === 0 || rotation === 180;
            
            if (shouldShowRows) {
              // Show rows when rotation is 0° or 180°
              for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const rowLetter = indexToRow(rowIndex);
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.row === rowLetter
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: -5, top: pinTransformed.y - 8 };
                
                if (labelPosition.top >= -50 && labelPosition.top <= stageSize.height + 50) {
                  rightLabels.push(
                    <div
                      key={`right-row-${rowIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {rowLetter}
                    </div>
                  );
                }
              }
            } else {
              // Show columns when rotation is 90° or 270°
              for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.col === colIndex
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: -5, top: pinTransformed.y - 8 };
                
                if (labelPosition.top >= -50 && labelPosition.top <= stageSize.height + 50) {
                  rightLabels.push(
                    <div
                      key={`right-col-${colIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {colIndex}
                    </div>
                  );
                }
              }
            }
            
            return rightLabels;
          })()}
        </div>

        {/* Bottom Labels */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 16,
          right: 16,
          height: 16,
          backgroundColor: '#2a2a2a',
          border: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          flexDirection: 'row',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          {viewport.scale > 0.1 && (() => {
            const { gridSpacing, minCol, maxCol, minRow, maxRow } = packageDims as any;
            if (!gridSpacing) return null;
            
            const bottomLabels: JSX.Element[] = [];
            
            // Bottom area content depends on rotation
            const shouldShowColumns = rotation === 0 || rotation === 180;
            
            if (shouldShowColumns) {
              // Show columns when rotation is 0° or 180°
              for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.col === colIndex
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: pinTransformed.x - 10, top: -5 };
                
                if (labelPosition.left >= -50 && labelPosition.left <= stageSize.width + 50) {
                  bottomLabels.push(
                    <div
                      key={`bottom-col-${colIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {colIndex}
                    </div>
                  );
                }
              }
            } else {
              // Show rows when rotation is 90° or 270°
              for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const rowLetter = indexToRow(rowIndex);
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.row === rowLetter
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: pinTransformed.x - 10, top: -5 };
                
                if (labelPosition.left >= -50 && labelPosition.left <= stageSize.width + 50) {
                  bottomLabels.push(
                    <div
                      key={`bottom-row-${rowIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {rowLetter}
                    </div>
                  );
                }
              }
            }
            
            return bottomLabels;
          })()}
        </div>

        {/* Left Labels */}
        <div style={{
          position: 'absolute',
          top: 16,
          left: 0,
          bottom: 16,
          width: 16,
          backgroundColor: '#2a2a2a',
          border: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 10,
          overflow: 'hidden'
        }}>
          {viewport.scale > 0.1 && (() => {
            const { gridSpacing, minCol, maxCol, minRow, maxRow } = packageDims as any;
            if (!gridSpacing) return null;
            
            const leftLabels: JSX.Element[] = [];
            
            // Left area content depends on rotation
            const shouldShowRows = rotation === 0 || rotation === 180;
            
            if (shouldShowRows) {
              // Show rows when rotation is 0° or 180°
              for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const rowLetter = indexToRow(rowIndex);
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.row === rowLetter
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: -5, top: pinTransformed.y - 8 };
                
                if (labelPosition.top >= -50 && labelPosition.top <= stageSize.height + 50) {
                  leftLabels.push(
                    <div
                      key={`left-row-${rowIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {rowLetter}
                    </div>
                  );
                }
              }
            } else {
              // Show columns when rotation is 90° or 270°
              for (let colIndex = minCol; colIndex <= maxCol; colIndex++) {
                const representativePin = pins.find(pin => 
                  pin.gridPosition && pin.gridPosition.col === colIndex
                );
                
                if (!representativePin) continue;
                
                const pinTransformed = transformPosition(representativePin);
                const labelPosition = { left: -5, top: pinTransformed.y - 8 };
                
                if (labelPosition.top >= -50 && labelPosition.top <= stageSize.height + 50) {
                  leftLabels.push(
                    <div
                      key={`left-col-${colIndex}`}
                      style={{
                        position: 'absolute',
                        ...labelPosition,
                        width: 20,
                        height: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 'bold',
                        color: '#e0e0e0',
                        textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                        pointerEvents: 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {colIndex}
                    </div>
                  );
                }
              }
            }
            
            return leftLabels;
          })()}
        </div>
        
        {/* Main Canvas with Stage - Fixed margins for 4-direction labels */}
        <div style={{
          position: 'absolute',
          top: 16,    // Top label height
          left: 16,   // Left label width
          right: 16,  // Right label width
          bottom: 16, // Bottom label height
          overflow: 'hidden'
        }}>
          <Stage
        ref={(ref) => {
          stageRef.current = ref;
          // Force size update when Stage is mounted (especially for VS Code webview)
          if (ref) {
            setTimeout(() => {
              const container = ref.container();
              if (container) {
                const rect = container.getBoundingClientRect();
                const newSize = {
                  width: Math.max(400, rect.width),
                  height: Math.max(300, rect.height)
                };
                setStageSize(prevSize => {
                  if (prevSize.width !== newSize.width || prevSize.height !== newSize.height) {
                    console.log('📐 Stage mounted - Canvas size updated:', newSize);
                    return newSize;
                  }
                  return prevSize;
                });
              }
            }, 50); // Quick update on mount
          }
        }}
        width={Math.max(100, stageSize.width)} // Full container width for maximum viewer area
        height={Math.max(100, stageSize.height)} // Full container height to eliminate footer area
        x={0} // Use full container area
        y={0} // Use full container area
        onClick={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <Layer>
          {/* Package outline and pins - with individual viewport transform */}
          {/* Package outline */}
          {(() => {
            const { gridSpacing, minRow, maxRow, minCol, maxCol } = packageDims as any;
            
            if (!gridSpacing) return null;
            
            // Helper function to transform grid coordinates with viewport
            const transformGridCoord = (gridX: number, gridY: number) => {
              // Create temporary pin object for position transformation
              const tempPin = { position: { x: gridX, y: gridY } } as Pin;
              return transformPosition(tempPin); // transformPosition already includes all transforms
            };
            
            // Calculate package outline corners based on grid boundaries (zero padding for maximum area)
            const padding = 0; // Zero padding for maximum viewer area - Issue #14
            const topLeft = transformGridCoord((minCol - 1.5) * gridSpacing - padding, (minRow - 0.5) * gridSpacing - padding);
            const topRight = transformGridCoord((maxCol + 0.5) * gridSpacing + padding, (minRow - 0.5) * gridSpacing - padding);
            const bottomLeft = transformGridCoord((minCol - 1.5) * gridSpacing - padding, (maxRow + 0.5) * gridSpacing + padding);
            const bottomRight = transformGridCoord((maxCol + 0.5) * gridSpacing + padding, (maxRow + 0.5) * gridSpacing + padding);
            
            // Draw package outline as lines to properly handle rotation
            return (
              <>
                <Line
                  points={[
                    topLeft.x, topLeft.y,
                    topRight.x, topRight.y,
                    bottomRight.x, bottomRight.y,
                    bottomLeft.x, bottomLeft.y,
                    topLeft.x, topLeft.y
                  ]}
                  stroke="#555"
                  strokeWidth={2}
                  dash={[5, 5]}
                  closed={true}
                  fill="rgba(40, 40, 40, 0.3)"
                />
              </>
            );
          })()}

          {/* Grid lines for reference - LOD controlled */}
          {false && LODSystem.shouldRenderAtLOD(currentLOD, 3) && (() => {
            const { gridSpacing, minRow, maxRow, minCol, maxCol } = packageDims as any;
            
            if (!gridSpacing) return null;
            
            // Helper function to transform grid coordinates (already includes viewport transform)
            const transformGridCoord = (gridX: number, gridY: number) => {
              // Create temporary pin object for position transformation
              const tempPin = { position: { x: gridX, y: gridY } } as Pin;
              return transformPosition(tempPin); // transformPosition already includes all transforms
            };
            
            const lines = [];
            
            // Major grid lines - tile boundaries (darker)
            // Vertical grid lines - align with column boundaries
            for (let col = minCol; col <= maxCol + 1; col++) {
              const gridX = (col - 1.5) * gridSpacing; // Offset by 0.5 to draw lines between tiles
              const topPos = transformGridCoord(gridX, minRow * gridSpacing - gridSpacing / 2);
              const bottomPos = transformGridCoord(gridX, (maxRow + 1) * gridSpacing - gridSpacing / 2);
              
              lines.push(
                <Line
                  key={`v-major-${col}`}
                  points={[topPos.x, topPos.y, bottomPos.x, bottomPos.y]}
                  stroke="#444"
                  strokeWidth={1}
                  opacity={0.4}
                />
              );
            }
            
            // Horizontal grid lines - align with row boundaries
            for (let rowIndex = minRow; rowIndex <= maxRow + 1; rowIndex++) {
              const gridY = (rowIndex - 0.5) * gridSpacing; // Offset by 0.5 to draw lines between tiles
              const leftPos = transformGridCoord((minCol - 1.5) * gridSpacing, gridY);
              const rightPos = transformGridCoord((maxCol + 0.5) * gridSpacing, gridY);
              
              lines.push(
                <Line
                  key={`h-major-${rowIndex}`}
                  points={[leftPos.x, leftPos.y, rightPos.x, rightPos.y]}
                  stroke="#444"
                  strokeWidth={1}
                  opacity={0.4}
                />
              );
            }
            
            // Minor grid lines - only at highest detail level
            if (LODSystem.shouldRenderAtLOD(currentLOD, 4)) {
              // Vertical center lines
              for (let col = minCol; col <= maxCol; col++) {
                const gridX = (col - 1) * gridSpacing; // Tile center
                const topPos = transformGridCoord(gridX, minRow * gridSpacing - gridSpacing / 2);
                const bottomPos = transformGridCoord(gridX, (maxRow + 1) * gridSpacing - gridSpacing / 2);
                
                lines.push(
                  <Line
                    key={`v-minor-${col}`}
                    points={[topPos.x, topPos.y, bottomPos.x, bottomPos.y]}
                    stroke="#333"
                    strokeWidth={0.5}
                    opacity={0.2}
                    dash={[2, 2]}
                  />
                );
              }
              
              // Horizontal center lines
              for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
                const gridY = rowIndex * gridSpacing; // Tile center
                const leftPos = transformGridCoord((minCol - 1.5) * gridSpacing, gridY);
                const rightPos = transformGridCoord((maxCol + 0.5) * gridSpacing, gridY);
                
                lines.push(
                  <Line
                    key={`h-minor-${rowIndex}`}
                    points={[leftPos.x, leftPos.y, rightPos.x, rightPos.y]}
                    stroke="#333"
                    strokeWidth={0.5}
                    opacity={0.2}
                    dash={[2, 2]}
                  />
                );
              }
            }
            
            return <>{lines}</>;
          })()}

          {/* Pin rendering with smart viewport culling and LOD optimization */}
          {(() => {
            PerformanceService.startRenderMeasurement('pin-rendering');
            
            // Use viewport-based sizing for stable scaling
            const baseTileSize = 88; // Base tile size
            const tileSize = Math.max(20, baseTileSize * viewport.scale);
            
            // LOD system for performance
            const shouldRenderDetails = LODSystem.shouldRenderPinDetails(viewport.scale);
            const shouldRenderPinNames = LODSystem.shouldRenderText(viewport.scale, 'pin');
            const shouldRenderSignalNames = LODSystem.shouldRenderText(viewport.scale, 'signal');
            const fontMultiplier = LODSystem.getAdaptiveTextSize(viewport.scale, 12) / 12;
            
            // Use smart viewport culling instead of simple pin limit
            const pinsToRender = visiblePins;
            
            const renderDuration = PerformanceService.endRenderMeasurement('pin-rendering');
            console.log(`🎯 Smart culling: Rendering ${pinsToRender.length}/${pins.length} pins (${renderDuration.toFixed(2)}ms)`);
            
            return pinsToRender.map(pin => {
              const pos = transformPosition(pin);
              const isSelected = selectedPins.has(pin.id);
              const bankColor = getBankColor(pin);
              const circleColor = getPinTypeColor(pin);
              // Enhanced font sizing for better pin review on large screens
              const baseFontSize = viewport.scale * 10 * fontMultiplier;
              const fontSize = Math.max(8, Math.min(20, baseFontSize)); // Increased min/max for better readability
              const smallFontSize = Math.max(6, Math.min(16, viewport.scale * 8 * fontMultiplier));
              
              // 差動ペアのハイライト色を取得
              const differentialHighlightColor = getDifferentialHighlightColor(pin, visiblePins, selectedPins);
              
              // Check if this pin has a differential pair (for subtle indication)
              const hasDP = hasDifferentialPair(pin, pins);
              
              // Use LOD-based detail rendering
              const showDetails = shouldRenderDetails || isSelected;
              
              return (
                <Group key={pin.id}>
                  {/* Pin tile (square with bank color) */}
                  <Rect
                    x={pos.x - tileSize / 2}
                    y={pos.y - tileSize / 2}
                    width={tileSize}
                    height={tileSize}
                    fill={bankColor}
                    stroke="#000"
                    strokeWidth={1}
                    cornerRadius={4}
                    onClick={(e) => handlePinClick(e, pin)}
                    onDblClick={(e) => handlePinDoubleClick(e, pin)}
                    style={{ cursor: 'pointer' }}
                  />
                  
                  {/* Differential pair tile highlight */}
                  {differentialHighlightColor && (
                    <Rect
                      x={pos.x - tileSize / 2 - 2}
                      y={pos.y - tileSize / 2 - 2}
                      width={tileSize + 4}
                      height={tileSize + 4}
                      fill="transparent"
                      stroke={differentialHighlightColor}
                      strokeWidth={2}
                      cornerRadius={6}
                      listening={false}
                    />
                  )}
                  
                  {/* Inner circle with pin type color - optimized for large screen review */}
                  <Circle
                    x={pos.x}
                    y={pos.y}
                    radius={Math.max(8, tileSize * 0.3)} // Increased min radius and ratio for better visibility
                    fill={circleColor}
                    stroke="#000"
                    strokeWidth={1}
                    listening={false} // Disable mouse events on circle to allow tile selection
                  />
                  
                  {/* Subtle differential pair indicator (small dot) */}
                  {hasDP && !differentialHighlightColor && tileSize > 40 && (
                    <Circle
                      x={pos.x + tileSize * 0.3}
                      y={pos.y - tileSize * 0.3}
                      radius={3}
                      fill="#FF6600"
                      stroke="#FFF"
                      strokeWidth={1}
                      listening={false}
                    />
                  )}
                  
                  {/* Differential pair highlight ring - enhanced for large screen review */}
                  {differentialHighlightColor && (
                    <Circle
                      x={pos.x}
                      y={pos.y}
                      radius={Math.max(10, tileSize * 0.4)} // Increased for better visibility
                      fill="transparent"
                      stroke={differentialHighlightColor}
                      strokeWidth={3}
                      listening={false}
                      dash={[5, 5]} // 点線でより目立つように
                    />
                  )}
                  
                  {/* Pin number - always visible in center with background */}
                  <Rect
                    x={pos.x - (pin.pinNumber.length * fontSize / 4) - 2}
                    y={pos.y - fontSize / 2 - 2}
                    width={pin.pinNumber.length * fontSize / 2 + 4}
                    height={fontSize + 4}
                    fill="rgba(0, 0, 0, 0.7)"
                    cornerRadius={2}
                    listening={false}
                  />
                  <Text
                    x={pos.x}
                    y={pos.y - fontSize / 2}
                    text={pin.pinNumber}
                    fontSize={fontSize}
                    fill="#FFF"
                    align="center"
                    onClick={(e) => handlePinClick(e, pin)}
                    onDblClick={(e) => handlePinDoubleClick(e, pin)}
                    style={{ cursor: 'pointer' }}
                    fontStyle="bold"
                    offsetX={pin.pinNumber.length * fontSize / 4}
                    listening={false}
                  />
                  
                  {/* Pin Name - shown based on LOD and zoom level */}
                  {pin.pinName && showDetails && shouldRenderPinNames && tileSize > 50 && (
                    <>
                      <Rect
                        x={pos.x - ((pin.pinName.length > 14 ? 17 : pin.pinName.length) * smallFontSize / 4) - 2}
                        y={pos.y + fontSize / 2 + 1}
                        width={(pin.pinName.length > 14 ? 17 : pin.pinName.length) * smallFontSize / 2 + 4}
                        height={smallFontSize + 4}
                        fill="rgba(0, 0, 0, 0.6)"
                        cornerRadius={2}
                        listening={false}
                      />
                      <Text
                        x={pos.x}
                        y={pos.y + fontSize / 2 + 3}
                        text={pin.pinName.length > 14 ? pin.pinName.substring(0, 14) + '...' : pin.pinName}
                        fontSize={smallFontSize}
                        fill="#E0E0E0"
                        align="center"
                        onClick={(e) => handlePinClick(e, pin)}
                        onDblClick={(e) => handlePinDoubleClick(e, pin)}
                        style={{ cursor: 'pointer' }}
                        offsetX={(pin.pinName.length > 14 ? 17 : pin.pinName.length) * smallFontSize / 4}
                        listening={false}
                      />
                    </>
                  )}
                  
                  {/* Signal name - shown based on LOD level */}
                  {pin.signalName && pin.signalName.trim() !== '' && shouldRenderSignalNames && (
                    <>
                      <Rect
                        x={pos.x - ((pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize * 0.35) - 6}
                        y={pos.y + fontSize / 2 + 3 + smallFontSize - 1}
                        width={(pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize * 0.7 + 12}
                        height={smallFontSize + 6}
                        fill="rgba(255, 215, 0, 0.9)"
                        cornerRadius={3}
                        listening={false}
                      />
                      <Text
                        x={pos.x}
                        y={pos.y + fontSize / 2 + 3 + smallFontSize + 2}
                        text={pin.signalName.length > 12 ? pin.signalName.substring(0, 12) + '...' : pin.signalName}
                        fontSize={smallFontSize}
                        fill="#000"
                        align="center"
                        onClick={(e) => handlePinClick(e, pin)}
                        onDblClick={(e) => handlePinDoubleClick(e, pin)}
                        style={{ cursor: 'pointer' }}
                        fontStyle="bold"
                        offsetX={(pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize / 4}
                        listening={false}
                      />
                    </>
                  )}
                </Group>
              );
            });
          })()}
          
          {/* Differential pair connection lines with viewport optimization */}
          {LODSystem.shouldRenderDifferentialPairs(viewport.scale) && (() => {
            PerformanceService.startRenderMeasurement('diff-pair-lines');
            
            const connectionLines: JSX.Element[] = [];
            const processedPairs = new Set();
            
            // Only process visible pins for differential pairs
            visiblePins.forEach(pin => {
              if (processedPairs.has(pin.id)) return;
              
              // Check if this pin is part of a differential pair
              if (DifferentialPairUtils.isDifferentialPin(pin)) {
                const pairPin = DifferentialPairUtils.findPairPin(pin, pins);
                
                // Only draw line if both pins are visible or if either is selected
                const isPairVisible = pairPin && visiblePins.includes(pairPin);
                const isEitherSelected = selectedPins.has(pin.id) || (pairPin && selectedPins.has(pairPin.id));
                
                if (pairPin && !processedPairs.has(pairPin.id) && (isPairVisible || isEitherSelected)) {
                  // Mark both pins as processed to avoid duplicate lines
                  processedPairs.add(pin.id);
                  processedPairs.add(pairPin.id);
                  
                  const pos1 = transformPosition(pin);
                  const pos2 = transformPosition(pairPin);
                  
                  // Get colors for the differential pair
                  const color1 = getDifferentialHighlightColor(pin, visiblePins, selectedPins);
                  const color2 = getDifferentialHighlightColor(pairPin, visiblePins, selectedPins);
                  
                  // Use the first color found, or default to a neutral color
                  const lineColor = color1 || color2 || '#FF6600';
                  
                  // Only draw connection lines if both pins are visible and not too close
                  const distance = Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
                  
                  if (distance > 50) { // Only show lines if pins are reasonably far apart
                    connectionLines.push(
                      <Line
                        key={`diff-pair-${pin.id}-${pairPin.id}`}
                        points={[pos1.x, pos1.y, pos2.x, pos2.y]}
                        stroke={lineColor}
                        strokeWidth={2}
                        opacity={0.6}
                        dash={[8, 4]}
                        listening={false}
                      />
                    );
                  }
                  
                  // Add differential pair label at midpoint
                  if (distance > 100 && viewport.scale > 0.4) {
                    const midX = (pos1.x + pos2.x) / 2;
                    const midY = (pos1.y + pos2.y) / 2;
                    const pairType = DifferentialPairUtils.getDifferentialPairType(pin.pinName);
                    const labelText = pairType === 'positive' ? '+/-' : '-/+';
                    
                    connectionLines.push(
                      <Group key={`diff-label-${pin.id}-${pairPin.id}`}>
                        <Rect
                          x={midX - 10}
                          y={midY - 8}
                          width={20}
                          height={16}
                          fill="rgba(0, 0, 0, 0.8)"
                          cornerRadius={2}
                          listening={false}
                        />
                        <Text
                          x={midX}
                          y={midY - 6}
                          text={labelText}
                          fontSize={10}
                          fill={lineColor}
                          align="center"
                          offsetX={10}
                          listening={false}
                        />
                      </Group>
                    );
                  }
                }
              }
            });
            
            const diffRenderDuration = PerformanceService.endRenderMeasurement('diff-pair-lines');
            console.log(`🔗 Differential pairs: ${connectionLines.length} lines (${diffRenderDuration.toFixed(2)}ms)`);
            
            return connectionLines;
          })()}
          
          {/* Bank group boundaries with viewport optimization */}
          {LODSystem.shouldRenderAtLOD(currentLOD, 2) && (() => {
            PerformanceService.startRenderMeasurement('bank-boundaries');
            
            // Only calculate boundaries for banks that have visible pins
            const visibleBankGroups = new Map<string, Pin[]>();
            visiblePins.forEach(pin => {
              const bank = pin.bank || 'NA';
              if (!visibleBankGroups.has(bank)) {
                visibleBankGroups.set(bank, []);
              }
              visibleBankGroups.get(bank)!.push(pin);
            });
            
            const baseTileSize = 88;
            const tileSize = Math.max(20, baseTileSize * viewport.scale);
            const padding = 6; // Reduced padding to minimize overlap
            
            // Define different dash patterns for each bank to reduce visual overlap
            const dashPatterns = {
              '0': [10, 5],      // CONFIG bank - standard dash
              '34': [15, 3],     // HR I/O bank 34 - longer dash
              '35': [8, 8],      // HR I/O bank 35 - equal dash/gap
              '500': [12, 3, 3, 3], // MIO bank 500 - dash-dot
              '501': [6, 6, 6, 6], // MIO bank 501 - medium equal
              '502': [20, 5],    // DDR bank 502 - long dash
              'NA': [5, 5]       // Non-bank pins - short dash
            };
            
            // Calculate boundaries first to detect overlaps
            const bankBoundaries = new Map();
            Array.from(visibleBankGroups.entries()).forEach(([bankKey, bankPins]) => {
              if (bankKey === 'NA' || bankPins.length < 2) return;
              
              const positions = bankPins.map(pin => transformPosition(pin));
              const boundary = {
                minX: Math.min(...positions.map(p => p.x)) - tileSize / 2 - padding,
                maxX: Math.max(...positions.map(p => p.x)) + tileSize / 2 + padding,
                minY: Math.min(...positions.map(p => p.y)) - tileSize / 2 - padding,
                maxY: Math.max(...positions.map(p => p.y)) + tileSize / 2 + padding,
                bankKey,
                pins: bankPins
              };
              
              bankBoundaries.set(bankKey, boundary);
            });
            
            const renderedBoundaries = Array.from(bankBoundaries.entries()).map(([bankKey, boundary]) => {
              // Get bank color for the boundary
              const bankColor = getBankColor(boundary.pins[0]);
              const dashPattern = dashPatterns[bankKey as keyof typeof dashPatterns] || [10, 5];
              
              // Check for overlaps with other banks to adjust stroke width
              let hasOverlap = false;
              for (const [otherBankKey, otherBoundary] of bankBoundaries.entries()) {
                if (otherBankKey === bankKey) continue;
                
                // Simple overlap detection
                const overlapX = !(boundary.maxX < otherBoundary.minX || boundary.minX > otherBoundary.maxX);
                const overlapY = !(boundary.maxY < otherBoundary.minY || boundary.minY > otherBoundary.maxY);
                
                if (overlapX && overlapY) {
                  hasOverlap = true;
                  break;
                }
              }
              
              return (
                <Rect
                  key={`bank-boundary-${bankKey}`}
                  x={boundary.minX}
                  y={boundary.minY}
                  width={boundary.maxX - boundary.minX}
                  height={boundary.maxY - boundary.minY}
                  fill="transparent"
                  stroke={bankColor}
                  strokeWidth={hasOverlap ? 1.5 : 2} // Thinner stroke for overlapping banks
                  dash={dashPattern} // Different dash pattern for each bank
                  cornerRadius={6}
                  opacity={hasOverlap ? 0.6 : 0.8} // Lower opacity for overlapping banks
                  listening={false} // Disable mouse events to allow pin selection
                />
              );
            });
            
            const bankRenderDuration = PerformanceService.endRenderMeasurement('bank-boundaries');
            console.log(`🏦 Bank boundaries: ${bankBoundaries.size} boundaries (${bankRenderDuration.toFixed(2)}ms)`);
            
            return renderedBoundaries;
          })()}
          
          {/* Selection highlights - drawn on top of everything */}
          {(() => {
            // Use viewport-based sizing for stable scaling (same as pin rendering)
            const baseTileSize = 88; // Base tile size
            const tileSize = Math.max(20, baseTileSize * viewport.scale);
            
            return pins.filter(pin => selectedPins.has(pin.id)).map(pin => {
              const pos = transformPosition(pin);
              
              return (
                <Rect
                  key={`highlight-${pin.id}`}
                  x={pos.x - tileSize / 2 - 2}
                  y={pos.y - tileSize / 2 - 2}
                  width={tileSize + 4}
                  height={tileSize + 4}
                  fill="transparent"
                  stroke="#FFD700"
                  strokeWidth={3}
                  cornerRadius={4}
                  onClick={(e) => handlePinClick(e, pin)}
                  onDblClick={(e) => handlePinDoubleClick(e, pin)}
                  style={{ cursor: 'pointer' }}
                />
              );
            });
          })()}
          
          {/* Legend */}
          <Group x={10} y={stageSize.height - 200}>
            {/* Bank Groups header background */}
            <Rect
              x={-3}
              y={-2}
              width={82}
              height={16}
              fill="rgba(0, 0, 0, 0.7)"
              cornerRadius={2}
            />
            <Text
              x={0}
              y={0}
              text="Bank Groups:"
              fontSize={12}
              fill="#ccc"
            />
            {Object.entries({
              'Bank 0': '#FF6B6B',
              'Bank 34': '#4ECDC4',
              'Bank 35': '#45B7D1',
              'Bank 500': '#96CEB4',
              'Bank 501': '#FFEAA7',
              'Bank 502': '#DDA0DD'
            }).map(([bankName, color], index) => (
              <Group key={bankName} y={20 + index * 18}>
                <Rect
                  x={6}
                  y={-4}
                  width={12}
                  height={12}
                  fill={color}
                  stroke="#000"
                  strokeWidth={1}
                  cornerRadius={2}
                />
                <Circle
                  x={12}
                  y={2}
                  radius={3}
                  fill="#FFF"
                  stroke="#000"
                  strokeWidth={0.5}
                />
                <Text
                  x={25}
                  y={-6}
                  text={bankName}
                  fontSize={10}
                  fill="#999"
                />
                {/* Bank name text background */}
                <Rect
                  x={23}
                  y={-8}
                  width={bankName.length * 6 + 4}
                  height={14}
                  fill="rgba(0, 0, 0, 0.6)"
                  cornerRadius={2}
                />
                <Text
                  x={25}
                  y={-6}
                  text={bankName}
                  fontSize={10}
                  fill="#ccc"
                />
              </Group>
            ))}
            
            {/* Pin Type Legend */}
            {/* Pin Types header background */}
            <Rect
              x={117}
              y={-2}
              width={130}
              height={16}
              fill="rgba(0, 0, 0, 0.7)"
              cornerRadius={2}
            />
            <Text
              x={120}
              y={0}
              text="Pin Types (Circle):"
              fontSize={12}
              fill="#ccc"
            />
            {Object.entries({
              'I/O': '#FFF',
              'CONFIG': '#FFD700',
              'POWER': '#FF4500',
              'GROUND': '#000',
              'MIO': '#32CD32',
              'DDR': '#8A2BE2'
            }).map(([typeName, color], index) => (
              <Group key={typeName} y={20 + index * 18} x={120}>
                <Circle
                  x={12}
                  y={2}
                  radius={4}
                  fill={color}
                  stroke="#000"
                  strokeWidth={1}
                />
                <Text
                  x={25}
                  y={-6}
                  text={typeName}
                  fontSize={10}
                  fill="#999"
                />
                {/* Pin type name text background */}
                <Rect
                  x={23}
                  y={-8}
                  width={typeName.length * 6 + 4}
                  height={14}
                  fill="rgba(0, 0, 0, 0.6)"
                  cornerRadius={2}
                />
                <Text
                  x={25}
                  y={-6}
                  text={typeName}
                  fontSize={10}
                  fill="#ccc"
                />
              </Group>
            ))}
          </Group>
        </Layer>
      </Stage>
        </div>
      </div>
    </div>
  );
};

export default PackageCanvas;

