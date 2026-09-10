@echo off
title FinFlow Pro - Installer Builder
echo ================================================================
echo           FinFlow Pro - Standalone Setup.exe Builder             
echo ================================================================
echo.
powershell -ExecutionPolicy Bypass -File "%~dp0build-installer.ps1"
echo.
pause
