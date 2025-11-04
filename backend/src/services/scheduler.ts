import { getTaskStatus, setTaskRunning, setTaskSuccess, getConfig } from './database';
import { Axios } from '../utils/public';

const addressDomain = 'http://pd-reverse.api.senruisoft.com/';

let schedulerInterval: NodeJS.Timeout | null = null;
let isExecuting = false; // 额外的锁，防止并发

/**
 * 启动定时任务调度器
 */
export function startScheduler() {
  console.log('定时任务调度器已启动，将每分钟执行一次');
  
  // 立即执行一次
  executeTask();
  
  // 每分钟执行一次
  schedulerInterval = setInterval(() => {
    executeTask();
  }, 60 * 1000);
}

/**
 * 停止定时任务调度器
 */
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('定时任务调度器已停止');
  }
}

/**
 * 执行定时任务
 */
async function executeTask() {
  // 防止并发执行
  if (isExecuting) {
    console.log('[定时任务] 上次任务仍在执行中，跳过本次执行');
    return;
  }

  const taskStatus = getTaskStatus();
  
  // 检查上次任务是否成功
  if (taskStatus.lastSuccessTime) {
    const lastSuccessDate = new Date(taskStatus.lastSuccessTime);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const lastSuccessToday = new Date(lastSuccessDate.getFullYear(), lastSuccessDate.getMonth(), lastSuccessDate.getDate());
    
    // 如果今天已经成功执行过，则不再执行
    if (lastSuccessToday.getTime() === today.getTime()) {
      console.log('[定时任务] 今天已经成功执行过，跳过本次执行');
      return;
    }
  }

  // 检查任务是否正在运行
  if (taskStatus.isRunning) {
    console.log('[定时任务] 上次任务标记为运行中，跳过本次执行');
    return;
  }

  isExecuting = true;
  setTaskRunning(true);

  try {
    console.log('[定时任务] 开始执行填写工时任务...');
    
    const config = getConfig();
    
    // 检查配置是否完整
    if (!config.workConfig || !config.username || !config.password) {
      console.log('[定时任务] 配置不完整，跳过执行');
      setTaskSuccess(false, '配置不完整');
      return; // finally块会重置状态
    }
    
    // 检查必要字段
    if (!config.workConfig.project_id || !config.workConfig.task_id || !config.workConfig.hours || !config.workConfig.description) {
      console.log('[定时任务] 配置缺少必要字段（项目ID、任务ID、工时、描述）');
      setTaskSuccess(false, '配置缺少必要字段');
      return; // finally块会重置状态
    }

    // 获取cookie（这里需要先登录）
    let cookie = await login(config.username, config.password);
    if (!cookie) {
      console.log('[定时任务] 登录失败');
      setTaskSuccess(false, '登录失败');
      return; // finally块会重置状态
    }

    // 执行填写工时
    const result = await fillWorkTime(config, cookie);
    
    if (result.success) {
      console.log('[定时任务] 填写工时成功');
      setTaskSuccess(true, result.message);
    } else {
      console.log('[定时任务] 填写工时失败:', result.message);
      setTaskSuccess(false, result.message);
    }
  } catch (error: any) {
    console.error('[定时任务] 执行异常:', error);
    setTaskSuccess(false, error.message || '执行异常');
  } finally {
    isExecuting = false;
    setTaskRunning(false);
  }
}

/**
 * 登录获取cookie
 */
async function login(username: string, password: string): Promise<string> {
  try {
    const res: any = await Axios.get(addressDomain + 'NoAuth/Login', {
      username,
      password
    });
    
    if (res && res.code === 0 && res.data && res.data.cookie) {
      return res.data.cookie;
    }
    return '';
  } catch (error) {
    console.error('[定时任务] 登录错误:', error);
    return '';
  }
}

/**
 * 填写工时
 */
async function fillWorkTime(config: any, cookie: string): Promise<{ success: boolean; message: string }> {
  const workConfig = config.workConfig || {};
  
  // 获取今天的日期
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  
  // 构建请求配置
  const currentConfig = {
    ...workConfig,
    'new_notes-2': workConfig.description || '' // 描述信息
  };
  
  try {
    const res: any = await Axios.get(addressDomain + 'Helpers/pms/ApprovingTs', {
      access_token: cookie,
      ts_date: todayStr,
      ...currentConfig
    }, { cookie });
    
    if (res && res.msg === 'success') {
      return {
        success: true,
        message: `成功填写今天(${todayStr})的工时`
      };
    } else {
      return {
        success: false,
        message: res.msg || '填写失败'
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err ? String(err) : '填写失败'
    };
  }
}

