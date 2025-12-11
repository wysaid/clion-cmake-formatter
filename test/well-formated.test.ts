/**
 * Unit tests for well-formatted CMake files
 * These files should remain unchanged after formatting
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { formatCMake, FormatterOptions } from '../src/formatter';
import { parseConfigContent } from '../src/config';

describe('Well-Formatted Files', () => {
    const wellFormattedDir = path.join(__dirname, 'datasets', 'well-formated');

    /**
     * Helper function to load config from a directory
     */
    function loadConfigFromDir(dirPath: string): Partial<FormatterOptions> | null {
        const configPath = path.join(dirPath, '.cc-format.jsonc');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf-8');
            return parseConfigContent(content);
        }
        return null;
    }

    /**
     * Helper function to get all .cmake files in a directory (non-recursive)
     */
    function getCMakeFiles(dirPath: string): string[] {
        const files = fs.readdirSync(dirPath);
        return files.filter(f => f.endsWith('.cmake'));
    }

    /**
     * Helper function to test that formatting produces identical output
     */
    function testIdempotent(filePath: string, options: Partial<FormatterOptions> | null) {
        const input = fs.readFileSync(filePath, 'utf-8');
        const output = formatCMake(input, options || {});

        assert.strictEqual(
            output,
            input,
            `File should remain unchanged after formatting: ${path.basename(filePath)}\n` +
            `Expected:\n${input}\n` +
            `Got:\n${output}`
        );
    }

    describe('Default Configuration', () => {
        const defaultDir = path.join(wellFormattedDir, 'default');
        let config: Partial<FormatterOptions> | null;

        before(() => {
            config = loadConfigFromDir(defaultDir);
            assert.ok(config !== null, 'Should have config file in default directory');
        });

        it('should have valid config file', () => {
            assert.ok(config);
            assert.strictEqual(config.useTabs, false);
            assert.strictEqual(config.tabSize, 4);
            assert.strictEqual(config.indentSize, 4);
            assert.strictEqual(config.commandCase, 'unchanged');
        });

        it('should keep blank-lines.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'blank-lines.cmake');
            testIdempotent(filePath, config);
        });

        it('should keep command-case.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'command-case.cmake');
            testIdempotent(filePath, config);
        });

        it('should keep cross-platform-demo.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'cross-platform-demo.cmake');
            testIdempotent(filePath, config);
        });

        it('should keep spaces.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'spaces.cmake');
            testIdempotent(filePath, config);
        });

        it('should keep tabs-and-indents.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'tabs-and-indents.cmake');
            testIdempotent(filePath, config);
        });

        it('should keep version.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'version.cmake');
            testIdempotent(filePath, config);
        });

        it('should keep wrapping-and-braces.cmake unchanged', () => {
            const filePath = path.join(defaultDir, 'wrapping-and-braces.cmake');
            testIdempotent(filePath, config);
        });
    });

    describe('All Well-Formatted Files (Dynamic)', () => {
        it('should find all well-formatted test directories', () => {
            const dirs = fs.readdirSync(wellFormattedDir)
                .filter(f => fs.statSync(path.join(wellFormattedDir, f)).isDirectory());

            assert.ok(dirs.length > 0, 'Should have at least one test directory');
            assert.ok(dirs.includes('default'), 'Should have default directory');
        });

        it('should keep all files in default directory unchanged', () => {
            const defaultDir = path.join(wellFormattedDir, 'default');
            const config = loadConfigFromDir(defaultDir);
            const files = getCMakeFiles(defaultDir);

            assert.ok(files.length > 0, 'Should have at least one .cmake file in default directory');

            files.forEach(filename => {
                const filePath = path.join(defaultDir, filename);
                testIdempotent(filePath, config);
            });
        });

        it('should test each subdirectory with its own config', () => {
            const dirs = fs.readdirSync(wellFormattedDir)
                .filter(f => {
                    const fullPath = path.join(wellFormattedDir, f);
                    return fs.statSync(fullPath).isDirectory();
                });

            dirs.forEach(dir => {
                const dirPath = path.join(wellFormattedDir, dir);
                const config = loadConfigFromDir(dirPath);
                const files = getCMakeFiles(dirPath);

                if (files.length > 0) {
                    files.forEach(filename => {
                        const filePath = path.join(dirPath, filename);
                        // Test that file remains unchanged
                        const input = fs.readFileSync(filePath, 'utf-8');
                        const output = formatCMake(input, config || {});

                        assert.strictEqual(
                            output,
                            input,
                            `File should remain unchanged: ${dir}/${filename}`
                        );
                    });
                }
            });
        });
    });

    describe('Idempotency Check', () => {
        it('should produce identical output when formatting twice', () => {
            const defaultDir = path.join(wellFormattedDir, 'default');
            const config = loadConfigFromDir(defaultDir);
            const files = getCMakeFiles(defaultDir);

            files.forEach(filename => {
                const filePath = path.join(defaultDir, filename);
                const input = fs.readFileSync(filePath, 'utf-8');

                const output1 = formatCMake(input, config || {});
                const output2 = formatCMake(output1, config || {});

                assert.strictEqual(
                    output2,
                    output1,
                    `Formatting should be idempotent for ${filename}`
                );
            });
        });
    });
});
