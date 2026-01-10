/**
 * WebView HTML Content Generator for cc-format Configuration Editor
 *
 * Generates the HTML, CSS, and JavaScript for the visual configuration editor.
 */

// Use type-only import to avoid runtime dependency in tests
import type * as vscode from 'vscode';
import * as path from 'node:path';

// Define minimal interface for webview to make testing easier
interface WebviewLike {
    cspSource: string;
    asWebviewUri?: (uri: unknown) => unknown;
}

interface UriLike {
    fsPath?: string;
    toString?: () => string;
}

/**
 * Sample CMake code that demonstrates all formatting options
 */
export const SAMPLE_CMAKE_CODE = `# Control flow examples
cmake_minimum_required ( VERSION 3.25 )

# commandCase demo: intentionally mixed-case commands
PrOjEcT( DemoProject  LANGUAGES  C  CXX )

set ( CMAKE_CXX_STANDARD 20 )

# Blank lines demo (intentionally more than maxBlankLines)



# Control flow demo:
# - spaceBeforeIfParentheses / spaceInsideIfParentheses
# - alignControlFlowParentheses (nested parens + newlines)
if(  (FOO AND BAR)
    OR(BAZ)
   )
    message ( "Inside IF" )
    
    # keepIndentOnEmptyLines demo: the blank line above contains indentation
endif ( )

foreach( item  IN  ITEMS  a  b  c )
    message( "item=\${item}" )
endforeach( )

while ( 0 )
    message("never runs")
endwhile(0)

# Command definitions:
# - spaceBeforeCommandDefinitionParentheses / spaceInsideCommandDefinitionParentheses
macro ( MyMacro  arg1  arg2 )
    message( "macro: \${arg1} \${arg2}" )
endmacro ( MyMacro )

function(MyFunction  x  y)
    message ("function: \${x} \${y}")
endfunction( MyFunction )

# Multi-line arguments + wrapping + continuation indent demo:
# - lineLength (when small)
# - continuationIndentSize
# - alignMultiLineArguments / alignMultiLineParentheses (when implemented)
add_executable( MyApp
    src/main.cpp  src/utils.cpp
    src/parser.cpp
    src/very_long_source_file_name_that_forces_wrapping_when_lineLength_is_small.cpp
)

target_link_libraries ( MyApp
    PRIVATE
        MyLib::Core
        MyLib::Extra
        AnotherVeryLongLibraryTargetNameThatWillWrap
)

# Regular command calls:
# - spaceBeforeCommandCallParentheses / spaceInsideCommandCallParentheses
set( DEFINES
    "-DFOO=1"
    "-DBAR=some value with spaces"
    "-DQUX=\${CMAKE_SOURCE_DIR}/path/with/many/components/that/may/wrap"
)

# Long single-line list to trigger wrapping when lineLength is set
set(VERY_LONG_LIST a b c d e f g h i j k l m n o p q r s t u v w x y z)

# Trailing blank lines demo (intentionally more than maxTrailingBlankLines)


`;

/**
 * Configuration option metadata for UI generation
 */
interface OptionMeta {
    key: string;
    label: string;
    description: string;
    type: 'boolean' | 'number' | 'enum';
    enumValues?: string[];
    min?: number;
    max?: number;
}

/**
 * Configuration option groups
 */
interface OptionGroup {
    title: string;
    options: OptionMeta[];
}

/**
 * All configuration options organized by group
 */
const OPTION_GROUPS: OptionGroup[] = [
    {
        title: 'Tabs and Indentation',
        options: [
            { key: 'useTabs', label: 'Use Tabs', description: 'Use tabs for indentation instead of spaces', type: 'boolean' },
            { key: 'tabSize', label: 'Tab Size', description: 'Number of spaces equivalent to one tab', type: 'number', min: 1, max: 16 },
            { key: 'indentSize', label: 'Indent Size', description: 'Number of spaces for indentation', type: 'number', min: 1, max: 16 },
            { key: 'continuationIndentSize', label: 'Continuation Indent', description: 'Extra indentation for continued lines', type: 'number', min: 1, max: 16 },
            { key: 'keepIndentOnEmptyLines', label: 'Keep Indent on Empty Lines', description: 'Preserve indentation on blank lines', type: 'boolean' }
        ]
    },
    {
        title: 'Spaces - Before Parentheses',
        options: [
            { key: 'spaceBeforeCommandDefinitionParentheses', label: 'Command Definition', description: 'function(), macro()', type: 'boolean' },
            { key: 'spaceBeforeCommandCallParentheses', label: 'Command Call', description: 'Regular command calls', type: 'boolean' },
            { key: 'spaceBeforeIfParentheses', label: 'if Parentheses', description: 'if/elseif/else/endif', type: 'boolean' },
            { key: 'spaceBeforeForeachParentheses', label: 'foreach Parentheses', description: 'foreach/endforeach', type: 'boolean' },
            { key: 'spaceBeforeWhileParentheses', label: 'while Parentheses', description: 'while/endwhile', type: 'boolean' }
        ]
    },
    {
        title: 'Spaces - Within Parentheses',
        options: [
            { key: 'spaceInsideCommandDefinitionParentheses', label: 'Command Definition', description: 'function( ), macro( )', type: 'boolean' },
            { key: 'spaceInsideCommandCallParentheses', label: 'Command Call', description: 'Regular command calls', type: 'boolean' },
            { key: 'spaceInsideIfParentheses', label: 'if Parentheses', description: 'if( )/elseif( )/endif( )', type: 'boolean' },
            { key: 'spaceInsideForeachParentheses', label: 'foreach Parentheses', description: 'foreach( )/endforeach( )', type: 'boolean' },
            { key: 'spaceInsideWhileParentheses', label: 'while Parentheses', description: 'while( )/endwhile( )', type: 'boolean' }
        ]
    },
    {
        title: 'Blank Lines',
        options: [
            { key: 'maxBlankLines', label: 'Max Blank Lines', description: 'Maximum consecutive blank lines', type: 'number', min: 0, max: 20 },
            { key: 'maxTrailingBlankLines', label: 'Max Trailing Blank Lines', description: 'Maximum blank lines at end of file', type: 'number', min: 0, max: 10 }
        ]
    },
    {
        title: 'Other',
        options: [
            { key: 'commandCase', label: 'Command Case', description: 'Force command case', type: 'enum', enumValues: ['unchanged', 'lowercase', 'uppercase'] }
        ]
    },
    {
        title: 'Wrapping and Alignment',
        options: [
            { key: 'lineLength', label: 'Line Length', description: 'Maximum line length (0 = unlimited)', type: 'number', min: 0, max: 500 },
            { key: 'alignMultiLineArguments', label: 'Align Multi-line Arguments', description: 'Align arguments when multi-line', type: 'boolean' },
            { key: 'alignMultiLineParentheses', label: 'Align Multi-line Parentheses', description: 'Align closing paren with opening', type: 'boolean' },
            { key: 'alignControlFlowParentheses', label: 'Align Control Flow Parens', description: 'Align control flow parentheses', type: 'boolean' }
        ]
    }
];

/**
 * Get the webview HTML content
 */
export function getWebviewContent(
    webview: WebviewLike | vscode.Webview,
    _extensionUri: UriLike | vscode.Uri,
    _isGlobal: boolean,
    _filePath?: string
): string {
    // Generate nonce for script security
    const nonce = getNonce();

    // Resolve webview resource URIs (works in VS Code; falls back for tests).
    const { scriptUri, styleUri } = getWebviewResourceUris(webview as WebviewLike, _extensionUri);

    // Generate the options form HTML
    const optionsHtml = generateOptionsHtml();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';">
    <title>cc-format Configuration Editor</title>
    <link rel="stylesheet" href="${styleUri}">
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>cc-format Configuration Editor</h1>
            <div class="header-info" id="headerInfo">
                <span class="badge" id="configTypeBadge">Loading...</span>
                <span class="file-path" id="filePath"></span>
            </div>
            <div class="header-actions">
                <button class="btn btn-secondary" id="resetBtn" title="Reset all options to defaults">
                    Reset to Defaults
                </button>
            </div>
        </header>

        <main class="main">
            <div class="options-panel">
                <div class="options-container">
                    ${optionsHtml}
                </div>
            </div>

            <div class="preview-panel" id="previewPanel">
                <div class="preview-tabs">
                    <button class="tab-btn active" data-tab="cmake" id="tabCMake">CMake Preview</button>
                    <button class="tab-btn" data-tab="jsonc" id="tabJsonc">JSONC Source</button>
                </div>
                <div class="preview-container">
                    <div class="tab-content active" id="cmakePreview" data-title="CMake Preview">
                        <div class="preview-toolbar">
                            <button class="btn btn-secondary btn-small hidden" id="resetDemoBtn" title="Reset demo CMake code">
                                Reset Demo Code
                            </button>
                        </div>
                        <div class="code-editor-wrapper" id="cmakeEditorWrapper">
                            <pre class="code-preview code-highlight" id="cmakeHighlight"><code id="cmakeHighlighted">Loading...</code></pre>
                            <textarea class="code-editor" id="cmakeEditor" spellcheck="false" aria-label="CMake Preview Editor">Loading...</textarea>
                        </div>
                    </div>
                    <div class="tab-content" id="jsoncPreview" data-title="JSONC Source">
                        <pre class="code-preview jsonc"><code id="jsoncCode">Loading...</code></pre>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Floating button for switching to text editor (only shown for file-based config) -->
    <button class="floating-switch-btn hidden" id="switchToTextBtn" title="Switch to Text Editor">
        <span class="btn-icon">📝</span>
        <span class="btn-text">Switch to Text Editor</span>
    </button>

    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

function getWebviewResourceUris(
    webview: WebviewLike,
    extensionUri: UriLike | unknown
): { scriptUri: string; styleUri: string } {
    const resourcesRoot = joinExtensionUri(extensionUri, 'resources', 'webview');

    const script = joinExtensionUri(resourcesRoot, 'configEditor.js');
    const style = joinExtensionUri(resourcesRoot, 'configEditor.css');

    const scriptUri = webview.asWebviewUri ? String(webview.asWebviewUri(script)) : String(script);
    const styleUri = webview.asWebviewUri ? String(webview.asWebviewUri(style)) : String(style);

    return { scriptUri, styleUri };
}

type UriWithPath = {
    path: string;
    with: (change: { path?: string }) => unknown;
};

function isUriWithPath(value: unknown): value is UriWithPath {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const v = value as { path?: unknown; with?: unknown };
    return typeof v.path === 'string' && typeof v.with === 'function';
}

function hasFsPath(value: unknown): value is { fsPath: string } {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const v = value as { fsPath?: unknown };
    return typeof v.fsPath === 'string';
}

function joinExtensionUri(base: unknown, ...pathsToJoin: string[]): unknown {
    // Runtime (VS Code): join via the Uri instance itself, without importing vscode at runtime.
    if (isUriWithPath(base)) {
        const joinedPath = path.posix.join(base.path, ...pathsToJoin);
        return base.with({ path: joinedPath });
    }

    // Test/dev fallback: build a simple filesystem-like path string.
    if (hasFsPath(base)) {
        return path.join(base.fsPath, ...pathsToJoin);
    }

    const baseStr = typeof base === 'string' ? base : String(base);
    return path.posix.join(baseStr, ...pathsToJoin);
}

/**
 * Generate HTML for all option groups
 */
function generateOptionsHtml(): string {
    return OPTION_GROUPS.map(group => `
        <div class="option-group">
            <h3 class="group-title">${escapeHtml(group.title)}</h3>
            <div class="group-options">
                ${group.options.map(opt => generateOptionHtml(opt)).join('\n')}
            </div>
        </div>
    `).join('\n');
}

/**
 * Generate HTML for a single option
 */
function generateOptionHtml(opt: OptionMeta): string {
    const id = `opt-${opt.key}`;

    switch (opt.type) {
        case 'boolean':
            return `
                <div class="option-row" data-key="${opt.key}">
                    <label class="option-label checkbox-label" for="${id}">
                        <input type="checkbox" id="${id}" data-key="${opt.key}" class="option-checkbox">
                        <span class="checkbox-custom"></span>
                        <span class="label-text">${escapeHtml(opt.label)}</span>
                    </label>
                    <span class="option-desc">${escapeHtml(opt.description)}</span>
                </div>
            `;

        case 'number':
            return `
                <div class="option-row" data-key="${opt.key}">
                    <label class="option-label number-label" for="${id}">
                        <span class="label-text">${escapeHtml(opt.label)}</span>
                        <input type="number" id="${id}" data-key="${opt.key}"
                               class="option-number"
                               min="${opt.min ?? 0}"
                               max="${opt.max ?? 100}">
                    </label>
                    <span class="option-desc">${escapeHtml(opt.description)}</span>
                </div>
            `;

        case 'enum': {
            const optionsHtml = (opt.enumValues || []).map(v =>
                `<option value="${escapeHtml(v)}">${escapeHtml(v)}</option>`
            ).join('');
            return `
                <div class="option-row" data-key="${opt.key}">
                    <label class="option-label select-label" for="${id}">
                        <span class="label-text">${escapeHtml(opt.label)}</span>
                        <select id="${id}" data-key="${opt.key}" class="option-select">
                            ${optionsHtml}
                        </select>
                    </label>
                    <span class="option-desc">${escapeHtml(opt.description)}</span>
                </div>
            `;
        }

        default:
            return '';
    }
}

/**
 * Generate a nonce for CSP
 */
function getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
