#!/usr/bin/env bash
# Start MCP server in stdio mode (for Claude Desktop, etc.)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
exec node --env-file="$ROOT_DIR/.env" "$ROOT_DIR/dist/index.js" "$@"