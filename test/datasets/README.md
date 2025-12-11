# Test Datasets

This directory contains test datasets for the CLion CMake Formatter, organized by functionality and test scenarios.

## Directory Structure

```
datasets/
├── basic/                    # Basic CMake commands and syntax
├── parsing/                  # Parser-specific scenarios
│   ├── control-flow/        # Control flow (if/foreach/while)
│   ├── functions/           # Function and macro definitions
│   └── special-syntax/      # Special syntax (bracket arguments/comments)
├── formatting/               # Formatter-specific scenarios
│   ├── indentation/         # Indentation tests
│   ├── spacing/             # Spacing tests
│   └── line-length/         # Line length and multi-line tests
├── edge-cases/               # Edge cases and boundary conditions
└── real-world/               # Real-world CMakeLists.txt examples
```

## Usage

Test files use helper functions from `test/helpers.ts` to load datasets:

```typescript
import { loadBasic, loadParsing, loadFormatting, loadEdgeCase, loadRealWorld } from './helpers';

const input = loadBasic('simple-command');
const input = loadParsing('control-flow', 'if-block');
const input = loadFormatting('indentation', 'nested-blocks');
```

## Adding New Test Data

1. Place `.cmake` files in the appropriate category directory
2. Use descriptive, lowercase names with hyphens (e.g., `nested-if.cmake`)
3. Optionally create `.expected.cmake` files for expected formatter output
4. Reference the dataset in your tests using the helper functions
