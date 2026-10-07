@echo off
rem Doppelklick startet God's Eye View. Details und Optionen: scripts\launch.mjs
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo Node.js wurde nicht gefunden.
  echo Bitte Node.js 24 LTS von https://nodejs.org installieren und danach erneut starten.
  echo.
  start "" https://nodejs.org/
  pause
  exit /b 1
)

node scripts\launch.mjs --lang de %*
if errorlevel 1 pause
