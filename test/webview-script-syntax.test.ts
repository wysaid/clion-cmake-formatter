import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';

/**
 * This test guards against accidental JavaScript syntax errors in the generated
 * webview script.
 *
 * Why: The webview HTML is generated via TypeScript template strings. A small
 * escaping bug (especially around regex literals) can cause VS Code DevTools
 * to throw at load time (e.g. "Invalid regular expression flags"), leaving the
 * UI stuck on "Loading".
 */
describe('webview script syntax', () => {
    it('generated webview script compiles (no SyntaxError)', () => {
        const scriptPath = path.join(
            __dirname,
            '..',
            'packages',
            'vscode',
            'resources',
            'webview',
            'configEditor.js'
        );

        const script = fs.readFileSync(scriptPath, 'utf8');
        assert.ok(script.length > 0, 'Expected webview script to be non-empty');

        try {
            // Compile only. If there is a syntax error, this throws.
            // eslint-disable-next-line no-new-func
            new Function(script);
        } catch (e) {
            const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
            assert.fail(`Webview script failed to compile: ${msg}`);
        }
    });
});
