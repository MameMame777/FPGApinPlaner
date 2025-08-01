import * as vscode from 'vscode';

export interface Pin {
    number: string;
    name: string;
    direction: 'input' | 'output' | 'bidirectional';
    voltage?: string;
    ioStandard?: string;
    package?: string;
    bank?: string;
    comment?: string;
}

export class PinItem extends vscode.TreeItem {
    constructor(
        public readonly pin: Pin,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(pin.name, collapsibleState);
        
        this.tooltip = `${pin.name} (${pin.number})`;
        this.description = `${pin.direction} - ${pin.voltage || 'N/A'}`;
        this.contextValue = 'pin';
        
        // Set icon based on direction
        switch (pin.direction) {
            case 'input':
                this.iconPath = new vscode.ThemeIcon('arrow-right');
                break;
            case 'output':
                this.iconPath = new vscode.ThemeIcon('arrow-left');
                break;
            case 'bidirectional':
                this.iconPath = new vscode.ThemeIcon('arrow-both');
                break;
        }
    }
}

export class PinListProvider implements vscode.TreeDataProvider<PinItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<PinItem | undefined | null | void> = new vscode.EventEmitter<PinItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<PinItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private pins: Pin[] = [];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: PinItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PinItem): Thenable<PinItem[]> {
        if (!element) {
            // Return root level pins
            return Promise.resolve(this.pins.map(pin => 
                new PinItem(pin, vscode.TreeItemCollapsibleState.None)
            ));
        }
        return Promise.resolve([]);
    }

    updatePins(pins: Pin[]): void {
        this.pins = pins;
        this.refresh();
    }

    getPins(): Pin[] {
        return this.pins;
    }
}
