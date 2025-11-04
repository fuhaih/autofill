# 前端项目

前端代码可以放置在此目录下。

## 目录结构

```
frontend/
  ├── dist/          # 构建后的静态文件
  └── src/           # 源代码（可选）
```

前端构建后的文件应放在 `dist/` 目录下，后端会自动提供静态文件服务。

## API 调用

后端API地址：`http://localhost:9667/api`

主要接口：
- `GET /api/config` - 获取配置
- `POST /api/config` - 保存配置
- `GET /api/taskStatus` - 获取任务状态
- `POST /api/AutoWorkTime` - 手动触发填写工时


