#!/bin/bash

# Publish script for clion-cmake-format monorepo
# Supports publishing CLI tool (npm) and VS Code extension (marketplace)

set -e

cd "$(dirname "$0")/.."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
DRY_RUN=false
AUTO_YES=false
PRE_RELEASE=false
PUBLISH_TARGET=""

while [[ $# -gt 0 ]]; do
    case $1 in
    --cli)
        PUBLISH_TARGET="cli"
        shift
        ;;
    --vsc)
        PUBLISH_TARGET="vscode"
        shift
        ;;
    -n | --dry-run)
        DRY_RUN=true
        shift
        ;;
    -y | --yes)
        AUTO_YES=true
        shift
        ;;
    -p | --pre-release)
        PRE_RELEASE=true
        shift
        ;;
    -h | --help)
        echo "Usage: $0 [TARGET] [OPTIONS]"
        echo ""
        echo "Targets:"
        echo "  --cli              Publish CLI tool (cc-format) to npm"
        echo "  --vsc              Publish VS Code extension to marketplace"
        echo ""
        echo "Options:"
        echo "  -n, --dry-run      Dry run mode, build and test but don't publish"
        echo "  -y, --yes          Skip all prompts and proceed automatically"
        echo "  -p, --pre-release  Publish as pre-release version (VS Code only)"
        echo "  -h, --help         Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 --cli -n        # Test CLI packaging (dry run)"
        echo "  $0 --vsc           # Publish VS Code extension"
        echo "  $0                 # Interactive mode (choose target)"
        exit 0
        ;;
    *)
        echo -e "${RED}Error: Unknown option $1${NC}"
        echo "Use -h or --help for usage information"
        exit 1
        ;;
    esac
done

# Helper function to print info messages
info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Helper function to print success messages
success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Helper function to print warning messages
warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Helper function to print error messages
error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Helper function to ask yes/no questions
ask_yes_no() {
    if [ "$AUTO_YES" = true ]; then
        return 0
    fi

    local prompt="$1"
    while true; do
        read -p "$prompt (y/n): " yn
        case $yn in
        [Yy]*) return 0 ;;
        [Nn]*) return 1 ;;
        *) echo "Please answer yes or no." ;;
        esac
    done
}

# Get the version from package.json
get_version() {
    local package_path="$1"
    if command -v node >/dev/null 2>&1; then
        node -p "require('${package_path}').version"
    else
        # Fallback to grep/sed if node is not available
        grep -o '"version": *"[^"]*"' "$package_path" | sed 's/"version": *"\(.*\)"/\1/'
    fi
}

# Get default branch name (usually 'main' or 'master')
get_default_branch() {
    git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
}

# Interactive target selection
select_target() {
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  CLion CMake Format - Publish Script${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Select package to publish:"
    echo "  1) cc-format CLI tool (npm)"
    echo "  2) clion-cmake-format VS Code extension (marketplace)"
    echo "  0) Cancel"
    echo ""
    read -p "Enter your choice [0-2]: " choice

    case $choice in
    1)
        PUBLISH_TARGET="cli"
        ;;
    2)
        PUBLISH_TARGET="vscode"
        ;;
    0)
        echo "Cancelled"
        exit 0
        ;;
    *)
        error "Invalid choice"
        exit 1
        ;;
    esac
}

# If no target specified, ask user to choose
if [ -z "$PUBLISH_TARGET" ]; then
    select_target
fi

info "Starting publish process for: ${PUBLISH_TARGET}"

info "Starting publish process for: ${PUBLISH_TARGET}"

if [ "$DRY_RUN" = true ]; then
    warning "Running in DRY-RUN mode - no actual changes will be made"
fi

# Set package-specific paths
if [ "$PUBLISH_TARGET" = "cli" ]; then
    PACKAGE_DIR="packages/cli"
    PACKAGE_NAME="cc-format"
    PACKAGE_JSON="${PACKAGE_DIR}/package.json"
elif [ "$PUBLISH_TARGET" = "vscode" ]; then
    PACKAGE_DIR="packages/vscode"
    PACKAGE_NAME="clion-cmake-format"
    PACKAGE_JSON="${PACKAGE_DIR}/package.json"
else
    error "Invalid publish target: ${PUBLISH_TARGET}"
    exit 1
fi

info "Package: ${PACKAGE_NAME}"
info "Directory: ${PACKAGE_DIR}"

# Step 0: Verify symlinks before publishing
info "Verifying symlinks..."
if ! bash scripts/verify-symlinks.sh >/dev/null 2>&1; then
    error "Symlink verification failed"
    error "Some required files are not properly symlinked"
    echo ""
    bash scripts/verify-symlinks.sh
    echo ""
    error "Please run './scripts/create-symlinks.sh' to fix symlinks"
    exit 1
fi
success "All symlinks are valid"

# Step 1: Check if there are uncommitted changes
info "Checking for uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    error "There are uncommitted changes in the repository"
    error "Please commit or stash your changes before publishing"
    exit 1
fi
success "Working directory is clean"

# Step 2: Get version and check if tag already exists on remote
VERSION=$(get_version "$PACKAGE_JSON")
if [ "$PUBLISH_TARGET" = "cli" ]; then
    TAG_NAME="cli-v${VERSION}"
else
    TAG_NAME="v${VERSION}"
fi

info "Current version: ${VERSION}"
info "Tag to create: ${TAG_NAME}"

if [ "$DRY_RUN" = false ]; then
    info "Checking if tag ${TAG_NAME} already exists on remote..."
    if git ls-remote --tags origin | grep -q "refs/tags/${TAG_NAME}$"; then
        error "Tag ${TAG_NAME} already exists on remote"
        error "Please update the version in ${PACKAGE_JSON} before publishing"
        exit 1
    fi
    success "Tag ${TAG_NAME} does not exist on remote"
else
    info "[DRY-RUN] Would check if tag ${TAG_NAME} exists on remote"
fi

# Step 3: Check if on default branch and synced with remote
DEFAULT_BRANCH=$(get_default_branch)
CURRENT_BRANCH=$(git branch --show-current)

info "Default branch: ${DEFAULT_BRANCH}"
info "Current branch: ${CURRENT_BRANCH}"

if [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
    if [ "$PRE_RELEASE" = true ]; then
        warning "Not on default branch (${DEFAULT_BRANCH})"
        warning "Current branch is: ${CURRENT_BRANCH}"
        if ! ask_yes_no "Continue publishing pre-release from non-default branch?"; then
            info "Cancelled by user"
            exit 0
        fi
        success "Confirmed to publish pre-release from feature branch"
    else
        error "Not on default branch (${DEFAULT_BRANCH})"
        error "Current branch is: ${CURRENT_BRANCH}"
        error "Please switch to ${DEFAULT_BRANCH} before publishing"
        error "Or use --pre-release flag to publish from a feature branch"
        exit 1
    fi
else
    success "On default branch"

# Fetch latest from remote
info "Fetching latest changes from remote..."
if [ "$DRY_RUN" = false ]; then
    git fetch origin "${DEFAULT_BRANCH}"
else
    info "[DRY-RUN] Would fetch from origin/${DEFAULT_BRANCH}"
fi

# Check if local branch is up to date with remote
info "Checking if local branch is synced with remote..."
LOCAL=$(git rev-parse @)
REMOTE=$(git rev-parse @{u})
BASE=$(git merge-base @ @{u})

if [ "$LOCAL" = "$REMOTE" ]; then
    success "Local branch is up to date with remote"
elif [ "$LOCAL" = "$BASE" ]; then
    error "Local branch is behind remote"
    error "Please pull the latest changes: git pull"
    exit 1
elif [ "$REMOTE" = "$BASE" ]; then
    # Local is ahead of remote
    if [ "$PRE_RELEASE" = true ] && [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
        warning "Local branch is ahead of remote (has unpushed commits)"
        if ! ask_yes_no "Continue with unpushed commits for pre-release?"; then
            info "Please push your changes first: git push"
            exit 1
        fi
        success "Confirmed to proceed with unpushed commits"
    else
        error "Local branch is ahead of remote"
        error "Please push your changes first: git push"
        exit 1
    fi
else
    error "Local and remote branches have diverged"
    error "Please resolve the divergence before publishing"
    exit 1
fi

# Step 4: Build all packages
info "Building all packages..."
if [ "$DRY_RUN" = false ]; then
    npm run build
    success "Build completed"
else
    info "[DRY-RUN] Would run: npm run build"
fi

# Step 5: Run tests
info "Running tests..."
if [ "$DRY_RUN" = false ]; then
    npm run test:unit
    success "All tests passed"
else
    info "[DRY-RUN] Would run: npm run test:unit"
fi

# Step 6: Package and publish
if [ "$PUBLISH_TARGET" = "cli" ]; then
    # CLI tool - publish to npm
    info "Preparing to publish CLI tool to npm..."

    if [ "$DRY_RUN" = false ]; then
        cd "$PACKAGE_DIR"
        info "Running: npm publish --access public"
        npm publish --access public
        cd ../..
        success "CLI tool published to npm!"
    else
        info "[DRY-RUN] Would run: cd ${PACKAGE_DIR} && npm publish --access public"
    fi

elif [ "$PUBLISH_TARGET" = "vscode" ]; then
    # VS Code extension - publish to marketplace
    info "Preparing to publish VS Code extension..."

    # Check if vsce is available
    if ! command -v vsce >/dev/null 2>&1; then
        error "vsce command not found"
        error "Please install it with: npm install -g @vscode/vsce"
        exit 1
    fi

    # Build VSIX package
    info "Building VSIX package..."
    if [ "$DRY_RUN" = false ]; then
        npm run package:vscode
        success "VSIX package created"
    else
        info "[DRY-RUN] Would run: npm run package:vscode"
    fi

    # Determine publish command
    VSCE_COMMAND="vsce publish"
    if [ "$PRE_RELEASE" = true ]; then
        VSCE_COMMAND="vsce publish --pre-release"
        info "Publishing as pre-release version"
    fi

    if [ "$DRY_RUN" = false ]; then
        cd "$PACKAGE_DIR"
        info "Running: ${VSCE_COMMAND}"
        ${VSCE_COMMAND}
        cd ../..
        success "Extension published successfully!"
    else
        info "[DRY-RUN] Would run: cd ${PACKAGE_DIR} && ${VSCE_COMMAND}"
    fi
fi

# Step 7: Create and push tag (only if not dry run)
if [ "$DRY_RUN" = false ]; then
    info "Creating tag ${TAG_NAME}..."
    git tag -a "${TAG_NAME}" -m "Release ${PACKAGE_NAME} version ${VERSION}"
    success "Tag ${TAG_NAME} created"

    if ask_yes_no "Push tag ${TAG_NAME} to remote?"; then
        info "Pushing tag to remote..."
        git push origin "${TAG_NAME}"
        success "Tag pushed to remote"
    else
        warning "Tag not pushed to remote"
        warning "You can push it later with: git push origin ${TAG_NAME}"
        warning "Or delete it with: git tag -d ${TAG_NAME}"
    fi
else
    info "[DRY-RUN] Would create tag: ${TAG_NAME}"
    info "[DRY-RUN] Would ask to push tag to remote"
fi

success "Publish process completed!"

# Print summary
echo ""
if [ "$DRY_RUN" = false ]; then
    info "Summary:"
    echo "  - Package: ${PACKAGE_NAME}"
    echo "  - Version: ${VERSION}"
    echo "  - Tag: ${TAG_NAME}"
    if [ "$PUBLISH_TARGET" = "vscode" ]; then
        echo "  - Pre-release: ${PRE_RELEASE}"
        echo ""
        success "${PACKAGE_NAME} ${VERSION} has been published to VS Code Marketplace!"
    else
        echo ""
        success "${PACKAGE_NAME} ${VERSION} has been published to npm!"
    fi
else
    info "[DRY-RUN] Summary:"
    echo "  - Package: ${PACKAGE_NAME}"
    echo "  - Version: ${VERSION}"
    echo "  - Tag: ${TAG_NAME}"
    if [ "$PUBLISH_TARGET" = "vscode" ]; then
        echo "  - Pre-release: ${PRE_RELEASE}"
    fi
    echo ""
    info "[DRY-RUN] No actual changes were made. Package built and tested successfully."
fi
