import React from 'react';

interface AppProps {}

const App: React.FC<AppProps> = () => {
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
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '12px' }}>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#4A90E2',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}>
            Open CSV
          </button>
          <button style={{
            padding: '8px 16px',
            backgroundColor: '#666',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
          }}>
            Export XDC
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
          width: '300px',
          backgroundColor: '#252525',
          borderRight: '1px solid #444',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}>
          {/* Search and Filters */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #444',
          }}>
            <input
              type="text"
              placeholder="Search pins..."
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
            <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
              }}>
                All
              </button>
              <button style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
              }}>
                I/O
              </button>
              <button style={{
                padding: '4px 8px',
                fontSize: '12px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
              }}>
                Power
              </button>
            </div>
          </div>

          {/* Pin List */}
          <div style={{
            flex: 1,
            overflow: 'auto',
            padding: '8px',
          }}>
            <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px' }}>
              No package loaded
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
          </div>
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
            <button style={{
              padding: '6px 12px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
              🔄 Rotate 90°
            </button>
            <button style={{
              padding: '6px 12px',
              backgroundColor: '#333',
              border: '1px solid #555',
              borderRadius: '4px',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '12px',
            }}>
              ↕️ Flip View
            </button>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#999' }}>Zoom:</span>
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
              }}>
                -
              </button>
              <span style={{ fontSize: '12px', color: '#ccc', minWidth: '40px', textAlign: 'center' }}>
                100%
              </span>
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '12px',
              }}>
                +
              </button>
            </div>
          </div>

          {/* Canvas Area */}
          <div style={{
            flex: 1,
            backgroundColor: '#1a1a1a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '40px',
              textAlign: 'center',
              color: '#666',
            }}>
              <div style={{ 
                fontSize: '48px', 
                marginBottom: '16px',
                opacity: 0.5,
              }}>
                🎯
              </div>
              <div style={{ fontSize: '18px', marginBottom: '8px' }}>
                Welcome to FPGA Pin Planner
              </div>
              <div style={{ fontSize: '14px', maxWidth: '400px', lineHeight: 1.5 }}>
                Load a CSV file containing FPGA pin data to visualize and manage pin assignments.
                Supports Xilinx and Quartus formats.
              </div>
            </div>
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
          <span>Pins: 0 | Assigned: 0 | Unassigned: 0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
