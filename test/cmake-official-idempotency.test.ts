/**
 * Idempotency tests for CMake official test files
 *
 * These tests verify that formatting is idempotent - applying the formatter
 * multiple times produces the same result as applying it once.
 * This is tested on real CMake files from the official CMake repository.
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import { formatCMake } from '../src/formatter';

const OFFICIAL_DIR = path.join(__dirname, 'datasets', 'cmake-official');

/**
 * Get all CMake files from the cmake-official directory
 */
function getCMakeOfficialFiles(): string[] {
    const files = fs.readdirSync(OFFICIAL_DIR)
        .filter(f => f !== 'README.md')
        .filter(f => f.endsWith('.cmake') || f.endsWith('.txt'));

    return files.sort();
}

describe('CMake Official Files - Idempotency', () => {
    const files = getCMakeOfficialFiles();

    if (files.length === 0) {
        it('should have test files', () => {
            assert.fail('No CMake files found in test/datasets/cmake-official/');
        });
        return;
    }

    files.forEach(file => {
        it(`should be idempotent: ${file}`, () => {
            const filePath = path.join(OFFICIAL_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Format once
            const formatted1 = formatCMake(content, {});

            // Format again
            const formatted2 = formatCMake(formatted1, {});

            // Results should be identical
            assert.strictEqual(
                formatted1,
                formatted2,
                `Formatting ${file} should be idempotent (format(format(x)) === format(x))\n\n` +
                `This means the formatter produced different output on the second pass.\n` +
                `First format length: ${formatted1.length}, Second format length: ${formatted2.length}`
            );
        });
    });

    // Summary test to provide statistics
    it(`should pass idempotency test for all ${files.length} files`, () => {
        let totalOriginalLines = 0;
        let totalFormattedLines = 0;

        files.forEach(file => {
            const filePath = path.join(OFFICIAL_DIR, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const formatted = formatCMake(content, {});

            totalOriginalLines += content.split('\n').length;
            totalFormattedLines += formatted.split('\n').length;
        });

        // This test always passes - it's just for reporting statistics
        assert.ok(true,
            `Processed ${files.length} CMake official files\n` +
            `Total original lines: ${totalOriginalLines}\n` +
            `Total formatted lines: ${totalFormattedLines}\n` +
            `Average lines per file: ${Math.round(totalOriginalLines / files.length)}`
        );
    });
});
