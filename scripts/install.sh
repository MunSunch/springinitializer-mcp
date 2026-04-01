#!/usr/bin/env bash
# Install dependencies and build the project
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR/.." && npm install && npm run build