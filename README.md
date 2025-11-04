# 自动填写工时系统

基于 Node.js 的前后端一体化项目，提供自动填写工时的功能。

## 项目结构

```
.
├── backend/          # 后端服务
│   ├── src/         # 源代码
│   │   ├── app.ts   # 应用入口
│   │   ├── config/  # 配置文件
│   │   ├── routes/  # 路由
│   │   ├── services/ # 服务层
│   │   │   ├── database.ts  # LowDB数据库服务
│   │   │   └── scheduler.ts # 定时任务服务
│   │   └── utils/   # 工具函数
│   ├── data/        # 数据存储目录（LowDB）
│   ├── log/         # 日志目录
│   ├── package.json
│   └── tsconfig.json
├── frontend/        # 前端项目
│   ├── src/        # 源代码
│   │   ├── index.html
│   │   ├── css/
│   │   └── js/
│   ├── dist/       # 构建输出目录
│   ├── package.json
│   └── build.js    # 构建脚本
└── package.json    # 根目录统一打包脚本
```

## 功能特性

1. **配置管理**：使用 LowDB 本地存储配置信息
2. **定时任务**：每分钟自动执行填写工时任务
3. **任务状态管理**：记录任务执行状态，防止重复执行
4. **并发控制**：确保同一时间只有一个任务在执行
5. **前端界面**：完整的 Web 管理界面
6. **统一打包**：前后端统一打包，一键部署

## 快速开始

### 1. 安装所有依赖

```bash
npm run install:all
```

或者分别安装：

```bash
# 安装根目录依赖（可选）
npm install

# 安装前端依赖
cd frontend
npm install

# 安装后端依赖
cd ../backend
npm install
```

### 2. 构建项目

```bash
# 统一构建前后端
npm run build

# 或分别构建
npm run build:frontend
npm run build:backend
```

### 3. 开发运行

```bash
npm run dev
```

访问 `http://localhost:9667` 查看前端界面。

### 4. 生产部署

```bash
# 构建项目
npm run build

# 启动服务
npm start

# 或使用 forever 后台运行
npm run forever-start
```

## API 接口

### 配置相关

- `GET /api/config` - 获取配置
- `POST /api/config` - 保存配置

请求体示例：
```json
{
  "username": "用户名",
  "password": "密码",
  "workList": ["2024-01-01", "2024-01-02"],
  "workConfig": {
    "project_id": "项目ID",
    "hours": "8"
  },
  "descList": ["描述1", "描述2"]
}
```

### 任务状态

- `GET /api/taskStatus` - 获取任务执行状态

### 其他接口

- `GET /api/version` - 获取版本信息
- `POST /api/AutoWorkTime` - 手动触发填写工时
- `GET /api/SyncWorkInfo` - 同步工作信息

## 前端功能

1. **配置管理**
   - 保存和加载配置
   - 支持用户名、密码、工作日期列表、项目信息等配置

2. **任务状态监控**
   - 实时查看任务执行状态
   - 查看最后执行时间和结果

3. **手动操作**
   - 手动触发填写工时
   - 同步工作信息

## 定时任务说明

- 每分钟执行一次
- 如果今天已经成功执行过，则不再执行
- 如果上次任务还在执行中，跳过本次执行
- 配置不完整时跳过执行

## 数据存储

所有数据存储在 `backend/data/db.json`：

```json
{
  "config": {
    "username": "用户名",
    "password": "密码",
    "workList": ["日期列表"],
    "workConfig": { "配置对象" },
    "descList": ["描述列表"],
    "lastUpdateTime": "更新时间"
  },
  "taskStatus": {
    "lastExecuteTime": "执行时间",
    "lastSuccessTime": "成功时间",
    "isRunning": false,
    "lastResult": {
      "success": true,
      "message": "消息",
      "executeTime": "执行时间"
    }
  }
}
```

## 注意事项

1. **Node.js版本**：要求 Node.js >= 22.0.0
2. **数据目录**：首次运行会自动创建 `backend/data/` 目录
3. **日志目录**：日志文件存储在 `backend/log/` 目录
4. **定时任务**：服务器启动后会自动启动定时任务
5. **配置完整性**：定时任务执行前会检查配置是否完整，不完整则跳过执行

## 开发说明

### 前端开发

前端代码在 `frontend/src/` 目录下，修改后需要重新构建：

```bash
cd frontend
npm run build
```

### 后端开发

后端代码在 `backend/src/` 目录下，使用 TypeScript 开发。

开发模式（自动重启）：
```bash
cd backend
npm run dev
```

### 清理构建文件

```bash
npm run clean
```

## 许可证

ISC
