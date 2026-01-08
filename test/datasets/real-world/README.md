# Real-World CMake Test Datasets

This directory contains real-world CMake project files for comparing plugin formatting results with CLion output.

## Purpose

These files are used to validate that the plugin's formatting behavior matches CLion's formatter on realistic project structures.

## Adding This Directory to Tests

This directory is automatically included in the default test configuration.

To add more directories like this one, edit `scripts/validate-with-clion.js` and add to the `DEFAULT_TEST_DIRECTORIES` array:

```javascript
const DEFAULT_TEST_DIRECTORIES = [
    'test/datasets/well-formatted/default',
    'test/datasets/real-world',           // This directory
    'test/datasets/your-new-dataset'      // Add new ones here
];
```

## Usage

### Run All Tests

The default `test:clion` task now tests both `well-formatted` and `real-world` directories:

```bash
npm run test:clion
```

With verbose output to see detailed differences:

```bash
npm run test:clion -- --verbose
```

### Test Only This Directory

```bash
node scripts/validate-with-clion.js --test-dir test/datasets/real-world --mode compare
```

### Manual Comparison

After running the comparison test with differences, you can inspect the results:

**Directory Structure:**

```text
test/datasets/real-world/test-error-results/
├── plugin/    - 插件格式化结果 (Result B)
├── clion/     - CLion 格式化结果 (Result A)
└── original/  - 原始文件备份
```

**Comparison Commands:**

```bash
# Compare with VS Code
code --diff \
  test/datasets/real-world/test-error-results/plugin/file.cmake \
  test/datasets/real-world/test-error-results/clion/file.cmake

# Or use diff command
diff -u \
  test/datasets/real-world/test-error-results/plugin/file.cmake \
  test/datasets/real-world/test-error-results/clion/file.cmake

# Or meld (if installed)
meld test/datasets/real-world/test-error-results/{plugin,clion}
```

**Note:**

- The `test-error-results` directory is automatically cleaned up if all tests pass
- Original files in the main directory are always restored after the test

## Test Files

- `complete-project.cmake`: A complete CMake project with variables, executables, and conditionals
- `test-module.cmake`: A test module with external dependencies and test configurations

## Known Differences

The comparison may reveal differences between plugin and CLion formatting, such as:

1. **Indentation depth**: Plugin vs CLion may use different indentation levels for nested arguments
2. **Spacing**: Differences in spacing around parentheses (e.g., `IF (` vs `IF(`)
3. **Line wrapping**: Different strategies for breaking long argument lists

These differences help identify areas where the plugin can be improved to better match CLion's behavior.

## Restoring Original Files

To restore the original state after testing:

```bash
git checkout -- test/datasets/real-world/
```

Or run the test with the `--restore` flag (only for specific directory):

```bash
node scripts/validate-with-clion.js --test-dir test/datasets/real-world --mode compare --restore
```
