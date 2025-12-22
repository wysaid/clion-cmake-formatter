import * as fs from 'fs';
import * as path from 'path';
import { formatCMake, DEFAULT_OPTIONS as FORMATTER_DEFAULT_OPTIONS, FormatterOptions } from './formatter';
import { loadConfigFile, findConfigFile } from './config';

export interface ValidationResult {
    ok: boolean;
    filePath: string;
    original: string;
    formatted: string;
    reason?: string;
}

/**
 * Load formatter options for a given document. If a project config file exists it is used.
 */
export function loadOptionsForDocument(documentPath: string, workspaceRoot?: string): FormatterOptions {
    const configPath = findConfigFile(documentPath, workspaceRoot);
    if (configPath) {
        const cfg = loadConfigFile(configPath);
        if (cfg && cfg.options) {
            return { ...FORMATTER_DEFAULT_OPTIONS, ...cfg.options } as FormatterOptions;
        }
    }
    return { ...FORMATTER_DEFAULT_OPTIONS } as FormatterOptions;
}

/**
 * Validate whether a CMake file is already in well-formatted state according to config.
 * Strict comparison is used after normalizing newlines and ensuring trailing newline.
 */
export function validateFile(filePath: string, workspaceRoot?: string): ValidationResult {
    let originalRaw: string;
    try {
        originalRaw = fs.readFileSync(filePath, 'utf-8');
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            ok: false,
            filePath,
            original: '',
            formatted: '',
            reason: `error reading file: ${message}`
        };
    }

    // Normalize input newlines to LF
    let original = originalRaw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    if (!original.endsWith('\n')) {
        original += '\n';
    }

    const options = loadOptionsForDocument(filePath, workspaceRoot);

    const formatted = formatCMake(original, options);

    const ok = formatted === original;
    const result: ValidationResult = {
        ok,
        filePath,
        original,
        formatted
    };

    if (!ok) {
        result.reason = `formatted output differs from original`;
    }

    return result;
}

/**
 * Recursively validate all cmake-like files under a directory using the nearest config in that dataset.
 */
export function validateDirectory(directory: string, workspaceRoot?: string): ValidationResult[] {
    const results: ValidationResult[] = [];

    const entries = fs.readdirSync(directory, { withFileTypes: true });
    for (const e of entries) {
        const full = path.join(directory, e.name);
        if (e.isDirectory()) {
            results.push(...validateDirectory(full, workspaceRoot));
            continue;
        }

        // Skip config files
        if (e.name === '.cc-format.jsonc' || e.name === '.cc-format') { continue; }

        // Consider common cmake filenames
        if (e.name.endsWith('.cmake') || e.name === 'CMakeLists.txt') {
            try {
                results.push(validateFile(full, workspaceRoot));
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                results.push({ ok: false, filePath: full, original: '', formatted: '', reason: `error reading file: ${message}` });
            }
        }
    }

    return results;
}

export default validateFile;
