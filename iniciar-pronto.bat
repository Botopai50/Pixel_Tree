@echo off
setlocal
cd /d "%~dp0"
title Gerador de Arvores e Pedras BOTW
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0servir-build.ps1"
if errorlevel 1 pause
endlocal
