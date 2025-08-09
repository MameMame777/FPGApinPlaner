import React from 'react';
import { Pin } from '@/types';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';

interface PinItemProps {
  pin: Pin;
  isSelected: boolean;
  onSelect: (_pinId: string) => void;
  onAssignSignal: (_pinId: string, _signalName: string) => void;
  isPairPin?: boolean; // 差動ペアの対応ピンかどうか
  isDifferentialPairPartner?: boolean; // 選択されたピンの差動ペア相手かどうか
}

export const PinItem: React.FC<PinItemProps> = ({
  pin,
  isSelected,
  onSelect,
  onAssignSignal,
  isPairPin = false,
  isDifferentialPairPartner = false,
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

  // 差動ペアのタイプを取得 (pinNameを優先)
  const differentialType = DifferentialPairUtils.getDifferentialPairType(pin.pinName) || 
                           (pin.signalName ? DifferentialPairUtils.getDifferentialPairType(pin.signalName) : null);
  const isDifferential = DifferentialPairUtils.isDifferentialPin(pin);

  return (
    <div
      className={`pin-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(pin.id)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '8px 12px',
        margin: '2px 0',
        backgroundColor: isSelected ? '#444' : (isDifferentialPairPartner ? '#3d4852' : (isPairPin ? '#2d3748' : '#2a2a2a')), // 差動ペアパートナーの背景色を追加
        borderRadius: '4px',
        cursor: 'pointer',
        border: `2px solid ${isSelected ? '#4A90E2' : (isDifferentialPairPartner ? '#f59e0b' : (isPairPin ? '#9333ea' : 'transparent'))}`, // 差動ペアパートナーにオレンジ色の枠を追加
        position: 'relative',
      }}
    >
      {/* Differential Pair Indicator */}
      {isDifferential && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            fontSize: '10px',
            color: differentialType === 'positive' ? '#22c55e' : '#ef4444',
            fontWeight: 'bold',
          }}
          title={`Differential ${differentialType === 'positive' ? 'Positive' : 'Negative'} Pin`}
        >
          {differentialType === 'positive' ? '⚡+' : '⚡-'}
        </div>
      )}

      {/* Differential Pair Partner Indicator */}
      {isDifferentialPairPartner && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            fontSize: '12px',
            color: '#f59e0b',
            fontWeight: 'bold',
          }}
          title="Differential Pair Partner of Selected Pin"
        >
          ⇌
        </div>
      )}

      {/* Pair Pin Indicator */}
      {isPairPin && !isDifferentialPairPartner && (
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            fontSize: '10px',
            color: '#9333ea',
            fontWeight: 'bold',
          }}
          title="Differential Pair Pin"
        >
          ⟷
        </div>
      )}

      {/* Top Row: Pin Info and Assignment Status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '4px',
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
            flex: 1,
          }}
        >
          {pin.pinName}
        </div>

        {/* Assignment Status */}
        <div
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: pin.isAssigned ? '#4AE24A' : '#666',
            marginLeft: '8px',
            flexShrink: 0,
          }}
        />
      </div>

      {/* Second Row: Signal Assignment */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '4px',
        }}
      >
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
          }}
        />
      </div>

      {/* Third Row: Bank Info */}
      {pin.bank && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            fontSize: '11px',
            color: '#666',
          }}
        >
          <span style={{ marginRight: '4px' }}>🏦</span>
          <span>Bank {pin.bank}</span>
        </div>
      )}
    </div>
  );
};
