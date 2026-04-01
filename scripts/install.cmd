@echo off
REM Install dependencies and build the project
cd /d "%~dp0.." && npm install && npm run build