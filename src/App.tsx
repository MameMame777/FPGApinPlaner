import React, { useRef, useState } from 'react';
import { useAppStore } from '@/stores/app-store';
import { CSVReader } from '@/services/csv-reader';
import { ExportService } from '@/services/export-service';
import { PinItem } from '@/components/common/PinItem';
import { BGMControls } from '@/components/common/BGMControls';
import { SettingsPanel } from '@/components/common/SettingsPanel';
import { DifferentialPairManager } from '@/components/common/DifferentialPairManager';
import { PinListTabs } from '@/components/common/PinListTabs';
import PackageCanvas from '@/components/common/PackageCanvas';
import SaveLoadControls from '@/components/common/SaveLoadControls';
import { loadSampleData } from '@/utils/sample-data';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lastViewerSelectedPin, setLastViewerSelectedPin] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showDifferentialPairs, setShowDifferentialPairs] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  
  const {
    pins,
    filteredPins,
    selectedPins,
    package: currentPackage,
    filters,
    viewConfig,
    listView,
    loadPackage,
    selectPin,
    assignSignal,
    updateFilters,
    setError,
    setLoading,
    setRotation,
    toggleView,
    setZoom,
    resetZoom,
    setSortField,
    setSortOrder,
    setViewMode,
  } = useAppStore();

  const handleOpenCSV = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    console.log('📂 ファイルが選択されました:', file.name, file.size, 'bytes');
    setIsImporting(true);
    setLoading(true);
    setError(null);

    try {
      console.log('🔄 CSV解析を開始します...');
      const result = await CSVReader.parseCSVFile(file);
      console.log('📊 CSV解析結果:', result);
      
      if (result.success) {
        console.log('✅ CSV解析成功:', result.pins.length, 'pins found');
        const packageData = CSVReader.createPackageFromPins(result.pins, file.name);
        console.log('📦 パッケージデータ作成:', packageData);
        loadPackage(packageData);
        console.log('💾 ストアに読み込み完了');
        
        if (result.warnings.length > 0) {
          console.warn('⚠️ Import warnings:', result.warnings);
        }
      } else {
        console.error('❌ CSV解析失敗:', result.errors);
        setError(`Failed to import CSV: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('💥 ファイル読み取りエラー:', error);
      setError(`Error reading file: ${(error as Error).message}`);
    } finally {
      setIsImporting(false);
      setLoading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleLoadSample = async () => {
    console.log('🧪 サンプルデータの読み込みを開始します...');
    try {
      const sampleFile = loadSampleData();
      console.log('📄 サンプルファイル作成:', sampleFile.name, sampleFile.size, 'bytes');
      
      const result = await CSVReader.parseCSVFile(sampleFile);
      console.log('📊 サンプルデータ解析結果:', result);
      
      if (result.success) {
        console.log('✅ サンプルデータ解析成功:', result.pins.length, 'pins found');
        const packageData = CSVReader.createPackageFromPins(result.pins, 'Sample FPGA Package');
        console.log('📦 サンプルパッケージデータ:', packageData);
        loadPackage(packageData);
        console.log('💾 サンプルデータをストアに読み込み完了');
      } else {
        console.error('❌ サンプルデータ解析失敗:', result.errors);
        setError(`Error loading sample data: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('💥 サンプルデータ読み込みエラー:', error);
      setError(`Error loading sample data: ${(error as Error).message}`);
    }
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    updateFilters({ searchText: event.target.value });
  };

  const handleFilterToggle = (pinType: string) => {
    const currentTypes = filters.pinTypes;
    const newTypes = currentTypes.includes(pinType as any)
      ? currentTypes.filter(t => t !== pinType)
      : [...currentTypes, pinType as any];
    updateFilters({ pinTypes: newTypes });
  };

  const getPinStats = () => {
    const total = pins.length;
    const assigned = pins.filter(p => p.isAssigned).length;
    const unassigned = total - assigned;
    return { total, assigned, unassigned };
  };

  const handleRotate = () => {
    setRotation(viewConfig.rotation + 90);
  };

  const handleZoomIn = () => {
    setZoom(Math.min(3.0, viewConfig.zoom + 0.1));
  };

  const handleZoomOut = () => {
    setZoom(Math.max(0.2, viewConfig.zoom - 0.1));
  };

  const handlePinDoubleClick = (pinId: string) => {
    const pin = pins.find(p => p.id === pinId);
    if (pin) {
      const newSignal = prompt('Enter signal name:', pin.signalName);
      if (newSignal !== null) {
        assignSignal(pinId, newSignal);
      }
    }
  };

  // Handle pin selection from viewer (canvas)
  const handleViewerPinSelect = (pinId: string) => {
    selectPin(pinId);
    if (pinId) {
      setLastViewerSelectedPin(pinId);
    } else {
      setLastViewerSelectedPin(null);
    }
  };

  // Handle pin selection from list (no movement)
  const handleListPinSelect = (pinId: string) => {
    selectPin(pinId);
    // Don't update lastViewerSelectedPin to prevent list reordering
  };

  // Export handlers
  const handleExportXDC = () => {
    if (pins.length === 0) return;
    
    const xdcContent = ExportService.exportToXDC(pins, currentPackage);
    const filename = `${currentPackage?.device || 'fpga'}_pins.xdc`;
    ExportService.downloadFile(xdcContent, filename, 'text/plain');
  };

  // Sidebar resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    const newWidth = e.clientX;
    // Constrain width between 200px and 600px
    if (newWidth >= 200 && newWidth <= 600) {
      setSidebarWidth(newWidth);
    }
  }, [isResizing]);

  const handleMouseUp = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add event listeners for mouse move and up
  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };
    }
    return undefined;
  }, [isResizing, handleMouseMove, handleMouseUp]);

  const stats = getPinStats();

  // Create sorted pins for the sidebar list (without affecting the canvas)
  const sortedPinsForList = React.useMemo(() => {
    const sorted = [...filteredPins];
    
    sorted.sort((a, b) => {
      // First priority: Last viewer-selected pin comes first (only if selected from viewer)
      const aIsLastViewerSelected = lastViewerSelectedPin && a.id === lastViewerSelectedPin;
      const bIsLastViewerSelected = lastViewerSelectedPin && b.id === lastViewerSelectedPin;
      
      if (aIsLastViewerSelected && !bIsLastViewerSelected) return -1;
      if (!aIsLastViewerSelected && bIsLastViewerSelected) return 1;
      
      // Second priority: If there's a last viewer-selected pin and it's a differential pair,
      // put its pair pin as second priority
      if (lastViewerSelectedPin && !aIsLastViewerSelected && !bIsLastViewerSelected) {
        const lastSelectedPin = filteredPins.find(p => p.id === lastViewerSelectedPin);
        if (lastSelectedPin && DifferentialPairUtils.isDifferentialPin(lastSelectedPin)) {
          const pairPin = DifferentialPairUtils.findPairPin(lastSelectedPin, filteredPins);
          if (pairPin) {
            console.log(`差動ペア検出: ${lastSelectedPin.pinName} -> ${pairPin.pinName}`);
            const aIsPairPin = a.id === pairPin.id;
            const bIsPairPin = b.id === pairPin.id;
            
            if (aIsPairPin && !bIsPairPin) return -1;
            if (!aIsPairPin && bIsPairPin) return 1;
          }
        }
      }
      
      // Third priority: Regular sorting
      let valueA: string;
      let valueB: string;

      switch (filters.sortField) {
        case 'pinNumber':
          valueA = a.pinNumber;
          valueB = b.pinNumber;
          break;
        case 'pinName':
          valueA = a.pinName;
          valueB = b.pinName;
          break;
        case 'signalName':
          valueA = a.signalName || '';
          valueB = b.signalName || '';
          break;
        case 'pinType':
          valueA = a.pinType;
          valueB = b.pinType;
          break;
        case 'bank':
          valueA = a.bank || '';
          valueB = b.bank || '';
          break;
        default:
          valueA = a.pinNumber;
          valueB = b.pinNumber;
      }

      // Natural sort for alphanumeric values (A1, A2, A10, B1, etc.)
      const result = valueA.localeCompare(valueB, undefined, { 
        numeric: true, 
        sensitivity: 'base' 
      });
      
      return filters.sortOrder === 'asc' ? result : -result;
    });
    
    return sorted;
  }, [filteredPins, filters.sortField, filters.sortOrder, lastViewerSelectedPin]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#1e1e1e',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Header */}
      <header style={{
        height: '60px',
        backgroundColor: '#2a2a2a',
        borderBottom: '1px solid #444',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
      }}>
        <h1 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 600,
          color: '#4A90E2',
        }}>
          FPGA Pin Planner
        </h1>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px', alignItems: 'center' }}>
          <BGMControls />
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileSelect}
            style={{ display: 'none' }}
          />
          <button 
            onClick={handleOpenCSV}
            disabled={isImporting}
            style={{
              padding: '8px 16px',
              backgroundColor: isImporting ? '#666' : '#4A90E2',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: isImporting ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {isImporting ? '📂 Loading...' : '📂 Open CSV'}
          </button>
          
          <button 
            onClick={handleLoadSample}
            style={{
              padding: '8px 16px',
              backgroundColor: '#666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            🧪 Sample Data
          </button>
          
          {/* Export dropdown menu */}
          <div style={{ position: 'relative' }}>
            <button 
              onClick={handleExportXDC}
              disabled={pins.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: pins.length > 0 ? '#4A90E2' : '#666',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
              }}
              title="Export as XDC (Xilinx Design Constraints)"
            >
              💾 Export XDC
            </button>
          </div>
          
          <button 
            onClick={() => setShowDifferentialPairs(true)}
            disabled={pins.length === 0}
            style={{
              padding: '8px 16px',
              backgroundColor: pins.length > 0 ? '#9333ea' : '#666',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
              fontSize: '14px',
            }}
            title="Differential Pair Management"
          >
            ⚡ Diff Pairs
          </button>
          
          <button 
            onClick={() => setShowSettings(true)}
            style={{
              padding: '8px 12px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '14px',
            }}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div style={{ 
        flex: 1, 
        display: 'flex',
        overflow: 'hidden',
      }}>
        {/* Sidebar */}
        <aside style={{
          width: `${sidebarWidth}px`,
          backgroundColor: '#252525',
          borderRight: '1px solid #444',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {/* Search and Filters */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #444',
          }}>
            <input
              type="text"
              placeholder="Search pins..."
              value={filters.searchText}
              onChange={handleSearchChange}
              style={{
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#1a1a1a',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '14px',
              }}
            />
            
            {/* Sort Controls */}
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#999' }}>Sort:</span>
              <select
                value={filters.sortField}
                onChange={(e) => setSortField(e.target.value as any)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#fff',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                <option value="pinNumber">Pin Number</option>
                <option value="pinName">Pin Name</option>
                <option value="signalName">Signal Name</option>
                <option value="pinType">Pin Type</option>
                <option value="bank">Bank</option>
              </select>
              <button
                onClick={() => setSortOrder(filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                title={`Sort ${filters.sortOrder === 'asc' ? 'Descending' : 'Ascending'}`}
              >
                {filters.sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => updateFilters({ pinTypes: [] })}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: filters.pinTypes.length === 0 ? '#4A90E2' : '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                }}
              >
                All ({pins.length})
              </button>
              <button 
                onClick={() => handleFilterToggle('IO')}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: filters.pinTypes.includes('IO') ? '#4A90E2' : '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                }}
              >
                I/O ({pins.filter(p => p.pinType === 'IO').length})
              </button>
              <button 
                onClick={() => handleFilterToggle('POWER')}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: filters.pinTypes.includes('POWER') ? '#4A90E2' : '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                }}
              >
                Power ({pins.filter(p => p.pinType === 'POWER').length})
              </button>
            </div>
          </div>

          {/* Pin List */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px',
          }}>
            {pins.length === 0 ? (
              <>
                <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>
                  No package loaded
                </div>
                <div style={{ color: '#666', fontSize: '10px', marginBottom: '8px' }}>
                  Debug: pins={pins.length}, package={currentPackage?.name || 'null'}
                </div>
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#666',
                  fontSize: '14px',
                }}>
                  <div style={{ marginBottom: '12px' }}>📁</div>
                  <div>Load a CSV file to start</div>
                </div>
              </>
            ) : (
              <>
                <div style={{ 
                  color: '#999', 
                  fontSize: '12px', 
                  marginBottom: '8px',
                  display: 'flex',
                  justifyContent: 'space-between'
                }}>
                  <span>{currentPackage?.name || 'Package'}</span>
                  <span>Showing {filteredPins.length} of {pins.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {sortedPinsForList.map((pin, index) => {
                    // 差動ペアの対応ピンかどうかを判定
                    let isPairPin = false;
                    if (lastViewerSelectedPin && index > 0) {
                      const lastSelectedPin = filteredPins.find(p => p.id === lastViewerSelectedPin);
                      if (lastSelectedPin && DifferentialPairUtils.isDifferentialPin(lastSelectedPin)) {
                        const pairPin = DifferentialPairUtils.findPairPin(lastSelectedPin, filteredPins);
                        isPairPin = pairPin?.id === pin.id;
                      }
                    }

                    return (
                      <PinItem
                        key={pin.id}
                        pin={pin}
                        isSelected={selectedPins.has(pin.id)}
                        onSelect={handleListPinSelect}
                        onAssignSignal={assignSignal}
                        isPairPin={isPairPin}
                      />
                    );
                  })}
                </div>
              </>
            )}
          </div>
          
          {/* Resize Handle */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '4px',
              height: '100%',
              backgroundColor: isResizing ? '#007acc' : 'transparent',
              cursor: 'col-resize',
              zIndex: 10,
              transition: isResizing ? 'none' : 'background-color 0.2s ease',
            }}
            onMouseDown={handleMouseDown}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = '#555';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          />
        </aside>

        {/* Main View */}
        <main style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Toolbar */}
          <div style={{
            height: '50px',
            backgroundColor: '#2a2a2a',
            borderBottom: '1px solid #444',
            display: 'flex',
            alignItems: 'center',
            padding: '0 16px',
            gap: '12px',
          }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '4px' }}>
              <button 
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: listView.viewMode === 'grid' ? '#007acc' : '#333',
                  border: '1px solid #555',
                  borderRadius: '4px 0 0 4px',
                  color: listView.viewMode === 'grid' ? '#fff' : '#ccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                title="Grid View"
              >
                🎯 Grid
              </button>
              <button 
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 12px',
                  backgroundColor: listView.viewMode === 'list' ? '#007acc' : '#333',
                  border: '1px solid #555',
                  borderRadius: '0 4px 4px 0',
                  color: listView.viewMode === 'list' ? '#fff' : '#ccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
                title="List View"
              >
                📋 List
              </button>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#555' }}></div>

            <button 
              onClick={handleRotate}
              style={{
                padding: '6px 12px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              🔄 Rotate 90°
            </button>
            <button 
              onClick={toggleView}
              style={{
                padding: '6px 12px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              ↕️ Flip View
            </button>
            
            {/* Save & Load Controls */}
            <SaveLoadControls />
            
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#999' }}>Zoom:</span>
              <button 
                onClick={handleZoomOut}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                -
              </button>
              <button 
                onClick={resetZoom}
                style={{
                  padding: '4px 12px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                  minWidth: '50px',
                }}
                title="Reset zoom to 100%"
              >
                {Math.round(viewConfig.zoom * 100)}%
              </button>
              <button 
                onClick={handleZoomIn}
                style={{
                  padding: '4px 8px',
                  backgroundColor: '#333',
                  border: '1px solid #555',
                  borderRadius: '3px',
                  color: '#ccc',
                  cursor: 'pointer',
                  fontSize: '12px',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Main View Area */}
          <div style={{
            flex: 1,
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
          }}>
            {listView.viewMode === 'grid' ? (
              <PackageCanvas
                package={currentPackage}
                pins={filteredPins}
                selectedPins={selectedPins}
                onPinSelect={handleViewerPinSelect}
                onPinDoubleClick={handlePinDoubleClick}
                zoom={viewConfig.zoom}
                rotation={viewConfig.rotation}
                isTopView={viewConfig.isTopView}
                onZoomChange={setZoom}
                resetTrigger={viewConfig.resetTrigger}
              />
            ) : (
              <div style={{
                height: '100%',
                backgroundColor: '#1a1a1a',
                overflow: 'hidden'
              }}>
                <PinListTabs onPinSelect={handleListPinSelect} />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Status Bar */}
      <footer style={{
        height: '24px',
        backgroundColor: '#2a2a2a',
        borderTop: '1px solid #444',
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        fontSize: '12px',
        color: '#999',
      }}>
        <span>Ready</span>
        <div style={{ marginLeft: 'auto' }}>
          <span>Pins: {stats.total} | Assigned: {stats.assigned} | Unassigned: {stats.unassigned}</span>
        </div>
      </footer>
      
      {/* Settings Panel */}
      <SettingsPanel 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
      />

      {/* Differential Pair Management Panel */}
      {showDifferentialPairs && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-11/12 max-w-4xl h-5/6 overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-semibold text-gray-800">差動ペア管理</h2>
              <button
                onClick={() => setShowDifferentialPairs(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            <div className="p-4 overflow-y-auto h-full">
              <DifferentialPairManager
                pins={pins}
                onPairCreated={(pair) => {
                  console.log('Differential pair created:', pair);
                  // 必要に応じて状態更新やコールバック処理を追加
                }}
                onPairDeleted={(pairId) => {
                  console.log('Differential pair deleted:', pairId);
                  // 必要に応じて状態更新やコールバック処理を追加
                }}
                onPairUpdated={(pair) => {
                  console.log('Differential pair updated:', pair);
                  // 必要に応じて状態更新やコールバック処理を追加
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
