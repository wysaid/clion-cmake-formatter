# Monorepo Architecture

This project uses a monorepo structure to support multiple distribution targets from a single codebase.

## Structure

```
clion-cmake-formatter/
├── packages/
│   ├── core/                    # @cc-format/core
│   │   ├── src/
│   │   │   ├── parser.ts       # CMake parser
│   │   │   ├── formatter.ts    # Formatting engine
│   │   │   ├── config.ts       # Configuration loader
│   │   │   ├── validator.ts    # Validation utilities
│   │   │   └── index.ts        # Public API
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── cli/                     # cc-format (npm CLI tool)
│   │   ├── src/
│   │   │   └── cli.ts          # CLI implementation
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── vscode/                  # clion-cmake-format (VS Code extension)
│       ├── src/
│       │   └── extension.ts    # VS Code integration
│       ├── resources/          # Schema and samples
│       ├── package.json
│       └── tsconfig.json
│
├── test/                        # Shared test suites
├── docs/                        # Documentation
├── scripts/                     # Build and publish scripts
├── package.json                 # Root workspace config
├── tsconfig.base.json          # Shared TypeScript config
└── tsconfig.json               # Root TypeScript project references
```

## Packages

### @cc-format/core

**Purpose:** Core formatting engine shared by all packages

**Published to:** npm (private/internal use, or public if needed)

**Dependencies:** None (zero dependencies)

**Exports:**
- `formatCMake()` - Main formatting function
- `parseCMake()` - CMake parser
- `loadConfigFile()` - Configuration loader
- Types and interfaces

### cc-format

**Purpose:** Command-line tool for formatting CMake files

**Published to:** npm

**Dependencies:**
- `@cc-format/core` (^1.4.0)
- `commander` (^12.1.0)

**Binary:** `cc-format`

**Installation:** `npm install -g cc-format`

### clion-cmake-format

**Purpose:** VS Code extension for formatting CMake files

**Published to:** VS Code Marketplace

**Dependencies:**
- `@cc-format/core` (^1.4.0)

**Extension ID:** `wysaid.clion-cmake-format`

## Development Workflow

### Install Dependencies

```bash
npm install
```

This installs dependencies for all packages using npm workspaces.

### Build All Packages

```bash
npm run build
```

Or build individually:
```bash
npm run build:core
npm run build:cli
npm run build:vscode
```

### Watch Mode (for VS Code development)

```bash
npm run watch
```

### Run Tests

```bash
npm test              # Unit tests only
npm run test:all      # All tests
npm run test:clion    # CLion comparison tests
```

### Lint

```bash
npm run lint
```

## Publishing

### Prerequisites

1. Clean working directory
2. All tests passing
3. Version numbers updated in all package.json files
4. Changelog updated

### Publish Core Package

```bash
npm run publish:core
```

### Publish CLI Tool

```bash
npm run publish:cli
```

### Publish VS Code Extension

```bash
npm run publish:vscode
```

### Publish All

```bash
./scripts/publish-monorepo.sh
```

Follow the interactive prompts.

## Version Management

All packages share the same version number for consistency. When releasing:

1. Update version in root `package.json`
2. Update version in all `packages/*/package.json`
3. Update `CHANGELOG.md`
4. Commit: `git commit -m "chore: release v1.x.x"`
5. Tag: `git tag v1.x.x`
6. Push: `git push && git push --tags`
7. Publish packages

## Package Dependencies

```
@cc-format/core (no dependencies)
       ↑
       ├─── cc-format (depends on core + commander)
       │
       └─── clion-cmake-format (depends on core)
```

The core package has zero external dependencies, ensuring:
- Small bundle size
- No security vulnerabilities from dependencies
- Fast installation
- Easy maintenance

## CI/CD

The GitHub Actions workflow should:

1. **On Pull Request:**
   - Build all packages
   - Run all tests
   - Run linting

2. **On Tag Push (v*):**
   - Build all packages
   - Run tests
   - Publish @cc-format/core to npm
   - Publish cc-format to npm
   - Publish clion-cmake-format to VS Code Marketplace

## Migration from Single Package

The old structure had everything in one package.json with mixed concerns:

**Before:**
```json
{
  "name": "clion-cmake-format",
  "main": "./dist/src/extension.js",
  "bin": { "cc-format": "./dist/src/cli.js" },
  "dependencies": { "commander": "^12.1.0" }
}
```

**Problems:**
- VS Code extension includes CLI code
- npm CLI includes VS Code code
- Mixed dependencies

**After (Monorepo):**
- Clean separation of concerns
- Each package has only what it needs
- Independent versioning possible (if needed)
- Easier to maintain and test

## Benefits

1. **Code Reuse:** Core logic shared across packages
2. **Clean Distribution:** Each package only includes necessary files
3. **Independent Publishing:** Can publish packages separately
4. **Better Testing:** Shared test suites ensure consistency
5. **Type Safety:** TypeScript project references ensure type consistency
6. **Zero Bloat:** No unused code in published packages

## Best Practices

1. **Core Package:** Keep it dependency-free and minimal
2. **API Stability:** Core package API should be stable
3. **Version Sync:** Keep all packages at the same version
4. **Testing:** Test each package independently
5. **Documentation:** Keep docs up to date in each package
