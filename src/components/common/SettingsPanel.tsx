import React, { useState } from 'react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState({
    display: {
      theme: 'dark',
      pinSize: 88,
      showPinNumbers: true,
      showSignalNames: true,
      showBankBoundaries: true,
      gridOpacity: 0.4,
      autoZoomToFit: false,
    },
    interaction: {
      doubleClickToEdit: true,
      dragThreshold: 8,
      wheelZoomSensitivity: 1.05,
      panSensitivity: 1.0,
    },
    export: {
      includeHeader: true,
      defaultFormat: 'xdc',
      ioStandard: 'auto',
      driveStrength: 12,
    },
    advanced: {
      enableDebugMode: false,
      showPerformanceMetrics: false,
      cacheEnabled: true,
      maxUndoSteps: 50,
    }
  });

  if (!isOpen) return null;

  const handleSettingChange = (category: keyof typeof settings, key: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
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
      zIndex: 9999,
    }}>
      <div style={{
        backgroundColor: '#2a2a2a',
        border: '1px solid #555',
        borderRadius: '8px',
        width: '600px',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid #444',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '18px' }}>Settings</h2>
          <button
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#999',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '20px' }}>
          {/* Display Settings */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#4A90E2', margin: '0 0 12px 0', fontSize: '16px' }}>Display</h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Pin Size</label>
                <input
                  type="range"
                  min="60"
                  max="120"
                  value={settings.display.pinSize}
                  onChange={(e) => handleSettingChange('display', 'pinSize', parseInt(e.target.value))}
                  style={{ width: '120px' }}
                />
                <span style={{ color: '#999', minWidth: '40px' }}>{settings.display.pinSize}px</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Grid Opacity</label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.display.gridOpacity}
                  onChange={(e) => handleSettingChange('display', 'gridOpacity', parseFloat(e.target.value))}
                  style={{ width: '120px' }}
                />
                <span style={{ color: '#999', minWidth: '40px' }}>{Math.round(settings.display.gridOpacity * 100)}%</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Show Pin Numbers</label>
                <input
                  type="checkbox"
                  checked={settings.display.showPinNumbers}
                  onChange={(e) => handleSettingChange('display', 'showPinNumbers', e.target.checked)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Show Signal Names</label>
                <input
                  type="checkbox"
                  checked={settings.display.showSignalNames}
                  onChange={(e) => handleSettingChange('display', 'showSignalNames', e.target.checked)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Show Bank Boundaries</label>
                <input
                  type="checkbox"
                  checked={settings.display.showBankBoundaries}
                  onChange={(e) => handleSettingChange('display', 'showBankBoundaries', e.target.checked)}
                />
              </div>
            </div>
          </div>

          {/* Export Settings */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ color: '#4A90E2', margin: '0 0 12px 0', fontSize: '16px' }}>Export</h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Default Format</label>
                <select
                  value={settings.export.defaultFormat}
                  onChange={(e) => handleSettingChange('export', 'defaultFormat', e.target.value)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    color: '#fff',
                  }}
                >
                  <option value="xdc">XDC (Xilinx)</option>
                  <option value="csv">CSV</option>
                  <option value="report">Report</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>I/O Standard</label>
                <select
                  value={settings.export.ioStandard}
                  onChange={(e) => handleSettingChange('export', 'ioStandard', e.target.value)}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    color: '#fff',
                  }}
                >
                  <option value="auto">Auto (voltage-based)</option>
                  <option value="LVCMOS33">LVCMOS33</option>
                  <option value="LVCMOS18">LVCMOS18</option>
                  <option value="LVCMOS25">LVCMOS25</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Drive Strength</label>
                <input
                  type="number"
                  min="2"
                  max="24"
                  step="2"
                  value={settings.export.driveStrength}
                  onChange={(e) => handleSettingChange('export', 'driveStrength', parseInt(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    color: '#fff',
                    width: '60px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Advanced Settings */}
          <div>
            <h3 style={{ color: '#4A90E2', margin: '0 0 12px 0', fontSize: '16px' }}>Advanced</h3>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Debug Mode</label>
                <input
                  type="checkbox"
                  checked={settings.advanced.enableDebugMode}
                  onChange={(e) => handleSettingChange('advanced', 'enableDebugMode', e.target.checked)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Performance Metrics</label>
                <input
                  type="checkbox"
                  checked={settings.advanced.showPerformanceMetrics}
                  onChange={(e) => handleSettingChange('advanced', 'showPerformanceMetrics', e.target.checked)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label style={{ color: '#ccc' }}>Max Undo Steps</label>
                <input
                  type="number"
                  min="10"
                  max="100"
                  value={settings.advanced.maxUndoSteps}
                  onChange={(e) => handleSettingChange('advanced', 'maxUndoSteps', parseInt(e.target.value))}
                  style={{
                    padding: '4px 8px',
                    backgroundColor: '#1a1a1a',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    color: '#fff',
                    width: '60px',
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid #444',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px',
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#ccc',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => {
              // Save settings logic here
              localStorage.setItem('fpga-planner-settings', JSON.stringify(settings));
              onClose();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#4A90E2',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
            }}
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
