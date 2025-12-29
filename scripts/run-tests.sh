#!/bin/bash
# Run tests directly without workspace issues

cd "$(dirname "$0")/.."

echo "Running tests..."
NODE_OPTIONS='--loader ts-node/esm/transpile-only' \
    ./node_modules/.bin/mocha \
    --require ts-node/register \
    --extensions ts \
    --project tsconfig.test.json \
    'test/*.test.ts' \
    --exclude 'test/integration/**/*.test.ts'
