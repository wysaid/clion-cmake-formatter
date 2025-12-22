/**
 * CLI Tests - Tests for the command line interface
 */

import * as assert from 'assert';
import * as childProcess from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

const CLI_PATH = path.join(__dirname, '..', 'dist', 'src', 'cli.js');
const REPO_ROOT = path.join(__dirname, '..');

/**
 * Run the CLI with given arguments
 */
function runCLI(args: string[], options?: { stdin?: string; cwd?: string }): { stdout: string; stderr: string; exitCode: number } {
    const result = childProcess.spawnSync('node', [CLI_PATH, ...args], {
        encoding: 'utf-8',
        input: options?.stdin,
        cwd: options?.cwd || REPO_ROOT
    });

    return {
        stdout: result.stdout || '',
        stderr: result.stderr || '',
        exitCode: result.status ?? 1
    };
}

describe('CLI', () => {
    describe('--help', () => {
        it('should display help message', () => {
            const result = runCLI(['--help']);
            assert.strictEqual(result.exitCode, 0);
            assert.ok(result.stdout.includes('cc-format'));
            assert.ok(result.stdout.includes('CMake file formatter'));
            assert.ok(result.stdout.includes('--write'));
            assert.ok(result.stdout.includes('--check'));
            assert.ok(result.stdout.includes('--stdin'));
        });
    });

    describe('--version', () => {
        it('should display version', () => {
            const result = runCLI(['--version']);
            assert.strictEqual(result.exitCode, 0);
            assert.ok(/^\d+\.\d+\.\d+$/.test(result.stdout.trim()));
        });
    });

    describe('--stdin', () => {
        it('should format input from stdin', () => {
            const input = 'cmake_minimum_required(VERSION 3.10)\nproject(Test)\nif(WIN32)\nmessage(STATUS "Windows")\nendif()';
            const result = runCLI(['--stdin'], { stdin: input });
            assert.strictEqual(result.exitCode, 0);
            assert.ok(result.stdout.includes('if (WIN32)'));
            assert.ok(result.stdout.includes('    message(STATUS "Windows")'));
            assert.ok(result.stdout.includes('endif ()'));
        });

        it('should apply command case option', () => {
            const input = 'CMAKE_MINIMUM_REQUIRED(VERSION 3.10)';
            const result = runCLI(['--stdin', '--command-case', 'lowercase'], { stdin: input });
            assert.strictEqual(result.exitCode, 0);
            assert.ok(result.stdout.includes('cmake_minimum_required'));
        });

        it('should apply indent size option', () => {
            const input = 'if (TRUE)\nmessage(STATUS "Test")\nendif ()';
            const result = runCLI(['--stdin', '--indent-size', '2'], { stdin: input });
            assert.strictEqual(result.exitCode, 0);
            assert.ok(result.stdout.includes('  message(STATUS "Test")'));
        });
    });

    describe('formatting files', () => {
        it('should format a single file to stdout', () => {
            const filePath = path.join(__dirname, 'datasets', 'basic', 'simple-command.cmake');
            const result = runCLI([filePath]);
            assert.strictEqual(result.exitCode, 0);
            // The file contains 'project(MyProject)'
            assert.ok(result.stdout.includes('project(MyProject)'));
        });

        it('should format multiple files in directory to stdout', () => {
            const dir = path.join(__dirname, 'datasets', 'basic');
            const result = runCLI([dir]);
            assert.strictEqual(result.exitCode, 0);
            // Multiple files are output, so stdout should have content
            assert.ok(result.stdout.length > 0);
        });
    });

    describe('--check mode', () => {
        it('should exit with 0 for well-formatted files', () => {
            const dir = path.join(__dirname, 'datasets', 'well-formatted', 'default');
            const result = runCLI([dir, '--check']);
            assert.strictEqual(result.exitCode, 0);
            assert.ok(result.stdout.includes('already formatted'));
        });
    });

    describe('--init', () => {
        it('should create config file in temp directory', () => {
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-format-test-'));

            try {
                const result = runCLI(['--init'], { cwd: tmpDir });

                assert.strictEqual(result.exitCode, 0);
                assert.ok(result.stdout.includes('Project config created'));

                const configPath = path.join(tmpDir, '.cc-format.jsonc');
                assert.ok(fs.existsSync(configPath));

                const content = fs.readFileSync(configPath, 'utf-8');
                assert.ok(content.includes('https://github.com/wysaid/clion-cmake-format'));
                assert.ok(content.includes('"indentSize"'));
            } finally {
                // Cleanup
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    describe('--config-path', () => {
        it('should display global config path', () => {
            const result = runCLI(['--config-path']);
            assert.strictEqual(result.exitCode, 0);
            assert.ok(result.stdout.includes('.cc-format.jsonc'));
            assert.ok(result.stdout.includes('cc-format'));
        });
    });

    describe('error handling', () => {
        it('should report error for non-existent file', () => {
            const result = runCLI(['/non/existent/file.cmake']);
            assert.strictEqual(result.exitCode, 1);
            assert.ok(result.stderr.includes('File not found'));
        });
    });

    describe('project config support', () => {
        it('should use project config when available', () => {
            // Create a temp directory with a config file
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-format-test-'));

            try {
                // Create a config that uses lowercase command case
                const configContent = `// https://github.com/wysaid/clion-cmake-format
{
    "commandCase": "lowercase"
}`;
                fs.writeFileSync(path.join(tmpDir, '.cc-format.jsonc'), configContent);

                // Create a CMake file with uppercase command
                const cmakeContent = 'CMAKE_MINIMUM_REQUIRED(VERSION 3.10)\n';
                const cmakePath = path.join(tmpDir, 'CMakeLists.txt');
                fs.writeFileSync(cmakePath, cmakeContent);

                // Format the file
                const result = runCLI([cmakePath]);
                assert.strictEqual(result.exitCode, 0);
                assert.ok(result.stdout.includes('cmake_minimum_required'));
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it('should ignore project config when --no-project-config is set', () => {
            // Create a temp directory with a config file
            const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cc-format-test-'));

            try {
                // Create a config that uses lowercase command case
                const configContent = `// https://github.com/wysaid/clion-cmake-format
{
    "commandCase": "lowercase"
}`;
                fs.writeFileSync(path.join(tmpDir, '.cc-format.jsonc'), configContent);

                // Create a CMake file with uppercase command
                const cmakeContent = 'CMAKE_MINIMUM_REQUIRED(VERSION 3.10)\n';
                const cmakePath = path.join(tmpDir, 'CMakeLists.txt');
                fs.writeFileSync(cmakePath, cmakeContent);

                // Format the file with --no-project-config
                const result = runCLI([cmakePath, '--no-project-config']);
                assert.strictEqual(result.exitCode, 0);
                // Without project config, default is 'unchanged', so uppercase should remain
                assert.ok(result.stdout.includes('CMAKE_MINIMUM_REQUIRED'));
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });
});
