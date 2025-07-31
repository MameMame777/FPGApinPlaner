import React from 'react';
import { useAppStore } from '@/stores/app-store';

interface UndoRedoControlsProps {
  className?: string;
}

export const UndoRedoControls: React.FC<UndoRedoControlsProps> = ({ className = '' }) => {
  const { 
    canUndo, 
    canRedo, 
    currentActionDescription, 
    nextRedoActionDescription, 
    undo, 
    redo 
  } = useAppStore();

  const buttonStyle = (enabled: boolean) => ({
    padding: '6px',
    backgroundColor: enabled ? '#333' : '#222',
    border: '1px solid #555',
    borderRadius: '4px',
    color: enabled ? '#ccc' : '#666',
    cursor: enabled ? 'pointer' : 'not-allowed',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    transition: 'background-color 0.2s',
  });

  return (
    <div 
      className={`flex flex-row items-center ${className}`}
      style={{ display: 'flex', flexDirection: 'row', alignItems: 'center' }}
    >
      <button
        onClick={undo}
        disabled={!canUndo}
        title={`元に戻す${currentActionDescription ? `: ${currentActionDescription}` : ''} (Ctrl+Z)`}
        style={{
          ...buttonStyle(canUndo),
          borderRadius: '4px 0 0 4px',
          borderRight: 'none',
        }}
        onMouseEnter={(e) => {
          if (canUndo) {
            e.currentTarget.style.backgroundColor = '#444';
          }
        }}
        onMouseLeave={(e) => {
          if (canUndo) {
            e.currentTarget.style.backgroundColor = '#333';
          }
        }}
      >
        <UndoIcon className="w-3 h-3" />
      </button>

      <button
        onClick={redo}
        disabled={!canRedo}
        title={`やり直し${nextRedoActionDescription ? `: ${nextRedoActionDescription}` : ''} (Ctrl+Y)`}
        style={{
          ...buttonStyle(canRedo),
          borderRadius: '0 4px 4px 0',
        }}
        onMouseEnter={(e) => {
          if (canRedo) {
            e.currentTarget.style.backgroundColor = '#444';
          }
        }}
        onMouseLeave={(e) => {
          if (canRedo) {
            e.currentTarget.style.backgroundColor = '#333';
          }
        }}
      >
        <RedoIcon className="w-3 h-3" />
      </button>
    </div>
  );
};

// Undo Icon Component
const UndoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M3 7v6h6" />
    <path d="m21 17a9 9 0 00-9-9 9 9 0 00-6 2.3l-3 3" />
  </svg>
);

// Redo Icon Component
const RedoIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M21 7v6h-6" />
    <path d="m3 17a9 9 0 019-9 9 9 0 016 2.3l3 3" />
  </svg>
);

// Action History Panel Component
interface ActionHistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ActionHistoryPanel: React.FC<ActionHistoryPanelProps> = ({ isOpen, onClose }) => {
  const { canUndo, canRedo, undo, redo } = useAppStore();

  // TODO: Add ability to get history from UndoRedoService
  // For now, we'll show placeholder data

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">操作履歴</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-2">
            <div className="text-sm text-gray-500 mb-2">
              履歴機能は実装中です
            </div>
            {/* TODO: Implement actual history display */}
          </div>
        </div>

        <div className="flex gap-2 mt-4 pt-4 border-t">
          <button
            onClick={undo}
            disabled={!canUndo}
            className={`
              flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors
              ${canUndo 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' 
                : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
              }
            `}
          >
            元に戻す
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            className={`
              flex-1 py-2 px-4 text-sm font-medium rounded-md transition-colors
              ${canRedo 
                ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100' 
                : 'bg-gray-50 text-gray-400 border border-gray-200 cursor-not-allowed'
              }
            `}
          >
            やり直し
          </button>
        </div>
      </div>
    </div>
  );
};

// Keyboard Shortcuts Help Component
interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'Ctrl+Z', description: '元に戻す' },
    { key: 'Ctrl+Y', description: 'やり直し' },
    { key: 'Ctrl+O', description: 'CSVファイルを開く' },
    { key: 'Ctrl+S', description: 'プロジェクトを保存' },
    { key: 'Ctrl+E', description: 'XDCファイルをエクスポート' },
    { key: 'Ctrl+F', description: '検索フィールドにフォーカス' },
    { key: 'Ctrl+A', description: 'すべてのピンを選択' },
    { key: 'Ctrl+D', description: '選択を解除' },
    { key: 'Space', description: 'ビューを90度回転' },
    { key: 'F', description: 'トップ/ボトムビューを切り替え' },
    { key: 'R', description: 'ズームとパンをリセット' },
    { key: '+', description: 'ズームイン' },
    { key: '-', description: 'ズームアウト' },
    { key: '0', description: 'ズームを100%にリセット' },
    { key: 'Escape', description: '選択を解除' },
    { key: 'Delete', description: '選択したピンの割り当てを解除' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">キーボードショートカット</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="space-y-1">
            {shortcuts.map((shortcut, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50"
              >
                <span className="text-sm text-gray-600">{shortcut.description}</span>
                <kbd className="px-2 py-1 text-xs font-mono bg-gray-100 rounded border">
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 pt-4 border-t">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
};
