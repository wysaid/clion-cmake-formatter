/**
 * Unit tests for Configuration file support
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
    stripJsonComments,
    parseConfigContent,
    generateConfigHeader,
    generateSampleConfig,
    findConfigFile,
    loadConfigFile,
    getCachedConfig,
    invalidateConfigCache,
    clearConfigCache,
    getConfigForDocument,
    CONFIG_FILE_NAMES,
    PROJECT_URL
} from '../src/config';

describe('Configuration File Support', () => {
    // Create a temporary directory for test files
    let tempDir: string;

    beforeEach(() => {
        tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-format-test-'));
        clearConfigCache();
    });

    afterEach(() => {
        clearConfigCache();
        // Clean up temp directory
        if (fs.existsSync(tempDir)) {
            fs.rmSync(tempDir, { recursive: true, force: true });
        }
    });

    describe('stripJsonComments', () => {
        it('should strip line comments', () => {
            const input = '{\n  // This is a comment\n  "key": "value"\n}';
            const result = stripJsonComments(input);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.key, 'value');
        });

        it('should strip block comments', () => {
            const input = '{\n  /* This is a block comment */\n  "key": "value"\n}';
            const result = stripJsonComments(input);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.key, 'value');
        });

        it('should preserve strings with comment-like content', () => {
            const input = '{"key": "value // not a comment"}';
            const result = stripJsonComments(input);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.key, 'value // not a comment');
        });

        it('should handle escaped quotes in strings', () => {
            const input = '{"key": "value with \\"escaped\\" quotes"}';
            const result = stripJsonComments(input);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.key, 'value with "escaped" quotes');
        });

        it('should handle escaped backslashes before quotes', () => {
            // String ending with backslash: "path\\" followed by // comment
            const input = '{"path": "C:\\\\temp\\\\"} // comment';
            const result = stripJsonComments(input);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.path, 'C:\\temp\\');
        });

        it('should handle mixed comments', () => {
            const input = `{
                // Line comment
                "a": 1, /* inline block */
                /* Multi
                   line */
                "b": 2
            }`;
            const result = stripJsonComments(input);
            const parsed = JSON.parse(result);
            assert.strictEqual(parsed.a, 1);
            assert.strictEqual(parsed.b, 2);
        });

        it('should handle empty content', () => {
            const result = stripJsonComments('');
            assert.strictEqual(result, '');
        });
    });

    describe('generateConfigHeader', () => {
        it('should generate correct header', () => {
            const header = generateConfigHeader();
            assert.ok(header.includes(PROJECT_URL));
            assert.ok(header.startsWith('//'));
        });
    });

    describe('parseConfigContent', () => {
        it('should parse valid config with header', () => {
            const content = `// ${PROJECT_URL}
{
    "indentSize": 2,
    "useTabs": true
}`;
            const result = parseConfigContent(content);
            assert.ok(result !== null);
            assert.strictEqual(result!.indentSize, 2);
            assert.strictEqual(result!.useTabs, true);
        });

        it('should return null for config without valid header', () => {
            const content = `{
    "indentSize": 2
}`;
            const result = parseConfigContent(content);
            assert.strictEqual(result, null);
        });

        it('should parse config with comments', () => {
            const content = `// ${PROJECT_URL}
{
    // Tab settings
    "useTabs": false,
    "tabSize": 4, /* default */
    "indentSize": 4
}`;
            const result = parseConfigContent(content);
            assert.ok(result !== null);
            assert.strictEqual(result!.useTabs, false);
            assert.strictEqual(result!.tabSize, 4);
            assert.strictEqual(result!.indentSize, 4);
        });

        it('should handle all configuration options', () => {
            const content = `// ${PROJECT_URL}
{
    "useTabs": true,
    "tabSize": 2,
    "indentSize": 2,
    "continuationIndentSize": 4,
    "keepIndentOnEmptyLines": true,
    "spaceBeforeCommandDefinitionParentheses": true,
    "spaceBeforeCommandCallParentheses": true,
    "spaceBeforeIfParentheses": false,
    "spaceBeforeForeachParentheses": false,
    "spaceBeforeWhileParentheses": false,
    "spaceInsideCommandDefinitionParentheses": true,
    "spaceInsideCommandCallParentheses": true,
    "spaceInsideIfParentheses": true,
    "spaceInsideForeachParentheses": true,
    "spaceInsideWhileParentheses": true,
    "maxBlankLines": 1,
    "commandCase": "lowercase",
    "lineLength": 80,
    "alignMultiLineArguments": true,
    "alignMultiLineParentheses": true,
    "alignControlFlowParentheses": true
}`;
            const result = parseConfigContent(content);
            assert.ok(result !== null);
            assert.strictEqual(result!.useTabs, true);
            assert.strictEqual(result!.tabSize, 2);
            assert.strictEqual(result!.commandCase, 'lowercase');
            assert.strictEqual(result!.lineLength, 80);
        });

        it('should validate commandCase values', () => {
            const contentValid = `// ${PROJECT_URL}
{ "commandCase": "uppercase" }`;
            const resultValid = parseConfigContent(contentValid);
            assert.strictEqual(resultValid!.commandCase, 'uppercase');

            // Invalid commandCase should be ignored
            const contentInvalid = `// ${PROJECT_URL}
{ "commandCase": "invalid" }`;
            const resultInvalid = parseConfigContent(contentInvalid);
            assert.strictEqual(resultInvalid!.commandCase, undefined);
        });

        it('should ignore whitespace in header comparison', () => {
            const content = `//   ${PROJECT_URL}   
{
    "indentSize": 8
}`;
            const result = parseConfigContent(content);
            assert.ok(result !== null);
            assert.strictEqual(result!.indentSize, 8);
        });
    });

    describe('generateSampleConfig', () => {
        it('should generate valid JSONC', () => {
            const content = generateSampleConfig();
            assert.ok(content.startsWith('// ' + PROJECT_URL));

            // Should be parseable after header removal
            const result = parseConfigContent(content);
            assert.ok(result !== null);
        });

        it('should include all default options', () => {
            const content = generateSampleConfig();
            assert.ok(content.includes('"useTabs"'));
            assert.ok(content.includes('"tabSize"'));
            assert.ok(content.includes('"indentSize"'));
            assert.ok(content.includes('"commandCase"'));
            assert.ok(content.includes('"lineLength"'));
        });

        it('should allow custom options', () => {
            const content = generateSampleConfig({ indentSize: 2, useTabs: true });
            assert.ok(content.includes('"indentSize": 2'));
            assert.ok(content.includes('"useTabs": true'));
        });
    });

    describe('findConfigFile', () => {
        it('should find .cc-format.jsonc in current directory', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{}`);

            const documentPath = path.join(tempDir, 'CMakeLists.txt');
            const found = findConfigFile(documentPath);

            assert.strictEqual(found, configPath);
        });

        it('should find .cc-format in current directory', () => {
            const configPath = path.join(tempDir, '.cc-format');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{}`);

            const documentPath = path.join(tempDir, 'CMakeLists.txt');
            const found = findConfigFile(documentPath);

            assert.strictEqual(found, configPath);
        });

        it('should prefer .cc-format.jsonc over .cc-format', () => {
            const configJsonc = path.join(tempDir, '.cc-format.jsonc');
            const configNoExt = path.join(tempDir, '.cc-format');
            fs.writeFileSync(configJsonc, `// ${PROJECT_URL}\n{"indentSize": 2}`);
            fs.writeFileSync(configNoExt, `// ${PROJECT_URL}\n{"indentSize": 4}`);

            const documentPath = path.join(tempDir, 'CMakeLists.txt');
            const found = findConfigFile(documentPath);

            assert.strictEqual(found, configJsonc);
        });

        it('should find config in parent directory', () => {
            const subDir = path.join(tempDir, 'src');
            fs.mkdirSync(subDir);

            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{}`);

            const documentPath = path.join(subDir, 'CMakeLists.txt');
            const found = findConfigFile(documentPath);

            assert.strictEqual(found, configPath);
        });

        it('should find config in ancestor directory', () => {
            const level1 = path.join(tempDir, 'level1');
            const level2 = path.join(level1, 'level2');
            const level3 = path.join(level2, 'level3');
            fs.mkdirSync(level1);
            fs.mkdirSync(level2);
            fs.mkdirSync(level3);

            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{}`);

            const documentPath = path.join(level3, 'CMakeLists.txt');
            const found = findConfigFile(documentPath);

            assert.strictEqual(found, configPath);
        });

        it('should return null when no config found', () => {
            const documentPath = path.join(tempDir, 'CMakeLists.txt');
            const found = findConfigFile(documentPath, tempDir);

            assert.strictEqual(found, null);
        });

        it('should stop at workspace root', () => {
            // Create config above workspace root
            const parentDir = path.dirname(tempDir);
            const configAbove = path.join(parentDir, '.cc-format.jsonc');
            const configAboveExists = fs.existsSync(configAbove);

            // Don't write to parent if it already exists
            if (!configAboveExists) {
                // Create workspace subdirectory
                const workspaceDir = path.join(tempDir, 'workspace');
                fs.mkdirSync(workspaceDir);

                const documentPath = path.join(workspaceDir, 'CMakeLists.txt');
                const found = findConfigFile(documentPath, workspaceDir);

                assert.strictEqual(found, null);
            }
        });
    });

    describe('loadConfigFile', () => {
        it('should load valid config file', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 8}`);

            const result = loadConfigFile(configPath);

            assert.ok(result !== null);
            assert.strictEqual(result!.filePath, configPath);
            assert.strictEqual(result!.options.indentSize, 8);
            assert.ok(result!.mtime > 0);
        });

        it('should return null for non-existent file', () => {
            const configPath = path.join(tempDir, 'nonexistent.jsonc');
            const result = loadConfigFile(configPath);

            assert.strictEqual(result, null);
        });

        it('should return null for invalid header', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, '{"indentSize": 8}');

            const result = loadConfigFile(configPath);

            assert.strictEqual(result, null);
        });
    });

    describe('getCachedConfig and cache invalidation', () => {
        it('should cache loaded config', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 4}`);

            const result1 = getCachedConfig(configPath);
            const result2 = getCachedConfig(configPath);

            assert.ok(result1 !== null);
            assert.strictEqual(result1, result2); // Same object reference
        });

        it('should invalidate cache when requested', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 4}`);

            const result1 = getCachedConfig(configPath);
            invalidateConfigCache(configPath);

            // Modify file
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 8}`);

            const result2 = getCachedConfig(configPath);

            assert.ok(result1 !== null);
            assert.ok(result2 !== null);
            assert.strictEqual(result1!.options.indentSize, 4);
            assert.strictEqual(result2!.options.indentSize, 8);
        });

        it('should clear all cache', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 4}`);

            getCachedConfig(configPath);
            clearConfigCache();

            // Modify file
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 8}`);

            const result = getCachedConfig(configPath);
            assert.strictEqual(result!.options.indentSize, 8);
        });
    });

    describe('getConfigForDocument', () => {
        it('should return global options when no config file exists', () => {
            const documentPath = path.join(tempDir, 'CMakeLists.txt');
            const globalOptions = { indentSize: 2 };

            const result = getConfigForDocument(documentPath, tempDir, globalOptions);

            assert.strictEqual(result.indentSize, 2);
        });

        it('should merge config file with global options', () => {
            const configPath = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(configPath, `// ${PROJECT_URL}\n{"indentSize": 4}`);

            const documentPath = path.join(tempDir, 'CMakeLists.txt');
            const globalOptions = { indentSize: 2, useTabs: true };

            const result = getConfigForDocument(documentPath, tempDir, globalOptions);

            // Config file overrides global
            assert.strictEqual(result.indentSize, 4);
            // Global option preserved when not in config file
            assert.strictEqual(result.useTabs, true);
        });

        it('should use nearest config file in directory tree', () => {
            const subDir = path.join(tempDir, 'sub');
            fs.mkdirSync(subDir);

            // Config in root
            const rootConfig = path.join(tempDir, '.cc-format.jsonc');
            fs.writeFileSync(rootConfig, `// ${PROJECT_URL}\n{"indentSize": 2}`);

            // Config in subdirectory (should take precedence)
            const subConfig = path.join(subDir, '.cc-format.jsonc');
            fs.writeFileSync(subConfig, `// ${PROJECT_URL}\n{"indentSize": 4}`);

            const documentPath = path.join(subDir, 'CMakeLists.txt');
            const result = getConfigForDocument(documentPath, tempDir, {});

            assert.strictEqual(result.indentSize, 4);
        });
    });

    describe('CONFIG_FILE_NAMES', () => {
        it('should have correct file names', () => {
            assert.ok(CONFIG_FILE_NAMES.includes('.cc-format.jsonc'));
            assert.ok(CONFIG_FILE_NAMES.includes('.cc-format'));
        });

        it('should prioritize .cc-format.jsonc', () => {
            assert.strictEqual(CONFIG_FILE_NAMES[0], '.cc-format.jsonc');
        });
    });
});
