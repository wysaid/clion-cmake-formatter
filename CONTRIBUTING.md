# Contributing to CLion CMake Format

Thank you for your interest in contributing! This document provides guidelines for development, testing, and contributing to the project.

[中文版本](CONTRIBUTING.zh-CN.md)

## 🛠️ Development Setup

### Prerequisites

- Node.js 18+
- npm
- Git 2.x+ with symlinks support

### Getting Started

```bash
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
npm install
npm run compile
npm run test:unit
```

### Windows Development Setup

This project uses **symbolic links (symlinks)** for shared files (LICENSE, CHANGELOG.md). Windows users need to configure Git to handle symlinks properly:

**Option 1: Enable Developer Mode (Recommended)**
1. Open Windows Settings → Update & Security → For Developers
2. Enable "Developer Mode"
3. Clone the repository with symlinks enabled:
   ```bash
   git clone -c core.symlinks=true https://github.com/wysaid/clion-cmake-format.git
   ```

**Option 2: Run Git Bash as Administrator**
1. Right-click "Git Bash" and select "Run as administrator"
2. Clone the repository:
   ```bash
   git config --global core.symlinks true
   git clone https://github.com/wysaid/clion-cmake-format.git
   ```

**Verify Symlinks**:
```bash
bash scripts/verify-symlinks.sh
```

If symlinks are not working, you'll see errors when building or running tests. Run `bash scripts/create-symlinks.sh` to recreate them.

## 📜 Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build all packages (core + cli + vscode) |
| `npm run build:core` | Build @cc-format/core package |
| `npm run build:cli` | Build cc-format CLI package |
| `npm run build:vscode` | Build VS Code extension |
| `npm run compile` | Alias for `npm run build` |
| `npm run watch` | Watch mode compilation (auto-recompile on changes) |
| `npm run lint` | Run ESLint to check code quality |
| `npm run test:unit` | Run all unit tests (must pass before commit) |
| `npm run test:clion` | Compare formatting with CLion (requires CLion installed) |
| `npm run package:vscode` | Package VS Code extension as `.vsix` file |
| `npm run verify-symlinks` | Verify that all symlinks are valid |

## 📂 Project Structure

This is a **monorepo** using npm workspaces:

```
clion-cmake-format/
├── packages/
│   ├── core/              # @cc-format/core - Core formatting engine (0 deps)
│   │   ├── src/
│   │   │   ├── parser.ts      # CMake tokenizer and AST builder
│   │   │   ├── formatter.ts   # Formatting logic and rules
│   │   │   ├── config.ts      # Configuration file loader
│   │   │   ├── validator.ts   # Validation utilities
│   │   │   └── index.ts       # Public exports
│   │   ├── LICENSE → ../../LICENSE (symlink)
│   │   └── CHANGELOG.md → ../../CHANGELOG.md (symlink)
│   ├── cli/               # cc-format - CLI tool
│   │   ├── src/cli.ts     # Command-line interface
│   │   ├── LICENSE → ../../LICENSE (symlink)
│   │   └── CHANGELOG.md → ../../CHANGELOG.md (symlink)
│   └── vscode/            # clion-cmake-format - VS Code extension
│       ├── src/extension.ts
│       └── LICENSE → ../../LICENSE (symlink)
├── test/
│   ├── parser.test.ts      # Parser unit tests
│   ├── formatter.test.ts   # Formatter unit tests
│   ├── config.test.ts      # Config unit tests
│   ├── cli.test.ts         # CLI unit tests
│   ├── well-formated.test.ts  # Idempotency tests
│   └── datasets/           # Test fixtures
│       ├── basic/          # Basic syntax tests
│       ├── cmake-official/ # CMake repository samples (20 files, 6302 lines)
│       ├── edge-cases/     # Edge case tests
│       ├── formatting/     # Formatting feature tests
│       ├── parsing/        # Parser tests
│       ├── real-world/     # Real-world examples
│       └── well-formatted/ # Idempotency validation
├── resources/
│   ├── cc-format.schema.json  # JSON Schema for config validation
│   ├── sample-input.cmake     # Sample input file
│   └── sample.cc-format.jsonc # Sample config file
└── docs/
    └── CLION_INTEGRATION_TESTING.md # CLion integration testing guide
```

## 🐛 Debugging

### Debug in VS Code

1. Open this project in VS Code
2. Press `F5` or go to **Run and Debug** panel
3. Select **Launch Extension**
4. A new VS Code window (Extension Development Host) will open with the extension loaded
5. Set breakpoints in the source code as needed

### Debug Configuration

The project includes a `.vscode/launch.json` configuration:
- **Extension**: Launches the extension in debug mode
- **Extension Tests**: Runs tests in debug mode

## ✅ Testing Guidelines

### Before Committing

Always run these commands before committing:

```bash
npm run lint      # Check code quality
npm run test:unit # Run all tests
```

All tests must pass (100% pass rate required).

### Adding Test Cases

When fixing bugs or adding features, you should:

1. **Add a test case** that reproduces the bug or validates the new feature
2. Place test files in the appropriate `test/datasets/` subdirectory:
   - `basic/` — Basic CMake syntax
   - `edge-cases/` — Edge cases (empty files, blank lines, etc.)
   - `formatting/` — Formatting-specific tests
   - `parsing/` — Parser-specific tests
   - `real-world/` — Real-world examples

For adding CMake official test cases, see `test/datasets/cmake-official/README.md` and use `scripts/select-cmake-tests.py`.

### Idempotency Testing

The formatter must be **idempotent** — formatting twice should produce the same result:

```
Original → Format → Output1
Output1  → Format → Output2
Output2 === Output1  ✅
```

Test files in `test/datasets/well-formatted/default/` are validated for idempotency.

### CLion Comparison Testing

To ensure compatibility with CLion's native formatter, you can run comparison tests:

```bash
# Requires CLion installed
npm run test:clion
```

This test formats files using both CLion and this plugin, then compares the results. See [docs/CLION_INTEGRATION_TESTING.md](docs/CLION_INTEGRATION_TESTING.md) for details.

## 📝 Code Guidelines

### General Rules

- **Use English** for all code comments and commit messages
- **Use English** for all `.md` files in the `docs/` directory
- Follow **TypeScript** best practices
- Keep functions **focused and testable**
- Add **JSDoc comments** for public APIs

### Commit Message Format

Use clear, concise commit messages in English:

```
✅ Good:
- Fix: Handle empty command arguments correctly
- Add: Support for CMAKE_MINIMUM_REQUIRED command
- Docs: Update configuration reference

❌ Bad:
- fix bug
- update
- 修复了一个问题
```

### Code Style

Follow the existing code style:
- **Indentation**: 4 spaces
- **Quotes**: Prefer single quotes
- **Semicolons**: Required
- **Line Length**: ~120 characters (soft limit)

Run `npm run lint` to check for style violations.

## 🧪 Test Development

### Test Structure

Tests are organized by category:

```typescript
describe('Parser', () => {
    it('should parse simple command', () => {
        // Test code
    });
});
```

### Running Specific Tests

```bash
# Run all tests
npm run test:unit

# Run specific test file (with ts-node)
npx mocha --require ts-node/register test/parser.test.ts
```

## 📋 Pull Request Guidelines

1. **Fork the repository** and create a feature branch
2. **Add tests** for your changes
3. **Ensure all tests pass**: `npm run test:unit`
4. **Ensure code quality**: `npm run lint`
5. **Write a clear PR description** explaining:
   - What problem does it solve?
   - What are the changes?
   - Are there breaking changes?
6. **Keep PRs focused** — one feature or fix per PR

## 🔧 Formatting Idempotency Constraints

When modifying the formatter, ensure:

- ✅ **Second format matches first**: `format(format(input)) === format(input)`
- ✅ **Samples in `well-formatted/` remain unchanged** after formatting
- ✅ **Preserve necessary spaces and comments**
- ✅ **Multi-line formats are stable**
- ✅ **Evaluate backward compatibility** when adding new config keys
- ✅ **Command case style** matches existing test data

## 📚 Additional Documentation

- [CLion Integration Testing](docs/CLION_INTEGRATION_TESTING.md)

## 🙏 Questions?

- Open an [issue](https://github.com/wysaid/clion-cmake-format/issues) for bugs
- Start a [discussion](https://github.com/wysaid/clion-cmake-format/discussions) for questions

Thank you for contributing! 🎉
