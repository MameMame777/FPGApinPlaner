import React from 'react';
import { Pin, ColumnConfig } from '../../types';
import { getBankBackgroundColor } from '../../utils/ui-utils';

interface SimpleScrollTestProps {
  pins: Pin[];
  columns: ColumnConfig[];
  selectedRows: Set<string>;
  hoveredRowId: string | null;
  onRowSelection: (pinId: string, selected: boolean) => void;
  onPinSelect?: (pinId: string) => void;
  onHover: (pinId: string | null) => void;
  renderCellContent: (pin: Pin, column: ColumnConfig) => React.ReactNode;
}

const ITEM_HEIGHT = 48;

export const SimpleScrollTest: React.FC<SimpleScrollTestProps> = ({
  pins,
  columns,
  selectedRows,
  hoveredRowId,
  onRowSelection,
  onPinSelect,
  onHover,
  renderCellContent,
}) => {
  console.log('🧪 SimpleScrollTest: Rendering', pins.length, 'pins');

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Fixed Header */}
      <div style={{ 
        backgroundColor: '#2a2a2a',
        borderBottom: '2px solid #444',
        flexShrink: 0,
        zIndex: 10
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{
                width: '40px',
                padding: '12px 8px',
                borderBottom: '2px solid #444',
                textAlign: 'center',
                backgroundColor: '#2a2a2a',
                color: '#ffffff'
              }}>
                #
              </th>
              {columns.map(column => (
                <th
                  key={column.key}
                  style={{
                    width: `${column.width}px`,
                    padding: '12px 8px',
                    borderBottom: '2px solid #444',
                    textAlign: 'left',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#ffffff',
                    backgroundColor: '#2a2a2a'
                  }}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
        </table>
      </div>

      {/* Scrollable Content */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          backgroundColor: '#1a1a1a'
        }}
        className="virtualized-list-scroll"
      >
        <div style={{ 
          background: '#ff6600', 
          color: 'white', 
          padding: '8px',
          position: 'sticky',
          top: 0,
          zIndex: 5
        }}>
          🧪 Test: {pins.length} pins × {ITEM_HEIGHT}px = {pins.length * ITEM_HEIGHT}px total height
        </div>
        
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {pins.map((pin, index) => {
              const isHovered = hoveredRowId === pin.id;
              const backgroundColor = getBankBackgroundColor(pin.bank, selectedRows.has(pin.id), isHovered);
              
              return (
                <tr 
                  key={pin.id}
                  style={{
                    backgroundColor,
                    cursor: 'pointer',
                    borderBottom: '1px solid #333',
                    color: '#ffffff',
                    height: `${ITEM_HEIGHT}px`,
                  }}
                  onClick={() => onPinSelect?.(pin.id)}
                  onMouseEnter={() => onHover(pin.id)}
                  onMouseLeave={() => onHover(null)}
                >
                  <td style={{ 
                    padding: '8px', 
                    borderBottom: '1px solid #333',
                    textAlign: 'center',
                    width: '40px'
                  }}>
                    {index + 1}
                  </td>
                  {columns.map(column => (
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
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div style={{ 
          height: '100px', 
          background: '#00ff00', 
          color: 'black',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '18px',
          fontWeight: 'bold'
        }}>
          🎯 END OF LIST - If you can see this, scrolling works!
        </div>
      </div>
    </div>
  );
};
