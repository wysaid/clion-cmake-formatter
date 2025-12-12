# Changelog

All notable changes to the CLion CMake Formatter extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-12-12

🎉 **First stable release!**

### Features

#### Core Formatting
- **CLion-compatible formatting** — Precisely replicates JetBrains CLion's CMake formatting behavior
- **Command case transformation** — Support for `unchanged`, `lowercase`, or `uppercase`
- **Smart indentation** — Configurable spaces or tabs per indentation level (1-16)
- **Intelligent line wrapping** — Automatically breaks long lines with proper continuation indent
- **Block structure support** — Correct indentation for `if/endif`, `function/endfunction`, `macro/endmacro`, `foreach/endforeach`, `while/endwhile`
- **Comment preservation** — Maintains inline and trailing comments in their original positions
- **Multi-line preservation** — Commands already split across lines maintain their structure

#### Configuration System
- **21 configuration options** — Comprehensive control over formatting behavior
- **Project-level configuration** — Support for `.cc-format.jsonc` files in project root
- **Configuration file watching** — Automatic reload when config files change
- **Configuration caching** — LRU cache for optimized performance
- **JSON Schema support** — IntelliSense for `.cc-format.jsonc` files

#### Commands
- **Format Document** — Format CMake files via keyboard shortcut or context menu
- **Create Default Configuration File** — Quickly set up project configuration with default values
- **Git root detection** — Smart detection of git root directory including submodule support

#### Developer Experience
- **Zero external dependencies** — Pure TypeScript implementation
- **Multi-language support** — English and Chinese interface
- **Comprehensive testing** — 126+ unit tests with idempotency validation
- **CI/CD** — GitHub Actions workflows for testing and releasing

### Configuration Options

#### Tab and Indentation
- `useTabs` — Use tabs instead of spaces (default: `false`)
- `tabSize` — Spaces per tab character (default: `4`, range: 1-16)
- `indentSize` — Spaces per indentation level (default: `4`, range: 1-16)
- `continuationIndentSize` — Additional indentation for continued lines (default: `4`, range: 1-16)
- `keepIndentOnEmptyLines` — Preserve indentation on empty lines (default: `false`)

#### Spacing Before Parentheses
- `spaceBeforeCommandDefinitionParentheses` — For `function` and `macro` (default: `false`)
- `spaceBeforeCommandCallParentheses` — For regular commands (default: `false`)
- `spaceBeforeIfParentheses` — For `if` statements (default: `true`)
- `spaceBeforeForeachParentheses` — For `foreach` loops (default: `true`)
- `spaceBeforeWhileParentheses` — For `while` loops (default: `true`)

#### Spacing Inside Parentheses
- `spaceInsideCommandDefinitionParentheses` — For `function` and `macro` (default: `false`)
- `spaceInsideCommandCallParentheses` — For regular commands (default: `false`)
- `spaceInsideIfParentheses` — For `if` statements (default: `false`)
- `spaceInsideForeachParentheses` — For `foreach` loops (default: `false`)
- `spaceInsideWhileParentheses` — For `while` loops (default: `false`)

#### Line Wrapping and Alignment
- `lineLength` — Maximum line length (default: `0` = unlimited, minimum 30 for non-zero)
- `alignMultiLineArguments` — Align arguments vertically (default: `false`)
- `alignMultiLineParentheses` — Align closing parenthesis (default: `false`)
- `alignControlFlowParentheses` — Align control flow parentheses (default: `false`)

#### Other Options
- `commandCase` — Command case transformation (default: `"unchanged"`)
- `maxBlankLines` — Maximum consecutive blank lines (default: `2`, range: 0-20)
- `enableProjectConfig` — Enable `.cc-format.jsonc` files (default: `true`)

### Supported CMake Constructs
- Commands and function calls
- Quoted and bracket arguments
- Line and bracket comments
- Control flow: `if`/`elseif`/`else`/`endif`
- Functions: `function`/`endfunction`
- Macros: `macro`/`endmacro`
- Loops: `foreach`/`endforeach`, `while`/`endwhile`
- Nested blocks with proper indentation

### Test Coverage
- 126 unit tests covering parser, formatter, and configuration
- Idempotency tests ensuring `format(format(x)) == format(x)`
- 20 test files from CMake official repository (6,302 lines)
- 100% pass rate ✅

### Notes
- **Intentional difference from CLion**: `break` and `continue` commands follow the same spacing rules as their parent loop (`foreach`/`while`) for consistency.
