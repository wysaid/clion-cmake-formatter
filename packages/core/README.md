# @cc-format/core

Core CMake formatting engine used by both the CLI tool and VS Code extension.

## Features

- CMake parsing and AST generation
- CLion-compatible formatting
- Configurable formatting options
- Zero external dependencies

## Usage

```typescript
import { formatCMake, DEFAULT_OPTIONS } from '@cc-format/core';

const source = 'project(MyProject)';
const formatted = formatCMake(source, DEFAULT_OPTIONS);
```

## License

MIT
