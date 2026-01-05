#!/bin/bash

# Publish script for clion-cmake-format monorepo
# Supports publishing core package, CLI tool (npm) and VS Code extension (marketplace)

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
PRE_RELEASE=""
PUBLISH_TARGET=""
PUBLISH_ALL=false
FORCE_MODE=false

while [[ $# -gt 0 ]]; do
    case $1 in
    --core)
        PUBLISH_TARGET="core"
        shift
        ;;
    --cli)
        PUBLISH_TARGET="cli"
        shift
        ;;
    --vsc)
        PUBLISH_TARGET="vscode"
        shift
        ;;
    --all)
        PUBLISH_ALL=true
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
    -f | --force)
        FORCE_MODE=true
        shift
        ;;
    -p | --pre-release)
        PRE_RELEASE="yes"
        shift
        ;;
    -h | --help)
        echo "Usage: $0 [TARGET] [OPTIONS]"
        echo ""
        echo "Targets:"
        echo "  --core             Publish @cc-format/core package to npm"
        echo "  --cli              Publish CLI tool (cc-format) to npm (requires core to be published first)"
        echo "  --vsc              Publish VS Code extension to marketplace"
        echo "  --all              Publish all packages in order (core -> cli -> vscode)"
        echo ""
        echo "Options:"
        echo "  -n, --dry-run      Dry run mode, build and test but don't publish"
        echo "  -y, --yes          Skip all prompts and proceed automatically"
        echo "  -p, --pre-release  Publish as pre-release version"
        echo "  -f, --force        Force mode, prompt to ignore validation errors"
        echo "  -h, --help         Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 --core          # Publish @cc-format/core package"
        echo "  $0 --cli -n        # Test CLI packaging (dry run)"
        echo "  $0 --vsc -p        # Publish VS Code extension as pre-release"
        echo "  $0 --all           # Publish all packages in order"
        echo "  $0 --all -f        # Publish all packages with force mode"
        echo "  $0                 # Interactive mode (choose target)"
        echo ""
        echo "Note: CLI tool depends on @cc-format/core, so publish core first."
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
        # Use absolute path to ensure it works regardless of current directory
        node -p "require('$PWD/${package_path}').version"
    else
        # Fallback to grep/sed if node is not available
        grep -o '"version": *"[^"]*"' "$package_path" | sed 's/"version": *"\(.*\)"/\1/'
    fi
}

# Get published version from npm
get_npm_published_version() {
    local package_name="$1"
    npm view "$package_name" version 2>/dev/null || echo "not-published"
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
    echo "  1) @cc-format/core (npm)"
    echo "  2) cc-format CLI tool (npm)"
    echo "  3) clion-cmake-format VS Code extension (marketplace)"
    echo "  4) All packages (core -> cli -> vscode)"
    echo "  0) Cancel"
    echo ""
    echo -e "${YELLOW}Note: CLI tool depends on @cc-format/core, publish core first.${NC}"
    echo ""
    read -p "Enter your choice [0-4]: " choice

    case $choice in
    1)
        PUBLISH_TARGET="core"
        ;;
    2)
        PUBLISH_TARGET="cli"
        ;;
    3)
        PUBLISH_TARGET="vscode"
        ;;
    4)
        PUBLISH_ALL=true
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

# Select release type (pre-release or stable)
select_release_type() {
    if [ -n "$PRE_RELEASE" ]; then
        # Already specified via command line
        return
    fi

    if [ "$AUTO_YES" = true ]; then
        PRE_RELEASE="no"
        return
    fi

    echo ""
    echo "Select release type:"
    echo "  1) Stable release"
    echo "  2) Pre-release"
    echo ""
    read -p "Enter your choice [1-2]: " choice

    case $choice in
    1)
        PRE_RELEASE="no"
        ;;
    2)
        PRE_RELEASE="yes"
        ;;
    *)
        error "Invalid choice"
        exit 1
        ;;
    esac
}

# If no target specified, ask user to choose
if [ -z "$PUBLISH_TARGET" ] && [ "$PUBLISH_ALL" = false ]; then
    select_target
fi

# Ask for release type
select_release_type

# Ask for release type
select_release_type

# Main publish function
publish_package() {
    local target="$1"
    local SKIP_PUBLISH=false

    info "════════════════════════════════════════════════════════"
    info "Starting publish process for: ${target}"
    info "════════════════════════════════════════════════════════"

    if [ "$DRY_RUN" = true ]; then
        warning "Running in DRY-RUN mode - no actual changes will be made"
    fi

    # Set package-specific paths
    if [ "$target" = "core" ]; then
        PACKAGE_DIR="packages/core"
        PACKAGE_NAME="@cc-format/core"
        PACKAGE_JSON="${PACKAGE_DIR}/package.json"
    elif [ "$target" = "cli" ]; then
        PACKAGE_DIR="packages/cli"
        PACKAGE_NAME="cc-format"
        PACKAGE_JSON="${PACKAGE_DIR}/package.json"
    elif [ "$target" = "vscode" ]; then
        PACKAGE_DIR="packages/vscode"
        PACKAGE_NAME="clion-cmake-format"
        PACKAGE_JSON="${PACKAGE_DIR}/package.json"
    else
        error "Invalid publish target: ${target}"
        return 1
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

        if [ "$FORCE_MODE" = true ]; then
            if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore symlink verification failure?"; then
                warning "Continuing despite symlink verification failure"
            else
                return 1
            fi
        else
            return 1
        fi
    else
        success "All symlinks are valid"
    fi

    # Step 1: Check if there are uncommitted changes
    info "Checking for uncommitted changes..."
    if ! git diff-index --quiet HEAD --; then
        error "There are uncommitted changes in the repository"
        error "Please commit or stash your changes before publishing"

        if [ "$FORCE_MODE" = true ]; then
            if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore uncommitted changes?"; then
                warning "Continuing with uncommitted changes"
            else
                return 1
            fi
        else
            return 1
        fi
    else
        success "Working directory is clean"
    fi

    # Step 2: Get version and check if tag already exists on remote
    VERSION=$(get_version "$PACKAGE_JSON")

    # Construct tag name based on target and release type
    if [ "$PRE_RELEASE" = "yes" ]; then
        TAG_SUFFIX="-pre"
    else
        TAG_SUFFIX=""
    fi

    if [ "$target" = "core" ]; then
        TAG_NAME="core.${VERSION}${TAG_SUFFIX}"
    elif [ "$target" = "cli" ]; then
        TAG_NAME="cli.${VERSION}${TAG_SUFFIX}"
    elif [ "$target" = "vscode" ]; then
        TAG_NAME="vsc.${VERSION}${TAG_SUFFIX}"
    fi

    info "Current version: ${VERSION}"
    info "Tag to create: ${TAG_NAME}"
    info "Release type: $([ "$PRE_RELEASE" = "yes" ] && echo "Pre-release" || echo "Stable")"

    # Check published version on npm (only for npm packages)
    if [ "$target" = "core" ] || [ "$target" = "cli" ]; then
        PUBLISHED_VERSION=$(get_npm_published_version "$PACKAGE_NAME")
        if [ "$PUBLISHED_VERSION" = "not-published" ]; then
            info "Published version: not yet published"
        else
            info "Published version: ${PUBLISHED_VERSION}"

            # Compare versions
            if [ "$VERSION" = "$PUBLISHED_VERSION" ] && [ "$PRE_RELEASE" = "no" ]; then
                warning "Current version (${VERSION}) is already published on npm"
                
                # Ask user if they want to skip publishing and continue
                if ask_yes_no "Skip publishing ${PACKAGE_NAME} and continue with remaining steps?"; then
                    info "Skipping ${target} package publication"
                    SKIP_PUBLISH=true
                elif [ "$DRY_RUN" = false ]; then
                    # User chose not to skip (only enforce in non-dry-run mode)
                    error "Current version (${VERSION}) is the same as published version (${PUBLISHED_VERSION})"
                    error "Please update the version in ${PACKAGE_JSON} before publishing"
                    error "You can use: ./scripts/bump-version.sh <new-version>"

                    if [ "$FORCE_MODE" = true ]; then
                        if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore version check and continue?"; then
                            warning "Continuing despite version mismatch"
                        else
                            return 1
                        fi
                    else
                        return 1
                    fi
                fi
            fi
        fi
    fi

    # For CLI, check if core is published and has the same version
    if [ "$target" = "cli" ]; then
        CORE_VERSION=$(get_version "packages/core/package.json")
        CORE_PUBLISHED_VERSION=$(get_npm_published_version "@cc-format/core")

        info "Required @cc-format/core version: ${CORE_VERSION}"
        info "Published @cc-format/core version: ${CORE_PUBLISHED_VERSION}"

        if [ "$CORE_PUBLISHED_VERSION" = "not-published" ]; then
            error "@cc-format/core is not published yet"
            error "Please publish @cc-format/core first: ./scripts/publish.sh --core"
            return 1
        fi

        if [ "$CORE_VERSION" != "$CORE_PUBLISHED_VERSION" ]; then
            error "@cc-format/core version mismatch:"
            error "  Required: ${CORE_VERSION}"
            error "  Published: ${CORE_PUBLISHED_VERSION}"
            error "Please publish @cc-format/core first: ./scripts/publish.sh --core"

            if [ "$FORCE_MODE" = true ]; then
                if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore core version mismatch?"; then
                    warning "Continuing despite core version mismatch"
                else
                    return 1
                fi
            else
                return 1
            fi
        else
            success "@cc-format/core version ${CORE_VERSION} is already published"
        fi
    fi

    # Show summary and ask for confirmation
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  Publish Summary${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo ""
    echo "Package:          ${PACKAGE_NAME}"
    echo "Current version:  ${VERSION}"
    if [ "$target" = "core" ] || [ "$target" = "cli" ]; then
        if [ "$PUBLISHED_VERSION" = "not-published" ]; then
            echo "Published version: not yet published"
        else
            echo "Published version: ${PUBLISHED_VERSION}"
        fi
    fi
    echo "Git tag:          ${TAG_NAME}"
    echo "Release type:     $([ "$PRE_RELEASE" = "yes" ] && echo "Pre-release" || echo "Stable")"
    echo ""

    if ! ask_yes_no "Do you want to proceed with publishing?"; then
        info "Cancelled by user"
        return 1
    fi

    if [ "$DRY_RUN" = false ]; then
        info "Checking if tag ${TAG_NAME} already exists on remote..."
        if git ls-remote --tags origin | grep -q "refs/tags/${TAG_NAME}$"; then
            error "Tag ${TAG_NAME} already exists on remote"
            error "Please update the version in ${PACKAGE_JSON} before publishing"

            if [ "$FORCE_MODE" = true ]; then
                if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Tag exists. Delete remote tag and continue?"; then
                    warning "Deleting remote tag ${TAG_NAME}..."
                    git push origin ":refs/tags/${TAG_NAME}" || true
                    git tag -d "${TAG_NAME}" 2>/dev/null || true
                    success "Remote tag deleted"
                else
                    return 1
                fi
            else
                return 1
            fi
        else
            success "Tag ${TAG_NAME} does not exist on remote"
        fi
    else
        info "[DRY-RUN] Would check if tag ${TAG_NAME} exists on remote"
    fi

    # Step 3: Check if on default branch and synced with remote
    DEFAULT_BRANCH=$(get_default_branch)
    CURRENT_BRANCH=$(git branch --show-current)

    info "Default branch: ${DEFAULT_BRANCH}"
    info "Current branch: ${CURRENT_BRANCH}"

    if [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
        if [ "$PRE_RELEASE" = "yes" ]; then
            warning "Not on default branch (${DEFAULT_BRANCH})"
            warning "Current branch is: ${CURRENT_BRANCH}"
            if [ "$FORCE_MODE" = true ]; then
                if ! ask_yes_no "${YELLOW}[FORCE MODE]${NC} Continue publishing pre-release from non-default branch?"; then
                    info "Cancelled by user"
                    return 1
                fi
            else
                if ! ask_yes_no "Continue publishing pre-release from non-default branch?"; then
                    info "Cancelled by user"
                    return 1
                fi
            fi
            success "Confirmed to publish pre-release from feature branch"
        else
            error "Not on default branch (${DEFAULT_BRANCH})"
            error "Current branch is: ${CURRENT_BRANCH}"
            error "Please switch to ${DEFAULT_BRANCH} before publishing"
            error "Or use --pre-release flag to publish from a feature branch"

            if [ "$FORCE_MODE" = true ]; then
                if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore branch check and publish stable from non-default branch?"; then
                    warning "Publishing stable release from non-default branch"
                else
                    return 1
                fi
            else
                return 1
            fi
        fi
    else
        success "On default branch"
    fi

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

        if [ "$FORCE_MODE" = true ]; then
            if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore out-of-sync branch?"; then
                warning "Continuing with outdated local branch"
            else
                return 1
            fi
        else
            return 1
        fi
    elif [ "$REMOTE" = "$BASE" ]; then
        # Local is ahead of remote
        if [ "$PRE_RELEASE" = "yes" ] && [ "$CURRENT_BRANCH" != "$DEFAULT_BRANCH" ]; then
            warning "Local branch is ahead of remote (has unpushed commits)"
            if [ "$FORCE_MODE" = true ]; then
                if ! ask_yes_no "${YELLOW}[FORCE MODE]${NC} Continue with unpushed commits for pre-release?"; then
                    info "Please push your changes first: git push"
                    return 1
                fi
            else
                if ! ask_yes_no "Continue with unpushed commits for pre-release?"; then
                    info "Please push your changes first: git push"
                    return 1
                fi
            fi
            success "Confirmed to proceed with unpushed commits"
        else
            error "Local branch is ahead of remote"
            error "Please push your changes first: git push"

            if [ "$FORCE_MODE" = true ]; then
                if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore unpushed commits?"; then
                    warning "Continuing with unpushed commits"
                else
                    return 1
                fi
            else
                return 1
            fi
        fi
    else
        error "Local and remote branches have diverged"
        error "Please resolve the divergence before publishing"

        if [ "$FORCE_MODE" = true ]; then
            if ask_yes_no "${YELLOW}[FORCE MODE]${NC} Ignore diverged branches?"; then
                warning "Continuing with diverged branches"
            else
                return 1
            fi
        else
            return 1
        fi
    fi

    # Step 4: Build all packages
    info "Installing dependencies..."
    if [ "$DRY_RUN" = false ]; then
        npm install
        success "Dependencies installed"
    else
        info "[DRY-RUN] Would run: npm install"
    fi

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
    # Skip publication if user chose to skip
    if [ "$SKIP_PUBLISH" = true ]; then
        info "Skipping publication step (already published)"
    elif [ "$target" = "core" ]; then
        # Core package - publish to npm
        info "Preparing to publish @cc-format/core to npm..."

        if [ "$DRY_RUN" = false ]; then
            cd "$PACKAGE_DIR"
            if [ "$PRE_RELEASE" = "yes" ]; then
                info "Running: npm publish --access public --tag next"
                npm publish --access public --tag next
            else
                info "Running: npm publish --access public"
                npm publish --access public
            fi
            cd ../..
            success "@cc-format/core published to npm!"
        else
            if [ "$PRE_RELEASE" = "yes" ]; then
                info "[DRY-RUN] Would run: cd ${PACKAGE_DIR} && npm publish --access public --tag next"
            else
                info "[DRY-RUN] Would run: cd ${PACKAGE_DIR} && npm publish --access public"
            fi
        fi

    elif [ "$target" = "cli" ]; then
        # CLI tool - publish to npm
        if [ "$SKIP_PUBLISH" = true ]; then
            info "Skipping CLI publication step (already published)"
        else
            info "Preparing to publish CLI tool to npm..."

            if [ "$DRY_RUN" = false ]; then
                cd "$PACKAGE_DIR"
                if [ "$PRE_RELEASE" = "yes" ]; then
                    info "Running: npm publish --access public --tag next"
                    npm publish --access public --tag next
                else
                    info "Running: npm publish --access public"
                    npm publish --access public
                fi
                cd ../..
                success "CLI tool published to npm!"
            else
                if [ "$PRE_RELEASE" = "yes" ]; then
                    info "[DRY-RUN] Would run: cd ${PACKAGE_DIR} && npm publish --access public --tag next"
                else
                    info "[DRY-RUN] Would run: cd ${PACKAGE_DIR} && npm publish --access public"
                fi
            fi
        fi

    elif [ "$target" = "vscode" ]; then
        # VS Code extension - publish to marketplace
        info "Preparing to publish VS Code extension..."

        # Check if vsce is available
        if ! command -v vsce >/dev/null 2>&1; then
            error "vsce command not found"
            error "Please install it with: npm install -g @vscode/vsce"
            return 1
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
        if [ "$PRE_RELEASE" = "yes" ]; then
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
        git tag -a "${TAG_NAME}" -m "Release ${PACKAGE_NAME} version ${VERSION}$([ "$PRE_RELEASE" = "yes" ] && echo " (pre-release)" || echo "")"
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

    success "Publish process completed for ${target}!"

    # Print summary
    echo ""
    if [ "$DRY_RUN" = false ]; then
        info "Summary:"
        echo "  - Package: ${PACKAGE_NAME}"
        echo "  - Version: ${VERSION}"
        echo "  - Tag: ${TAG_NAME}"
        echo "  - Release type: $([ "$PRE_RELEASE" = "yes" ] && echo "Pre-release" || echo "Stable")"
        if [ "$target" = "vscode" ]; then
            echo ""
            success "${PACKAGE_NAME} ${VERSION} has been published to VS Code Marketplace!"
        else
            echo ""
            success "${PACKAGE_NAME} ${VERSION} has been published to npm!"
            echo ""
            if [ "$target" = "core" ]; then
                info "Next step: You can now publish the CLI tool with:"
                echo "  ./scripts/publish.sh --cli"
            fi
        fi
    else
        info "[DRY-RUN] Summary:"
        echo "  - Package: ${PACKAGE_NAME}"
        echo "  - Version: ${VERSION}"
        echo "  - Tag: ${TAG_NAME}"
        echo "  - Release type: $([ "$PRE_RELEASE" = "yes" ] && echo "Pre-release" || echo "Stable")"
        echo ""
        info "[DRY-RUN] No actual changes were made. Package built and tested successfully."
    fi

    return 0
}

# Main execution
if [ "$PUBLISH_ALL" = true ]; then
    info "Publishing all packages in order: core -> cli -> vscode"
    echo ""

    # Publish core
    if ! publish_package "core"; then
        error "Failed to publish core package"
        error "Aborting remaining publications"
        exit 1
    fi

    echo ""
    echo ""

    # Publish CLI
    if ! publish_package "cli"; then
        error "Failed to publish CLI package"
        error "Aborting remaining publications"
        exit 1
    fi

    echo ""
    echo ""

    # Publish VS Code extension
    if ! publish_package "vscode"; then
        error "Failed to publish VS Code extension"
        exit 1
    fi

    echo ""
    success "All packages published successfully!"
    exit 0
else
    # Publish single package
    publish_package "$PUBLISH_TARGET"
    exit $?
fi
