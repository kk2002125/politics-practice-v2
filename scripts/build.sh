#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
node scripts/embed-assets.mjs
rm -rf dist
mkdir -p dist/server
cp worker/index.js dist/server/index.js
