/**
 * Custom Editor Provider for cc-format configuration files
 *
 * This provides a visual editor for .cc-format.jsonc files with real-time
 * CMake code formatting preview.
 */

import * as vscode from 'vscode';
import {
    formatCMake,
    FormatterOptions,
    DEFAULT_OPTIONS,
    parseConfigContent,
    generateConfigHeader
} from '@cc-format/core';
import { getWebviewContent, SAMPLE_CMAKE_CODE } from './webview/configEditorHtml';

/**
 * Custom editor provider for cc-format configuration files
 */
export class ConfigEditorProvider implements vscode.CustomTextEditorProvider {
    public static readonly viewType = 'clionCMakeFormat.configEditor';

    private static currentPanel: vscode.WebviewPanel | undefined;
    private isUpdatingFromWebview = false;

    constructor(private readonly context: vscode.ExtensionContext) { }

    /**
     * Called when our custom editor is opened
     */
    public async resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        _token: vscode.CancellationToken
    ): Promise<void> {
        // Setup webview options
        webviewPanel.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri]
        };

        // Set the webview's initial html content
        webviewPanel.webview.html = getWebviewContent(
            webviewPanel.webview,
            this.context.extensionUri,
            false, // not global settings
            document.uri.fsPath
        );

        // Parse current config
        const config = this.parseConfig(document.getText());

        // Format sample code with current config
        const formattedCode = this.formatSampleCode(config);

        // Get JSONC source for preview
        const jsoncSource = document.getText();

        // Send initial data to webview
        webviewPanel.webview.postMessage({
            type: 'init',
            config: config,
            defaults: DEFAULT_OPTIONS,
            isGlobal: false,
            filePath: document.uri.fsPath,
            sampleCode: SAMPLE_CMAKE_CODE,
            formattedCode: formattedCode,
            jsoncSource: jsoncSource
        });

        // Handle messages from the webview
        webviewPanel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'configChange':
                        await this.handleConfigChange(document, message.key, message.value);
                        break;

                    case 'requestPreview': {
                        const formatted = this.formatSampleCode(message.config);
                        const currentJsoncSource = document.getText();
                        webviewPanel.webview.postMessage({
                            type: 'updatePreview',
                            formattedCode: formatted,
                            jsoncSource: currentJsoncSource
                        });
                        break;
                    }

                    case 'resetToDefaults': {
                        // Show confirmation dialog
                        const answer = await vscode.window.showWarningMessage(
                            'Reset all options to their default values?',
                            { modal: true },
                            'Reset',
                            'Cancel'
                        );

                        if (answer === 'Reset') {
                            await this.resetToDefaults(document);
                            webviewPanel.webview.postMessage({
                                type: 'init',
                                config: {},
                                defaults: DEFAULT_OPTIONS,
                                isGlobal: false,
                                filePath: document.uri.fsPath,
                                sampleCode: SAMPLE_CMAKE_CODE,
                                formattedCode: this.formatSampleCode({}),
                                jsoncSource: document.getText()
                            });
                        }
                        break;
                    }

                    case 'showError':
                        vscode.window.showErrorMessage(message.message);
                        break;

                    case 'switchToTextEditor':
                        // Switch to default text editor
                        if (message.filePath) {
                            const uri = vscode.Uri.file(message.filePath);
                            await vscode.commands.executeCommand('vscode.openWith', uri, 'default');
                        }
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        // Update webview when the document changes
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
            // Skip updates that originated from webview to prevent circular updates
            if (e.document.uri.toString() === document.uri.toString() && !this.isUpdatingFromWebview) {
                const newConfig = this.parseConfig(e.document.getText());
                webviewPanel.webview.postMessage({
                    type: 'configUpdated',
                    config: newConfig,
                    formattedCode: this.formatSampleCode(newConfig),
                    jsoncSource: e.document.getText()
                });
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    /**
     * Parse configuration from document text
     */
    private parseConfig(text: string): Partial<FormatterOptions> {
        try {
            const config = parseConfigContent(text);
            return config || {};
        } catch {
            // Return empty config if parsing fails
            return {};
        }
    }

    /**
     * Format sample CMake code with given options
     */
    private formatSampleCode(options: Partial<FormatterOptions>): string {
        try {
            const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
            return formatCMake(SAMPLE_CMAKE_CODE, mergedOptions);
        } catch (error) {
            return `# Error formatting code: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
    }

    /**
     * Handle config change from webview
     */
    private async handleConfigChange(
        document: vscode.TextDocument,
        key: string,
        value: boolean | number | string
    ): Promise<void> {
        const text = document.getText();
        const config = this.parseConfig(text);

        // Update the config
        (config as Record<string, unknown>)[key] = value;

        // Generate new content
        const newContent = this.generateConfigContent(config);

        // Set flag to prevent circular updates
        this.isUpdatingFromWebview = true;
        try {
            // Apply edit
            const edit = new vscode.WorkspaceEdit();
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(document.getText().length)
            );
            edit.replace(document.uri, fullRange, newContent);
            await vscode.workspace.applyEdit(edit);
        } finally {
            // Always reset flag
            this.isUpdatingFromWebview = false;
        }
    }

    /**
     * Reset config file to defaults
     */
    private async resetToDefaults(document: vscode.TextDocument): Promise<void> {
        const newContent = this.generateConfigContent({});

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, fullRange, newContent);
        await vscode.workspace.applyEdit(edit);
    }

    /**
     * Generate configuration file content
     */
    private generateConfigContent(options: Partial<FormatterOptions>): string {
        const lines: string[] = [generateConfigHeader(), '{'];

        const entries = Object.entries(options);
        entries.forEach(([key, value], index) => {
            const comma = index < entries.length - 1 ? ',' : '';
            lines.push(`    "${key}": ${JSON.stringify(value)}${comma}`);
        });

        lines.push('}', '');
        return lines.join('\n');
    }

    /**
     * Open the visual editor for a specific file or global settings
     */
    public static async openEditor(
        context: vscode.ExtensionContext,
        isGlobal: boolean = false,
        filePath?: string
    ): Promise<void> {
        if (isGlobal) {
            // Open global settings panel
            await ConfigEditorProvider.openGlobalSettingsPanel(context);
        } else if (filePath) {
            // Open the file, which will trigger the custom editor
            const uri = vscode.Uri.file(filePath);
            await vscode.commands.executeCommand('vscode.openWith', uri, ConfigEditorProvider.viewType);
        } else {
            // Try to find or create a config file
            const workspaceFolders = vscode.workspace.workspaceFolders;
            if (workspaceFolders && workspaceFolders.length > 0) {
                const configPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.cc-format.jsonc');
                try {
                    await vscode.workspace.fs.stat(configPath);
                    // File exists, open it
                    await vscode.commands.executeCommand('vscode.openWith', configPath, ConfigEditorProvider.viewType);
                } catch {
                    // File doesn't exist, ask to create
                    const action = await vscode.window.showInformationMessage(
                        'No .cc-format.jsonc file found. Would you like to create one?',
                        'Create',
                        'Open Global Settings',
                        'Cancel'
                    );

                    if (action === 'Create') {
                        await vscode.commands.executeCommand('clion-cmake-format.createConfig');
                    } else if (action === 'Open Global Settings') {
                        await ConfigEditorProvider.openGlobalSettingsPanel(context);
                    }
                }
            } else {
                await ConfigEditorProvider.openGlobalSettingsPanel(context);
            }
        }
    }

    /**
     * Open global settings panel
     */
    private static async openGlobalSettingsPanel(context: vscode.ExtensionContext): Promise<void> {
        const columnToShowIn = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (ConfigEditorProvider.currentPanel) {
            ConfigEditorProvider.currentPanel.reveal(columnToShowIn);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'clionCMakeFormat.globalSettings',
            'cc-format Global Settings',
            columnToShowIn || vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
                localResourceRoots: [context.extensionUri]
            }
        );

        ConfigEditorProvider.currentPanel = panel;

        panel.webview.html = getWebviewContent(
            panel.webview,
            context.extensionUri,
            true, // global settings
            undefined
        );

        // Get current VS Code settings
        const config = vscode.workspace.getConfiguration('clionCMakeFormatter');
        const currentConfig: Partial<FormatterOptions> = {};

        // Read all settings
        const optionKeys = Object.keys(DEFAULT_OPTIONS) as (keyof FormatterOptions)[];
        for (const key of optionKeys) {
            const value = config.get(key);
            if (value !== undefined) {
                (currentConfig as Record<string, unknown>)[key] = value;
            }
        }

        // Format sample code
        const mergedOptions = { ...DEFAULT_OPTIONS, ...currentConfig };
        let formattedCode: string;
        try {
            formattedCode = formatCMake(SAMPLE_CMAKE_CODE, mergedOptions);
        } catch {
            formattedCode = SAMPLE_CMAKE_CODE;
        }

        // Send initial data
        panel.webview.postMessage({
            type: 'init',
            config: currentConfig,
            defaults: DEFAULT_OPTIONS,
            isGlobal: true,
            filePath: undefined,
            sampleCode: SAMPLE_CMAKE_CODE,
            formattedCode: formattedCode
        });

        // Handle messages
        panel.webview.onDidReceiveMessage(
            async (message) => {
                switch (message.type) {
                    case 'configChange':
                        await ConfigEditorProvider.handleGlobalConfigChange(message.key, message.value);
                        break;

                    case 'requestPreview': {
                        const merged = { ...DEFAULT_OPTIONS, ...message.config };
                        let formatted: string;
                        try {
                            formatted = formatCMake(SAMPLE_CMAKE_CODE, merged);
                        } catch {
                            formatted = SAMPLE_CMAKE_CODE;
                        }
                        panel.webview.postMessage({
                            type: 'updatePreview',
                            formattedCode: formatted
                        });
                        break;
                    }

                    case 'resetToDefaults': {
                        // Show confirmation dialog for global settings
                        const answer = await vscode.window.showWarningMessage(
                            'Reset all global options to their default values? This will remove all cc-format settings from your VS Code configuration.',
                            { modal: true },
                            'Reset',
                            'Cancel'
                        );

                        if (answer === 'Reset') {
                            await ConfigEditorProvider.resetGlobalToDefaults();
                            panel.webview.postMessage({
                                type: 'init',
                                config: {},
                                defaults: DEFAULT_OPTIONS,
                                isGlobal: true,
                                filePath: undefined,
                                sampleCode: SAMPLE_CMAKE_CODE,
                                formattedCode: formatCMake(SAMPLE_CMAKE_CODE, DEFAULT_OPTIONS)
                            });
                        }
                        break;
                    }
                }
            },
            undefined,
            context.subscriptions
        );

        panel.onDidDispose(() => {
            ConfigEditorProvider.currentPanel = undefined;
        });
    }

    /**
     * Handle global config change
     */
    private static async handleGlobalConfigChange(
        key: string,
        value: boolean | number | string
    ): Promise<void> {
        const config = vscode.workspace.getConfiguration('clionCMakeFormatter');
        await config.update(key, value, vscode.ConfigurationTarget.Global);
    }

    /**
     * Reset global settings to defaults
     */
    private static async resetGlobalToDefaults(): Promise<void> {
        const config = vscode.workspace.getConfiguration('clionCMakeFormatter');
        const optionKeys = Object.keys(DEFAULT_OPTIONS) as (keyof FormatterOptions)[];

        for (const key of optionKeys) {
            await config.update(key, undefined, vscode.ConfigurationTarget.Global);
        }
    }
}
