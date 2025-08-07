import React from 'react';

export const BasicScrollTest: React.FC = () => {
  return (
    <div style={{ 
      height: '100%', 
      backgroundColor: '#1a1a1a',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{ 
        backgroundColor: '#ff0000', 
        color: 'white', 
        padding: '20px',
        flexShrink: 0
      }}>
        🔴 Fixed Header - This should always be visible
      </div>
      
      <div style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#333'
      }}>
        <div style={{ 
          height: '2000px', // Force tall content
          background: 'linear-gradient(to bottom, #ff0000, #00ff00, #0000ff)',
          padding: '20px',
          color: 'white'
        }}>
          <div style={{ height: '200px', backgroundColor: '#ff6600', margin: '10px 0', padding: '20px' }}>
            🟠 Block 1 - Top of scrollable area
          </div>
          <div style={{ height: '200px', backgroundColor: '#ffff00', margin: '10px 0', padding: '20px' }}>
            🟡 Block 2
          </div>
          <div style={{ height: '200px', backgroundColor: '#00ff00', margin: '10px 0', padding: '20px' }}>
            🟢 Block 3
          </div>
          <div style={{ height: '200px', backgroundColor: '#00ffff', margin: '10px 0', padding: '20px' }}>
            🔵 Block 4
          </div>
          <div style={{ height: '200px', backgroundColor: '#0000ff', margin: '10px 0', padding: '20px' }}>
            🔴 Block 5
          </div>
          <div style={{ height: '200px', backgroundColor: '#ff00ff', margin: '10px 0', padding: '20px' }}>
            🟣 Block 6
          </div>
          <div style={{ height: '200px', backgroundColor: '#ffffff', margin: '10px 0', padding: '20px', color: 'black' }}>
            ⚪ Block 7
          </div>
          <div style={{ height: '200px', backgroundColor: '#000000', margin: '10px 0', padding: '20px', color: 'white' }}>
            ⚫ Block 8 - Bottom of scrollable area
          </div>
        </div>
      </div>
      
      <div style={{ 
        backgroundColor: '#00ff00', 
        color: 'black', 
        padding: '20px',
        flexShrink: 0
      }}>
        🟢 Fixed Footer - This should always be visible
      </div>
    </div>
  );
};
