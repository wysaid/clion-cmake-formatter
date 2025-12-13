/**
 * Unit tests for formatting datasets with different style configurations
 *
 * These tests verify that input files from various dataset categories
 * are correctly formatted according to each style configuration,
 * matching the expected output in well-formatted/{style}/{category}/
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { formatCMake } from '../src/formatter';
import { parseConfigContent } from '../src/config';
import { listWellFormatedStyles, loadWellFormatedConfig } from './helpers';

const DATASETS_DIR = path.join(__dirname, 'datasets');
const WELL_FORMATTED_DIR = path.join(DATASETS_DIR, 'well-formatted');

// Categories to test (excluding well-formatted itself)
const INPUT_CATEGORIES = ['basic', 'cmake-official', 'edge-cases', 'formatting', 'parsing', 'real-world'];

/**
 * Recursively find all .cmake files in a directory
 */
function findCMakeFiles(dir: string, basePath: string = dir): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) {
        return results;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            results.push(...findCMakeFiles(fullPath, basePath));
        } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
            const relativePath = path.relative(basePath, fullPath);
            results.push(relativePath);
        }
    }

    return results;
}

/**
 * Load input file content
 */
function loadInputFile(category: string, file: string): string {
    const filePath = path.join(DATASETS_DIR, category, file);
    return fs.readFileSync(filePath, 'utf-8');
}

/**
 * Check if expected output file exists for a style and category
 */
function hasExpectedOutput(style: string, category: string, file: string): boolean {
    const expectedPath = path.join(WELL_FORMATTED_DIR, style, category, file);
    return fs.existsSync(expectedPath);
}

/**
 * Load expected output file content
 */
function loadExpectedOutput(style: string, category: string, file: string): string {
    const expectedPath = path.join(WELL_FORMATTED_DIR, style, category, file);
    return fs.readFileSync(expectedPath, 'utf-8');
}

describe('Dataset Formatting with Different Styles', () => {
    // Get all available styles (including default for consistency)
    const styles = listWellFormatedStyles();

    styles.forEach(style => {
        describe(`Style: ${style}`, () => {
            // Load config for this style
            let config: Record<string, unknown>;

            before(() => {
                const configContent = loadWellFormatedConfig(style);
                const parsedConfig = parseConfigContent(configContent);
                assert.ok(parsedConfig !== null, `Config for style '${style}' should be valid`);
                config = parsedConfig!;
            });

            INPUT_CATEGORIES.forEach(category => {
                describe(`Category: ${category}`, () => {
                    const categoryPath = path.join(DATASETS_DIR, category);
                    const files = findCMakeFiles(categoryPath);

                    files.forEach(file => {
                        // Only test files that have expected output
                        if (hasExpectedOutput(style, category, file)) {
                            it(`should correctly format '${file}'`, () => {
                                const input = loadInputFile(category, file);
                                const expected = loadExpectedOutput(style, category, file);
                                const formatted = formatCMake(input, config);

                                assert.strictEqual(
                                    formatted,
                                    expected,
                                    `Formatting '${category}/${file}' with style '${style}' should match expected output.\n` +
                                    `\n=== INPUT ===\n${JSON.stringify(input)}\n` +
                                    `\n=== EXPECTED ===\n${JSON.stringify(expected)}\n` +
                                    `\n=== ACTUAL ===\n${JSON.stringify(formatted)}`
                                );
                            });
                        }
                    });
                });
            });
        });
    });
});

describe('Formatted Output Idempotency', () => {
    // Get all available styles
    const styles = listWellFormatedStyles();

    styles.forEach(style => {
        describe(`Style: ${style}`, () => {
            // Load config for this style
            let config: Record<string, unknown>;

            before(() => {
                const configContent = loadWellFormatedConfig(style);
                const parsedConfig = parseConfigContent(configContent);
                assert.ok(parsedConfig !== null, `Config for style '${style}' should be valid`);
                config = parsedConfig!;
            });

            INPUT_CATEGORIES.forEach(category => {
                describe(`Category: ${category}`, () => {
                    const categoryPath = path.join(WELL_FORMATTED_DIR, style, category);

                    if (!fs.existsSync(categoryPath)) {
                        return;
                    }

                    const files = findCMakeFiles(categoryPath);

                    files.forEach(file => {
                        it(`should keep '${file}' unchanged after re-formatting`, () => {
                            const expectedPath = path.join(categoryPath, file);
                            const content = fs.readFileSync(expectedPath, 'utf-8');
                            const reformatted = formatCMake(content, config);

                            assert.strictEqual(
                                reformatted,
                                content,
                                `File '${category}/${file}' with style '${style}' should remain unchanged after re-formatting (idempotency check).\n` +
                                `\n=== ORIGINAL ===\n${JSON.stringify(content)}\n` +
                                `\n=== RE-FORMATTED ===\n${JSON.stringify(reformatted)}`
                            );
                        });
                    });
                });
            });
        });
    });
});
