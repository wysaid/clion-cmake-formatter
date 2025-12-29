/**
 * Unit tests for well-formatted CMake files (well-formatted directory)
 *
 * These tests verify that files which are already well-formatted
 * remain unchanged after formatting with their respective style configuration.
 */

import * as assert from 'assert';
import * as os from 'os';
import { formatCMake } from '@cc-format/core';
import { parseConfigContent } from '@cc-format/core';
import {
    listWellFormatedStyles,
    listWellFormatedFiles,
    loadWellFormated,
    loadWellFormatedConfigForFile
} from './helpers';

/**
 * Convert LF to CRLF
 */
function convertToCRLF(text: string): string {
    return text.replace(/\r?\n/g, '\r\n');
}

/**
 * Normalize line endings to LF for comparison
 */
function normalizeLineEndings(text: string): string {
    return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

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

                // Test CRLF handling only on Windows
                if (os.platform() === 'win32') {
                    it(`should handle CRLF line endings for '${file}'`, () => {
                        // Load the config for this specific file
                        const configContent = loadWellFormatedConfigForFile(style, file);
                        const configOptions = parseConfigContent(configContent);
                        assert.ok(configOptions !== null, `Config file for '${file}' should be valid`);

                        // Load the well-formatted file (LF)
                        const originalLF = loadWellFormated(style, file);

                        // Convert to CRLF
                        const originalCRLF = convertToCRLF(originalLF);

                        // Format the CRLF version
                        const formatted = formatCMake(originalCRLF, configOptions);

                        // The formatter always outputs LF, so we need to normalize for comparison
                        // Both should be equivalent after normalization
                        const normalizedOriginal = normalizeLineEndings(originalCRLF);
                        const normalizedFormatted = normalizeLineEndings(formatted);

                        assert.strictEqual(
                            normalizedFormatted,
                            normalizedOriginal,
                            `File '${file}' with CRLF should format to the same content (after normalizing line endings).\n` +
                            `Expected the formatted output to match the original when both are normalized to LF.`
                        );

                        // Also verify that the formatted output uses LF, not CRLF
                        assert.ok(
                            !formatted.includes('\r'),
                            `Formatted output for '${file}' should use LF line endings, not CRLF`
                        );
                    });
                }
            });
        });
    });
});
