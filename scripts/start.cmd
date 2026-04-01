@echo off
REM Start MCP server in stdio mode (for Claude Desktop, etc.)
node --env-file="%~dp0..\.env" "%~dp0..\dist\index.js" %*