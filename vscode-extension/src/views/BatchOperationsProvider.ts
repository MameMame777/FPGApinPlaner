import * as vscode from 'vscode';

export interface BatchOperation {
    name: string;
    description: string;
    type: 'voltage' | 'ioStandard' | 'direction' | 'bulk';
}

export class BatchOperationItem extends vscode.TreeItem {
    constructor(
        public readonly operation: BatchOperation,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(operation.name, collapsibleState);
        
        this.tooltip = operation.description;
        this.description = operation.type;
        this.contextValue = 'batchOperation';
        this.iconPath = new vscode.ThemeIcon('edit');
    }
}

export class BatchOperationsProvider implements vscode.TreeDataProvider<BatchOperationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<BatchOperationItem | undefined | null | void> = new vscode.EventEmitter<BatchOperationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<BatchOperationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private operations: BatchOperation[] = [
        {
            name: 'Set Voltage',
            description: 'Set voltage for selected pins',
            type: 'voltage'
        },
        {
            name: 'Set I/O Standard',
            description: 'Set I/O standard for selected pins',
            type: 'ioStandard'
        },
        {
            name: 'Set Direction',
            description: 'Set direction for selected pins',
            type: 'direction'
        },
        {
            name: 'Bulk Import',
            description: 'Import multiple pin assignments',
            type: 'bulk'
        }
    ];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: BatchOperationItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: BatchOperationItem): Promise<BatchOperationItem[]> {
        if (!element) {
            // Return root level operations
            return Promise.resolve(this.operations.map(operation => 
                new BatchOperationItem(operation, vscode.TreeItemCollapsibleState.None)
            ));
        }
        return Promise.resolve([]);
    }
}
