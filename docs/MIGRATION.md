# Migration Guide: Single Package → Monorepo

This guide helps you transition from the old single-package structure to the new monorepo architecture.

## What Changed?

### Old Structure (Branch: copilot/split-command-line-tool)

```
clion-cmake-formatter/
├── src/
│   ├── parser.ts
│   ├── formatter.ts
│   ├── config.ts
│   ├── validator.ts
│   ├── extension.ts
│   └── cli.ts
├── package.json  (mixed VSCode + npm config)
└── tsconfig.json
```

**Problems:**
- One `package.json` for both VSCode extension and npm CLI
- `commander` dependency bundled with VSCode extension
- Publishing to npm includes VSCode-specific files
- Publishing to VSCode Marketplace includes CLI files

### New Structure (Monorepo)

```
clion-cmake-formatter/
├── packages/
│   ├── core/           # @cc-format/core
│   │   ├── src/
│   │   │   ├── parser.ts
│   │   │   ├── formatter.ts
│   │   │   ├── config.ts
│   │   │   ├── validator.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── cli/            # cc-format
│   │   ├── src/
│   │   │   └── cli.ts
│   │   └── package.json
│   │
│   └── vscode/         # clion-cmake-format
│       ├── src/
│       │   └── extension.ts
│       └── package.json
│
├── test/               # Shared tests
├── package.json        # Workspace root
└── tsconfig.base.json
```

**Benefits:**
- ✅ Clean separation of concerns
- ✅ Each package only includes what it needs
- ✅ Independent publishing
- ✅ No dependency bloat
- ✅ Easier to maintain

## For Contributors

### Before (Old Workflow)

```bash
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
npm install
npm run compile
npm test
```

### After (New Workflow)

```bash
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
npm install          # Installs all workspace packages
npm run build        # Builds all packages
npm test             # Runs all tests
```

**What's Different:**
- `npm install` now sets up the entire workspace
- `npm run build` replaces `npm run compile`
- Each package can be built independently

## For Users

### VSCode Extension Users

**No changes required!** The extension still works the same way:

1. Install from VSCode Marketplace
2. Use `Shift + Alt + F` to format
3. Configure via `.cc-format.jsonc` or VSCode settings

### CLI Users

**No changes required!** The CLI still works the same way:

```bash
npm install -g cc-format
cc-format -w CMakeLists.txt
```

### Library Users (New!)

If you want to use the formatting engine programmatically:

```bash
npm install @cc-format/core
```

```typescript
import { formatCMake, DEFAULT_OPTIONS } from '@cc-format/core';

const formatted = formatCMake(source, DEFAULT_OPTIONS);
```

## For Package Maintainers

### Publishing Workflow

#### Old Way
```bash
# Mixed approach, everything in one package
npm run compile
vsce package           # For VSCode
npm publish            # For npm (but includes VSCode files)
```

#### New Way
```bash
# Build all packages
npm run build

# Publish individually
npm run publish:core     # @cc-format/core to npm
npm run publish:cli      # cc-format to npm
npm run publish:vscode   # clion-cmake-format to marketplace

# Or use interactive script
./scripts/publish-monorepo.sh
```

### Version Management

All three packages share the same version number for consistency.

**Update versions:**
1. Update `version` in root `package.json`
2. Update `version` in `packages/core/package.json`
3. Update `version` in `packages/cli/package.json`
4. Update `version` in `packages/vscode/package.json`
5. Update `CHANGELOG.md`

**Release:**
```bash
git commit -m "chore: release v1.5.0"
git tag v1.5.0
git push && git push --tags
./scripts/publish-monorepo.sh
```

## Breaking Changes

### None for End Users

The API and functionality remain the same. Only the internal structure changed.

### For Contributors

1. **Import paths in tests changed:**
   ```typescript
   // Old
   import { formatCMake } from '../src/formatter';

   // New
   import { formatCMake } from '@cc-format/core';
   ```

2. **Build command changed:**
   ```bash
   # Old
   npm run compile

   # New
   npm run build
   ```

3. **TypeScript project references:**
   - Core package compiles independently
   - CLI and VSCode reference the core package

## Testing

All tests remain in the same location and work the same way:

```bash
npm test              # Unit tests
npm run test:all      # All tests
npm run test:clion    # CLion comparison
```

Tests now import from `@cc-format/core` instead of `../src/*`.

## CI/CD Updates

### GitHub Actions

The CI workflow should build all packages:

```yaml
- name: Install dependencies
  run: npm install

- name: Build all packages
  run: npm run build

- name: Run tests
  run: npm test

- name: Lint
  run: npm run lint
```

### Publishing on Release

```yaml
- name: Publish packages
  run: |
    npm run publish:core
    npm run publish:cli
    npm run publish:vscode
```

## Rollback Plan

If critical issues are found, you can:

1. **Revert to old branch:**
   ```bash
   git checkout copilot/split-command-line-tool
   ```

2. **Publish from old structure:**
   ```bash
   npm run compile
   vsce package
   ```

## Support

If you encounter issues during migration:

1. Check [MONOREPO.md](MONOREPO.md) for architecture details
2. Review [CONTRIBUTING.md](../CONTRIBUTING.md) for development guide
3. Open an issue: https://github.com/wysaid/clion-cmake-format/issues

## Timeline

- **Phase 1:** Monorepo structure implementation ✅
- **Phase 2:** Testing and validation
- **Phase 3:** Update CI/CD pipelines
- **Phase 4:** Merge to main branch
- **Phase 5:** Release v1.5.0 with new structure

## Feedback

We value your feedback! Please report any issues or suggestions:

- GitHub Issues: https://github.com/wysaid/clion-cmake-format/issues
- GitHub Discussions: https://github.com/wysaid/clion-cmake-format/discussions
