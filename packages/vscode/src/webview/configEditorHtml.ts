/**
 * WebView HTML Content Generator for cc-format Configuration Editor
 *
 * Generates the HTML, CSS, and JavaScript for the visual configuration editor.
 */

// Use type-only import to avoid runtime dependency in tests
import type * as vscode from 'vscode';

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
if (bar)
    message("Bar!")
elseif (foo)
    message("boo!")
else (foobar)
    message("Foobar!")
endif (bar)

foreach (VARIABLE \${VARIABLES})
    message(\${VARIABLE})
endforeach ()

while (foo)
    message("bar")
endwhile (foo)

# Command definitions
macro(foo)
    message("bar")
endmacro(foo)

function(foo)
    message("bar")
endfunction(foo)

# Multi-line command example
set(SOURCES
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
)

# Regular command calls
add_executable(myapp \${SOURCES})
target_link_libraries(myapp PRIVATE mylib)
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

    // Generate the options form HTML
    const optionsHtml = generateOptionsHtml();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource} 'unsafe-inline'; script-src 'nonce-${nonce}';">
    <title>cc-format Configuration Editor</title>
    <style>
        ${getStyles()}
    </style>
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
                        <pre class="code-preview"><code id="formattedCode">Loading...</code></pre>
                    </div>
                    <div class="tab-content" id="jsoncPreview" data-title="JSONC Source">
                        <pre class="code-preview jsonc"><code id="jsoncCode">Loading...</code></pre>
                    </div>
                </div>
            </div>
        </main>
    </div>

    <!-- Floating button for switching to text editor (only shown for file-based config) -->
    <button class="floating-switch-btn" id="switchToTextBtn" style="display: none;" title="Switch to Text Editor">
        <span class="btn-icon">📝</span>
        <span class="btn-text">Switch to Text Editor</span>
    </button>

    <script nonce="${nonce}">
        ${getScript()}
    </script>
</body>
</html>`;
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
 * Get CSS styles for the webview
 */
function getStyles(): string {
    return `
        :root {
            --container-padding: 16px;
            --border-radius: 4px;
        }

        * {
            box-sizing: border-box;
        }

        body {
            padding: 0;
            margin: 0;
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            line-height: 1.5;
        }

        .container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            overflow: hidden;
        }

        .header {
            display: flex;
            align-items: center;
            gap: 16px;
            padding: var(--container-padding);
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            flex-wrap: wrap;
        }

        .header h1 {
            margin: 0;
            font-size: 1.2em;
            font-weight: 600;
            color: var(--vscode-foreground);
        }

        .header-info {
            display: flex;
            align-items: center;
            gap: 8px;
            flex: 1;
        }

        .badge {
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 0.85em;
            font-weight: 500;
        }

        .badge.file {
            background-color: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
        }

        .badge.global {
            background-color: var(--vscode-statusBarItem-warningBackground, #856404);
            color: var(--vscode-statusBarItem-warningForeground, #fff);
        }

        .file-path {
            font-family: var(--vscode-editor-font-family);
            font-size: 0.9em;
            color: var(--vscode-descriptionForeground);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .header-actions {
            display: flex;
            gap: 8px;
        }

        .btn {
            padding: 6px 12px;
            border: none;
            border-radius: var(--border-radius);
            cursor: pointer;
            font-size: 0.9em;
            font-family: inherit;
            transition: background-color 0.2s;
        }

        .btn-secondary {
            background-color: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }

        .btn-secondary:hover {
            background-color: var(--vscode-button-secondaryHoverBackground);
        }

        .main {
            display: flex;
            flex: 1;
            overflow: hidden;
        }

        .options-panel {
            width: 400px;
            min-width: 300px;
            max-width: 50%;
            overflow-y: auto;
            padding: var(--container-padding);
            border-right: 1px solid var(--vscode-panel-border);
            background-color: var(--vscode-sideBar-background);
        }

        .options-container {
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .option-group {
            background-color: var(--vscode-editor-background);
            border-radius: var(--border-radius);
            padding: 12px;
            border: 1px solid var(--vscode-panel-border);
        }

        .group-title {
            margin: 0 0 12px 0;
            font-size: 0.95em;
            font-weight: 600;
            color: var(--vscode-sideBarSectionHeader-foreground);
            padding-bottom: 8px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        .group-options {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .option-row {
            display: flex;
            flex-direction: column;
            gap: 2px;
            padding: 4px 0;
        }

        .option-row:hover {
            background-color: var(--vscode-list-hoverBackground);
            margin: 0 -8px;
            padding: 4px 8px;
            border-radius: var(--border-radius);
        }

        .option-label {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
        }

        .checkbox-label {
            position: relative;
            padding-left: 24px;
        }

        .option-checkbox {
            position: absolute;
            opacity: 0;
            cursor: pointer;
        }

        .checkbox-custom {
            position: absolute;
            left: 0;
            top: 50%;
            transform: translateY(-50%);
            width: 16px;
            height: 16px;
            background-color: var(--vscode-checkbox-background);
            border: 1px solid var(--vscode-checkbox-border);
            border-radius: 3px;
        }

        .option-checkbox:checked + .checkbox-custom {
            background-color: var(--vscode-checkbox-selectBackground, var(--vscode-focusBorder));
            border-color: var(--vscode-checkbox-selectBorder, var(--vscode-focusBorder));
        }

        .option-checkbox:checked + .checkbox-custom::after {
            content: '';
            position: absolute;
            left: 5px;
            top: 2px;
            width: 4px;
            height: 8px;
            border: solid var(--vscode-checkbox-foreground, #fff);
            border-width: 0 2px 2px 0;
            transform: rotate(45deg);
        }

        .option-checkbox:focus + .checkbox-custom {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 1px;
        }

        .label-text {
            font-weight: 500;
        }

        .option-desc {
            font-size: 0.85em;
            color: var(--vscode-descriptionForeground);
            padding-left: 24px;
        }

        .number-label,
        .select-label {
            justify-content: space-between;
        }

        .option-number,
        .option-select {
            padding: 4px 8px;
            border: 1px solid var(--vscode-input-border, var(--vscode-panel-border));
            border-radius: var(--border-radius);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            font-family: inherit;
            font-size: inherit;
        }

        .option-number {
            width: 70px;
            text-align: center;
        }

        .option-select {
            min-width: 120px;
        }

        .option-number:focus,
        .option-select:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }

        .preview-panel {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background-color: var(--vscode-editor-background);
        }

        /* Three-column layout mode */
        .preview-panel.three-column-mode {
            flex-direction: row;
        }

        .preview-tabs {
            display: flex;
            gap: 0;
            padding: 0 var(--container-padding);
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
        }

        /* Hide tabs in three-column mode */
        .preview-panel.three-column-mode .preview-tabs {
            display: none;
        }

        /* Hide tabs container when only one tab is intended (global settings) */
        .preview-panel.single-tab .preview-tabs {
            display: none;
        }

        .tab-btn {
            padding: 10px 16px;
            border: none;
            background-color: transparent;
            color: var(--vscode-foreground);
            font-size: 0.9em;
            font-family: inherit;
            cursor: pointer;
            border-bottom: 2px solid transparent;
            opacity: 0.7;
            transition: opacity 0.2s, border-color 0.2s;
        }

        .tab-btn:hover {
            opacity: 1;
            background-color: var(--vscode-list-hoverBackground);
        }

        .tab-btn.active {
            opacity: 1;
            border-bottom-color: var(--vscode-focusBorder);
            color: var(--vscode-textLink-foreground);
        }

        .preview-container {
            flex: 1;
            overflow: hidden;
            position: relative;
        }

        /* Three-column mode: split preview container */
        .preview-panel.three-column-mode .preview-container {
            display: flex;
            flex-direction: row;
            gap: 0;
        }

        .tab-content {
            display: none;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            overflow: auto;
            padding: var(--container-padding);
        }

        .tab-content.active {
            display: block;
        }

        /* Three-column mode: show all tabs side by side */
        .preview-panel.three-column-mode .tab-content {
            display: block;
            position: relative;
            flex: 1;
            border-right: 1px solid var(--vscode-panel-border);
        }

        .preview-panel.three-column-mode .tab-content:last-child {
            border-right: none;
        }

        /* Add titles for three-column mode */
        .tab-content::before {
            content: attr(data-title);
            display: none;
            padding: 8px var(--container-padding);
            background-color: var(--vscode-sideBar-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            font-size: 0.9em;
            font-weight: 500;
            color: var(--vscode-textLink-foreground);
            position: sticky;
            top: 0;
            z-index: 10;
        }

        .preview-panel.three-column-mode .tab-content::before {
            display: block;
        }

        .code-preview {
            margin: 0;
            padding: 12px;
            background-color: var(--vscode-textCodeBlock-background);
            border-radius: var(--border-radius);
            border: 1px solid var(--vscode-panel-border);
            font-family: var(--vscode-editor-font-family);
            font-size: var(--vscode-editor-font-size);
            line-height: 1.6;
            white-space: pre;
            overflow-x: auto;
            tab-size: 4;
        }

        .code-preview code {
            color: var(--vscode-editor-foreground);
        }

        /* Syntax highlighting for CMake */
        .code-preview .comment {
            color: var(--vscode-editorLineNumber-foreground);
        }

        .code-preview .keyword {
            color: var(--vscode-symbolIcon-keywordForeground, #569cd6);
        }

        .code-preview .string {
            color: var(--vscode-debugTokenExpression-string, #ce9178);
        }

        .code-preview .variable {
            color: var(--vscode-debugTokenExpression-name, #9cdcfe);
        }

        /* JSONC syntax highlighting */
        .code-preview.jsonc .json-key {
            color: var(--vscode-symbolIcon-propertyForeground, #9cdcfe);
        }

        .code-preview.jsonc .json-string {
            color: var(--vscode-debugTokenExpression-string, #ce9178);
        }

        .code-preview.jsonc .json-number {
            color: var(--vscode-debugTokenExpression-number, #b5cea8);
        }

        .code-preview.jsonc .json-boolean {
            color: var(--vscode-symbolIcon-keywordForeground, #569cd6);
        }

        .code-preview.jsonc .json-null {
            color: var(--vscode-symbolIcon-keywordForeground, #569cd6);
        }

        .code-preview.jsonc .json-comment {
            color: var(--vscode-editorLineNumber-foreground, #6a9955);
        }

        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
            .btn,
            .option-row {
                transition: none;
            }
        }

        /* Responsive */
        @media (max-width: 800px) {
            .main {
                flex-direction: column;
            }

            .options-panel {
                width: 100%;
                max-width: none;
                max-height: 50%;
                border-right: none;
                border-bottom: 1px solid var(--vscode-panel-border);
            }
        }

        /* Floating switch button */
        .floating-switch-btn {
            position: fixed;
            bottom: 20px;
            right: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 16px;
            background-color: var(--vscode-button-secondaryBackground, #3a3d41);
            color: var(--vscode-button-secondaryForeground, #fff);
            border: 1px solid var(--vscode-button-border, transparent);
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
            transition: background-color 0.2s, transform 0.2s, box-shadow 0.2s;
            z-index: 1000;
        }

        .floating-switch-btn:hover {
            background-color: var(--vscode-button-secondaryHoverBackground, #4a4d51);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        }

        .floating-switch-btn:active {
            transform: translateY(0);
        }

        .floating-switch-btn .btn-icon {
            font-size: 1.1em;
        }

        .floating-switch-btn .btn-text {
            white-space: nowrap;
        }
    `;
}

/**
 * Get JavaScript for the webview
 */
function getScript(): string {
    return `
        (function() {
            const vscode = acquireVsCodeApi();

            // State
            let currentConfig = {};
            let defaults = {};
            let isGlobal = false;
            let debounceTimer = null;

            // DOM elements
            const headerInfo = document.getElementById('headerInfo');
            const configTypeBadge = document.getElementById('configTypeBadge');
            const filePathEl = document.getElementById('filePath');
            const formattedCodeEl = document.getElementById('formattedCode');
            const jsoncCodeEl = document.getElementById('jsoncCode');
            const resetBtn = document.getElementById('resetBtn');
            const switchToTextBtn = document.getElementById('switchToTextBtn');
            const tabCMake = document.getElementById('tabCMake');
            const tabJsonc = document.getElementById('tabJsonc');
            const cmakePreview = document.getElementById('cmakePreview');
            const jsoncPreview = document.getElementById('jsoncPreview');
            const previewPanel = document.getElementById('previewPanel');
            const optionsPanel = document.querySelector('.options-panel');

            // Store file path for switch button
            let currentFilePath = null;
            let currentJsoncSource = '';

            // Initialize
            function init() {
                // Setup event listeners for all inputs
                document.querySelectorAll('.option-checkbox').forEach(el => {
                    el.addEventListener('change', handleCheckboxChange);
                });

                document.querySelectorAll('.option-number').forEach(el => {
                    el.addEventListener('input', handleNumberChange);
                });

                document.querySelectorAll('.option-select').forEach(el => {
                    el.addEventListener('change', handleSelectChange);
                });

                resetBtn.addEventListener('click', handleReset);

                // Setup switch button
                if (switchToTextBtn) {
                    switchToTextBtn.addEventListener('click', handleSwitchToText);
                }

                // Setup tab switching
                if (tabCMake && tabJsonc) {
                    tabCMake.addEventListener('click', () => switchTab('cmake'));
                    tabJsonc.addEventListener('click', () => switchTab('jsonc'));
                }

                // Setup layout monitoring
                setupLayoutMonitoring();
            }

            // Switch between tabs (only in tab mode)
            function switchTab(tab) {
                if (tab === 'cmake') {
                    tabCMake.classList.add('active');
                    tabJsonc.classList.remove('active');
                    cmakePreview.classList.add('active');
                    jsoncPreview.classList.remove('active');
                } else {
                    tabCMake.classList.remove('active');
                    tabJsonc.classList.add('active');
                    cmakePreview.classList.remove('active');
                    jsoncPreview.classList.add('active');
                }
            }

            // Setup layout monitoring for responsive three-column mode
            function setupLayoutMonitoring() {
                if (!previewPanel || !optionsPanel) return;

                // Use ResizeObserver to monitor size changes
                const resizeObserver = new ResizeObserver(() => {
                    updateLayout();
                });

                // Observe both panels
                resizeObserver.observe(previewPanel);
                resizeObserver.observe(optionsPanel);

                // Initial layout update
                updateLayout();
            }

            // Update layout based on available space
            function updateLayout() {
                if (!previewPanel || !optionsPanel) return;

                const optionsWidth = optionsPanel.offsetWidth;
                const previewWidth = previewPanel.offsetWidth;

                // Switch to three-column mode if preview panel is at least 2x the options panel width
                const shouldUseThreeColumns = previewWidth >= optionsWidth * 2;

                if (shouldUseThreeColumns) {
                    previewPanel.classList.add('three-column-mode');
                } else {
                    previewPanel.classList.remove('three-column-mode');
                }
            }

            // Handle incoming messages from extension
            window.addEventListener('message', event => {
                const message = event.data;

                switch (message.type) {
                    case 'init':
                    case 'configUpdated':
                        handleInit(message);
                        break;

                    case 'updatePreview':
                        updatePreview(message.formattedCode);
                        if (message.jsoncSource !== undefined) {
                            updateJsoncPreview(message.jsoncSource);
                        }
                        break;
                }
            });

            // Handle initialization message
            function handleInit(data) {
                currentConfig = data.config || {};
                defaults = data.defaults || {};
                isGlobal = data.isGlobal;
                currentFilePath = data.filePath || null;

                // Update header
                if (isGlobal) {
                    if (previewPanel) {
                        previewPanel.classList.add('single-tab');
                    }
                    configTypeBadge.textContent = 'Global Settings';
                    configTypeBadge.className = 'badge global';
                    filePathEl.textContent = '';
                    // Hide switch button for global settings (VS Code config, no file)
                    if (switchToTextBtn) {
                        switchToTextBtn.style.display = 'none';
                    }
                    // Hide JSONC Source tab for global settings
                    if (tabJsonc) {
                        tabJsonc.style.display = 'none';
                    }
                    if (jsoncPreview) {
                        jsoncPreview.style.display = 'none';
                    }
                    // Ensure CMake preview is active
                    if (tabCMake && cmakePreview) {
                        tabCMake.classList.add('active');
                        cmakePreview.classList.add('active');
                    }
                } else {
                    if (previewPanel) {
                        previewPanel.classList.remove('single-tab');
                    }
                    configTypeBadge.textContent = 'File Config';
                    configTypeBadge.className = 'badge file';
                    filePathEl.textContent = data.filePath || '';
                    // Show switch button for file-based config
                    if (switchToTextBtn && currentFilePath) {
                        switchToTextBtn.style.display = 'flex';
                    }
                    // Show JSONC Source tab for file-based config
                    if (tabJsonc) {
                        tabJsonc.style.display = '';
                    }
                    if (jsoncPreview) {
                        jsoncPreview.style.display = '';
                    }
                }

                // Update form values
                updateFormValues();

                // Update preview
                if (data.formattedCode) {
                    updatePreview(data.formattedCode);
                }

                // Update JSONC source preview
                if (data.jsoncSource !== undefined) {
                    updateJsoncPreview(data.jsoncSource);
                }
            }

            // Update form values from config
            function updateFormValues() {
                const mergedConfig = { ...defaults, ...currentConfig };

                // Update checkboxes
                document.querySelectorAll('.option-checkbox').forEach(el => {
                    const key = el.dataset.key;
                    el.checked = Boolean(mergedConfig[key]);
                });

                // Update numbers
                document.querySelectorAll('.option-number').forEach(el => {
                    const key = el.dataset.key;
                    const value = mergedConfig[key];
                    el.value = value !== undefined ? value : (defaults[key] ?? 0);
                });

                // Update selects
                document.querySelectorAll('.option-select').forEach(el => {
                    const key = el.dataset.key;
                    const value = mergedConfig[key];
                    el.value = value !== undefined ? value : (defaults[key] ?? '');
                });
            }

            // Handle checkbox change
            function handleCheckboxChange(event) {
                const key = event.target.dataset.key;
                const value = event.target.checked;
                updateConfig(key, value);
            }

            // Handle number input change
            function handleNumberChange(event) {
                const key = event.target.dataset.key;
                const value = parseInt(event.target.value, 10);
                if (!isNaN(value)) {
                    updateConfig(key, value);
                }
            }

            // Handle select change
            function handleSelectChange(event) {
                const key = event.target.dataset.key;
                const value = event.target.value;
                updateConfig(key, value);
            }

            // Update config and request preview
            function updateConfig(key, value) {
                currentConfig[key] = value;

                // Send config change to extension
                vscode.postMessage({
                    type: 'configChange',
                    key: key,
                    value: value
                });

                // Debounce preview request
                if (debounceTimer) {
                    clearTimeout(debounceTimer);
                }
                debounceTimer = setTimeout(() => {
                    requestPreview();
                }, 150);
            }

            // Request preview update
            function requestPreview() {
                const mergedConfig = { ...defaults, ...currentConfig };
                vscode.postMessage({
                    type: 'requestPreview',
                    config: mergedConfig
                });
            }

            // Update code preview
            function updatePreview(code) {
                // Apply basic syntax highlighting
                const highlighted = highlightCMake(code);
                formattedCodeEl.innerHTML = highlighted;
            }

            // Basic CMake syntax highlighting
            function highlightCMake(code) {
                // Match comments, strings, and variables with their positions
                const patterns = [
                    { type: 'comment', regex: /#.*$/gm },
                    { type: 'string', regex: /"(?:[^"\\\\]|\\\\.)*"/g },
                    { type: 'variable', regex: /\\$\\{[^}]+\\}/g }
                ];

                // Collect all matches with their positions
                const matches = [];
                patterns.forEach(({ type, regex }) => {
                    let match;
                    const r = new RegExp(regex.source, regex.flags);
                    while ((match = r.exec(code)) !== null) {
                        matches.push({
                            type,
                            start: match.index,
                            end: match.index + match[0].length,
                            text: match[0]
                        });
                    }
                });

                // Sort by position
                matches.sort((a, b) => a.start - b.start);

                // Build result with non-overlapping matches
                let result = '';
                let pos = 0;

                matches.forEach(match => {
                    if (match.start >= pos) {
                        // Add text before match
                        if (match.start > pos) {
                            result += escapeHtml(code.slice(pos, match.start));
                        }
                        // Add highlighted match
                        result += '<span class="' + match.type + '">' + escapeHtml(match.text) + '</span>';
                        pos = match.end;
                    }
                });

                // Add remaining text
                if (pos < code.length) {
                    result += escapeHtml(code.slice(pos));
                }

                // Apply keyword highlighting (avoiding already-tagged content)
                // Split by HTML tags and only highlight text nodes
                const keywords = [
                    'if', 'elseif', 'else', 'endif',
                    'foreach', 'endforeach',
                    'while', 'endwhile',
                    'function', 'endfunction',
                    'macro', 'endmacro',
                    'set', 'message', 'add_executable', 'target_link_libraries',
                    'cmake_minimum_required', 'project', 'add_library',
                    'target_include_directories', 'install', 'find_package'
                ];

                // Match keywords using word boundaries
                const keywordPattern = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'gi');

                // Split by existing HTML tags to avoid double-wrapping
                const parts = result.split(/(<span[^>]*>.*?</span>)/);
                result = parts.map((part, i) => {
                    // Only process non-span parts (even indices)
                    if (i % 2 === 0) {
                        return part.replace(keywordPattern, '<span class="keyword">$1</span>');
                    }
                    return part;
                }).join('');

                return result;
            }

            // Update JSONC source preview
            function updateJsoncPreview(source) {
                currentJsoncSource = source;
                const highlighted = highlightJsonc(source);
                jsoncCodeEl.innerHTML = highlighted;
            }

            // Basic JSONC syntax highlighting
            function highlightJsonc(code) {
                // Patterns for JSONC
                const patterns = [
                    { type: 'json-comment', regex: /\\/\\/.*$/gm },
                    { type: 'json-comment', regex: /\\/\\*[\\s\\S]*?\\*\\//g },
                    { type: 'json-string', regex: /"(?:[^"\\\\]|\\\\.)*"/g }
                ];

                // Collect all matches
                const matches = [];
                patterns.forEach(({ type, regex }) => {
                    let match;
                    const r = new RegExp(regex.source, regex.flags);
                    while ((match = r.exec(code)) !== null) {
                        matches.push({
                            type,
                            start: match.index,
                            end: match.index + match[0].length,
                            text: match[0]
                        });
                    }
                });

                // Sort by position
                matches.sort((a, b) => a.start - b.start);

                // Build result with non-overlapping matches
                let result = '';
                let pos = 0;

                matches.forEach(match => {
                    if (match.start >= pos) {
                        // Add text before match
                        if (match.start > pos) {
                            result += highlightJsoncPrimitives(escapeHtml(code.slice(pos, match.start)));
                        }

                        // Determine if this string is a key or value
                        if (match.type === 'json-string') {
                            // Check if followed by colon (it's a key)
                            const afterMatch = code.slice(match.end).match(/^\\s*:/);
                            if (afterMatch) {
                                result += '<span class="json-key">' + escapeHtml(match.text) + '</span>';
                            } else {
                                result += '<span class="json-string">' + escapeHtml(match.text) + '</span>';
                            }
                        } else {
                            result += '<span class="' + match.type + '">' + escapeHtml(match.text) + '</span>';
                        }
                        pos = match.end;
                    }
                });

                // Add remaining text
                if (pos < code.length) {
                    result += highlightJsoncPrimitives(escapeHtml(code.slice(pos)));
                }

                return result;
            }

            // Highlight JSON primitives (numbers, booleans, null)
            function highlightJsoncPrimitives(text) {
                // Highlight booleans
                text = text.replace(/\\b(true|false)\\b/g, '<span class="json-boolean">$1</span>');
                // Highlight null
                text = text.replace(/\\bnull\\b/g, '<span class="json-null">null</span>');
                // Highlight numbers
                text = text.replace(/\\b(-?\\d+\\.?\\d*(?:[eE][+-]?\\d+)?)\\b/g, '<span class="json-number">$1</span>');
                return text;
            }

            // Escape HTML special characters
            function escapeHtml(text) {
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }

            // Handle reset button
            function handleReset() {
                // Send reset request to extension (confirmation will be shown by VS Code)
                vscode.postMessage({ type: 'resetToDefaults' });
            }

            // Handle switch to text editor button
            function handleSwitchToText() {
                if (currentFilePath) {
                    vscode.postMessage({
                        type: 'switchToTextEditor',
                        filePath: currentFilePath
                    });
                }
            }

            // Initialize when DOM is ready
            init();
        })();
    `;
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
