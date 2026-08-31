@echo off
title FinFlow Pro - Micro Finance Management System
echo ================================================================
echo           FinFlow Pro - Micro Finance Management OS             
echo    AI-Powered Credit Scoring, Dexie.js Database, Email Alerts   
echo ================================================================
echo.
echo Launching standalone Windows application...

if exist "%~dp0FinFlow-Pro.exe" (
    start "" "%~dp0FinFlow-Pro.exe"
    exit /b 0
)

echo Starting web server mode...
cd /d "%~dp0micro-finance-web"
call npm run preview -- --port 5173 --open
pause
