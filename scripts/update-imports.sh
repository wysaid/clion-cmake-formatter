#!/bin/bash
# Script to update import paths in test files

set -e

cd "$(dirname "$0")/.."

echo "Updating import paths in test files..."

# Update all test files to import from @cc-format/core
find test -name "*.test.ts" -type f | while read file; do
    # Skip CLI tests (they should keep commander imports)
    if [[ "$file" == *"cli.test.ts"* ]]; then
        continue
    fi

    echo "  Updating: $file"

    # Replace '../src/parser' with '@cc-format/core'
    sed -i.bak "s|from '../src/parser'|from '@cc-format/core'|g" "$file"

    # Replace '../src/formatter' with '@cc-format/core'
    sed -i.bak "s|from '../src/formatter'|from '@cc-format/core'|g" "$file"

    # Replace '../src/config' with '@cc-format/core'
    sed -i.bak "s|from '../src/config'|from '@cc-format/core'|g" "$file"

    # Replace '../src/validator' with '@cc-format/core'
    sed -i.bak "s|from '../src/validator'|from '@cc-format/core'|g" "$file"

    # Remove backup files
    rm -f "$file.bak"
done

echo "✓ Import paths updated"
