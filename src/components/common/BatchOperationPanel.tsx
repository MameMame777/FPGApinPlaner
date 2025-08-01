import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/stores/app-store';
import { UndoRedoService } from '@/services/undo-redo-service';
import { 
  BatchOperationService, 
  ArrayPatternConfig, 
  DifferentialPatternConfig,
  VoltageIOConfig,
  PinSelectionCriteria,
  BatchOperationResult
} from '@/services/batch-operation-service';
import { 
  VOLTAGE_LEVELS, 
  IO_STANDARDS, 
  getDefaultIOStandard 
} from '@/constants/pin-constants';

interface BatchOperationPanelProps {
  isVisible: boolean;
}

type OperationType = 'array' | 'differential' | 'voltage-io' | 'direction' | 'clear';
type SelectionMode = 'manual' | 'criteria';

export const BatchOperationPanel: React.FC<BatchOperationPanelProps> = ({ isVisible }) => {
  const { 
    pins, 
    selectedPins, 
    assignSignal
  } = useAppStore();

  const [operationType, setOperationType] = useState<OperationType>('array');
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('manual');
  const [showPreview, setShowPreview] = useState(false);
  
  // Array pattern state
  const [arrayConfig, setArrayConfig] = useState<ArrayPatternConfig>({
    baseName: 'DATA',
    startIndex: 0,
    endIndex: 31,
    indexFormat: '[{i}]',
    padding: 0,
    step: 1
  });

  // Differential pattern state
  const [diffConfig, setDiffConfig] = useState<DifferentialPatternConfig>({
    baseName: 'CLK',
    positiveFormat: '_P',
    negativeFormat: '_N',
    startIndex: 0,
    endIndex: 3,
    indexFormat: '{i}',
    padding: 0
  });

  // Voltage and I/O standard configuration
  const [voltageIOConfig, setVoltageIOConfig] = useState<VoltageIOConfig>({
    voltage: '3.3V',
    ioStandard: 'AUTO',
    autoDetectIO: true,
    driveStrength: 12,
    slewRate: 'FAST'
  });

  // Direction configuration
  const [directionConfig, setDirectionConfig] = useState<string>('Input');

  // Selection criteria state
  const [criteria, setCriteria] = useState<PinSelectionCriteria>({
    pinTypes: ['IO'],
    assignmentStatus: 'unassigned'
  });

  const [previewResult, setPreviewResult] = useState<BatchOperationResult | null>(null);

  // Get selected pins based on mode
  const targetPins = useMemo(() => {
    if (selectionMode === 'manual') {
      return pins.filter(pin => selectedPins.has(pin.id));
    } else {
      return BatchOperationService.filterPinsByCriteria(pins, criteria);
    }
  }, [pins, selectedPins, selectionMode, criteria]);

  // Validation errors
  const validationErrors = useMemo(() => {
    if (operationType === 'clear') return [];
    if (operationType === 'voltage-io' || operationType === 'direction') {
      // Simple validation for new operations
      if (targetPins.length === 0) return ['No pins selected'];
      return [];
    }
    return BatchOperationService.validateBatchOperation(targetPins, operationType as 'array' | 'differential');
  }, [targetPins, operationType]);

  // Generate preview
  const generatePreview = () => {
    let result: BatchOperationResult;
    
    switch (operationType) {
      case 'array':
        result = BatchOperationService.assignArrayPattern(targetPins, arrayConfig);
        break;
      case 'differential':
        result = BatchOperationService.assignDifferentialPattern(targetPins, diffConfig);
        break;
      case 'voltage-io':
        result = BatchOperationService.setVoltageAndIO(targetPins, voltageIOConfig);
        break;
      case 'direction':
        result = BatchOperationService.setPinDirections(targetPins, directionConfig);
        break;
      case 'clear':
        result = BatchOperationService.clearSignals(targetPins);
        break;
      default:
        return;
    }
    
    setPreviewResult(result);
    setShowPreview(true);
  };

  // Execute batch operation
  const executeBatchOperation = () => {
    if (!previewResult) return;

    const actionDescription = `Batch ${operationType} operation on ${previewResult.processedPins} pins`;
    
    // Create undo action data
    const undoData = previewResult.assignments.map(assignment => ({
      pinId: assignment.pinId,
      oldSignal: assignment.oldSignal || '',
      newSignal: assignment.newSignal
    }));

    // Record action for undo/redo
    UndoRedoService.recordAction('batch_operation', undoData, actionDescription);

    // Apply changes based on operation type
    previewResult.assignments.forEach(assignment => {
      if (operationType === 'voltage-io') {
        // Update voltage and I/O standard
        const { updatePin } = useAppStore.getState();
        updatePin(assignment.pinId, {
          voltage: voltageIOConfig.voltage,
          attributes: {
            'IO_Standard': voltageIOConfig.ioStandard === 'AUTO' ? 
              getDefaultIOStandard(voltageIOConfig.voltage || '3.3V') : 
              (voltageIOConfig.ioStandard || 'LVCMOS33')
          },
          ioType: voltageIOConfig.ioStandard === 'AUTO' ? 
            getDefaultIOStandard(voltageIOConfig.voltage || '3.3V') : 
            (voltageIOConfig.ioStandard || 'LVCMOS33')
        });
      } else if (operationType === 'direction') {
        // Update pin direction
        const { updatePin } = useAppStore.getState();
        updatePin(assignment.pinId, {
          direction: directionConfig as any
        });
      } else {
        // Signal assignment operations
        assignSignal(assignment.pinId, assignment.newSignal);
      }
    });

    setShowPreview(false);
    setPreviewResult(null);
  };

  if (!isVisible) return null;

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-800">Batch Operations</h3>
        <p className="text-sm text-gray-500 mt-1">
          Assign patterns to multiple pins efficiently
        </p>
      </div>

      {/* Scrollable Content */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar"
      >
        
        {/* Operation Type Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Operation Type
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="operationType"
                value="array"
                checked={operationType === 'array'}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                className="mr-2"
              />
              <span className="text-sm">Array Pattern (DATA[0], DATA[1], ...)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="operationType"
                value="differential"
                checked={operationType === 'differential'}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                className="mr-2"
              />
              <span className="text-sm">Differential Pairs (CLK_P, CLK_N)</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="operationType"
                value="voltage-io"
                checked={operationType === 'voltage-io'}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                className="mr-2"
              />
              <span className="text-sm">Voltage & I/O Standards</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="operationType"
                value="direction"
                checked={operationType === 'direction'}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                className="mr-2"
              />
              <span className="text-sm">Pin Directions</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="operationType"
                value="clear"
                checked={operationType === 'clear'}
                onChange={(e) => setOperationType(e.target.value as OperationType)}
                className="mr-2"
              />
              <span className="text-sm">Clear Signals</span>
            </label>
          </div>
        </div>

        {/* Selection Mode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Pin Selection
          </label>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="radio"
                name="selectionMode"
                value="manual"
                checked={selectionMode === 'manual'}
                onChange={(e) => setSelectionMode(e.target.value as SelectionMode)}
                className="mr-2"
              />
              <span className="text-sm">Use Selected Pins ({selectedPins.size})</span>
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="selectionMode"
                value="criteria"
                checked={selectionMode === 'criteria'}
                onChange={(e) => setSelectionMode(e.target.value as SelectionMode)}
                className="mr-2"
              />
              <span className="text-sm">Auto-select by Criteria</span>
            </label>
          </div>
        </div>

        {/* Selection Criteria (when using criteria mode) */}
        {selectionMode === 'criteria' && (
          <div className="space-y-4 p-3 bg-blue-50 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Pin Types
              </label>
              <div className="space-x-4">
                {['IO', 'POWER', 'GROUND', 'CLOCK'].map(type => (
                  <label key={type} className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={criteria.pinTypes?.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCriteria(prev => ({
                            ...prev,
                            pinTypes: [...(prev.pinTypes || []), type]
                          }));
                        } else {
                          setCriteria(prev => ({
                            ...prev,
                            pinTypes: prev.pinTypes?.filter(t => t !== type) || []
                          }));
                        }
                      }}
                      className="mr-1"
                    />
                    <span className="text-xs">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Assignment Status
              </label>
              <select
                value={criteria.assignmentStatus}
                onChange={(e) => setCriteria(prev => ({
                  ...prev,
                  assignmentStatus: e.target.value as 'any' | 'assigned' | 'unassigned'
                }))}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
              >
                <option value="any">Any</option>
                <option value="assigned">Assigned</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>

            <div className="text-xs text-gray-600">
              Matches {targetPins.length} pins
            </div>
          </div>
        )}

        {/* Array Configuration */}
        {operationType === 'array' && (
          <div className="space-y-3 p-3 bg-green-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800">Array Pattern Configuration</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Base Name
                </label>
                <input
                  type="text"
                  value={arrayConfig.baseName}
                  onChange={(e) => setArrayConfig(prev => ({ ...prev, baseName: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="DATA"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Index Format
                </label>
                <input
                  type="text"
                  value={arrayConfig.indexFormat}
                  onChange={(e) => setArrayConfig(prev => ({ ...prev, indexFormat: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="[{i}]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Index
                </label>
                <input
                  type="number"
                  value={arrayConfig.startIndex}
                  onChange={(e) => setArrayConfig(prev => ({ ...prev, startIndex: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Index
                </label>
                <input
                  type="number"
                  value={arrayConfig.endIndex}
                  onChange={(e) => setArrayConfig(prev => ({ ...prev, endIndex: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Step
                </label>
                <input
                  type="number"
                  value={arrayConfig.step}
                  onChange={(e) => setArrayConfig(prev => ({ ...prev, step: parseInt(e.target.value) || 1 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Padding
                </label>
                <input
                  type="number"
                  value={arrayConfig.padding}
                  onChange={(e) => setArrayConfig(prev => ({ ...prev, padding: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Preview: {arrayConfig.baseName}{arrayConfig.indexFormat.replace('{i}', arrayConfig.startIndex.toString().padStart(arrayConfig.padding, '0'))}
            </div>
          </div>
        )}

        {/* Differential Configuration */}
        {operationType === 'differential' && (
          <div className="space-y-3 p-3 bg-purple-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800">Differential Pair Configuration</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Base Name
                </label>
                <input
                  type="text"
                  value={diffConfig.baseName}
                  onChange={(e) => setDiffConfig(prev => ({ ...prev, baseName: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="CLK"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Index Format
                </label>
                <input
                  type="text"
                  value={diffConfig.indexFormat}
                  onChange={(e) => setDiffConfig(prev => ({ ...prev, indexFormat: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="{i}"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Positive Suffix
                </label>
                <input
                  type="text"
                  value={diffConfig.positiveFormat}
                  onChange={(e) => setDiffConfig(prev => ({ ...prev, positiveFormat: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="_P"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Negative Suffix
                </label>
                <input
                  type="text"
                  value={diffConfig.negativeFormat}
                  onChange={(e) => setDiffConfig(prev => ({ ...prev, negativeFormat: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                  placeholder="_N"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Index
                </label>
                <input
                  type="number"
                  value={diffConfig.startIndex}
                  onChange={(e) => setDiffConfig(prev => ({ ...prev, startIndex: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Index
                </label>
                <input
                  type="number"
                  value={diffConfig.endIndex}
                  onChange={(e) => setDiffConfig(prev => ({ ...prev, endIndex: parseInt(e.target.value) || 0 }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="text-xs text-gray-600">
              Preview: {diffConfig.baseName}{(diffConfig.indexFormat || '{i}').replace('{i}', (diffConfig.startIndex || 0).toString())}{diffConfig.positiveFormat}, {diffConfig.baseName}{(diffConfig.indexFormat || '{i}').replace('{i}', (diffConfig.startIndex || 0).toString())}{diffConfig.negativeFormat}
            </div>
          </div>
        )}

        {/* Voltage & I/O Standard Configuration */}
        {operationType === 'voltage-io' && (
          <div className="space-y-3 p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800">Voltage & I/O Standard Configuration</h4>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Voltage Level
                </label>
                <select
                  value={voltageIOConfig.voltage || ''}
                  onChange={(e) => setVoltageIOConfig(prev => ({ ...prev, voltage: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  {VOLTAGE_LEVELS.map(voltage => (
                    <option key={voltage} value={voltage}>{voltage}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  I/O Standard
                </label>
                <select
                  value={voltageIOConfig.ioStandard || ''}
                  onChange={(e) => setVoltageIOConfig(prev => ({ ...prev, ioStandard: e.target.value }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  <option value="AUTO">AUTO (based on voltage)</option>
                  {IO_STANDARDS.map(standard => (
                    <option key={standard} value={standard}>{standard}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={voltageIOConfig.autoDetectIO || false}
                  onChange={(e) => setVoltageIOConfig(prev => ({ ...prev, autoDetectIO: e.target.checked }))}
                  className="mr-2"
                />
                <span className="text-xs">Auto-detect I/O standard</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Drive Strength (mA)
                </label>
                <select
                  value={voltageIOConfig.driveStrength || ''}
                  onChange={(e) => setVoltageIOConfig(prev => ({ ...prev, driveStrength: parseInt(e.target.value) }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  <option value="2">2 mA</option>
                  <option value="4">4 mA</option>
                  <option value="6">6 mA</option>
                  <option value="8">8 mA</option>
                  <option value="12">12 mA</option>
                  <option value="16">16 mA</option>
                  <option value="20">20 mA</option>
                  <option value="24">24 mA</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Slew Rate
                </label>
                <select
                  value={voltageIOConfig.slewRate || ''}
                  onChange={(e) => setVoltageIOConfig(prev => ({ ...prev, slewRate: e.target.value as 'SLOW' | 'FAST' }))}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Keep current</option>
                  <option value="SLOW">SLOW</option>
                  <option value="FAST">FAST</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Pin Direction Configuration */}
        {operationType === 'direction' && (
          <div className="space-y-3 p-3 bg-orange-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-800">Pin Direction Configuration</h4>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-2">
                Direction
              </label>
              <div className="space-y-2">
                {['Input', 'Output', 'InOut', 'Clock', 'Reset'].map(direction => (
                  <label key={direction} className="flex items-center">
                    <input
                      type="radio"
                      name="direction"
                      value={direction}
                      checked={directionConfig === direction}
                      onChange={(e) => setDirectionConfig(e.target.value)}
                      className="mr-2"
                    />
                    <span className="text-sm">{direction}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Target Summary */}
        <div className="p-3 bg-gray-100 rounded-lg">
          <h4 className="text-sm font-medium text-gray-800 mb-2">Target Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div>Selected pins: {targetPins.length}</div>
            <div>Operation: {operationType}</div>
            {validationErrors.length > 0 && (
              <div className="text-red-600">
                <div className="font-medium">Validation Issues:</div>
                <ul className="text-xs mt-1 space-y-1">
                  {validationErrors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Generate Preview Button */}
        <div>
          <button
            onClick={generatePreview}
            disabled={targetPins.length === 0 || validationErrors.length > 0}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
          >
            Generate Preview
          </button>
        </div>

        {/* Preview Section */}
        {showPreview && previewResult && (
          <div className="border rounded-lg bg-white">
            <div className="p-4 border-b bg-gray-50">
              <h4 className="font-medium text-gray-800">Preview Results</h4>
              <p className="text-sm text-gray-600 mt-1">
                {previewResult.success 
                  ? `${previewResult.processedPins} pins will be assigned`
                  : 'Operation preview failed'
                }
              </p>
            </div>

            {/* Errors */}
            {previewResult.errors.length > 0 && (
              <div className="p-3 bg-red-50 border-b">
                <h5 className="text-sm font-medium text-red-800 mb-1">Errors:</h5>
                <ul className="text-sm text-red-700 space-y-1">
                  {previewResult.errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assignments Preview */}
            {previewResult.assignments.length > 0 && (
              <div className="p-4">
                <h4 className="font-medium text-gray-800 mb-2">Assignments</h4>
                <div 
                  className="max-h-48 overflow-y-auto border rounded custom-scrollbar"
                >
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left">Pin</th>
                        <th className="px-3 py-2 text-left">Current</th>
                        <th className="px-3 py-2 text-left">New</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewResult.assignments.slice(0, 50).map((assignment, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-3 py-2 font-mono">{assignment.pinNumber}</td>
                          <td className="px-3 py-2 text-gray-600">{assignment.oldSignal || '-'}</td>
                          <td className="px-3 py-2 font-medium text-green-700">{assignment.newSignal}</td>
                        </tr>
                      ))}
                      {previewResult.assignments.length > 50 && (
                        <tr>
                          <td colSpan={3} className="px-3 py-2 text-center text-gray-500 italic">
                            ... and {previewResult.assignments.length - 50} more
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Footer for Execute Operation */}
      {showPreview && previewResult && (
        <div className="flex-shrink-0 border-t border-gray-200 bg-white p-4">
          <div className="flex gap-3">
            <button
              onClick={() => setShowPreview(false)}
              className="flex-1 py-2 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={executeBatchOperation}
              disabled={!previewResult.success || previewResult.processedPins === 0}
              className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              Execute Operation
            </button>
          </div>
        </div>
      )}
    </div>
  );
};