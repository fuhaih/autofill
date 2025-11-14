@echo off
REM 自动填写工时系统 - Windows服务启动脚本（静默模式）
REM 专门用于Windows服务，无交互提示

REM 设置项目根目录
set PROJECT_DIR=%~dp0

REM 切换到项目目录
cd /d "%PROJECT_DIR%"

REM 执行npm start命令
npm start

REM 如果出错，记录错误代码
if %ERRORLEVEL% NEQ 0 (
    echo 服务启动失败，错误代码: %ERRORLEVEL% >> "%PROJECT_DIR%service-error.log"
    exit /b %ERRORLEVEL%
)

