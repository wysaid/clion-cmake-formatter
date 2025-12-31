# CLion CMake Format - VS Code Extension

**Professional CMake code formatter with CLion-compatible style for Visual Studio Code**

## 📌 About This Project

CLion CMake Format is a VS Code extension that provides professional CMake code formatting based on JetBrains CLion's built-in formatting style. This extension is part of the **CLion CMake Format** project, which offers consistent CMake formatting across different development tools and environments.

This extension uses the same core formatting engine ([@cc-format/core](https://www.npmjs.com/package/@cc-format/core)) as the CLI tool, ensuring **consistent formatting results** whether you format files in your editor or via command line.

### Why Use This Extension?

- **⚡ Zero Dependencies** - Pure TypeScript implementation, no external tools required
- **🎯 CLion-Compatible** - Matches CLion's formatting rules exactly for consistent code style
- **🔧 Zero Setup** - Install and format immediately with sensible defaults
- **🛠️ Highly Customizable** - 23+ configuration options for complete control
- **📁 Project Config Support** - Use `.cc-format.jsonc` files to share formatting rules with your team
- **🚀 Fast & Reliable** - Instant formatting with idempotent results

### Project Links

- 🌐 **GitHub Repository** — [wysaid/clion-cmake-format](https://github.com/wysaid/clion-cmake-format)
- 💻 **CLI Tool** — [cc-format](https://www.npmjs.com/package/cc-format) npm package
- 📚 **Core Library** — [@cc-format/core](https://www.npmjs.com/package/@cc-format/core) for developers
- 📖 **Full Documentation** — [GitHub Wiki](https://github.com/wysaid/clion-cmake-format#readme)

## Installation

Install the extension from the VS Code Marketplace or via:

```bash
code --install-extension wysaid.clion-cmake-format
```

## Quick Start

1. Open a CMake file (`.cmake` or `CMakeLists.txt`)
2. Right-click and select "Format Document" or press `Shift+Alt+F`
3. The file will be formatted according to your configuration

## Configuration

Create a `.cc-format.jsonc` file in your project root:

```jsonc
// https://github.com/wysaid/clion-cmake-format
{
    // Indentation
    "indentSize": 4,
    "useTabs": false,
    "tabSize": 4,
    "continuationIndentSize": 8,

    // Spacing
    "spaceBeforeIfParentheses": true,
    "spaceBeforeForeachParentheses": true,
    "spaceBeforeWhileParentheses": true,

    // Formatting
    "commandCase": "lowercase",
    "lineLength": 120,
    "maxBlankLines": 2,
    "alignMultiLineArguments": false
}
```

### Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `indentSize` | number | 4 | Number of spaces for indentation |
| `useTabs` | boolean | false | Use tabs instead of spaces |
| `tabSize` | number | 4 | Number of spaces per tab |
| `continuationIndentSize` | number | 8 | Continuation line indent size |
| `commandCase` | string | unchanged | Command case: `unchanged`, `lowercase`, `uppercase` |
| `lineLength` | number | 0 | Maximum line length (0 for unlimited) |
| `maxBlankLines` | number | 2 | Maximum consecutive blank lines |
| `alignMultiLineArguments` | boolean | false | Align multi-line arguments |

### VS Code Settings

You can also configure the formatter in VS Code settings (`.vscode/settings.json`):

```json
{
    "clionCMakeFormatter.indentSize": 4,
    "clionCMakeFormatter.commandCase": "lowercase",
    "clionCMakeFormatter.lineLength": 120,
    "clionCMakeFormatter.enableProjectConfig": true
}
```

Configuration priority (highest to lowest):
1. Project config (`.cc-format.jsonc` in workspace root)
2. VS Code workspace settings (`.vscode/settings.json`)
3. VS Code user settings
4. Default options

**Note:** Project-level `.cc-format.jsonc` files take precedence over VS Code settings to ensure team-wide consistency. To disable this behavior, set `"clionCMakeFormatter.enableProjectConfig": false`.

## Keyboard Shortcuts

- **Format Document** - `Shift+Alt+F` (or `Shift+Option+F` on macOS)
- **Format Selection** - `Ctrl+K Ctrl+F` (or `Cmd+K Cmd+F` on macOS)

## Commands

- **CMake Format: Format Document** - Format the current CMake file
- **CMake Format: Create Config** - Generate a `.cc-format.jsonc` template

## Project Configuration

Place a `.cc-format.jsonc` file in your project root to apply formatting rules to the entire project:

```jsonc
// .cc-format.jsonc
{
    "indentSize": 4,
    "commandCase": "lowercase",
    "lineLength": 100
}
```

## Examples

### Before

```cmake
project(MyProject)
set(SOURCES src/main.cpp src/util.cpp src/config.cpp)
add_executable(myapp ${SOURCES})
target_link_libraries(myapp PRIVATE pthread)
```

### After (with default formatting)

```cmake
project(MyProject)
set(SOURCES
    src/main.cpp
    src/util.cpp
    src/config.cpp
)
add_executable(myapp ${SOURCES})
target_link_libraries(myapp PRIVATE pthread)
```

## Troubleshooting

### Extension not formatting files

1. Check that the file is recognized as CMake (should show `cmake` in the bottom right)
2. Verify VS Code has a formatter registered for CMake files
3. Check the extension output panel for error messages
4. Ensure the file extension is `.cmake` or the filename is `CMakeLists.txt`

### Configuration not being applied

1. Ensure `.cc-format.jsonc` is in the workspace root (where you opened the folder in VS Code)
2. Check that `clionCMakeFormatter.enableProjectConfig` is `true` in settings
3. Reload VS Code (`Ctrl+Shift+P` → "Reload Window") to refresh the configuration
4. Check for syntax errors in your `.cc-format.jsonc` file

### Format on Save not working

1. Verify `editor.formatOnSave` is `true` for CMake files:
   ```json
   {
     "[cmake]": {
       "editor.formatOnSave": true,
       "editor.defaultFormatter": "wysaid.clion-cmake-format"
     }
   }
   ```
2. Check that no other CMake formatter extension is conflicting
3. Try manually formatting (`Shift+Alt+F`) to verify the extension is working

## Related Packages

- **[@cc-format/core](https://www.npmjs.com/package/@cc-format/core)** — Core formatting engine for integration into your own tools
- **[cc-format](https://www.npmjs.com/package/cc-format)** — Command-line interface for CI/CD and terminal usage

## Related Links

- [GitHub Repository](https://github.com/wysaid/clion-cmake-format)
- [Project Documentation](https://github.com/wysaid/clion-cmake-format/blob/main/README.md)
- [Issue Tracker](https://github.com/wysaid/clion-cmake-format/issues)
- [Discussions](https://github.com/wysaid/clion-cmake-format/discussions)

## License

MIT
