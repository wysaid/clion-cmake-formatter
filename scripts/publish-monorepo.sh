#!/bin/bash
# Publish script for the monorepo packages

set -e

cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  CLion CMake Format - Monorepo Publish Script${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo ""

# Check git status
if [[ -n $(git status -s) ]]; then
    echo -e "${RED}Error: Working directory is not clean${NC}"
    echo "Please commit or stash your changes before publishing"
    exit 1
fi

# Build all packages
echo -e "${YELLOW}Building all packages...${NC}"
npm run build

# Run tests
echo -e "${YELLOW}Running tests...${NC}"
npm run test:unit

echo ""
echo -e "${GREEN}✓ All checks passed${NC}"
echo ""
echo "Select package to publish:"
echo "  1) @cc-format/core (npm)"
echo "  2) cc-format (npm)"
echo "  3) clion-cmake-format (VS Code Marketplace)"
echo "  4) All packages"
echo "  0) Cancel"
echo ""
read -p "Enter your choice [0-4]: " choice

case $choice in
1)
    echo -e "${YELLOW}Publishing @cc-format/core...${NC}"
    npm run publish:core
    echo -e "${GREEN}✓ @cc-format/core published${NC}"
    ;;
2)
    echo -e "${YELLOW}Publishing cc-format...${NC}"
    npm run publish:cli
    echo -e "${GREEN}✓ cc-format published${NC}"
    ;;
3)
    echo -e "${YELLOW}Publishing clion-cmake-format...${NC}"
    npm run publish:vscode
    echo -e "${GREEN}✓ clion-cmake-format published${NC}"
    ;;
4)
    echo -e "${YELLOW}Publishing all packages...${NC}"
    npm run publish:core
    npm run publish:cli
    npm run publish:vscode
    echo -e "${GREEN}✓ All packages published${NC}"
    ;;
0)
    echo "Cancelled"
    exit 0
    ;;
*)
    echo -e "${RED}Invalid choice${NC}"
    exit 1
    ;;
esac

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Publish complete!${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════${NC}"
