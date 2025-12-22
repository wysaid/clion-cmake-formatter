/**
 * CLion vs Plugin Formatting Comparison Tests
 *
 * This test suite compares formatting results between CLion and this plugin.
 * Strategy:
 * 1. Copy test datasets to two temporary directories
 * 2. Format one with CLion, one with plugin
 * 3. Compare directories using git diff
 * 4. Keep only files with differences for debugging
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

        try {
            const result = spawnSync('which', ['clion'], { encoding: 'utf-8' });
            if (result.status === 0 && result.stdout.trim()) {
                possiblePaths.unshift(result.stdout.trim());
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
        possiblePaths.push(
            path.join(programFiles, 'JetBrains', 'CLion', 'bin', 'clion64.exe'),
        );
    }

    for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
            return possiblePath;
        }
    }

    return null;
}

/**
 * Recursively copy directory
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
        } else {
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
 * Format all CMake files in a directory with CLion
 */
function formatDirectoryWithClion(clionPath: string, dir: string): { success: boolean; error?: string } {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
            const result = formatDirectoryWithClion(clionPath, fullPath);
            if (!result.success) {
                return result;
            }
        } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
            try {
                const result = spawnSync(clionPath, ['format', '-allowDefaults', fullPath], {
                    encoding: 'utf-8',
                    timeout: 10000,
                    stdio: ['pipe', 'pipe', 'pipe']
                });

                if (result.error) {
                    return { success: false, error: `${fullPath}: ${result.error.message}` };
                }

                if (result.status !== 0) {
                    return { success: false, error: `${fullPath}: ${result.stderr || 'Exit code: ' + result.status}` };
                }
            } catch (e: any) {
                return { success: false, error: `${fullPath}: ${e.message}` };
            }
        }
    }

    return { success: true };
}

/**
 * Get diff between two directories
 */
function getDiffBetweenDirs(dir1: string, dir2: string): { files: string[]; hasDiff: boolean } {
    try {
        // Use git diff --no-index to compare directories
        const result = spawnSync('git', ['diff', '--no-index', '--name-only', dir1, dir2], {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const output = result.stdout.trim();
        if (!output) {
            return { files: [], hasDiff: false };
        }

        // Parse output - git diff --no-index returns paths like: dir1/file or dir2/file
        const files = output.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => {
                // Extract relative path from either dir1 or dir2
                if (line.startsWith(dir1)) {
                    return path.relative(dir1, line);
                } else if (line.startsWith(dir2)) {
                    return path.relative(dir2, line);
                }
                return line;
            })
            .filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates

        return { files, hasDiff: files.length > 0 };
    } catch (e: any) {
        // If git diff fails, fall back to manual comparison
        return manualDirDiff(dir1, dir2);
    }
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
            if (content1 !== content2) {
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
            if (content1 === content2) {
                // Files are identical, delete both
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

        // Create temp directories
        const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-format-test-'));
        pluginDir = path.join(tmpBase, 'plugin');
        clionDir = path.join(tmpBase, 'clion');

        console.log(`\n📁 Test directories:`);
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
            // Clean up temp directories
            try {
                fs.rmSync(tmpBase, { recursive: true, force: true });
            } catch (e) {
                // Ignore cleanup errors
            }
            assert.ok(true, 'All formatting results match between plugin and CLion');
            return;
        }

        // Keep only files with differences
        console.log(`\n🔎 Found ${diff.files.length} file(s) with differences`);
        console.log(`📝 Keeping only different files for inspection...`);
        keepOnlyDifferences(pluginDir, clionDir);

        // Report differences
        console.log(`\n❌ Formatting differences found:`);
        console.log(`   Plugin output: ${pluginDir}`);
        console.log(`   CLion output:  ${clionDir}`);
        console.log(`\n   Files with differences:`);

        const detailedDiffs: string[] = [];

        for (const file of diff.files.sort()) {
            const pluginFile = path.join(pluginDir, file);
            const clionFile = path.join(clionDir, file);

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
        console.log(`   diff -r "${pluginDir}" "${clionDir}"`);
        console.log(`   # Or use your favorite diff tool`);
        console.log(`\n⚠️  Temp directories NOT cleaned up for inspection`);

        // Fail the test with details
        assert.fail(
            `Found ${diff.files.length} file(s) with formatting differences.\n` +
            `Inspect temp directories:\n` +
            `  Plugin: ${pluginDir}\n` +
            `  CLion:  ${clionDir}\n` +
            `Files: ${detailedDiffs.join(', ')}`
        );
    });

    after(function () {
        // Note: We intentionally don't clean up on failure to allow inspection
        // Only clean up on success (which is handled in the test itself)
    });
});
