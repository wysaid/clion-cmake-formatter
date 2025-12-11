/**
 * VSCode Extension - CLion CMake Formatter (cc-format)
 *
 * Provides document formatting for CMake files using CLion's formatting style.
 * Supports project-level configuration via .cc-format.jsonc files.
 */

import * as vscode from 'vscode';
import { formatCMake, FormatterOptions, CommandCase } from './formatter';
import { getConfigForDocument, clearConfigCache } from './config';

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
        continuationIndentSize: validateContinuationIndentSize(config.get<number>('continuationIndentSize', 4)),
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
    const vscodeOptions = getVSCodeOptions();

    // Get workspace root for the document
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    const workspaceRoot = workspaceFolder?.uri.fsPath;

    // Get document file path
    const documentPath = document.uri.fsPath;

    // Merge VS Code settings with project configuration file
    return getConfigForDocument(documentPath, workspaceRoot, vscodeOptions);
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
        'clion-cmake-formatter.formatDocument',
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

    context.subscriptions.push(
        formattingDisposable,
        rangeFormattingDisposable,
        formatCommand
    );

    // Log activation
    console.log('CLion CMake Formatter extension is now active');
}

/**
 * Deactivate the extension
 */
export function deactivate(): void {
    // Clear config cache and stop file watchers
    clearConfigCache();
}
