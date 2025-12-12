# Well-Formatted Test Suite

## Overview

This directory contains CMake files that should remain **unchanged** after formatting. These tests verify the formatter's idempotency - ensuring that well-formatted code stays well-formatted.

## Directory Structure

```
well-formatted/
└── default/                      # Default configuration style
    ├── .cc-format.jsonc          # Configuration for this style
    ├── *.cmake                   # Test files in root directory
    └── cmake-official/           # Subdirectory with more test files
        └── *.cmake               # All files use parent .cc-format.jsonc
```

**Important**: Subdirectories are **not allowed** to have their own `.cc-format.jsonc` files. This directory tests the idempotency of the **default configuration only**. All test files within a style (including those in subdirectories) use the single configuration file at the style root.

## Configuration Loading

Each style directory (e.g., `default/`) has exactly **one** `.cc-format.jsonc` configuration file at its root. All test files within that style, regardless of their subdirectory depth, use this single configuration file.

### Example

- `default/blank-lines.cmake` → uses `default/.cc-format.jsonc`
- `default/cmake-official/BootstrapTest.cmake` → uses `default/.cc-format.jsonc`
- All files in `default/` and its subdirectories → use `default/.cc-format.jsonc`

## Available Styles

- **default**: Tests the plugin's default configuration settings

## Adding New Test Cases

1. **Add to existing style**: Place your `.cmake` file in the appropriate style directory (e.g., `default/`)
2. **Organize in subdirectories**: You can organize files in subdirectories (e.g., `default/cmake-official/`) for better organization
3. **Create new style**: To test different formatter configurations, add a new top-level directory with its own `.cc-format.jsonc`

### Requirements

- Files must be properly formatted according to the style's `.cc-format.jsonc`
- After formatting, the file content should remain identical (idempotency test)
- Use meaningful filenames that describe what formatting aspect is being tested
- **Do not** add `.cc-format.jsonc` files in subdirectories

## How Tests Work

For each file in this directory:
1. Load the style root's `.cc-format.jsonc` configuration
2. Format the file with that configuration
3. Assert that the formatted output matches the original input exactly

## Implementation

- Test file: `test/well-formated.test.ts`
- Helper functions: `test/helpers.ts`
  - `listWellFormatedFiles()` - Recursively scans all `.cmake` files
  - `loadWellFormatedConfigForFile()` - Loads the style root configuration

## Note on cmake-official Directory

There are **two different** `cmake-official` directories in this project:

1. **`test/datasets/cmake-official/`** - Original test files from the CMake project (source files)
2. **`test/datasets/well-formatted/default/cmake-official/`** - Formatted versions for idempotency testing

Do not confuse these two directories! The first contains unformatted source files, while the second contains the expected well-formatted output.
