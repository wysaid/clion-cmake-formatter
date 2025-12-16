/**
 * Tests for CMake template project creation
 */

import * as assert from 'assert';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

describe('CMake Template Project', () => {
    const templatePath = path.join(__dirname, '..', 'resources', 'cmake_template');

    describe('Template Files', () => {
        it('should have CMakeLists.txt template', () => {
            const cmakePath = path.join(templatePath, 'CMakeLists.txt');
            assert.ok(fs.existsSync(cmakePath), 'CMakeLists.txt template should exist');

            const content = fs.readFileSync(cmakePath, 'utf-8');
            assert.ok(content.includes('cmake_minimum_required'), 'Should have cmake_minimum_required');
            assert.ok(content.includes('{{PROJECT_NAME}}'), 'Should have PROJECT_NAME placeholder');
            assert.ok(content.includes('CMAKE_CXX_STANDARD'), 'Should have CMAKE_CXX_STANDARD');
        });

        it('should have main.cpp template', () => {
            const cppPath = path.join(templatePath, 'main.cpp');
            assert.ok(fs.existsSync(cppPath), 'main.cpp template should exist');

            const content = fs.readFileSync(cppPath, 'utf-8');
            assert.ok(content.includes('#include <iostream>'), 'Should include iostream');
            assert.ok(content.includes('int main()'), 'Should have main function');
            assert.ok(content.includes('Hello, world'), 'Should print Hello, world');
        });

        it('should have .vscode directory', () => {
            const vscodePath = path.join(templatePath, '.vscode');
            assert.ok(fs.existsSync(vscodePath), '.vscode directory should exist');
            assert.ok(fs.statSync(vscodePath).isDirectory(), '.vscode should be a directory');
        });

        it('should have VS Code configuration files', () => {
            const vscodePath = path.join(templatePath, '.vscode');
            const expectedFiles = ['tasks.json', 'launch.json', 'settings.json'];

            for (const file of expectedFiles) {
                const filePath = path.join(vscodePath, file);
                assert.ok(fs.existsSync(filePath), `${file} should exist`);
            }
        });

        it('should have .gitignore file', () => {
            const gitignorePath = path.join(templatePath, '.gitignore');
            assert.ok(fs.existsSync(gitignorePath), '.gitignore should exist');

            const content = fs.readFileSync(gitignorePath, 'utf-8');
            assert.ok(content.includes('build/'), 'Should ignore build directory');
        });
    });

    describe('Template Generation', () => {
        it('should validate project name format', () => {
            // Valid project names
            const validNames = ['MyProject', 'my-project', 'my_project', 'Project123', 'ABC-123_xyz'];
            for (const name of validNames) {
                const isValid = /^[a-zA-Z0-9_-]+$/.test(name);
                assert.strictEqual(isValid, true, `${name} should be valid`);
            }

            // Invalid project names
            const invalidNames = ['', ' ', 'my project', 'my@project', 'my.project', 'my/project'];
            for (const name of invalidNames) {
                const isValid = /^[a-zA-Z0-9_-]+$/.test(name);
                assert.strictEqual(isValid, false, `${name} should be invalid`);
            }
        });

        it('should replace placeholders in template files', () => {
            const projectName = 'MyTestProject';
            const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cmake-test-'));
            const projectPath = path.join(tempDir, projectName);

            try {
                // Create project directory
                fs.mkdirSync(projectPath, { recursive: true });

                // Read template and replace placeholders
                const templateCMake = fs.readFileSync(path.join(templatePath, 'CMakeLists.txt'), 'utf-8');
                const processedContent = templateCMake.replace(/\{\{PROJECT_NAME\}\}/g, projectName);

                // Write to project directory
                const cmakePath = path.join(projectPath, 'CMakeLists.txt');
                fs.writeFileSync(cmakePath, processedContent, 'utf-8');

                // Verify file exists and placeholders are replaced
                assert.ok(fs.existsSync(cmakePath), 'CMakeLists.txt should exist');
                const content = fs.readFileSync(cmakePath, 'utf-8');
                assert.ok(content.includes(`project(${projectName})`), 'Should have replaced project name');
                assert.ok(content.includes(`add_executable(${projectName} main.cpp)`), 'Should have replaced executable name');
                assert.ok(!content.includes('{{PROJECT_NAME}}'), 'Should not have placeholder');

            } finally {
                // Clean up
                try {
                    if (fs.existsSync(projectPath)) {
                        fs.rmSync(projectPath, { recursive: true, force: true });
                    }
                    if (fs.existsSync(tempDir)) {
                        fs.rmSync(tempDir, { recursive: true, force: true });
                    }
                } catch {
                    // Ignore cleanup errors
                }
            }
        });
    });
});
