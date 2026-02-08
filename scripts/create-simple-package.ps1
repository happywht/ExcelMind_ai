# PowerShell script to create simple distribution package

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "  ExcelMind AI - 创建分发包"
Write-Host "========================================"
Write-Host ""

$distDir = "dist-package"

# 清理
if (Test-Path $distDir) {
    Write-Host "[清理] 删除旧的分发包..."
    Remove-Item -Path $distDir -Recurse -Force
}

# 创建目录
Write-Host "[创建] 创建分发包目录..."
New-Item -Path $distDir -ItemType Directory | Out-Null
New-Item -Path "$distDir\backend" -ItemType Directory | Out-Null

# 复制后端
Write-Host "[复制] 复制后端..."
Copy-Item -Path "dist-backend\index.js" -Destination "$distDir\backend\" -Force
Copy-Item -Path "dist-backend\index.js.map" -Destination "$distDir\backend\" -Force -ErrorAction SilentlyContinue

# 复制前端构建
Write-Host "[复制] 复制前端构建..."
Copy-Item -Path "dist" -Destination "$distDir\frontend" -Recurse -Force

# 复制 Electron 文件
Write-Host "[复制] 复制 Electron 文件..."
Copy-Item -Path "public\electron.cjs" -Destination "$distDir\" -Force
Copy-Item -Path "public\preload.js" -Destination "$distDir\" -Force
Copy-Item -Path "public\electron" -Destination "$distDir\" -Recurse -Force

# 复制必要的配置
Write-Host "[复制] 复制配置文件..."
Copy-Item -Path "package.json" -Destination "$distDir\" -Force
Copy-Item -Path ".env" -Destination "$distDir\" -Force -ErrorAction SilentlyContinue

# 创建简化的 package.json
Write-Host "[创建] 创建简化的 package.json..."
$packageJson = @{
    name = "excelmind-ai"
    version = "1.0.0"
    main = "electron.cjs"
    type = "module"
    scripts = @{
        start = "electron ."
    }
} | ConvertTo-Json -Depth 10

$packageJson | Out-File -FilePath "$distDir\package.json" -Encoding UTF8 -Force

# 创建启动脚本
Write-Host "[创建] 创建启动脚本..."

$startBat = @"
@echo off
chcp 65001 >nul
title ExcelMind AI

echo ========================================
echo    ExcelMind AI 启动程序
echo ========================================
echo.

REM 检查 Node.js
set "NODE_EXE=nodejs\node.exe"
if not exist "%NODE_EXE%" (
    where node >nul 2>nul
    if errorlevel 1 (
        echo [错误] 未找到 Node.js！
        echo.
        echo 请下载便携版 Node.js 并解压到 nodejs 文件夹
        echo 或安装 Node.js: https://nodejs.org/
        pause
        exit /b 1
    )
    set "NODE_EXE=node"
)

echo [1/2] 启动后端服务器...
start "ExcelMind AI - 后端" "%NODE_EXE%" backend\index.js

echo [等待] 后端启动中（5秒）...
timeout /t 5 /nobreak >nul

echo [2/2] 启动前端应用...

REM 检查 Electron
if exist "node_modules\electron\dist\electron.exe" (
    start "" "node_modules\electron\dist\electron.exe" .
) else (
    echo [提示] 首次运行需要安装依赖...
    "%NODE_EXE%" -e "require('child_process').execSync('npm install electron', {stdio:'inherit'})"
    start "" "node_modules\electron\dist\electron.exe" .
)

echo.
echo ✅ ExcelMind AI 已启动
echo.
"@

$startBat | Out-File -FilePath "$distDir\start.bat" -Encoding UTF8 -Force

# 创建 README
$readme = @"
ExcelMind AI 使用说明
====================

## 快速开始

1. 双击 start.bat 启动应用
2. 首次运行会自动安装 Electron（需要几分钟）
3. 后续运行会直接启动

## 系统要求

- Windows 10/11
- Node.js 18+ (便携版或系统安装)

## 便携版 Node.js

下载地址: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip
解压到应用目录的 nodejs 文件夹

## 文件说明

- backend/index.js - 后端服务器
- frontend/ - 前端页面
- electron.cjs - Electron 主进程
- start.bat - 启动脚本

## 常见问题

Q: 提示"未找到 Node.js"？
A: 下载便携版 Node.js 或安装系统版本

Q: 首次启动很慢？
A: 正在下载 Electron，请耐心等待

Q: 后端启动失败？
A: 检查端口 3001 是否被占用
"@

$readme | Out-File -FilePath "$distDir\README.txt" -Encoding UTF8 -Force

Write-Host ""
Write-Host "========================================"
Write-Host "  ✅ 分发包创建完成！"
Write-Host "========================================"
Write-Host ""
Write-Host "位置: $distDir"
Write-Host ""
Write-Host "下一步:"
Write-Host "1. (可选) 下载 Node.js 便携版到 $distDir\nodejs\"
Write-Host "2. 测试: cd $distDir && .\start.bat"
Write-Host ""
