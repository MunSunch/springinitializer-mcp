@echo off
REM Start MCP server in HTTP mode on port %SERVER_PORT% (default 8080)
node --env-file="%~dp0..\.env" "%~dp0..\dist\index.js" --transport http %*