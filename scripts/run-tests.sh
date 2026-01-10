#!/usr/bin/env bash
# Run unit tests for the monorepo.
#
# This script is intentionally a thin wrapper around the workspace task to avoid
# divergence between CI/local scripts.

set -euo pipefail

cd "$(dirname "$0")/.." || exit 1

if ! command -v pnpm >/dev/null 2>&1; then
    echo "ERROR: pnpm is required. Please install pnpm and run 'pnpm install' first." >&2
    exit 1
fi

echo "Running unit tests..."
pnpm run test:unit
