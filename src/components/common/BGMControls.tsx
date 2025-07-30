import React, { useState } from 'react';
import { useAudioStore } from '@/stores/audio-store';

export const BGMControls: React.FC = () => {
  const [showControls, setShowControls] = useState(false);
  const { 
    isPlaying, 
    volume, 
    currentTrack,
    playBGM, 
    pauseBGM, 
    stopBGM, 
    setVolume, 
    nextTrack 
  } = useAudioStore();

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      pauseBGM();
    } else {
      playBGM();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* BGM Toggle Button */}
      <button
        onClick={() => setShowControls(!showControls)}
        style={{
          padding: '6px 8px',
          backgroundColor: isPlaying ? '#4A90E2' : '#333',
          border: '1px solid #555',
          borderRadius: '4px',
          color: '#ccc',
          cursor: 'pointer',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
        }}
        title="Background Music Controls"
      >
        🎵 {isPlaying ? '♪' : '♫'}
      </button>

      {/* BGM Controls Panel */}
      {showControls && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '4px',
            backgroundColor: '#2a2a2a',
            border: '1px solid #555',
            borderRadius: '4px',
            padding: '12px',
            minWidth: '200px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
          }}
        >
          <div style={{ 
            fontSize: '12px', 
            color: '#ccc', 
            marginBottom: '8px',
            fontWeight: 'bold',
          }}>
            Background Music
          </div>

          {/* Play Controls */}
          <div style={{ 
            display: 'flex', 
            gap: '4px', 
            marginBottom: '8px',
            alignItems: 'center',
          }}>
            <button
              onClick={handlePlayPause}
              style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              {isPlaying ? '⏸️' : '▶️'}
            </button>
            
            <button
              onClick={stopBGM}
              style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              ⏹️
            </button>

            <button
              onClick={nextTrack}
              style={{
                padding: '4px 8px',
                backgroundColor: '#333',
                border: '1px solid #555',
                borderRadius: '3px',
                color: '#ccc',
                cursor: 'pointer',
                fontSize: '11px',
              }}
            >
              ⏭️
            </button>
          </div>

          {/* Volume Control */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ 
              fontSize: '11px', 
              color: '#999', 
              marginBottom: '4px',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Volume</span>
              <span>{Math.round(volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#555',
                outline: 'none',
                borderRadius: '2px',
              }}
            />
          </div>

          {/* Status */}
          <div style={{ 
            fontSize: '10px', 
            color: '#666',
            fontStyle: 'italic',
          }}>
            {currentTrack ? (
              isPlaying ? 'Playing ambient music...' : 'Paused'
            ) : (
              'No track loaded'
            )}
          </div>

          {/* Info */}
          <div style={{ 
            fontSize: '9px', 
            color: '#555',
            marginTop: '8px',
            fontStyle: 'italic',
          }}>
            💡 Background music helps maintain focus during long design sessions
          </div>
        </div>
      )}
    </div>
  );
};
