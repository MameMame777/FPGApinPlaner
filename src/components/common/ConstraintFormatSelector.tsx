import React, { useState } from 'react';
import { ExportService } from '@/services/export-service';

export type ConstraintFormat = 'xdc' | 'sdc';

interface ConstraintFormatSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (_format: ConstraintFormat) => void;
  pins: any[];
  currentPackage: any;
}

export const ConstraintFormatSelector: React.FC<ConstraintFormatSelectorProps> = ({
  isOpen,
  onClose,
  onExport,
  pins,
  currentPackage
}) => {
  const [selectedFormat, setSelectedFormat] = useState<ConstraintFormat>('xdc');
  const [showPreview, setShowPreview] = useState(false);

  if (!isOpen) return null;

  const formatOptions = [
    {
      value: 'xdc' as ConstraintFormat,
      label: 'XDC (Xilinx)',
      description: 'Xilinx Design Constraints format for Vivado and ISE',
      icon: '📄',
      example: 'set_property PACKAGE_PIN A1 [get_ports clk]'
    },
    {
      value: 'sdc' as ConstraintFormat,
      label: 'SDC (Intel/Altera)',
      description: 'Synopsys Design Constraints format for Quartus',
      icon: '📄',
      example: 'set_location_assignment PIN_A1 -to clk'
    }
  ];

  const selectedOption = formatOptions.find(opt => opt.value === selectedFormat);
  const assignedPinsCount = pins.filter(pin => pin.isAssigned && pin.signalName.trim() !== '').length;

  const handleExport = () => {
    onExport(selectedFormat);
    onClose();
  };

  const getPreviewContent = () => {
    if (!showPreview) return null;

    const previewPins = pins.filter(pin => pin.isAssigned && pin.signalName.trim() !== '').slice(0, 3);
    
    if (selectedFormat === 'xdc') {
      return ExportService.exportToXDC(previewPins, currentPackage);
    } else {
      return ExportService.exportToSDC(previewPins, currentPackage);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        border: '1px solid #555',
        borderRadius: '8px',
        padding: '24px',
        width: '500px',
        maxHeight: '80vh',
        overflow: 'auto',
        color: 'white',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px',
        }}>
          <h3 style={{ margin: 0, fontSize: '18px' }}>Export Constraint File</h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#ccc',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: '16px', fontSize: '14px', color: '#ccc' }}>
          {assignedPinsCount} assigned pins will be exported
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold' }}>
            Choose constraint file format:
          </label>
          
          {formatOptions.map((option) => (
            <div
              key={option.value}
              style={{
                border: `2px solid ${selectedFormat === option.value ? '#007acc' : '#444'}`,
                borderRadius: '6px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                backgroundColor: selectedFormat === option.value ? '#1a4c80' : '#333',
                transition: 'all 0.2s ease',
              }}
              onClick={() => setSelectedFormat(option.value)}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px', marginRight: '8px' }}>{option.icon}</span>
                <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{option.label}</span>
              </div>
              <div style={{ fontSize: '13px', color: '#ccc', marginBottom: '6px' }}>
                {option.description}
              </div>
              <div style={{ 
                fontSize: '12px', 
                fontFamily: 'monospace', 
                color: '#bbb',
                backgroundColor: '#1a1a1a',
                padding: '4px 8px',
                borderRadius: '3px',
              }}>
                Example: {option.example}
              </div>
            </div>
          ))}
        </div>

        {assignedPinsCount > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={() => setShowPreview(!showPreview)}
              style={{
                backgroundColor: '#444',
                border: '1px solid #666',
                borderRadius: '4px',
                color: 'white',
                padding: '6px 12px',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </button>
            
            {showPreview && (
              <div style={{
                marginTop: '8px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #444',
                borderRadius: '4px',
                padding: '12px',
                maxHeight: '200px',
                overflow: 'auto',
              }}>
                <pre style={{
                  margin: 0,
                  fontSize: '11px',
                  color: '#ddd',
                  fontFamily: 'monospace',
                  whiteSpace: 'pre-wrap',
                }}>
                  {getPreviewContent()}
                </pre>
              </div>
            )}
          </div>
        )}

        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '8px',
        }}>
          <button
            onClick={onClose}
            style={{
              backgroundColor: '#666',
              border: '1px solid #888',
              borderRadius: '4px',
              color: 'white',
              padding: '8px 16px',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={assignedPinsCount === 0}
            style={{
              backgroundColor: assignedPinsCount > 0 ? '#007acc' : '#555',
              border: '1px solid #007acc',
              borderRadius: '4px',
              color: 'white',
              padding: '8px 16px',
              cursor: assignedPinsCount > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
              opacity: assignedPinsCount > 0 ? 1 : 0.6,
            }}
          >
            Export {selectedOption?.label}
          </button>
        </div>
      </div>
    </div>
  );
};
