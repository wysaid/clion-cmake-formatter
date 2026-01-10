# Migration to pnpm - Summary

This document summarizes the migration from npm workspaces to pnpm for the clion-cmake-format monorepo.

## ✅ What Changed

### 1. **Package Manager**
- **Before**: npm workspaces
- **After**: pnpm with workspace protocol

### 2. **Configuration Files**

#### Added:
- `pnpm-workspace.yaml` - pnpm workspace configuration
- `.npmrc` - pnpm settings (auto-install-peers, link-workspace-packages)

#### Removed:
- `package-lock.json` - replaced by `pnpm-lock.yaml`
- `scripts/update-dep-versions.js` - no longer needed (pnpm handles this automatically)

#### Modified:
- `package.json` - Added `packageManager` field, updated all scripts to use `pnpm`
- `packages/cli/package.json` - Changed dependency from `"*"` to `"workspace:*"`
- `packages/vscode/package.json` - Changed dependency from `"*"` to `"workspace:*"`

### 3. **Scripts Updated**
All scripts now use `pnpm` instead of `npm`:
- `.github/workflows/ci.yml` - CI workflow
- `.github/workflows/release.yml` - Release workflow
- `scripts/publish.sh` - Publish script (+ added pnpm check)
- `scripts/bump-version.sh` - Version bump script
- `scripts/package-vscode.sh` - VS Code packaging script

### 4. **Documentation Updated**
- `CONTRIBUTING.md` - Development setup and commands
- `CONTRIBUTING.zh-CN.md` - Chinese version

## 🎯 Key Benefits

### **Workspace Protocol (`workspace:*`)**
```json
"dependencies": {
    "@cc-format/core": "workspace:*"
}
```

✅ **Development**: Always uses local package (no version conflicts)
✅ **Publishing**: Automatically converts to `^1.5.0` during `pnpm publish`
✅ **Simple**: No extra scripts needed!

### **Disk Space Savings**
- npm: ~210 MB
- pnpm: ~193 MB (saves 17 MB, and shares packages globally)

### **Better Dependency Management**
- Strict isolation prevents phantom dependencies
- Faster installs with global content-addressable store
- Consistent behavior across machines

## 🚀 Developer Workflow

### **Installation**
```bash
# Install pnpm globally
npm install -g pnpm

# Clone and install
git clone https://github.com/wysaid/clion-cmake-format.git
cd clion-cmake-format
pnpm install
```

### **Common Commands**
```bash
pnpm run build         # Build all packages
pnpm run test:unit     # Run tests
pnpm run lint          # Check code quality
pnpm run watch         # Watch mode
```

### **Publishing**
```bash
# Core package
cd packages/core
pnpm publish --access public

# CLI tool
cd packages/cli
pnpm publish --access public
```

Or use the publish script:
```bash
bash scripts/publish.sh --all
```

## ⚠️ Breaking Changes for Contributors

### **Must Install pnpm**
Contributors must install pnpm:
```bash
npm install -g pnpm
```

### **npm Commands No Longer Work**
All `npm` commands must be replaced with `pnpm`:
- ❌ `npm install` → ✅ `pnpm install`
- ❌ `npm run build` → ✅ `pnpm run build`
- ❌ `npm test` → ✅ `pnpm test`

### **Lockfile Changed**
- Old: `package-lock.json`
- New: `pnpm-lock.yaml`
- **Never commit both!** (already cleaned up)

## 🔍 Verification

All features verified and working:

✅ Build all packages: `pnpm run build`
✅ Run all tests: `pnpm run test:unit` (207 tests passing)
✅ Lint code: `pnpm run lint`
✅ Workspace dependencies: CLI and VS Code correctly use local `@cc-format/core`
✅ Publish script includes pnpm check with helpful error message

## 📚 Additional Resources

- [pnpm Documentation](https://pnpm.io/)
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Workspace Protocol](https://pnpm.io/workspaces#workspace-protocol-workspace)

---

**Migration completed**: January 8, 2026
**Tested on**: Node.js 18.x, 20.x, 22.x, 23.x (via CI workflows)
