#!/bin/bash

# Publish script for clion-cmake-format VS Code extension
# This script ensures the repository is in a clean state before publishing

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

while [[ $# -gt 0 ]]; do
    case $1 in
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
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  -n, --dry-run      Dry run mode, only print what would be done"
        echo "  -y, --yes          Skip all prompts and proceed automatically"
        echo "  -p, --pre-release  Publish as pre-release version"
        echo "  -h, --help         Show this help message"
        exit 0
        ;;
    *)
        echo -e "${RED}Error: Unknown option $1${NC}"
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
    if command -v node >/dev/null 2>&1; then
        node -p "require('./package.json').version"
    else
        # Fallback to grep/sed if node is not available
        grep -o '"version": *"[^"]*"' package.json | sed 's/"version": *"\(.*\)"/\1/'
    fi
}

# Get default branch name (usually 'main' or 'master')
get_default_branch() {
    git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@'
}

info "Starting publish process..."

if [ "$DRY_RUN" = true ]; then
    warning "Running in DRY-RUN mode - no actual changes will be made"
fi

# Step 1: Check if there are uncommitted changes
info "Checking for uncommitted changes..."
if ! git diff-index --quiet HEAD --; then
    error "There are uncommitted changes in the repository"
    error "Please commit or stash your changes before publishing"
    exit 1
fi
success "Working directory is clean"

# Step 2: Get version and check if tag already exists on remote
VERSION=$(get_version)
TAG_NAME="v${VERSION}"

info "Current version: ${VERSION}"
info "Tag to create: ${TAG_NAME}"

if [ "$DRY_RUN" = false ]; then
    info "Checking if tag ${TAG_NAME} already exists on remote..."
    if git ls-remote --tags origin | grep -q "refs/tags/${TAG_NAME}$"; then
        error "Tag ${TAG_NAME} already exists on remote"
        error "Please update the version in package.json before publishing"
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
    error "Not on default branch (${DEFAULT_BRANCH})"
    error "Current branch is: ${CURRENT_BRANCH}"
    error "Please switch to ${DEFAULT_BRANCH} before publishing"
    exit 1
fi
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
    error "Local branch is ahead of remote"
    error "Please push your changes first: git push"
    exit 1
else
    error "Local and remote branches have diverged"
    error "Please resolve the divergence before publishing"
    exit 1
fi

# Step 4: Create and push tag
info "Creating tag ${TAG_NAME}..."
if [ "$DRY_RUN" = false ]; then
    git tag -a "${TAG_NAME}" -m "Release version ${VERSION}"
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

# Step 5: Package and publish with vsce
info "Preparing to publish extension..."

# Check if vsce is available
if ! command -v vsce >/dev/null 2>&1; then
    error "vsce command not found"
    error "Please install it with: npm install -g @vscode/vsce"
    exit 1
fi

# Determine publish command
VSCE_COMMAND="vsce publish"
if [ "$PRE_RELEASE" = true ]; then
    VSCE_COMMAND="vsce publish --pre-release"
    info "Publishing as pre-release version"
fi

if [ "$DRY_RUN" = false ]; then
    info "Running: ${VSCE_COMMAND}"
    ${VSCE_COMMAND}
    success "Extension published successfully!"
else
    info "[DRY-RUN] Would run: ${VSCE_COMMAND}"
fi

success "Publish process completed!"

if [ "$DRY_RUN" = false ]; then
    echo ""
    info "Summary:"
    echo "  - Version: ${VERSION}"
    echo "  - Tag: ${TAG_NAME}"
    echo "  - Pre-release: ${PRE_RELEASE}"
    echo ""
    success "Extension ${VERSION} has been published to VS Code Marketplace!"
else
    echo ""
    info "[DRY-RUN] Summary:"
    echo "  - Version: ${VERSION}"
    echo "  - Tag: ${TAG_NAME}"
    echo "  - Pre-release: ${PRE_RELEASE}"
    echo ""
    info "[DRY-RUN] No actual changes were made"
fi
