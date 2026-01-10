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

        // Helper function to send init message to webview
        const sendInitMessage = (cfg: Partial<FormatterOptions>, jsoncSrc: string) => {
            webviewPanel.webview.postMessage({
                type: 'init',
                config: cfg,
                defaults: DEFAULT_OPTIONS,
                isGlobal: false,
                filePath: document.uri.fsPath,
                sampleCode: SAMPLE_CMAKE_CODE,
                formattedCode: this.formatSampleCode(cfg),
                jsoncSource: jsoncSrc
            });
        };

        // Parse current config
        let parseResult = this.parseConfig(document.getText());
        let initMessageSent = false;

        // Check if config file is corrupted
        if (!parseResult.isValid) {
            // Show error dialog
            const answer = await vscode.window.showErrorMessage(
                'Configuration file is corrupted or invalid. Would you like to edit it manually or reset to default values?',
                { modal: true },
                'Edit Manually',
                'Reset to Defaults',
                'Cancel'
            );

            if (answer === 'Edit Manually') {
                // Switch to text editor
                await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
                return;
            } else if (answer === 'Reset to Defaults') {
                // Reset to defaults and get the new content
                const newContent = await this.resetToDefaults(document);
                // Send init message with empty config and the newly generated content
                sendInitMessage({}, newContent);
                initMessageSent = true;
                // Update parseResult for the rest of initialization
                parseResult = { config: {}, isValid: true };
            } else {
                // User cancelled, close the editor
                webviewPanel.dispose();
                return;
            }
        }

        // Send init message if not already sent (from Reset to Defaults)
        if (!initMessageSent) {
            const config = parseResult.config;
            const jsoncSource = document.getText();
            sendInitMessage(config, jsoncSource);
        }

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
                            const newContent = await this.resetToDefaults(document);
                            webviewPanel.webview.postMessage({
                                type: 'init',
                                config: {},
                                defaults: DEFAULT_OPTIONS,
                                isGlobal: false,
                                filePath: document.uri.fsPath,
                                sampleCode: SAMPLE_CMAKE_CODE,
                                formattedCode: this.formatSampleCode({}),
                                jsoncSource: newContent
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
        const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(async (e) => {
            // Skip updates that originated from webview to prevent circular updates
            if (e.document.uri.toString() === document.uri.toString() && !this.isUpdatingFromWebview) {
                const parseResult = this.parseConfig(e.document.getText());

                if (!parseResult.isValid) {
                    // File is corrupted, show error dialog
                    const answer = await vscode.window.showErrorMessage(
                        'Configuration file is corrupted or invalid. Would you like to edit it manually or reset to default values?',
                        'Edit Manually',
                        'Reset to Defaults',
                        'Ignore'
                    );

                    if (answer === 'Edit Manually') {
                        // Switch to text editor
                        await vscode.commands.executeCommand('vscode.openWith', document.uri, 'default');
                    } else if (answer === 'Reset to Defaults') {
                        // Reset to defaults and get the new content
                        const newContent = await this.resetToDefaults(document);
                        // Send updated config to webview with the newly generated content
                        webviewPanel.webview.postMessage({
                            type: 'init',
                            config: {},
                            defaults: DEFAULT_OPTIONS,
                            isGlobal: false,
                            filePath: document.uri.fsPath,
                            sampleCode: SAMPLE_CMAKE_CODE,
                            formattedCode: this.formatSampleCode({}),
                            jsoncSource: newContent
                        });
                    }
                    // If user chooses 'Ignore', do nothing and keep the editor open
                } else {
                    // File is valid, update webview
                    webviewPanel.webview.postMessage({
                        type: 'configUpdated',
                        config: parseResult.config,
                        formattedCode: this.formatSampleCode(parseResult.config),
                        jsoncSource: e.document.getText()
                    });
                }
            }
        });

        webviewPanel.onDidDispose(() => {
            changeDocumentSubscription.dispose();
        });
    }

    /**
     * Parse configuration from document text
     * @returns An object containing the config and a validity flag
     */
    private parseConfig(text: string): { config: Partial<FormatterOptions>; isValid: boolean } {
        try {
            const config = parseConfigContent(text);
            // parseConfigContent returns null if file is corrupted (missing header or invalid JSON)
            // Empty object {} is a valid config (reset to defaults)
            if (config === null) {
                return { config: {}, isValid: false };
            }
            return { config, isValid: true };
        } catch {
            // Return invalid if parsing fails
            return { config: {}, isValid: false };
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
        const parseResult = this.parseConfig(text);

        // If file is corrupted, don't update
        if (!parseResult.isValid) {
            return;
        }

        const config = parseResult.config;

        // Update only the changed key (add if not exists, update if exists)
        (config as Record<string, unknown>)[key] = value;

        // Generate new content with updated config
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
     * @returns The new content that was written to the file
     */
    private async resetToDefaults(document: vscode.TextDocument): Promise<string> {
        const newContent = this.generateConfigContent({});

        const edit = new vscode.WorkspaceEdit();
        const fullRange = new vscode.Range(
            document.positionAt(0),
            document.positionAt(document.getText().length)
        );
        edit.replace(document.uri, fullRange, newContent);
        await vscode.workspace.applyEdit(edit);

        return newContent;
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
