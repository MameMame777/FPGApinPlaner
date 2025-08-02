import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Global panel reference
let currentPanel: vscode.WebviewPanel | undefined;

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
async function handleFileSave(filePath: string, content: string, filename: string): Promise<boolean> {
    try {
        if (!filePath || filePath === '[object Object]' || filePath === 'undefined') {
            throw new Error('Invalid file path received');
        }
        
        // Convert to VS Code URI
        let fileUri: vscode.Uri;
        
        try {
            let normalizedPath = filePath.toString();
            
            // URI scheme prefix を除去 (file:// など)
            if (normalizedPath.startsWith('file://')) {
                normalizedPath = normalizedPath.substring(7);
            }
            
            // Handle case where filePath starts with /Drive:/ pattern
            if (normalizedPath.startsWith('/') && normalizedPath.match(/^\/[A-Z]:\//)) {
                normalizedPath = normalizedPath.substring(1);
            }
            
            // Convert forward slashes to backslashes for Windows
            normalizedPath = normalizedPath.replace(/\//g, '\\');
            
            // Windows用パスの正規化 - 大文字小文字を問わない
            if (process.platform === 'win32' && !normalizedPath.match(/^[A-Za-z]:\\/)) {
                throw new Error(`Invalid Windows path format: ${normalizedPath}`);
            }
            
            fileUri = vscode.Uri.file(normalizedPath);
            console.log('📂 Final file path:', fileUri.fsPath);
        } catch (parseError) {
            console.error('❌ Path parsing error:', parseError);
            throw new Error(`Failed to parse file path: ${filePath}`);
        }

        console.log('💾 Saving file to:', fileUri.fsPath);
        
        // Write file using VS Code workspace API
        const contentBuffer = Buffer.from(content, 'utf8');
        await vscode.workspace.fs.writeFile(fileUri, contentBuffer);
        
        // Show success message
        vscode.window.showInformationMessage(`✅ File saved: ${path.basename(fileUri.fsPath)}`);
        
        console.log('✅ File saved successfully:', fileUri.fsPath);
        return true;
    } catch (error) {
        console.error('❌ File save failed:', error);
        vscode.window.showErrorMessage(`❌ Failed to save file: ${error}`);
        return false;
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
            console.log('🚀 openGUI command triggered');
            
            // Close existing panel if any
            if (currentPanel) {
                currentPanel.dispose();
            }
            
            currentPanel = vscode.window.createWebviewPanel(
                'fpgaPinPlanner',
                'FPGA Pin Planner',
                vscode.ViewColumn.One,
                {
                    enableScripts: true,
                    retainContextWhenHidden: true
                }
            );

            console.log('📱 Webview panel created');
            
            try {
                currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);
                console.log('✅ Webview HTML content set successfully');
            } catch (error) {
                console.error('❌ Error setting webview content:', error);
                vscode.window.showErrorMessage(`Failed to load FPGA Pin Planner: ${error}`);
                return;
            }

            // Handle panel disposal
            currentPanel.onDidDispose(
                () => {
                    currentPanel = undefined;
                },
                null,
                context.subscriptions
            );

            currentPanel.webview.onDidReceiveMessage(
                async message => {
                    switch (message.command) {
                        case 'showOpenDialog':
                            try {
                                const result = await vscode.window.showOpenDialog(message.options);
                                currentPanel?.webview.postMessage({
                                    command: 'openDialogResult',
                                    result: result
                                });
                            } catch (error) {
                                console.error('Open dialog error:', error);
                                currentPanel?.webview.postMessage({
                                    command: 'openDialogResult',
                                    result: undefined,
                                    error: error
                                });
                            }
                            return;
                        case 'showSaveDialog':
                            try {
                                const options = { ...message.options };
                                if (options.defaultUri) {
                                    delete options.defaultUri;
                                }
                                
                                const result = await vscode.window.showSaveDialog(options);
                                
                                // URIを安全にシリアライズ - fsPathのみを送信
                                let serializedResult = null;
                                if (result && result.fsPath) {
                                    serializedResult = {
                                        fsPath: result.fsPath
                                    };
                                }
                                
                                currentPanel?.webview.postMessage({
                                    command: 'saveDialogResult', 
                                    result: serializedResult
                                });
                            } catch (error) {
                                console.error('Save dialog error:', error);
                                currentPanel?.webview.postMessage({
                                    command: 'saveDialogResult',
                                    result: undefined,
                                    error: error
                                });
                            }
                            return;
                        case 'saveFile':
                            try {
                                const success = await handleFileSave(message.filePath, message.content, message.filename);
                                currentPanel?.webview.postMessage({
                                    command: 'saveFileResult',
                                    success: success
                                });
                            } catch (error) {
                                console.error('File save error:', error);
                                currentPanel?.webview.postMessage({
                                    command: 'saveFileResult',
                                    success: false,
                                    error: error
                                });
                            }
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
                try {
                    // Read the project file
                    const fileContent = await vscode.workspace.fs.readFile(uri[0]);
                    const projectData = JSON.parse(Buffer.from(fileContent).toString('utf8'));
                    
                    // Open FPGA GUI if not already open
                    await vscode.commands.executeCommand('fpgaPinPlanner.openGUI');
                    
                    // Wait for the panel to be ready and send project data
                    setTimeout(() => {
                        if (currentPanel) {
                            currentPanel.webview.postMessage({
                                command: 'loadProject',
                                projectData: projectData
                            });
                            vscode.window.showInformationMessage(`Project loaded: ${uri[0].fsPath}`);
                        }
                    }, 1000);
                } catch (error) {
                    console.error('Failed to load project:', error);
                    vscode.window.showErrorMessage(`Failed to load project: ${error}`);
                }
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
    console.log('🔧 Building webview content...');
    
    const webviewDistUri = vscode.Uri.joinPath(extensionUri, 'webview-dist');
    const assetsUri = vscode.Uri.joinPath(webviewDistUri, 'assets');
    
    console.log('📁 Extension URI:', extensionUri.toString());
    console.log('📁 Webview-dist URI:', webviewDistUri.toString());
    console.log('📁 Assets URI:', assetsUri.toString());
    
    // Dynamically find the CSS and JS files
    let cssFileName = 'index-ed718810.css'; // fallback
    let jsFileName = 'main-ce665afa.js'; // fallback
    
    try {
        const assetsPath = assetsUri.fsPath;
        console.log('📁 Assets path:', assetsPath);
        const files = fs.readdirSync(assetsPath);
        console.log('📄 Available files:', files);
        
        const cssFile = files.find(f => f.startsWith('index-') && f.endsWith('.css'));
        const jsFile = files.find(f => f.startsWith('main-') && f.endsWith('.js'));
        
        if (cssFile) {
            cssFileName = cssFile;
            console.log('✅ Found CSS file:', cssFileName);
        }
        if (jsFile) {
            jsFileName = jsFile;
            console.log('✅ Found JS file:', jsFileName);
        }
    } catch (error) {
        console.warn('⚠️ Could not read assets directory, using fallback file names:', error);
    }
    
    const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, cssFileName));
    const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, jsFileName));
    
    console.log('🎨 CSS URI:', cssUri.toString());
    console.log('⚡ JS URI:', jsUri.toString());
    
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
                        if (event.data.command === 'openDialogResult') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
                        }
                    };
                    window.addEventListener('message', handler);
                });
            },
            
            showSaveDialog: async (options) => {
                return new Promise((resolve) => {
                    vscode.postMessage({
                        command: 'showSaveDialog', 
                        options: {
                            ...options,
                            defaultUri: options.defaultUri || undefined
                        }
                    });
                    
                    const handler = (event) => {
                        if (event.data.command === 'saveDialogResult') {
                            window.removeEventListener('message', handler);
                            resolve(event.data.result);
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
