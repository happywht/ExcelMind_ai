# PowerShell script to create distribution package
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
if (Test-Path "dist-backend\index.js") {
    Copy-Item -Path "dist-backend\index.js" -Destination "$distDir\backend\" -Force
    Copy-Item -Path "dist-backend\index.js.map" -Destination "$distDir\backend\" -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[错误] 后端文件未找到！请先运行: npm run build:backend" -ForegroundColor Red
    exit 1
}

# 复制前端构建
Write-Host "[复制] 复制前端构建..."
if (Test-Path "dist") {
    Copy-Item -Path "dist" -Destination "$distDir\frontend" -Recurse -Force
} else {
    Write-Host "[错误] 前端文件未找到！请先运行: npm run build" -ForegroundColor Red
    exit 1
}

# 复制 Electron 文件
Write-Host "[复制] 复制 Electron 文件..."
Copy-Item -Path "public\electron.cjs" -Destination "$distDir\" -Force
Copy-Item -Path "public\preload.js" -Destination "$distDir\" -Force
Copy-Item -Path "public\electron" -Destination "$distDir\" -Recurse -Force

# 复制环境变量
Write-Host "[复制] 复制环境变量..."
if (Test-Path ".env") {
    Copy-Item -Path ".env" -Destination "$distDir\" -Force
}

# 创建 package.json
Write-Host "[创建] 创建 package.json..."
$pkgContent = @"
{
  "name": "excelmind-ai",
  "version": "1.0.0",
  "main": "electron.cjs",
  "type": "module",
  "scripts": {
    "start": "electron ."
  }
}
"@
$pkgContent | Out-File -FilePath "$distDir\package.json" -Encoding UTF8 -Force

# 创建启动脚本
Write-Host "[创建] 创建启动脚本..."
Copy-Item -Path "scripts\start.bat" -Destination "$distDir\" -Force
Copy-Item -Path "scripts\stop.bat" -Destination "$distDir\" -Force -ErrorAction SilentlyContinue
Copy-Item -Path "scripts\README.txt" -Destination "$distDir\" -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "========================================"
Write-Host "  ✅ 分发包创建完成！"
Write-Host "========================================"
Write-Host ""
Write-Host "位置: $distDir"
Write-Host ""
Write-Host "下一步:"
Write-Host "1. (可选) 下载 Node.js 便携版到 $distDir\nodejs\"
Write-Host "   下载: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
Write-Host "2. 首次运行: cd $distDir && npm install electron"
Write-Host "3. 测试: cd $distDir && .\start.bat"
Write-Host ""
