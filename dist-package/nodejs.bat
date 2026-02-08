@echo off
chcp 65001 >nul
title 下载便携版 Node.js

echo ========================================
echo    下载便携版 Node.js
echo ========================================
echo.

REM 检查是否已存在
if exist "nodejs\node.exe" (
    echo [提示] 便携版 Node.js 已存在
    echo.
    for /f "tokens=*" %%i in ('nodejs\node.exe -v') do set CURRENT_VERSION=%%i
    echo 当前版本: %CURRENT_VERSION%
    echo.
    choice /C YN /M "是否重新下载"
    if errorlevel 2 exit /b 0
    echo.
    echo [清理] 删除旧版本...
    rmdir /s /q nodejs 2>nul
)

REM Node.js 版本配置
set NODE_VERSION=20.11.0
set NODE_ARCH=x64
set NODE_FILENAME=node-v%NODE_VERSION%-win-%NODE_ARCH%
set DOWNLOAD_URL=https://nodejs.org/dist/v%NODE_VERSION%/%NODE_FILENAME%.zip

echo [下载] Node.js v%NODE_VERSION% (Windows %NODE_ARCH%)
echo 下载地址: %DOWNLOAD_URL%
echo 文件大小: 约 30MB
echo.
echo 正在下载，请稍候...
echo.

REM 下载 Node.js
powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $ProgressPreference = 'SilentlyContinue'; try { Invoke-WebRequest -Uri '%DOWNLOAD_URL%' -OutFile 'nodejs.zip' -UseBasicParsing; Write-Host '[成功] 下载完成' } catch { Write-Host '[错误] 下载失败:' $_.Exception.Message; exit 1 } }"

if errorlevel 1 (
    echo.
    echo [错误] 下载失败！
    echo.
    echo 可能的原因：
    echo 1. 网络连接问题
    echo 2. 下载地址失效
    echo.
    echo 解决方法：
    echo 1. 检查网络连接
    echo 2. 手动下载: %DOWNLOAD_URL%
    echo 3. 解压到当前目录并重命名为 nodejs
    echo.
    pause
    exit /b 1
)

echo.
echo [解压] 正在解压文件...
powershell -Command "Expand-Archive -Path 'nodejs.zip' -DestinationPath '.' -Force"

if not exist "%NODE_FILENAME%" (
    echo [错误] 解压失败！
    pause
    exit /b 1
)

REM 重命名文件夹
move "%NODE_FILENAME%" nodejs >nul

REM 清理下载文件
del nodejs.zip

REM 验证安装
if exist "nodejs\node.exe" (
    echo.
    echo ========================================
    echo    安装成功！
    echo ========================================
    echo.
    for /f "tokens=*" %%i in ('nodejs\node.exe -v') do set INSTALLED_VERSION=%%i
    echo Node.js 版本: %INSTALLED_VERSION%
    echo 安装位置: %CD%\nodejs
    echo.
    echo 提示：
    echo - start.bat 将自动使用此便携版
    echo - 无需安装到系统
    echo - 可随时删除 nodejs 文件夹卸载
    echo.
) else (
    echo [错误] 安装验证失败！
    pause
    exit /b 1
)

pause
