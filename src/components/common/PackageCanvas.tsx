import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Pin, Package } from '@/types';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';
import { LODSystem } from '@/utils/LODSystem';
import { useAppStore } from '@/stores/app-store';

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

  // Canvas size management - Completely disable ResizeObserver to prevent infinite loops
  useEffect(() => {
    // Set initial size once on mount
    const container = stageRef.current?.container();
    if (container) {
      const rect = container.getBoundingClientRect();
      const initialSize = {
        width: Math.max(400, rect.width),
        height: Math.max(300, rect.height)
      };
      
      console.log('📏 Setting initial canvas size:', initialSize);
      setStageSize(initialSize);
    }
  }, []);

  // Set initial viewport position when package is loaded
  useEffect(() => {
    if (pkg && pins.length > 0 && stageSize.width > 0 && stageSize.height > 0) {
      // console.log('📍 Setting initial viewport position to screen center'); // ログ無効化
      
      // Set initial position to center of drawing area (screen center)
      // This is independent of package dimensions and ensures consistent behavior
      const initialPosition = {
        x: 0, // Screen center as origin
        y: 0, // Screen center as origin
        scale: 1
      };
      
      // console.log('📐 Initial position set to screen center (0, 0)'); // ログ無効化
      // console.log('📐 Stage size:', stageSize.width, 'x', stageSize.height); // ログ無効化
      
      setViewport(initialPosition);
    }
  }, [pkg, pins.length]);

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
      
      // Positive: 赤、Negative: 黄色
      return pinType === 'positive' ? '#FF0000' : '#FFFF00';
    }

    return null;
  };

  // Group pins by bank for boundary highlighting
  const getPinsByBank = () => {
    const bankGroups = new Map<string, Pin[]>();
    pins.forEach(pin => {
      const bankKey = pin.bank || 'NA';
      if (!bankGroups.has(bankKey)) {
        bankGroups.set(bankKey, []);
      }
      bankGroups.get(bankKey)!.push(pin);
    });
    return bankGroups;
  };

  // Calculate package dimensions based on actual grid layout
  const getPackageDimensions = () => {
    if (!pkg || pins.length === 0) {
      return { width: 600, height: 600, centerX: 300, centerY: 300, minX: 0, minY: 0, maxX: 600, maxY: 600 };
    }

    // Calculate grid bounds from pin data
    const rows = pins.map(pin => pin.gridPosition?.row).filter(Boolean);
    const cols = pins.map(pin => pin.gridPosition?.col).filter(Boolean);
    
    const minRow = Math.min(...rows.map(r => r!.charCodeAt(0) - 65));
    const maxRow = Math.max(...rows.map(r => r!.charCodeAt(0) - 65));
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);
    
    // Grid spacing matches CSV reader
    const tileSize = 88;
    const gridSpacing = tileSize;
    
    // Calculate package dimensions based on grid layout
    const gridWidth = (maxCol - minCol + 1) * gridSpacing;
    const gridHeight = (maxRow - minRow + 1) * gridSpacing;
    
    // Add padding for labels and margins
    const padding = tileSize;
    const width = gridWidth + padding * 2;
    const height = gridHeight + padding * 2;
    
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

  // Transform coordinates based on view settings with stable scaling
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
    
    // Apply viewport scaling and offset (account for label margins)
    const canvasWidth = stageSize.width - 40; // Account for left margin
    const canvasHeight = stageSize.height - 30; // Account for top margin
    const transformedX = x * viewport.scale + viewport.x + canvasWidth / 2;
    const transformedY = y * viewport.scale + viewport.y + canvasHeight / 2;
    
    return { x: transformedX, y: transformedY };
  };

  // Apply viewport boundaries to prevent canvas from disappearing off screen
  const applyViewportBounds = (pos: { x: number; y: number }, scale: number) => {
    // Get actual content dimensions
    const packageDims = getPackageDimensions();
    const contentWidth = packageDims.width * scale;
    const contentHeight = packageDims.height * scale;
    
    // Calculate how much we can pan based on content vs stage size
    const canvasWidth = stageSize.width;
    const canvasHeight = stageSize.height;
    
    // Allow panning beyond content boundaries to show all pins
    const paddingX = canvasWidth * 0.5; // Allow half screen padding
    const paddingY = canvasHeight * 0.5;
    
    // Calculate bounds that ensure content is accessible
    const minX = -(contentWidth / 2 + paddingX);
    const maxX = contentWidth / 2 + paddingX;
    const minY = -(contentHeight / 2 + paddingY);
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

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a', position: 'relative' }}>
      {/* Grid Labels - Top (Columns) */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 40,
        right: 0,
        height: 30,
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #444',
        display: 'flex',
        alignItems: 'center',
        zIndex: 10,
        overflow: 'hidden'
      }}>
        {viewport.scale > 0.1 && (() => {
          const { gridSpacing } = packageDims as any;
          if (!gridSpacing) return null;
          
          // Calculate container-relative positions for labels
          const containerWidth = stageSize.width - 40; // Available width for labels
          
          const columnLabels: JSX.Element[] = [];
          
          // Generate labels based on actual pin positions to avoid overlap issues
          const validPins = pins.filter(pin => pin.gridPosition);
          const processedPositions = new Set();
          
          validPins.forEach(pin => {
            if (!pin.gridPosition) return;
            
            // Transform pin position to screen coordinates
            const pinTransformed = transformPosition(pin);
            
            // Check if this pin contributes to column labels (within header area)
            // Use extended tolerance range to ensure labels remain visible during viewport panning
            const headerY = 15; // Center of header area
            const extendedYTolerance = Math.max(300, stageSize.height * 0.8); // Dynamic tolerance based on screen size
            
            // Round position to avoid duplicate labels for nearby pins
            const roundedX = Math.round(pinTransformed.x / 25) * 25;
            const positionKey = `col-${roundedX}`;
            
            if (Math.abs(pinTransformed.y - headerY) < extendedYTolerance && !processedPositions.has(positionKey)) {
              processedPositions.add(positionKey);
              
              // Use appropriate grid coordinate based on rotation for the label
              let displayText: string;
              switch (rotation) {
                case 0:
                case 180:
                  // Normal orientation: column labels show column numbers
                  displayText = pin.gridPosition.col.toString();
                  break;
                case 90:
                case 270:
                  // 90/270 degree rotation: column labels show row letters
                  displayText = pin.gridPosition.row;
                  break;
                default:
                  displayText = pin.gridPosition.col.toString();
              }
              const labelLeft = Math.round(pinTransformed.x - 10);
              
              // Check if position is within extended container bounds to provide smooth panning experience
              const extendedWidth = containerWidth + 200; // Extended bounds prevent label flickering during pan
              const isVisible = labelLeft >= -100 && labelLeft <= extendedWidth;
              
              if (isVisible) {
                columnLabels.push(
                  <div
                    key={positionKey}
                    style={{
                      position: 'absolute',
                      left: labelLeft,
                      top: 0,
                      width: 20,
                      height: 30,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#e0e0e0',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      pointerEvents: 'none'
                    }}
                  >
                    {displayText}
                  </div>
                );
              }
            }
          });
          
          return columnLabels;
        })()}
      </div>
      
      {/* Grid Labels - Left (Rows) */}
      <div style={{
        position: 'absolute',
        top: 30,
        left: 0,
        width: 40,
        bottom: 0,
        backgroundColor: '#2a2a2a',
        borderRight: '1px solid #444',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        zIndex: 10,
        overflow: 'hidden'
      }}>
        {viewport.scale > 0.1 && (() => {
          const { gridSpacing } = packageDims as any;
          if (!gridSpacing) return null;
          
          // Calculate container-relative positions for labels
          const containerHeight = stageSize.height - 30; // Available height for labels
          
          const rowLabels: JSX.Element[] = [];
          
          // Generate labels based on actual pin positions to avoid overlap issues
          const validPins = pins.filter(pin => pin.gridPosition);
          const processedPositions = new Set();
          
          validPins.forEach(pin => {
            if (!pin.gridPosition) return;
            
            // Transform pin position to screen coordinates
            const pinTransformed = transformPosition(pin);
            
            // Check if this pin contributes to row labels (within sidebar area)
            // Use extended tolerance range to ensure labels remain visible during viewport panning
            const sidebarX = 20; // Center of sidebar area
            const extendedXTolerance = Math.max(300, stageSize.width * 0.8); // Dynamic tolerance based on screen size
            
            // Round position to avoid duplicate labels for nearby pins
            const roundedY = Math.round(pinTransformed.y / 25) * 25;
            const positionKey = `row-${roundedY}`;
            
            if (Math.abs(pinTransformed.x - sidebarX) < extendedXTolerance && !processedPositions.has(positionKey)) {
              processedPositions.add(positionKey);
              
              // Use appropriate grid coordinate based on rotation for the label
              let displayText: string;
              switch (rotation) {
                case 0:
                case 180:
                  // Normal orientation: row labels show row letters
                  displayText = pin.gridPosition.row;
                  break;
                case 90:
                case 270:
                  // 90/270 degree rotation: row labels show column numbers
                  displayText = pin.gridPosition.col.toString();
                  break;
                default:
                  displayText = pin.gridPosition.row;
              }
              const labelTop = Math.round(pinTransformed.y - 10);
              
              // Check if position is within extended container bounds to provide smooth panning experience
              const extendedHeight = containerHeight + 200; // Extended bounds prevent label flickering during pan
              const isVisible = labelTop >= -100 && labelTop <= extendedHeight;
              
              if (isVisible) {
                rowLabels.push(
                  <div
                    key={positionKey}
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: labelTop,
                      width: 40,
                      height: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 12,
                      fontWeight: 'bold',
                      color: '#e0e0e0',
                      textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                      pointerEvents: 'none'
                    }}
                  >
                    {displayText}
                  </div>
                );
              }
            }
          });
          
          return rowLabels;
        })()}
      </div>
      
      {/* Main Canvas */}
      <Stage
        ref={stageRef}
        width={Math.max(100, stageSize.width - 40)} // Account for left margin with minimum
        height={Math.max(100, stageSize.height - 30)} // Account for top margin with minimum
        x={40} // Offset for left label area
        y={30} // Offset for top label area
        onClick={handleStageClick}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
      >
        <Layer>
          {/* Package outline */}
          {(() => {
            const { gridSpacing, minRow, maxRow, minCol, maxCol } = packageDims as any;
            
            if (!gridSpacing) return null;
            
            // Helper function to transform grid coordinates (same as transformPosition)
            const transformGridCoord = (gridX: number, gridY: number) => {
              let x = gridX;
              let y = gridY;
              
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
              
              // Apply viewport scaling and offset
              const transformedX = x * viewport.scale + viewport.x + stageSize.width / 2;
              const transformedY = y * viewport.scale + viewport.y + stageSize.height / 2;
              
              return { x: transformedX, y: transformedY };
            };
            
            // Calculate package outline corners based on grid boundaries
            const padding = gridSpacing * 0.8; // Add some padding around the grid
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
            
            const lines = [];
            
            // Helper function to transform grid coordinates (same as transformPosition)
            const transformGridCoord = (gridX: number, gridY: number) => {
              let x = gridX;
              let y = gridY;
              
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
              
              // Apply viewport scaling and offset
              const transformedX = x * viewport.scale + viewport.x + stageSize.width / 2;
              const transformedY = y * viewport.scale + viewport.y + stageSize.height / 2;
              
              return { x: transformedX, y: transformedY };
            };
            
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

          {/* Package label */}
          {(() => {
            const { gridSpacing, minRow, minCol, maxCol } = packageDims as any;
            
            if (!gridSpacing) return null;
            
            // Helper function to transform grid coordinates (same as transformPosition)
            const transformGridCoord = (gridX: number, gridY: number) => {
              let x = gridX;
              let y = gridY;
              
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
              
              // Apply viewport scaling and offset
              const transformedX = x * viewport.scale + viewport.x + stageSize.width / 2;
              const transformedY = y * viewport.scale + viewport.y + stageSize.height / 2;
              
              return { x: transformedX, y: transformedY };
            };
            
            // Position label at the top center of the package outline
            const centerX = (minCol + maxCol - 1) * gridSpacing / 2;
            const topY = (minRow - 0.5) * gridSpacing - gridSpacing * 0.8 - 20; // Above the package outline
            const labelPos = transformGridCoord(centerX, topY);
            
            return (
              <Text
                x={labelPos.x - 100}
                y={labelPos.y}
                width={200}
                text={`${pkg.device} (${pkg.packageType})`}
                fontSize={14}
                fill="#ccc"
                align="center"
              />
            );
          })()}

          {/* Pin rendering with LOD optimization */}
          {(() => {
            // Use viewport-based sizing for stable scaling
            const baseTileSize = 88; // Base tile size
            const tileSize = Math.max(20, baseTileSize * viewport.scale);
            
            // LOD system for performance
            const lodLevel = LODSystem.getLODLevel(viewport.scale);
            const maxVisiblePins = LODSystem.getMaxElements(currentLOD);
            const shouldRenderDetails = LODSystem.shouldRenderPinDetails(viewport.scale);
            const shouldRenderPinNames = LODSystem.shouldRenderText(viewport.scale, 'pin');
            const shouldRenderSignalNames = LODSystem.shouldRenderText(viewport.scale, 'signal');
            const fontMultiplier = LODSystem.getAdaptiveTextSize(viewport.scale, 12) / 12;
            
            // Limit pins based on LOD for very low zoom levels
            const pinsToRender = maxVisiblePins < pins.length ? 
              pins.slice(0, maxVisiblePins) : pins;
            
            console.log(`🎯 LOD Level: ${lodLevel}, Rendering: ${pinsToRender.length}/${pins.length} pins`);
            
            return pinsToRender.map(pin => {
              const pos = transformPosition(pin);
              const isSelected = selectedPins.has(pin.id);
              const bankColor = getBankColor(pin);
              const circleColor = getPinTypeColor(pin);
              const fontSize = Math.max(6, Math.min(16, viewport.scale * 10 * fontMultiplier));
              const smallFontSize = Math.max(5, Math.min(12, viewport.scale * 8 * fontMultiplier));
              
              // 差動ペアのハイライト色を取得
              const differentialHighlightColor = getDifferentialHighlightColor(pin, pins, selectedPins);
              
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
                  
                  {/* Inner circle with pin type color */}
                  <Circle
                    x={pos.x}
                    y={pos.y}
                    radius={Math.max(6, tileSize * 0.25)}
                    fill={circleColor}
                    stroke="#000"
                    strokeWidth={1}
                    listening={false} // Disable mouse events on circle to allow tile selection
                  />
                  
                  {/* Differential pair highlight ring */}
                  {differentialHighlightColor && (
                    <Circle
                      x={pos.x}
                      y={pos.y}
                      radius={Math.max(8, tileSize * 0.35)}
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
          
          {/* Differential pair connection lines with LOD */}
          {LODSystem.shouldRenderDifferentialPairs(viewport.scale) && (() => {
            const connectionLines: JSX.Element[] = [];
            const processedPairs = new Set();
            
            pins.forEach(pin => {
              if (processedPairs.has(pin.id)) return;
              
              // Check if this pin is part of a differential pair
              if (DifferentialPairUtils.isDifferentialPin(pin)) {
                const pairPin = DifferentialPairUtils.findPairPin(pin, pins);
                
                if (pairPin && !processedPairs.has(pairPin.id)) {
                  // Mark both pins as processed to avoid duplicate lines
                  processedPairs.add(pin.id);
                  processedPairs.add(pairPin.id);
                  
                  const pos1 = transformPosition(pin);
                  const pos2 = transformPosition(pairPin);
                  
                  // Get colors for the differential pair
                  const color1 = getDifferentialHighlightColor(pin, pins, selectedPins);
                  const color2 = getDifferentialHighlightColor(pairPin, pins, selectedPins);
                  
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
                }
              }
            });
            
            return connectionLines;
          })()}
          
          {/* Bank group boundaries with LOD - drawn below selection highlights */}
          {LODSystem.shouldRenderAtLOD(currentLOD, 2) && (() => {
            const bankGroups = getPinsByBank();
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
            Array.from(bankGroups.entries()).forEach(([bankKey, bankPins]) => {
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
            
            return Array.from(bankBoundaries.entries()).map(([bankKey, boundary]) => {
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
          
          {/* View info */}
          <Text
            x={10}
            y={10}
            text={`View: ${isTopView ? 'TOP' : 'BOTTOM'} | Rotation: ${rotation}° | Zoom: ${(zoom * 100).toFixed(0)}%`}
            fontSize={12}
            fill="#999"
          />
          
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
  );
};

export default PackageCanvas;
