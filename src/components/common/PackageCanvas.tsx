import React, { useRef, useEffect, useState } from 'react';
import { Stage, Layer, Rect, Text, Group, Line, Circle } from 'react-konva';
import { KonvaEventObject } from 'konva/lib/Node';
import { Pin, Package } from '@/types';

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
  onZoomChange
}) => {
  const stageRef = useRef<any>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  
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
  
  // Constants for mouse interaction
  const DRAG_THRESHOLD_TIME = 200; // ms - time before starting drag (slightly longer for better UX)
  const DRAG_THRESHOLD_DISTANCE = 8; // pixels - distance before starting drag (slightly more forgiving)

  // Canvas size management
  useEffect(() => {
    const updateSize = () => {
      const container = stageRef.current?.container();
      if (container) {
        const rect = container.getBoundingClientRect();
        setStageSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

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

  // Debug logging
  useEffect(() => {
    if (pins.length > 0) {
      console.log('🎯 Package dimensions:', packageDims);
      console.log('🎯 First few pins:', pins.slice(0, 5).map(p => ({
        pinNumber: p.pinNumber,
        pinName: p.pinName,
        signalName: p.signalName,
        gridPosition: p.gridPosition,
        position: p.position,
        transformed: transformPosition(p)
      })));
      
      // Debug specific pins that might be problematic
      const a1 = pins.find(p => p.pinNumber === 'A1');
      if (a1) console.log('🔍 A1 Debug:', { pinNumber: a1.pinNumber, pinName: a1.pinName, signalName: a1.signalName, gridPosition: a1.gridPosition, position: a1.position, transformed: transformPosition(a1) });
      
      // Check pins with signal names
      const assignedPins = pins.filter(p => p.signalName && p.signalName.trim() !== '');
      console.log('📌 Pins with signal names:', assignedPins.length, assignedPins.slice(0, 3).map(p => ({
        pinNumber: p.pinNumber,
        signalName: p.signalName
      })));
      
      // Show pins with unusual data
      const suspiciousPins = pins.filter(p => 
        p.pinNumber.toLowerCase().includes('total') || 
        p.pinNumber.toLowerCase().includes('number') ||
        p.pinName?.toLowerCase().includes('total') ||
        p.pinName?.toLowerCase().includes('number')
      );
      if (suspiciousPins.length > 0) {
        console.log('� Suspicious pins found:', suspiciousPins.map(p => ({
          pinNumber: p.pinNumber,
          pinName: p.pinName,
          gridPosition: p.gridPosition
        })));
      }
    }
  }, [pins, packageDims]);

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
    
    // Apply viewport scaling and offset
    const transformedX = x * viewport.scale + viewport.x + stageSize.width / 2;
    const transformedY = y * viewport.scale + viewport.y + stageSize.height / 2;
    
    return { x: transformedX, y: transformedY };
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
      
      setViewport({
        scale: clampedScale,
        x: newPos.x,
        y: newPos.y,
      });
      
      // Notify parent component of zoom change
      onZoomChange?.(clampedScale);
    } else {
      // Wheel: Pan up/down
      setViewport(prev => ({
        ...prev,
        y: prev.y - e.evt.deltaY * 0.5,
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
      
      setViewport(prev => ({
        ...prev,
        x: prev.x + dx,
        y: prev.y + dy,
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

  // Reset viewport when zoom is reset to 1.0
  useEffect(() => {
    if (zoom === 1.0) {
      setViewport({
        x: 0,
        y: 0,
        scale: 1
      });
    }
  }, [zoom]);

  // Reset viewport to 100%
  const resetViewport = () => {
    setViewport({
      x: 0,
      y: 0,
      scale: 1
    });
    onZoomChange?.(1);
  };

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
          onPinSelect(pin.id);
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

  return (
    <div style={{ width: '100%', height: '100%', backgroundColor: '#1a1a1a' }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
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

          {/* Grid lines for reference */}
          {viewport.scale > 0.5 && (() => {
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
            
            // Minor grid lines - tile centers (lighter, only when zoomed in)
            if (viewport.scale > 1.0) {
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

          {/* Grid Coordinate Labels */}
          {viewport.scale > 0.3 && (() => {
            // Use package dimensions with grid information
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
            
            const labels = [];
            
            // Column labels (1, 2, 3, ...) - bottom of package
            for (let col = minCol; col <= maxCol; col++) {
              // Use the same coordinate calculation as pins
              const gridX = (col - 1) * gridSpacing;
              const gridY = (maxRow + 1) * gridSpacing;
              const pos = transformGridCoord(gridX, gridY);
              
              let labelText = col.toString();
              if (!isTopView) {
                labelText = (maxCol + minCol - col).toString();
              }
              
              labels.push(
                <Text
                  key={`col-bottom-${col}`}
                  x={pos.x - 5}
                  y={pos.y + 10}
                  text={labelText}
                  fontSize={Math.max(10, Math.min(14, viewport.scale * 12))}
                  fill="#999"
                  align="center"
                />
              );
            }
            
            // Column labels (1, 2, 3, ...) - top of package (same as bottom)
            for (let col = minCol; col <= maxCol; col++) {
              // Use the same coordinate calculation as pins
              const gridX = (col - 1) * gridSpacing;
              const gridY = (minRow - 1) * gridSpacing;
              const pos = transformGridCoord(gridX, gridY);
              
              let labelText = col.toString();
              if (!isTopView) {
                labelText = (maxCol + minCol - col).toString();
              }
              
              labels.push(
                <Text
                  key={`col-top-${col}`}
                  x={pos.x - 5}
                  y={pos.y - 20}
                  text={labelText}
                  fontSize={Math.max(10, Math.min(14, viewport.scale * 12))}
                  fill="#999"
                  align="center"
                />
              );
            }
            
            // Row labels (A, B, C, ...) - left side of package
            for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
              // Use the same coordinate calculation as pins
              const gridX = (minCol - 2) * gridSpacing;
              const gridY = rowIndex * gridSpacing;
              const pos = transformGridCoord(gridX, gridY);
              
              let labelIndex = rowIndex;
              if (!isTopView) {
                labelIndex = maxRow + minRow - rowIndex;
              }
              const labelText = String.fromCharCode(65 + (labelIndex % 26));
              
              labels.push(
                <Text
                  key={`row-left-${rowIndex}`}
                  x={pos.x}
                  y={pos.y - 5}
                  text={labelText}
                  fontSize={Math.max(10, Math.min(14, viewport.scale * 12))}
                  fill="#999"
                  align="center"
                />
              );
            }
            
            // Row labels (A, B, C, ...) - right side of package (same as left)
            for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex++) {
              // Use the same coordinate calculation as pins
              const gridX = (maxCol + 1) * gridSpacing;
              const gridY = rowIndex * gridSpacing;
              const pos = transformGridCoord(gridX, gridY);
              
              let labelIndex = rowIndex;
              if (!isTopView) {
                labelIndex = maxRow + minRow - rowIndex;
              }
              const labelText = String.fromCharCode(65 + (labelIndex % 26));
              
              labels.push(
                <Text
                  key={`row-right-${rowIndex}`}
                  x={pos.x + 10}
                  y={pos.y - 5}
                  text={labelText}
                  fontSize={Math.max(10, Math.min(14, viewport.scale * 12))}
                  fill="#999"
                  align="center"
                />
              );
            }
            
            return <Group>{labels}</Group>;
          })()}

          {/* Pin rendering */}
          {(() => {
            // Use viewport-based sizing for stable scaling
            const baseTileSize = 88; // Base tile size
            const tileSize = Math.max(20, baseTileSize * viewport.scale);
            
            return pins.map(pin => {
              const pos = transformPosition(pin);
              const isSelected = selectedPins.has(pin.id);
              const bankColor = getBankColor(pin);
              const circleColor = getPinTypeColor(pin);
              const fontSize = Math.max(6, Math.min(16, viewport.scale * 10));
              const smallFontSize = Math.max(5, Math.min(12, viewport.scale * 8));
              
              // Show detailed info when zoom is sufficient or pin is selected
              const showDetails = viewport.scale > 0.4 || isSelected;
              
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
                  
                  {/* Pin Name - shown when zoomed in or selected with background */}
                  {pin.pinName && showDetails && tileSize > 50 && (
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
                  
                  {/* Signal name - shown below pin name when assigned with background */}
                  {pin.signalName && pin.signalName.trim() !== '' && (
                    <>
                      <Rect
                        x={pos.x - ((pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize / 4) - 2}
                        y={pos.y + fontSize / 2 + 3 + smallFontSize}
                        width={(pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize / 2 + 4}
                        height={smallFontSize + 4}
                        fill="rgba(255, 215, 0, 0.8)"
                        cornerRadius={2}
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
          
          {/* Bank group boundaries - drawn below selection highlights */}
          {(() => {
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
