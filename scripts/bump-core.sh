#!/bin/bash

# DEPRECATED: Use scripts/bump-version.sh instead
# This script is kept for backward compatibility but will be removed in v2.0.0
#
# Update core version and sync dependencies in cli/vscode packages
# Usage: ./scripts/bump-core.sh <new-version>

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ -z "$1" ]; then
    echo -e "${RED}Error: Version number required${NC}"
    echo ""
    echo "Usage: $0 <new-version>"
    echo ""
    echo "Examples:"
    echo "  $0 1.4.1         # Bump to 1.4.1"
    echo "  $0 1.5.0-beta.1  # Pre-release version"
    exit 1
fi

NEW_VERSION="$1"

# Validate version format (basic check)
if ! [[ "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.]+)?$ ]]; then
    echo -e "${RED}Error: Invalid version format: $NEW_VERSION${NC}"
    echo "Expected format: X.Y.Z or X.Y.Z-prerelease"
    exit 1
fi

CURRENT_VERSION=$(node -p "require('./packages/core/package.json').version")

echo -e "${BLUE}Bumping @cc-format/core version${NC}"
echo "  Current: $CURRENT_VERSION"
echo "  New:     $NEW_VERSION"
echo ""

# Ask for confirmation
read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Step 1: Updating @cc-format/core version${NC}"
cd packages/core
npm version "$NEW_VERSION" --no-git-tag-version
echo -e "${GREEN}✓${NC} Updated packages/core/package.json"

echo ""
echo -e "${BLUE}Step 2: Updating CLI dependency${NC}"
cd ../cli
npm pkg set dependencies.@cc-format/core="$NEW_VERSION"
echo -e "${GREEN}✓${NC} Updated packages/cli/package.json"

echo ""
echo -e "${BLUE}Step 3: Updating VS Code extension dependency${NC}"
cd ../vscode
npm pkg set dependencies.@cc-format/core="$NEW_VERSION"
echo -e "${GREEN}✓${NC} Updated packages/vscode/package.json"

echo ""
echo -e "${BLUE}Step 4: Updating lockfile${NC}"
cd ../..
npm install
echo -e "${GREEN}✓${NC} Updated package-lock.json"

echo ""
echo -e "${GREEN}Core version bump completed!${NC}"
echo ""
echo "Changed files:"
echo "  - packages/core/package.json"
echo "  - packages/cli/package.json"
echo "  - packages/vscode/package.json"
echo "  - package-lock.json"
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Run tests: npm run test:unit"
echo "  3. Commit: git add packages/*/package.json package-lock.json"
echo "  4. Commit: git commit -m \"chore: bump @cc-format/core to ${NEW_VERSION}\""
echo ""
echo "Do you also want to bump CLI and/or VS Code versions?"
echo "  - CLI: Edit packages/cli/package.json manually"
echo "  - VS Code: Edit packages/vscode/package.json manually"
