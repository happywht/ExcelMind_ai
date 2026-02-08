@echo off
chcp 65001 >nul
title 停止 ExcelMind AI

echo 正在停止 ExcelMind AI...
echo.

REM 停止 Node.js 后端进程
taskkill /F /FI "WINDOWTITLE eq ExcelMind AI - 后端服务器*" >nul 2>nul
taskkill /F /IM node.exe /T >nul 2>nul

REM 停止 Electron 前端进程
taskkill /F /IM "ExcelMind AI.exe" /T >nul 2>nul

echo ✅ ExcelMind AI 已停止
echo.
timeout /t 2 /nobreak >nul
