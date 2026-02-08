@echo off
chcp 65001 >nul
title ExcelMind AI

echo ========================================
echo    ExcelMind AI 启动程序
echo ========================================
echo.

REM 获取当前目录
set "APP_DIR=%~dp0"
cd /d "%APP_DIR%"

REM 检查后端文件
if not exist "backend\index.js" (
    echo [错误] 未找到后端文件！
    echo 请确保 backend\index.js 存在
    pause
    exit /b 1
)

REM 检查 Node.js（便携版或系统版）
set "NODE_EXE=%APP_DIR%nodejs\node.exe"

if not exist "%NODE_EXE%" (
    echo [提示] 未找到便携版 Node.js，尝试使用系统 Node.js...
    where node >nul 2>nul
    if errorlevel 1 (
        echo [错误] 未找到 Node.js！
        echo.
        echo 请选择以下方式之一：
        echo 1. 下载便携版 Node.js 并解压到 nodejs 文件夹
        echo 2. 安装 Node.js: https://nodejs.org/
        echo.
        pause
        exit /b 1
    )
    set "NODE_EXE=node"
)

echo [1/2] 启动后端服务器...
echo.

REM 启动后端（新窗口）
start "ExcelMind AI - 后端服务器" "%NODE_EXE%" backend\index.js

REM 等待后端启动
echo [等待] 后端服务器启动中（5秒）...
timeout /t 5 /nobreak >nul

REM 检查后端是否启动成功
powershell -Command "try { Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 2 | Out-Null; exit 0 } catch { exit 1 }" >nul 2>nul
if errorlevel 1 (
    echo [警告] 后端服务器可能未成功启动
    echo 请检查后端窗口的错误信息
    echo.
)

echo [2/2] 启动前端应用...
echo.

REM 检查 Electron 是否已安装
if exist "node_modules\electron\dist\electron.exe" (
    echo [启动] 使用已安装的 Electron...
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    echo [提示] 首次运行需要安装 Electron（约 100MB）...
    echo [安装] 正在安装 Electron，请稍候...
    "%NODE_EXE%" -e "require('child_process').execSync('npm install electron', {stdio:'inherit'})"
    
    if exist "node_modules\electron\dist\electron.exe" (
        echo [启动] Electron 安装完成，正在启动...
        start "" "node_modules\electron\dist\electron.exe" .
    ) else (
        echo [错误] Electron 安装失败！
        echo 请手动运行: npm install electron
        pause
        exit /b 1
    )
)

echo.
echo ========================================
echo    ExcelMind AI 已启动
echo ========================================
echo.
echo 提示：
echo - 后端服务器运行在独立窗口中
echo - 关闭后端窗口将停止后端服务
echo - 可以使用 stop.bat 停止所有服务
echo.
