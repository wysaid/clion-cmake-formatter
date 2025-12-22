# clion-cmake-format Project Instructions

This project provides CMake script parsing and formatting as a VS Code extension.

## Project Structure
- `src/parser.ts`: Parse CMake source to syntax structure
- `src/formatter.ts`: Format syntax structure to text
- `src/config.ts`: Load and validate config (`resources/cc-format.schema.json`)
- `src/extension.ts`: VS Code extension entry point
- `test/`: Unit tests and datasets (`datasets/`)

## Development Commands
- `npm run compile`
- `npm run watch`
- `npm run lint`
- `npm run test:unit` (must pass before commit)
- `npm run package`

## Code Guidelines
- Add/adjust test cases when fixing bugs or adding features
- Run `npm run test:unit` and `npm run lint` before commit
- Use English for git commit messages and PR descriptions
- All `.md` files in `docs/` must be in English

## Formatting Idempotency Constraints
- Second format output must match first format output
- Samples in `well-formatted` test suite must remain unchanged after formatting
- Preserve necessary spaces, comments, and multi-line formats
- Evaluate backward compatibility and default values when adding config keys
- Command case style must match existing test data
- Keep `cc-format.schema.json` and `sample.cc-format.jsonc` in sync when adding or removing feature options.
