import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Global panel reference
let currentPanel: vscode.WebviewPanel | undefined;

/**
 * Custom Editor Provider for .fpgaproj files
 */
class FpgaProjectEditorProvider implements vscode.CustomTextEditorProvider {
    public static register(context: vscode.ExtensionContext): vscode.Disposable {
        const provider = new FpgaProjectEditorProvider(context);
        const providerRegistration = vscode.window.registerCustomEditorProvider(
            'fpgaPinPlanner.fpgaProjectEditor',
            provider
        );
        return providerRegistration;
    }

    constructor(
        private readonly context: vscode.ExtensionContext
    ) { }

    /**
     * Called when our custom editor is opened.
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup initial content for the webview
        webviewPanel.webview.options = {
            enableScripts: true
        };
        webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

        // Update the global panel reference
        currentPanel = webviewPanel;

        function updateWebview() {
            const content = document.getText();
            const filePath = document.uri.fsPath;
            
            webviewPanel.webview.postMessage({
                type: 'update',
                text: content,
                filePath: filePath
            });
        }

        // Hook up event handlers so that we can synchronize the webview with the text document.
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
            if (e.document.uri.toString() === document.uri.toString()) {
                updateWebview();
            }
        });

        // Make sure we get rid of the listener when our editor is closed.
        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
            if (currentPanel === webviewPanel) {
                currentPanel = undefined;
            }
        });

        // Receive message from the webview.
        webviewPanel.webview.onDidReceiveMessage(async message => {
            switch (message.command) {
                case 'webviewReady':
                    // Webview is ready, send initial content
                    updateWebview();
                    return;
                case 'alert':
                    vscode.window.showInformationMessage(message.text);
                    return;
                case 'showOpenDialog':
                    try {
                        const result = await vscode.window.showOpenDialog(message.options);
                        webviewPanel.webview.postMessage({
                            command: 'openDialogResult',
                            result: result
                        });
                        
                        // If a file was selected, automatically read and load its content
                        if (result && result.length > 0) {
                            const selectedFile = result[0];
                            
                            try {
                                const fileContent = await vscode.workspace.fs.readFile(selectedFile);
                                const textContent = Buffer.from(fileContent).toString('utf8');
                                
                                // Send file content to webview for loading
                                webviewPanel.webview.postMessage({
                                    command: 'loadFileContent',
                                    filePath: selectedFile.fsPath,
                                    content: textContent
                                });
                            } catch (readError) {
                                console.error('❌ Custom Editor failed to read file:', readError);
                                webviewPanel.webview.postMessage({
                                    command: 'loadFileContent',
                                    filePath: selectedFile.fsPath,
                                    error: `Failed to read file: ${readError}`
                                });
                            }
                        }
                    } catch (error) {
                        console.error('Open dialog error:', error);
                        webviewPanel.webview.postMessage({
                            command: 'openDialogResult',
                            result: undefined,
                            error: error
                        });
                    }
                    return;
                case 'showSaveDialog':
                    try {
                        const options = message.options || {};
                        const result = await vscode.window.showSaveDialog(options);
                        
                        let serializedResult = null;
                        if (result) {
                            serializedResult = result.fsPath;
                        }
                        
                        webviewPanel.webview.postMessage({
                            command: 'saveDialogResult',
                            result: serializedResult
                        });
                    } catch (error) {
                        console.error('Save dialog error:', error);
                        webviewPanel.webview.postMessage({
                            command: 'saveDialogResult',
                            result: undefined,
                            error: error
                        });
                    }
                    return;
                case 'saveFile':
                    try {
                        const success = await handleFileSave(message.filePath, message.content, message.filename);
                        webviewPanel.webview.postMessage({
                            command: 'saveFileResult',
                            success: success
                        });
                    } catch (error) {
                        console.error('File save error:', error);
                        webviewPanel.webview.postMessage({
                            command: 'saveFileResult',
                            success: false,
                            error: error
                        });
                    }
                    return;
            }
        });

        // Send initial content when webview is ready
    }

    /**
     * Get the static html used for the editor webviews.
     */
    private getHtmlForWebview(webview: vscode.Webview): string {
        return getWebviewContent(webview, this.context.extensionUri);
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
        } catch (parseError) {
            console.error('❌ Path parsing error:', parseError);
            throw new Error(`Failed to parse file path: ${filePath}`);
        }
        
        // Write file using VS Code workspace API
        const contentBuffer = Buffer.from(content, 'utf8');
        await vscode.workspace.fs.writeFile(fileUri, contentBuffer);
        
        // Show success message
        vscode.window.showInformationMessage(`✅ File saved: ${path.basename(fileUri.fsPath)}`);
        
        return true;
    } catch (error) {
        console.error('❌ File save failed:', error);
        vscode.window.showErrorMessage(`❌ Failed to save file: ${error}`);
        return false;
    }
}

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    // Webview-distフォルダのURI
    const webviewDistUri = vscode.Uri.joinPath(extensionUri, 'webview-dist');
    
    // Assetsフォルダのパス確認
    const assetsUri = vscode.Uri.joinPath(webviewDistUri, 'assets');
    
    // AssetsフォルダのfsPathをチェック
    const assetsPath = assetsUri.fsPath;
    
    try {
        // Assetsフォルダ内のファイル一覧を取得
        const files = fs.readdirSync(assetsPath);
        
        // CSSファイルとJSファイルを検索
        const cssFile = files.find(file => file.endsWith('.css'));
        const jsFile = files.find(file => file.endsWith('.js'));
        
        if (!cssFile || !jsFile) {
            throw new Error(`Missing assets: CSS=${cssFile}, JS=${jsFile}`);
        }
        
        // WebviewリソースURIを生成
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, cssFile));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, jsFile));
        
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FPGA Pin Planner</title>
    <link rel="stylesheet" href="${cssUri}">
</head>
<body>
    <div id="root"></div>
    <script src="${jsUri}"></script>
</body>
</html>`;
    } catch (error) {
        console.error('❌ Error building webview content:', error);
        return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FPGA Pin Planner - Error</title>
</head>
<body>
    <h1>Error Loading FPGA Pin Planner</h1>
    <p>Could not load the application assets.</p>
    <p>Error: ${error}</p>
</body>
</html>`;
    }
}

export function activate(context: vscode.ExtensionContext) {
    console.log('FPGA Pin Planner extension is now active!');

    // Main command to open the pin planner
    const openPlannerCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.openPlanner',
        () => {
            // If panel already exists, focus it instead of creating a new one
            if (currentPanel) {
                try {
                    currentPanel.reveal(vscode.ViewColumn.One);
                    console.log('📋 Revealed existing panel');
                    return;
                } catch (error) {
                    console.log('🗑️ Existing panel is disposed, creating new one');
                    currentPanel = undefined;
                }
            }

            // Create and show a new webview
            currentPanel = vscode.window.createWebviewPanel(
                'fpgaPinPlanner', // Identifies the type of the webview. Used internally
                'FPGA Pin Planner', // Title of the panel displayed to the user
                vscode.ViewColumn.One, // Editor column to show the new webview panel in.
                {
                    enableScripts: true, // Enable javascript in the webview
                    retainContextWhenHidden: true // Keep context when hidden
                }
            );

            // Set the webview's html content
            currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);

            // Clean up when the panel is disposed
            currentPanel.onDidDispose(() => {
                console.log('🗑️ Panel disposed');
                currentPanel = undefined;
            }, null, context.subscriptions);

            // Handle messages from the webview using currentPanel
            currentPanel.webview.onDidReceiveMessage(
                async message => {
                    console.log('📨 Extension received message:', message.command, message);
                    
                    if (!currentPanel) {
                        console.error('❌ currentPanel is undefined, cannot handle message');
                        return;
                    }

                    switch (message.command) {
                        case 'alert':
                            vscode.window.showInformationMessage(message.text);
                            return;
                        case 'showOpenDialog':
                            try {
                                const result = await vscode.window.showOpenDialog(message.options);
                                if (currentPanel) {
                                    currentPanel.webview.postMessage({
                                        command: 'openDialogResult',
                                        result: result
                                    });
                                    
                                    // If a file was selected, automatically read and load its content
                                    if (result && result.length > 0) {
                                        const selectedFile = result[0];
                                        console.log('📂 Reading selected file:', selectedFile.fsPath);
                                        
                                        try {
                                            const fileContent = await vscode.workspace.fs.readFile(selectedFile);
                                            const textContent = Buffer.from(fileContent).toString('utf8');
                                            
                                            // Send file content to webview for loading
                                            currentPanel.webview.postMessage({
                                                command: 'loadFileContent',
                                                filePath: selectedFile.fsPath,
                                                content: textContent
                                            });
                                            
                                            console.log('✅ File content sent to webview');
                                        } catch (readError) {
                                            console.error('❌ Failed to read file:', readError);
                                            currentPanel.webview.postMessage({
                                                command: 'loadFileContent',
                                                filePath: selectedFile.fsPath,
                                                error: `Failed to read file: ${readError}`
                                            });
                                        }
                                    }
                                }
                            } catch (error) {
                                console.error('Open dialog error:', error);
                                if (currentPanel) {
                                    currentPanel.webview.postMessage({
                                        command: 'openDialogResult',
                                        result: undefined,
                                        error: error
                                    });
                                }
                            }
                            return;
                        case 'showSaveDialog':
                            try {
                                console.log('💾 Save dialog request:', message.options);
                                
                                const options = { ...message.options };
                                if (options.defaultUri) {
                                    delete options.defaultUri;
                                }
                                
                                const result = await vscode.window.showSaveDialog(options);
                                console.log('💾 Save dialog result:', result);
                                
                                // URIを安全にシリアライズ - fsPathのみを送信
                                let serializedResult = null;
                                if (result) {
                                    serializedResult = result.fsPath;
                                    console.log('💾 Serialized fsPath:', serializedResult);
                                }
                                
                                // Safe message posting with error handling
                                try {
                                    if (currentPanel) {
                                        currentPanel.webview.postMessage({
                                            command: 'saveDialogResult', 
                                            result: serializedResult
                                        });
                                    }
                                } catch (postError) {
                                    console.error('❌ Failed to post save dialog result:', postError);
                                }
                            } catch (error) {
                                console.error('Save dialog error:', error);
                                try {
                                    if (currentPanel) {
                                        currentPanel.webview.postMessage({
                                            command: 'saveDialogResult',
                                            result: undefined,
                                            error: error
                                        });
                                    }
                                } catch (postError) {
                                    console.error('❌ Failed to post error message:', postError);
                                }
                            }
                            return;
                        case 'saveFile':
                            try {
                                if (!message.filePath || !message.content) {
                                    throw new Error('Missing filePath or content for save operation');
                                }
                                
                                const success = await handleFileSave(message.filePath, message.content, message.filename);
                                
                                // Safe message posting
                                try {
                                    if (currentPanel) {
                                        currentPanel.webview.postMessage({
                                            command: 'saveFileResult',
                                            success: success
                                        });
                                    }
                                } catch (postError) {
                                    console.error('❌ Failed to post save file result:', postError);
                                }
                            } catch (error) {
                                console.error('File save error:', error);
                                try {
                                    if (currentPanel) {
                                        currentPanel.webview.postMessage({
                                            command: 'saveFileResult',
                                            success: false,
                                            error: error
                                        });
                                    }
                                } catch (postError) {
                                    console.error('❌ Failed to post save file error:', postError);
                                }
                            }
                            return;
                    }
                },
                undefined,
                context.subscriptions
            );
        }
    );

    // Load Sample Data command
    const loadSampleDataCommand = vscode.commands.registerCommand(
        'fpgaPinPlanner.loadSampleData',
        () => {
            // If panel is not open, create it first
            if (!currentPanel) {
                console.log('🚀 Creating new panel for sample data loading');
                currentPanel = vscode.window.createWebviewPanel(
                    'fpgaPinPlanner',
                    'FPGA Pin Planner',
                    vscode.ViewColumn.One,
                    {
                        enableScripts: true,
                        retainContextWhenHidden: true
                    }
                );

                // Set the webview's html content
                currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);

                // Handle messages from the webview
                currentPanel.webview.onDidReceiveMessage(
                    async message => {
                        switch (message.command) {
                            case 'alert':
                                vscode.window.showInformationMessage(message.text);
                                return;
                            case 'webviewReady':
                                console.log('✅ Webview is ready, sending loadSampleData command');
                                currentPanel?.webview.postMessage({
                                    command: 'loadSampleData'
                                });
                                return;
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
                                    console.log('💾 Sample command save dialog request:', message.options);
                                    const options = { ...message.options };
                                    if (options.defaultUri) {
                                        delete options.defaultUri;
                                    }
                                    
                                    const result = await vscode.window.showSaveDialog(options);
                                    console.log('💾 Sample command save dialog result:', result);
                                    
                                    // URIを安全にシリアライズ - fsPathのみを送信
                                    let serializedResult = null;
                                    if (result) {
                                        serializedResult = result.fsPath;
                                        console.log('💾 Sample command serialized fsPath:', serializedResult);
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
                        }
                    },
                    undefined,
                    context.subscriptions
                );

                // Clean up when the panel is disposed
                currentPanel.onDidDispose(
                    () => {
                        currentPanel = undefined;
                    },
                    null,
                    context.subscriptions
                );
            }

            vscode.window.showInformationMessage('Loading sample FPGA package data...');
        }
    );

    context.subscriptions.push(
        openPlannerCommand,
        loadSampleDataCommand,
        FpgaProjectEditorProvider.register(context)
    );
}

export function deactivate() {}
