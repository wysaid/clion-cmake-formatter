# CLion CMake Formatter (cc-format)

A professional VSCode extension that formats CMake files (CMakeLists.txt and .cmake) using JetBrains CLion's formatting conventions. **Zero external dependencies** - no Python, cmake-format, or gersemi required.

> **Project Codename**: `cc-format` (CLion CMake Format)

English | [简体中文](README.zh-CN.md)

## Features

- **CLion-compatible formatting**: Precisely replicates JetBrains CLion's CMake formatting behavior
- **Configurable command case**: Support for lowercase, uppercase, or unchanged command names
- **Smart indentation**: Configurable indentation with proper nesting for control structures
- **Intelligent line breaking**: Automatically wraps long argument lists with proper continuation indentation
- **Block structure support**: Correct indentation for `if/endif`, `function/endfunction`, `macro/endmacro`, `foreach/endforeach`, `while/endwhile` blocks
- **Comment preservation**: Maintains inline and trailing comments in their original positions
- **Flexible spacing**: Extensive options for spacing before and inside parentheses
- **Multi-line alignment**: Optional alignment for multi-line command arguments
- **Format on save**: Seamless integration with VSCode's format-on-save feature
- **Project-level configuration**: Support for `.cc-format.jsonc` configuration files
- **Configuration file caching**: Optimized performance with automatic file watching
- **Pure TypeScript**: No external dependencies, fast and reliable

## Installation

### From VSCode Marketplace

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "CLion CMake Formatter"
4. Click Install

### From VSIX

1. Download the `.vsix` file from the [releases page](https://github.com/wysaid/clion-cmake-formatter/releases)
2. In VSCode, go to Extensions (Ctrl+Shift+X)
3. Click the "..." menu and select "Install from VSIX..."
4. Select the downloaded file

## Usage

### Format Document

- Open a `CMakeLists.txt` or `.cmake` file
- Press `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)
- Or right-click and select "Format Document"

### Create Default Configuration File

To quickly set up a project-specific configuration:

1. Open any file in your project (or ensure a workspace folder is open)
2. Open the Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
3. Type and select "CLion CMake Formatter: Create Default Configuration File"
4. A `.cc-format.jsonc` file will be created in the project's git root directory with default settings

The command automatically:
- Finds the git root directory from the active document's location
- Handles git submodules correctly
- Falls back to workspace folders if no git repository is found
- Uses the plugin's default configuration values

### Format on Save

Add to your VSCode settings (`settings.json`):

```json
{
  "[cmake]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "wysaid.clion-cmake-formatter"
  }
}
```

## Configuration

This extension supports all major CLion CMake formatting options. Configuration can be set via:

1. **VSCode Settings**: Global or workspace settings in `settings.json`
2. **Project Configuration File**: `.cc-format.jsonc` or `.cc-format` file in your project

### Project Configuration File (`.cc-format.jsonc`)

For project-specific settings, create a `.cc-format.jsonc` file in your project root. This file:

- Uses JSONC format (JSON with comments)
- Must have the project URL as the first line comment
- Overrides VSCode settings for files in that directory and subdirectories
- Supports all the same options as VSCode settings
- Is automatically watched for changes (no restart required)

**Example `.cc-format.jsonc`:**

```jsonc
// https://github.com/wysaid/clion-cmake-formatter
{
    // Tab and Indentation
    "useTabs": false,
    "tabSize": 4,
    "indentSize": 4,
    "continuationIndentSize": 4,
    "keepIndentOnEmptyLines": false,

    // Spacing Before Parentheses
    "spaceBeforeCommandDefinitionParentheses": false,
    "spaceBeforeCommandCallParentheses": false,
    "spaceBeforeIfParentheses": true,
    "spaceBeforeForeachParentheses": true,
    "spaceBeforeWhileParentheses": true,

    // Spacing Inside Parentheses
    "spaceInsideCommandDefinitionParentheses": false,
    "spaceInsideCommandCallParentheses": false,
    "spaceInsideIfParentheses": false,
    "spaceInsideForeachParentheses": false,
    "spaceInsideWhileParentheses": false,

    // Blank Lines
    "maxBlankLines": 2,

    // Command Case: "unchanged" (default), "lowercase", or "uppercase"
    // Note: The default is "unchanged"; this is a custom setting for demonstration
    "commandCase": "lowercase",

    // Line Wrapping and Alignment
    // Note: The default is 0 (unlimited); setting a custom value here
    "lineLength": 120,
    "alignMultiLineArguments": false,
    "alignMultiLineParentheses": false,
    "alignControlFlowParentheses": false
}
```

The extension will automatically search for configuration files starting from the document's directory up to the workspace root. The first matching file found will be used.

**Configuration File Names (in order of priority):**
1. `.cc-format.jsonc`
2. `.cc-format`

You can create a default configuration file with all default settings by using the "CLion CMake Formatter: Create Default Configuration File" command from the Command Palette.

### VSCode Settings

Configure via VSCode settings (File → Preferences → Settings or `settings.json`).

### Tab and Indentation

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `clionCMakeFormatter.useTabs` | boolean | `false` | Use tabs instead of spaces for indentation |
| `clionCMakeFormatter.tabSize` | number | `4` | Number of spaces per tab character (range: 1-16) |
| `clionCMakeFormatter.indentSize` | number | `4` | Number of spaces per indentation level (range: 1-16) |
| `clionCMakeFormatter.continuationIndentSize` | number | `4` | Additional indentation for continued lines in multi-line commands (range: 1-16) |
| `clionCMakeFormatter.keepIndentOnEmptyLines` | boolean | `false` | Preserve indentation on empty lines |

### Spacing Before Parentheses

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `clionCMakeFormatter.spaceBeforeCommandDefinitionParentheses` | boolean | `false` | Add space before parentheses in `function` and `macro` definitions |
| `clionCMakeFormatter.spaceBeforeCommandCallParentheses` | boolean | `false` | Add space before parentheses in regular command calls |
| `clionCMakeFormatter.spaceBeforeIfParentheses` | boolean | `true` | Add space before parentheses in `if` statements |
| `clionCMakeFormatter.spaceBeforeForeachParentheses` | boolean | `true` | Add space before parentheses in `foreach` loops |
| `clionCMakeFormatter.spaceBeforeWhileParentheses` | boolean | `true` | Add space before parentheses in `while` loops |

### Spacing Inside Parentheses

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `clionCMakeFormatter.spaceInsideCommandDefinitionParentheses` | boolean | `false` | Add space inside parentheses in `function` and `macro` definitions |
| `clionCMakeFormatter.spaceInsideCommandCallParentheses` | boolean | `false` | Add space inside parentheses in regular command calls |
| `clionCMakeFormatter.spaceInsideIfParentheses` | boolean | `false` | Add space inside parentheses in `if` statements |
| `clionCMakeFormatter.spaceInsideForeachParentheses` | boolean | `false` | Add space inside parentheses in `foreach` loops |
| `clionCMakeFormatter.spaceInsideWhileParentheses` | boolean | `false` | Add space inside parentheses in `while` loops |

### Line Wrapping and Alignment

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `clionCMakeFormatter.lineLength` | number | `0` | Maximum line length before wrapping (0 = unlimited, minimum 30 for non-zero values) |
| `clionCMakeFormatter.alignMultiLineArguments` | boolean | `false` | Align arguments vertically in multi-line commands |
| `clionCMakeFormatter.alignMultiLineParentheses` | boolean | `false` | Align closing parenthesis with opening line in multi-line commands |
| `clionCMakeFormatter.alignControlFlowParentheses` | boolean | `false` | Align control flow statement parentheses in multi-line format |

### Other Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `clionCMakeFormatter.commandCase` | string | `"unchanged"` | Command name case transformation: `"unchanged"`, `"lowercase"`, or `"uppercase"` |
| `clionCMakeFormatter.maxBlankLines` | number | `2` | Maximum number of consecutive blank lines to preserve (range: 0-10) |
| `clionCMakeFormatter.enableProjectConfig` | boolean | `true` | Enable reading project-level configuration from `.cc-format.jsonc` files |

### Configuration Example

```json
{
  "clionCMakeFormatter.commandCase": "lowercase",
  "clionCMakeFormatter.indentSize": 4,
  "clionCMakeFormatter.spaceBeforeIfParentheses": true,
  "clionCMakeFormatter.lineLength": 0,
  "clionCMakeFormatter.alignMultiLineArguments": false
}
```

## Example

### Before formatting:

```cmake
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(MyProject)
SET(SOURCES src/main.cpp src/utils.cpp src/parser.cpp src/formatter.cpp src/renderer.cpp)
IF(WIN32)
TARGET_LINK_LIBRARIES(myapp ws2_32)
ENDIF()
```

### After formatting:

```cmake
cmake_minimum_required(VERSION 3.10)
project(MyProject)
set(SOURCES src/main.cpp src/utils.cpp src/parser.cpp src/formatter.cpp
    src/renderer.cpp)
if(WIN32)
    target_link_libraries(myapp ws2_32)
endif()
```

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
# Clone the repository
git clone https://github.com/wysaid/clion-cmake-formatter.git
cd clion-cmake-formatter

# Install dependencies
npm install

# Compile
npm run compile

# Run tests
npm run test:unit

# Package for distribution
npm run package
```

### Project Structure

```
clion-cmake-formatter/
├── .vscode/               # VSCode development configuration
│   ├── launch.json        # Debug launch configurations
│   ├── tasks.json         # Build tasks
│   ├── settings.json      # Workspace settings
│   └── extensions.json    # Recommended extensions
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
│       ├── ci.yml         # Continuous integration
│       └── release.yml    # Release automation
├── src/
│   ├── parser.ts          # CMake tokenizer and AST builder
│   ├── formatter.ts       # Formatting logic
│   ├── config.ts          # Configuration file support
│   └── extension.ts       # VSCode integration
├── test/
│   ├── parser.test.ts     # Parser tests
│   ├── formatter.test.ts  # Formatter tests
│   └── config.test.ts     # Configuration tests
├── resources/
│   ├── sample-input.cmake
│   └── cc-format.schema.json  # JSON Schema for .cc-format.jsonc
├── package.json
├── package.nls.json       # English language pack (default)
├── package.nls.zh-cn.json # Chinese language pack
├── tsconfig.json
├── README.md
└── README.zh-CN.md        # Chinese documentation
```

### Debugging the Extension

1. Open this project in VSCode
2. Press `F5` or go to "Run and Debug" (Ctrl+Shift+D)
3. Select "Launch Extension" from the dropdown
4. A new VSCode window will open with the extension loaded
5. Open a `CMakeLists.txt` file and test the formatter

For continuous development, use "Launch Extension (Watch Mode)" after running `npm run watch` in a terminal.

## Formatting Rules

This extension implements CLion's CMake formatting rules:

1. **Command case transformation**: Configurable case conversion (unchanged/lowercase/uppercase)
2. **Consistent indentation**: Configurable spaces or tabs per indentation level
3. **Smart line wrapping**: Automatically breaks lines exceeding the maximum length
4. **Block structure**: Proper indentation for control flow and function definition blocks
5. **Multi-line preservation**: Commands already split across multiple lines maintain their structure
6. **Argument spacing**: Single space between arguments, no trailing whitespace
7. **Comment handling**: Preserves standalone, inline, and trailing comments
8. **Blank line management**: Limits consecutive blank lines while preserving logical grouping
9. **Parenthesis spacing**: Configurable spacing before and inside parentheses for different command types

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Acknowledgments

This project's VSCode extension structure and development configuration is inspired by:

- **[ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin)** - For excellent VSCode extension development practices including debug configurations, CI/CD workflows, and project structure.

- **[cmake_format](https://github.com/cheshirekow/cmake_format)** - For comprehensive CMake formatting configuration options. The formatting options design in this extension is inspired by cmake_format's approach to configurable CMake styling.

## Related Projects

- [ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin) - Auto configuration for EGE graphics library
- [cmake_format](https://github.com/cheshirekow/cmake_format) - Source code beautifier for CMake (Python)
