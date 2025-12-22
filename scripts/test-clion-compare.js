#!/usr/bin/env node

/**
 * Compare formatting results between CLion and this plugin
 *
 * This script:
 * 1. Formats test files in-place using CLion's command-line formatter
 * 2. Uses `git diff` to detect any changes
 * 3. Reports files that differ from CLion's formatting
 * 4. Restores files to original state after testing
 *
 * Usage:
 *   node scripts/test-clion-compare.js [options]
 *
 * Options:
 *   --clion-path <path>   Path to CLion executable (auto-detected if not set)
 *   --test-dir <path>     Directory containing test files (default: test/datasets/well-formatted/default)
 *   --file <name>         Test a specific file only
 *   --no-restore          Don't restore files after testing (keep CLion formatted version)
 *   --verbose             Show detailed diff output
 *   --help                Show this help message
 *
 * Environment:
 *   CLION_PATH            Path to CLion executable (alternative to --clion-path)
 *
 * Requirements:
 *   - CLion must be installed
 *   - Git must be available
 */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    clionPath: process.env.CLION_PATH || null,
    testDir: path.join(__dirname, '../test/datasets/well-formatted/default'),
    file: null,
    restore: false,
    verbose: false,
    help: false
};

for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
        case '--clion-path':
            options.clionPath = args[++i];
            break;
        case '--test-dir':
            options.testDir = args[++i];
            break;
        case '--file':
            options.file = args[++i];
            break;
        case '--restore':
            options.restore = true;
            break;
        case '--verbose':
            options.verbose = true;
            break;
        case '--help':
        case '-h':
            options.help = true;
            break;
    }
}

if (options.help) {
    console.log(`
CLion vs Plugin Formatter Comparison Test

This test formats files using CLion and checks for differences using git diff.
Test files should already be correctly formatted - any change indicates a mismatch.

Usage:
  node scripts/test-clion-compare.js [options]

Options:
  --clion-path <path>   Path to CLion executable (auto-detected if not set)
  --test-dir <path>     Directory containing test files
                        (default: test/datasets/well-formatted/default)
  --file <name>         Test a specific file only
  --restore             Restore files after testing (default: keep CLion formatted version)
  --verbose             Show detailed diff output
  --help                Show this help message

Environment:
  CLION_PATH            Path to CLion executable (alternative to --clion-path)

Examples:
  # Run all tests with auto-detected CLion
  node scripts/test-clion-compare.js

  # Test a specific file
  node scripts/test-clion-compare.js --file simple-command.cmake

  # Restore files after testing
  node scripts/test-clion-compare.js --restore --verbose
`);
    process.exit(0);
}

/**
 * Resolve CLion path - handles macOS .app bundles
 */
function resolveClionPath(inputPath) {
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
 * Auto-detect CLion executable path based on platform
 */
function detectClionPath() {
    const platform = os.platform();
    const possiblePaths = [];

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
 * Format a file using CLion command-line formatter (in-place)
 */
function formatWithClion(clionPath, filePath) {
    try {
        const result = spawnSync(clionPath, ['format', '-allowDefaults', filePath], {
            encoding: 'utf-8',
            timeout: 60000,
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.error) {
            return { success: false, error: result.error.message };
        }

        if (result.status !== 0) {
            return { success: false, error: result.stderr || `Exit code: ${result.status}` };
        }

        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

/**
 * Check if a file has uncommitted changes using git diff
 */
function checkGitDiff(filePath) {
    try {
        const result = spawnSync('git', ['diff', '--', filePath], {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const diff = result.stdout.trim();
        return {
            changed: diff.length > 0,
            diff: diff
        };
    } catch (e) {
        return { changed: false, error: e.message };
    }
}

/**
 * Restore a file to its git HEAD state
 */
function restoreFile(filePath) {
    try {
        spawnSync('git', ['checkout', '--', filePath], {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });
    } catch (e) {
        console.error(`  Warning: Failed to restore ${filePath}: ${e.message}`);
    }
}

/**
 * Check if a directory has uncommitted changes
 */
function checkDirectoryClean(dirPath) {
    try {
        const result = spawnSync('git', ['status', '--porcelain', '--', dirPath], {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const output = result.stdout.trim();
        return {
            clean: output.length === 0,
            changes: output
        };
    } catch (e) {
        return { clean: false, error: e.message };
    }
}

/**
 * List all cmake files in a directory (recursively)
 */
function listCMakeFiles(dir) {
    const results = [];

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                results.push(...listCMakeFiles(fullPath));
            } else if (entry.isFile() && entry.name.endsWith('.cmake')) {
                results.push(fullPath);
            }
        }
    } catch (e) {
        console.error(`Error reading directory ${dir}: ${e.message}`);
    }

    return results;
}

// ============================================================
// Main execution
// ============================================================

console.log('============================================================');
console.log('CLion Formatter Comparison Test');
console.log('============================================================');

// Detect or validate CLion path
let clionPath = options.clionPath;
const userProvidedPath = clionPath; // Save original user input for error reporting

if (clionPath) {
    clionPath = resolveClionPath(clionPath);

    // Check if user-provided path exists
    if (!fs.existsSync(clionPath)) {
        console.error(`❌ User-provided CLion path not found: ${userProvidedPath}`);
        if (userProvidedPath !== clionPath) {
            console.error(`   (resolved to: ${clionPath})`);
        }
        console.log('🔍 Attempting auto-detection...\n');
        clionPath = null; // Reset to trigger auto-detection
    }
}

if (!clionPath) {
    if (!userProvidedPath) {
        console.log('🔍 Auto-detecting CLion path...');
    }
    clionPath = detectClionPath();
}

if (!clionPath) {
    console.error(`
❌ CLion not found. Please specify the path using one of:
   - --clion-path <path> argument
   - CLION_PATH environment variable

   Example paths:
   - macOS: /Applications/CLion.app
   - Linux: /opt/clion/bin/clion.sh or /snap/bin/clion
   - Windows: C:\\Program Files\\JetBrains\\CLion\\bin\\clion64.exe
`);
    process.exit(1);
}

console.log(`📍 CLion path: ${clionPath}`);

// Check git is available
try {
    spawnSync('git', ['--version'], { encoding: 'utf-8' });
} catch (e) {
    console.error('❌ Git is not available. This test requires git.');
    process.exit(1);
}

// Check if test directory is clean (no uncommitted changes)
const dirClean = checkDirectoryClean(options.testDir);
if (!dirClean.clean) {
    console.error(`
❌ Test directory has uncommitted changes!
`);
    if (dirClean.changes) {
        console.error('Modified files:');
        const lines = dirClean.changes.split('\n').slice(0, 10);
        for (const line of lines) {
            console.error(`   ${line}`);
        }
        if (dirClean.changes.split('\n').length > 10) {
            console.error('   ... (and more)');
        }
    }
    console.error(`
Please commit or restore the test files before running this test.
You can restore files with:
   git checkout -- ${options.testDir}
`);
    process.exit(1);
}

// Get test files
let testFiles;
if (options.file) {
    const specificFile = path.join(options.testDir, options.file);
    if (!fs.existsSync(specificFile)) {
        console.error(`❌ Test file not found: ${specificFile}`);
        process.exit(1);
    }
    testFiles = [specificFile];
} else {
    testFiles = listCMakeFiles(options.testDir);
}

if (testFiles.length === 0) {
    console.error(`❌ No cmake files found in: ${options.testDir}`);
    process.exit(1);
}

console.log(`📁 Found ${testFiles.length} test file(s)`);
console.log(`📂 Test directory: ${options.testDir}`);
console.log('');

// Track results
const results = {
    passed: [],
    failed: [],
    errors: []
};

// Test each file
for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    const relativePath = path.relative(options.testDir, testFile);

    process.stdout.write(`[${i + 1}/${testFiles.length}] ${relativePath}... `);

    // Format with CLion (in-place)
    const formatResult = formatWithClion(clionPath, testFile);
    if (!formatResult.success) {
        console.log(`⚠️  CLion format failed: ${formatResult.error}`);
        results.errors.push({ file: relativePath, error: formatResult.error });
        continue;
    }

    // Check git diff
    const diffResult = checkGitDiff(testFile);

    if (diffResult.changed) {
        console.log('❌ DIFFER');
        results.failed.push({
            file: relativePath,
            fullPath: testFile,
            diff: diffResult.diff
        });

        if (options.verbose) {
            console.log('   Diff:');
            const diffLines = diffResult.diff.split('\n').slice(0, 20);
            for (const line of diffLines) {
                console.log(`   ${line}`);
            }
            if (diffResult.diff.split('\n').length > 20) {
                console.log('   ... (truncated)');
            }
        }
    } else {
        console.log('✅ MATCH');
        results.passed.push({ file: relativePath });
    }
}

// Summary
console.log('\n============================================================');
console.log('Summary');
console.log('============================================================');
console.log(`✅ Matched: ${results.passed.length}/${testFiles.length}`);
console.log(`❌ Differed: ${results.failed.length}/${testFiles.length}`);
console.log(`⚠️  Errors: ${results.errors.length}/${testFiles.length}`);

// Show failed files
if (results.failed.length > 0) {
    console.log('\n❌ Files with differences (CLion formatted differently):');
    for (const { file } of results.failed) {
        console.log(`   ${file}`);
    }
    console.log('\n   Run with --verbose to see diffs, or use:');
    console.log('   git diff test/datasets/well-formatted/default/');
}

// Show errors
if (results.errors.length > 0) {
    console.log('\n⚠️  Files with errors:');
    for (const { file, error } of results.errors) {
        console.log(`   ${file}: ${error}`);
    }
}

// Restore files if requested
if (options.restore && (results.failed.length > 0 || results.errors.length > 0)) {
    console.log('\n🔄 Restoring modified files...');
    for (const { fullPath } of results.failed) {
        restoreFile(fullPath);
    }
    console.log('   Files restored to original state.');
} else if (!options.restore && results.failed.length > 0) {
    console.log('\n📝 Files left in CLion-formatted state.');
    console.log('   Review changes with: git diff');
    console.log('   Restore all with: git checkout -- test/datasets/well-formatted/default/');
    console.log('   Or run with --restore to auto-restore.');
}

// Exit with appropriate code
const exitCode = results.failed.length + results.errors.length;
if (exitCode === 0) {
    console.log('\n🎉 All tests passed! Files match CLion formatting.');
}
process.exit(exitCode);
