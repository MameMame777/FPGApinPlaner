// Undo/Redo service for managing action history

export interface Action {
  id: string;
  type: string;
  timestamp: Date;
  data: any;
  description: string;
}

export interface UndoRedoState {
  history: Action[];
  currentIndex: number;
  maxHistorySize: number;
}

export class UndoRedoService {
  private static state: UndoRedoState = {
    history: [],
    currentIndex: -1,
    maxHistorySize: 50,
  };

  private static listeners: Set<() => void> = new Set();

  static initialize(maxHistorySize: number = 50) {
    this.state.maxHistorySize = maxHistorySize;
  }

  static addListener(callback: () => void) {
    this.listeners.add(callback);
  }

  static removeListener(callback: () => void) {
    this.listeners.delete(callback);
  }

  private static notifyListeners() {
    this.listeners.forEach(callback => callback());
  }

  static recordAction(type: string, data: any, description: string): string {
    const action: Action = {
      id: crypto.randomUUID(),
      type,
      timestamp: new Date(),
      data: JSON.parse(JSON.stringify(data)), // Deep clone
      description,
    };

    // Remove any actions after current index (when user did something after undo)
    this.state.history = this.state.history.slice(0, this.state.currentIndex + 1);
    
    // Add new action
    this.state.history.push(action);
    this.state.currentIndex++;

    // Limit history size
    if (this.state.history.length > this.state.maxHistorySize) {
      this.state.history.shift();
      this.state.currentIndex--;
    }

    this.notifyListeners();
    return action.id;
  }

  static canUndo(): boolean {
    return this.state.currentIndex >= 0;
  }

  static canRedo(): boolean {
    return this.state.currentIndex < this.state.history.length - 1;
  }

  static undo(): Action | null {
    if (!this.canUndo()) return null;

    const action = this.state.history[this.state.currentIndex];
    this.state.currentIndex--;
    
    this.notifyListeners();
    return action;
  }

  static redo(): Action | null {
    if (!this.canRedo()) return null;

    this.state.currentIndex++;
    const action = this.state.history[this.state.currentIndex];
    
    this.notifyListeners();
    return action;
  }

  static getHistory(): Action[] {
    return [...this.state.history];
  }

  static getCurrentIndex(): number {
    return this.state.currentIndex;
  }

  static clear() {
    this.state.history = [];
    this.state.currentIndex = -1;
    this.notifyListeners();
  }

  // Action creators for common operations
  static createPinAssignmentAction(pinId: string, oldSignal: string, newSignal: string) {
    return {
      type: 'PIN_ASSIGNMENT',
      data: {
        pinId,
        oldSignal,
        newSignal,
      },
    };
  }

  static createBulkAssignmentAction(assignments: Array<{pinId: string, oldSignal: string, newSignal: string}>) {
    return {
      type: 'BULK_ASSIGNMENT',
      data: { assignments },
    };
  }

  static createSelectionAction(oldSelection: Set<string>, newSelection: Set<string>) {
    return {
      type: 'SELECTION_CHANGE',
      data: {
        oldSelection: Array.from(oldSelection),
        newSelection: Array.from(newSelection),
      },
    };
  }

  static createViewChangeAction(oldView: any, newView: any) {
    return {
      type: 'VIEW_CHANGE',
      data: {
        oldView,
        newView,
      },
    };
  }

  // Get human-readable action description
  static getActionDescription(action: Action): string {
    switch (action.type) {
      case 'PIN_ASSIGNMENT':
        const { pinId, oldSignal: _oldSignal, newSignal } = action.data;
        if (newSignal) {
          return `Assigned "${newSignal}" to pin ${pinId}`;
        } else {
          return `Cleared assignment from pin ${pinId}`;
        }
      
      case 'BULK_ASSIGNMENT':
        const count = action.data.assignments.length;
        return `Bulk assignment to ${count} pins`;
      
      case 'SELECTION_CHANGE':
        const selected = action.data.newSelection.length;
        return `Selected ${selected} pin(s)`;
      
      case 'VIEW_CHANGE':
        return `Changed view settings`;
      
      default:
        return action.description || `Unknown action: ${action.type}`;
    }
  }
}
