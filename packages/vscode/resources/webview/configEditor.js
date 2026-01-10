/* eslint-env browser */
/* global acquireVsCodeApi */

(function () {
    const vscode = acquireVsCodeApi();

    // State
    let currentConfig = {};
    let defaults = {};
    let isGlobal = false;
    let debounceTimer = null;
    let cmakeEditDebounceTimer = null;

    // CMake preview state
    let demoCMakeCode = '';
    let isUsingDemoCMakeCode = true;
    let isApplyingCMakeUpdate = false;

    // DOM elements
    const configTypeBadge = document.getElementById('configTypeBadge');
    const filePathEl = document.getElementById('filePath');
    const cmakeEditorEl = document.getElementById('cmakeEditor');
    const cmakeHighlightedEl = document.getElementById('cmakeHighlighted');
    const cmakeHighlightEl = document.getElementById('cmakeHighlight');
    const resetDemoBtn = document.getElementById('resetDemoBtn');
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

    function init() {
        // Setup event listeners for all inputs
        document.querySelectorAll('.option-checkbox').forEach((el) => {
            el.addEventListener('change', handleCheckboxChange);
        });

        document.querySelectorAll('.option-number').forEach((el) => {
            el.addEventListener('input', handleNumberChange);
        });

        document.querySelectorAll('.option-select').forEach((el) => {
            el.addEventListener('change', handleSelectChange);
        });

        if (resetBtn) {
            resetBtn.addEventListener('click', handleReset);
        }

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

        // Setup editable CMake preview
        if (cmakeEditorEl) {
            cmakeEditorEl.addEventListener('input', handleCMakeEditorInput);
            cmakeEditorEl.addEventListener('scroll', syncCMakeHighlightScroll);
        }
        if (resetDemoBtn) {
            resetDemoBtn.addEventListener('click', handleResetDemoCode);
        }
    }

    function updateCMakeHighlight(code) {
        if (!cmakeHighlightedEl) return;
        cmakeHighlightedEl.innerHTML = highlightCMake(String(code ?? ''));
        syncCMakeHighlightScroll();
    }

    function syncCMakeHighlightScroll() {
        if (!cmakeEditorEl || !cmakeHighlightEl) return;
        cmakeHighlightEl.scrollTop = cmakeEditorEl.scrollTop;
        cmakeHighlightEl.scrollLeft = cmakeEditorEl.scrollLeft;
    }

    // Switch between tabs (only in tab mode)
    function switchTab(tab) {
        if (!tabCMake || !tabJsonc || !cmakePreview || !jsoncPreview) return;

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
        if (!previewPanel || !optionsPanel || typeof ResizeObserver === 'undefined') return;

        const resizeObserver = new ResizeObserver(() => {
            updateLayout();
        });

        resizeObserver.observe(previewPanel);
        resizeObserver.observe(optionsPanel);

        updateLayout();
    }

    function updateLayout() {
        if (!previewPanel || !optionsPanel) return;

        const optionsWidth = optionsPanel.offsetWidth;
        const previewWidth = previewPanel.offsetWidth;

        const shouldUseThreeColumns = previewWidth >= optionsWidth * 2;

        if (shouldUseThreeColumns) {
            previewPanel.classList.add('three-column-mode');
        } else {
            previewPanel.classList.remove('three-column-mode');
        }
    }

    // Handle incoming messages from extension
    window.addEventListener('message', (event) => {
        const message = event.data;

        switch (message.type) {
            case 'init':
                handleInit(message, true);
                break;

            case 'configUpdated':
                handleInit(message, false);
                break;

            case 'updatePreview':
                updatePreview(message.formattedCode);
                if (message.jsoncSource !== undefined) {
                    updateJsoncPreview(message.jsoncSource);
                }
                break;
        }
    });

    function handleInit(data, isFreshInit) {
        currentConfig = data.config || {};
        defaults = data.defaults || {};
        isGlobal = Boolean(data.isGlobal);
        currentFilePath = data.filePath || null;

        if (typeof data.sampleCode === 'string' && data.sampleCode.length > 0) {
            demoCMakeCode = data.sampleCode;
        }

        if (isFreshInit) {
            // Start from the built-in demo code.
            isUsingDemoCMakeCode = true;
            setResetDemoVisible(false);
        }

        if (!configTypeBadge || !filePathEl) return;

        if (isGlobal) {
            if (previewPanel) {
                previewPanel.classList.add('single-tab');
            }

            configTypeBadge.textContent = 'Global Settings';
            configTypeBadge.className = 'badge global';
            filePathEl.textContent = '';

            if (switchToTextBtn) {
                switchToTextBtn.classList.add('hidden');
            }
            if (tabJsonc) {
                tabJsonc.classList.add('hidden');
            }
            if (jsoncPreview) {
                jsoncPreview.classList.add('hidden');
            }
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

            if (switchToTextBtn && currentFilePath) {
                switchToTextBtn.classList.remove('hidden');
            }
            if (tabJsonc) {
                tabJsonc.classList.remove('hidden');
            }
            if (jsoncPreview) {
                jsoncPreview.classList.remove('hidden');
            }
        }

        updateFormValues();

        if (data.formattedCode && (isFreshInit || isUsingDemoCMakeCode)) {
            // On fresh init: show formatted demo output.
            // On configUpdated: only apply if still using demo; don't overwrite user-edited content.
            updatePreview(data.formattedCode);
        } else if (!isFreshInit) {
            // If config changed externally and the user has custom code in the editor,
            // re-format based on the current editor contents.
            requestPreview();
        }

        if (data.jsoncSource !== undefined) {
            updateJsoncPreview(data.jsoncSource);
        }
    }

    function updateFormValues() {
        const mergedConfig = { ...defaults, ...currentConfig };

        document.querySelectorAll('.option-checkbox').forEach((el) => {
            const key = el.dataset.key;
            el.checked = Boolean(mergedConfig[key]);
        });

        document.querySelectorAll('.option-number').forEach((el) => {
            const key = el.dataset.key;
            const value = mergedConfig[key];
            el.value = value !== undefined ? value : (defaults[key] ?? 0);
        });

        document.querySelectorAll('.option-select').forEach((el) => {
            const key = el.dataset.key;
            const value = mergedConfig[key];
            el.value = value !== undefined ? value : (defaults[key] ?? '');
        });
    }

    function handleCheckboxChange(event) {
        const key = event.target.dataset.key;
        const value = event.target.checked;
        updateConfig(key, value);
    }

    function handleNumberChange(event) {
        const key = event.target.dataset.key;
        const value = parseInt(event.target.value, 10);
        if (!isNaN(value)) {
            updateConfig(key, value);
        }
    }

    function handleSelectChange(event) {
        const key = event.target.dataset.key;
        const value = event.target.value;
        updateConfig(key, value);
    }

    function updateConfig(key, value) {
        currentConfig[key] = value;

        vscode.postMessage({
            type: 'configChange',
            key: key,
            value: value,
        });

        if (debounceTimer) {
            clearTimeout(debounceTimer);
        }
        debounceTimer = setTimeout(() => {
            requestPreview();
        }, 150);
    }

    function requestPreview() {
        const mergedConfig = { ...defaults, ...currentConfig };
        const cmakeSource = isUsingDemoCMakeCode
            ? (demoCMakeCode || '')
            : (cmakeEditorEl ? String(cmakeEditorEl.value || '') : '');
        vscode.postMessage({
            type: 'requestPreview',
            config: mergedConfig,
            cmakeSource: cmakeSource,
        });
    }

    function updatePreview(code) {
        if (!cmakeEditorEl) return;
        isApplyingCMakeUpdate = true;
        try {
            cmakeEditorEl.value = String(code || '');
            updateCMakeHighlight(code || '');
        } finally {
            isApplyingCMakeUpdate = false;
        }
    }

    function setResetDemoVisible(visible) {
        if (!resetDemoBtn) return;
        if (visible) {
            resetDemoBtn.classList.remove('hidden');
        } else {
            resetDemoBtn.classList.add('hidden');
        }
    }

    function handleCMakeEditorInput() {
        if (!cmakeEditorEl) return;
        if (isApplyingCMakeUpdate) return;

        // Update syntax highlight immediately for good feedback while typing.
        updateCMakeHighlight(cmakeEditorEl.value);

        // Once the user edits the preview, switch to user-provided mode.
        if (isUsingDemoCMakeCode) {
            isUsingDemoCMakeCode = false;
            setResetDemoVisible(true);
        }

        // Debounced format request so option changes and typing both converge.
        if (cmakeEditDebounceTimer) {
            clearTimeout(cmakeEditDebounceTimer);
        }
        cmakeEditDebounceTimer = setTimeout(() => {
            requestPreview();
        }, 400);
    }

    function handleResetDemoCode() {
        // Return to demo mode and re-render demo sample under current options.
        isUsingDemoCMakeCode = true;
        setResetDemoVisible(false);
        requestPreview();
    }

    function highlightCMake(code) {
        const commentRegex = /#.*$/gm;
        const stringRegex = /"(?:[^"\\]|\\.)*"/g;
        // Match variables like ${VAR} without embedding a TS template interpolation sequence.
        const variableRegex = /[$][{][^}]+[}]/g;

        const patterns = [
            { type: 'comment', regex: commentRegex },
            { type: 'string', regex: stringRegex },
            { type: 'variable', regex: variableRegex },
        ];

        const matches = [];
        patterns.forEach(({ type, regex }) => {
            let match;
            const r = new RegExp(regex.source, regex.flags);
            while ((match = r.exec(code)) !== null) {
                matches.push({
                    type,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                });
            }
        });

        matches.sort((a, b) => a.start - b.start);

        let result = '';
        let pos = 0;

        matches.forEach((match) => {
            if (match.start >= pos) {
                if (match.start > pos) {
                    result += escapeHtml(code.slice(pos, match.start));
                }
                result += '<span class="' + match.type + '">' + escapeHtml(match.text) + '</span>';
                pos = match.end;
            }
        });

        if (pos < code.length) {
            result += escapeHtml(code.slice(pos));
        }

        const keywords = [
            'if',
            'elseif',
            'else',
            'endif',
            'foreach',
            'endforeach',
            'while',
            'endwhile',
            'function',
            'endfunction',
            'macro',
            'endmacro',
            'set',
            'message',
            'add_executable',
            'target_link_libraries',
            'cmake_minimum_required',
            'project',
            'add_library',
            'target_include_directories',
            'install',
            'find_package',
        ];

        const keywordPattern = new RegExp('\\b(' + keywords.join('|') + ')\\b', 'gi');

        const parts = result.split(new RegExp('(<span[^>]*>.*?</span>)'));
        result = parts
            .map((part, i) => {
                if (i % 2 === 0) {
                    return part.replace(keywordPattern, '<span class="keyword">$1</span>');
                }
                return part;
            })
            .join('');

        return result;
    }

    function updateJsoncPreview(source) {
        currentJsoncSource = String(source ?? '');
        if (!jsoncCodeEl) return;
        const highlighted = highlightJsonc(currentJsoncSource);
        jsoncCodeEl.innerHTML = highlighted;
    }

    function highlightJsonc(code) {
        const lineCommentRegex = /\/\/.*$/gm;
        const blockCommentRegex = /\/\*[\s\S]*?\*\//g;
        const stringRegex = /"(?:[^"\\]|\\.)*"/g;

        const patterns = [
            { type: 'json-comment', regex: lineCommentRegex },
            { type: 'json-comment', regex: blockCommentRegex },
            { type: 'json-string', regex: stringRegex },
        ];

        const matches = [];
        patterns.forEach(({ type, regex }) => {
            let match;
            const r = new RegExp(regex.source, regex.flags);
            while ((match = r.exec(code)) !== null) {
                matches.push({
                    type,
                    start: match.index,
                    end: match.index + match[0].length,
                    text: match[0],
                });
            }
        });

        matches.sort((a, b) => a.start - b.start);

        let result = '';
        let pos = 0;

        matches.forEach((match) => {
            if (match.start >= pos) {
                if (match.start > pos) {
                    result += highlightJsoncPrimitives(escapeHtml(code.slice(pos, match.start)));
                }

                if (match.type === 'json-string') {
                    const afterMatch = code.slice(match.end).match(/^\s*:/);
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

        if (pos < code.length) {
            result += highlightJsoncPrimitives(escapeHtml(code.slice(pos)));
        }

        return result;
    }

    function highlightJsoncPrimitives(text) {
        text = text.replace(/\b(true|false)\b/g, '<span class="json-boolean">$1</span>');
        text = text.replace(/\bnull\b/g, '<span class="json-null">null</span>');
        text = text.replace(
            /\b(-?\d+\.?\d*(?:[eE][+-]?\d+)?)\b/g,
            '<span class="json-number">$1</span>'
        );
        return text;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function handleReset() {
        vscode.postMessage({ type: 'resetToDefaults' });
    }

    function handleSwitchToText() {
        if (currentFilePath) {
            vscode.postMessage({
                type: 'switchToTextEditor',
                filePath: currentFilePath,
            });
        }
    }

    init();
})();
