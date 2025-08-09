import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

// Global panel reference
let currentPanel: vscode.WebviewPanel | undefined;

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

function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
    console.log('🔧 Building webview content...');
    console.log('📁 Extension URI:', extensionUri.toString());
    
    // Webview-distフォルダのURI
    const webviewDistUri = vscode.Uri.joinPath(extensionUri, 'webview-dist');
    console.log('📁 Webview-dist URI:', webviewDistUri.toString());
    
    // Assetsフォルダのパス確認
    const assetsUri = vscode.Uri.joinPath(webviewDistUri, 'assets');
    console.log('📁 Assets URI:', assetsUri.toString());
    
    // AssetsフォルダのfsPathをチェック
    const assetsPath = assetsUri.fsPath;
    console.log('📁 Assets path:', assetsPath);
    
    try {
        // Assetsフォルダ内のファイル一覧を取得
        const files = fs.readdirSync(assetsPath);
        console.log('📄 Available files:', files);
        
        // CSSファイルとJSファイルを検索
        const cssFile = files.find(file => file.endsWith('.css'));
        const jsFile = files.find(file => file.endsWith('.js'));
        
        if (!cssFile || !jsFile) {
            throw new Error(`Missing assets: CSS=${cssFile}, JS=${jsFile}`);
        }
        
        console.log('✅ Found CSS file:', cssFile);
        console.log('✅ Found JS file:', jsFile);
        
        // WebviewリソースURIを生成
        const cssUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, cssFile));
        const jsUri = webview.asWebviewUri(vscode.Uri.joinPath(assetsUri, jsFile));
        
        console.log('🎨 CSS URI:', cssUri.toString());
        console.log('⚡ JS URI:', jsUri.toString());
        
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
        loadSampleDataCommand
    );
}

export function deactivate() {}
