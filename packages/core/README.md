# @cc-format/core

[![npm version](https://img.shields.io/npm/v/@cc-format/core.svg)](https://www.npmjs.com/package/@cc-format/core)
[![npm downloads](https://img.shields.io/npm/dm/@cc-format/core.svg)](https://www.npmjs.com/package/@cc-format/core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Core CMake formatting engine** — A zero-dependency, pure TypeScript library for parsing and formatting CMake code with JetBrains CLion-compatible style.

## 📌 About

`@cc-format/core` is the heart of the [CLion CMake Format](https://github.com/wysaid/clion-cmake-format) project. It provides the core formatting engine used by both the [cc-format CLI tool](https://www.npmjs.com/package/cc-format) and the [VS Code extension](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format).

### Why Use This Library?

- **🎯 CLion-Compatible** — Matches JetBrains CLion's proven formatting style
- **⚡ Zero Dependencies** — Pure TypeScript implementation, no external tools required
- **🔧 Embeddable** — Easy to integrate into your own tools and workflows
- **🚀 Fast & Reliable** — Efficient parser with idempotent formatting results
- **📦 Type-Safe** — Full TypeScript support with comprehensive type definitions

### Project Links

- 🌐 **GitHub Repository** — [wysaid/clion-cmake-format](https://github.com/wysaid/clion-cmake-format)
- 💻 **CLI Tool** — [cc-format](https://www.npmjs.com/package/cc-format)
- 🔌 **VS Code Extension** — [clion-cmake-format](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)

## Installation

```bash
npm install @cc-format/core
```

## Quick Start

### Basic Usage

```typescript
import { formatCMake, DEFAULT_OPTIONS } from '@cc-format/core';

const source = `
PROJECT(MyProject)
SET(SOURCES main.cpp utils.cpp)
ADD_EXECUTABLE(myapp \${SOURCES})
`;

const formatted = formatCMake(source, DEFAULT_OPTIONS);
console.log(formatted);
```

Output:
```cmake
project(MyProject)
set(SOURCES main.cpp utils.cpp)
add_executable(myapp ${SOURCES})
```

### With Custom Options

```typescript
import { formatCMake, FormatOptions } from '@cc-format/core';

const options: FormatOptions = {
    commandCase: 'lowercase',
    indentSize: 2,
    lineLength: 100,
    spaceBeforeIfParentheses: true,
    maxBlankLines: 1
};

const formatted = formatCMake(source, options);
```

### Loading Configuration from File

```typescript
import { formatCMake, loadConfig } from '@cc-format/core';

// Load from .cc-format.jsonc file
const config = await loadConfig('/path/to/project');

const formatted = formatCMake(source, config);
```

## API Reference

### `formatCMake(source: string, options: FormatOptions): string`

Formats CMake source code according to the specified options.

**Parameters:**
- `source` — CMake source code to format
- `options` — Formatting options (see [Configuration Options](#configuration-options))

**Returns:** Formatted CMake code as a string

**Example:**
```typescript
const formatted = formatCMake('project(Test)', { commandCase: 'lowercase' });
// Output: "project(Test)"
```

---

### `parseOptions(options: Partial<FormatOptions>): FormatOptions`

Validates and fills in default values for formatting options.

**Parameters:**
- `options` — Partial formatting options

**Returns:** Complete formatting options with defaults applied

**Example:**
```typescript
import { parseOptions } from '@cc-format/core';

const options = parseOptions({ indentSize: 2 });
// Returns full options with indentSize: 2 and all other defaults
```

---

### `loadConfig(workspaceRoot: string, enableProjectConfig?: boolean): FormatOptions`

Loads configuration from a `.cc-format.jsonc` file in the workspace root.

**Parameters:**
- `workspaceRoot` — Path to the workspace root directory
- `enableProjectConfig` — Whether to load project config (default: `true`)

**Returns:** Formatting options loaded from config file, or defaults if not found

**Example:**
```typescript
import { loadConfig } from '@cc-format/core';

const config = loadConfig('/path/to/project');
// Loads from /path/to/project/.cc-format.jsonc
```

---

### `validateContent(content: string, filePath: string, options: FormatOptions): ValidationResult`

Validates whether CMake content is properly formatted.

**Parameters:**
- `content` — CMake source code to validate
- `filePath` — File path (for error reporting)
- `options` — Formatting options to validate against

**Returns:** Validation result with `isValid` boolean and optional `violations` array

**Example:**
```typescript
import { validateContent, DEFAULT_OPTIONS } from '@cc-format/core';

const result = validateContent('project(Test)', 'CMakeLists.txt', DEFAULT_OPTIONS);
if (!result.isValid) {
    console.error('Formatting violations:', result.violations);
}
```

---

### Constants

#### `DEFAULT_OPTIONS: FormatOptions`

Default formatting options that match CLion's defaults.

```typescript
import { DEFAULT_OPTIONS } from '@cc-format/core';

console.log(DEFAULT_OPTIONS.indentSize); // 4
console.log(DEFAULT_OPTIONS.commandCase); // 'unchanged'
```

## Configuration Options

### Tab and Indentation

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `useTabs` | `boolean` | `false` | Use tabs instead of spaces |
| `tabSize` | `number` | `4` | Spaces per tab (1-16) |
| `indentSize` | `number` | `4` | Spaces per indent level (1-16) |
| `continuationIndentSize` | `number` | `8` | Continuation line indent (1-16) |
| `keepIndentOnEmptyLines` | `boolean` | `false` | Preserve indentation on empty lines |

### Spacing Before Parentheses

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spaceBeforeCommandDefinitionParentheses` | `boolean` | `false` | `function()` / `macro()` |
| `spaceBeforeCommandCallParentheses` | `boolean` | `false` | Regular commands |
| `spaceBeforeIfParentheses` | `boolean` | `true` | `if()` / `elseif()` / `endif()` |
| `spaceBeforeForeachParentheses` | `boolean` | `true` | `foreach()` / `endforeach()` |
| `spaceBeforeWhileParentheses` | `boolean` | `true` | `while()` / `endwhile()` |

### Spacing Inside Parentheses

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `spaceInsideCommandDefinitionParentheses` | `boolean` | `false` | `function( )` / `macro( )` |
| `spaceInsideCommandCallParentheses` | `boolean` | `false` | Regular commands |
| `spaceInsideIfParentheses` | `boolean` | `false` | `if( )` statements |
| `spaceInsideForeachParentheses` | `boolean` | `false` | `foreach( )` loops |
| `spaceInsideWhileParentheses` | `boolean` | `false` | `while( )` loops |

### Line Wrapping and Alignment

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `lineLength` | `number` | `0` | Max line length (0 = unlimited, min 30) |
| `alignMultiLineArguments` | `boolean` | `false` | Align arguments vertically |
| `alignMultiLineParentheses` | `boolean` | `false` | Align closing parenthesis |
| `alignControlFlowParentheses` | `boolean` | `false` | Align control flow parentheses |

### Other Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `commandCase` | `'unchanged' \| 'lowercase' \| 'uppercase'` | `'unchanged'` | Command case transformation |
| `maxBlankLines` | `number` | `2` | Max consecutive blank lines (0-20) |
| `maxTrailingBlankLines` | `number` | `1` | Max blank lines at end of file (≥ 0) |
| `enableProjectConfig` | `boolean` | `true` | Enable `.cc-format.jsonc` files |

For complete configuration documentation, see the [main README](https://github.com/wysaid/clion-cmake-format#configuration-options).

## Type Definitions

### `FormatOptions`

Complete formatting options interface:

```typescript
interface FormatOptions {
    // Tab and Indentation
    useTabs: boolean;
    tabSize: number;
    indentSize: number;
    continuationIndentSize: number;
    keepIndentOnEmptyLines: boolean;

    // Spacing Before Parentheses
    spaceBeforeCommandDefinitionParentheses: boolean;
    spaceBeforeCommandCallParentheses: boolean;
    spaceBeforeIfParentheses: boolean;
    spaceBeforeForeachParentheses: boolean;
    spaceBeforeWhileParentheses: boolean;

    // Spacing Inside Parentheses
    spaceInsideCommandDefinitionParentheses: boolean;
    spaceInsideCommandCallParentheses: boolean;
    spaceInsideIfParentheses: boolean;
    spaceInsideForeachParentheses: boolean;
    spaceInsideWhileParentheses: boolean;

    // Line Wrapping and Alignment
    lineLength: number;
    alignMultiLineArguments: boolean;
    alignMultiLineParentheses: boolean;
    alignControlFlowParentheses: boolean;

    // Other Options
    commandCase: 'unchanged' | 'lowercase' | 'uppercase';
    maxBlankLines: number;
    maxTrailingBlankLines: number;
    enableProjectConfig: boolean;
}
```

### `ValidationResult`

Result of content validation:

```typescript
interface ValidationResult {
    isValid: boolean;
    violations?: RuleViolation[];
}

interface RuleViolation {
    type: RuleViolationType;
    line: number;
    message: string;
    original?: string;
    expected?: string;
}

type RuleViolationType =
    | 'indentation'
    | 'spacing'
    | 'blank_lines'
    | 'command_case'
    | 'trailing_whitespace'
    | 'line_length'
    | 'other';
```

## Integration Examples

### Build Tool Plugin

```typescript
import { formatCMake, loadConfig } from '@cc-format/core';
import * as fs from 'fs';

function formatCMakeFiles(directory: string) {
    const config = loadConfig(directory);

    // Find all CMake files
    const files = findCMakeFiles(directory);

    files.forEach(file => {
        const source = fs.readFileSync(file, 'utf-8');
        const formatted = formatCMake(source, config);
        fs.writeFileSync(file, formatted);
    });
}
```

### Editor Plugin

```typescript
import { formatCMake, parseOptions } from '@cc-format/core';

class CMakeFormatter {
    format(document: Document): string {
        const options = parseOptions({
            indentSize: getEditorIndentSize(),
            commandCase: 'lowercase'
        });

        return formatCMake(document.getText(), options);
    }
}
```

### CI/CD Validation

```typescript
import { validateContent, loadConfig } from '@cc-format/core';
import * as fs from 'fs';

async function validateCMakeFiles(files: string[]): Promise<boolean> {
    const config = loadConfig(process.cwd());
    let allValid = true;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const result = validateContent(content, file, config);

        if (!result.isValid) {
            console.error(`${file}: Formatting violations detected`);
            result.violations?.forEach(v => {
                console.error(`  Line ${v.line}: ${v.message}`);
            });
            allValid = false;
        }
    }

    return allValid;
}
```

## Requirements

- **Node.js** 18+ (for file system operations in `loadConfig`)
- **TypeScript** 4.5+ (if using TypeScript)

## Browser Support

The core formatting engine (`formatCMake`, `parseOptions`) works in browsers. However, `loadConfig` requires Node.js file system APIs.

For browser usage, pass options directly:

```typescript
import { formatCMake } from '@cc-format/core';

const formatted = formatCMake(source, {
    commandCase: 'lowercase',
    indentSize: 4
});
```

## Differences from CLion

This library aims for CLion compatibility with **one intentional enhancement**:

**Loop Control Commands** (`break`/`continue`) follow their parent loop's spacing rules:

```cmake
# With spaceBeforeForeachParentheses: true
foreach (item IN LISTS items)
    if (condition)
        break ()      # Consistent with foreach ()
    endif ()
endforeach ()
```

*CLion ignores spacing rules for `break`/`continue`, which can feel inconsistent.*

## Related Packages

- **[cc-format](https://www.npmjs.com/package/cc-format)** — Command-line interface
- **[clion-cmake-format](https://marketplace.visualstudio.com/items?itemName=wysaid.clion-cmake-format)** — VS Code extension

## Contributing

See the [Contributing Guide](https://github.com/wysaid/clion-cmake-format/blob/main/CONTRIBUTING.md) for development setup and guidelines.

## License

MIT © [wysaid](https://github.com/wysaid)
