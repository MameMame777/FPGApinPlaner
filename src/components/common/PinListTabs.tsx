import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { TAB_CONFIGS } from '../../constants/tab-configs';
import { EditableTableCell } from '../common/EditableTableCell';
import { VirtualizedPinList } from '../common/VirtualizedPinList';
import { BankGroupsPanel } from '../common/BankGroupsPanel';
import { getBankBackgroundColor } from '../../utils/ui-utils';
import { 
  VOLTAGE_LEVELS, 
  IO_STANDARDS, 
  getCompatibleIOStandards, 
  getDefaultIOStandard 
} from '../../constants/pin-constants';
import { Pin, ColumnConfig } from '../../types';

interface PinListTabsProps {
  onPinSelect?: (_pinId: string) => void;
}

export const PinListTabs: React.FC<PinListTabsProps> = ({ onPinSelect: _onPinSelect }) => {
  const {
    pins,
    filteredPins: globalFilteredPins,
    listView,
    visibleBanks,
    setActiveTab,
    setSearchQuery,
    setCommentFilter,
    updatePin,
    updateListViewState,
    bulkUpdateComments,
    toggleBankVisibility
  } = useAppStore();

  const [bulkComment, setBulkComment] = useState('');
  const [showBulkEditor, setShowBulkEditor] = useState(false);
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  const activeTabConfig = useMemo(() => 
    TAB_CONFIGS.find(tab => tab.id === listView.activeTab) || TAB_CONFIGS[0],
    [listView.activeTab]
  );

  const getColumnValue = (pin: Pin, columnKey: string): any => {
    switch (columnKey) {
      case 'differentialPair':
        return pin.differentialPair ? `${pin.differentialPair.pair}_${pin.differentialPair.type}` : '';
      case 'commentTimestamp':
        return pin.commentTimestamp?.getTime() || 0;
      case 'ioStandard':
        return pin.attributes?.['IO_Standard'] || pin.ioType || 'AUTO';
      default:
        return (pin as any)[columnKey] || '';
    }
  };

  const filteredPins = useMemo(() => {
    // Start with globally filtered pins (includes BANK filtering from visibleBanks)
    let result = globalFilteredPins;

    // Apply tab-specific filter
    if (activeTabConfig.filter) {
      result = result.filter(activeTabConfig.filter);
    }

    // Apply search query
    if (listView.searchQuery.trim()) {
      const query = listView.searchQuery.toLowerCase();
      result = result.filter(pin => 
        pin.pinNumber.toLowerCase().includes(query) ||
        pin.pinName.toLowerCase().includes(query) ||
        (pin.signalName || '').toLowerCase().includes(query) ||
        (pin.comment || '').toLowerCase().includes(query)
      );
    }

    // Apply comment filter
    switch (listView.commentFilter) {
      case 'with-comments':
        result = result.filter(pin => pin.comment && pin.comment.trim() !== '');
        break;
      case 'without-comments':
        result = result.filter(pin => !pin.comment || pin.comment.trim() === '');
        break;
      default:
        // 'all' - no filtering
        break;
    }

    // Apply sorting
    if (listView.sortColumn) {
      result = [...result].sort((a, b) => {
        const aValue = getColumnValue(a, listView.sortColumn!);
        const bValue = getColumnValue(b, listView.sortColumn!);
        
        let comparison = 0;
        if (aValue < bValue) comparison = -1;
        else if (aValue > bValue) comparison = 1;
        
        return listView.sortDirection === 'desc' ? -comparison : comparison;
      });
    } else if (activeTabConfig.sort) {
      result = [...result].sort(activeTabConfig.sort);
    }

    return result;
  }, [globalFilteredPins, activeTabConfig, listView.searchQuery, listView.commentFilter, listView.sortColumn, listView.sortDirection]);

  const renderCellContent = (pin: Pin, column: ColumnConfig) => {
    const value = getColumnValue(pin, column.key);

    if (column.customRender) {
      return column.customRender(value, pin);
    }

    if (column.render === 'datetime' && pin.commentTimestamp) {
      return pin.commentTimestamp.toLocaleDateString() + ' ' + 
             pin.commentTimestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    if (column.render === 'boolean') {
      return value ? '✓' : '✗';
    }

    if (column.editable) {
      // Special handling for voltage and I/O standard columns
      if (column.key === 'voltage') {
        return (
          <EditableTableCell
            value={String(value)}
            onSave={(newValue) => handleCellEdit(pin.id, column.key, newValue)}
            editable={true}
            placeholder="Select voltage..."
            type="select"
            options={[...VOLTAGE_LEVELS]}
            allowCustomValue={true}
          />
        );
      }
      
      if (column.key === 'ioStandard' || column.key === 'ioType') {
        const compatibleStandards = pin.voltage ? 
          getCompatibleIOStandards(pin.voltage) : 
          [...IO_STANDARDS];
        
        return (
          <EditableTableCell
            value={String(value)}
            onSave={(newValue) => handleCellEdit(pin.id, column.key, newValue)}
            editable={true}
            placeholder="Select I/O standard..."
            type="select"
            options={compatibleStandards}
            allowCustomValue={true}
            getDisplayValue={(val) => val === 'AUTO' ? `Auto (${getDefaultIOStandard(pin.voltage || '3.3V')})` : val}
          />
        );
      }
      
      return (
        <EditableTableCell
          value={String(value)}
          onSave={(newValue) => handleCellEdit(pin.id, column.key, newValue)}
          editable={true}
          placeholder={`Enter ${column.title.toLowerCase()}...`}
          maxLength={column.key === 'comment' ? 500 : 100}
        />
      );
    }

    return String(value) || '-';
  };

  const handleCellEdit = (pinId: string, columnKey: string, newValue: string) => {
    const pin = pins.find(p => p.id === pinId);
    if (!pin) return;
    
    const updates: Partial<Pin> = {};
    
    if (columnKey === 'comment') {
      updates.comment = newValue;
      updates.commentTimestamp = new Date();
      updates.commentAuthor = 'current_user'; // TODO: Get from auth system
    } else if (columnKey === 'voltage') {
      updates.voltage = newValue;
      
      // Auto-update I/O standard if it's currently AUTO or incompatible
      const currentIOStandard = pin.attributes?.['IO_Standard'] || pin.ioType || 'AUTO';
      if (currentIOStandard === 'AUTO' || !getCompatibleIOStandards(newValue).includes(currentIOStandard)) {
        const defaultIOStandard = getDefaultIOStandard(newValue);
        updates.attributes = {
          ...pin.attributes,
          'IO_Standard': defaultIOStandard
        };
        // Also update ioType for backward compatibility
        updates.ioType = defaultIOStandard;
      }
    } else if (columnKey === 'ioStandard' || columnKey === 'ioType') {
      // Store I/O standard in both attributes and ioType for compatibility
      updates.attributes = {
        ...pin.attributes,
        'IO_Standard': newValue
      };
      updates.ioType = newValue;
    } else {
      (updates as any)[columnKey] = newValue;
    }
    
    updatePin(pinId, updates);
  };

  const handleRowSelection = (pinId: string, selected: boolean) => {
    const newSelection = new Set(listView.selectedRows);
    if (selected) {
      newSelection.add(pinId);
    } else {
      newSelection.delete(pinId);
    }
    updateListViewState({ selectedRows: newSelection });
  };

  const handleBulkCommentApply = () => {
    if (bulkComment.trim() && listView.selectedRows.size > 0) {
      const selectedPins = Array.from(listView.selectedRows);
      selectedPins.forEach(pinId => {
        updatePin(pinId, { 
          comment: bulkComment,
          commentTimestamp: new Date(),
          commentAuthor: 'current_user'
        });
      });
      setBulkComment('');
      setShowBulkEditor(false);
    }
  };

  const handleColumnSort = (columnKey: string) => {
    const newDirection = listView.sortColumn === columnKey && listView.sortDirection === 'asc' 
      ? 'desc' 
      : 'asc';
    
    updateListViewState({
      sortColumn: columnKey,
      sortDirection: newDirection
    });
  };

  return (
    <div className="pin-list-tabs" style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' 
    }}>
      {/* デバッグ情報 */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ padding: '8px', background: '#f0f0f0', fontSize: '12px', color: '#333' }}>
          🔧 Debug: Total tabs: {TAB_CONFIGS.length}, Available tabs: {TAB_CONFIGS.map(t => t.id).join(', ')}, Active: {listView.activeTab}
        </div>
      )}
      
      {/* Tab Headers */}
      <div className="tab-header" style={{ 
        display: 'flex', 
        borderBottom: '1px solid #444', 
        backgroundColor: '#2a2a2a' 
      }}>
        {TAB_CONFIGS.map(tab => (
          <button
            key={tab.id}
            className={`tab ${listView.activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.description}
            style={{
              padding: '12px 16px',
              border: 'none',
              background: listView.activeTab === tab.id ? '#333' : 'transparent',
              borderBottom: listView.activeTab === tab.id ? '2px solid #007acc' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: listView.activeTab === tab.id ? '600' : 'normal',
              color: listView.activeTab === tab.id ? '#007acc' : '#cccccc'
            }}
          >
            <span>{tab.icon}</span>
            <span>{tab.title}</span>
          </button>
        ))}
      </div>

      {/* Controls - カスタムコンポーネントの場合は表示しない */}
      {!activeTabConfig.isCustomComponent && (
        <div className="controls" style={{ 
          padding: '16px', 
          display: 'flex', 
          gap: '16px', 
          alignItems: 'center',
          backgroundColor: '#2a2a2a',
          borderBottom: '1px solid #444'
        }}>
        {/* Search */}
        {activeTabConfig.showSearch && (
          <div style={{ flex: 1, maxWidth: '300px' }}>
            <input
              type="text"
              placeholder="Search pins, signals, or comments..."
              value={listView.searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #555',
                borderRadius: '4px',
                fontSize: '14px',
                backgroundColor: '#1a1a1a',
                color: '#ffffff'
              }}
            />
          </div>
        )}

        {/* Comment Filter */}
        <div>
          <select 
            value={listView.commentFilter} 
            onChange={(e) => setCommentFilter(e.target.value as any)}
            style={{
              padding: '8px 12px',
              border: '1px solid #555',
              borderRadius: '4px',
              fontSize: '14px',
              backgroundColor: '#1a1a1a',
              color: '#ffffff'
            }}
          >
            <option value="all">All Pins</option>
            <option value="with-comments">With Comments</option>
            <option value="without-comments">Without Comments</option>
          </select>
        </div>

        {/* Results count */}
        <div style={{ color: '#cccccc', fontSize: '14px' }}>
          {filteredPins.length} pins
        </div>

        {/* BANK Color Legend with Toggle Functionality */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ color: '#cccccc', fontSize: '12px' }}>BANKs:</span>
          
          {/* Show All Banks Button */}
          <button
            onClick={() => {
              const allBanks = Array.from(new Set(pins.map(p => p.bank).filter(Boolean)));
              if (visibleBanks.size === 0) {
                // If all banks are visible, hide all
                allBanks.forEach(bank => toggleBankVisibility(bank!));
              } else {
                // Show all banks
                allBanks.forEach(bank => {
                  if (!visibleBanks.has(bank!)) {
                    toggleBankVisibility(bank!);
                  }
                });
              }
            }}
            style={{
              padding: '2px 8px',
              borderRadius: '3px',
              backgroundColor: visibleBanks.size === 0 ? '#007acc' : '#444444',
              border: '1px solid #555',
              cursor: 'pointer',
              fontSize: '10px',
              color: visibleBanks.size === 0 ? '#ffffff' : '#cccccc',
              fontWeight: 'bold',
            }}
            title={visibleBanks.size === 0 ? 'Hide All Banks' : 'Show All Banks'}
          >
            {visibleBanks.size === 0 ? 'ALL' : 'SHOW ALL'}
          </button>

          {Array.from(new Set(pins.map(p => p.bank).filter(Boolean)))
            .sort((a, b) => {
              const aNum = parseInt(a!);
              const bNum = parseInt(b!);
              return isNaN(aNum) || isNaN(bNum) ? a!.localeCompare(b!) : aNum - bNum;
            }) // Dynamic bank display - no limit
            .map(bank => {
              const isVisible = visibleBanks.size === 0 || visibleBanks.has(bank!);
              return (
                <button
                  key={bank}
                  onClick={() => toggleBankVisibility(bank!)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    backgroundColor: isVisible 
                      ? getBankBackgroundColor(bank, false, false)
                      : '#444444',
                    border: isVisible 
                      ? '1px solid #555' 
                      : '1px solid #666',
                    cursor: 'pointer',
                    opacity: isVisible ? 1.0 : 0.5,
                    transition: 'opacity 0.2s ease, background-color 0.2s ease',
                  }}
                  title={isVisible ? `Hide Bank ${bank}` : `Show Bank ${bank}`}
                >
                  <span style={{ 
                    fontSize: '11px', 
                    color: isVisible ? '#ffffff' : '#999',
                    fontWeight: isVisible ? 'normal' : 'bold'
                  }}>
                    {bank}
                  </span>
                  {!isVisible && (
                    <span style={{ fontSize: '8px', color: '#888' }}>✕</span>
                  )}
                </button>
              );
            })
          }
        </div>

        {/* Bulk actions */}
        {listView.selectedRows.size > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '14px', color: '#cccccc' }}>
              {listView.selectedRows.size} selected
            </span>
            <button
              onClick={() => setShowBulkEditor(!showBulkEditor)}
              style={{
                padding: '6px 12px',
                border: '1px solid #007acc',
                borderRadius: '4px',
                backgroundColor: showBulkEditor ? '#005a9e' : '#007acc',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              {showBulkEditor ? 'Close Bulk Edit' : 'Bulk Edit'}
            </button>
            <button
              onClick={() => bulkUpdateComments(Array.from(listView.selectedRows), '')}
              style={{
                padding: '6px 12px',
                border: '1px solid #dc3545',
                borderRadius: '4px',
                backgroundColor: '#dc3545',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Comments
            </button>
            <button
              onClick={() => {
                updateListViewState({ selectedRows: new Set() });
              }}
              style={{
                padding: '6px 12px',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                backgroundColor: '#6c757d',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear Selection
            </button>
          </div>
        )}
        </div>
      )}

      {/* Enhanced Bulk Editor - カスタムコンポーネントの場合は表示しない */}
      {!activeTabConfig.isCustomComponent && showBulkEditor && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#1a1a1a', 
          borderBottom: '1px solid #444'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#ffffff', fontSize: '14px' }}>
              Bulk Edit ({listView.selectedRows.size} pins selected)
            </h4>
          </div>
          
          {/* Comment Section */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '4px', color: '#cccccc', fontSize: '12px' }}>
              Comment
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Enter comment for selected pins..."
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleBulkCommentApply()}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: '#333',
                  color: '#ffffff'
                }}
              />
              <button
                onClick={handleBulkCommentApply}
                disabled={!bulkComment.trim()}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '4px',
                  backgroundColor: bulkComment.trim() ? '#28a745' : '#666',
                  color: 'white',
                  fontSize: '12px',
                  cursor: bulkComment.trim() ? 'pointer' : 'not-allowed'
                }}
              >
                Apply Comment
              </button>
            </div>
          </div>

          {/* I/O Settings Section */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: '#cccccc', fontSize: '12px' }}>
              I/O Settings (leave empty to skip)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
              {/* Direction */}
              <div>
                <label style={{ display: 'block', marginBottom: '2px', color: '#999', fontSize: '10px' }}>
                  Direction
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    backgroundColor: '#333',
                    color: '#ffffff',
                    fontSize: '11px'
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedPins = Array.from(listView.selectedRows);
                      selectedPins.forEach(pinId => {
                        updatePin(pinId, { direction: e.target.value as any });
                      });
                    }
                  }}
                >
                  <option value="">-- Select Direction --</option>
                  <option value="Input">Input</option>
                  <option value="Output">Output</option>
                  <option value="InOut">InOut</option>
                  <option value="Clock">Clock</option>
                  <option value="Reset">Reset</option>
                </select>
              </div>

              {/* Voltage */}
              <div>
                <label style={{ display: 'block', marginBottom: '2px', color: '#999', fontSize: '10px' }}>
                  Voltage
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    backgroundColor: '#333',
                    color: '#ffffff',
                    fontSize: '11px'
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedPins = Array.from(listView.selectedRows);
                      selectedPins.forEach(pinId => {
                        updatePin(pinId, { voltage: e.target.value });
                      });
                    }
                  }}
                >
                  <option value="">-- Select Voltage --</option>
                  {VOLTAGE_LEVELS.map(voltage => (
                    <option key={voltage} value={voltage}>{voltage}</option>
                  ))}
                </select>
              </div>

              {/* I/O Standard */}
              <div>
                <label style={{ display: 'block', marginBottom: '2px', color: '#999', fontSize: '10px' }}>
                  I/O Standard
                </label>
                <select
                  style={{
                    width: '100%',
                    padding: '4px 8px',
                    border: '1px solid #555',
                    borderRadius: '3px',
                    backgroundColor: '#333',
                    color: '#ffffff',
                    fontSize: '11px'
                  }}
                  onChange={(e) => {
                    if (e.target.value) {
                      const selectedPins = Array.from(listView.selectedRows);
                      selectedPins.forEach(pinId => {
                        updatePin(pinId, { 
                          attributes: { IO_Standard: e.target.value },
                          ioType: e.target.value 
                        });
                      });
                    }
                  }}
                >
                  <option value="">-- Select Standard --</option>
                  <option value="AUTO">AUTO</option>
                  {IO_STANDARDS.filter(std => std !== 'AUTO').map(standard => (
                    <option key={standard} value={standard}>{standard}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button
              onClick={() => setShowBulkEditor(false)}
              style={{
                padding: '8px 16px',
                border: '1px solid #6c757d',
                borderRadius: '4px',
                backgroundColor: '#333',
                color: '#cccccc',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ 
        flex: 1, 
        minHeight: '400px',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {activeTabConfig.isCustomComponent ? (
          // カスタムコンポーネントの表示
          activeTabConfig.id === 'bankGroups' ? (
            <BankGroupsPanel 
              pins={pins} 
            />
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              Custom component not implemented for {activeTabConfig.id}
            </div>
          )
        ) : (
          // 通常のリスト表示
          filteredPins.length > 0 ? (
            <VirtualizedPinList
              pins={filteredPins}
              columns={activeTabConfig.columns}
              selectedRows={listView.selectedRows}
              hoveredRowId={hoveredRowId}
              sortColumn={listView.sortColumn}
              sortDirection={listView.sortDirection}
              onRowSelection={handleRowSelection}
              onPinSelect={_onPinSelect}
              onHover={setHoveredRowId}
              onColumnSort={handleColumnSort}
              renderCellContent={renderCellContent}
            />
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: '#666',
              fontStyle: 'italic'
            }}>
              No pins match the current filters
            </div>
          )
        )}
      </div>
    </div>
  );
};
