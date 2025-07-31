import React, { useRef, useState } from 'react';
import { ProjectSaveService } from '@/services/project-save-service';
import { useAppStore } from '@/stores/app-store';

interface SaveLoadControlsProps {
  // No props needed for compact version
}

const SaveLoadControls: React.FC<SaveLoadControlsProps> = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<string>('');
  
  // Zustand storeから必要な状態とアクションを取得
  const { 
    package: pkg, 
    pins, 
    selectedPins, 
    viewConfig,
    loadProject,
    // セーブ・ロード用のアクションは後で追加
  } = useAppStore();

  // 一時的なアプリケーション状態作成（後でZustandから直接取得するように修正）
  const getCurrentAppState = () => ({
    package: pkg,
    pins,
    selectedPins,
    viewConfig,
    listView: { activeTab: 'overview' },
    ui: { sidebarWidth: 300, showDifferentialPairs: false },
    filters: {},
    history: { currentIndex: 0, actions: [] },
    projectSettings: {}
  });

  const showNotification = (message: string, duration = 3000) => {
    setNotification(message);
    setTimeout(() => setNotification(''), duration);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      
      if (!pkg || pins.length === 0) {
        throw new Error('No project data to save');
      }

      const currentState = getCurrentAppState();
      const saveData = ProjectSaveService.createSaveData(currentState);
      await ProjectSaveService.saveToFile(saveData);
      
      showNotification('✅ Project saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      showNotification(`❌ Save failed: ${error}`, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsLoading(true);
      
      const saveData = await ProjectSaveService.loadFromFile(file);
      const project = ProjectSaveService.restoreProject(saveData);
      
      console.log('Loading project:', project.name);
      console.log('Package device:', project.packageData?.device);
      console.log('Pin assignments count:', project.pinAssignments.length);
      
      // loadProjectアクションで一括更新
      loadProject(project);
      
      // ロード完了通知（デバッグログは簡素化）
      console.log('✅ Project loaded successfully');
      
      showNotification(`✅ Project loaded: ${saveData.metadata.description}`);
      
      // Reset input for re-loading same file
      event.target.value = '';
    } catch (error) {
      console.error('Load failed:', error);
      showNotification(`❌ Load failed: ${error}`, 5000);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickSave = () => {
    try {
      if (!pkg || pins.length === 0) {
        throw new Error('No project data to save');
      }

      const currentState = getCurrentAppState();
      ProjectSaveService.quickSave(currentState);
      
      showNotification('⚡ Quick save completed');
    } catch (error) {
      console.error('Quick save failed:', error);
      showNotification(`❌ Quick save failed: ${error}`, 5000);
    }
  };

  const handleQuickLoad = async () => {
    try {
      const quickSaveData = ProjectSaveService.quickLoad();
      if (!quickSaveData) {
        showNotification('📭 No quick save found');
        return;
      }
      
      const project = ProjectSaveService.restoreProject(quickSaveData);
      
      // loadProjectアクションで一括更新
      loadProject(project);
      
      showNotification('⚡ Quick save loaded');
    } catch (error) {
      console.error('Quick load failed:', error);
      showNotification(`❌ Quick load failed: ${error}`, 5000);
    }
  };

  // クイックセーブの存在確認
  const quickSaveInfo = ProjectSaveService.getQuickSaveInfo();

  // キーボードショートカット
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case 's':
            e.preventDefault();
            if (pkg && pins.length > 0) {
              handleQuickSave();
            }
            break;
          case 'l':
            e.preventDefault();
            if (quickSaveInfo.exists) {
              handleQuickLoad();
            } else {
              // No quick save found, trigger file load
              fileInputRef.current?.click();
            }
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pkg, pins.length, quickSaveInfo.exists]);

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px', 
      position: 'relative'
    }}>
      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={isLoading || !pkg || pins.length === 0}
        title="Save Project (💾)"
        style={{
          padding: '6px 8px',
          backgroundColor: '#00a8ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: isLoading || !pkg || pins.length === 0 ? 0.5 : 1
        }}
      >
        💾
      </button>
      
      {/* Load button */}
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        title="Load Project (📁)"
        style={{
          padding: '6px 8px',
          backgroundColor: '#ffa500',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          fontWeight: 'bold',
          opacity: isLoading ? 0.5 : 1
        }}
      >
        📁
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".fpgaproj,.json"
        onChange={handleLoad}
        style={{ display: 'none' }}
      />
      
      {/* Quick Save button */}
      <button
        onClick={handleQuickSave}
        disabled={isLoading || !pkg || pins.length === 0}
        title="Quick Save (Ctrl+S)"
        style={{
          padding: '6px 8px',
          backgroundColor: '#333',
          color: '#ccc',
          border: '1px solid #555',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '11px',
          opacity: isLoading || !pkg || pins.length === 0 ? 0.5 : 1
        }}
      >
        ⚡
      </button>
      
      {/* Notification */}
      {notification && (
        <div 
          style={{
            position: 'absolute',
            top: '40px',
            right: '0',
            padding: '8px 12px',
            backgroundColor: notification.includes('❌') ? '#dc3545' : '#28a745',
            color: 'white',
            borderRadius: '4px',
            fontSize: '12px',
            zIndex: 1000,
            boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            whiteSpace: 'nowrap'
          }}
        >
          {notification}
        </div>
      )}
    </div>
  );
};

export default SaveLoadControls;
