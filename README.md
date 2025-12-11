# CLion CMake Formatter

A VSCode extension that formats CMakeLists.txt files with JetBrains CLion's indentation, spacing, and alignment style. **Zero external dependencies** - no Python, cmake-format, or gersemi required.

English | [简体中文](README.zh-CN.md)

## Features

- **CLion-compatible formatting**: Matches JetBrains CLion's formatting rules
- **Lowercase commands**: Automatically converts command names to lowercase (`PROJECT` → `project`)
- **Smart indentation**: 4 spaces per level (configurable)
- **Multi-line support**: Intelligently breaks long argument lists
- **Block formatting**: Proper indentation for `if/endif`, `function/endfunction`, `macro/endmacro`, `foreach/endforeach`, `while/endwhile`
- **Comment preservation**: Keeps your comments in place
- **Format on save**: Works with VSCode's built-in format-on-save feature
- **No external dependencies**: Pure TypeScript implementation

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

### Basic Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `clionCMakeFormatter.useTabs` | `false` | Use tabs for indentation instead of spaces |
| `clionCMakeFormatter.tabSize` | `4` | Number of spaces equivalent to one tab |
| `clionCMakeFormatter.indentSize` | `4` | Number of spaces for indentation |
| `clionCMakeFormatter.continuationIndentSize` | `4` | Number of spaces for continuation indent |
| `clionCMakeFormatter.keepIndentOnEmptyLines` | `false` | Keep indent on empty lines |
| `clionCMakeFormatter.lineLength` | `120` | Maximum line length |
| `clionCMakeFormatter.commandCase` | `"unchanged"` | Force command case: `"unchanged"`, `"lowercase"`, or `"uppercase"` |
| `clionCMakeFormatter.maxBlankLines` | `2` | Maximum consecutive blank lines |

### Spacing Before Parentheses

| Setting | Default | Description |
|---------|---------|-------------|
| `clionCMakeFormatter.spaceBeforeCommandDefinitionParentheses` | `false` | Space before `function`/`macro` parentheses |
| `clionCMakeFormatter.spaceBeforeCommandCallParentheses` | `false` | Space before command call parentheses |
| `clionCMakeFormatter.spaceBeforeIfParentheses` | `true` | Space before `if` parentheses |
| `clionCMakeFormatter.spaceBeforeForeachParentheses` | `true` | Space before `foreach` parentheses |
| `clionCMakeFormatter.spaceBeforeWhileParentheses` | `true` | Space before `while` parentheses |

### Spacing Inside Parentheses

| Setting | Default | Description |
|---------|---------|-------------|
| `clionCMakeFormatter.spaceInsideCommandDefinitionParentheses` | `false` | Space inside `function`/`macro` parentheses |
| `clionCMakeFormatter.spaceInsideCommandCallParentheses` | `false` | Space inside command call parentheses |
| `clionCMakeFormatter.spaceInsideIfParentheses` | `false` | Space inside `if` parentheses |
| `clionCMakeFormatter.spaceInsideForeachParentheses` | `false` | Space inside `foreach` parentheses |
| `clionCMakeFormatter.spaceInsideWhileParentheses` | `false` | Space inside `while` parentheses |

### Alignment (Multi-line)

| Setting | Default | Description |
|---------|---------|-------------|
| `clionCMakeFormatter.alignMultiLineArguments` | `false` | Align arguments when multi-line |
| `clionCMakeFormatter.alignMultiLineParentheses` | `false` | Align parentheses when multi-line |
| `clionCMakeFormatter.alignControlFlowParentheses` | `false` | Align control flow parentheses when multi-line |

Example `settings.json`:

```json
{
  "clionCMakeFormatter.commandCase": "lowercase",
  "clionCMakeFormatter.indentSize": 4,
  "clionCMakeFormatter.spaceBeforeIfParentheses": false,
  "clionCMakeFormatter.lineLength": 100
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
│   └── extension.ts       # VSCode integration
├── test/
│   ├── parser.test.ts
│   └── formatter.test.ts
├── resources/
│   └── sample-input.cmake
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

This extension implements the following CLion-compatible formatting rules:

1. **Command case**: Configurable (unchanged/lowercase/uppercase, default: unchanged)
2. **Indentation**: 4 spaces per block level (configurable)
3. **Line length**: 120 characters max (configurable), with intelligent line breaking
4. **Block indentation**: Contents of `if`, `function`, `macro`, `foreach`, `while` blocks are indented
5. **Multi-line preservation**: Already multi-line commands stay multi-line with one argument per line
6. **Argument formatting**: Single space between arguments, no trailing spaces
7. **Comment preservation**: Inline comments and trailing comments are preserved
8. **Blank lines**: Preserved between logical sections (limited by maxBlankLines setting)

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
