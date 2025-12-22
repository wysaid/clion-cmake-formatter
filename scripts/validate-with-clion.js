#!/usr/bin/env node

/**
 * Validate test datasets against CLion's formatting standard
 *
 * This script verifies that test files are correctly formatted according to CLion's formatter.
 * It does NOT compare plugin output with CLion - for that, see test/integration/clion-comparison.test.ts
 *
 * This script:
 * 1. Lists all CMake files (*.cmake and CMakeLists.txt) in the test directory
 * 2. Formats them using CLion's command-line formatter (batch mode)
 * 3. Uses `git diff` to detect any changes
 * 4. Reports files that differ from CLion's formatting standard
 * 5. Optionally restores files to original state after testing
 *
 * Note: Only CMake files are formatted - other files like .jsonc, .md are ignored
 *
 * Usage:
 *   node scripts/validate-with-clion.js [options]
 *
 * Options:
 *   --clion-path <path>   Path to CLion executable (auto-detected if not set)
 *   --test-dir <path>     Directory containing test files (default: test/datasets/well-formatted/default)
 *   --file <name>         Test a specific file only (deprecated - use --test-dir with single file dir)
 *   --restore             Restore files after testing (default: keep CLion formatted version)
 *   --verbose             Show detailed diff output
 *   --help                Show this help message
 *
 * Environment:
 *   CLION_PATH            Path to CLion executable (alternative to --clion-path)
 *
 * Requirements:
 *   - CLion must be installed
 *   - Git must be available
 *
 * Note: This script now uses batch file formatting for better performance,
 *       and only formats CMake files (*.cmake and CMakeLists.txt), not other file types.
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
            if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
                console.error('Error: --clion-path requires a value');
                process.exit(1);
            }
            options.clionPath = args[++i];
            break;
        case '--test-dir':
            if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
                console.error('Error: --test-dir requires a value');
                process.exit(1);
            }
            options.testDir = args[++i];
            break;
        case '--file':
            if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
                console.error('Error: --file requires a value');
                process.exit(1);
            }
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
Validate Test Datasets with CLion Formatter

This script validates that test files match CLion's formatting standard by formatting
them with CLion and checking for changes. Test files should already be correctly
formatted - any change indicates they need adjustment.

Only CMake files (*.cmake and CMakeLists.txt) are formatted - other files are ignored.

Note: This does NOT compare plugin vs CLion output. For that, run: npm run test:integration

Usage:
  node scripts/validate-with-clion.js [options]

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
  # Validate all files with auto-detected CLion
  node scripts/validate-with-clion.js

  # Validate a specific directory
  node scripts/validate-with-clion.js --test-dir test/datasets/basic

  # Restore files after validation
  node scripts/validate-with-clion.js --restore

Note: This script uses batch file formatting for better performance and only formats
      CMake files (*.cmake and CMakeLists.txt), ignoring other file types like .jsonc or .md.
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
 * Format CMake files using CLion command-line formatter (batch, in-place)
 * Formats specific files only (*.cmake and CMakeLists.txt), not entire directories
 */
function formatCMakeFilesWithClion(clionPath, files) {
    if (files.length === 0) {
        return { success: true };
    }

    try {
        // Format all files in one batch for better performance
        // CLion accepts multiple file paths as arguments
        const args = ['format', '-allowDefaults', ...files];
        const result = spawnSync(clionPath, args, {
            encoding: 'utf-8',
            timeout: 120000, // Increased timeout for batch formatting
            stdio: ['pipe', 'pipe', 'pipe']
        });

        if (result.error) {
            return { success: false, error: result.error.message };
        }

        // CLion may return non-zero exit codes (e.g., 14) even on successful formatting
        // Check stderr for actual error indicators more robustly
        if (result.status !== 0 && result.stderr) {
            // Look for common error patterns (case-insensitive)
            const stderr = result.stderr.toLowerCase();
            const errorPatterns = [
                'error:',
                'exception:',
                'failed to',
                'cannot find',
                'no such file'
            ];
            const hasError = errorPatterns.some(pattern => stderr.includes(pattern));

            if (hasError) {
                return { success: false, error: result.stderr };
            }
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

        if (result.error) {
            return { changed: false, error: result.error.message };
        }

        if (result.status !== 0) {
            return { changed: false, error: `git diff exited with code ${result.status}: ${result.stderr}` };
        }

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
 * Ignores untracked files (new files that are not in git yet)
 */
function checkDirectoryClean(dirPath) {
    try {
        const result = spawnSync('git', ['status', '--porcelain', '--', dirPath], {
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'pipe']
        });

        const output = result.stdout.trim();

        // Filter out untracked files (lines starting with '??')
        // We only care about modifications to tracked files
        const lines = output.split('\n').filter(line => {
            const trimmed = line.trim();
            return trimmed.length > 0 && !trimmed.startsWith('??');
        });

        const filteredOutput = lines.join('\n');

        return {
            clean: filteredOutput.length === 0,
            changes: filteredOutput
        };
    } catch (e) {
        return { clean: false, error: e.message };
    }
}

/**
 * List all cmake files in a directory (recursively)
 * Includes *.cmake files and CMakeLists.txt files
 */
function listCMakeFiles(dir) {
    const results = [];

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                results.push(...listCMakeFiles(fullPath));
            } else if (entry.isFile() && (entry.name.endsWith('.cmake') || entry.name === 'CMakeLists.txt')) {
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
console.log('Validate Datasets with CLion Formatter');
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
    const result = spawnSync('git', ['--version'], { encoding: 'utf-8' });
    if (result.error) {
        throw new Error('Git command not found');
    }
    if (result.status !== 0) {
        throw new Error(`Git check failed with exit code ${result.status}`);
    }
} catch (e) {
    console.error('❌ Git is not available. This test requires git.');
    console.error(`   Error: ${e.message}`);
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

console.log(`📁 Found ${testFiles.length} CMake file(s)`);
console.log(`📂 Test directory: ${options.testDir}`);

// Format CMake files with CLion (batch mode)
console.log('\n🔧 Formatting CMake files with CLion...');
const formatResult = formatCMakeFilesWithClion(clionPath, testFiles);
if (!formatResult.success) {
    console.error(`\n❌ CLion formatting failed: ${formatResult.error}`);
    process.exit(1);
}
console.log('✅ Formatting completed');

// Track results
const results = {
    passed: [],
    failed: [],
    errors: []
};

console.log('\n🔍 Checking for differences...');

// Check each file for differences after batch formatting
for (let i = 0; i < testFiles.length; i++) {
    const testFile = testFiles[i];
    const relativePath = path.relative(options.testDir, testFile);

    process.stdout.write(`[${i + 1}/${testFiles.length}] ${relativePath}... `);

    // Check git diff
    const diffResult = checkGitDiff(testFile);

    if (diffResult.error) {
        console.log('⚠️  ERROR');
        results.errors.push({
            file: relativePath,
            fullPath: testFile,
            error: diffResult.error
        });
        if (options.verbose) {
            console.log(`   Error: ${diffResult.error}`);
        }
        continue;
    }

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
