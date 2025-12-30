# cc-format

**Professional CMake code formatter with CLion-compatible style**

## 📌 About This Project

`cc-format` is a command-line tool that provides professional CMake code formatting with formatting rules that match JetBrains CLion's built-in CMake formatting style. This tool is part of the **CLion CMake Format** project.

### Why Use cc-format?

- **⚡ No External Dependencies** - Pure TypeScript implementation. No need to install Python, cmake-format, or gersemi
- **🎯 CLion-Compatible** - Matches CLion's proven formatting style trusted by millions of developers
- **🔧 Zero Setup** - Works out of the box with sensible defaults
- **⚙️ Highly Configurable** - 23+ configuration options for fine-grained control
- **🚀 Fast & Reliable** - Lightning-fast formatting with idempotent results

### Project Links

- 🌐 **GitHub Repository** — [wysaid/clion-cmake-format](https://github.com/wysaid/clion-cmake-format)
- 📦 **npm Package** — [@cc-format/core](https://www.npmjs.com/package/cc-format)
- 🔌 **VS Code Extension** — [clion-cmake-format](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)
- 📖 **Full Documentation** — [GitHub Wiki](https://github.com/wysaid/clion-cmake-format#readme)

## Installation

```bash
# Install globally
npm install -g cc-format

# Or use with npx (no installation required)
npx cc-format --help
```

## Usage

```bash
# Format a single file (output to stdout)
cc-format CMakeLists.txt

# Format and write back to file
cc-format -w CMakeLists.txt

# Format all CMake files in a directory
cc-format -w src/

# Check if files are formatted (for CI)
cc-format --check CMakeLists.txt

# Format from stdin
echo 'project(Test)' | cc-format --stdin
```

## Options

| Option | Description |
|--------|-------------|
| `-w, --write` | Write formatted output back to files |
| `-c, --check` | Check if files are formatted (exit 1 if not) |
| `--stdin` | Read from stdin and write to stdout |
| `--no-project-config` | Ignore project-level `.cc-format.jsonc` files |
| `--command-case <case>` | Set command case: `unchanged`, `lowercase`, `uppercase` |
| `--indent-size <size>` | Number of spaces for indentation |
| `--use-tabs` | Use tabs instead of spaces |
| `--line-length <length>` | Maximum line length (0 for unlimited) |
| `--init` | Create a `.cc-format.jsonc` config file in current directory |
| `--init-global` | Create a global config file |
| `--config-path` | Show path to global config file |

## Configuration

Create a `.cc-format.jsonc` file in your project root:

```jsonc
// https://github.com/wysaid/clion-cmake-format
{
    "indentSize": 4,
    "commandCase": "lowercase",
    "lineLength": 120
}
```

### Global Configuration

```bash
# Create global config
cc-format --init-global

# Show global config path
cc-format --config-path
# Output: ~/.config/cc-format/.cc-format.jsonc
```

Settings priority:
1. CLI options (highest)
2. Project config (`.cc-format.jsonc` in project directory)
3. Global config (`~/.config/cc-format/.cc-format.jsonc`)
4. Default options (lowest)

## CI/CD Integration

### GitHub Actions

```yaml
- name: Check CMake formatting
  run: npx cc-format --check **/*.cmake CMakeLists.txt
```

### Pre-commit Hook

```bash
#!/bin/sh
cc-format --check $(git diff --cached --name-only --diff-filter=ACM | grep -E '\.(cmake|CMakeLists\.txt)$') || exit 1
```

## License

MIT
