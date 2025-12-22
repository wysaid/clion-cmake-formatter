# CLion CMake Format

[![CI](https://github.com/wysaid/clion-cmake-format/actions/workflows/ci.yml/badge.svg)](https://github.com/wysaid/clion-cmake-format/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-blue.svg)](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)
[![Downloads](https://img.shields.io/visual-studio-marketplace/d/wysaid.clion-cmake-format)](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)

**Professional CMake code formatting for VS Code** — Format your `CMakeLists.txt` and `*.cmake` files with JetBrains CLion's proven formatting style. **Zero external dependencies** — no Python, cmake-format, or gersemi required. Pure TypeScript, lightning fast.

> **Project Codename**: `cc-format` (CLion CMake Format)
> **Why choose this formatter?** Precision, configurability, and zero hassle. If you value clean, maintainable CMake scripts, this is for you.

English | [简体中文](README.zh-CN.md)

## ✨ Why This Extension?

### 🎯 CLion-Quality Formatting
Precisely replicates JetBrains CLion's CMake formatting — trusted by millions of professional developers worldwide. Get consistent, readable code across your entire team.

### ⚡ Zero Setup Required
No Python installation. No pip packages. No configuration hell. Just install and format — it works out of the box.

### 🔧 Fully Customizable
23 configuration options give you complete control:
- **Indentation**: tabs, spaces, size, continuation
- **Spacing**: before/inside parentheses for all command types
- **Line Wrapping**: custom length, alignment rules
- **Command Case**: lowercase, UPPERCASE, or unchanged
- **And more**: blank lines, project configs, auto-watch

### 📁 Project-Level Config Files
Use `.cc-format.jsonc` files to share formatting rules across your team. Supports automatic file watching — changes apply instantly.

### ✅ Battle-Tested Quality
- **126+ unit tests** ensuring rock-solid reliability
- **Idempotency validated** — formatting twice gives identical results
- **CMake official tests** — 20 real-world files from CMake's own repository (6,302 lines)
- **100% pass rate** ✅

### 🚀 Performance
Pure TypeScript implementation. No spawning external processes. Fast, reliable, and efficient.

## 🚀 Quick Start

### 1️⃣ Install

#### Option A: From VS Code Marketplace (Recommended)
1. Open VS Code
2. Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
3. Search for **"CLion CMake Format"**
4. Click **Install**

### Option B: From VSIX File
1. Download `.vsix` from [Releases](https://github.com/wysaid/clion-cmake-format/releases)
2. Open Extensions in VS Code (`Ctrl+Shift+X`)
3. Click `...` → **Install from VSIX...**

### 2️⃣ Format Your Code

### Method 1: Keyboard Shortcut
- Open any `CMakeLists.txt` or `*.cmake` file
- Press `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (Mac)

### Method 2: Context Menu
- Right-click in the editor → **Format Document**

### Method 3: Format on Save (Recommended)

Add to your VS Code `settings.json`:

```json
{
  "[cmake]": {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "wysaid.clion-cmake-format"
  }
}
```

### 3️⃣ (Optional) Create Project Config

Share formatting rules with your team:

1. Open Command Palette (`Ctrl+Shift+P` or `Cmd+Shift+P`)
2. Run **"CLion CMake Format: Create Default Configuration File"**
3. Edit `.cc-format.jsonc` in your project root

Changes are applied automatically — no restart needed!

## 📋 Before & After Examples

### Example 1: Basic Formatting

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

### Example 2: Complex Projects

Works seamlessly with:
- ✅ Multi-line commands with arguments
- ✅ Nested `if`/`else`/`endif` blocks
- ✅ `foreach` and `while` loops
- ✅ Function and macro definitions
- ✅ Comments (inline and standalone)
- ✅ Quoted strings and escape sequences
- ✅ Generator expressions

## ⚙️ Configuration Options

Customize formatting behavior via:
1. **VS Code Settings** — Global or per-workspace
2. **Project Config File** — `.cc-format.jsonc` in your project root (takes precedence)

### Popular Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `indentSize` | `4` | Spaces per indentation level (1-16) |
| `useTabs` | `false` | Use tabs instead of spaces |
| `commandCase` | `"unchanged"` | Command case: `unchanged` / `lowercase` / `uppercase` |
| `lineLength` | `0` | Max line length (0 = unlimited, min 30 if set) |
| `maxBlankLines` | `2` | Maximum consecutive blank lines (0-20) |
| `maxTrailingBlankLines` | `0` | Maximum blank lines at end of file (0-1) |
| `spaceBeforeIfParentheses` | `true` | Space before `if ()` / `elseif ()` / `endif ()` |
| `spaceBeforeForeachParentheses` | `true` | Space before `foreach ()` / `endforeach ()` |
| `alignMultiLineArguments` | `false` | Align arguments vertically |
| `enableProjectConfig` | `true` | Enable reading `.cc-format.jsonc` files |

### Sample Project Config

Create `.cc-format.jsonc` in your project root:

```jsonc
// https://github.com/wysaid/clion-cmake-format
{
    // Tab and Indentation
    "useTabs": false,
    "tabSize": 4,
    "indentSize": 4,
    "continuationIndentSize": 8,
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
    "maxTrailingBlankLines": 0,

    // Command Case: "unchanged", "lowercase", or "uppercase"
    "commandCase": "unchanged",

    // Line Wrapping and Alignment
    "lineLength": 0,
    "alignMultiLineArguments": false,
    "alignMultiLineParentheses": false,
    "alignControlFlowParentheses": false
}
```

📖 **[View all 23 configuration options →](https://github.com/wysaid/clion-cmake-format#full-configuration-reference)**

## 📚 Additional Resources

- 📖 **[Complete Configuration Reference](#full-configuration-reference)** — All 23 options explained
- 🛠️ **[Contributing Guide](CONTRIBUTING.md)** — Development setup, testing, and contribution guidelines
- 📝 **[Changelog](CHANGELOG.md)** — Release history and updates
- 🐛 **[Report Issues](https://github.com/wysaid/clion-cmake-format/issues)** — Bug reports and feature requests
- 💬 **[Discussions](https://github.com/wysaid/clion-cmake-format/discussions)** — Questions and community support

---

## 📖 Full Configuration Reference

> **⚠️ Note**: Version 1.3.0+ changed the default `continuationIndentSize` from 4 to 8 to match CLion's default. If you prefer the previous default, add `"continuationIndentSize": 4` to your `.cc-format.jsonc` file.

### Tab and Indentation

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `useTabs` | boolean | `false` | Use tabs instead of spaces |
| `tabSize` | number | `4` | Spaces per tab (1-16) |
| `indentSize` | number | `4` | Spaces per indent level (1-16) |
| `continuationIndentSize` | number | `8` | Continuation line indent (1-16) ⚠️ _Changed from 4 in v1.3.0_ |
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
| `maxTrailingBlankLines` | number | `1` | Max blank lines at end of file (>= 0, set large number to keep all) |
| `enableProjectConfig` | boolean | `true` | Enable `.cc-format.jsonc` files |

---

## 💡 Tips & Best Practices

### Formatting Behavior

- **Idempotent**: Formatting twice produces identical output
- **Comment Preservation**: All comments (inline and standalone) are preserved
- **Whitespace Handling**: Smart whitespace normalization without data loss
- **Line Wrapping**: Intelligent line breaking respects `lineLength` setting

### Recommended Settings for Teams

```jsonc
{
    "commandCase": "lowercase",           // Modern CMake convention
    "indentSize": 4,                      // Standard indentation
    "lineLength": 120,                    // Readable line length
    "maxBlankLines": 1,                   // Compact formatting
    "spaceBeforeIfParentheses": true,     // Clear control flow
    "spaceBeforeForeachParentheses": true,
    "spaceBeforeWhileParentheses": true
}
```

### Differences from CLion

This extension aims for CLion compatibility with **one intentional enhancement**:

**Loop Control Commands** (`break`/`continue`) follow their parent loop's spacing rules, providing more consistent formatting:

```cmake
# With spaceBeforeForeachParentheses: true
foreach (item IN LISTS items)
    if (condition)
        break ()      # Consistent with foreach ()
    endif ()
endforeach ()
```

*CLion ignores spacing rules for `break`/`continue`, which can feel inconsistent.*

---

## 🛠️ For Developers

Want to contribute or customize the extension? Check out our **[Contributing Guide](CONTRIBUTING.md)** for:

- 🔧 Development environment setup
- 📜 Available npm scripts
- 📂 Project structure overview
- 🐛 Debugging instructions
- ✅ Testing guidelines
- 📝 Code style and PR guidelines

**Quick Start for Development:**
```bash
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
npm install && npm run compile && npm run test:unit
```

---

## 📜 License

[MIT License](LICENSE) © [wysaid](https://github.com/wysaid)

Free for personal and commercial use.

---

## 🙏 Acknowledgments

- **[JetBrains CLion](https://www.jetbrains.com/clion/)** — Inspiration for formatting behavior
- **[cmake_format](https://github.com/cheshirekow/cmake_format)** — Configuration options reference
- **[ege-vscode-plugin](https://github.com/x-ege/ege-vscode-plugin)** — VS Code extension development practices

---

## 🌟 Support This Project

If this extension helped you, consider:
- ⭐ **[Star on GitHub](https://github.com/wysaid/clion-cmake-format)**
- ✍️ **[Leave a review](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format&ssr=false#review-details)**
- 🐛 **[Report issues](https://github.com/wysaid/clion-cmake-format/issues)**
- 💬 **[Share feedback](https://github.com/wysaid/clion-cmake-format/discussions)**

Thank you! 🙌
