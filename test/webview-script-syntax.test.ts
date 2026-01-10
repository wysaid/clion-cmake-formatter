import * as assert from 'assert';

import { getWebviewContent } from '../packages/vscode/src/webview/configEditorHtml';

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
        const html = getWebviewContent(
            {
                cspSource: 'vscode-webview://test'
            } as any,
            {} as any,
            false
        );

        // Extract inline <script> blocks and compile them without executing.
        const scripts: string[] = [];
        const scriptRe = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
        let m: RegExpExecArray | null;
        while ((m = scriptRe.exec(html))) {
            const body = (m[1] ?? '').trim();
            if (body.length > 0) {
                scripts.push(body);
            }
        }

        assert.ok(scripts.length > 0, 'Expected at least one inline <script> block');

        for (let i = 0; i < scripts.length; i++) {
            try {
                // Compile only. If there is a syntax error, this throws.
                // eslint-disable-next-line no-new-func
                new Function(scripts[i]);
            } catch (e) {
                const msg = e instanceof Error ? `${e.name}: ${e.message}` : String(e);
                assert.fail(`Script block #${i} failed to compile: ${msg}`);
            }
        }
    });
});
