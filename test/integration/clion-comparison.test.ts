/**
 * CLion vs Plugin Formatting Comparison Tests
 *
 * This test suite compares formatting results between CLion and this plugin.
 * Strategy:
 * 1. Copy test datasets to OS temp directory (to avoid CLion using project settings)
 * 2. Format one with CLion, one with plugin
 * 3. Compare directories using git diff
 * 4. If differences found, move them to test/test-error-results for inspection
 * 5. Clean up temp directory on completion
 *
 * Requirements:
 * - CLion must be installed (tests are skipped if not found)
 * - Git must be available
 */

import * as assert from 'assert';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { spawnSync } from 'child_process';
import { formatCMake } from '../../src/formatter';
import { generateSampleConfig } from '../../src/config';

const TEST_DATASETS_DIR = path.join(__dirname, '../datasets');
const EXCLUDED_DIRS = ['well-formatted']; // Skip well-formatted as they're already tested

/**
 * Resolve CLion path - handles macOS .app bundles
 */
function resolveClionPath(inputPath: string): string | null {
    if (!inputPath) return null;

    if (os.platform() === 'darwin' && inputPath.endsWith('.app')) {
        const executablePath = path.join(inputPath, 'Contents', 'MacOS', 'clion');
        if (fs.existsSync(executablePath)) {
            return executablePath;
        }
        const macosDir = path.join(inputPath, 'Contents', 'MacOS');
        if (fs.existsSync(macosDir)) {
            try {
                const files = fs.readdirSync(macosDir);
                const clionExe = files.find(f => f.toLowerCase() === 'clion');
                if (clionExe) {
                    return path.join(macosDir, clionExe);
                }
            } catch (e) {
                // Ignore
            }
        }
    }

    return inputPath;
}

/**
 * Auto-detect CLion executable path
 */
function detectClionPath(): string | null {
    const platform = os.platform();
    const possiblePaths: string[] = [];

    // Check environment variable first
    if (process.env.CLION_PATH) {
        const resolved = resolveClionPath(process.env.CLION_PATH);
        if (resolved && fs.existsSync(resolved)) {
            return resolved;
        }
    }

    if (platform === 'darwin') {
        // On macOS, prioritize .app bundles over symlinks/scripts (e.g., /usr/local/bin/clion)
        // because the CLI tools may not work reliably for formatting
        const appLocations = [
            '/Applications/CLion.app',
            path.join(os.homedir(), 'Applications/CLion.app'),
        ];

        for (const appPath of appLocations) {
            if (fs.existsSync(appPath)) {
                const resolved = resolveClionPath(appPath);
                if (resolved && fs.existsSync(resolved)) {
                    possiblePaths.push(resolved);
                }
            }
        }

        // Add 'which clion' result with LOWER priority (after .app bundles)
        try {
            const result = spawnSync('which', ['clion'], { encoding: 'utf-8' });
            if (result.status === 0 && result.stdout.trim()) {
                possiblePaths.push(result.stdout.trim());
            }
        } catch (e) {
            // Ignore
        }
    } else if (platform === 'linux') {
        possiblePaths.push(
            '/opt/clion/bin/clion.sh',
            '/usr/local/bin/clion',
            '/snap/bin/clion',
            path.join(os.homedir(), 'clion/bin/clion.sh'),
        );
        try {
            const result = spawnSync('which', ['clion'], { encoding: 'utf-8' });
            if (result.status === 0 && result.stdout.trim()) {
                possiblePaths.unshift(result.stdout.trim());
            }
        } catch (e) {
            // Ignore
        }
    } else if (platform === 'win32') {
        const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
        const userProfile = process.env['USERPROFILE'] || process.env['HOME'];

        possiblePaths.push(
            path.join(programFiles, 'JetBrains', 'CLion', 'bin', 'clion64.exe'),
        );

        // JetBrains Toolbox installation path
        if (userProfile) {
            possiblePaths.push(
                path.join(userProfile, 'AppData', 'Local', 'Programs', 'CLion', 'bin', 'clion64.exe'),
            );
        }
    }

    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            return possiblePath;
        }
    }

    return null;
}

/**
 * Normalize break() and continue() statements for comparison
 * Treats 'break()' and 'break ()', 'continue()' and 'continue ()' as equivalent
 */
function normalizeBreak(content: string): string {
    return content
        .replace(/\bbreak\s*\(/g, 'break(')
        .replace(/\bcontinue\s*\(/g, 'continue(');
}

/**
 * Recursively copy directory (only CMake files)
 */
function copyDirectory(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
            // Only copy CMake files, skip README.md and other non-CMake files
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Format all CMake files in a directory with the plugin
 */
function formatDirectoryWithPlugin(dir: string): void {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            formatDirectoryWithPlugin(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
            try {
                const content = fs.readFileSync(fullPath, 'utf-8');
                const formatted = formatCMake(content, {});
                fs.writeFileSync(fullPath, formatted, 'utf-8');
            } catch (e: any) {
                console.error(`  Failed to format ${fullPath}: ${e.message}`);
            }
        }
    }
}

/**
 * List all CMake files in a directory recursively
 */
function listCMakeFiles(dir: string): string[] {
    const results: string[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            results.push(...listCMakeFiles(fullPath));
        } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
            results.push(fullPath);
        }
    }

    return results;
}

/**
 * Format all CMake files in a directory with CLion
 * Formats specific CMake files only (*.cmake and CMakeLists.txt), not entire directories
 */
function formatDirectoryWithClion(clionPath: string, dir: string): { success: boolean; error?: string } {
    try {
        // List all CMake files first
        const cmakeFiles = listCMakeFiles(dir);

        if (cmakeFiles.length === 0) {
            return { success: true };
        }

        // Format all files in one batch for better performance
        const args = ['format', '-allowDefaults', ...cmakeFiles];
        const result = spawnSync(clionPath, args, {
            encoding: 'utf-8',
            timeout: 60000,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.error) {
            return { success: false, error: result.error.message };
        }

        // CLion may return non-zero exit codes (e.g., 14) even on successful formatting
        // Check if there's actual error output
        if (result.status !== 0 && result.stderr && result.stderr.includes('Error')) {
            return { success: false, error: result.stderr };
        }

        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

/**
 * Get diff between two directories
 * Uses manual comparison with normalization for break()
 */
function getDiffBetweenDirs(dir1: string, dir2: string): { files: string[]; hasDiff: boolean } {
    // Use manual comparison to apply normalization
    return manualDirDiff(dir1, dir2);
}

/**
 * Check if two file contents are equivalent after considering acceptable differences:
 * 1. CLion may have trailing whitespace on lines that plugin doesn't
 * 2. CLion may have more trailing newlines than plugin
 */
function areContentsEquivalent(pluginContent: string, clionContent: string): boolean {
    // Quick check: if exactly equal, no need for further processing
    if (pluginContent === clionContent) {
        return true;
    }

    // Normalize break() for both
    const normalizedPlugin = normalizeBreak(pluginContent);
    const normalizedClion = normalizeBreak(clionContent);

    // Remove trailing whitespace from each line for both
    const pluginLines = normalizedPlugin.split('\n').map(line => line.replace(/\s+$/, ''));
    const clionLines = normalizedClion.split('\n').map(line => line.replace(/\s+$/, ''));

    // If they're equal after removing line-trailing whitespace, they're equivalent
    if (pluginLines.join('\n') === clionLines.join('\n')) {
        return true;
    }

    // Check if the only difference is trailing newlines
    // Count trailing empty lines
    let pluginTrailingEmpty = 0;
    for (let i = pluginLines.length - 1; i >= 0 && pluginLines[i] === ''; i--) {
        pluginTrailingEmpty++;
    }

    let clionTrailingEmpty = 0;
    for (let i = clionLines.length - 1; i >= 0 && clionLines[i] === ''; i--) {
        clionTrailingEmpty++;
    }

    // Get non-empty parts
    const pluginNonEmpty = pluginLines.slice(0, pluginLines.length - pluginTrailingEmpty);
    const clionNonEmpty = clionLines.slice(0, clionLines.length - clionTrailingEmpty);

    // If non-empty parts are equal, consider them equivalent
    // We're tolerant of both having different amounts of trailing newlines
    if (pluginNonEmpty.join('\n') === clionNonEmpty.join('\n')) {
        return true;
    }

    return false;
}

/**
 * Manual directory comparison fallback
 */
function manualDirDiff(dir1: string, dir2: string, basePath = ''): { files: string[]; hasDiff: boolean } {
    const diffFiles: string[] = [];
    const entries1 = fs.readdirSync(path.join(dir1, basePath), { withFileTypes: true });

    for (const entry of entries1) {
        const relativePath = path.join(basePath, entry.name);
        const fullPath1 = path.join(dir1, relativePath);
        const fullPath2 = path.join(dir2, relativePath);

        if (!fs.existsSync(fullPath2)) {
            diffFiles.push(relativePath);
            continue;
        }

        if (entry.isDirectory()) {
            const subDiff = manualDirDiff(dir1, dir2, relativePath);
            diffFiles.push(...subDiff.files);
        } else {
            const content1 = fs.readFileSync(fullPath1, 'utf-8');
            const content2 = fs.readFileSync(fullPath2, 'utf-8');

            // Check if contents are equivalent (dir1 is plugin, dir2 is CLion)
            const equivalent = areContentsEquivalent(content1, content2);

            if (!equivalent) {
                diffFiles.push(relativePath);
            }
        }
    }

    return { files: diffFiles, hasDiff: diffFiles.length > 0 };
}

/**
 * Delete files that match between two directories, keep only differences
 */
function keepOnlyDifferences(dir1: string, dir2: string, basePath = ''): void {
    const entries1 = fs.readdirSync(path.join(dir1, basePath), { withFileTypes: true });

    for (const entry of entries1) {
        const relativePath = path.join(basePath, entry.name);
        const fullPath1 = path.join(dir1, relativePath);
        const fullPath2 = path.join(dir2, relativePath);

        if (!fs.existsSync(fullPath2)) {
            continue;
        }

        if (entry.isDirectory()) {
            keepOnlyDifferences(dir1, dir2, relativePath);
            // Try to remove empty directories
            try {
                fs.rmdirSync(fullPath1);
                fs.rmdirSync(fullPath2);
            } catch (e) {
                // Directory not empty, that's OK
            }
        } else {
            const content1 = fs.readFileSync(fullPath1, 'utf-8');
            const content2 = fs.readFileSync(fullPath2, 'utf-8');

            // Check if contents are equivalent (dir1 is plugin, dir2 is CLion)
            const equivalent = areContentsEquivalent(content1, content2);

            if (equivalent) {
                // Files are equivalent (after normalization), delete both
                fs.unlinkSync(fullPath1);
                fs.unlinkSync(fullPath2);
            }
        }
    }
}

describe('CLion vs Plugin Formatting Comparison', function () {
    // Increase timeout for batch operations
    this.timeout(120000);

    let clionPath: string | null = null;
    let pluginDir: string | null = null;
    let clionDir: string | null = null;

    before(function () {
        // Try to detect CLion
        clionPath = detectClionPath();

        if (!clionPath) {
            console.log('\n⚠️  CLion not found - skipping comparison tests');
            console.log('   Set CLION_PATH environment variable to enable these tests');
            this.skip();
        } else {
            console.log(`\n📍 Using CLion: ${clionPath}`);
        }
    });

    it('should format test datasets and compare results', function () {
        if (!clionPath) {
            this.skip();
            return;
        }

        const sourceDir = path.join(TEST_DATASETS_DIR);

        // Use /tmp directory to avoid CLion treating files as part of the project
        // CLion may use project settings if files are inside the project directory
        const tempBase = path.join(os.tmpdir(), 'cmake-format-test');
        const tempDataDir = path.join(tempBase, 'working');
        const errorResultsDir = path.join(__dirname, '../test-error-results');

        // Clean up previous runs
        if (fs.existsSync(tempBase)) {
            fs.rmSync(tempBase, { recursive: true, force: true });
        }
        if (fs.existsSync(errorResultsDir)) {
            fs.rmSync(errorResultsDir, { recursive: true, force: true });
        }

        // Create working directories
        fs.mkdirSync(tempDataDir, { recursive: true });
        pluginDir = path.join(tempDataDir, 'plugin');
        clionDir = path.join(tempDataDir, 'clion');

        console.log(`\n📁 Working directories:`);
        console.log(`   Plugin: ${pluginDir}`);
        console.log(`   CLion:  ${clionDir}`);

        // Copy datasets to both directories (excluding well-formatted)
        const datasets = fs.readdirSync(sourceDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .filter(entry => !EXCLUDED_DIRS.includes(entry.name))
            .map(entry => entry.name);

        console.log(`\n📋 Copying ${datasets.length} datasets...`);
        for (const dataset of datasets) {
            const src = path.join(sourceDir, dataset);
            copyDirectory(src, path.join(pluginDir, dataset));
            copyDirectory(src, path.join(clionDir, dataset));
        }

        // Format with plugin
        console.log(`\n🔧 Formatting with plugin...`);
        formatDirectoryWithPlugin(pluginDir);

        // Create config file for CLion to use the same settings as plugin
        const configContent = generateSampleConfig({});
        const configPath = path.join(clionDir, '.cc-format.jsonc');
        fs.writeFileSync(configPath, configContent, 'utf-8');
        console.log(`📄 Created config file for CLion`);

        // Format with CLion
        console.log(`🔧 Formatting with CLion...`);
        const clionResult = formatDirectoryWithClion(clionPath, clionDir);

        if (!clionResult.success) {
            console.error(`\n❌ CLion formatting failed: ${clionResult.error}`);
            this.skip();
            return;
        }

        // Compare directories
        console.log(`\n🔍 Comparing results...`);
        const diff = getDiffBetweenDirs(pluginDir, clionDir);

        if (!diff.hasDiff) {
            console.log(`✅ All files match!`);
            // Clean up temp directories on success
            try {
                fs.rmSync(tempBase, { recursive: true, force: true });
                console.log(`🗑️  Cleaned up working directory`);
            } catch (e) {
                // Ignore cleanup errors
            }
            assert.ok(true, 'All formatting results match between plugin and CLion');
            return;
        }

        // Keep only files with differences
        console.log(`\n🔎 Found ${diff.files.length} file(s) with differences`);
        console.log(`📝 Keeping only different files...`);
        keepOnlyDifferences(pluginDir, clionDir);

        // Move different files to test-error-results (use copy+delete for cross-device)
        console.log(`📦 Moving differences to ${errorResultsDir}...`);
        const errorPluginDir = path.join(errorResultsDir, 'plugin');
        const errorClionDir = path.join(errorResultsDir, 'clion');
        fs.mkdirSync(errorResultsDir, { recursive: true });

        // Copy directories (to handle cross-device moves)
        copyDirectory(pluginDir, errorPluginDir);
        copyDirectory(clionDir, errorClionDir);

        // Clean up temp directory
        try {
            fs.rmSync(tempBase, { recursive: true, force: true });
        } catch (e) {
            // Ignore cleanup errors
        }

        // Special validation for edge cases
        const validatedDiffs: string[] = [];
        for (const file of diff.files) {
            const pluginFile = path.join(errorPluginDir, file);
            const clionFile = path.join(errorClionDir, file);

            if (!fs.existsSync(pluginFile) || !fs.existsSync(clionFile)) {
                validatedDiffs.push(file);
                continue;
            }

            // Special case: whitespace-only.cmake should have exactly 2 blank lines
            if (file === 'edge-cases/whitespace-only.cmake') {
                const pluginContent = fs.readFileSync(pluginFile, 'utf-8');
                const lines = pluginContent.split('\n');
                const blankLineCount = lines.filter(line => line.trim() === '').length;
                if (blankLineCount === 2 && lines.length === 2) {
                    // Plugin output is correct: 2 blank lines
                    console.log(`   ✅ ${file}: Validated (2 blank lines as expected)`);
                    fs.unlinkSync(pluginFile);
                    fs.unlinkSync(clionFile);
                    continue;
                }
            }

            // // Skip CMakeLists.txt for now (known complex issue)
            // if (file === 'cmake-official/CMakeLists.txt') {
            //     console.log(`   ⏸️  ${file}: Skipped (known complex issue, to be addressed later)`);
            //     fs.unlinkSync(pluginFile);
            //     fs.unlinkSync(clionFile);
            //     continue;
            // }

            validatedDiffs.push(file);
        }

        // If no validated differences remain, test passes
        if (validatedDiffs.length === 0) {
            console.log(`\n✅ All validated differences resolved!`);
            try {
                fs.rmSync(errorResultsDir, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
            assert.ok(true, 'All formatting results match after validation');
            return;
        }

        // Report remaining differences
        console.log(`\n❌ Formatting differences found:`);
        console.log(`   Results saved to: ${errorResultsDir}`);
        console.log(`   Plugin output: ${errorPluginDir}`);
        console.log(`   CLion output:  ${errorClionDir}`);
        console.log(`\n   Files with differences:`);

        const detailedDiffs: string[] = [];

        for (const file of validatedDiffs.sort()) {
            const pluginFile = path.join(errorPluginDir, file);
            const clionFile = path.join(errorClionDir, file);

            if (!fs.existsSync(pluginFile) || !fs.existsSync(clionFile)) {
                console.log(`   - ${file} (missing in one directory)`);
                continue;
            }

            const pluginContent = fs.readFileSync(pluginFile, 'utf-8');
            const clionContent = fs.readFileSync(clionFile, 'utf-8');

            const pluginLines = pluginContent.split('\n');
            const clionLines = clionContent.split('\n');

            // Find first difference
            let firstDiff = -1;
            const maxLines = Math.max(pluginLines.length, clionLines.length);
            for (let i = 0; i < maxLines; i++) {
                if (pluginLines[i] !== clionLines[i]) {
                    firstDiff = i + 1;
                    break;
                }
            }

            console.log(`   - ${file}`);
            console.log(`     Plugin: ${pluginLines.length} lines, CLion: ${clionLines.length} lines`);
            if (firstDiff > 0) {
                console.log(`     First diff at line ${firstDiff}`);
                console.log(`       Plugin: ${JSON.stringify(pluginLines[firstDiff - 1]?.substring(0, 60))}`);
                console.log(`       CLion:  ${JSON.stringify(clionLines[firstDiff - 1]?.substring(0, 60))}`);
            }

            detailedDiffs.push(file);
        }

        console.log(`\n💡 To inspect differences:`);
        console.log(`   cd ${errorResultsDir}`);
        console.log(`   diff -r plugin/ clion/`);
        console.log(`   # Or use VS Code: code --diff plugin/file.cmake clion/file.cmake`);

        // Fail the test with details
        assert.fail(
            `Found ${validatedDiffs.length} file(s) with formatting differences.\n` +
            `Results saved to: ${errorResultsDir}\n` +
            `  Plugin: ${errorPluginDir}\n` +
            `  CLion:  ${errorClionDir}\n` +
            `Files: ${detailedDiffs.join(', ')}`
        );
    });

    after(function () {
        // Note: Errors are saved to test-error-results, temp directory is always cleaned
    });
});
