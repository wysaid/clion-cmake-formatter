# Test Datasets

This directory contains test datasets for the CLion CMake Format, organized by functionality and test scenarios.

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
├── real-world/               # Real-world CMakeLists.txt examples
├── cmake-official/           # Original test files from CMake repository
├── well-formatted/           # Files that should remain unchanged after formatting
│   └── default/             # Default configuration style
└── poorly-formatted/         # Intentionally poorly formatted files for validation tests
```

## Usage

Test files use helper functions from `test/helpers.ts` to load datasets:

```typescript
import { loadBasic, loadParsing, loadFormatting, loadEdgeCase, loadRealWorld } from './helpers';

const input = loadBasic('simple-command');
const input = loadParsing('control-flow', 'if-block');
const input = loadFormatting('indentation', 'nested-blocks');
```

## File Naming Conventions

- Use **lowercase** with **hyphens** for filenames (e.g., `nested-if.cmake`)
- Use **descriptive names** that indicate what is being tested (e.g., `multi-line-arguments.cmake`)
- Add `.expected.cmake` suffix for expected formatter output when needed
- Keep filenames concise but meaningful (under 40 characters)

## Adding New Test Data

### 1. Determine the Category

Choose the appropriate category based on what you're testing:

- **basic/** — Elementary CMake syntax (commands, arguments, comments)
- **parsing/** — Parser behavior (control flow, functions, special syntax)
- **formatting/** — Formatting rules (indentation, spacing, line wrapping)
- **edge-cases/** — Unusual or boundary conditions
- **real-world/** — Complete, realistic CMakeLists.txt files
- **well-formatted/** — Already correctly formatted files (idempotency tests)
- **poorly-formatted/** — Intentionally malformed files (validation tests)

### 2. Create the Test File

```cmake
# example-test.cmake
project(MyTest)
set(SOURCES main.cpp utils.cpp)
add_executable(myapp ${SOURCES})
```

### 3. (Optional) Create Expected Output

If testing a specific formatting transformation, create a `.expected.cmake` file:

```cmake
# example-test.expected.cmake
project(MyTest)
set(SOURCES
    main.cpp
    utils.cpp)
add_executable(myapp ${SOURCES})
```

### 4. Reference in Tests

Update the corresponding test file (e.g., `test/formatter.test.ts`):

```typescript
it('should format example test correctly', () => {
    const input = loadFormatting('indentation', 'example-test');
    const expected = loadFormatting('indentation', 'example-test.expected');
    const result = formatCMake(input, DEFAULT_OPTIONS);
    assert.strictEqual(result, expected);
});
```

## Test Coverage Requirements

When adding test cases:

- ✅ **Cover edge cases** — Empty files, blank lines, special characters
- ✅ **Test idempotency** — Format twice and verify identical results
- ✅ **Verify error handling** — Invalid syntax should be handled gracefully
- ✅ **Document intent** — Add comments explaining what is being tested
- ✅ **Keep tests focused** — One test per specific behavior

## CMake Official Tests

The `cmake-official/` directory contains real test files from the [CMake repository](https://github.com/Kitware/CMake). These files:

- Represent real-world usage patterns
- Cover diverse complexity levels (simple, medium, complex)
- Are used for idempotency validation
- Total: 20 files, 6,302 lines

See [cmake-official/README.md](cmake-official/README.md) for details on file selection.

## Well-Formatted Tests

The `well-formatted/` directory contains files that are **already correctly formatted**. These tests verify idempotency:

```text
Original → Format → Output
Output should match Original exactly
```

See [well-formatted/README.md](well-formatted/README.md) for directory structure and requirements.

## Running Tests

```bash
# Run all unit tests
npm run test:unit

# Run specific test file
npx mocha --require ts-node/register test/formatter.test.ts

# Run with verbose output
npx mocha --require ts-node/register test/formatter.test.ts --grep "specific test name"
```

## Best Practices

### DO ✅

- Add test cases when fixing bugs
- Test both valid and invalid inputs
- Use meaningful filenames
- Organize files in appropriate categories
- Document complex test scenarios with comments
- Verify idempotency for well-formatted files

### DON'T ❌

- Add duplicate tests
- Use platform-specific paths
- Include sensitive data in test files
- Create overly complex test cases
- Forget to run tests before committing

## Contributing

When contributing new test datasets:

1. Follow the file naming conventions
2. Place files in the correct category
3. Add corresponding test cases
4. Run `npm run test:unit` to verify
5. Run `npm run lint` for code quality
6. Document any special test requirements

For more details, see [CONTRIBUTING.md](../../CONTRIBUTING.md).
