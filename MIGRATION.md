# 项目重构说明

## 项目结构变化

原项目结构：
```
express-ts/
  └── express-ts/
    ├── src/
    └── build/
```

新项目结构：
```
.
├── backend/              # 后端服务
│   ├── src/
│   │   ├── app.ts       # 应用入口
│   │   ├── config/      # 配置文件
│   │   ├── routes/      # 路由
│   │   ├── services/    # 服务层
│   │   │   ├── database.ts  # LowDB数据库服务
│   │   │   └── scheduler.ts # 定时任务服务
│   │   └── utils/       # 工具函数
│   ├── data/            # LowDB数据存储目录
│   ├── log/             # 日志目录
│   ├── package.json
│   └── tsconfig.json
└── frontend/            # 前端项目目录
```

## 主要功能变更

### 1. 配置管理
- **原方式**：通过session或请求参数传递配置
- **新方式**：使用LowDB本地存储配置
  - `GET /api/config` - 获取配置
  - `POST /api/config` - 保存配置到本地文件 `backend/data/db.json`

### 2. 定时任务
- **新增功能**：每分钟自动执行填写工时任务
- **执行逻辑**：
  - 检查今天是否已成功执行
  - 检查上次任务是否还在执行中（防止并发）
  - 验证配置完整性
  - 登录并填写工时
  - 记录执行状态到LowDB

### 3. 任务状态管理
- 使用LowDB存储任务状态：
  - `lastExecuteTime` - 上次执行时间
  - `lastSuccessTime` - 上次成功时间
  - `isRunning` - 是否正在运行
  - `lastResult` - 上次执行结果

### 4. 并发控制
- 使用双重锁机制：
  - 内存锁 `isExecuting` - 防止同一进程内并发
  - 数据库锁 `isRunning` - 持久化状态，防止重启后状态丢失

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

## 使用说明

### 安装依赖
```bash
cd backend
npm install
```

### 开发运行
```bash
npm run dev
```

### 生产构建
```bash
npm run build
npm start
```

### 配置保存
通过POST请求保存配置：
```bash
curl -X POST http://localhost:9667/api/config \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password",
    "workList": ["2024-01-01"],
    "workConfig": {
      "project_id": "xxx",
      "hours": "8"
    },
    "descList": ["描述1", "描述2"]
  }'
```

### 查看任务状态
```bash
curl http://localhost:9667/api/taskStatus
```

## 注意事项

1. **Node.js版本**：要求 Node.js >= 22.0.0
2. **数据目录**：首次运行会自动创建 `backend/data/` 目录
3. **日志目录**：日志文件存储在 `backend/log/` 目录
4. **定时任务**：服务器启动后会自动启动定时任务
5. **配置完整性**：定时任务执行前会检查配置是否完整，不完整则跳过执行






