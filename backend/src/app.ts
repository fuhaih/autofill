import { Request, Response, NextFunction } from "express";
import { isProd, port, sessionConfig } from "./config/config";
import { startScheduler } from "./services/scheduler";

const fileSaver = require('fs');
const FileStreamRotator = require('file-stream-rotator');
const morgan = require('morgan');
const path = require('path');
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
import { setOnece } from './utils/public';
const app = express();

app.use(session(sessionConfig));

// 日志目录（兼容编译后的路径）
const rootDir = __dirname.includes('build') ? path.join(__dirname, '../../') : path.join(__dirname, '../');
const logDirectory = path.join(rootDir, 'log');
fileSaver.existsSync(logDirectory) || fileSaver.mkdirSync(logDirectory, { recursive: true });

const accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'morgan-%DATE%.log'),
  frequency: 'daily',
  verbose: false,
  max_logs: 10
});

app.use(morgan(
  function (tokens: any, req: any, res: any) {
    return [
      tokens['remote-addr'](req, res).replace("::ffff", ""),
      tokens.method(req, res),
      tokens.url(req, res),
      tokens.status(req, res),
      'body:',
      JSON.stringify(req.body)
    ].join(' ') + '\r\n'
  },
  {
    stream: accessLogStream,
    skip: function (req: any, res: any) {
      return req.method === 'OPTIONS'
    }
  })
);

// CORS中间件
app.all('*', (req: Request, res: Response, next: NextFunction) => {
  let origin = req.headers.origin;
  res.header('Access-Control-Allow-Origin', origin ? origin : '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With');
  res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    setOnece(req, res);
    next();
  }
});

// 解析请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// API路由
app.use('/api', require(`./routes/index.${isProd ? 'js' : 'ts'}`)());

// 静态文件服务（用于前端）
const frontendDir = __dirname.includes('build') 
  ? path.join(__dirname, '../../../frontend/dist')
  : path.join(__dirname, '../../frontend/dist');

// 静态文件服务中间件
app.use(express.static(frontendDir, {
  // 如果静态文件不存在，不返回404，继续执行下一个中间件
  fallthrough: true
}));

// 前端路由支持（SPA支持）- 所有非API和非静态文件的请求都返回index.html
app.get('*', (req: Request, res: Response) => {
  // API请求已在上面处理，静态文件请求也已在上面处理
  // 这里只处理页面路由请求
  const indexPath = path.join(frontendDir, 'index.html');
  res.sendFile(indexPath, (err: any) => {
    if (err) {
      console.error('前端页面文件不存在:', indexPath);
      res.status(404).send('页面未找到');
    }
  });
});

// 启动服务器
app.listen(port, () => {
  console.log(`${isProd ? '' : '非'}正式环境，正在监听${port}`);
  // 启动定时任务
  startScheduler();
});

