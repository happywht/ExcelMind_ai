@echo off
echo 检查端口3000-3006占用情况...
echo.

for /L %%i in (3000,1,3006) do (
    echo 检查端口 %%i:
    netstat -ano | findstr ":%%i " | findstr LISTENING
)
echo.

echo 将要关闭的进程:
echo 端口 3001 - PID 11388
echo 端口 3002 - PID 7636
echo 端口 3003 - PID 24020
echo 端口 3004 - PID 19040
echo 端口 3005 - PID 25336
echo 端口 3006 - PID 27120
echo.

echo 正在关闭进程...
taskkill /PID 11388 /F
taskkill /PID 7636 /F
taskkill /PID 24020 /F
taskkill /PID 19040 /F
taskkill /PID 25336 /F
taskkill /PID 27120 /F

echo.
echo 完成！
pause
