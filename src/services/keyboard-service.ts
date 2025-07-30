// Keyboard shortcuts service
export class KeyboardService {
  private static shortcuts = new Map<string, () => void>();
  private static isInitialized = false;

  static initialize() {
    if (this.isInitialized) return;
    
    document.addEventListener('keydown', this.handleKeyDown);
    this.isInitialized = true;
  }

  static cleanup() {
    document.removeEventListener('keydown', this.handleKeyDown);
    this.shortcuts.clear();
    this.isInitialized = false;
  }

  static registerShortcut(key: string, callback: () => void) {
    this.shortcuts.set(key.toLowerCase(), callback);
  }

  static unregisterShortcut(key: string) {
    this.shortcuts.delete(key.toLowerCase());
  }

  private static handleKeyDown = (event: KeyboardEvent) => {
    // Skip if user is typing in an input field
    if (event.target instanceof HTMLInputElement || 
        event.target instanceof HTMLTextAreaElement) {
      return;
    }

    const key = this.getKeyString(event);
    const callback = this.shortcuts.get(key);
    
    if (callback) {
      event.preventDefault();
      callback();
    }
  };

  private static getKeyString(event: KeyboardEvent): string {
    const parts = [];
    
    if (event.ctrlKey) parts.push('ctrl');
    if (event.altKey) parts.push('alt');
    if (event.shiftKey) parts.push('shift');
    if (event.metaKey) parts.push('meta');
    
    parts.push(event.key.toLowerCase());
    
    return parts.join('+');
  }

  // Predefined shortcut combinations for FPGA Pin Planner
  static getAvailableShortcuts() {
    return [
      { key: 'ctrl+o', description: 'Open CSV file' },
      { key: 'ctrl+s', description: 'Save project' },
      { key: 'ctrl+e', description: 'Export XDC' },
      { key: 'ctrl+f', description: 'Focus search' },
      { key: 'ctrl+a', description: 'Select all pins' },
      { key: 'ctrl+d', description: 'Deselect all' },
      { key: 'r', description: 'Reset zoom and pan' },
      { key: 'space', description: 'Rotate view 90°' },
      { key: 'f', description: 'Flip top/bottom view' },
      { key: 'ctrl+z', description: 'Undo' },
      { key: 'ctrl+y', description: 'Redo' },
      { key: '+', description: 'Zoom in' },
      { key: '-', description: 'Zoom out' },
      { key: '0', description: 'Reset zoom to 100%' },
      { key: 'escape', description: 'Clear selection' },
      { key: 'delete', description: 'Clear selected pin assignments' },
      { key: 'ctrl+shift+?', description: 'Show keyboard shortcuts' },
    ];
  }
}
