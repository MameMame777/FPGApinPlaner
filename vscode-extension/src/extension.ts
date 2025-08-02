import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// File Manager Tree Data Provider
class FileManagerProvider implements vscode.TreeDataProvider<FileManagerItem> {
    constructor(private context: vscode.ExtensionContext) {}

    getTreeItem(element: FileManagerItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileManagerItem): Thenable<FileManagerItem[]> {
        if (!element) {
            // Root items
            return Promise.resolve([
                new FileManagerItem('📁 Load CSV File', 'loadCSV', vscode.TreeItemCollapsibleState.None, {
                    command: 'fpgaPinPlanner.importCSVWithDialog',
                    title: 'Load CSV File',
                }),
                new FileManagerItem('📂 Load Project File', 'loadProject', vscode.TreeItemCollapsibleState.None, {
                    command: 'fpgaPinPlanner.loadProjectWithDialog',
                    title: 'Load Project File',
                })
            ]);
        }
        return Promise.resolve([]);
    }
}

class FileManagerItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly id: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.id = id;
        this.tooltip = this.label;
        if (command) {
            this.command = command;
        }
    }
}

// Helper function to handle file save requests from webview
async function handleFileSave(filePath: string, content: string, filename: string): Promise<void> {
    try {
        console.log('💾 Handling file save:', filename);
        console.log('❌ Original filePath:', filePath);
        
        // Convert URI-style path to Windows path
        let normalizedPath = filePath;
        
        // Handle case where filePath starts with /Drive:/ pattern
        if (normalizedPath.startsWith('/') && normalizedPath.match(/^\/[A-Z]:\//)) {
            // Remove leading slash: /E:/... -> E:/...
            normalizedPath = normalizedPath.substring(1);
        }
        
        // Convert forward slashes to backslashes for Windows
        normalizedPath = normalizedPath.replace(/\//g, '\\');
        
        console.log('📁 Normalized file path:', normalizedPath);
        
        // Ensure directory exists
        const dir = path.dirname(normalizedPath);
        console.log('📁 Target directory:', dir);
        console.log('📁 Creating directory:', dir);
        
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        // Write file
        await fs.promises.writeFile(normalizedPath, content, 'utf8');
        
        // Show success message
        vscode.window.showInformationMessage(`✅ File saved: ${path.basename(normalizedPath)}`);
        
        console.log('✅ File saved successfully:', normalizedPath);
    } catch (error) {
        console.error('❌ File save failed:', error);
        vscode.window.showErrorMessage(`❌ Failed to save file: ${error}`);
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('FPGA Pin Planner extension is now active!');

    // Register file manager tree data provider
    const fileManagerProvider = new FileManagerProvider(context);
    vscode.window.registerTreeDataProvider('fpgaPinPlanner.fileManager', fileManagerProvider);

    // Simple command to open the pin planner
    const openPlannerCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.openPlanner',
        () => {
            // Create and show a new webview
            const panel = vscode.window.createWebviewPanel(
                'fpgaPinPlanner', // Identifies the type of the webview. Used internally
                'FPGA Pin Planner', // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    enableScripts: true // Enable javascript in the webview
                }
            );

            // Set the webview's html content
            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

            // Handle messages from the webview
            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'alert':
                            vscode.window.showInformationMessage(message.text);
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    );

    // New GUI command
    const openGUICommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.openGUI',
        () => {
            const panel = vscode.window.createWebviewPanel(
                'fpgaPinPlanner',
                'FPGA Pin Planner',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            panel.webview.html = getWebviewContent(panel.webview, context.extensionUri);

            panel.webview.onDidReceiveMessage(
                message => {
                    switch (message.command) {
                        case 'showOpenDialog':
                            vscode.window.showOpenDialog(message.options).then(result => {
                                panel.webview.postMessage({
                                    command: 'fileSelected',
                                    file: result
                                });
                            });
                            return;
                        case 'showSaveDialog':
                            vscode.window.showSaveDialog(message.options).then(result => {
                                panel.webview.postMessage({
                                    command: 'fileSelected', 
                                    file: result
                                });
                            });
                            return;
                        case 'saveFile':
                            // Handle file save request from webview
                            handleFileSave(message.filePath, message.content, message.filename);
                            return;
                        case 'appReady':
                            console.log('FPGA Pin Planner webview is ready');
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    );

    // CSV Import command
    const importCSVCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.importCSV',
        async () => {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'CSV Files': ['csv'],
                    'Text Files': ['txt']
                }
            });

            if (fileUri && fileUri[0]) {
                vscode.window.showInformationMessage('CSV import started');
                // TODO: Implement CSV import logic
            }
        }
    );

    // Import CSV with dialog
    const importCSVWithDialogCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.importCSVWithDialog',
        async () => {
            const fileUri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'CSV Files': ['csv'],
                    'Text Files': ['txt'],
                    'All Files': ['*']
                },
                openLabel: 'Import Pin Data'
            });

            if (fileUri && fileUri[0]) {
                vscode.window.showInformationMessage(`Importing CSV from: ${fileUri[0].fsPath}`);
                // TODO: Implement actual import logic
            }
        }
    );

    const exportXDCCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.exportXDC',
        async () => {
            const uri = await vscode.window.showSaveDialog({
                saveLabel: 'Export XDC',
                filters: {
                    'XDC Files': ['xdc']
                },
                defaultUri: vscode.Uri.file('constraints.xdc')
            });

            if (uri) {
                vscode.window.showInformationMessage('XDC export started');
                // TODO: Implement XDC export logic
            }
        }
    );

    // Export XDC with dialog
    const exportXDCWithDialogCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.exportXDCWithDialog',
        async () => {
            const uri = await vscode.window.showSaveDialog({
                saveLabel: 'Export XDC Constraints',
                filters: {
                    'XDC Files': ['xdc'],
                    'All Files': ['*']
                },
                defaultUri: vscode.Uri.file('constraints.xdc')
            });

            if (uri) {
                vscode.window.showInformationMessage(`XDC will be exported to: ${uri.fsPath}`);
                // TODO: Implement actual export logic
            }
        }
    );

    const exportSDCCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.exportSDC',
        async () => {
            const uri = await vscode.window.showSaveDialog({
                saveLabel: 'Export SDC',
                filters: {
                    'SDC Files': ['sdc']
                },
                defaultUri: vscode.Uri.file('constraints.sdc')
            });

            if (uri) {
                vscode.window.showInformationMessage('SDC export started');
                // TODO: Implement SDC export logic
            }
        }
    );

    const exportQSFCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.exportQSF',
        async () => {
            const uri = await vscode.window.showSaveDialog({
                saveLabel: 'Export QSF',
                filters: {
                    'QSF Files': ['qsf']
                },
                defaultUri: vscode.Uri.file('assignments.qsf')
            });

            if (uri) {
                vscode.window.showInformationMessage('QSF export started');
                // TODO: Implement QSF export logic
            }
        }
    );

    // Save project with dialog
    const saveProjectWithDialogCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.saveProjectWithDialog',
        async () => {
            const uri = await vscode.window.showSaveDialog({
                saveLabel: 'Save FPGA Project',
                filters: {
                    'FPGA Project': ['fpgaproj'],
                    'JSON Files': ['json'],
                    'All Files': ['*']
                },
                defaultUri: vscode.Uri.file('project.fpgaproj')
            });

            if (uri) {
                vscode.window.showInformationMessage(`Project will be saved to: ${uri.fsPath}`);
                // TODO: Implement actual save logic
            }
        }
    );

    // Load project with dialog
    const loadProjectWithDialogCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.loadProjectWithDialog',
        async () => {
            const uri = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                filters: {
                    'FPGA Project': ['fpgaproj'],
                    'JSON Files': ['json'],
                    'All Files': ['*']
                },
                openLabel: 'Load FPGA Project'
            });

            if (uri && uri[0]) {
                vscode.window.showInformationMessage(`Loading project from: ${uri[0].fsPath}`);
                // TODO: Implement actual load logic and send to webview
            }
        }
    );

    const validateConstraintsCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.validateConstraints',
        () => {
            vscode.window.showInformationMessage('Pin constraint validation started');
            // TODO: Implement validation logic
        }
    );

    // Register Tree Data Providers
    const pinListProvider = new PinListProvider();
    const validationProvider = new ValidationProvider();
    const batchOperationsProvider = new BatchOperationsProvider();

    vscode.window.registerTreeDataProvider('fpgaPinPlanner.pinList', pinListProvider);
    vscode.window.registerTreeDataProvider('fpgaPinPlanner.validation', validationProvider);
    vscode.window.registerTreeDataProvider('fpgaPinPlanner.batchOperations', batchOperationsProvider);

    context.subscriptions.push(
        openPlannerCommand,
        openGUICommand,
        importCSVCommand,
        importCSVWithDialogCommand,
        loadProjectWithDialogCommand,
        exportXDCCommand,
        exportXDCWithDialogCommand,
        exportSDCCommand,
        exportQSFCommand,
        saveProjectWithDialogCommand,
        validateConstraintsCommand
    );
}

// Tree Data Providers
class PinListProvider implements vscode.TreeDataProvider<PinItem> {
    getTreeItem(element: PinItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PinItem): Thenable<PinItem[]> {
        if (!element) {
            return Promise.resolve([
                new PinItem('Open FPGA GUI', 'fpgaPinPlanner.openGUI', 'circuit-board'),
                new PinItem('Import CSV Data', 'fpgaPinPlanner.importCSVWithDialog', 'folder-opened'),
                new PinItem('Refresh Pin List', 'fpgaPinPlanner.openPlanner', 'refresh')
            ]);
        }
        return Promise.resolve([]);
    }
}

class ValidationProvider implements vscode.TreeDataProvider<PinItem> {
    getTreeItem(element: PinItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PinItem): Thenable<PinItem[]> {
        if (!element) {
            return Promise.resolve([
                new PinItem('Run Validation', 'fpgaPinPlanner.validateConstraints', 'check'),
                new PinItem('View Results', 'fpgaPinPlanner.openGUI', 'list-unordered')
            ]);
        }
        return Promise.resolve([]);
    }
}

class BatchOperationsProvider implements vscode.TreeDataProvider<PinItem> {
    getTreeItem(element: PinItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: PinItem): Thenable<PinItem[]> {
        if (!element) {
            return Promise.resolve([
                new PinItem('Export XDC', 'fpgaPinPlanner.exportXDCWithDialog', 'export'),
                new PinItem('Save Project', 'fpgaPinPlanner.saveProjectWithDialog', 'save'),
                new PinItem('Quick Actions', 'fpgaPinPlanner.openGUI', 'zap')
            ]);
        }
        return Promise.resolve([]);
    }
}

class PinItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly commandId: string,
        public readonly iconName: string
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = {
            command: commandId,
            title: label
        };
        this.iconPath = new vscode.ThemeIcon(iconName);
    }
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    const webviewDistUri = vscode.Uri.joinPath(extensionUri, 'webview-dist');
    const indexHtmlUri = vscode.Uri.joinPath(webviewDistUri, 'index.html');
    const assetsUri = vscode.Uri.joinPath(webviewDistUri, 'assets');
    
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, 'index-ed718810.css'));
          const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'webview-dist', 'assets', 'main-f7fe07c6.js'));
    
    const nonce = getNonce();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}'; font-src ${webview.cspSource};">
    <title>FPGA Pin Planner</title>
    
    <style nonce="${nonce}">
        body {
            background-color: var(--vscode-editor-background) !important;
        }
        
        .text-white {
            color: var(--vscode-foreground) !important;
        }
        
        .bg-\\[\\#2a2a2a\\] {
            background-color: var(--vscode-titleBar-activeBackground) !important;
        }
        
        .bg-\\[\\#252525\\] {
            background-color: var(--vscode-sideBar-background) !important;
        }
        
        .bg-\\[\\#1a1a1a\\] {
            background-color: var(--vscode-input-background) !important;
        }
    </style>
    <link rel="stylesheet" href="${cssUri}">
</head>
<body>
    <div id="root"></div>
    
    <script nonce="${nonce}">
        // VS Code API integration
        const vscode = acquireVsCodeApi();
        
        // Make VS Code API available to the React app
        window.vscode = vscode;
        
        // Override file APIs for VS Code integration
        window.vsCodeFileAPI = {
            showOpenDialog: async (options) => {
                return new Promise((resolve) => {
                    vscode.postMessage({
                        command: 'showOpenDialog',
                        options: options
                    });
                    
                    const handler = (event) => {
                        if (event.data.command === 'fileSelected') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.file);
                        }
                    };
                    window.addEventListener('message', handler);
                });
            },
            
            showSaveDialog: async (options) => {
                return new Promise((resolve) => {
                    vscode.postMessage({
                        command: 'showSaveDialog', 
                        options: options
                    });
                    
                    const handler = (event) => {
                        if (event.data.command === 'fileSelected') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.file);
                        }
                    };
                    window.addEventListener('message', handler);
                });
            }
        };
        
        // Notify VS Code when app is ready
        window.addEventListener('load', () => {
            vscode.postMessage({
                command: 'appReady'
            });
        });
    </script>
    <script type="module" crossorigin src="${jsUri}" nonce="${nonce}"></script>
</body>
</html>`;
}

function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

export function deactivate() {}
