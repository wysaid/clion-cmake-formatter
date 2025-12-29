#!/bin/bash

# DEPRECATED: Version consistency is now managed through unified versioning
# This script is kept for backward compatibility but will be removed in v2.0.0
#
# Version check script for clion-cmake-format monorepo
# Verifies that all packages use the correct version of @cc-format/core

set -e

cd "$(dirname "$0")/.."

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "Checking version consistency..."
echo ""

# Get versions
CORE_VERSION=$(node -p "require('./packages/core/package.json').version")
CLI_VERSION=$(node -p "require('./packages/cli/package.json').version")
VSC_VERSION=$(node -p "require('./packages/vscode/package.json').version")
ROOT_VERSION=$(node -p "require('./package.json').version")

CLI_CORE_DEP=$(node -p "require('./packages/cli/package.json').dependencies['@cc-format/core']")
VSC_CORE_DEP=$(node -p "require('./packages/vscode/package.json').dependencies['@cc-format/core']")

# Display current versions
echo "Current versions:"
echo "  Root (monorepo):        $ROOT_VERSION"
echo "  @cc-format/core:        $CORE_VERSION"
echo "  cc-format (CLI):        $CLI_VERSION"
echo "  clion-cmake-format:     $VSC_VERSION"
echo ""

echo "Core dependencies:"
echo "  CLI depends on:         $CLI_CORE_DEP"
echo "  VS Code depends on:     $VSC_CORE_DEP"
echo ""

# Check for mismatches
ISSUES=0

if [ "$CORE_VERSION" != "$CLI_CORE_DEP" ]; then
    echo -e "${RED}✗${NC} CLI package depends on @cc-format/core@${CLI_CORE_DEP}, but core is at ${CORE_VERSION}"
    ISSUES=$((ISSUES + 1))
fi

if [ "$CORE_VERSION" != "$VSC_CORE_DEP" ]; then
    echo -e "${RED}✗${NC} VS Code package depends on @cc-format/core@${VSC_CORE_DEP}, but core is at ${CORE_VERSION}"
    ISSUES=$((ISSUES + 1))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All packages use the correct core version"
    echo ""
    echo -e "${GREEN}Version check passed!${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}Version check failed!${NC}"
    echo ""
    echo "To fix this, run:"
    echo "  ./scripts/update-core-deps.sh"
    echo ""
    echo "Or manually update dependencies in packages/cli/package.json and packages/vscode/package.json"
    exit 1
fi
