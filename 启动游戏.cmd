@echo off
chcp 65001 >nul
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto missing_node

where npm >nul 2>nul
if errorlevel 1 goto missing_npm

node scripts\start-game.mjs
set "launcher_exit_code=%errorlevel%"
if not "%launcher_exit_code%"=="0" goto launcher_failed
exit /b 0

:missing_node
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -EncodedCommand VwByAGkAdABlAC0ATwB1AHQAcAB1AHQAIAAnAFsAGZXvi10AIAAqZ35iMFIgAE4AbwBkAGUALgBqAHMADP/3i4lbxYggAE4AbwBkAGUALgBqAHMAIAAyADQAIAAWYvRm2JpIcixnAjAnAA==
set "launcher_exit_code=1"
goto launcher_failed

:missing_npm
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -EncodedCommand VwByAGkAdABlAC0ATwB1AHQAcAB1AHQAIAAnAFsAGZXvi10AIAAqZ35iMFIgAG4AcABtAAz/94vNkbBliVvFiAVTK1QgAG4AcABtACAAhHYgAE4AbwBkAGUALgBqAHMAIAAyADQAIAAWYvRm2JpIcixnAjAnAA==
set "launcher_exit_code=1"
goto launcher_failed

:launcher_failed
echo.
"%SystemRoot%\System32\WindowsPowerShell\v1.0\powershell.exe" -NoProfile -NonInteractive -EncodedCommand VwByAGkAdABlAC0ATwB1AHQAcAB1AHQAIAAnAC9UqFIqZ4xbEGIM//eL5WcLdwpOuWUZle+L4U9vYAIwJwA=
pause
exit /b %launcher_exit_code%
