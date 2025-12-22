# Integration Tests

This directory contains integration tests that require external dependencies.

## Requirements

- **CLion**: Must be installed and accessible via `CLION_PATH` environment variable or standard installation paths

## Running Tests

```bash
# Run only integration tests (requires CLion)
npm run test:integration

# Run unit tests only (no external dependencies)
npm run test:unit

# Run all tests (unit + integration)
npm run test:all
```

## Test Files

- **clion-comparison.test.ts**: Compares formatting results between CLion and this plugin across all test datasets

## Why Separate?

These tests are separated from regular unit tests because:
1. They require external dependencies (CLion) that users may not have installed
2. They take longer to run (~5-10 seconds)
3. Users can run `npm test` without needing CLion installed
4. CI/CD pipelines can selectively run integration tests only when CLion is available
