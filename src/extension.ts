/**
 * VSCode Extension - CLion CMake Formatter
 * 
 * Provides document formatting for CMake files using CLion's formatting style.
 */

import * as vscode from 'vscode';
import { formatCMake, FormatterOptions } from './formatter';

/**
 * Read formatter options from VSCode configuration
 */
function getFormatterOptions(): FormatterOptions {
    const config = vscode.workspace.getConfiguration('clionCMakeFormatter');
    
    return {
        lineLength: config.get<number>('lineLength', 120),
        indentSize: config.get<number>('indentSize', 4),
        useSpaces: config.get<boolean>('useSpaces', true)
    };
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
            const options = getFormatterOptions();
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
            const options = getFormatterOptions();
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
    // Nothing to clean up
}
