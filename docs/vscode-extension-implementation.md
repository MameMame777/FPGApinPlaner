# FPGA Pin Planner - VSCode拡張機能実装ガイド

## 🎯 **概要**

現在のWebアプリケーションをVSCode拡張機能として実装するための包括的なガイドです。既存のReact + TypeScript + Konva.jsコードベースを最大限活用しながら、VSCode環境に統合します。

## 📋 **実装計画**

### **Phase 1: 基本構造の実装 (Week 1-2)**

- VSCode拡張機能のプロジェクト構造作成
- Webview パネルの基本実装
- 現在のReactアプリの統合

### **Phase 2: VSCode API統合 (Week 3-4)**

- ファイルシステムアクセス
- 設定管理の統合
- コマンドとキーボードショートカット

### **Phase 3: 高度な統合 (Week 5-6)**

- プロジェクトファイル連携
- Git統合
- 他の拡張機能との連携

## 🏗️ **プロジェクト構造**

```
fpga-pin-planner-vscode/
├── package.json              # 拡張機能のメタデータ
├── tsconfig.json             # TypeScript設定
├── webpack.config.js         # バンドル設定
├── src/
│   ├── extension.ts          # メインエントリーポイント
│   ├── panels/
│   │   └── FPGAPinPlannerPanel.ts
│   ├── commands/
│   │   ├── openPinPlanner.ts
│   │   ├── exportXDC.ts
│   │   └── saveProject.ts
│   ├── services/
│   │   ├── FileService.ts
│   │   ├── ProjectService.ts
│   │   └── SettingsService.ts
│   └── webview/
│       ├── index.html
│       └── dist/             # React アプリのビルド結果
├── media/
│   ├── icons/
│   └── screenshots/
├── syntaxes/                 # XDC シンタックスハイライト
│   └── xdc.tmLanguage.json
└── README.md
```

## 📝 **package.json 設定**

```json
{
  "name": "fpga-pin-planner",
  "displayName": "FPGA Pin Planner",
  "description": "Interactive FPGA pin planning and constraint generation tool",
  "version": "1.0.0",
  "publisher": "your-publisher-name",
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": [
    "Other",
    "Snippets",
    "Language Packs"
  ],
  "keywords": [
    "fpga",
    "xilinx",
    "vivado",
    "pin planning",
    "xdc",
    "constraints"
  ],
  "activationEvents": [
    "onCommand:fpgaPinPlanner.open",
    "onLanguage:xdc",
    "workspaceContains:**/*.csv"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "fpgaPinPlanner.open",
        "title": "Open FPGA Pin Planner",
        "category": "FPGA",
        "icon": "$(circuit-board)"
      },
      {
        "command": "fpgaPinPlanner.importCSV",
        "title": "Import Pin CSV",
        "category": "FPGA"
      },
      {
        "command": "fpgaPinPlanner.exportXDC",
        "title": "Export XDC Constraints",
        "category": "FPGA"
      },
      {
        "command": "fpgaPinPlanner.saveProject",
        "title": "Save Pin Planning Project",
        "category": "FPGA"
      }
    ],
    "keybindings": [
      {
        "command": "fpgaPinPlanner.open",
        "key": "ctrl+shift+p",
        "mac": "cmd+shift+p",
        "when": "!terminalFocus"
      },
      {
        "command": "fpgaPinPlanner.exportXDC",
        "key": "ctrl+shift+e",
        "mac": "cmd+shift+e",
        "when": "fpgaPinPlannerActive"
      }
    ],
    "menus": {
      "explorer/context": [
        {
          "when": "resourceExtname == .csv",
          "command": "fpgaPinPlanner.importCSV",
          "group": "fpga"
        }
      ],
      "editor/title": [
        {
          "when": "resourceExtname == .xdc",
          "command": "fpgaPinPlanner.open",
          "group": "navigation"
        }
      ]
    },
    "configuration": {
      "type": "object",
      "title": "FPGA Pin Planner",
      "properties": {
        "fpgaPinPlanner.defaultZoom": {
          "type": "number",
          "default": 1.0,
          "description": "Default zoom level for pin planner"
        },
        "fpgaPinPlanner.showGrid": {
          "type": "boolean",
          "default": true,
          "description": "Show grid lines in pin planner"
        },
        "fpgaPinPlanner.autoSave": {
          "type": "boolean",
          "default": true,
          "description": "Automatically save changes"
        },
        "fpgaPinPlanner.exportPath": {
          "type": "string",
          "default": "./constraints",
          "description": "Default path for exported files"
        }
      }
    },
    "languages": [
      {
        "id": "xdc",
        "aliases": ["Xilinx Design Constraints", "xdc"],
        "extensions": [".xdc"],
        "configuration": "./language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "xdc",
        "scopeName": "source.xdc",
        "path": "./syntaxes/xdc.tmLanguage.json"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run compile",
    "compile": "webpack --mode production",
    "watch": "webpack --mode development --watch",
    "pretest": "npm run compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/vscode": "^1.74.0",
    "@types/node": "16.x",
    "@typescript-eslint/eslint-plugin": "^5.45.0",
    "@typescript-eslint/parser": "^5.45.0",
    "eslint": "^8.28.0",
    "typescript": "^4.9.4",
    "webpack": "^5.75.0",
    "webpack-cli": "^5.0.1",
    "ts-loader": "^9.4.1"
  },
  "dependencies": {
    "vscode": "^1.1.37"
  }
}
```

## 🚀 **コア実装**

### **1. メインエクステンション (extension.ts)**

```typescript
import * as vscode from 'vscode';
import { FPGAPinPlannerPanel } from './panels/FPGAPinPlannerPanel';
import { FileService } from './services/FileService';
import { ProjectService } from './services/ProjectService';

let pinPlannerPanel: FPGAPinPlannerPanel | undefined;

export function activate(context: vscode.ExtensionContext) {
  console.log('FPGA Pin Planner extension activated');

  // コマンド登録
  registerCommands(context);
  
  // ファイルウォッチャー設定
  setupFileWatchers(context);
  
  // 言語サポート
  setupLanguageSupport(context);
}

function registerCommands(context: vscode.ExtensionContext) {
  // メインパネルを開く
  const openCommand = vscode.commands.registerCommand(
    'fpgaPinPlanner.open',
    () => {
      if (pinPlannerPanel) {
        pinPlannerPanel.reveal();
      } else {
        pinPlannerPanel = new FPGAPinPlannerPanel(context.extensionUri);
        
        pinPlannerPanel.onDidDispose(() => {
          pinPlannerPanel = undefined;
        });
      }
    }
  );

  // CSV インポート
  const importCSVCommand = vscode.commands.registerCommand(
    'fpgaPinPlanner.importCSV',
    async (uri: vscode.Uri) => {
      try {
        const csvContent = await FileService.readFile(uri);
        if (pinPlannerPanel) {
          pinPlannerPanel.importCSV(csvContent);
        } else {
          // パネルを開いてからインポート
          vscode.commands.executeCommand('fpgaPinPlanner.open');
          setTimeout(() => {
            pinPlannerPanel?.importCSV(csvContent);
          }, 1000);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`CSV import failed: ${error}`);
      }
    }
  );

  // XDC エクスポート
  const exportXDCCommand = vscode.commands.registerCommand(
    'fpgaPinPlanner.exportXDC',
    async () => {
      if (!pinPlannerPanel) {
        vscode.window.showWarningMessage('Please open FPGA Pin Planner first');
        return;
      }

      try {
        const xdcContent = await pinPlannerPanel.generateXDC();
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        
        if (workspaceFolder) {
          const exportPath = vscode.workspace.getConfiguration('fpgaPinPlanner').get<string>('exportPath', './constraints');
          const filePath = vscode.Uri.joinPath(workspaceFolder.uri, exportPath, 'pins.xdc');
          
          await FileService.writeFile(filePath, xdcContent);
          vscode.window.showInformationMessage(`XDC exported to ${filePath.fsPath}`);
          
          // ファイルを開く
          const document = await vscode.workspace.openTextDocument(filePath);
          vscode.window.showTextDocument(document);
        }
      } catch (error) {
        vscode.window.showErrorMessage(`XDC export failed: ${error}`);
      }
    }
  );

  // プロジェクト保存
  const saveProjectCommand = vscode.commands.registerCommand(
    'fpgaPinPlanner.saveProject',
    async () => {
      if (!pinPlannerPanel) {
        vscode.window.showWarningMessage('Please open FPGA Pin Planner first');
        return;
      }

      try {
        const projectData = await pinPlannerPanel.getProjectData();
        await ProjectService.saveProject(projectData);
        vscode.window.showInformationMessage('Project saved successfully');
      } catch (error) {
        vscode.window.showErrorMessage(`Project save failed: ${error}`);
      }
    }
  );

  context.subscriptions.push(
    openCommand,
    importCSVCommand,
    exportXDCCommand,
    saveProjectCommand
  );
}

function setupFileWatchers(context: vscode.ExtensionContext) {
  // CSV ファイルの変更を監視
  const csvWatcher = vscode.workspace.createFileSystemWatcher('**/*.csv');
  
  csvWatcher.onDidChange(async (uri) => {
    if (pinPlannerPanel) {
      const shouldReload = await vscode.window.showInformationMessage(
        'CSV file changed. Reload pin data?',
        'Yes',
        'No'
      );
      
      if (shouldReload === 'Yes') {
        const csvContent = await FileService.readFile(uri);
        pinPlannerPanel.importCSV(csvContent);
      }
    }
  });

  context.subscriptions.push(csvWatcher);
}

function setupLanguageSupport(context: vscode.ExtensionContext) {
  // XDC ファイルのコード補完
  const xdcCompletionProvider = vscode.languages.registerCompletionItemProvider(
    'xdc',
    {
      provideCompletionItems(document, position) {
        const completions: vscode.CompletionItem[] = [];
        
        // 基本的な XDC コマンドの補完
        const xdcCommands = [
          'set_property',
          'create_clock',
          'set_input_delay',
          'set_output_delay',
          'set_false_path'
        ];
        
        xdcCommands.forEach(cmd => {
          const completion = new vscode.CompletionItem(cmd, vscode.CompletionItemKind.Keyword);
          completion.detail = `XDC command: ${cmd}`;
          completions.push(completion);
        });
        
        return completions;
      }
    }
  );

  context.subscriptions.push(xdcCompletionProvider);
}

export function deactivate() {
  if (pinPlannerPanel) {
    pinPlannerPanel.dispose();
  }
}
```

### **2. Webview パネル (FPGAPinPlannerPanel.ts)**

```typescript
import * as vscode from 'vscode';
import { FileService } from '../services/FileService';

export class FPGAPinPlannerPanel {
  public static readonly viewType = 'fpgaPinPlanner';
  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  constructor(extensionUri: vscode.Uri) {
    this._extensionUri = extensionUri;

    this._panel = vscode.window.createWebviewPanel(
      FPGAPinPlannerPanel.viewType,
      'FPGA Pin Planner',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [
          vscode.Uri.joinPath(extensionUri, 'dist'),
          vscode.Uri.joinPath(extensionUri, 'webview')
        ],
        retainContextWhenHidden: true
      }
    );

    this._panel.webview.html = this.getHtmlForWebview();
    this.setupMessageHandling();
  }

  private getHtmlForWebview(): string {
    const webview = this._panel.webview;
    
    // React アプリのリソースを参照
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'bundle.js')
    );
    const styleUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'webview', 'dist', 'bundle.css')
    );

    // CSP (Content Security Policy) を設定
    const nonce = this.getNonce();

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; 
        style-src ${webview.cspSource} 'unsafe-inline'; 
        script-src 'nonce-${nonce}'; 
        connect-src ${webview.cspSource};">
      <link href="${styleUri}" rel="stylesheet">
      <title>FPGA Pin Planner</title>
    </head>
    <body>
      <div id="root"></div>
      <script nonce="${nonce}" src="${scriptUri}"></script>
      <script nonce="${nonce}">
        // VSCode API を React アプリに渡す
        window.vscode = acquireVsCodeApi();
        
        // 初期設定を渡す
        window.vscodeConfig = {
          theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'light',
          workspaceFolder: '${vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''}',
          settings: {
            defaultZoom: ${vscode.workspace.getConfiguration('fpgaPinPlanner').get('defaultZoom', 1.0)},
            showGrid: ${vscode.workspace.getConfiguration('fpgaPinPlanner').get('showGrid', true)},
            autoSave: ${vscode.workspace.getConfiguration('fpgaPinPlanner').get('autoSave', true)}
          }
        };
      </script>
    </body>
    </html>`;
  }

  private setupMessageHandling() {
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.type) {
          case 'openFile':
            await this.handleOpenFile();
            break;
          case 'saveProject':
            await this.handleSaveProject(message.data);
            break;
          case 'exportXDC':
            await this.handleExportXDC(message.data);
            break;
          case 'showMessage':
            vscode.window.showInformationMessage(message.message);
            break;
          case 'showError':
            vscode.window.showErrorMessage(message.message);
            break;
          case 'updateSettings':
            await this.handleUpdateSettings(message.settings);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  private async handleOpenFile() {
    const options: vscode.OpenDialogOptions = {
      canSelectMany: false,
      openLabel: 'Open CSV File',
      filters: {
        'CSV files': ['csv'],
        'All files': ['*']
      }
    };

    const fileUri = await vscode.window.showOpenDialog(options);
    if (fileUri && fileUri[0]) {
      const content = await FileService.readFile(fileUri[0]);
      this._panel.webview.postMessage({
        type: 'csvLoaded',
        content: content,
        fileName: fileUri[0].fsPath
      });
    }
  }

  private async handleSaveProject(projectData: any) {
    const options: vscode.SaveDialogOptions = {
      saveLabel: 'Save Project',
      filters: {
        'JSON files': ['json'],
        'All files': ['*']
      }
    };

    const fileUri = await vscode.window.showSaveDialog(options);
    if (fileUri) {
      await FileService.writeFile(fileUri, JSON.stringify(projectData, null, 2));
      vscode.window.showInformationMessage('Project saved successfully');
    }
  }

  private async handleExportXDC(xdcData: string) {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const exportPath = vscode.workspace.getConfiguration('fpgaPinPlanner').get<string>('exportPath', './constraints');
    const filePath = vscode.Uri.joinPath(workspaceFolder.uri, exportPath, 'pins.xdc');
    
    await FileService.writeFile(filePath, xdcData);
    vscode.window.showInformationMessage(`XDC exported to ${filePath.fsPath}`);
    
    // ファイルを開く
    const document = await vscode.workspace.openTextDocument(filePath);
    vscode.window.showTextDocument(document);
  }

  private async handleUpdateSettings(settings: any) {
    const config = vscode.workspace.getConfiguration('fpgaPinPlanner');
    for (const [key, value] of Object.entries(settings)) {
      await config.update(key, value, vscode.ConfigurationTarget.Workspace);
    }
  }

  public importCSV(content: string) {
    this._panel.webview.postMessage({
      type: 'importCSV',
      content: content
    });
  }

  public async generateXDC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('XDC generation timeout'));
      }, 5000);

      const messageHandler = this._panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'xdcGenerated') {
          clearTimeout(timeout);
          messageHandler.dispose();
          resolve(message.content);
        }
      });

      this._panel.webview.postMessage({ type: 'generateXDC' });
    });
  }

  public async getProjectData(): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Get project data timeout'));
      }, 5000);

      const messageHandler = this._panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'projectData') {
          clearTimeout(timeout);
          messageHandler.dispose();
          resolve(message.data);
        }
      });

      this._panel.webview.postMessage({ type: 'getProjectData' });
    });
  }

  public reveal() {
    this._panel.reveal();
  }

  public dispose() {
    this._panel.dispose();
    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }

  public onDidDispose(callback: () => void) {
    this._panel.onDidDispose(callback);
  }

  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
```

### **3. ファイルサービス (FileService.ts)**

```typescript
import * as vscode from 'vscode';
import * as path from 'path';

export class FileService {
  /**
   * ファイルを読み込む
   */
  static async readFile(uri: vscode.Uri): Promise<string> {
    try {
      const fileContent = await vscode.workspace.fs.readFile(uri);
      return Buffer.from(fileContent).toString('utf8');
    } catch (error) {
      throw new Error(`Failed to read file ${uri.fsPath}: ${error}`);
    }
  }

  /**
   * ファイルに書き込む
   */
  static async writeFile(uri: vscode.Uri, content: string): Promise<void> {
    try {
      // ディレクトリが存在しない場合は作成
      const dirname = path.dirname(uri.fsPath);
      const dirUri = vscode.Uri.file(dirname);
      
      try {
        await vscode.workspace.fs.stat(dirUri);
      } catch {
        await vscode.workspace.fs.createDirectory(dirUri);
      }

      const encoder = new TextEncoder();
      await vscode.workspace.fs.writeFile(uri, encoder.encode(content));
    } catch (error) {
      throw new Error(`Failed to write file ${uri.fsPath}: ${error}`);
    }
  }

  /**
   * ファイルが存在するかチェック
   */
  static async fileExists(uri: vscode.Uri): Promise<boolean> {
    try {
      await vscode.workspace.fs.stat(uri);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * ワークスペース内の関連ファイルを検索
   */
  static async findRelatedFiles(extensions: string[]): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];
    
    for (const extension of extensions) {
      const pattern = `**/*.${extension}`;
      const foundFiles = await vscode.workspace.findFiles(pattern);
      files.push(...foundFiles);
    }
    
    return files;
  }

  /**
   * XDC ファイルのパス候補を取得
   */
  static async getXDCFilePaths(): Promise<vscode.Uri[]> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return [];
    }

    const commonPaths = [
      'constraints',
      'src/constraints',
      'hdl/constraints',
      'vivado/constraints'
    ];

    const paths: vscode.Uri[] = [];
    for (const commonPath of commonPaths) {
      const uri = vscode.Uri.joinPath(workspaceFolder.uri, commonPath);
      if (await this.fileExists(uri)) {
        paths.push(uri);
      }
    }

    return paths;
  }
}
```

### **4. プロジェクトサービス (ProjectService.ts)**

```typescript
import * as vscode from 'vscode';
import * as path from 'path';
import { FileService } from './FileService';

export interface FPGAProject {
  name: string;
  version: string;
  created: Date;
  modified: Date;
  pins: any[];
  settings: any;
  packageInfo: any;
}

export class ProjectService {
  private static readonly PROJECT_EXTENSION = '.fpgaproj';

  /**
   * プロジェクトを保存
   */
  static async saveProject(projectData: Partial<FPGAProject>): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder found');
    }

    const project: FPGAProject = {
      name: projectData.name || path.basename(workspaceFolder.uri.fsPath),
      version: '1.0.0',
      created: projectData.created || new Date(),
      modified: new Date(),
      pins: projectData.pins || [],
      settings: projectData.settings || {},
      packageInfo: projectData.packageInfo || {}
    };

    const projectPath = vscode.Uri.joinPath(
      workspaceFolder.uri,
      `${project.name}${this.PROJECT_EXTENSION}`
    );

    await FileService.writeFile(projectPath, JSON.stringify(project, null, 2));
  }

  /**
   * プロジェクトを読み込み
   */
  static async loadProject(uri?: vscode.Uri): Promise<FPGAProject | null> {
    let projectUri = uri;
    
    if (!projectUri) {
      // ワークスペース内のプロジェクトファイルを検索
      const projectFiles = await vscode.workspace.findFiles(`**/*${this.PROJECT_EXTENSION}`);
      if (projectFiles.length === 0) {
        return null;
      }
      
      if (projectFiles.length === 1) {
        projectUri = projectFiles[0];
      } else {
        // 複数ある場合はユーザーに選択させる
        const selected = await vscode.window.showQuickPick(
          projectFiles.map(file => ({
            label: path.basename(file.fsPath),
            description: file.fsPath,
            uri: file
          })),
          { placeHolder: 'Select project file' }
        );
        
        if (!selected) {
          return null;
        }
        projectUri = selected.uri;
      }
    }

    try {
      const content = await FileService.readFile(projectUri);
      const project: FPGAProject = JSON.parse(content);
      return project;
    } catch (error) {
      throw new Error(`Failed to load project: ${error}`);
    }
  }

  /**
   * 最近のプロジェクト一覧を取得
   */
  static async getRecentProjects(): Promise<vscode.Uri[]> {
    const projectFiles = await vscode.workspace.findFiles(`**/*${this.PROJECT_EXTENSION}`);
    
    // 最終更新日時でソート
    const projectsWithStats = await Promise.all(
      projectFiles.map(async (uri) => {
        const stat = await vscode.workspace.fs.stat(uri);
        return { uri, mtime: stat.mtime };
      })
    );

    projectsWithStats.sort((a, b) => b.mtime - a.mtime);
    return projectsWithStats.map(p => p.uri);
  }

  /**
   * プロジェクトをエクスポート（他の形式）
   */
  static async exportProject(project: FPGAProject, format: 'json' | 'xml' | 'csv'): Promise<string> {
    switch (format) {
      case 'json':
        return JSON.stringify(project, null, 2);
      
      case 'xml':
        return this.generateXMLExport(project);
      
      case 'csv':
        return this.generateCSVExport(project);
      
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private static generateXMLExport(project: FPGAProject): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<FPGAProject name="${project.name}" version="${project.version}">
  <Info>
    <Created>${project.created.toISOString()}</Created>
    <Modified>${project.modified.toISOString()}</Modified>
  </Info>
  <Pins>
    ${project.pins.map(pin => `
    <Pin id="${pin.id}" number="${pin.pinNumber}">
      <Position x="${pin.position.x}" y="${pin.position.y}" />
      <Signal>${pin.signalName || ''}</Signal>
      <Type>${pin.pinType}</Type>
      <Bank>${pin.bank}</Bank>
    </Pin>`).join('')}
  </Pins>
</FPGAProject>`;
  }

  private static generateCSVExport(project: FPGAProject): string {
    const headers = ['Pin Number', 'Signal Name', 'Pin Type', 'Bank', 'Position X', 'Position Y'];
    const rows = project.pins.map(pin => [
      pin.pinNumber,
      pin.signalName || '',
      pin.pinType,
      pin.bank,
      pin.position.x.toString(),
      pin.position.y.toString()
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }
}
```

## 🔧 **Webview統合**

### **React アプリの修正**

現在のReactアプリにVSCode統合のためのコードを追加します：

```typescript
// src/hooks/useVSCodeAPI.ts
import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    vscode?: {
      postMessage(message: any): void;
      getState(): any;
      setState(state: any): void;
    };
    vscodeConfig?: {
      theme: 'dark' | 'light';
      workspaceFolder: string;
      settings: {
        defaultZoom: number;
        showGrid: boolean;
        autoSave: boolean;
      };
    };
  }
}

export const useVSCodeAPI = () => {
  const isVSCode = typeof window !== 'undefined' && window.vscode;

  const postMessage = useCallback((message: any) => {
    if (isVSCode) {
      window.vscode!.postMessage(message);
    } else {
      console.log('VSCode message:', message);
    }
  }, [isVSCode]);

  const showMessage = useCallback((message: string, type: 'info' | 'error' = 'info') => {
    postMessage({
      type: type === 'info' ? 'showMessage' : 'showError',
      message
    });
  }, [postMessage]);

  const openFile = useCallback(() => {
    postMessage({ type: 'openFile' });
  }, [postMessage]);

  const saveProject = useCallback((projectData: any) => {
    postMessage({
      type: 'saveProject',
      data: projectData
    });
  }, [postMessage]);

  const exportXDC = useCallback((xdcContent: string) => {
    postMessage({
      type: 'exportXDC',
      data: xdcContent
    });
  }, [postMessage]);

  const updateSettings = useCallback((settings: any) => {
    postMessage({
      type: 'updateSettings',
      settings
    });
  }, [postMessage]);

  useEffect(() => {
    if (!isVSCode) return;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'csvLoaded':
          // CSV読み込み完了の処理
          break;
        case 'importCSV':
          // CSV インポートの処理
          break;
        case 'generateXDC':
          // XDC 生成要求の処理
          break;
        case 'getProjectData':
          // プロジェクトデータ取得要求の処理
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [isVSCode]);

  return {
    isVSCode,
    config: window.vscodeConfig,
    postMessage,
    showMessage,
    openFile,
    saveProject,
    exportXDC,
    updateSettings
  };
};
```

### **メインアプリケーションの修正**

```typescript
// src/components/VSCodeApp.tsx
import React, { useEffect } from 'react';
import { useVSCodeAPI } from '../hooks/useVSCodeAPI';
import { useAppStore } from '../stores/app-store';
import { App } from './App';

export const VSCodeApp: React.FC = () => {
  const vscode = useVSCodeAPI();
  const { setPins, pins } = useAppStore();

  useEffect(() => {
    if (vscode.isVSCode && vscode.config) {
      // VSCode設定を適用
      document.body.className = vscode.config.theme === 'dark' ? 'dark-theme' : 'light-theme';
    }
  }, [vscode.isVSCode, vscode.config]);

  // VSCode メッセージハンドリング
  useEffect(() => {
    if (!vscode.isVSCode) return;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.type) {
        case 'csvLoaded':
          // CSV読み込み完了
          vscode.showMessage(`CSV loaded: ${message.fileName}`);
          break;
          
        case 'importCSV':
          // CSV インポート処理
          // ここで CSV パースとピン設定を行う
          break;
          
        case 'generateXDC':
          // XDC 生成要求
          const xdcContent = generateXDCFromPins(pins);
          vscode.postMessage({
            type: 'xdcGenerated',
            content: xdcContent
          });
          break;
          
        case 'getProjectData':
          // プロジェクトデータ取得
          const projectData = {
            name: 'Current Project',
            pins: pins,
            settings: vscode.config?.settings || {}
          };
          vscode.postMessage({
            type: 'projectData',
            data: projectData
          });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [vscode, pins]);

  return (
    <div className="vscode-app">
      {vscode.isVSCode && (
        <div className="vscode-toolbar">
          <button onClick={vscode.openFile} className="vscode-button">
            📁 Open CSV
          </button>
          <button onClick={() => vscode.saveProject({})} className="vscode-button">
            💾 Save Project
          </button>
          <button onClick={() => vscode.exportXDC('')} className="vscode-button">
            📄 Export XDC
          </button>
        </div>
      )}
      <App />
    </div>
  );
};

// XDC生成ヘルパー関数
function generateXDCFromPins(pins: any[]): string {
  const assignedPins = pins.filter(pin => pin.signalName);
  
  const constraints = assignedPins.map(pin => {
    const lines = [];
    
    // ピン配置制約
    lines.push(`set_property PACKAGE_PIN ${pin.pinNumber} [get_ports ${pin.signalName}]`);
    
    // I/O標準設定
    if (pin.voltage) {
      const iostandard = pin.voltage === '3.3V' ? 'LVCMOS33' : 
                        pin.voltage === '1.8V' ? 'LVCMOS18' :
                        pin.voltage === '2.5V' ? 'LVCMOS25' : 'LVCMOS33';
      lines.push(`set_property IOSTANDARD ${iostandard} [get_ports ${pin.signalName}]`);
    }
    
    return lines.join('\n');
  }).join('\n\n');
  
  const header = `# FPGA Pin Planner Generated Constraints
# Generated on ${new Date().toISOString()}
# Total pins assigned: ${assignedPins.length}

`;
  
  return header + constraints;
}
```

## 📦 **ビルドとデプロイ**

### **Webpack設定**

```javascript
// webpack.config.js
const path = require('path');

module.exports = [
  // 拡張機能本体のビルド
  {
    target: 'node',
    mode: 'none',
    entry: './src/extension.ts',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'extension.js',
      libraryTarget: 'commonjs2'
    },
    resolve: {
      extensions: ['.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          exclude: /node_modules/,
          use: 'ts-loader'
        }
      ]
    },
    externals: {
      vscode: 'commonjs vscode'
    }
  },
  // Webview (React アプリ) のビルド
  {
    target: 'web',
    mode: 'production',
    entry: './src/webview/index.tsx',
    output: {
      path: path.resolve(__dirname, 'webview/dist'),
      filename: 'bundle.js'
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js']
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader']
        }
      ]
    }
  }
];
```

### **XDC言語サポート**

```json
// syntaxes/xdc.tmLanguage.json
{
  "$schema": "https://raw.githubusercontent.com/martinring/tmlanguage/master/tmlanguage.json",
  "name": "XDC",
  "patterns": [
    {
      "include": "#keywords"
    },
    {
      "include": "#strings"
    },
    {
      "include": "#comments"
    }
  ],
  "repository": {
    "keywords": {
      "patterns": [
        {
          "name": "keyword.control.xdc",
          "match": "\\b(set_property|create_clock|set_input_delay|set_output_delay|set_false_path|set_max_delay|set_min_delay|get_ports|get_clocks|get_cells)\\b"
        }
      ]
    },
    "strings": {
      "name": "string.quoted.double.xdc",
      "begin": "\"",
      "end": "\"",
      "patterns": [
        {
          "name": "constant.character.escape.xdc",
          "match": "\\\\."
        }
      ]
    },
    "comments": {
      "patterns": [
        {
          "name": "comment.line.number-sign.xdc",
          "match": "#.*$"
        }
      ]
    }
  },
  "scopeName": "source.xdc"
}
```

### **公開準備**

```bash
# 必要なツールのインストール
npm install -g vsce

# パッケージのビルド
npm run vscode:prepublish

# 拡張機能パッケージの作成
vsce package

# Marketplace への公開
vsce publish
```

## 🔄 **移行手順**

### **Step 1: プロジェクト構造の準備 (Day 1-2)**
1. 新しいディレクトリ `fpga-pin-planner-vscode/` を作成
2. VSCode拡張のテンプレートをセットアップ
3. 現在のReactアプリを `webview/src/` フォルダにコピー
4. `package.json` を拡張機能用に設定

### **Step 2: 基本統合 (Day 3-5)**
1. `extension.ts` とパネルクラスを実装
2. Webview の HTML テンプレートを作成
3. メッセージングシステムをセットアップ
4. 基本的なコマンド実装

### **Step 3: 機能統合 (Day 6-10)**
1. ファイル操作の VSCode API 統合
2. 設定管理の移行
3. コマンドとキーボードショートカットの実装
4. エラーハンドリングの改善

### **Step 4: 高度な機能 (Day 11-14)**
1. XDC言語サポートの追加
2. プロジェクトファイル管理
3. ファイルウォッチャーの実装
4. 他の拡張機能との連携準備

### **Step 5: テストと最適化 (Day 15-21)**
1. ローカルでの動作確認
2. パフォーマンス最適化
3. アイコンとスクリーンショットの準備
4. README とドキュメントの作成

### **Step 6: パッケージング (Day 22-25)**
1. 最終的なビルド設定
2. Marketplace 公開準備
3. ベータテスト実施
4. 公開とフィードバック収集

## 🎯 **期待される効果**

### **開発者体験の向上**
- 既存のVSCodeワークフローにシームレス統合
- ファイル管理とプロジェクト連携の自動化
- キーボードショートカットによる効率的操作
- Git統合による変更履歴管理

### **機能拡張の可能性**
- 他のFPGA関連拡張機能との連携
- VSCode の豊富なAPIの活用
- デバッグ・診断機能の統合
- チーム開発支援機能

### **配布とメンテナンス**
- Marketplace による簡単インストール
- 自動更新システム
- ユーザーフィードバック収集
- アナリティクス統合

## 📊 **技術的考慮事項**

### **パフォーマンス**
- Webview内でのCanvasパフォーマンス最適化
- メモリ使用量の監視と制限
- 大量ピンデータの効率的処理
- レスポンシブな UI 更新

### **セキュリティ**
- Content Security Policy の適切な設定
- ファイルアクセス権限の制限
- 入力データの検証
- 機密情報の保護

### **互換性**
- VSCodeバージョン互換性
- クロスプラットフォーム対応
- 既存プロジェクトとの互換性
- アップグレードパスの提供

## 📚 **参考リソース**

### **公式ドキュメント**
- [VSCode Extension API](https://code.visualstudio.com/api)
- [Webview API Guide](https://code.visualstudio.com/api/extension-guides/webview)
- [Extension Publishing](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Language Support](https://code.visualstudio.com/api/language-extensions/overview)

### **サンプルコード**
- [VSCode Extension Samples](https://github.com/microsoft/vscode-extension-samples)
- [Webview Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/webview-sample)
- [Language Server Sample](https://github.com/microsoft/vscode-extension-samples/tree/main/lsp-sample)

### **開発ツール**
- [Extension Generator](https://code.visualstudio.com/api/get-started/your-first-extension)
- [Extension Test Runner](https://code.visualstudio.com/api/working-with-extensions/testing-extension)
- [Extension Analytics](https://code.visualstudio.com/api/references/extension-manifest#contributes.telemetry)

## 🏁 **まとめ**

この実装ガイドに従うことで、現在のWebアプリケーションを効率的にVSCode拡張機能として移行できます。段階的なアプローチにより、リスクを最小限に抑えながら、FPGA開発者にとって価値のあるツールを提供できるでしょう。

VSCode拡張機能として実装することで、FPGA設計者の日常ワークフローに完全に統合され、より効率的で使いやすいピンプランニング体験を提供できます。

---

**作成日**: 2025年1月31日  
**対象バージョン**: VSCode 1.74.0+  
**実装期間**: 約4週間（25日間）
