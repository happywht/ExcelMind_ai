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

REM 创建日志目录
if not exist "logs" mkdir logs
echo [%date% %time%] 启动 ExcelMind AI >> logs\startup.log

REM 检查后端文件
if not exist "backend\index.js" (
    echo [错误] 未找到后端文件！
    echo 请确保 backend\index.js 存在
    pause
    exit /b 1
)

REM 检查端口是否被占用
netstat -ano | findstr ":3001" >nul 2>nul
if not errorlevel 1 (
    echo [警告] 端口 3001 已被占用！
    echo.
    echo 可能的原因：
    echo 1. ExcelMind AI 已经在运行
    echo 2. 其他程序占用了该端口
    echo.
    echo 解决方法：
    echo 1. 运行 stop.bat 停止现有服务
    echo 2. 关闭占用 3001 端口的程序
    echo.
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

REM 检查 Node.js 版本
for /f "tokens=*" %%i in ('"%NODE_EXE%" -v') do set NODE_VERSION=%%i
echo [检测] Node.js 版本: %NODE_VERSION%

REM 提取主版本号（去掉 v 前缀）
set VERSION_NUM=%NODE_VERSION:~1%
for /f "tokens=1 delims=." %%a in ("%VERSION_NUM%") do set MAJOR_VERSION=%%a

REM 检查主版本号是否 >= 16
if %MAJOR_VERSION% LSS 16 (
    echo [警告] Node.js 版本过低，建议使用 v16 或更高版本
    echo 当前版本: %NODE_VERSION%
    echo.
)

echo [1/2] 启动后端服务器...
echo.

REM 启动后端（新窗口，重定向日志）
start "ExcelMind AI - 后端服务器" "%NODE_EXE%" backend\index.js

REM 等待后端启动（重试机制）
echo [等待] 后端服务器启动中...
set RETRY=0

:HEALTH_CHECK
set /a RETRY+=1
timeout /t 2 /nobreak >nul

REM 健康检查
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:3001/health' -UseBasicParsing -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>nul

if %ERRORLEVEL% EQU 0 (
    echo [成功] 后端服务器已就绪 ✓
    echo.
    goto BACKEND_READY
)

REM 健康检查失败
if %RETRY% LSS 5 (
    echo [重试] 后端启动中... (%RETRY%/5^)
    goto HEALTH_CHECK
)

REM 超过重试次数
echo [错误] 后端启动失败！
echo.
echo 请检查：
echo 1. 后端窗口的错误信息
echo 2. logs\startup.log 日志文件
echo 3. .env 配置是否正确
echo.
pause
exit /b 1

:BACKEND_READY

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
echo    ExcelMind AI 已启动 ✓
echo ========================================
echo.
echo 提示：
echo - 后端服务器运行在独立窗口中
echo - 关闭后端窗口将停止后端服务
echo - 可以使用 stop.bat 停止所有服务
echo - 日志文件: logs\startup.log
echo.
