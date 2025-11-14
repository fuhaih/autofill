@echo off
REM 自动填写工时系统 - Windows服务启动脚本
REM 用于将应用添加到Windows服务中实现开机启动

REM 设置项目根目录（根据实际路径修改）
set PROJECT_DIR=%~dp0

REM 切换到项目目录
cd /d "%PROJECT_DIR%"

REM 检查Node.js是否安装
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到Node.js，请确保Node.js已安装并添加到PATH环境变量中
    pause
    exit /b 1
)

REM 检查npm是否安装
where npm >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到npm，请确保npm已安装并添加到PATH环境变量中
    pause
    exit /b 1
)

REM 执行npm start命令
echo 正在启动服务...
echo 项目目录: %PROJECT_DIR%
echo 执行命令: npm start
echo.

npm start

REM 如果npm start退出，保持窗口打开以便查看错误信息
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo 服务启动失败，错误代码: %ERRORLEVEL%
    pause
)

