#!/usr/bin/env node

/**
 * Validate test datasets against CLion's formatting standard
 *
 * This script verifies that test files are correctly formatted according to CLion's formatter.
 * It also compares plugin formatting results with CLion output for comparison datasets.
 *
 * Configuration:
 * - Edit DEFAULT_TEST_DIRECTORIES array at the top of this file to add/remove test datasets
 * - Paths are relative to project root (e.g., 'test/datasets/your-dataset')
 * - Each directory is recursively searched for CMake files
 *
 * This script:
 * 1. Lists all CMake files (*.cmake and CMakeLists.txt) in the test directory
 * 2. For validation mode (well-formatted): Formats with CLion and checks for changes
 * 3. For comparison mode (real-world): Formats with both plugin and CLion, then compares
 * 4. Uses `git diff` to detect any changes
 * 5. Reports files that differ from CLion's formatting standard
 * 6. Optionally restores files to original state after testing
 *
 * Note: Only CMake files are formatted - other files like .jsonc, .md are ignored
 *
 * Usage:
 *   node scripts/validate-with-clion.js [options]
 *
 * Options:
 *   --clion-path <path>   Path to CLion executable (auto-detected if not set)
 *   --test-dir <path>     Directory containing test files (default: test/datasets/well-formatted/default)
 *   --mode <type>         Test mode: 'validate' or 'compare' (auto-detected from path)
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

// ============================================================
// Test Directory Configuration
// ============================================================
// Configure which datasets directories to test by default
// Add or remove directories here as needed
// Each directory will be recursively searched for CMake files
const DEFAULT_TEST_DIRECTORIES = [
    'test/datasets/well-formatted/default',  // Validation mode: check CLion standard
    'test/datasets/real-world'               // Compare mode: plugin vs CLion
];

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    clionPath: process.env.CLION_PATH || null,
    testDirs: [], // Support multiple test directories
    mode: null, // 'validate' or 'compare', auto-detected if null
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
            options.testDirs.push(args[++i]);
            break;
        case '--mode': {
            if (i + 1 >= args.length || args[i + 1].startsWith('-')) {
                console.error('Error: --mode requires a value');
                process.exit(1);
            }
            const mode = args[++i];
            if (mode !== 'validate' && mode !== 'compare') {
                console.error('Error: --mode must be either "validate" or "compare"');
                process.exit(1);
            }
            options.mode = mode;
            break;
        }
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

// Set default test directories if none specified
if (options.testDirs.length === 0) {
    options.testDirs = DEFAULT_TEST_DIRECTORIES.map(dir =>
        path.join(__dirname, '..', dir)
    );
}

if (options.help) {
    console.log(`
Validate Test Datasets with CLion Formatter

This script validates that test files match CLion's formatting standard and/or compares
plugin formatting results with CLion output.

Two modes:
  1. validate: Checks if files match CLion standard (for well-formatted test data)
  2. compare:  Compares plugin output with CLion output (for real-world test data)

Only CMake files (*.cmake and CMakeLists.txt) are formatted - other files are ignored.

Usage:
  node scripts/validate-with-clion.js [options]

Options:
  --clion-path <path>   Path to CLion executable (auto-detected if not set)
  --test-dir <path>     Directory containing test files
                        (default: test/datasets/well-formatted/default)
  --mode <type>         Test mode: 'validate' or 'compare'
                        (auto-detected from path if not specified)
  --file <name>         Test a specific file only
  --restore             Restore files after testing (default: keep CLion formatted version)
  --verbose             Show detailed diff output
  --help                Show this help message

Environment:
  CLION_PATH            Path to CLion executable (alternative to --clion-path)

Examples:
  # Validate well-formatted files
  node scripts/validate-with-clion.js

  # Compare plugin vs CLion for real-world data
  node scripts/validate-with-clion.js --test-dir test/datasets/real-world

  # Validate a specific directory
  node scripts/validate-with-clion.js --test-dir test/datasets/basic

  # Restore files after validation
  node scripts/validate-with-clion.js --restore

Note: This script uses batch file formatting for better performance.
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
 * Excludes .backup-plugin-output directory
 */
function listCMakeFiles(dir) {
    const results = [];

    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);

            if (entry.isDirectory()) {
                // Skip backup directory
                if (entry.name === '.backup-plugin-output') {
                    continue;
                }
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

/**
 * Format a file with the plugin
 * Returns the formatted content
 */
function formatFileWithPlugin(filePath) {
    try {
        // Import the formatter dynamically
        const formatterPath = path.join(__dirname, '../packages/core/dist/index.js');
        if (!fs.existsSync(formatterPath)) {
            throw new Error('Plugin not built. Run: npm run build:core');
        }

        const { formatCMake } = require(formatterPath);
        const content = fs.readFileSync(filePath, 'utf-8');
        return formatCMake(content, {});
    } catch (e) {
        throw new Error(`Failed to format ${filePath}: ${e.message}`);
    }
}

/**
 * Normalize content for comparison
 * - Remove trailing whitespace on lines
 * - Normalize break() and continue() statements
 */
function normalizeContent(content) {
    return content
        .split('\n')
        .map(line => line.replace(/\s+$/, ''))
        .join('\n')
        .replace(/\bbreak\s*\(/g, 'break(')
        .replace(/\bcontinue\s*\(/g, 'continue(');
}

/**
 * Check if two contents are equivalent after normalization
 */
function areContentsEquivalent(content1, content2) {
    if (content1 === content2) {
        return true;
    }

    const normalized1 = normalizeContent(content1);
    const normalized2 = normalizeContent(content2);

    return normalized1 === normalized2;
}

/**
 * Auto-detect test mode from directory path
 * Returns 'validate' for well-formatted, 'compare' for real-world
 */
function detectTestMode(testDir) {
    const normalizedPath = testDir.toLowerCase().replace(/\\/g, '/');

    if (normalizedPath.includes('well-formatted')) {
        return 'validate';
    } else if (normalizedPath.includes('real-world')) {
        return 'compare';
    }

    // Default to validate mode
    return 'validate';
}

// ============================================================
/**
 * Process a single test directory
 * Returns { passed, failed, errors }
 */
function processTestDirectory(clionPath, testDir, mode, options) {
    // Check if test directory is clean (no uncommitted changes) - only for validate mode
    if (mode === 'validate') {
        const dirClean = checkDirectoryClean(testDir);
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
   git checkout -- ${testDir}
`);
            process.exit(1);
        }
    }

    // Get test files
    let testFiles;
    if (options.file) {
        const specificFile = path.join(testDir, options.file);
        if (!fs.existsSync(specificFile)) {
            console.error(`❌ Test file not found: ${specificFile}`);
            process.exit(1);
        }
        testFiles = [specificFile];
    } else {
        testFiles = listCMakeFiles(testDir);
    }

    if (testFiles.length === 0) {
        console.error(`❌ No cmake files found in: ${testDir}`);
        return { passed: 0, failed: 0, errors: 0 };
    }

    console.log(`📁 Found ${testFiles.length} CMake file(s)`);

    // Setup test output directories
    const testErrorResultsBase = path.join(__dirname, '../test/test-error-results');
    const datasetName = path.basename(testDir);
    const testRunDir = path.join(testErrorResultsBase, `${datasetName}-${mode}`);

    let workingDir = testDir;  // For validate mode, work directly on dataset
    let pluginOutputDir = null;
    let clionOutputDir = null;
    let originalDir = null;

    if (mode === 'compare') {
        // For compare mode, work in isolated test directory
        workingDir = path.join(testRunDir, 'working');
        pluginOutputDir = path.join(testRunDir, 'plugin');
        clionOutputDir = path.join(testRunDir, 'clion');
        originalDir = path.join(testRunDir, 'original');

        // Clean up old test run
        if (fs.existsSync(testRunDir)) {
            fs.rmSync(testRunDir, { recursive: true, force: true });
        }

        // Create directories
        fs.mkdirSync(workingDir, { recursive: true });
        fs.mkdirSync(pluginOutputDir, { recursive: true });
        fs.mkdirSync(clionOutputDir, { recursive: true });
        fs.mkdirSync(originalDir, { recursive: true });

        console.log(`📁 Test directories created:`);
        console.log(`   Working:  ${workingDir}`);
        console.log(`   Plugin:   ${pluginOutputDir}`);
        console.log(`   CLion:    ${clionOutputDir}`);
        console.log(`   Original: ${originalDir}`);

        // Copy dataset files to working directory and original backup
        console.log('\n💾 Copying dataset files...');
        for (const testFile of testFiles) {
            const relativePath = path.relative(testDir, testFile);
            const workingPath = path.join(workingDir, relativePath);
            const originalPath = path.join(originalDir, relativePath);

            const workingDirPath = path.dirname(workingPath);
            const originalDirPath = path.dirname(originalPath);

            if (!fs.existsSync(workingDirPath)) {
                fs.mkdirSync(workingDirPath, { recursive: true });
            }
            if (!fs.existsSync(originalDirPath)) {
                fs.mkdirSync(originalDirPath, { recursive: true });
            }

            fs.copyFileSync(testFile, workingPath);
            fs.copyFileSync(testFile, originalPath);
        }
        console.log('✅ Dataset files copied');

        // Update testFiles to point to working directory
        testFiles = testFiles.map(testFile => {
            const relativePath = path.relative(testDir, testFile);
            return path.join(workingDir, relativePath);
        });
    }

    // For compare mode: format with plugin and save to plugin output directory
    if (mode === 'compare') {
        console.log('\n🔧 Step 1: Formatting with plugin...');

        for (let i = 0; i < testFiles.length; i++) {
            const testFile = testFiles[i];
            const relativePath = path.relative(workingDir, testFile);

            process.stdout.write(`[${i + 1}/${testFiles.length}] ${relativePath}... `);

            try {
                const formatted = formatFileWithPlugin(testFile);

                // Save to plugin output directory
                const outputPath = path.join(pluginOutputDir, relativePath);
                const outputDirPath = path.dirname(outputPath);
                if (!fs.existsSync(outputDirPath)) {
                    fs.mkdirSync(outputDirPath, { recursive: true });
                }
                fs.writeFileSync(outputPath, formatted, 'utf-8');

                console.log('✅');
            } catch (e) {
                console.log(`❌ ${e.message}`);
            }
        }

        console.log('✅ Plugin formatting completed');
    }

    // Format CMake files with CLion (batch mode)
    console.log(`\n🔧 ${mode === 'compare' ? 'Step 2: ' : ''}Formatting with CLion...`);
    const formatResult = formatCMakeFilesWithClion(clionPath, testFiles);
    if (!formatResult.success) {
        console.error(`\n❌ CLion formatting failed: ${formatResult.error}`);
        process.exit(1);
    }
    console.log('✅ CLion formatting completed');

    // For compare mode: copy CLion formatted files to clion output directory
    if (mode === 'compare') {
        console.log('\n💾 Saving CLion output...');
        for (const testFile of testFiles) {
            const relativePath = path.relative(workingDir, testFile);
            const clionPath = path.join(clionOutputDir, relativePath);
            const clionDirPath = path.dirname(clionPath);
            if (!fs.existsSync(clionDirPath)) {
                fs.mkdirSync(clionDirPath, { recursive: true });
            }
            fs.copyFileSync(testFile, clionPath);
        }
        console.log('✅ CLion output saved');
    }

    // Initialize results tracking
    const results = {
        passed: [],
        failed: [],
        errors: []
    };

    console.log(`\n🔍 ${mode === 'compare' ? 'Step 3: ' : ''}Checking for differences...`);

    // Check each file for differences after batch formatting
    for (let i = 0; i < testFiles.length; i++) {
        const testFile = testFiles[i];
        const relativePath = path.relative(mode === 'compare' ? workingDir : testDir, testFile);

        process.stdout.write(`[${i + 1}/${testFiles.length}] ${relativePath}... `);

        if (mode === 'compare') {
            // Compare mode: compare plugin output with CLion output from comparison directories
            try {
                const pluginPath = path.join(pluginOutputDir, relativePath);
                const clionPath = path.join(clionOutputDir, relativePath);

                const pluginContent = fs.readFileSync(pluginPath, 'utf-8');
                const clionContent = fs.readFileSync(clionPath, 'utf-8');

                if (areContentsEquivalent(pluginContent, clionContent)) {
                    console.log('✅ MATCH');
                    results.passed.push({ file: relativePath });

                    // Delete matched files from test-error-results (keep only errors/diffs)
                    try {
                        const originalPath = path.join(originalDir, relativePath);
                        fs.unlinkSync(pluginPath);
                        fs.unlinkSync(clionPath);
                        fs.unlinkSync(originalPath);
                    } catch (e) {
                        // Ignore deletion errors
                    }
                } else {
                    console.log('❌ DIFFER');

                    // Calculate detailed diff for verbose mode
                    let diff = '';
                    if (options.verbose) {
                        const pluginLines = pluginContent.split('\n');
                        const clionLines = clionContent.split('\n');
                        const maxLines = Math.max(pluginLines.length, clionLines.length);

                        for (let j = 0; j < maxLines; j++) {
                            if (pluginLines[j] !== clionLines[j]) {
                                diff += `Line ${j + 1}:\n`;
                                diff += `  Plugin: ${JSON.stringify(pluginLines[j] || '(missing)')}\n`;
                                diff += `  CLion:  ${JSON.stringify(clionLines[j] || '(missing)')}\n`;
                            }
                        }
                    }

                    results.failed.push({
                        file: relativePath,
                        fullPath: testFile,
                        pluginPath: pluginPath,
                        clionPath: clionPath,
                        diff: diff,
                        pluginLines: pluginContent.split('\n').length,
                        clionLines: clionContent.split('\n').length
                    });

                    if (options.verbose && diff) {
                        console.log('   Differences:');
                        const diffLines = diff.split('\n').slice(0, 15);
                        for (const line of diffLines) {
                            console.log(`   ${line}`);
                        }
                        if (diff.split('\n').length > 15) {
                            console.log('   ... (truncated)');
                        }
                    }
                }
            } catch (e) {
                console.log('⚠️  ERROR');
                results.errors.push({
                    file: relativePath,
                    fullPath: testFile,
                    error: e.message
                });
                if (options.verbose) {
                    console.log(`   Error: ${e.message}`);
                }
            }
        } else {
            // Validate mode: check git diff
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
    }

    // Summary
    console.log('\n' + '-'.repeat(60));
    console.log('Directory Summary');
    console.log('-'.repeat(60));
    console.log(`✅ Matched: ${results.passed.length}/${testFiles.length}`);
    console.log(`❌ Differed: ${results.failed.length}/${testFiles.length}`);
    console.log(`⚠️  Errors: ${results.errors.length}/${testFiles.length}`);

    // Show failed files
    if (results.failed.length > 0) {
        if (mode === 'compare') {
            console.log('\n❌ Files with differences (Plugin vs CLion):');
            for (const { file, pluginLines, clionLines, pluginPath, clionPath } of results.failed) {
                console.log(`   ${file}`);
                if (pluginLines !== undefined && clionLines !== undefined) {
                    console.log(`      Plugin: ${pluginLines} lines, CLion: ${clionLines} lines`);
                }
            }
            if (testRunDir) {
                console.log('\n   📂 Test results saved to:');
                console.log(`      ${testRunDir}/`);
                console.log(`      ├── original/ - 原始文件`);
                console.log(`      ├── plugin/   - 插件格式化结果 (Result B)`);
                console.log(`      └── clion/    - CLion 格式化结果 (Result A)`);
                console.log('\n   💡 Compare files with:');
                console.log(`      code --diff "${testRunDir}/plugin/file.cmake" "${testRunDir}/clion/file.cmake"`);
                console.log(`      diff -u "${testRunDir}/plugin/file.cmake" "${testRunDir}/clion/file.cmake"`);
                console.log(`      meld "${testRunDir}/plugin" "${testRunDir}/clion"`);
            }
        } else {
            console.log('\n❌ Files with differences (CLion formatted differently):');
            for (const { file } of results.failed) {
                console.log(`   ${file}`);
            }
            console.log('\n   Run with --verbose to see diffs, or use:');
            console.log(`   git diff ${testDir}`);
        }
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
        if (mode === 'validate') {
            // In validate mode, restore from git
            for (const { fullPath } of results.failed) {
                restoreFile(fullPath);
            }
            console.log('   Files restored to original state.');
        } else {
            // In compare mode, files in datasets are untouched
            console.log('   (Compare mode: dataset files are untouched)');
        }
    }

    // Clean up test directory in compare mode
    if (mode === 'compare' && testRunDir) {
        if (results.failed.length === 0 && results.errors.length === 0) {
            // Only clean up if all tests passed
            try {
                fs.rmSync(testRunDir, { recursive: true, force: true });
                console.log('\n🗑️  Cleaned up test directory (all tests passed)');
            } catch (e) {
                // Ignore cleanup errors
            }
        } else {
            // Keep working directory for inspection, but can remove it
            const workingPath = path.join(testRunDir, 'working');
            if (fs.existsSync(workingPath)) {
                try {
                    fs.rmSync(workingPath, { recursive: true, force: true });
                    console.log('\n🗑️  Cleaned up working directory (kept results for inspection)');
                } catch (e) {
                    // Ignore cleanup errors
                }
            }
        }
    }

    return {
        passed: results.passed.length,
        failed: results.failed.length,
        errors: results.errors.length
    };
}

// ============================================================
// Main execution
// ============================================================

console.log('============================================================');
console.log('Validate/Compare Datasets with CLion Formatter');
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

console.log(`\n📁 Testing ${options.testDirs.length} director${options.testDirs.length > 1 ? 'ies' : 'y'}...`);

// Process each test directory
let totalPassed = 0;
let totalFailed = 0;
let totalErrors = 0;

for (let dirIndex = 0; dirIndex < options.testDirs.length; dirIndex++) {
    const testDir = options.testDirs[dirIndex];

    console.log('\n' + '='.repeat(60));
    console.log(`[${dirIndex + 1}/${options.testDirs.length}] ${testDir}`);
    console.log('='.repeat(60));

    // Auto-detect test mode if not specified
    const mode = options.mode || detectTestMode(testDir);
    console.log(`📋 Mode: ${mode === 'validate' ? 'Validate (check CLion standard)' : 'Compare (plugin vs CLion)'}`);

    const result = processTestDirectory(clionPath, testDir, mode, options);

    totalPassed += result.passed;
    totalFailed += result.failed;
    totalErrors += result.errors;
}

// Overall summary
console.log('\n' + '='.repeat(60));
console.log('Overall Summary');
console.log('='.repeat(60));
console.log(`✅ Total Matched: ${totalPassed}`);
console.log(`❌ Total Differed: ${totalFailed}`);
console.log(`⚠️  Total Errors: ${totalErrors}`);

// Exit with appropriate code
const exitCode = totalFailed + totalErrors;
if (exitCode === 0) {
    console.log('\n🎉 All tests passed!');
}
process.exit(exitCode);
