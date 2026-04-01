#!/usr/bin/env bash
# Start MCP server in HTTP mode on port $SERVER_PORT (default 8080)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$SCRIPT_DIR/.."
exec node --env-file="$ROOT_DIR/.env" "$ROOT_DIR/dist/index.js" --transport http "$@"