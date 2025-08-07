import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Pin, ColumnConfig } from '../../types';
import { getBankBackgroundColor } from '../../utils/ui-utils';

interface VirtualizedPinListProps {
  pins: Pin[];
  columns: ColumnConfig[];
  selectedRows: Set<string>;
  hoveredRowId: string | null;
  onRowSelection: (pinId: string, selected: boolean) => void;
  onPinSelect?: (pinId: string) => void;
  onHover: (pinId: string | null) => void;
  renderCellContent: (pin: Pin, column: ColumnConfig) => React.ReactNode;
}

const ITEM_HEIGHT = 48; // Height of each row in pixels
const BUFFER_SIZE = 5; // Number of extra items to render above/below visible area

export const VirtualizedPinList: React.FC<VirtualizedPinListProps> = ({
  pins,
  columns,
  selectedRows,
  hoveredRowId,
  onRowSelection,
  onPinSelect,
  onHover,
  renderCellContent,
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(400);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / ITEM_HEIGHT);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const end = Math.min(start + visibleCount + BUFFER_SIZE * 2, pins.length);
    const adjustedStart = Math.max(0, start - BUFFER_SIZE);
    
    return {
      start: adjustedStart,
      end,
      visibleCount: end - adjustedStart
    };
  }, [scrollTop, containerHeight, pins.length]);

  // Get visible pins
  const visiblePins = useMemo(() => {
    return pins.slice(visibleRange.start, visibleRange.end);
  }, [pins, visibleRange.start, visibleRange.end]);

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    console.log('📊 Scroll Event:', {
      scrollTop: target.scrollTop,
      scrollHeight: target.scrollHeight,
      clientHeight: target.clientHeight,
      maxScroll: target.scrollHeight - target.clientHeight
    });
    setScrollTop(target.scrollTop);
  }, []);

  // Observe container size changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
      }
    };

    updateSize();
    
    const resizeObserver = new ResizeObserver(updateSize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const totalHeight = pins.length * ITEM_HEIGHT; // Only data rows height

  // Performance logging
  useEffect(() => {
    console.log(`🚀 VirtualizedPinList Debug:`, {
      totalPins: pins.length,
      visibleCount: visibleRange.visibleCount,
      visiblePercent: Math.round(visibleRange.visibleCount / pins.length * 100),
      totalHeight,
      containerHeight,
      scrollTop,
      visibleStart: visibleRange.start,
      visibleEnd: visibleRange.end
    });
  }, [visibleRange.visibleCount, pins.length, totalHeight, containerHeight, scrollTop, visibleRange.start, visibleRange.end]);

  return (
    <div ref={containerRef} style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      {/* Header (fixed at top) */}
      <div 
        style={{ 
          backgroundColor: '#2a2a2a',
          borderBottom: '2px solid #444',
          flexShrink: 0,
          zIndex: 10
        }}
      >
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
                <input
                  type="checkbox"
                  checked={pins.length > 0 && selectedRows.size === pins.length}
                  onChange={(e) => {
                    const newSelection = e.target.checked ? new Set(pins.map(p => p.id)) : new Set<string>();
                    pins.forEach(pin => {
                      if (selectedRows.has(pin.id) !== newSelection.has(pin.id)) {
                        onRowSelection(pin.id, newSelection.has(pin.id));
                      }
                    });
                  }}
                />
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

      {/* Scrollable content area */}
      <div
        ref={scrollElementRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflow: 'auto',
          position: 'relative',
          scrollbarWidth: 'thin',
          scrollbarColor: '#555 #2a2a2a'
        }}
        className="virtualized-list-scroll"
      >
        {/* Virtual spacer to maintain scroll position */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible rows container */}
          <div
            style={{
              position: 'absolute',
              top: visibleRange.start * ITEM_HEIGHT,
              left: 0,
              right: 0,
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {visiblePins.map((pin) => {
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
                        <input
                          type="checkbox"
                          checked={selectedRows.has(pin.id)}
                          onChange={(e) => onRowSelection(pin.id, e.target.checked)}
                          onClick={(e) => e.stopPropagation()}
                        />
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
          </div>
        </div>
      </div>
    </div>
  );
};
