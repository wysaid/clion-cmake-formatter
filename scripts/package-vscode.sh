#!/bin/bash
# Script to package VS Code extension from monorepo

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/../packages/vscode"
TEMP_DIR=$(mktemp -d)

echo "Packaging VS Code extension..."
echo "Temporary directory: $TEMP_DIR"

# Build with webpack (bundles all dependencies into extension.js)
echo "Building VS Code extension with webpack..."
cd "$VSCODE_DIR"
pnpm run build

# Copy necessary files to temp directory
cd "$SCRIPT_DIR/.."
cp -r "$VSCODE_DIR/dist" "$TEMP_DIR/"
cp -r "$VSCODE_DIR/resources" "$TEMP_DIR/"
cp "$VSCODE_DIR/package.json" "$TEMP_DIR/"
cp "$VSCODE_DIR/package.nls.json" "$TEMP_DIR/"
cp "$VSCODE_DIR/package.nls.zh-cn.json" "$TEMP_DIR/"
cp "$VSCODE_DIR/LICENSE" "$TEMP_DIR/"
cp "$VSCODE_DIR/logo.png" "$TEMP_DIR/"

# Copy documentation from vscode package (includes symbolic links)
cp "$VSCODE_DIR/README.md" "$TEMP_DIR/" 2>/dev/null || true
cp "$VSCODE_DIR/CHANGELOG.md" "$TEMP_DIR/" 2>/dev/null || true

# Copy additional docs from root if not already in vscode package
cp "$SCRIPT_DIR/../README.zh-CN.md" "$TEMP_DIR/" 2>/dev/null || true

# Copy .vscodeignore from vscode package
cp "$VSCODE_DIR/.vscodeignore" "$TEMP_DIR/.vscodeignore" 2>/dev/null || (
    # Fallback: create minimal .vscodeignore if not present
    cat >"$TEMP_DIR/.vscodeignore" <<'EOF'
src/**
test/**
webpack.config.js
tsconfig.json
.npmignore
.git/**
.github/**
node_modules/**
package-lock.json
.vscode/**
.idea/**
coverage/**
*.vsix
*.log
.DS_Store
Thumbs.db
EOF
)

cd "$TEMP_DIR"

# Clean up package.json for vsce
node -e "
const fs = require('fs');
const pkg = require('./package.json');

// Remove vscode:prepublish script to avoid running it again
delete pkg.scripts['vscode:prepublish'];

// Remove workspace dependencies since they're bundled by webpack
delete pkg.dependencies;

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✓ Cleaned package.json for packaging');
"

npx --yes @vscode/vsce package

# Move the .vsix file back
mv *.vsix "$VSCODE_DIR/"

echo "Package created successfully in $VSCODE_DIR/"
ls -lh "$VSCODE_DIR"/*.vsix

# Cleanup
rm -rf "$TEMP_DIR"
