# cc-format

[![npm version](https://img.shields.io/npm/v/cc-format.svg)](https://www.npmjs.com/package/cc-format)
[![npm downloads](https://img.shields.io/npm/dm/cc-format.svg)](https://www.npmjs.com/package/cc-format)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/node/v/cc-format.svg)](https://nodejs.org/)

**Professional CMake code formatter with CLion-compatible style**

## 📌 About This Project

`cc-format` is a command-line tool that provides professional CMake code formatting with formatting rules that match JetBrains CLion's built-in CMake formatting style. This tool is part of the **CLion CMake Format** project.

This CLI tool uses the same core formatting engine ([@cc-format/core](https://www.npmjs.com/package/@cc-format/core)) as the VS Code extension, ensuring **consistent formatting results** across all environments.

### Why Use cc-format?

- **⚡ No External Dependencies** - Pure TypeScript implementation. No need to install Python, cmake-format, or gersemi
- **🎯 CLion-Compatible** - Matches CLion's proven formatting style trusted by millions of developers
- **🔧 Zero Setup** - Works out of the box with sensible defaults
- **⚙️ Highly Configurable** - 23+ configuration options for fine-grained control
- **🚀 Fast & Reliable** - Lightning-fast formatting with idempotent results
- **🔄 Cross-Platform** - Works on Windows, macOS, and Linux

### Project Links

- 🌐 **GitHub Repository** — [wysaid/clion-cmake-format](https://github.com/wysaid/clion-cmake-format)
- 📦 **Core Library** — [@cc-format/core](https://www.npmjs.com/package/@cc-format/core) for developers
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

## Advanced Usage

### Format Multiple Directories

```bash
# Format all CMake files in multiple directories
cc-format -w src/ tests/ cmake/

# Use globbing patterns (varies by shell)
cc-format -w src/**/*.cmake
```

### Docker Integration

```dockerfile
FROM node:18-alpine
RUN npm install -g cc-format
WORKDIR /workspace
CMD ["cc-format", "-w", "."]
```

```bash
# Run in Docker container
docker run --rm -v $(pwd):/workspace my-cmake-formatter
```

### VS Code Tasks Integration

Add to `.vscode/tasks.json`:

```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Format CMake Files",
            "type": "shell",
            "command": "cc-format -w .",
            "problemMatcher": []
        }
    ]
}
```

### Makefile Integration

```makefile
.PHONY: format check-format

format:
	cc-format -w .

check-format:
	cc-format --check $(shell find . -name '*.cmake' -o -name 'CMakeLists.txt')
```

## Performance

Benchmark results on a typical CMake project:

| File Size | Lines | Format Time |
|-----------|-------|-------------|
| Small | ~50 lines | < 5ms |
| Medium | ~500 lines | < 20ms |
| Large | ~3500 lines | < 100ms |

*Tested on Apple M1, Node.js 18*

## Comparison with Other Tools

| Feature | cc-format | cmake-format | gersemi |
|---------|-----------|--------------|---------|
| Language | TypeScript | Python | Python |
| Dependencies | 0 | Multiple | Multiple |
| CLion Compatible | ✅ | ❌ | ❌ |
| Installation | npm | pip | pip |
| Speed | ⚡ Fast | Medium | Medium |
| Config Format | JSON | YAML/Python | TOML |

## Related Packages

- **[@cc-format/core](https://www.npmjs.com/package/@cc-format/core)** — Core formatting engine for integration into your own tools
- **[clion-cmake-format](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)** — VS Code extension for editor integration

## License

MIT
