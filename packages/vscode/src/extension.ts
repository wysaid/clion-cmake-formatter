/**
 * VSCode Extension - CLion CMake Format (cc-format)
 *
 * Provides document formatting for CMake files using CLion's formatting style.
 * Supports project-level configuration via .cc-format.jsonc files.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import {
    formatCMake,
    FormatterOptions,
    CommandCase,
    getConfigForDocument,
    clearConfigCache,
    generateSampleConfig,
    DEFAULT_OPTIONS
} from '@cc-format/core';

// Track which validation warnings have been shown to avoid repetition
const shownWarnings = new Set<string>();

/**
 * Validate numeric value within a range
 */
function validateRange(value: number, min: number, max: number, name: string): number {
    if (value < min || value > max) {
        const warningKey = `${name}:${value}`;
        // Only show warning once per session per config value
        if (!shownWarnings.has(warningKey)) {
            vscode.window.showWarningMessage(
                `${name} value ${value} is out of range [${min}, ${max}]. Using ${value < min ? 'minimum' : 'maximum'} value ${value < min ? min : max}.`
            );
            shownWarnings.add(warningKey);
        }
        return value < min ? min : max;
    }
    return value;
}

/**
 * Validate and normalize tabSize value (1-16)
 */
function validateTabSize(value: number): number {
    return validateRange(value, 1, 16, 'tabSize');
}

/**
 * Validate and normalize indentSize value (1-16)
 */
function validateIndentSize(value: number): number {
    return validateRange(value, 1, 16, 'indentSize');
}

/**
 * Validate and normalize continuationIndentSize value (1-16)
 */
function validateContinuationIndentSize(value: number): number {
    return validateRange(value, 1, 16, 'continuationIndentSize');
}

/**
 * Validate and normalize maxBlankLines value (0-20)
 */
function validateMaxBlankLines(value: number): number {
    return validateRange(value, 0, 20, 'maxBlankLines');
}

/**
 * Validate and normalize lineLength value
 * Returns 0 (unlimited) or a value >= 30
 */
function validateLineLength(value: number): number {
    const MIN_LINE_LENGTH = 30;

    // 0 means unlimited
    if (value === 0) {
        return 0;
    }

    // Enforce minimum value for non-zero values
    if (value < MIN_LINE_LENGTH) {
        const warningKey = `lineLength:${value}`;
        if (!shownWarnings.has(warningKey)) {
            vscode.window.showWarningMessage(
                `lineLength value ${value} is too small. Using minimum value ${MIN_LINE_LENGTH}.`
            );
            shownWarnings.add(warningKey);
        }
        return MIN_LINE_LENGTH;
    }

    return value;
}

/**
 * Read formatter options from VSCode configuration
 */
function getVSCodeOptions(): Partial<FormatterOptions> {
    const config = vscode.workspace.getConfiguration('clionCMakeFormatter');

    return {
        // Tab and Indent
        useTabs: config.get<boolean>('useTabs', false),
        tabSize: validateTabSize(config.get<number>('tabSize', 4)),
        indentSize: validateIndentSize(config.get<number>('indentSize', 4)),
        continuationIndentSize: validateContinuationIndentSize(config.get<number>('continuationIndentSize', 8)),
        keepIndentOnEmptyLines: config.get<boolean>('keepIndentOnEmptyLines', false),

        // Spacing - Before Parentheses
        spaceBeforeCommandDefinitionParentheses: config.get<boolean>('spaceBeforeCommandDefinitionParentheses', false),
        spaceBeforeCommandCallParentheses: config.get<boolean>('spaceBeforeCommandCallParentheses', false),
        spaceBeforeIfParentheses: config.get<boolean>('spaceBeforeIfParentheses', true),
        spaceBeforeForeachParentheses: config.get<boolean>('spaceBeforeForeachParentheses', true),
        spaceBeforeWhileParentheses: config.get<boolean>('spaceBeforeWhileParentheses', true),

        // Spacing - Inside Parentheses
        spaceInsideCommandDefinitionParentheses: config.get<boolean>('spaceInsideCommandDefinitionParentheses', false),
        spaceInsideCommandCallParentheses: config.get<boolean>('spaceInsideCommandCallParentheses', false),
        spaceInsideIfParentheses: config.get<boolean>('spaceInsideIfParentheses', false),
        spaceInsideForeachParentheses: config.get<boolean>('spaceInsideForeachParentheses', false),
        spaceInsideWhileParentheses: config.get<boolean>('spaceInsideWhileParentheses', false),

        // Blank Lines
        maxBlankLines: validateMaxBlankLines(config.get<number>('maxBlankLines', 2)),

        // Command Case
        commandCase: config.get<CommandCase>('commandCase', 'unchanged'),

        // Wrapping
        lineLength: validateLineLength(config.get<number>('lineLength', 0)),
        alignMultiLineArguments: config.get<boolean>('alignMultiLineArguments', false),
        alignMultiLineParentheses: config.get<boolean>('alignMultiLineParentheses', false),
        alignControlFlowParentheses: config.get<boolean>('alignControlFlowParentheses', false),
    };
}

/**
 * Get formatter options for a document, merging VS Code settings with project config
 */
function getFormatterOptions(document: vscode.TextDocument): Partial<FormatterOptions> {
    const config = vscode.workspace.getConfiguration('clionCMakeFormatter');
    const vscodeOptions = getVSCodeOptions();

    // Check if project-level configuration is enabled
    const enableProjectConfig = config.get<boolean>('enableProjectConfig', true);
    if (!enableProjectConfig) {
        return vscodeOptions;
    }

    // Get workspace root for the document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspaceRoot = workspaceFolder?.uri.fsPath;

    // Get document file path
    const documentPath = document.uri.fsPath;

    // Merge VS Code settings with project configuration file
    return getConfigForDocument(documentPath, workspaceRoot, vscodeOptions);
}

/**
 * Find the git root directory starting from a given path
 * Handles git submodules by checking .git file content
 * @param startPath The path to start searching from
 * @returns The git root path or null if not found
 */
function findGitRoot(startPath: string): string | null {
    let currentPath = startPath;
    const root = path.parse(currentPath).root;

    while (currentPath.length >= root.length) {
        const gitPath = path.join(currentPath, '.git');

        if (fs.existsSync(gitPath)) {
            const stats = fs.statSync(gitPath);

            if (stats.isDirectory()) {
                // Regular git repository
                return currentPath;
            } else if (stats.isFile()) {
                // Git submodule - .git is a file pointing to the actual git directory
                // Read the file to check if it's a valid submodule reference
                try {
                    const content = fs.readFileSync(gitPath, 'utf-8');
                    // Valid submodule format: "gitdir: <path>"
                    if (content.trim().startsWith('gitdir:')) {
                        return currentPath;
                    }
                } catch {
                    // If we can't read it, continue searching
                }
            }
        }

        const parentPath = path.dirname(currentPath);
        if (parentPath === currentPath) {
            break;
        }
        currentPath = parentPath;
    }

    return null;
}

/**
 * Normalize line endings to LF for comparison
 */
function normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * Show formatting result message
 */
function showFormattingResult(original: string, formatted: string): void {
    // Normalize line endings before comparison to handle CRLF vs LF
    const normalizedOriginal = normalizeLineEndings(original);
    const normalizedFormatted = normalizeLineEndings(formatted);

    if (normalizedOriginal === normalizedFormatted) {
        const message = vscode.l10n.t('No changes: content is already well-formatted');
        vscode.window.setStatusBarMessage(message, 3000);
    } else {
        const message = vscode.l10n.t('File formatted successfully');
        vscode.window.setStatusBarMessage(message, 3000);
    }
}

/**
 * Document Formatting Provider for CMake files
 */
class CMakeFormattingProvider implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(
        document: vscode.TextDocument,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        try {
            const source = document.getText();
            const options = getFormatterOptions(document);
            const formatted = formatCMake(source, options);

            // Show formatting result (non-blocking)
            showFormattingResult(source, formatted);

            // Create a text edit that replaces the entire document
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(source.length)
            );

            return [vscode.TextEdit.replace(fullRange, formatted)];
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`CMake formatting error: ${message}`);
            return [];
        }
    }
}

/**
 * Document Range Formatting Provider for CMake files
 */
class CMakeRangeFormattingProvider implements vscode.DocumentRangeFormattingEditProvider {
    provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        _range: vscode.Range,
        _options: vscode.FormattingOptions,
        _token: vscode.CancellationToken
    ): vscode.ProviderResult<vscode.TextEdit[]> {
        try {
            // For range formatting, we still format the whole document
            // because CMake formatting needs context (indentation levels, etc.)
            const source = document.getText();
            const options = getFormatterOptions(document);
            const formatted = formatCMake(source, options);

            // Show formatting result (non-blocking)
            showFormattingResult(source, formatted);

            // Create a text edit that replaces the entire document
            const fullRange = new vscode.Range(
                document.positionAt(0),
                document.positionAt(source.length)
            );

            return [vscode.TextEdit.replace(fullRange, formatted)];
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            vscode.window.showErrorMessage(`CMake formatting error: ${message}`);
            return [];
        }
    }
}

/**
 * Activate the extension
 */
export function activate(context: vscode.ExtensionContext): void {
    // Register the document formatting provider
    const formattingProvider = new CMakeFormattingProvider();
    const formattingDisposable = vscode.languages.registerDocumentFormattingEditProvider(
        { language: 'cmake', scheme: 'file' },
        formattingProvider
    );

    // Register the range formatting provider
    const rangeFormattingProvider = new CMakeRangeFormattingProvider();
    const rangeFormattingDisposable = vscode.languages.registerDocumentRangeFormattingEditProvider(
        { language: 'cmake', scheme: 'file' },
        rangeFormattingProvider
    );

    // Register a command to format the current CMake document
    const formatCommand = vscode.commands.registerCommand(
        'clion-cmake-format.formatDocument',
        async () => {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showWarningMessage('No active editor');
                return;
            }

            if (editor.document.languageId !== 'cmake') {
                vscode.window.showWarningMessage('Current document is not a CMake file');
                return;
            }

            await vscode.commands.executeCommand('editor.action.formatDocument');
        }
    );

    // Register a command to create a default configuration file
    const createConfigCommand = vscode.commands.registerCommand(
        'clion-cmake-format.createConfig',
        async () => {
            let targetPath: string | undefined;

            // Try to get path from active editor
            const editor = vscode.window.activeTextEditor;
            if (editor) {
                const documentPath = editor.document.uri.fsPath;
                const gitRoot = findGitRoot(path.dirname(documentPath));
                if (gitRoot) {
                    targetPath = gitRoot;
                }
            }

            // If no git root found from active editor, try workspace folders
            if (!targetPath) {
                const workspaceFolders = vscode.workspace.workspaceFolders;
                if (workspaceFolders && workspaceFolders.length > 0) {
                    // Check each workspace folder for git root
                    for (const folder of workspaceFolders) {
                        const gitRoot = findGitRoot(folder.uri.fsPath);
                        if (gitRoot) {
                            targetPath = gitRoot;
                            break;
                        }
                    }

                    // If no git root found, use first workspace folder
                    if (!targetPath) {
                        targetPath = workspaceFolders[0].uri.fsPath;
                    }
                } else {
                    vscode.window.showErrorMessage('No workspace folder or active document found');
                    return;
                }
            }

            const configPath = path.join(targetPath, '.cc-format.jsonc');

            // Check if config file already exists
            if (fs.existsSync(configPath)) {
                const overwrite = await vscode.window.showWarningMessage(
                    `Configuration file already exists at ${configPath}`,
                    'Overwrite',
                    'Cancel'
                );
                if (overwrite !== 'Overwrite') {
                    return;
                }
            }

            try {
                // Generate config with default options
                const content = generateSampleConfig(DEFAULT_OPTIONS);
                fs.writeFileSync(configPath, content, 'utf-8');

                // Open the created file
                const doc = await vscode.workspace.openTextDocument(configPath);
                await vscode.window.showTextDocument(doc);

                vscode.window.showInformationMessage(
                    `Configuration file created at ${configPath}`
                );
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Unknown error';
                vscode.window.showErrorMessage(`Failed to create configuration file: ${message}`);
            }
        }
    );

    context.subscriptions.push(
        formattingDisposable,
        rangeFormattingDisposable,
        formatCommand,
        createConfigCommand
    );

    // Log activation
    console.log('CLion CMake Format extension is now active');
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
    // Clear config cache and stop file watchers
    clearConfigCache();
}
