import React, { useState } from 'react';
import { Pin } from '@/types';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';
import { 
  VOLTAGE_LEVELS, 
  getCompatibleIOStandards,
  getDefaultIOStandard,
  DRIVE_STRENGTHS,
  SLEW_RATES 
} from '@/constants/pin-constants';

interface PinItemProps {
  pin: Pin;
  isSelected: boolean;
  onSelect: (_pinId: string) => void;
  onAssignSignal: (_pinId: string, _signalName: string) => void;
  onUpdatePin?: (_pinId: string, _updates: Partial<Pin>) => void;
  isPairPin?: boolean; // 差動ペアの対応ピンかどうか
  isDifferentialPairPartner?: boolean; // 選択されたピンの差動ペア相手かどうか
}

export const PinItem: React.FC<PinItemProps> = ({
  pin,
  isSelected,
  onSelect,
  onAssignSignal,
  onUpdatePin,
  isPairPin = false,
  isDifferentialPairPartner = false,
}) => {
  const [showIOConfig, setShowIOConfig] = useState(false);

  const handleSignalChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onAssignSignal(pin.id, event.target.value);
  };

  const handleIOConfigChange = (field: string, value: string) => {
    if (!onUpdatePin) return;

    const updates: Partial<Pin> = {};
    
    if (field === 'direction') {
      updates.direction = value as any;
    } else if (field === 'voltage') {
      updates.voltage = value;
      // Auto-update I/O standard if it's currently AUTO or incompatible
      const currentIOStandard = pin.attributes?.['IO_Standard'] || pin.ioType || 'AUTO';
      if (currentIOStandard === 'AUTO' || !getCompatibleIOStandards(value).includes(currentIOStandard)) {
        const defaultIOStandard = getDefaultIOStandard(value);
        updates.attributes = {
          ...pin.attributes,
          'IO_Standard': defaultIOStandard
        };
        updates.ioType = defaultIOStandard;
      }
    } else if (field === 'ioStandard') {
      updates.attributes = {
        ...pin.attributes,
        'IO_Standard': value
      };
      updates.ioType = value;
    } else if (field === 'driveStrength') {
      updates.attributes = {
        ...pin.attributes,
        'Drive_Strength': value
      };
    } else if (field === 'slewRate') {
      updates.attributes = {
        ...pin.attributes,
        'Slew_Rate': value
      };
    }
    
    console.log('PinItem updating pin:', pin.id, 'with updates:', updates);
    onUpdatePin(pin.id, updates);
  };  const getPinTypeColor = (type: string) => {
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

  // Debug log for I/O settings visibility
  const shouldShowIOSettings = !['POWER', 'GROUND', 'NC'].includes(pin.pinType);
  if (process.env.NODE_ENV === 'development') {
    console.log(`Pin ${pin.pinNumber} (${pin.pinType}): shouldShowIOSettings = ${shouldShowIOSettings}`);
  }

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

      {/* Third Row: I/O Configuration (compact inline display) */}
      {!['POWER', 'GROUND', 'NC'].includes(pin.pinType) && (
        <div
          style={{
            display: 'flex',
            gap: '6px',
            marginTop: '4px',
            marginBottom: '4px',
          }}
        >
          {/* I/O Direction */}
          <div style={{ flex: 1 }}>
            <select
              value={pin.direction}
              onChange={(e) => {
                e.stopPropagation();
                handleIOConfigChange('direction', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '2px 4px',
                fontSize: '10px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
              }}
            >
              <option value="">---Direction---</option>
              <option value="Input">Input</option>
              <option value="Output">Output</option>
              <option value="InOut">InOut</option>
              <option value="Clock">Clock</option>
              <option value="Reset">Reset</option>
            </select>
          </div>

          {/* I/O Standard */}
          <div style={{ flex: 1 }}>
            <select
              value={pin.attributes?.['IO_Standard'] || pin.ioType || 'AUTO'}
              onChange={(e) => {
                e.stopPropagation();
                handleIOConfigChange('ioStandard', e.target.value);
              }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: '100%',
                padding: '2px 4px',
                fontSize: '10px',
                backgroundColor: '#2a2a2a',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
              }}
            >
              <option value="">---Standards---</option>
              <option value="AUTO">AUTO</option>
              {getCompatibleIOStandards(pin.voltage || '3.3V').map(standard => (
                <option key={standard} value={standard}>{standard}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Fourth Row: Bank Info */}
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

      {/* Advanced I/O Configuration Toggle (for additional settings) */}
      {!['POWER', 'GROUND', 'NC'].includes(pin.pinType) && (
        <div
          style={{
            marginTop: '6px',
          }}
        >
          {/* Toggle Button for Advanced Settings */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowIOConfig(!showIOConfig);
            }}
            style={{
              width: '100%',
              padding: '2px 6px',
              fontSize: '9px',
              backgroundColor: showIOConfig ? '#2563eb' : '#374151',
              border: '1px solid #555',
              borderRadius: '2px',
              color: '#fff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Advanced</span>
            <span style={{ fontSize: '7px' }}>
              {showIOConfig ? '▼' : '▶'}
            </span>
          </button>

          {/* Collapsible Advanced Configuration Panel */}
          {showIOConfig && (
            <div
              style={{
                marginTop: '4px',
                padding: '6px',
                backgroundColor: '#1e1e1e',
                border: '1px solid #333',
                borderRadius: '3px',
              }}
            >
              {/* Voltage and Drive Strength */}
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  marginBottom: '4px',
                }}
              >
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '8px', color: '#999', display: 'block', marginBottom: '1px' }}>
                    Voltage
                  </label>
                  <select
                    value={pin.voltage || '3.3V'}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleIOConfigChange('voltage', e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '1px 3px',
                      fontSize: '9px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #555',
                      borderRadius: '2px',
                      color: '#fff',
                    }}
                  >
                    {VOLTAGE_LEVELS.map(voltage => (
                      <option key={voltage} value={voltage}>{voltage}</option>
                    ))}
                  </select>
                </div>

                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '8px', color: '#999', display: 'block', marginBottom: '1px' }}>
                    Drive Strength
                  </label>
                  <select
                    value={pin.attributes?.['Drive_Strength'] || '---DriveStrength---'}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleIOConfigChange('driveStrength', e.target.value);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      width: '100%',
                      padding: '1px 3px',
                      fontSize: '9px',
                      backgroundColor: '#1a1a1a',
                      border: '1px solid #555',
                      borderRadius: '2px',
                      color: '#fff',
                    }}
                  >
                    {DRIVE_STRENGTHS.map(strength => (
                      <option key={strength} value={strength}>
                        {strength === '---DriveStrength---' ? strength : `${strength}mA`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Slew Rate */}
              <div>
                <label style={{ fontSize: '8px', color: '#999', display: 'block', marginBottom: '1px' }}>
                  Slew Rate
                </label>
                <select
                  value={pin.attributes?.['Slew_Rate'] || '---SlewRate---'}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleIOConfigChange('slewRate', e.target.value);
                  }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    width: '100%',
                    padding: '1px 3px',
                    fontSize: '9px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #555',
                    borderRadius: '2px',
                    color: '#fff',
                  }}
                >
                  {SLEW_RATES.map(rate => (
                    <option key={rate} value={rate}>
                      {rate}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
