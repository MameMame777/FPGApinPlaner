import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

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
                        case 'showOpenDialog':
                            vscode.window.showOpenDialog(message.options).then(result => {
                                panel.webview.postMessage({
                                    command: 'fileSelected',
                                    file: result
                                });
                            });
                            return;
                        case 'showSaveDialog':
                            console.log('💾 Opening save dialog...');
                            vscode.window.showSaveDialog(message.options).then(result => {
                                console.log('💾 Save dialog result:', result);
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
                            console.log('✅ FPGA Pin Planner webview is ready');
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
                vscode.window.showInformationMessage(`Selected file: ${fileUri[0].fsPath}`);
                // TODO: Implement CSV import logic
            }
        }
    );

    // Export commands
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

    const validateConstraintsCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.validateConstraints',
        () => {
            vscode.window.showInformationMessage('Constraint validation started');
            // TODO: Implement validation logic
        }
    );

    // Register all commands
    context.subscriptions.push(
        openPlannerCommand,
        importCSVCommand,
        exportXDCCommand,
        exportSDCCommand,
        exportQSFCommand,
        validateConstraintsCommand
    );

    // Set context when extension is active
    vscode.commands.executeCommand('setContext', 'fpgaPinPlanner.active', true);
}

export function deactivate() {
    console.log('FPGA Pin Planner extension is deactivated');
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri) {
    // Get path to the built webview files
    const webviewDistPath = vscode.Uri.joinPath(extensionUri, 'webview-dist');
    const indexPath = vscode.Uri.joinPath(webviewDistPath, 'index.html');
    
    try {
        // Read the HTML file
        const htmlContent = fs.readFileSync(indexPath.fsPath, 'utf8');
        
        // Replace relative paths with webview URIs
        const assetsPath = webview.asWebviewUri(vscode.Uri.joinPath(webviewDistPath, 'assets'));
        
        return htmlContent
            .replace(/assets\//g, `${assetsPath}/`)
            .replace(/<script>/, `<script>
                // Setup VS Code API
                const vscode = acquireVsCodeApi();
                
                // Expose VS Code APIs to the application
                window.vscode = vscode;
                window.vsCodeFileAPI = {
                    showOpenDialog: (options) => {
                        return new Promise((resolve) => {
                            const messageHandler = (event) => {
                                if (event.data.command === 'fileSelected') {
                                    window.removeEventListener('message', messageHandler);
                                    resolve(event.data.file);
                                }
                            };
                            window.addEventListener('message', messageHandler);
                            vscode.postMessage({
                                command: 'showOpenDialog',
                                options: options
                            });
                        });
                    },
                    showSaveDialog: (options) => {
                        return new Promise((resolve) => {
                            const timeout = setTimeout(() => {
                                console.log('⏱️ Save dialog timeout');
                                resolve(null);
                            }, 30000);
                            
                            const messageHandler = (event) => {
                                if (event.data.command === 'fileSelected') {
                                    clearTimeout(timeout);
                                    window.removeEventListener('message', messageHandler);
                                    resolve(event.data.file);
                                }
                            };
                            window.addEventListener('message', messageHandler);
                            vscode.postMessage({
                                command: 'showSaveDialog',
                                options: options
                            });
                        });
                    }
                };
            <\/script><script>`);
    } catch (error) {
        console.error('Failed to load webview content:', error);
        return getBasicWebviewContent();
    }
}

function getBasicWebviewContent() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FPGA Pin Planner</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
        }
        .button {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            margin: 5px;
            cursor: pointer;
            border-radius: 2px;
        }
        .button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>FPGA Pin Planner</h1>
        <p>Welcome to the FPGA Pin Planner VS Code Extension!</p>
        
        <h2>Quick Actions</h2>
        <button class="button" onclick="importCSV()">Import CSV</button>
        <button class="button" onclick="exportXDC()">Export XDC</button>
        <button class="button" onclick="exportSDC()">Export SDC</button>
        <button class="button" onclick="exportQSF()">Export QSF</button>
        <button class="button" onclick="validate()">Validate</button>
        
        <h2>Features</h2>
        <ul>
            <li>📥 Import pin data from CSV files</li>
            <li>📤 Export constraints in XDC, SDC, and QSF formats</li>
            <li>⚡ Voltage and I/O standard management</li>
            <li>🔍 Pin assignment validation</li>
            <li>📊 Interactive pin visualization</li>
        </ul>
        
        <p>Use the command palette (Ctrl+Shift+P) and search for "FPGA" to access all commands.</p>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        
        function importCSV() {
            vscode.postMessage({
                command: 'alert',
                text: 'CSV import feature coming soon!'
            });
        }
        
        function exportXDC() {
            vscode.postMessage({
                command: 'alert',
                text: 'XDC export feature coming soon!'
            });
        }
        
        function exportSDC() {
            vscode.postMessage({
                command: 'alert',
                text: 'SDC export feature coming soon!'
            });
        }
        
        function exportQSF() {
            vscode.postMessage({
                command: 'alert',
                text: 'QSF export feature coming soon!'
            });
        }
        
        function validate() {
            vscode.postMessage({
                command: 'alert',
                text: 'Validation feature coming soon!'
            });
        }
    </script>
</body>
</html>`;
}
