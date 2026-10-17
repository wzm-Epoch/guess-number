@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js was not found. Install Node.js 24 or newer.
  set "launcher_exit_code=1"
  goto launcher_failed
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found. Reinstall Node.js 24 or newer with npm.
  set "launcher_exit_code=1"
  goto launcher_failed
)

node scripts\start-game.mjs
set "launcher_exit_code=%errorlevel%"
if not "%launcher_exit_code%"=="0" goto launcher_failed
exit /b 0

:launcher_failed
echo.
echo Startup did not complete. Review the error above.
pause
exit /b %launcher_exit_code%
