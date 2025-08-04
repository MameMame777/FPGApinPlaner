import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { CSVReader } from '@/services/csv-reader';
import { ExportService } from '@/services/export-service';
import { PinItem } from '@/components/common/PinItem';
import { BGMControls } from '@/components/common/BGMControls';
import { SettingsPanel } from '@/components/common/SettingsPanel';
import { PinListTabs } from '@/components/common/PinListTabs';
import PackageCanvas from '@/components/common/PackageCanvas';
import SaveLoadControls from '@/components/common/SaveLoadControls';
import { UndoRedoControls, KeyboardShortcutsHelp } from '@/components/common/UndoRedoControls';
import { ValidationPanel, ValidationStatusIcon } from '@/components/common/ValidationPanel';
import { BatchOperationPanel } from '@/components/common/BatchOperationPanel';
import { useAppHotkeys } from '@/hooks/useHotkeys';
import { useValidation } from '@/hooks/useValidation';
import { ValidationIssue } from '@/services/validation-service';
import { loadSampleData } from '@/utils/sample-data';
import { DifferentialPairUtils } from '@/utils/differential-pair-utils';

interface AppProps {}

const App: React.FC<AppProps> = () => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [lastViewerSelectedPin, setLastViewerSelectedPin] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [rightSidebarTab, setRightSidebarTab] = useState<'validation' | 'batch' | null>('validation');
  const [sidebarWidth, setSidebarWidth] = useState(300);
  const [isResizing, setIsResizing] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  
  // Initialize hotkeys
  useAppHotkeys();

  // Handle keyboard help event
  useEffect(() => {
    const handleShowKeyboardHelp = () => {
      setShowKeyboardHelp(true);
    };

    document.addEventListener('showKeyboardHelp', handleShowKeyboardHelp);
    
    return () => {
      document.removeEventListener('showKeyboardHelp', handleShowKeyboardHelp);
    };
  }, []);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuOpen) {
        const target = event.target as Element;
        if (!target.closest('[data-export-menu]')) {
          setExportMenuOpen(false);
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [exportMenuOpen]);
  
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

  // Handle VS Code messages
  useEffect(() => {
    const handleVSCodeMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case 'loadProject':
          try {
            if (message.projectData) {
              console.log('Loading project from VS Code:', message.projectData);
              // Convert the loaded data to the expected format using ProjectSaveService
              const projectData = message.projectData;
              if (projectData.package && projectData.pins) {
                // Use createPackageFromPins to create proper Package object
                const pins = projectData.pins.map((pin: any) => ({
                  ...pin,
                  isAssigned: Boolean(pin.assignedSignalName),
                  signalName: pin.assignedSignalName || ''
                }));
                const packageData = CSVReader.createPackageFromPins(pins, projectData.package.name || 'Loaded Project');
                loadPackage(packageData);
                console.log('✅ Project loaded successfully from VS Code');
              }
            }
          } catch (error) {
            console.error('Failed to load project from VS Code:', error);
            setError(`Failed to load project: ${error}`);
          }
          break;
        case 'loadSampleData':
          (async () => {
            try {
              console.log('Loading sample data from VS Code command');
              const sampleFile = loadSampleData();
              
              setIsImporting(true);
              setLoading(true);
              setError(null);
              
              const result = await CSVReader.parseCSVFile(sampleFile);
              console.log('📊 Sample data parse result:', result);
              
              if (result.success) {
                console.log('✅ Sample data parsed successfully:', result.pins.length, 'pins found');
                const packageData = CSVReader.createPackageFromPins(result.pins, sampleFile.name);
                loadPackage(packageData);
                console.log('✅ Sample data loaded successfully from VS Code command');
                
                if (result.warnings.length > 0) {
                  console.warn('⚠️ Sample data import warnings:', result.warnings);
                }
              } else {
                console.error('❌ Sample data parse failed:', result.errors);
                setError(`Failed to load sample data: ${result.errors.join(', ')}`);
              }
            } catch (error) {
              console.error('Failed to load sample data from VS Code:', error);
              setError(`Failed to load sample data: ${error}`);
            } finally {
              setIsImporting(false);
              setLoading(false);
            }
          })();
          break;
      }
    };

    // Check if we're in VS Code environment
    if (typeof (window as any).vscode !== 'undefined') {
      window.addEventListener('message', handleVSCodeMessage);
      return () => {
        window.removeEventListener('message', handleVSCodeMessage);
      };
    }
    
    // Return cleanup function even if not in VS Code
    return () => {};
  }, [loadPackage, setError]);

  // Background validation
  const {
    validationResult,
    isValidating,
    hasErrors,
    hasWarnings,
    errorCount,
    warningCount
  } = useValidation(currentPackage, pins, {
    enabled: true,
    debounceMs: 1000,
    backgroundCheck: true
  });

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

  // VS Code API helper functions
  const isInVSCode = () => {
    return typeof (window as any).vscode !== 'undefined';
  };

  const saveFileInVSCode = async (content: string, defaultFilename: string, filters: Record<string, string[]>, saveLabel: string) => {
    if (!isInVSCode()) {
      return false;
    }

    try {
      const vscode = (window as any).vscode;
      
      // Step 1: Show save dialog
      const uri = await new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data.command === 'saveDialogResult') {
            window.removeEventListener('message', handler);
            resolve(event.data.result);
          }
        };
        window.addEventListener('message', handler);
        
        vscode.postMessage({
          command: 'showSaveDialog',
          options: {
            saveLabel: saveLabel,
            filters: filters
          }
        });
      });

      if (uri) {
        // URIオブジェクトから適切にパスを抽出
        let filePath: string | undefined;
        
        if (typeof uri === 'string') {
          filePath = uri;
        } else if (uri && typeof uri === 'object') {
          // URIオブジェクトの場合、安全にプロパティにアクセス
          const uriObj = uri as any;
          filePath = uriObj.fsPath || uriObj.path;
          
          // fsPathもpathもない場合は、toString()を試行
          if (!filePath && typeof uri.toString === 'function') {
            filePath = uri.toString();
          }
        }
        
        // ファイルパスの有効性をチェック
        if (!filePath || filePath === 'undefined' || filePath === '[object Object]') {
          console.error('Failed to extract valid file path from URI');
          return false;
        }
        
        // Step 2: Save file content
        const saveResult = await new Promise((resolve) => {
          const handler = (event: MessageEvent) => {
            if (event.data.command === 'saveFileResult') {
              window.removeEventListener('message', handler);
              resolve(event.data.success);
            }
          };
          window.addEventListener('message', handler);
          
          vscode.postMessage({
            command: 'saveFile',
            filePath: filePath,
            content: content,
            filename: defaultFilename
          });
        });

        return saveResult;
      }
    } catch (error) {
      console.error('VS Code save failed:', error);
    }
    return false;
  };

  // Export handlers
  const handleExportXDC = async () => {
    if (pins.length === 0) return;
    
    const xdcContent = ExportService.exportToXDC(pins, currentPackage);
    const defaultFilename = `${currentPackage?.device || 'fpga'}_pins.xdc`;
    
    const saved = await saveFileInVSCode(
      xdcContent, 
      defaultFilename,
      {
        'XDC Files': ['xdc'],
        'All Files': ['*']
      },
      'Export XDC Constraints'
    );

    if (!saved) {
      // Fallback to browser download
      ExportService.downloadFile(xdcContent, defaultFilename, 'text/plain');
    }
  };

  const handleExportCSV = async () => {
    if (pins.length === 0) return;
    
    const csvContent = ExportService.exportToCSV(pins);
    const defaultFilename = `${currentPackage?.device || 'fpga'}_pins.csv`;
    
    const saved = await saveFileInVSCode(
      csvContent, 
      defaultFilename,
      {
        'CSV Files': ['csv'],
        'All Files': ['*']
      },
      'Export Pin Data to CSV'
    );

    if (!saved) {
      // Fallback to browser download
      ExportService.downloadFile(csvContent, defaultFilename, 'text/csv');
    }
  };

  const handleExportReport = async () => {
    if (pins.length === 0) return;
    
    const reportContent = ExportService.exportReport(pins, currentPackage);
    const defaultFilename = `${currentPackage?.device || 'fpga'}_report.txt`;
    
    const saved = await saveFileInVSCode(
      reportContent, 
      defaultFilename,
      {
        'Text Files': ['txt'],
        'All Files': ['*']
      },
      'Export Pin Assignment Report'
    );

    if (!saved) {
      // Fallback to browser download
      ExportService.downloadFile(reportContent, defaultFilename, 'text/plain');
    }
  };

  // Sidebar resize handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = React.useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    
    requestAnimationFrame(() => {
      const newWidth = e.clientX;
      // Dynamic max width: 60% of window width, min 200px
      const maxWidth = Math.max(400, window.innerWidth * 0.6);
      
      // Constrain width between 200px and dynamic max width
      if (newWidth >= 200 && newWidth <= maxWidth) {
        setSidebarWidth(newWidth);
      }
    });
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
  const { sortedPinsForList, differentialPartner } = React.useMemo(() => {
    const sorted = [...filteredPins];
    
    // Find the differential pair partner of the last viewer-selected pin
    let differentialPartner: Pin | null = null;
    if (lastViewerSelectedPin) {
      const selectedPin = pins.find(p => p.id === lastViewerSelectedPin);
      if (selectedPin) {
        differentialPartner = DifferentialPairUtils.findPairPin(selectedPin, pins);
      }
    }
    
    sorted.sort((a, b) => {
      // First priority: Last viewer-selected pin comes first (only if selected from viewer)
      const aIsLastViewerSelected = lastViewerSelectedPin && a.id === lastViewerSelectedPin;
      const bIsLastViewerSelected = lastViewerSelectedPin && b.id === lastViewerSelectedPin;
      
      if (aIsLastViewerSelected && !bIsLastViewerSelected) return -1;
      if (!aIsLastViewerSelected && bIsLastViewerSelected) return 1;
      
      // Second priority: Differential pair partner comes second (only if a pin is selected from viewer)
      if (lastViewerSelectedPin && !aIsLastViewerSelected && !bIsLastViewerSelected) {
        const selectedPin = filteredPins.find(p => p.id === lastViewerSelectedPin);
        if (selectedPin) {
          const selectedPairPin = DifferentialPairUtils.findPairPin(selectedPin, filteredPins);
          
          const aIsPairOfSelected = selectedPairPin?.id === a.id;
          const bIsPairOfSelected = selectedPairPin?.id === b.id;
          
          if (aIsPairOfSelected && !bIsPairOfSelected) return -1;
          if (!aIsPairOfSelected && bIsPairOfSelected) return 1;
        }
      }
      
      // Third priority: Regular sorting for remaining pins
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
    
    return { sortedPinsForList: sorted, differentialPartner };
  }, [filteredPins, filters.sortField, filters.sortOrder, lastViewerSelectedPin, pins]);

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
          
          {/* Export dropdown menu */}
          <div style={{ position: 'relative' }} data-export-menu>
            <button 
              onClick={() => setExportMenuOpen(!exportMenuOpen)}
              disabled={pins.length === 0}
              style={{
                padding: '8px 16px',
                backgroundColor: pins.length > 0 ? '#4A90E2' : '#666',
                border: 'none',
                borderRadius: '4px',
                color: 'white',
                cursor: pins.length > 0 ? 'pointer' : 'not-allowed',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
              title="Export Pin Data"
            >
              💾 Export {exportMenuOpen ? '▲' : '▼'}
            </button>
            
            {exportMenuOpen && pins.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                backgroundColor: '#2a2a2a',
                border: '1px solid #555',
                borderRadius: '4px',
                zIndex: 1000,
                minWidth: '160px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.3)',
              }}>
                <button
                  onClick={() => {
                    handleExportXDC();
                    setExportMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    borderBottom: '1px solid #444',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  📄 XDC (Xilinx)
                </button>
                <button
                  onClick={() => {
                    handleExportCSV();
                    setExportMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                    borderBottom: '1px solid #444',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  � CSV Data
                </button>
                <button
                  onClick={() => {
                    handleExportReport();
                    setExportMenuOpen(false);
                  }}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'white',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  📋 Report
                </button>
              </div>
            )}
          </div>
          
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
                  {sortedPinsForList.map((pin) => {
                    // 選択されたピンの差動ペアパートナーかどうかを判定
                    const selectedPin = lastViewerSelectedPin ? pins.find(p => p.id === lastViewerSelectedPin) : null;
                    const selectedPairPin = selectedPin ? DifferentialPairUtils.findPairPin(selectedPin, pins) : null;
                    const isDifferentialPairPartner = selectedPairPin?.id === pin.id;
                    
                    return (
                      <PinItem
                        key={pin.id}
                        pin={pin}
                        isSelected={selectedPins.has(pin.id)}
                        onSelect={handleListPinSelect}
                        onAssignSignal={assignSignal}
                        isPairPin={false}
                        isDifferentialPairPartner={isDifferentialPairPartner}
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
          <div 
            className="toolbar-scrollbar"
            style={{
              height: '50px',
              backgroundColor: '#2a2a2a',
              borderBottom: '1px solid #444',
              display: 'flex',
              alignItems: 'center',
              padding: '0 16px',
              gap: '12px',
              overflowX: 'auto',
              overflowY: 'hidden',
            }}>
            {/* View Mode Toggle */}
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
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
                  whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
                }}
                title="List View"
              >
                📋 List
              </button>
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#555', flexShrink: 0 }}></div>

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
                whiteSpace: 'nowrap',
                flexShrink: 0,
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
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              ↕️ Flip View
            </button>
            
            {/* Save & Load Controls */}
            <div style={{ flexShrink: 0 }}>
              <SaveLoadControls />
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#555', flexShrink: 0 }}></div>

            {/* Undo/Redo Controls */}
            <div style={{ flexShrink: 0 }}>
              <UndoRedoControls />
            </div>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#555', flexShrink: 0 }}></div>

            {/* Validation Status */}
            <button 
              onClick={() => setRightSidebarTab(rightSidebarTab === 'validation' ? null : 'validation')}
              style={{
                padding: '6px 12px',
                backgroundColor: rightSidebarTab === 'validation' ? '#4a5568' : (hasErrors ? '#dc2626' : hasWarnings ? '#d97706' : '#333'),
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title={`Validation: ${errorCount} errors, ${warningCount} warnings (click for details)`}
            >
              <ValidationStatusIcon validationResult={validationResult} />
              <span>Validation</span>
              {isValidating && <span className="animate-spin">⚡</span>}
            </button>

            {/* Batch Operations */}
            <button 
              onClick={() => setRightSidebarTab(rightSidebarTab === 'batch' ? null : 'batch')}
              style={{
                padding: '6px 12px',
                backgroundColor: rightSidebarTab === 'batch' ? '#4a5568' : '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title="Batch Operations - Assign patterns to multiple pins"
            >
              <span>🔧</span>
              <span>Batch Ops</span>
            </button>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#555', flexShrink: 0 }}></div>

            <button 
              onClick={() => setShowKeyboardHelp(true)}
              style={{
                padding: '6px 12px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '4px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
              title="Keyboard Shortcuts (Ctrl+Shift+?)"
            >
              ⌨️ Shortcuts
            </button>
            
            {/* Spacer to push zoom controls to the right */}
            <div style={{ flex: 1, minWidth: '20px' }}></div>
            
            {/* Zoom Controls - Always visible at the right */}
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              flexShrink: 0,
              backgroundColor: '#2a2a2a',
              padding: '0 8px',
              borderRadius: '4px',
            }}>
              <span style={{ fontSize: '12px', color: '#999', whiteSpace: 'nowrap' }}>Zoom:</span>
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
                  whiteSpace: 'nowrap',
                  minWidth: '32px',
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
                  whiteSpace: 'nowrap',
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
                  whiteSpace: 'nowrap',
                  minWidth: '32px',
                }}
              >
                +
              </button>
            </div>
          </div>

          {/* Main View Area */}
          <div style={{
            flex: 1,
            minWidth: '400px', // Ensure minimum width to prevent complete collapse
            backgroundColor: '#1a1a1a',
            overflow: 'hidden',
            display: 'flex',
            flexShrink: 1, // Allow shrinking but respect minWidth
          }}>
            <div style={{ 
              flex: 1, 
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
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
                }} className="custom-scrollbar">
                  <PinListTabs onPinSelect={handleListPinSelect} />
                </div>
              )}
            </div>

            {/* Right Sidebar */}
            {rightSidebarTab && (
              <div 
                style={{ 
                  width: '300px',
                  borderLeft: '1px solid #555',
                  backgroundColor: '#1e1e1e',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  overflow: 'hidden'
                }}
              >
                {rightSidebarTab === 'validation' && (
                  <div style={{ height: '100%', overflow: 'hidden' }} className="custom-scrollbar">
                    <ValidationPanel 
                      validationResult={validationResult}
                      onIssueClick={(issue: ValidationIssue) => {
                        // Highlight pins
                        if (issue.affectedPins && issue.affectedPins.length > 0) {
                          console.log('Pins to highlight:', issue.affectedPins);
                          // TODO: Add pin highlighting functionality to PackageCanvas
                        }
                      }}
                    />
                  </div>
                )}
                
                {rightSidebarTab === 'batch' && (
                  <div style={{ height: '100%', overflow: 'auto' }} className="custom-scrollbar">
                    <BatchOperationPanel isVisible={true} />
                  </div>
                )}
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
      {/* Keyboard Shortcuts Help Dialog */}
      <KeyboardShortcutsHelp 
        isOpen={showKeyboardHelp} 
        onClose={() => setShowKeyboardHelp(false)} 
      />
    </div>
  );
};

export default App;
