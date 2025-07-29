import React from 'react';
import { Pin } from '@/types';

interface PinItemProps {
  pin: Pin;
  isSelected: boolean;
  onSelect: (pinId: string) => void;
  onAssignSignal: (pinId: string, signalName: string) => void;
}

export const PinItem: React.FC<PinItemProps> = ({
  pin,
  isSelected,
  onSelect,
  onAssignSignal,
}) => {
  const handleSignalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onAssignSignal(pin.id, event.target.value);
  };

  const getPinTypeColor = (type: string) => {
    const colors = {
      IO: '#4A90E2',
      CONFIG: '#E24A4A',
      POWER: '#4AE24A',
      GROUND: '#333333',
      MGT: '#9B4AE2',
      CLOCK: '#E2A64A',
      ADC: '#4AE2E2',
      SPECIAL: '#E24AA6',
      NC: '#666666',
      RESERVED: '#999999',
    };
    return colors[type as keyof typeof colors] || '#666666';
  };

  return (
    <div
      className={`pin-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(pin.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        margin: '2px 0',
        backgroundColor: isSelected ? '#444' : '#2a2a2a',
        borderRadius: '4px',
        cursor: 'pointer',
        border: `2px solid ${isSelected ? '#4A90E2' : 'transparent'}`,
      }}
    >
      {/* Pin Type Indicator */}
      <div
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: getPinTypeColor(pin.pinType),
          marginRight: '8px',
          flexShrink: 0,
        }}
      />

      {/* Pin Number */}
      <div
        style={{
          minWidth: '60px',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#ccc',
        }}
      >
        {pin.pinNumber}
      </div>

      {/* Pin Name */}
      <div
        style={{
          minWidth: '120px',
          fontSize: '11px',
          color: '#999',
          marginRight: '8px',
        }}
      >
        {pin.pinName}
      </div>

      {/* Signal Assignment */}
      <input
        type="text"
        value={pin.signalName}
        onChange={handleSignalChange}
        placeholder="Signal name"
        onClick={(e) => e.stopPropagation()}
        style={{
          flex: 1,
          padding: '4px 8px',
          fontSize: '12px',
          backgroundColor: '#1a1a1a',
          border: '1px solid #555',
          borderRadius: '3px',
          color: '#fff',
          marginRight: '8px',
        }}
      />

      {/* Bank Info */}
      {pin.bank && (
        <div
          style={{
            minWidth: '40px',
            fontSize: '11px',
            color: '#666',
            textAlign: 'center',
          }}
        >
          Bank {pin.bank}
        </div>
      )}

      {/* Assignment Status */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: pin.isAssigned ? '#4AE24A' : '#666',
          marginLeft: '8px',
        }}
      />
    </div>
  );
};
