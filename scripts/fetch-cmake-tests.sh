#!/bin/bash
# Script to fetch representative CMake test files from official repository

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TEST_DIR="$PROJECT_ROOT/test/datasets/cmake-official"
TMP_DIR="/tmp/cmake-tests"

echo "📦 Fetching CMake official test files..."

# Create directories
mkdir -p "$TEST_DIR"
mkdir -p "$TMP_DIR"

# Clone CMake repository (shallow, only Tests directory)
if [ ! -d "$TMP_DIR/CMake" ]; then
    echo "🔄 Cloning CMake repository..."
    git clone --depth 1 --filter=blob:none --sparse https://github.com/Kitware/CMake.git "$TMP_DIR/CMake"
    cd "$TMP_DIR/CMake"
    git sparse-checkout set Tests
fi

cd "$TMP_DIR/CMake"

echo "📝 Collecting representative test files..."

# Function to copy file with metadata
copy_with_info() {
    local src="$1"
    local category="$2"
    local dest_dir="$TEST_DIR/$category"

    mkdir -p "$dest_dir"
    local filename=$(basename "$src")
    local dest="$dest_dir/$filename"

    if [ -f "$src" ] && [ ! -f "$dest" ]; then
        cp "$src" "$dest"
        echo "✅ Copied: $category/$filename"
    fi
}

# Category 1: Basic CMake syntax
echo ""
echo "📁 Category 1: Basic CMake Syntax"
find Tests/CMakeOnly -name "CMakeLists.txt" -type f | head -5 | while read file; do
    copy_with_info "$file" "basic-syntax"
done

# Category 2: Command tests
echo ""
echo "📁 Category 2: CMake Commands"
for cmd in add_executable add_library target_link_libraries set_property; do
    find Tests/RunCMake -path "*/$cmd/*" -name "*.cmake" -type f | head -2 | while read file; do
        # Rename to avoid conflicts
        dest_name="${cmd}_$(basename $(dirname $file))_$(basename $file)"
        mkdir -p "$TEST_DIR/commands"
        if [ ! -f "$TEST_DIR/commands/$dest_name" ]; then
            cp "$file" "$TEST_DIR/commands/$dest_name"
            echo "✅ Copied: commands/$dest_name"
        fi
    done
done

# Category 3: Real-world examples
echo ""
echo "📁 Category 3: Real-world Examples"
if [ -f "Tests/CMakeLists.txt" ]; then
    copy_with_info "Tests/CMakeLists.txt" "real-world"
fi

# Category 4: Complex projects
echo ""
echo "📁 Category 4: Complex Projects"
find Tests/Complex -name "*.cmake" -o -name "CMakeLists.txt" | head -3 | while read file; do
    copy_with_info "$file" "complex"
done

# Category 5: Tutorial examples
echo ""
echo "📁 Category 5: Tutorial Examples"
find Tests -path "*/Tutorial/*" -name "CMakeLists.txt" | head -5 | while read file; do
    step_name=$(basename $(dirname $file))
    dest_name="tutorial_${step_name}.cmake"
    mkdir -p "$TEST_DIR/tutorial"
    if [ ! -f "$TEST_DIR/tutorial/$dest_name" ]; then
        cp "$file" "$TEST_DIR/tutorial/$dest_name"
        echo "✅ Copied: tutorial/$dest_name"
    fi
done

echo ""
echo "✨ Done! Test files saved to: $TEST_DIR"
echo "📊 Summary:"
find "$TEST_DIR" -type f -name "*.cmake" -o -name "CMakeLists.txt" | wc -l | xargs echo "Total files:"

echo ""
echo "💡 Next steps:"
echo "1. Review the downloaded files in $TEST_DIR"
echo "2. Select representative ones to add to well-formatted test suite"
echo "3. Run: npm run test:unit"
