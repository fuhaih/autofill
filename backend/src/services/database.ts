import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import * as path from 'path';
import * as fs from 'fs';

// 数据库文件路径
// 兼容编译后的路径
const rootDir = __dirname.includes('build') ? path.join(__dirname, '../../') : path.join(__dirname, '../');
const dbPath = path.join(rootDir, 'data');
const dbFile = path.join(dbPath, 'db.json');

// 确保目录存在
if (!fs.existsSync(dbPath)) {
  fs.mkdirSync(dbPath, { recursive: true });
}

// 默认数据结构
interface Database {
  config: {
    workConfig?: any;
    username?: string;
    password?: string;
    selectedProject?: any; // 选中的项目信息
    selectedTask?: any; // 选中的任务信息
    lastUpdateTime?: string;
  };
  taskStatus: {
    lastExecuteTime?: string;
    lastSuccessTime?: string;
    isRunning?: boolean;
    lastResult?: {
      success: boolean;
      message: string;
      executeTime: string;
    };
  };
}

const defaultData: Database = {
  config: {},
  taskStatus: {}
};

// 创建适配器
const adapter = new JSONFileSync<Database>(dbFile);
const db = new LowSync(adapter, defaultData);

// 初始化数据库
db.read();
if (!db.data) {
  db.data = defaultData;
  db.write();
}

export function getConfig() {
  db.read();
  return db.data.config;
}

export function saveConfig(config: Partial<Database['config']>) {
  db.read();
  db.data.config = {
    ...db.data.config,
    ...config,
    lastUpdateTime: new Date().toISOString()
  };
  db.write();
  return db.data.config;
}

export function getTaskStatus() {
  db.read();
  return db.data.taskStatus;
}

export function updateTaskStatus(status: Partial<Database['taskStatus']>) {
  db.read();
  db.data.taskStatus = {
    ...db.data.taskStatus,
    ...status
  };
  db.write();
  return db.data.taskStatus;
}

export function setTaskRunning(isRunning: boolean) {
  db.read();
  db.data.taskStatus.isRunning = isRunning;
  if (!isRunning) {
    db.data.taskStatus.lastExecuteTime = new Date().toISOString();
  }
  db.write();
}

export function setTaskSuccess(success: boolean, message: string = '') {
  db.read();
  db.data.taskStatus.lastExecuteTime = new Date().toISOString();
  if (success) {
    db.data.taskStatus.lastSuccessTime = new Date().toISOString();
    db.data.taskStatus.lastResult = {
      success: true,
      message,
      executeTime: new Date().toISOString()
    };
  } else {
    db.data.taskStatus.lastResult = {
      success: false,
      message,
      executeTime: new Date().toISOString()
    };
  }
  db.data.taskStatus.isRunning = false;
  db.write();
}

export { db };

