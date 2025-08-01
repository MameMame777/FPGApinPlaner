import * as vscode from 'vscode';

export interface ValidationIssue {
    message: string;
    severity: 'error' | 'warning' | 'info';
    pin?: string;
    line?: number;
}

export class ValidationItem extends vscode.TreeItem {
    constructor(
        public readonly issue: ValidationIssue,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(issue.message, collapsibleState);
        
        this.tooltip = issue.message;
        this.description = issue.pin || '';
        this.contextValue = 'validation';
        
        // Set icon based on severity
        switch (issue.severity) {
            case 'error':
                this.iconPath = new vscode.ThemeIcon('error', new vscode.ThemeColor('errorForeground'));
                break;
            case 'warning':
                this.iconPath = new vscode.ThemeIcon('warning', new vscode.ThemeColor('warningForeground'));
                break;
            case 'info':
                this.iconPath = new vscode.ThemeIcon('info', new vscode.ThemeColor('infoForeground'));
                break;
        }
    }
}

export class ValidationProvider implements vscode.TreeDataProvider<ValidationItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<ValidationItem | undefined | null | void> = new vscode.EventEmitter<ValidationItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<ValidationItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private issues: ValidationIssue[] = [];

    constructor() {}

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: ValidationItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: ValidationItem): Promise<ValidationItem[]> {
        if (!element) {
            // Return root level issues
            return Promise.resolve(this.issues.map(issue => 
                new ValidationItem(issue, vscode.TreeItemCollapsibleState.None)
            ));
        }
        return Promise.resolve([]);
    }

    updateValidation(issues: ValidationIssue[]): void {
        this.issues = issues;
        this.refresh();
    }

    getIssues(): ValidationIssue[] {
        return this.issues;
    }
}
