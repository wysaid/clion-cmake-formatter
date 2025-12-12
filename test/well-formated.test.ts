/**
 * Unit tests for well-formatted CMake files (well-formatted directory)
 *
 * These tests verify that files which are already well-formatted
 * remain unchanged after formatting with their respective style configuration.
 */

import * as assert from 'assert';
import { formatCMake } from '../src/formatter';
import { parseConfigContent } from '../src/config';
import {
    listWellFormatedStyles,
    listWellFormatedFiles,
    loadWellFormated,
    loadWellFormatedConfigForFile
} from './helpers';

describe('Well-Formatted CMake Files', () => {
    const styles = listWellFormatedStyles();

    styles.forEach(style => {
        describe(`Style: ${style}`, () => {
            const files = listWellFormatedFiles(style);

            files.forEach(file => {
                it(`should keep '${file}' unchanged after formatting`, () => {
                    // Load the config for this specific file (may be in a subdirectory with its own config)
                    const configContent = loadWellFormatedConfigForFile(style, file);
                    const configOptions = parseConfigContent(configContent);
                    assert.ok(configOptions !== null, `Config file for '${file}' should be valid`);

                    const original = loadWellFormated(style, file);
                    const formatted = formatCMake(original, configOptions);

                    assert.strictEqual(
                        formatted,
                        original,
                        `File '${file}' should remain unchanged after formatting with its directory config.\n` +
                        `\n=== ORIGINAL ===\n${JSON.stringify(original)}\n` +
                        `\n=== FORMATTED ===\n${JSON.stringify(formatted)}`
                    );
                });
            });
        });
    });
});
