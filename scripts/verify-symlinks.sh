#!/bin/bash

# Verify that required files are symlinks pointing to the correct locations
# Exit with non-zero status if any symlink is missing or incorrect

set -e

cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

echo "Verifying symlinks..."
echo ""

# Function to check if a file is a symlink pointing to the expected target
check_symlink() {
    local file=$1
    local expected_target=$2

    if [ ! -L "$file" ]; then
        echo -e "${RED}✗ $file is not a symlink${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    local actual_target=$(readlink "$file")
    if [ "$actual_target" != "$expected_target" ]; then
        echo -e "${RED}✗ $file points to $actual_target (expected: $expected_target)${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    # Verify the target file exists
    local dir=$(dirname "$file")
    if [ ! -f "$dir/$actual_target" ]; then
        echo -e "${RED}✗ $file -> $actual_target (target does not exist)${NC}"
        ERRORS=$((ERRORS + 1))
        return 1
    fi

    echo -e "${GREEN}✓ $file -> $actual_target${NC}"
    return 0
}

# Check all required symlinks
check_symlink "packages/core/LICENSE" "../../LICENSE"
check_symlink "packages/core/CHANGELOG.md" "../../CHANGELOG.md"
check_symlink "packages/cli/LICENSE" "../../LICENSE"
check_symlink "packages/cli/CHANGELOG.md" "../../CHANGELOG.md"
check_symlink "packages/vscode/LICENSE" "../../LICENSE"

echo ""
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All symlinks are valid${NC}"
    exit 0
else
    echo -e "${RED}✗ Found $ERRORS symlink error(s)${NC}"
    echo ""
    echo "To fix, run: ./scripts/create-symlinks.sh"
    exit 1
fi
