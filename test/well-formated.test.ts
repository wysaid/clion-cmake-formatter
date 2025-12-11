/**
 * Unit tests for well-formatted CMake files (well-formated directory)
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
    loadWellFormatedConfig
} from './helpers';

describe('Well-Formatted CMake Files', () => {
    const styles = listWellFormatedStyles();

    styles.forEach(style => {
        describe(`Style: ${style}`, () => {
            // Load the config for this style
            let configOptions: ReturnType<typeof parseConfigContent>;

            before(() => {
                const configContent = loadWellFormatedConfig(style);
                configOptions = parseConfigContent(configContent);
                assert.ok(configOptions !== null, `Config file for style '${style}' should be valid`);
            });

            const files = listWellFormatedFiles(style);

            files.forEach(file => {
                it(`should keep '${file}' unchanged after formatting`, () => {
                    const original = loadWellFormated(style, file);
                    const formatted = formatCMake(original, configOptions!);

                    assert.strictEqual(
                        formatted,
                        original,
                        `File '${file}' should remain unchanged after formatting with '${style}' style.\n` +
                        `\n=== ORIGINAL ===\n${JSON.stringify(original)}\n` +
                        `\n=== FORMATTED ===\n${JSON.stringify(formatted)}`
                    );
                });
            });
        });
    });
});
