# 部署指南

## 统一打包部署

本项目采用前后端一体化架构，后端同时提供 API 服务和前端静态文件托管。

### 1. 开发环境部署

#### 首次部署

```bash
# 1. 安装所有依赖
npm run install:all

# 2. 构建前端
npm run build:frontend

# 3. 启动开发服务器（后端会自动编译TS）
npm run dev
```

访问 `http://localhost:9667` 即可看到前端界面。

#### 开发流程

1. **修改前端代码**：
   - 编辑 `frontend/src/` 下的文件
   - 运行 `npm run build:frontend` 重新构建
   - 刷新浏览器查看效果

2. **修改后端代码**：
   - 编辑 `backend/src/` 下的文件
   - 开发服务器会自动重启（ts-node）
   - 或手动重启：`npm run dev`

### 2. 生产环境部署

#### 完整构建

```bash
# 1. 构建前后端（统一打包）
npm run build

# 这个过程会：
# - 构建前端：将 frontend/src 复制到 frontend/dist
# - 编译后端：将 backend/src 编译到 backend/build/release
```

#### 启动服务

```bash
# 方式1：直接启动
npm start

# 方式2：使用 forever 后台运行
npm run forever-start
```

#### 停止服务

```bash
npm run stop-all
```

### 3. 目录结构说明

构建后的目录结构：

```
.
├── backend/
│   ├── build/
│   │   └── release/     # 编译后的后端代码
│   │       ├── app.js
│   │       ├── config/
│   │       ├── routes/
│   │       ├── services/
│   │       └── utils/
│   ├── data/            # LowDB数据文件（运行时生成）
│   └── log/             # 日志文件（运行时生成）
├── frontend/
│   └── dist/            # 前端静态文件
│       ├── index.html
│       ├── css/
│       └── js/
└── package.json
```

### 4. 配置说明

#### 环境变量

- `NODE_ENV=dev` - 开发环境
- `NODE_ENV=prod` - 生产环境

#### 端口配置

默认端口：`9667`

修改端口：编辑 `backend/src/config/config.ts`

### 5. 数据备份

重要数据存储在 `backend/data/db.json`，建议定期备份：

```bash
# 备份数据
cp backend/data/db.json backend/data/db.json.backup

# 恢复数据
cp backend/data/db.json.backup backend/data/db.json
```

### 6. 日志查看

日志文件位于 `backend/log/` 目录，按日期分割：

```bash
# 查看最新日志
tail -f backend/log/morgan-$(date +%Y%m%d).log
```

### 7. 故障排查

#### 前端无法访问

1. 检查前端是否构建：`ls frontend/dist/index.html`
2. 检查后端是否启动：`curl http://localhost:9667/api/version`
3. 查看后端日志

#### 定时任务不执行

1. 检查配置是否完整：访问前端界面，查看配置
2. 查看任务状态：`GET /api/taskStatus`
3. 检查日志文件

#### 端口被占用

```bash
# Windows
netstat -ano | findstr :9667
taskkill /PID <PID> /F

# Linux/Mac
lsof -i :9667
kill -9 <PID>
```

### 8. 更新部署

```bash
# 1. 停止服务
npm run stop-all

# 2. 更新代码（git pull 等）

# 3. 重新安装依赖（如果有新依赖）
npm run install:all

# 4. 重新构建
npm run build

# 5. 启动服务
npm start
```

### 9. 性能优化

1. **使用进程管理器**：推荐使用 `forever` 或 `pm2`
2. **日志轮转**：已配置日志按天轮转，保留10天
3. **静态文件缓存**：生产环境建议使用 Nginx 反向代理

### 10. Nginx 反向代理配置示例

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:9667;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```


