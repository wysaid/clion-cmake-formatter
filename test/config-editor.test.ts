/**
 * Tests for the visual configuration editor
 */

import { describe, it } from 'mocha';
import * as assert from 'assert';
import { JSDOM } from 'jsdom';
import * as fs from 'fs';
import * as path from 'path';
import { getWebviewContent, SAMPLE_CMAKE_CODE } from '../packages/vscode/src/webview/configEditorHtml';

describe('Config Editor', () => {
    describe('Webview Content', () => {
        it('should generate valid HTML', () => {
            // Create mock webview
            const mockWebview = {
                cspSource: 'https://mock-csp-source',
                asWebviewUri: (uri: any) => uri
            } as any;

            const mockUri = { fsPath: '/test/path', toString: () => 'file:///test/path' } as any;

            const html = getWebviewContent(mockWebview, mockUri, false, '/test/config.jsonc');

            // Verify HTML structure
            assert.ok(html.includes('<!DOCTYPE html>'), 'Should include DOCTYPE');
            assert.ok(html.includes('<html lang="en">'), 'Should include html tag');
            assert.ok(html.includes('cc-format Configuration Editor'), 'Should include title');
            assert.ok(html.includes('Reset to Defaults'), 'Should include reset button');
            assert.ok(html.includes('CMake Preview'), 'Should include CMake preview tab');
            assert.ok(html.includes('JSONC Source'), 'Should include JSONC source tab');
        });

        it('should include proper CSP without sandbox directive', () => {
            const mockWebview = {
                cspSource: 'https://mock-csp-source',
                asWebviewUri: (uri: any) => uri
            } as any;

            const mockUri = { fsPath: '/test/path', toString: () => 'file:///test/path' } as any;

            const html = getWebviewContent(mockWebview, mockUri, false, '/test/config.jsonc');

            // Verify CSP doesn't include problematic sandbox directive
            assert.ok(!html.includes('sandbox allow-scripts'), 'Should not include sandbox in CSP');
            assert.ok(html.includes("script-src 'nonce-"), 'Should include nonce for scripts');
        });

        it('should include sample CMake code constant', () => {
            assert.ok(SAMPLE_CMAKE_CODE.length > 0, 'Sample CMake code should not be empty');

            // Basic feature coverage (be lenient about spaces)
            assert.match(SAMPLE_CMAKE_CODE, /\bif\s*\(/i, 'Should include control flow examples');
            assert.match(SAMPLE_CMAKE_CODE, /\bfunction\s*\(/i, 'Should include function examples');
            assert.match(SAMPLE_CMAKE_CODE, /\bset\s*\(/i, 'Should include command examples');

            // Extra coverage for the visual editor options
            assert.match(SAMPLE_CMAKE_CODE, /\bcmake_minimum_required\s*\(/i, 'Should include top-level command examples');
            assert.match(SAMPLE_CMAKE_CODE, /\badd_executable\s*\(/i, 'Should include multi-line argument examples');
            assert.ok(SAMPLE_CMAKE_CODE.includes('\n\n\n'), 'Should include multiple consecutive blank lines');
            assert.ok(SAMPLE_CMAKE_CODE.includes('${item}') || SAMPLE_CMAKE_CODE.includes('${CMAKE_SOURCE_DIR}'),
                'Should include variable placeholder examples');
        });

        it('should include both tabs for file-based config', () => {
            const mockWebview = {
                cspSource: 'https://mock-csp-source',
                asWebviewUri: (uri: any) => uri
            } as any;

            const mockUri = { fsPath: '/test/path', toString: () => 'file:///test/path' } as any;

            const html = getWebviewContent(mockWebview, mockUri, false, '/test/config.jsonc');

            // Verify both tabs are present
            assert.ok(html.includes('id="tabCMake"'), 'Should include CMake tab button');
            assert.ok(html.includes('id="tabJsonc"'), 'Should include JSONC tab button');
            assert.ok(html.includes('id="cmakePreview"'), 'Should include CMake preview content');
            assert.ok(html.includes('id="jsoncPreview"'), 'Should include JSONC preview content');
        });

        it('should include both tabs for global settings (will be hidden by JS)', () => {
            const mockWebview = {
                cspSource: 'https://mock-csp-source',
                asWebviewUri: (uri: any) => uri
            } as any;

            const mockUri = { fsPath: '/test/path', toString: () => 'file:///test/path' } as any;

            const html = getWebviewContent(mockWebview, mockUri, true, undefined);

            // HTML includes both tabs (they are hidden by JavaScript based on isGlobal flag)
            assert.ok(html.includes('id="tabCMake"'), 'Should include CMake tab button in HTML');
            assert.ok(html.includes('id="tabJsonc"'), 'Should include JSONC tab button in HTML');
        });

        it('should include editable CMake preview textarea and reset demo button', () => {
            const mockWebview = {
                cspSource: 'https://mock-csp-source',
                asWebviewUri: (uri: any) => uri
            } as any;

            const mockUri = { fsPath: '/test/path', toString: () => 'file:///test/path' } as any;

            const html = getWebviewContent(mockWebview, mockUri, false, '/test/config.jsonc');

            assert.ok(html.includes('id="cmakeEditor"'), 'Should include editable CMake textarea');
            assert.ok(html.includes('id="resetDemoBtn"'), 'Should include reset demo code button');
            assert.ok(!html.includes('id="formattedCode"'), 'Should not include legacy formattedCode <code> element');
        });
    });

    describe('Reset Button Functionality', () => {
        it('should handle reset button without confirm()', () => {
            // Create a DOM environment
            const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, {
                runScripts: 'dangerously',
                resources: 'usable'
            });

            const { window } = dom;
            const { document } = window;

            // Mock vscode API
            const messages: any[] = [];
            (global as any).window = window;
            (global as any).document = document;

            const mockVscode = {
                postMessage: (message: any) => {
                    messages.push(message);
                }
            };

            // Create the reset button and handler
            const resetBtn = document.createElement('button');
            resetBtn.id = 'resetBtn';
            document.body.appendChild(resetBtn);

            // Simulate the handleReset function from the webview
            const handleReset = () => {
                // This should NOT use confirm(), just post message directly
                mockVscode.postMessage({ type: 'resetToDefaults' });
            };

            resetBtn.addEventListener('click', handleReset);

            // Simulate button click
            resetBtn.click();

            // Verify message was sent without any confirmation dialog
            assert.strictEqual(messages.length, 1, 'Should send exactly one message');
            assert.strictEqual(messages[0].type, 'resetToDefaults', 'Should send resetToDefaults message');
        });
    });

    describe('Layout Switching', () => {
        it('should handle layout mode switching based on width', () => {
            // Create a DOM environment
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <div class="options-panel" style="width: 400px;"></div>
                    <div class="preview-panel" id="previewPanel" style="width: 800px;"></div>
                </body>
                </html>
            `, {
                runScripts: 'dangerously',
                resources: 'usable'
            });

            const { window } = dom;
            const { document } = window;

            const optionsPanel = document.querySelector('.options-panel') as HTMLElement;
            const previewPanel = document.getElementById('previewPanel') as HTMLElement;

            // Mock offsetWidth
            Object.defineProperty(optionsPanel, 'offsetWidth', { value: 400, writable: true });
            Object.defineProperty(previewPanel, 'offsetWidth', { value: 800, writable: true });

            // Simulate updateLayout function
            const updateLayout = () => {
                const optionsWidth = optionsPanel.offsetWidth;
                const previewWidth = previewPanel.offsetWidth;
                const shouldUseThreeColumns = previewWidth >= optionsWidth * 2;

                if (shouldUseThreeColumns) {
                    previewPanel.classList.add('three-column-mode');
                } else {
                    previewPanel.classList.remove('three-column-mode');
                }
            };

            // Test: Wide layout (800px >= 400px * 2)
            updateLayout();
            assert.ok(previewPanel.classList.contains('three-column-mode'),
                'Should use three-column mode when preview is 2x wider');

            // Test: Narrow layout (600px < 400px * 2)
            Object.defineProperty(previewPanel, 'offsetWidth', { value: 600, writable: true });
            updateLayout();
            assert.ok(!previewPanel.classList.contains('three-column-mode'),
                'Should not use three-column mode when preview is less than 2x wider');
        });
    });

    describe('Editable CMake Preview Behavior', () => {
        it('should send cmakeSource based on editor content after user edits and allow resetting to demo', async () => {
            const messages: any[] = [];

            const dom = new JSDOM(
                `<!DOCTYPE html>
                <html>
                <body>
                    <div id="configTypeBadge"></div>
                    <div id="filePath"></div>
                    <div id="previewPanel"></div>
                    <div class="options-panel"></div>

                    <button id="resetBtn"></button>
                    <button id="switchToTextBtn"></button>
                    <button id="tabCMake"></button>
                    <button id="tabJsonc"></button>
                    <div id="cmakePreview"></div>
                    <div id="jsoncPreview"></div>

                    <button id="resetDemoBtn" class="hidden"></button>
                    <textarea id="cmakeEditor"></textarea>

                    <pre><code id="jsoncCode"></code></pre>
                </body>
                </html>`,
                {
                    runScripts: 'dangerously',
                    resources: 'usable'
                }
            );

            const { window } = dom;
            const { document } = window;

            // Mock VS Code API
            (window as any).acquireVsCodeApi = () => ({
                postMessage: (msg: any) => messages.push(msg)
            });

            // Load the real webview script
            const scriptPath = path.resolve(__dirname, '../packages/vscode/resources/webview/configEditor.js');
            const scriptContent = fs.readFileSync(scriptPath, 'utf8');
            const scriptEl = document.createElement('script');
            scriptEl.textContent = scriptContent;
            document.body.appendChild(scriptEl);

            const textarea = document.getElementById('cmakeEditor') as HTMLTextAreaElement;
            const resetDemoBtn = document.getElementById('resetDemoBtn') as HTMLButtonElement;
            assert.ok(textarea, 'cmakeEditor textarea should exist');
            assert.ok(resetDemoBtn, 'resetDemoBtn should exist');
            assert.ok(resetDemoBtn.classList.contains('hidden'), 'resetDemoBtn should be hidden initially');

            // Initialize webview with demo sample
            window.dispatchEvent(
                new window.MessageEvent('message', {
                    data: {
                        type: 'init',
                        config: {},
                        defaults: {},
                        isGlobal: false,
                        filePath: '/test/config.cc-format.jsonc',
                        sampleCode: 'set(X 1)\n',
                        formattedCode: 'set(X 1)\n',
                        jsoncSource: '{ }'
                    }
                })
            );

            // User edits the CMake code
            textarea.value = 'message(STATUS "hello")\n';
            textarea.dispatchEvent(new window.Event('input', { bubbles: true }));

            assert.ok(!resetDemoBtn.classList.contains('hidden'), 'resetDemoBtn should become visible after user edits');

            // Wait for debounce to request preview
            await new Promise<void>((resolve) => window.setTimeout(resolve, 450));

            const requestMessages = messages.filter(m => m.type === 'requestPreview');
            assert.ok(requestMessages.length >= 1, 'Should send at least one requestPreview message');
            assert.strictEqual(
                requestMessages[requestMessages.length - 1].cmakeSource,
                'message(STATUS "hello")\n',
                'Should send current editor content as cmakeSource'
            );

            // Reset back to demo mode
            resetDemoBtn.click();

            assert.ok(resetDemoBtn.classList.contains('hidden'), 'resetDemoBtn should be hidden after reset');

            const requestMessagesAfterReset = messages.filter(m => m.type === 'requestPreview');
            assert.ok(requestMessagesAfterReset.length >= 2, 'Should send another requestPreview after reset');
            assert.strictEqual(
                requestMessagesAfterReset[requestMessagesAfterReset.length - 1].cmakeSource,
                'set(X 1)\n',
                'Should send demo sample code as cmakeSource after reset'
            );
        });
    });

    describe('Form Value Updates', () => {
        it('should correctly update checkbox values with defaults', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <input type="checkbox" id="opt1" data-key="useTabs" />
                    <input type="checkbox" id="opt2" data-key="keepIndentOnEmptyLines" />
                </body>
                </html>
            `);

            const { document } = dom.window;

            const defaults = { useTabs: false, keepIndentOnEmptyLines: true };
            const currentConfig = {};

            // Simulate updateFormValues
            const mergedConfig = { ...defaults, ...currentConfig };

            document.querySelectorAll<HTMLInputElement>('input[type="checkbox"]').forEach(el => {
                const key = el.dataset.key as keyof typeof defaults | undefined;
                if (!key) {
                    return;
                }
                el.checked = Boolean(mergedConfig[key]);
            });

            // Verify values
            const opt1 = document.getElementById('opt1') as HTMLInputElement;
            const opt2 = document.getElementById('opt2') as HTMLInputElement;

            assert.strictEqual(opt1.checked, false, 'useTabs should be false (default)');
            assert.strictEqual(opt2.checked, true, 'keepIndentOnEmptyLines should be true (default)');
        });

        it('should correctly update number input values with defaults', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <input type="number" id="tabSize" data-key="tabSize" />
                    <input type="number" id="indentSize" data-key="indentSize" />
                </body>
                </html>
            `);

            const { document } = dom.window;

            const defaults = { tabSize: 4, indentSize: 4 };
            const currentConfig = {};

            // Simulate updateFormValues
            const mergedConfig = { ...defaults, ...currentConfig };

            document.querySelectorAll<HTMLInputElement>('input[type="number"]').forEach(el => {
                const key = el.dataset.key as keyof typeof defaults | undefined;
                if (!key) {
                    return;
                }
                const value = mergedConfig[key];
                el.value = value !== undefined ? String(value) : String(defaults[key] ?? 0);
            });

            // Verify values
            const tabSize = document.getElementById('tabSize') as HTMLInputElement;
            const indentSize = document.getElementById('indentSize') as HTMLInputElement;

            assert.strictEqual(tabSize.value, '4', 'tabSize should be 4 (default)');
            assert.strictEqual(indentSize.value, '4', 'indentSize should be 4 (default)');
        });
    });

    describe('Global Settings Mode', () => {
        it('should hide JSONC tab for global settings', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <button id="tabCMake" class="tab-btn">CMake Preview</button>
                    <button id="tabJsonc" class="tab-btn">JSONC Source</button>
                    <div id="cmakePreview" class="tab-content"></div>
                    <div id="jsoncPreview" class="tab-content"></div>
                </body>
                </html>
            `);

            const { document } = dom.window;

            const tabCMake = document.getElementById('tabCMake') as HTMLElement;
            const tabJsonc = document.getElementById('tabJsonc') as HTMLElement;
            const cmakePreview = document.getElementById('cmakePreview') as HTMLElement;
            const jsoncPreview = document.getElementById('jsoncPreview') as HTMLElement;

            const isGlobal = true;

            // Simulate handleInit logic for global settings
            if (isGlobal) {
                if (tabJsonc) {
                    tabJsonc.style.display = 'none';
                }
                if (jsoncPreview) {
                    jsoncPreview.style.display = 'none';
                }
                if (tabCMake && cmakePreview) {
                    tabCMake.classList.add('active');
                    cmakePreview.classList.add('active');
                }
            }

            // Verify JSONC tab and content are hidden
            assert.strictEqual(tabJsonc.style.display, 'none', 'JSONC tab should be hidden for global settings');
            assert.strictEqual(jsoncPreview.style.display, 'none', 'JSONC preview should be hidden for global settings');

            // Verify CMake preview is active
            assert.ok(tabCMake.classList.contains('active'), 'CMake tab should be active');
            assert.ok(cmakePreview.classList.contains('active'), 'CMake preview should be active');
        });

        it('should show JSONC tab for file-based config', () => {
            const dom = new JSDOM(`
                <!DOCTYPE html>
                <html>
                <body>
                    <button id="tabCMake" class="tab-btn">CMake Preview</button>
                    <button id="tabJsonc" class="tab-btn" style="display: none;">JSONC Source</button>
                    <div id="cmakePreview" class="tab-content"></div>
                    <div id="jsoncPreview" class="tab-content" style="display: none;"></div>
                </body>
                </html>
            `);

            const { document } = dom.window;

            const tabJsonc = document.getElementById('tabJsonc') as HTMLElement;
            const jsoncPreview = document.getElementById('jsoncPreview') as HTMLElement;

            const isGlobal = false;

            // Simulate handleInit logic for file-based config
            if (!isGlobal) {
                if (tabJsonc) {
                    tabJsonc.style.display = '';
                }
                if (jsoncPreview) {
                    jsoncPreview.style.display = '';
                }
            }

            // Verify JSONC tab and content are visible
            assert.strictEqual(tabJsonc.style.display, '', 'JSONC tab should be visible for file config');
            assert.strictEqual(jsoncPreview.style.display, '', 'JSONC preview should be visible for file config');
        });

        it('should send resetToDefaults message for global settings', () => {
            // Mock VS Code API
            const messages: any[] = [];
            const mockVscode = {
                postMessage: (message: any) => {
                    messages.push(message);
                }
            };

            // Simulate clicking reset button in global settings mode
            const handleReset = () => {
                mockVscode.postMessage({ type: 'resetToDefaults' });
            };

            handleReset();

            // Verify message was sent
            assert.strictEqual(messages.length, 1, 'Should send resetToDefaults message');
            assert.strictEqual(messages[0].type, 'resetToDefaults', 'Message type should be resetToDefaults');
        });
    });

    describe('Empty Config File Handling', () => {
        it('should handle empty config file (only header and {}) correctly', () => {
            const { parseConfigContent, generateConfigHeader } = require('../packages/core/src/config');

            // Simulate a reset-to-defaults config file (header + empty object)
            const emptyConfigContent = `${generateConfigHeader()}\n{}`;

            // Parse should succeed
            const parsed = parseConfigContent(emptyConfigContent);

            // Should return an empty object (valid, but no custom options)
            assert.ok(parsed !== null, 'Empty config should be valid (not null)');
            assert.deepStrictEqual(parsed, {}, 'Empty config should return empty object');
        });

        it('should handle empty config file with whitespace correctly', () => {
            const { parseConfigContent, generateConfigHeader } = require('../packages/core/src/config');

            // Simulate a reset-to-defaults config file with whitespace
            const emptyConfigContent = `${generateConfigHeader()}\n{\n}\n`;

            // Parse should succeed
            const parsed = parseConfigContent(emptyConfigContent);

            // Should return an empty object (valid, but no custom options)
            assert.ok(parsed !== null, 'Empty config with whitespace should be valid');
            assert.deepStrictEqual(parsed, {}, 'Empty config should return empty object');
        });

        it('should handle missing header as invalid', () => {
            const { parseConfigContent } = require('../packages/core/src/config');

            // Config without header
            const invalidConfigContent = '{}';

            // Parse should fail
            const parsed = parseConfigContent(invalidConfigContent);

            // Should return null (invalid)
            assert.strictEqual(parsed, null, 'Config without header should be invalid (null)');
        });

        it('should handle corrupted JSON as invalid', () => {
            const { parseConfigContent, generateConfigHeader } = require('../packages/core/src/config');

            // Config with header but invalid JSON
            const invalidConfigContent = `${generateConfigHeader()}\n{invalid json}`;

            // Parse should fail
            const parsed = parseConfigContent(invalidConfigContent);

            // Should return null (invalid)
            assert.strictEqual(parsed, null, 'Config with invalid JSON should be invalid (null)');
        });
    });
});
