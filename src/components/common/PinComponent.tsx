import React from 'react';
import { Group, Rect, Circle, Text } from 'react-konva';
import { Pin } from '../../types';

interface PinComponentProps {
  pin: Pin;
  position: { x: number; y: number };
  isSelected: boolean;
  bankColor: string;
  circleColor: string;
  differentialHighlightColor?: string;
  tileSize: number;
  fontSize: number;
  smallFontSize: number;
  showDetails: boolean;
  onPinClick: (_pin: Pin) => void;
  onPinDoubleClick: (_pin: Pin) => void;
}

// Memoized pin component for better performance
export const PinComponent = React.memo<PinComponentProps>(({
  pin,
  position,
  isSelected,
  bankColor,
  circleColor,
  differentialHighlightColor,
  tileSize,
  fontSize,
  smallFontSize,
  showDetails,
  onPinClick,
  onPinDoubleClick
}) => {
  const handleClick = React.useCallback(() => {
    onPinClick(pin);
  }, [pin, onPinClick]);

  const handleDoubleClick = React.useCallback(() => {
    onPinDoubleClick(pin);
  }, [pin, onPinDoubleClick]);

  return (
    <Group>
      {/* Pin tile (square with bank color) */}
      <Rect
        x={position.x - tileSize / 2}
        y={position.y - tileSize / 2}
        width={tileSize}
        height={tileSize}
        fill={bankColor}
        stroke={isSelected ? "#FFD700" : "#000"}
        strokeWidth={isSelected ? 2 : 1}
        cornerRadius={4}
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Differential pair tile highlight */}
      {differentialHighlightColor && (
        <Rect
          x={position.x - tileSize / 2 - 2}
          y={position.y - tileSize / 2 - 2}
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
        x={position.x}
        y={position.y}
        radius={Math.max(6, tileSize * 0.25)}
        fill={circleColor}
        stroke="#000"
        strokeWidth={1}
        listening={false}
      />
      
      {/* Differential pair highlight ring */}
      {differentialHighlightColor && (
        <Circle
          x={position.x}
          y={position.y}
          radius={Math.max(8, tileSize * 0.35)}
          fill="transparent"
          stroke={differentialHighlightColor}
          strokeWidth={3}
          listening={false}
          dash={[5, 5]}
        />
      )}
      
      {/* Pin number - always visible in center with background */}
      <Rect
        x={position.x - (pin.pinNumber.length * fontSize / 4) - 2}
        y={position.y - fontSize / 2 - 2}
        width={pin.pinNumber.length * fontSize / 2 + 4}
        height={fontSize + 4}
        fill="rgba(0, 0, 0, 0.7)"
        cornerRadius={2}
        listening={false}
      />
      <Text
        x={position.x}
        y={position.y - fontSize / 2}
        text={pin.pinNumber}
        fontSize={fontSize}
        fill="#FFF"
        align="center"
        onClick={handleClick}
        onDblClick={handleDoubleClick}
        style={{ cursor: 'pointer' }}
        fontStyle="bold"
        offsetX={pin.pinNumber.length * fontSize / 4}
        listening={false}
      />
      
      {/* Pin Name - shown when zoomed in or selected with background */}
      {pin.pinName && showDetails && tileSize > 50 && (
        <>
          <Rect
            x={position.x - ((pin.pinName.length > 14 ? 17 : pin.pinName.length) * smallFontSize / 4) - 2}
            y={position.y + fontSize / 2 + 1}
            width={(pin.pinName.length > 14 ? 17 : pin.pinName.length) * smallFontSize / 2 + 4}
            height={smallFontSize + 4}
            fill="rgba(0, 0, 0, 0.6)"
            cornerRadius={2}
            listening={false}
          />
          <Text
            x={position.x}
            y={position.y + fontSize / 2 + 3}
            text={pin.pinName.length > 14 ? pin.pinName.substring(0, 14) + '...' : pin.pinName}
            fontSize={smallFontSize}
            fill="#E0E0E0"
            align="center"
            onClick={handleClick}
            onDblClick={handleDoubleClick}
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
            x={position.x - ((pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize * 0.35) - 6}
            y={position.y + fontSize / 2 + 3 + smallFontSize - 1}
            width={(pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize * 0.7 + 12}
            height={smallFontSize + 6}
            fill="rgba(255, 215, 0, 0.9)"
            cornerRadius={3}
            listening={false}
          />
          <Text
            x={position.x}
            y={position.y + fontSize / 2 + 3 + smallFontSize + 2}
            text={pin.signalName.length > 12 ? pin.signalName.substring(0, 12) + '...' : pin.signalName}
            fontSize={smallFontSize}
            fill="#000"
            align="center"
            onClick={handleClick}
            onDblClick={handleDoubleClick}
            style={{ cursor: 'pointer' }}
            fontStyle="bold"
            offsetX={(pin.signalName.length > 12 ? 15 : pin.signalName.length) * smallFontSize / 4}
            listening={false}
          />
        </>
      )}
    </Group>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for memo
  return (
    prevProps.pin.id === nextProps.pin.id &&
    prevProps.position.x === nextProps.position.x &&
    prevProps.position.y === nextProps.position.y &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.bankColor === nextProps.bankColor &&
    prevProps.circleColor === nextProps.circleColor &&
    prevProps.differentialHighlightColor === nextProps.differentialHighlightColor &&
    prevProps.tileSize === nextProps.tileSize &&
    prevProps.fontSize === nextProps.fontSize &&
    prevProps.smallFontSize === nextProps.smallFontSize &&
    prevProps.showDetails === nextProps.showDetails &&
    prevProps.pin.pinNumber === nextProps.pin.pinNumber &&
    prevProps.pin.pinName === nextProps.pin.pinName &&
    prevProps.pin.signalName === nextProps.pin.signalName
  );
});
