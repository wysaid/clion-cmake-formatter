# CLion Integration Testing

This document describes two types of CLion-related tests:

1. **Validation Script** (`scripts/validate-with-clion.js`) - Validates that test datasets match CLion's formatting standard
2. **Integration Tests** (`test/integration/clion-comparison.test.ts`) - Compares plugin output with CLion output

## Validation Script

The validation script (`scripts/validate-with-clion.js`) verifies that test files in `test/datasets/well-formatted/` are correctly formatted according to CLion's formatter. It does **not** compare the plugin's output with CLion - it only checks if the test files themselves match CLion's expected format.

### Purpose

- Ensure test datasets are correctly formatted as CLion would format them
- Catch any drift in test data that doesn't match CLion's current formatting behavior
- Validate new test cases before adding them to the well-formatted dataset

## Prerequisites

### 1. Install CLion

You need CLion installed on your system. Download from: https://www.jetbrains.com/clion/

### 2. Configure Command-Line Launcher

CLion must be accessible from the command line:

**macOS:**
- Open CLion
- Go to `Tools → Create Command-line Launcher...`
- This creates `/usr/local/bin/clion`

**Linux:**
- Add CLion's bin directory to your PATH
- Or create a symlink: `sudo ln -s /opt/clion/bin/clion.sh /usr/local/bin/clion`

**Windows:**
- Add `C:\Program Files\JetBrains\CLion\bin` to your system PATH
- Or use the full path when running the test

### 3. Build the Plugin

```bash
npm run compile
```

## Running the Validation Script

### Basic Usage

```bash
# Auto-detect CLion and validate all files in default directory
node scripts/validate-with-clion.js

# Or use the package script (recommended)
pnpm run test:clion
```

### Specify CLion Path

```bash
# Using command-line argument
node scripts/validate-with-clion.js --clion-path /path/to/clion

# Using environment variable
CLION_PATH=/path/to/clion node scripts/validate-with-clion.js
```

### Validate Specific Files

```bash
# Validate files in a different directory
node scripts/validate-with-clion.js --test-dir test/datasets/basic

# With verbose output
node scripts/validate-with-clion.js --verbose --restore
```

## CLion Path Examples

| Platform | Typical Path |
|----------|--------------|
| macOS | `/Applications/CLion.app/Contents/MacOS/clion` |
| macOS (Toolbox) | `~/Library/Application Support/JetBrains/Toolbox/apps/CLion/ch-0/*/CLion.app/Contents/MacOS/clion` |
| Linux | `/opt/clion/bin/clion.sh` |
| Linux (Snap) | `/snap/bin/clion` |
| Linux (Toolbox) | `~/.local/share/JetBrains/Toolbox/apps/CLion/ch-0/*/bin/clion.sh` |
| Windows | `C:\Program Files\JetBrains\CLion\bin\clion64.exe` |

## Understanding Validation Results

The validation script outputs:

- **✅ MATCH**: Test file matches CLion's formatting (no changes needed)
- **❌ DIFFER**: Test file differs from CLion's formatting (needs updating)

## Integration Tests (Plugin vs CLion)

For actual comparison between the plugin's formatter and CLion's formatter, run the integration tests:

```bash
npm run test:integration
```

This test suite:
1. Copies test datasets to a temporary directory
2. Formats one copy with the plugin
3. Formats another copy with CLion
4. Compares the results to verify compatibility

See `test/integration/clion-comparison.test.ts` for implementation details.

## Troubleshooting

### CLion Not Found

If the script cannot find CLion:

```bash
# Set the path explicitly
export CLION_PATH=/your/path/to/clion
node scripts/test-clion-compare.js
```

### CLion Format Timeout

If CLion takes too long (>60s):
- This usually happens on first run when CLion initializes
- Try running the test again
- Or increase timeout in the script

### CLion Validated Test Cases

To add new test cases to the well-formatted dataset:

1. Add `.cmake` files to `test/datasets/well-formatted/default/`
2. Format them with CLion first to ensure they match CLion's standard
3. Run the validation script to verify: `node scripts/validate-with-clion.js`
4. Commit only if validation passes

## CI Integration

The validation script is not included in regular CI because it requires CLion installation. 

For local development testing:

```bash
# Full test cycle
pnpm run compile
pnpm run lint
pnpm run test:unit         # Unit tests (no CLion needed)
pnpm run test:integration  # Plugin vs CLion comparison (requires CLion)
pnpm run test:clion        # Validate datasets with CLion (requires CLion)

# (npm also works if you prefer, but this repo standardizes on pnpm)
```
