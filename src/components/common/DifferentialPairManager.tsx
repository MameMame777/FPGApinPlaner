import React, { useState, useEffect } from 'react';
import { 
  DifferentialPairGroup, 
  DifferentialPairTemplate, 
  Pin 
} from '../../types/core';
import { DifferentialPairService } from '../../services/differential-pair-service';

interface DifferentialPairManagerProps {
  pins: Pin[];
  onPairCreated?: (pair: DifferentialPairGroup) => void;
  onPairDeleted?: (pairId: string) => void;
  onPairUpdated?: (pair: DifferentialPairGroup) => void;
}

export const DifferentialPairManager: React.FC<DifferentialPairManagerProps> = ({
  pins,
  onPairCreated,
  onPairDeleted,
  onPairUpdated
}) => {
  const [differentialPairs, setDifferentialPairs] = useState<DifferentialPairGroup[]>([]);
  const [templates, setTemplates] = useState<DifferentialPairTemplate[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [pairName, setPairName] = useState('');
  const [selectedPositivePin, setSelectedPositivePin] = useState<string>('');
  const [selectedNegativePin, setSelectedNegativePin] = useState<string>('');

  // データの初期化
  useEffect(() => {
    setDifferentialPairs(DifferentialPairService.getAllDifferentialPairs());
    setTemplates(DifferentialPairService.getAllTemplates());
  }, []);

  // 自動検出機能
  const handleAutoDetect = () => {
    const detectedPairs = DifferentialPairService.autoDetectDifferentialPairs(pins);
    setDifferentialPairs(prev => [...prev, ...detectedPairs]);
    
    detectedPairs.forEach(pair => {
      onPairCreated?.(pair);
    });
  };

  // 差動ペア作成
  const handleCreatePair = () => {
    if (!pairName || !selectedPositivePin || !selectedNegativePin) {
      alert('すべてのフィールドを入力してください');
      return;
    }

    const positivePin = pins.find(p => p.id === selectedPositivePin);
    const negativePin = pins.find(p => p.id === selectedNegativePin);

    if (!positivePin || !negativePin) {
      alert('Selected pin not found');
      return;
    }

    let result;
    if (selectedTemplate) {
      result = DifferentialPairService.createFromTemplate(
        selectedTemplate,
        pairName,
        positivePin,
        negativePin
      );
    } else {
      result = DifferentialPairService.createDifferentialPair(
        pairName,
        positivePin,
        negativePin
      );
    }

    if (result.success) {
      setDifferentialPairs(prev => [...prev, result.data]);
      onPairCreated?.(result.data);
      
      // フォームリセット
      setPairName('');
      setSelectedPositivePin('');
      setSelectedNegativePin('');
      setSelectedTemplate('');
      setShowCreateDialog(false);
    } else {
      alert(`エラー: ${result.error}`);
    }
  };

  // 差動ペア削除
  const handleDeletePair = (pairId: string) => {
    if (confirm('この差動ペアを削除しますか？')) {
      if (DifferentialPairService.deleteDifferentialPair(pairId)) {
        setDifferentialPairs(prev => prev.filter(p => p.id !== pairId));
        onPairDeleted?.(pairId);
      }
    }
  };

  // 差動ペア検証
  const handleVerifyPair = (pairId: string) => {
    const pair = DifferentialPairService.getDifferentialPair(pairId);
    if (!pair) return;

    const positivePin = pins.find(p => p.id === pair.positivePinId);
    const negativePin = pins.find(p => p.id === pair.negativePinId);

    if (positivePin && negativePin) {
      const validation = DifferentialPairService.validateDifferentialPair(
        positivePin,
        negativePin,
        pair.constraints
      );

      const updateResult = DifferentialPairService.updateDifferentialPair(pairId, {
        verified: true,
        status: validation.isValid ? 'valid' : (validation.warnings.length > 0 ? 'warning' : 'invalid'),
        errors: validation.errors,
        warnings: validation.warnings
      });

      if (updateResult.success) {
        setDifferentialPairs(prev => 
          prev.map(p => p.id === pairId ? updateResult.data : p)
        );
        onPairUpdated?.(updateResult.data);
      }
    }
  };

  // 統計情報の取得
  const statistics = DifferentialPairService.getStatistics();

  // ステータス色の取得
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'invalid': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // 利用可能なピンのフィルタリング
  const getAvailablePins = () => {
    return pins.filter(pin => {
      const existingPair = DifferentialPairService.isPinInDifferentialPair(pin.id);
      return !existingPair && pin.pinType === 'IO';
    });
  };

  const availablePins = getAvailablePins();

  return (
    <div className="differential-pair-manager p-4 bg-white rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Differential Pair Management</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            ペア作成
          </button>
          <button
            onClick={handleAutoDetect}
            className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
          >
            自動検出
          </button>
        </div>
      </div>

      {/* 統計表示 */}
      <div className="grid grid-cols-4 gap-4 mb-4 text-sm">
        <div className="bg-gray-100 p-2 rounded">
          <div className="font-semibold">総数</div>
          <div className="text-lg">{statistics.total}</div>
        </div>
        <div className="bg-green-100 p-2 rounded">
          <div className="font-semibold">有効</div>
          <div className="text-lg text-green-600">{statistics.validationSummary.valid}</div>
        </div>
        <div className="bg-yellow-100 p-2 rounded">
          <div className="font-semibold">警告</div>
          <div className="text-lg text-yellow-600">{statistics.validationSummary.warnings}</div>
        </div>
        <div className="bg-red-100 p-2 rounded">
          <div className="font-semibold">エラー</div>
          <div className="text-lg text-red-600">{statistics.validationSummary.errors}</div>
        </div>
      </div>

      {/* 差動ペアリスト */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {differentialPairs.map(pair => {
          const positivePin = pins.find(p => p.id === pair.positivePinId);
          const negativePin = pins.find(p => p.id === pair.negativePinId);

          return (
            <div key={pair.id} className="border rounded p-3">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{pair.name}</span>
                    <span className={`text-sm ${getStatusColor(pair.status)}`}>
                      {pair.status.toUpperCase()}
                    </span>
                    <span className="text-xs bg-gray-200 px-2 py-1 rounded">
                      {pair.category}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-600 mt-1">
                    P: {positivePin?.pinNumber} ({positivePin?.signalName || 'Unassigned'}) | 
                    N: {negativePin?.pinNumber} ({negativePin?.signalName || 'Unassigned'})
                  </div>

                  {pair.constraints && (
                    <div className="text-xs text-gray-500 mt-1">
                      {pair.constraints.diffImpedance && `差動: ${pair.constraints.diffImpedance}Ω `}
                      {pair.constraints.ioStandard && `${pair.constraints.ioStandard} `}
                      {pair.constraints.maxSkew && `スキュー: ${pair.constraints.maxSkew}ps`}
                    </div>
                  )}

                  {pair.errors && pair.errors.length > 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      エラー: {pair.errors.join(', ')}
                    </div>
                  )}

                  {pair.warnings && pair.warnings.length > 0 && (
                    <div className="text-xs text-yellow-600 mt-1">
                      警告: {pair.warnings.join(', ')}
                    </div>
                  )}
                </div>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleVerifyPair(pair.id)}
                    className="px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200"
                    title="検証"
                  >
                    検証
                  </button>
                  <button
                    onClick={() => handleDeletePair(pair.id)}
                    className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200"
                    title="削除"
                  >
                    削除
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Creation Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-96 max-h-[80vh] overflow-y-auto">
            <h4 className="text-lg font-semibold mb-4">差動ペア作成</h4>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">ペア名</label>
                <input
                  type="text"
                  value={pairName}
                  onChange={(e) => setPairName(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                  placeholder="例: CLK_DIFF"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">テンプレート (オプション)</label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => setSelectedTemplate(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Custom</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name} - {template.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">正側ピン (P)</label>
                  <select
                    value={selectedPositivePin}
                    onChange={(e) => setSelectedPositivePin(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">選択してください</option>
                    {availablePins.map(pin => (
                      <option key={pin.id} value={pin.id}>
                        {pin.pinNumber} - {pin.signalName || 'Unassigned'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">負側ピン (N)</label>
                  <select
                    value={selectedNegativePin}
                    onChange={(e) => setSelectedNegativePin(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">選択してください</option>
                    {availablePins.map(pin => (
                      <option key={pin.id} value={pin.id}>
                        {pin.pinNumber} - {pin.signalName || 'Unassigned'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {availablePins.length === 0 && (
                <div className="text-sm text-yellow-600 bg-yellow-100 p-2 rounded">
                  No available I/O pins.
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-gray-600 border rounded hover:bg-gray-100"
              >
                キャンセル
              </button>
              <button
                onClick={handleCreatePair}
                disabled={!pairName || !selectedPositivePin || !selectedNegativePin}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300"
              >
                作成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
