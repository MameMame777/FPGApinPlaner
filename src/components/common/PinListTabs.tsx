import React, { useMemo, useState } from 'react';
import { useAppStore } from '../../stores/app-store';
import { TAB_CONFIGS } from '../../constants/tab-configs';
import { EditableTableCell } from '../common/EditableTableCell';
import { CommentTemplateSelector } from '../common/CommentTemplateSelector';
import { CommentManager } from '../../services/comment-service';
import { Pin, ColumnConfig } from '../../types';

interface PinListTabsProps {
  onPinSelect?: (pinId: string) => void;
}

export const PinListTabs: React.FC<PinListTabsProps> = ({ onPinSelect }) => {
  const {
    pins,
    listView,
    setActiveTab,
    setSearchQuery,
    setCommentFilter,
    updatePin,
    updateListViewState,
    bulkUpdateComments
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
      default:
        return (pin as any)[columnKey] || '';
    }
  };

  const filteredPins = useMemo(() => {
    let result = pins;

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
  }, [pins, activeTabConfig, listView.searchQuery, listView.commentFilter, listView.sortColumn, listView.sortDirection]);

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
    const updates: Partial<Pin> = {};
    
    if (columnKey === 'comment') {
      updates.comment = newValue;
      updates.commentTimestamp = new Date();
      updates.commentAuthor = 'current_user'; // TODO: Get from auth system
    } else {
      (updates as any)[columnKey] = newValue;
    }
    
    updatePin(pinId, updates);
  };

  const handleTemplateSelect = (pinId: string, templateId: string, variables: Record<string, string>) => {
    const pin = pins.find(p => p.id === pinId);
    if (!pin) return;

    let comment: string;
    if (templateId === 'auto') {
      comment = CommentManager.generateAutoComment(pin);
    } else {
      comment = CommentManager.applyTemplate(templateId, variables);
    }

    handleCellEdit(pinId, 'comment', comment);
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

  const handleSelectAll = (selected: boolean) => {
    const newSelection = selected ? new Set(filteredPins.map(p => p.id)) : new Set<string>();
    updateListViewState({ selectedRows: newSelection });
  };

  const handleSort = (columnKey: string) => {
    const column = activeTabConfig.columns.find(c => c.key === columnKey);
    if (!column?.sortable) return;

    let newDirection: 'asc' | 'desc' = 'asc';
    if (listView.sortColumn === columnKey && listView.sortDirection === 'asc') {
      newDirection = 'desc';
    }

    updateListViewState({
      sortColumn: columnKey,
      sortDirection: newDirection
    });
  };

  const handleBulkCommentApply = () => {
    if (bulkComment.trim() && listView.selectedRows.size > 0) {
      bulkUpdateComments(Array.from(listView.selectedRows), bulkComment);
      setBulkComment('');
      setShowBulkEditor(false);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (listView.sortColumn !== columnKey) return null;
    return listView.sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  // BANK別の背景色を取得する関数
  const getBankBackgroundColor = (bank: string | undefined, isSelected: boolean, isHovered: boolean): string => {
    if (isSelected) return '#2d4f75';
    
    if (!bank) {
      return isHovered ? '#2a2a2a' : '#1a1a1a'; // BANKが未定義の場合はデフォルト色
    }

    // BANK番号に基づいて色を決定
    const bankNum = parseInt(bank);
    const bankColors = [
      '#1a2332', // Bank 0 - 深い青
      '#1a3221', // Bank 1 - 深い緑
      '#321a32', // Bank 2 - 深い紫
      '#322a1a', // Bank 3 - 深い茶
      '#1a3232', // Bank 4 - 深いティール
      '#321a1a', // Bank 5 - 深い赤
      '#2a1a32', // Bank 6 - 深いマゼンタ
      '#323221', // Bank 7 - 深いオリーブ
      '#1a1a32', // Bank 8 - 深いネイビー
      '#32321a', // Bank 9 - 深いイエロー
      '#1a3232', // Bank 10+ - ティールの繰り返し
    ];

    const colorIndex = isNaN(bankNum) ? 0 : bankNum % bankColors.length;
    const baseColor = bankColors[colorIndex];
    
    return isHovered ? lightenColor(baseColor, 0.2) : baseColor;
  };

  // 色を明るくするヘルパー関数
  const lightenColor = (hex: string, factor: number): string => {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * factor * 100);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255))
      .toString(16).slice(1);
  };

  return (
    <div className="pin-list-tabs">
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

      {/* Controls */}
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

        {/* BANK Color Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#cccccc', fontSize: '12px' }}>BANKs:</span>
          {Array.from(new Set(filteredPins.map(p => p.bank).filter(Boolean)))
            .sort((a, b) => {
              const aNum = parseInt(a!);
              const bNum = parseInt(b!);
              return isNaN(aNum) || isNaN(bNum) ? a!.localeCompare(b!) : aNum - bNum;
            })
            .slice(0, 8) // 最大8個のBANKを表示
            .map(bank => (
              <div
                key={bank}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  backgroundColor: getBankBackgroundColor(bank, false, false),
                  border: '1px solid #555'
                }}
              >
                <span style={{ fontSize: '11px', color: '#ffffff' }}>{bank}</span>
              </div>
            ))
          }
        </div>

        {/* Bulk actions */}
        {listView.selectedRows.size > 0 && (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#cccccc' }}>
              {listView.selectedRows.size} selected
            </span>
            <button
              onClick={() => setShowBulkEditor(!showBulkEditor)}
              style={{
                padding: '6px 12px',
                border: '1px solid #007acc',
                borderRadius: '4px',
                backgroundColor: '#007acc',
                color: 'white',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Bulk Comment
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
          </div>
        )}
      </div>

      {/* Bulk Comment Editor */}
      {showBulkEditor && (
        <div style={{ 
          padding: '16px', 
          backgroundColor: '#1a1a1a', 
          borderBottom: '1px solid #444',
          display: 'flex',
          gap: '8px',
          alignItems: 'center'
        }}>
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
              backgroundColor: bulkComment.trim() ? '#28a745' : '#ccc',
              color: 'white',
              fontSize: '14px',
              cursor: bulkComment.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Apply
          </button>
          <button
            onClick={() => setShowBulkEditor(false)}
            style={{
              padding: '8px 16px',
              border: '1px solid #6c757d',
              borderRadius: '4px',
              backgroundColor: '#333',
              color: '#cccccc',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ overflow: 'auto', maxHeight: '500px' }} className="custom-scrollbar">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#2a2a2a', zIndex: 1 }}>
            <tr>
              <th style={{ 
                width: '40px', 
                padding: '12px 8px', 
                borderBottom: '2px solid #444',
                textAlign: 'center',
                backgroundColor: '#2a2a2a',
                color: '#ffffff'
              }}>
                <input
                  type="checkbox"
                  checked={filteredPins.length > 0 && listView.selectedRows.size === filteredPins.length}
                  onChange={(e) => handleSelectAll(e.target.checked)}
                />
              </th>
              {activeTabConfig.columns.map(column => (
                <th
                  key={column.key}
                  style={{
                    width: `${column.width}px`,
                    padding: '12px 8px',
                    borderBottom: '2px solid #444',
                    textAlign: 'left',
                    cursor: column.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#2a2a2a'
                  }}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.title}{getSortIcon(column.key)}
                </th>
              ))}
              <th style={{
                width: '100px',
                padding: '12px 8px',
                borderBottom: '2px solid #444',
                textAlign: 'center',
                fontSize: '14px',
                fontWeight: '600',
                color: '#ffffff',
                backgroundColor: '#2a2a2a'
              }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredPins.map(pin => {
              const isHovered = hoveredRowId === pin.id;
              const backgroundColor = getBankBackgroundColor(pin.bank, listView.selectedRows.has(pin.id), isHovered);
              
              return (
              <tr 
                key={pin.id}
                style={{
                  backgroundColor,
                  cursor: 'pointer',
                  borderBottom: '1px solid #333',
                  color: '#ffffff'
                }}
                onClick={() => onPinSelect?.(pin.id)}
                onMouseEnter={() => setHoveredRowId(pin.id)}
                onMouseLeave={() => setHoveredRowId(null)}
              >
                <td style={{ 
                  padding: '8px', 
                  borderBottom: '1px solid #333',
                  textAlign: 'center'
                }}>
                  <input
                    type="checkbox"
                    checked={listView.selectedRows.has(pin.id)}
                    onChange={(e) => handleRowSelection(pin.id, e.target.checked)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {activeTabConfig.columns.map(column => (
                  <td
                    key={column.key}
                    style={{
                      padding: '8px',
                      borderBottom: '1px solid #333',
                      fontSize: '14px',
                      maxWidth: `${column.width}px`,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={(e) => column.editable && e.stopPropagation()}
                  >
                    {renderCellContent(pin, column)}
                  </td>
                ))}
                <td
                  style={{
                    padding: '8px',
                    borderBottom: '1px solid #333',
                    textAlign: 'center'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const autoComment = CommentManager.generateAutoComment(pin);
                        handleCellEdit(pin.id, 'comment', autoComment);
                      }}
                      title="Generate automatic comment"
                      style={{
                        padding: '4px 6px',
                        border: '1px solid #28a745',
                        borderRadius: '3px',
                        backgroundColor: '#f8fff9',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#28a745'
                      }}
                    >
                      🤖
                    </button>
                    <CommentTemplateSelector
                      onSelect={(templateId, variables) => 
                        handleTemplateSelect(pin.id, templateId, variables)
                      }
                      pin={pin}
                    />
                  </div>
                </td>
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filteredPins.length === 0 && (
        <div style={{ 
          padding: '40px', 
          textAlign: 'center', 
          color: '#666',
          fontStyle: 'italic'
        }}>
          No pins match the current filters
        </div>
      )}
    </div>
  );
};
