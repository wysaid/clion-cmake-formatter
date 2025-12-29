#!/bin/bash

# Convert duplicate files to symlinks in monorepo
# WARNING: Run this script only if you understand the implications
# Windows users need to enable Developer Mode or run as administrator

set -e

cd "$(dirname "$0")/.."

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  Converting Duplicate Files to Symlinks${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check if on Windows (Git Bash)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    echo -e "${YELLOW}Warning: Running on Windows${NC}"
    echo ""
    echo "Windows users need to:"
    echo "  1. Enable Developer Mode, OR"
    echo "  2. Run Git Bash as Administrator"
    echo ""
    echo "And configure Git:"
    echo "  git config core.symlinks true"
    echo ""
    read -p "Have you done this? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled. Please configure Git first."
        exit 1
    fi
fi

echo -e "${BLUE}Checking Git symlinks configuration...${NC}"
SYMLINKS_CONFIG=$(git config core.symlinks || echo "false")
if [ "$SYMLINKS_CONFIG" != "true" ]; then
    echo -e "${YELLOW}Warning: git config core.symlinks is not set to true${NC}"
    echo ""
    read -p "Set it now? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git config core.symlinks true
        echo -e "${GREEN}✓ Set core.symlinks to true${NC}"
    fi
fi

echo ""
echo -e "${BLUE}Files to be converted:${NC}"
echo "  packages/core/LICENSE"
echo "  packages/core/CHANGELOG.md"
echo "  packages/cli/LICENSE"
echo "  packages/cli/CHANGELOG.md"
echo "  packages/vscode/LICENSE"
echo ""

read -p "Continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Creating symlinks...${NC}"
echo ""

# packages/core
echo "packages/core:"
cd packages/core
if [ -f LICENSE ] && [ ! -L LICENSE ]; then
    rm LICENSE
    ln -s ../../LICENSE LICENSE
    echo -e "  ${GREEN}✓${NC} LICENSE → ../../LICENSE"
else
    echo "  - LICENSE already a symlink or doesn't exist"
fi

if [ -f CHANGELOG.md ] && [ ! -L CHANGELOG.md ]; then
    rm CHANGELOG.md
    ln -s ../../CHANGELOG.md CHANGELOG.md
    echo -e "  ${GREEN}✓${NC} CHANGELOG.md → ../../CHANGELOG.md"
else
    echo "  - CHANGELOG.md already a symlink or doesn't exist"
fi
cd ../..

# packages/cli
echo ""
echo "packages/cli:"
cd packages/cli
if [ -f LICENSE ] && [ ! -L LICENSE ]; then
    rm LICENSE
    ln -s ../../LICENSE LICENSE
    echo -e "  ${GREEN}✓${NC} LICENSE → ../../LICENSE"
else
    echo "  - LICENSE already a symlink or doesn't exist"
fi

if [ -f CHANGELOG.md ] && [ ! -L CHANGELOG.md ]; then
    rm CHANGELOG.md
    ln -s ../../CHANGELOG.md CHANGELOG.md
    echo -e "  ${GREEN}✓${NC} CHANGELOG.md → ../../CHANGELOG.md"
else
    echo "  - CHANGELOG.md already a symlink or doesn't exist"
fi
cd ../..

# packages/vscode
echo ""
echo "packages/vscode:"
cd packages/vscode
if [ -f LICENSE ] && [ ! -L LICENSE ]; then
    rm LICENSE
    ln -s ../../LICENSE LICENSE
    echo -e "  ${GREEN}✓${NC} LICENSE → ../../LICENSE"
else
    echo "  - LICENSE already a symlink or doesn't exist"
fi
cd ../..

echo ""
echo -e "${GREEN}✓ Symlinks created${NC}"
echo ""

# Verify
echo -e "${BLUE}Verifying symlinks:${NC}"
echo ""
ls -lh packages/core/LICENSE packages/core/CHANGELOG.md
ls -lh packages/cli/LICENSE packages/cli/CHANGELOG.md
ls -lh packages/vscode/LICENSE

echo ""
echo -e "${BLUE}Testing file access:${NC}"
echo ""
echo "packages/core/LICENSE:"
cat packages/core/LICENSE | head -3
echo ""
echo "packages/cli/CHANGELOG.md:"
cat packages/cli/CHANGELOG.md | head -3

echo ""
echo -e "${GREEN}✓ All symlinks working correctly${NC}"
echo ""

echo -e "${BLUE}Next steps:${NC}"
echo "  1. Test packaging: npm pack --dry-run (in each package)"
echo "  2. Add and commit: git add ."
echo "  3. Check git status: git status"
echo "  4. Commit: git commit -m 'refactor: use symlinks for LICENSE and CHANGELOG'"
echo ""
echo -e "${YELLOW}Important:${NC} Document this in CONTRIBUTING.md for Windows users"
