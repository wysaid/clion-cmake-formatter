# CLion CMake Formatter

[![CI](https://github.com/wysaid/clion-cmake-formatter/actions/workflows/ci.yml/badge.svg)](https://github.com/wysaid/clion-cmake-formatter/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-formatter)

A VS Code extension that formats CMake files (`CMakeLists.txt` and `*.cmake`) using JetBrains CLion's formatting style. **Zero external dependencies** — no Python, cmake-format, or gersemi required.

> **Project Codename**: `cc-format` (CLion CMake Format)

English | [简体中文](README.zh-CN.md)

## ✨ Features

- 🎯 **CLion-Compatible Formatting** — Precisely replicates JetBrains CLion's CMake formatting behavior
- 🔧 **Highly Configurable** — 21 configuration options for indentation, spacing, line wrapping, and more
- 📁 **Project-Level Configuration** — Support for `.cc-format.jsonc` files with automatic watching
- 🚀 **Zero Dependencies** — Pure TypeScript implementation, fast and reliable
- 🌍 **Multi-Language Support** — English and Chinese interface
- ✅ **Thoroughly Tested** — 126+ unit tests with idempotency validation

## 📦 Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "**CLion CMake Formatter**"
4. Click **Install**

### From VSIX

1. Download the `.vsix` file from the [Releases](https://github.com/wysaid/clion-cmake-formatter/releases) page
2. In VS Code, go to Extensions (`Ctrl+Shift+X`)
3. Click `...` → **Install from VSIX...**
4. Select the downloaded file

## 🚀 Quick Start

### Format a Document

- Open a `CMakeLists.txt` or `*.cmake` file
- Press `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)
- Or right-click → **Format Document**

### Enable Format on Save

Add to your VS Code `settings.json`:

```json
{
  "[cmake]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "wysaid.clion-cmake-formatter"
  }
}
```

### Create a Project Configuration File

1. Open the Command Palette (`Ctrl+Shift+P`)
2. Run **CLion CMake Formatter: Create Default Configuration File**
3. A `.cc-format.jsonc` file will be created in your project root

## 📋 Example

**Before:**
```cmake
CMAKE_MINIMUM_REQUIRED(VERSION 3.10)
PROJECT(MyProject)
SET(SOURCES src/main.cpp src/utils.cpp src/parser.cpp src/formatter.cpp src/renderer.cpp)
IF(WIN32)
TARGET_LINK_LIBRARIES(myapp ws2_32)
ENDIF()
```

**After** (with `commandCase: "lowercase"`):
```cmake
cmake_minimum_required(VERSION 3.10)
project(MyProject)
set(SOURCES
    src/main.cpp
    src/utils.cpp
    src/parser.cpp
    src/formatter.cpp
    src/renderer.cpp)
if (WIN32)
    target_link_libraries(myapp ws2_32)
endif ()
```

## ⚙️ Configuration

Configuration can be set via:
1. **VS Code Settings** — Global or workspace settings
2. **Project File** — `.cc-format.jsonc` in your project root

### Key Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indentSize` | number | `4` | Spaces per indentation level (1-16) |
| `useTabs` | boolean | `false` | Use tabs instead of spaces |
| `commandCase` | string | `"unchanged"` | Command case: `unchanged`, `lowercase`, `uppercase` |
| `lineLength` | number | `0` | Max line length (0 = unlimited) |
| `maxBlankLines` | number | `2` | Max consecutive blank lines (0-20) |
| `spaceBeforeIfParentheses` | boolean | `true` | Space before `if()` parentheses |
| `enableProjectConfig` | boolean | `true` | Enable `.cc-format.jsonc` reading |

📖 See [full configuration reference](#full-configuration-reference) below for all 21 options.

### Project Configuration File

Create `.cc-format.jsonc` in your project root:

```jsonc
// https://github.com/wysaid/clion-cmake-formatter
{
    "indentSize": 4,
    "commandCase": "lowercase",
    "spaceBeforeIfParentheses": true,
    "lineLength": 120
}
```

## 📖 Full Configuration Reference

### Tab and Indentation

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `useTabs` | boolean | `false` | Use tabs instead of spaces |
| `tabSize` | number | `4` | Spaces per tab (1-16) |
| `indentSize` | number | `4` | Spaces per indent level (1-16) |
| `continuationIndentSize` | number | `4` | Continuation line indent (1-16) |
| `keepIndentOnEmptyLines` | boolean | `false` | Preserve indent on empty lines |

### Spacing Before Parentheses

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `spaceBeforeCommandDefinitionParentheses` | boolean | `false` | `function()` / `macro()` |
| `spaceBeforeCommandCallParentheses` | boolean | `false` | Regular commands |
| `spaceBeforeIfParentheses` | boolean | `true` | `if()` / `elseif()` / `else()` / `endif()` |
| `spaceBeforeForeachParentheses` | boolean | `true` | `foreach()` / `endforeach()` |
| `spaceBeforeWhileParentheses` | boolean | `true` | `while()` / `endwhile()` |

### Spacing Inside Parentheses

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `spaceInsideCommandDefinitionParentheses` | boolean | `false` | `function( )` / `macro( )` |
| `spaceInsideCommandCallParentheses` | boolean | `false` | Regular commands |
| `spaceInsideIfParentheses` | boolean | `false` | `if( )` statements |
| `spaceInsideForeachParentheses` | boolean | `false` | `foreach( )` loops |
| `spaceInsideWhileParentheses` | boolean | `false` | `while( )` loops |

### Line Wrapping and Alignment

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `lineLength` | number | `0` | Max line length (0 = unlimited, min 30 for non-zero) |
| `alignMultiLineArguments` | boolean | `false` | Align arguments vertically |
| `alignMultiLineParentheses` | boolean | `false` | Align closing parenthesis |
| `alignControlFlowParentheses` | boolean | `false` | Align control flow parentheses |

### Other Options

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `commandCase` | string | `"unchanged"` | `unchanged`, `lowercase`, or `uppercase` |
| `maxBlankLines` | number | `2` | Max consecutive blank lines (0-20) |
| `enableProjectConfig` | boolean | `true` | Enable `.cc-format.jsonc` files |

## 🛠️ Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
git clone https://github.com/wysaid/clion-cmake-formatter.git
cd clion-cmake-formatter
npm install
npm run compile
npm run test:unit
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run compile` | Compile TypeScript |
| `npm run watch` | Watch mode compilation |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run all unit tests |
| `npm run package` | Package as `.vsix` |

### Project Structure

```
clion-cmake-formatter/
├── src/
│   ├── parser.ts      # CMake tokenizer and AST builder
│   ├── formatter.ts   # Formatting logic
│   ├── config.ts      # Configuration file support
│   └── extension.ts   # VS Code integration
├── test/
│   └── datasets/      # Test fixtures
├── resources/
│   └── cc-format.schema.json  # JSON Schema
└── docs/              # Additional documentation
```

### Debugging

1. Open this project in VS Code
2. Press `F5` or go to **Run and Debug**
3. Select **Launch Extension**
4. A new VS Code window opens with the extension loaded

## 📊 Test Coverage

- **126+ unit tests** covering parser, formatter, and configuration
- **Idempotency tests** — formatting twice produces identical output
- **CMake official tests** — 20 files from CMake repository (6,302 lines)
- **100% pass rate** ✅

## 🔄 Differences from CLion

This extension aims for CLion compatibility, with one intentional difference:

**Loop Control Commands** (`break`/`continue`): Follow the same spacing rules as their parent loop (`foreach`/`while`), unlike CLion which ignores spacing for these commands.

```cmake
# With spaceBeforeForeachParentheses: true
foreach (item IN LISTS items)
    break ()      # Consistent with foreach ()
endforeach ()
```

## 📜 License

[MIT](LICENSE) © [wysaid](https://github.com/wysaid)

## 🙏 Acknowledgments

- [ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin) — VS Code extension development practices
- [cmake_format](https://github.com/cheshirekow/cmake_format) — Configuration options inspiration

## 🔗 Links

- [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-formatter)
- [GitHub Repository](https://github.com/wysaid/clion-cmake-formatter)
- [Report Issues](https://github.com/wysaid/clion-cmake-formatter/issues)
- [Changelog](CHANGELOG.md)
