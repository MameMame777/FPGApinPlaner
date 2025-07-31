import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { KeyboardService } from '@/services/keyboard-service';
import { UndoRedoService } from '@/services/undo-redo-service';

export const useUndoRedoHotkeys = () => {
  const { undo, redo, updateUndoRedoState } = useAppStore();

  useEffect(() => {
    // Initialize UndoRedoService
    UndoRedoService.initialize();
    
    // Add listener for state updates
    const updateState = () => {
      updateUndoRedoState();
    };
    
    UndoRedoService.addListener(updateState);
    
    // Initialize keyboard service
    KeyboardService.initialize();
    
    // Register undo/redo shortcuts
    KeyboardService.registerShortcut('ctrl+z', () => {
      undo();
    });
    
    KeyboardService.registerShortcut('ctrl+y', () => {
      redo();
    });
    
    // Also support Ctrl+Shift+Z for redo (common alternative)
    KeyboardService.registerShortcut('ctrl+shift+z', () => {
      redo();
    });
    
    // Initial state update
    updateUndoRedoState();
    
    return () => {
      UndoRedoService.removeListener(updateState);
      KeyboardService.unregisterShortcut('ctrl+z');
      KeyboardService.unregisterShortcut('ctrl+y');
      KeyboardService.unregisterShortcut('ctrl+shift+z');
    };
  }, [undo, redo, updateUndoRedoState]);
};

export const useGeneralHotkeys = () => {
  const { 
    clearSelection, 
    resetZoom, 
    rotatePins, 
    flipView, 
    setZoom,
    viewConfig 
  } = useAppStore();

  useEffect(() => {
    // Register general shortcuts
    KeyboardService.registerShortcut('escape', () => {
      clearSelection();
    });
    
    KeyboardService.registerShortcut('r', () => {
      resetZoom();
    });
    
    KeyboardService.registerShortcut('space', () => {
      rotatePins(90);
    });
    
    KeyboardService.registerShortcut('f', () => {
      flipView();
    });
    
    KeyboardService.registerShortcut('+', () => {
      const newZoom = Math.min(viewConfig.zoom * 1.2, 5.0);
      setZoom(newZoom);
    });
    
    KeyboardService.registerShortcut('-', () => {
      const newZoom = Math.max(viewConfig.zoom / 1.2, 0.1);
      setZoom(newZoom);
    });
    
    KeyboardService.registerShortcut('0', () => {
      setZoom(1.0);
    });

    // Help shortcut
    KeyboardService.registerShortcut('ctrl+shift+?', () => {
      // This will be handled by the parent component
      document.dispatchEvent(new CustomEvent('showKeyboardHelp'));
    });
    
    return () => {
      KeyboardService.unregisterShortcut('escape');
      KeyboardService.unregisterShortcut('r');
      KeyboardService.unregisterShortcut('space');
      KeyboardService.unregisterShortcut('f');
      KeyboardService.unregisterShortcut('+');
      KeyboardService.unregisterShortcut('-');
      KeyboardService.unregisterShortcut('0');
      KeyboardService.unregisterShortcut('ctrl+shift+?');
    };
  }, [clearSelection, resetZoom, rotatePins, flipView, setZoom, viewConfig.zoom]);
};

export const useAppHotkeys = () => {
  useUndoRedoHotkeys();
  useGeneralHotkeys();
  
  useEffect(() => {
    // Cleanup keyboard service on component unmount
    return () => {
      KeyboardService.cleanup();
    };
  }, []);
};
