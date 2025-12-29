#!/bin/bash
# Script to package VS Code extension from monorepo

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VSCODE_DIR="$SCRIPT_DIR/../packages/vscode"
TEMP_DIR=$(mktemp -d)

echo "Packaging VS Code extension..."
echo "Temporary directory: $TEMP_DIR"

# Build first
echo "Building packages..."
cd "$SCRIPT_DIR/.."
npm run build

# Copy necessary files to temp directory
mkdir -p "$TEMP_DIR/node_modules/@cc-format/core"
cp -r "$SCRIPT_DIR/../packages/core/dist" "$TEMP_DIR/node_modules/@cc-format/core/"
cp "$SCRIPT_DIR/../packages/core/package.json" "$TEMP_DIR/node_modules/@cc-format/core/"
cp -r "$VSCODE_DIR/dist" "$TEMP_DIR/"
cp -r "$VSCODE_DIR/resources" "$TEMP_DIR/"
cp "$VSCODE_DIR/package.json" "$TEMP_DIR/"
cp "$VSCODE_DIR/package.nls.json" "$TEMP_DIR/"
cp "$VSCODE_DIR/package.nls.zh-cn.json" "$TEMP_DIR/"
cp "$VSCODE_DIR/LICENSE" "$TEMP_DIR/"
cp "$VSCODE_DIR/logo.png" "$TEMP_DIR/"

# Copy documentation from root
cp "$SCRIPT_DIR/../README.md" "$TEMP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/../README.zh-CN.md" "$TEMP_DIR/" 2>/dev/null || true
cp "$SCRIPT_DIR/../CHANGELOG.md" "$TEMP_DIR/" 2>/dev/null || true

# Create .vscodeignore in temp directory
cat >"$TEMP_DIR/.vscodeignore" <<'EOF'
.gitignore
.npmignore
EOF

cd "$TEMP_DIR"

# Remove prepublish script to avoid running it in temp dir
node -e "const pkg=require('./package.json'); delete pkg.scripts['vscode:prepublish']; require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));"

npx --yes @vscode/vsce package

# Move the .vsix file back
mv *.vsix "$VSCODE_DIR/"

echo "Package created successfully in $VSCODE_DIR/"
ls -lh "$VSCODE_DIR"/*.vsix

# Cleanup
rm -rf "$TEMP_DIR"
