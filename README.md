# CLion CMake Formatter

A VSCode extension that formats CMakeLists.txt files with JetBrains CLion's indentation, spacing, and alignment style. **Zero external dependencies** - no Python, cmake-format, or gersemi required.

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

| Setting | Default | Description |
|---------|---------|-------------|
| `clionCMakeFormatter.lineLength` | `120` | Maximum line length for formatted files |
| `clionCMakeFormatter.indentSize` | `4` | Number of spaces for indentation |
| `clionCMakeFormatter.useSpaces` | `true` | Use spaces (true) or tabs (false) |

Example `settings.json`:

```json
{
  "clionCMakeFormatter.lineLength": 80,
  "clionCMakeFormatter.indentSize": 2,
  "clionCMakeFormatter.useSpaces": true
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
├── tsconfig.json
└── README.md
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

1. **Command names**: Always lowercase (`project`, `set`, `if`, etc.)
2. **Indentation**: 4 spaces per block level (configurable)
3. **Line length**: 120 characters max (configurable), with intelligent line breaking
4. **Block indentation**: Contents of `if`, `function`, `macro`, `foreach`, `while` blocks are indented
5. **Argument formatting**: Single space between arguments, no trailing spaces
6. **Comment preservation**: Comments are preserved and properly indented
7. **Blank lines**: Preserved between logical sections

## License

MIT License - see [LICENSE](LICENSE) for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Acknowledgments

This project's VSCode extension structure and development configuration is inspired by [ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin). We thank the ege-vscode-plugin authors for their excellent example of VSCode extension development practices, including:

- Debug launch configurations
- GitHub Actions CI/CD workflows
- Project structure and build setup

## Related Projects

- [ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin) - Auto configuration for EGE graphics library
