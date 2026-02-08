# PowerShell script to assemble final distribution package

$ErrorActionPreference = "Stop"

Write-Host "========================================"
Write-Host "  ExcelMind AI - 组装分发包"
Write-Host "========================================"
Write-Host ""

# 定义路径
$distDir = "dist-final"
$backendSource = "dist-backend"
$frontendSource = "dist-electron\win-unpacked"
$scriptsSource = "scripts"

# 清理旧的分发目录
if (Test-Path $distDir) {
    Write-Host "[清理] 删除旧的分发目录..."
    Remove-Item -Path $distDir -Recurse -Force
}

# 创建分发目录结构
Write-Host "[创建] 创建分发目录结构..."
New-Item -Path $distDir -ItemType Directory | Out-Null
New-Item -Path "$distDir\backend" -ItemType Directory | Out-Null

# 复制后端
Write-Host "[复制] 复制后端文件..."
if (Test-Path "$backendSource\index.js") {
    Copy-Item -Path "$backendSource\index.js" -Destination "$distDir\backend\" -Force
    Copy-Item -Path "$backendSource\index.js.map" -Destination "$distDir\backend\" -Force -ErrorAction SilentlyContinue
} else {
    Write-Host "[错误] 后端文件未找到！请先运行 npm run build:backend" -ForegroundColor Red
    exit 1
}

# 复制前端
Write-Host "[复制] 复制前端文件..."
if (Test-Path $frontendSource) {
    Get-ChildItem -Path $frontendSource | Copy-Item -Destination $distDir -Recurse -Force
} else {
    Write-Host "[错误] 前端文件未找到！请先运行 npm run build:frontend" -ForegroundColor Red
    exit 1
}

# 复制启动脚本
Write-Host "[复制] 复制启动脚本..."
Copy-Item -Path "$scriptsSource\start.bat" -Destination $distDir -Force
Copy-Item -Path "$scriptsSource\stop.bat" -Destination $distDir -Force
Copy-Item -Path "$scriptsSource\README.txt" -Destination $distDir -Force

# 复制环境变量文件
Write-Host "[复制] 复制环境变量文件..."
if (Test-Path ".env") {
    Copy-Item -Path ".env" -Destination $distDir -Force
}

Write-Host ""
Write-Host "========================================"
Write-Host "  ✅ 分发包组装完成！"
Write-Host "========================================"
Write-Host ""
Write-Host "分发包位置: $distDir"
Write-Host ""
Write-Host "下一步："
Write-Host "1. 下载 Node.js 便携版并解压到 $distDir\nodejs\"
Write-Host "   下载地址: https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip"
Write-Host ""
Write-Host "2. 或者让用户自己安装 Node.js"
Write-Host ""
Write-Host "3. 测试: cd $distDir && .\start.bat"
Write-Host ""
