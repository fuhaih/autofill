# Windows 服务配置指南

本文档介绍如何将自动填写工时系统配置为 Windows 服务，实现开机自动启动。

## 文件说明

项目根目录包含两个启动脚本：

- **`start-service.bat`** - 带错误检查和交互提示的版本，适合测试和调试
- **`start-service-silent.bat`** - 静默版本，适合作为 Windows 服务运行

## 前置条件

1. **Node.js 已安装**：确保 Node.js（>=22.0.0）已安装并添加到 PATH 环境变量
2. **项目依赖已安装**：运行 `npm run install:all` 安装所有依赖
3. **项目已构建**：运行 `npm run build` 构建项目（生产环境）

## 方法一：使用 NSSM（推荐）

NSSM（Non-Sucking Service Manager）是一个强大的 Windows 服务管理工具，可以轻松将任何可执行文件注册为 Windows 服务。

### 步骤 1: 下载 NSSM

1. 访问 NSSM 官网：https://nssm.cc/download
2. 下载最新版本的 Windows 64位版本
3. 解压到任意目录（例如：`C:\nssm`）

### 步骤 2: 注册服务

1. **以管理员身份运行命令提示符**（右键点击"命令提示符" → "以管理员身份运行"）

2. **切换到 NSSM 目录**：
   ```bash
   cd C:\nssm\win64
   ```

3. **注册服务**：
   ```bash
   nssm install AutoFillService "D:\WorkSpace\Source\aliworkspace\autofill\start-service-silent.bat"
   ```
   > 注意：请将路径替换为你的实际项目路径

4. **配置服务参数**（会弹出 NSSM 配置窗口）：
   - **Application** 标签页：
     - **Path**: `D:\WorkSpace\Source\aliworkspace\autofill\start-service-silent.bat`
     - **Startup directory**: `D:\WorkSpace\Source\aliworkspace\autofill`
   
   - **Details** 标签页：
     - **Display name**: `AutoFill Service`（服务显示名称）
     - **Description**: `自动填写工时系统服务`（服务描述）
   
   - **Log on** 标签页：
     - 选择运行账户：
       - **Local System account**（推荐，使用系统账户）
       - 或选择 **This account** 并输入用户名和密码（使用指定用户账户）
   
   - **I/O** 标签页（可选）：
     - **Output (stdout)**: `D:\WorkSpace\Source\aliworkspace\autofill\service-output.log`
     - **Error (stderr)**: `D:\WorkSpace\Source\aliworkspace\autofill\service-error.log`
   
   点击 **Install service** 完成注册

### 步骤 3: 启动服务

```bash
# 启动服务
nssm start AutoFillService

# 停止服务
nssm stop AutoFillService

# 重启服务
nssm restart AutoFillService

# 删除服务
nssm remove AutoFillService confirm
```

### 步骤 4: 验证服务

1. 打开"服务"管理器（`Win + R` → 输入 `services.msc`）
2. 找到 "AutoFill Service"
3. 检查服务状态是否为"正在运行"
4. 访问 `http://localhost:9667` 验证服务是否正常工作

## 方法二：使用 Windows 任务计划程序

Windows 任务计划程序是系统自带的任务调度工具，也可以实现开机自动启动。

### 步骤 1: 打开任务计划程序

1. 按 `Win + R`，输入 `taskschd.msc`，回车
2. 或搜索"任务计划程序"并打开

### 步骤 2: 创建基本任务

1. 点击右侧"创建基本任务"
2. **名称**：`AutoFill Service`
3. **描述**：`自动填写工时系统开机启动`
4. 点击"下一步"

### 步骤 3: 设置触发器

1. **触发器**：选择"当计算机启动时"
2. 点击"下一步"

### 步骤 4: 设置操作

1. **操作**：选择"启动程序"
2. 点击"下一步"
3. **程序或脚本**：`D:\WorkSpace\Source\aliworkspace\autofill\start-service-silent.bat`
4. **起始于（可选）**：`D:\WorkSpace\Source\aliworkspace\autofill`
5. 点击"下一步"

### 步骤 5: 完成配置

1. 勾选"当单击完成时，打开此任务属性的对话框"
2. 点击"完成"

### 步骤 6: 高级设置（重要）

在任务属性对话框中：

1. **常规** 标签页：
   - 勾选"不管用户是否登录都要运行"
   - 勾选"使用最高权限运行"
   - 配置为：`Windows 10/Windows Server 2016`

2. **条件** 标签页：
   - 取消勾选"只有在计算机使用交流电源时才启动此任务"（如果希望笔记本电池模式下也运行）

3. **设置** 标签页：
   - 勾选"允许按需运行任务"
   - 勾选"如果请求的任务没有运行，则立即启动任务"
   - 勾选"如果任务失败，重新启动时间间隔"：设置为 `1 分钟`，最多重启 `3 次`

4. 点击"确定"保存

### 步骤 7: 测试任务

1. 右键点击创建的任务
2. 选择"运行"
3. 检查任务是否正常启动
4. 访问 `http://localhost:9667` 验证服务

## 方法三：使用 WinSW（Windows Service Wrapper）

WinSW 是另一个流行的 Windows 服务包装工具，使用 XML 配置文件。

### 步骤 1: 下载 WinSW

1. 访问：https://github.com/winsw/winsw/releases
2. 下载 `WinSW-x64.exe`
3. 重命名为 `autofill-service.exe` 并放到项目根目录

### 步骤 2: 创建配置文件

创建 `autofill-service.xml`：

```xml
<service>
  <id>AutoFillService</id>
  <name>AutoFill Service</name>
  <description>自动填写工时系统服务</description>
  <executable>cmd</executable>
  <arguments>/c "D:\WorkSpace\Source\aliworkspace\autofill\start-service-silent.bat"</arguments>
  <workingdirectory>D:\WorkSpace\Source\aliworkspace\autofill</workingdirectory>
  <logmode>rotate</logmode>
  <logpath>logs</logpath>
</service>
```

### 步骤 3: 安装服务

以管理员身份运行命令提示符：

```bash
cd D:\WorkSpace\Source\aliworkspace\autofill
autofill-service.exe install
autofill-service.exe start
```

## 服务管理命令

### 使用 NSSM

```bash
# 启动服务
nssm start AutoFillService

# 停止服务
nssm stop AutoFillService

# 重启服务
nssm restart AutoFillService

# 查看服务状态
nssm status AutoFillService

# 编辑服务配置
nssm edit AutoFillService

# 删除服务
nssm remove AutoFillService confirm
```

### 使用 Windows 服务命令

```bash
# 启动服务
net start AutoFillService

# 停止服务
net stop AutoFillService

# 查看服务状态
sc query AutoFillService
```

### 使用任务计划程序

- 右键任务 → "运行"：立即运行
- 右键任务 → "结束"：停止任务
- 右键任务 → "禁用"：禁用自动启动
- 右键任务 → "删除"：删除任务

## 故障排查

### 问题 1: 服务无法启动

**检查项：**

1. **Node.js 路径**：
   ```bash
   where node
   where npm
   ```
   确保 Node.js 已正确安装并添加到 PATH

2. **项目路径**：
   检查 bat 文件中的路径是否正确

3. **权限问题**：
   - 确保以管理员身份运行安装命令
   - 检查服务运行账户是否有足够权限

4. **查看日志**：
   - NSSM 方法：查看 `service-error.log` 和 `service-output.log`
   - 任务计划程序：查看任务历史记录

### 问题 2: 服务启动后立即停止

**可能原因：**

1. **npm start 命令执行失败**：
   - 检查项目依赖是否已安装：`npm run install:all`
   - 检查项目是否已构建：`npm run build`

2. **端口被占用**：
   ```bash
   netstat -ano | findstr :9667
   ```
   如果端口被占用，停止占用端口的进程或修改配置端口

3. **查看详细错误**：
   使用 `start-service.bat`（非静默版本）手动运行，查看错误信息

### 问题 3: 开机后服务未自动启动

**检查项：**

1. **服务启动类型**：
   - 打开"服务"管理器
   - 找到服务，右键 → "属性"
   - 确保"启动类型"设置为"自动"

2. **任务计划程序任务状态**：
   - 打开任务计划程序
   - 检查任务是否已启用
   - 查看任务历史记录

3. **系统日志**：
   - 打开"事件查看器"（`eventvwr.msc`）
   - 查看"Windows 日志" → "应用程序"
   - 查找相关错误信息

### 问题 4: 服务运行但无法访问

**检查项：**

1. **防火墙设置**：
   - 确保 Windows 防火墙允许端口 9667
   - 或添加防火墙规则允许 Node.js 程序

2. **服务是否正常运行**：
   ```bash
   netstat -ano | findstr :9667
   ```
   检查端口是否在监听

3. **查看应用日志**：
   检查 `backend/log/` 目录下的日志文件

## 日志文件位置

- **服务错误日志**：`service-error.log`（项目根目录）
- **服务输出日志**：`service-output.log`（项目根目录，如果配置了 NSSM I/O）
- **应用日志**：`backend/log/morgan-YYYYMMDD.log`
- **NSSM 日志**：`C:\nssm\service\AutoFillService\`（如果使用 NSSM）

## 更新服务

当需要更新服务配置时：

### NSSM 方法

```bash
# 停止服务
nssm stop AutoFillService

# 编辑配置
nssm edit AutoFillService

# 重启服务
nssm restart AutoFillService
```

### 任务计划程序方法

1. 打开任务计划程序
2. 找到任务，右键 → "属性"
3. 修改配置
4. 点击"确定"保存

## 卸载服务

### NSSM 方法

```bash
# 停止服务
nssm stop AutoFillService

# 删除服务
nssm remove AutoFillService confirm
```

### 任务计划程序方法

1. 打开任务计划程序
2. 找到任务，右键 → "删除"
3. 确认删除

## 注意事项

1. **路径配置**：确保 bat 文件中的路径与实际项目路径一致
2. **Node.js 版本**：确保 Node.js 版本 >= 22.0.0
3. **依赖安装**：首次部署前必须运行 `npm run install:all`
4. **项目构建**：生产环境必须运行 `npm run build`
5. **权限要求**：安装服务需要管理员权限
6. **端口占用**：确保端口 9667 未被其他程序占用
7. **日志监控**：定期检查日志文件，及时发现问题

## 推荐方案

- **开发环境**：直接使用 `npm start` 或 `npm run dev`
- **生产环境（单机）**：推荐使用 **NSSM** 方法，稳定可靠
- **生产环境（服务器）**：推荐使用 **NSSM** 或 **WinSW**，配合进程管理器（如 PM2）

## 相关文档

- [QUICKSTART.md](QUICKSTART.md) - 快速开始指南
- [DEPLOY.md](DEPLOY.md) - 部署指南
- [MIGRATION.md](MIGRATION.md) - 项目重构说明

