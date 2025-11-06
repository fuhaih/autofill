import { getTaskStatus, setTaskRunning, setTaskSuccess, getConfig } from './database';
import { Axios } from '../utils/public';
import { filterHolidays } from '../utils/holiday';

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
  
  // 检查上次任务是否成功（如果上次执行成功，且距离现在不足1小时，则跳过，避免频繁执行）
  if (taskStatus.lastSuccessTime) {
    const lastSuccessDate = new Date(taskStatus.lastSuccessTime);
    const now = new Date();
    const timeDiff = now.getTime() - lastSuccessDate.getTime();
    const oneHour = 60 * 60 * 1000; // 1小时的毫秒数
    
    // 如果上次成功执行距离现在不足1小时，则跳过（避免频繁执行）
    if (timeDiff < oneHour) {
      console.log('[定时任务] 上次成功执行距离现在不足1小时，跳过本次执行');
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
    
    // 检查必要字段（需要项目ID、任务ID和工时）
    const projectId = config.workConfig?.project_id;
    const selectedTask = config.selectedTask;
    const taskIdForApi = selectedTask?.id; // task 对象的 id 字段（用于 new_task-3）
    
    if (!projectId || !taskIdForApi || !config.workConfig.hours) {
      console.log('[定时任务] 配置缺少必要字段（项目ID、任务ID、工时）');
      console.log('[定时任务] 当前配置:', {
        project_id: projectId,
        task_id_for_api: taskIdForApi,
        task_object: selectedTask,
        hours: config.workConfig.hours,
        description: config.workConfig.description
      });
      setTaskSuccess(false, '配置缺少必要字段');
      return; // finally块会重置状态
    }
    
    // 输出配置信息用于调试
    console.log('[定时任务] 配置验证通过:', {
      project_id: projectId,
      task_id_for_api: taskIdForApi,
      hours: config.workConfig.hours,
      has_description: !!config.workConfig.description
    });

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
 * 获取历史填报信息
 */
async function getFilledDates(cookie: string, projectId: string, taskId: string): Promise<Set<string>> {
  const filledDates = new Set<string>();
  
  try {
    const res: any = await Axios.get(addressDomain + 'Helpers/pms/ts_data', {
      access_token: cookie
    }, { cookie });
    
    if (res && res.code === 0 && res.data) {
      const tss = res.data.tss;

      if (tss) {
        // tss是一个对象，键是日期字符串，值是该日期的填报记录数组
        for (const dateStr in tss) {
          const records = tss[dateStr];
          if (Array.isArray(records) && records.length > 0 && records.some((record: any) => record.ts_hour && record.ts_hour > 0)) {
            // 检查是否有匹配的项目ID和任务ID的填报记录
            filledDates.add(dateStr);
          }
        }
      }
      
      console.log(`[获取历史填报] 找到 ${filledDates.size} 个已填报的日期`);
    } else {
      console.log('[获取历史填报] 未获取到历史填报数据或数据格式不正确');
    }
  } catch (error) {
    console.error('[获取历史填报] 获取历史填报信息失败:', error);
  }
  
  return filledDates;
}

/**
 * 生成今天之前40天的日期列表（不包含今天，排除法定节假日）
 */
function generateWorkDateList(): string[] {
  const dates: string[] = [];
  const today = new Date();
  
  // 生成今天之前40天的日期（不包含今天）
  for (let i = 1; i <= 40; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    dates.push(dateStr);
  }
  dates.forEach(date => console.log(`[前40日期列表] 原始日期: ${date}`));
  
  // 排除法定节假日和周末
  const workDates = filterHolidays(dates);
  
  //console.log(`[生成日期列表] 原始40天日期，排除 ${dates.length - workDates.length} 个法定节假日和周末，剩余 ${workDates.length} 个工作日`);
  
  return workDates;
}

/**
 * 获取未填报的日期列表
 */
async function getUnfilledDates(cookie: string, projectId: string, taskId: string): Promise<string[]> {
  // 生成40天日期列表
  const allDates = generateWorkDateList();
  //allDates.forEach(date => console.log(`[生成日期列表] 原始日期: ${date}`));
  try {
    // 获取 tss_hour 数据，筛选出可填报的日期
    const res: any = await Axios.get(addressDomain + 'Helpers/pms/ts_data', {
      access_token: cookie
    }, { cookie });
    

    console.log(`[未填报日期] 40天范围内共有 ${allDates.length} 天工作日`);
    
    // 获取已填报的日期
    const filledDates = await getFilledDates(cookie, projectId, taskId);
    
    // 筛选出未填报的日期（在40天范围内且在 tss_hour 中，且未填报）
    const unfilledDates = allDates.filter(date => !filledDates.has(date));
    
    console.log(`[未填报日期] 已填报 ${filledDates.size} 天，未填报 ${unfilledDates.length} 天`);
    
    return unfilledDates;
  } catch (error) {
    console.error('[未填报日期] 获取数据失败，使用所有40天日期:', error);
    // 如果获取失败，返回所有40天日期（降级处理）
    return allDates;
  }
}

/**
 * 填写工时（填写40天内未填写的日期）
 */
async function fillWorkTime(config: any, cookie: string): Promise<{ success: boolean; message: string }> {
  const workConfig = config.workConfig || {};
  
  // 获取项目ID和任务ID（用于匹配历史填报）
  const projectId = workConfig.project_id;
  const taskId = workConfig.task_id;
  
  if (!projectId || !taskId) {
    return {
      success: false,
      message: '项目ID或任务ID缺失，无法获取历史填报信息'
    };
  }
  
  // 获取未填报的日期列表（使用project_id和task_id来匹配历史填报）
  const workDateList = await getUnfilledDates(cookie, projectId, taskId);
  
  if (workDateList.length === 0) {
    console.log('[填写工时] 没有需要填写的日期，所有日期都已填报');
    return {
      success: true,
      message: '所有日期都已填报，无需填写'
    };
  }
  
  console.log(`[填写工时] 准备填写 ${workDateList.length} 天的工时，日期范围: ${workDateList[workDateList.length - 1]} 至 ${workDateList[0]}`);
  
  // 获取任务对象（从保存的配置中）
  const selectedTask = config.selectedTask;
  
  // new_project-3 使用 project_id，new_task-3 使用 task 对象的 id 字段
  const taskIdForApi = selectedTask?.id; // task 对象的 id 字段（用于 new_task-3）
  
  // 构建请求配置 - 参照示例URL的格式
  // new_project-3 使用 project_id，new_task-3 使用 task 对象的 id 字段
  const currentConfig: any = {
    'new_project-3': projectId, // 使用 project_id
    'new_task-3': taskIdForApi, // 使用 task 对象的 id 字段
    'new_ts_hour-3': workConfig.hours || '8',
    'new_notes-3': workConfig.description || ''
  };
  
  // 输出配置信息用于调试
  console.log(`[填写工时] 工作配置:`, {
    'new_project-3': currentConfig['new_project-3'],
    'new_task-3': currentConfig['new_task-3'],
    'new_ts_hour-3': currentConfig['new_ts_hour-3'],
    'new_notes-3': currentConfig['new_notes-3']
  });
  
  const successList: string[] = [];
  const failList: string[] = [];
  
  // 遍历日期列表，逐个填写
  for (const dateStr of workDateList) {
    try {
      // 构建API请求参数 - 参照express-ts的逻辑
      const apiParams = {
        access_token: cookie,
        ts_date: dateStr,
        ...currentConfig
      };
      
      console.log(`[填写工时] 填写日期 ${dateStr}，参数:`, {
        ts_date: apiParams.ts_date,
        'new_project-3': apiParams['new_project-3'],
        'new_task-3': apiParams['new_task-3'],
        'new_ts_hour-3': apiParams['new_ts_hour-3'],
        'new_notes-3': apiParams['new_notes-3']
      });
      
      // 使用 SaveTs 接口（参照示例URL）
      const res: any = await Axios.get(addressDomain + 'Helpers/pms/SaveTs', apiParams, { cookie });
      
      if (res && res.msg === 'success') {
        successList.push(dateStr);
        console.log(`[填写工时] 成功填写 ${dateStr} 的工时`);
      } else {
        // 如果返回失败，可能是该日期已经填写过了，记录但不中断
        failList.push(dateStr);
        console.log(`[填写工时] 填写 ${dateStr} 失败: ${res?.msg || '未知错误'}`);
      }
    } catch (err: any) {
      failList.push(dateStr);
      console.log(`[填写工时] 填写 ${dateStr} 异常: ${err ? String(err) : '未知错误'}`);
    }
  }
  
  const successCount = successList.length;
  const failCount = failList.length;
  const totalCount = workDateList.length;
  
  if (successCount > 0) {
    return {
      success: true,
      message: `成功填写 ${successCount}/${totalCount} 天的工时（${failCount} 天可能已填写或失败）`
    };
  } else {
    return {
      success: false,
      message: `所有日期都已填写或填写失败（共 ${totalCount} 天）`
    };
  }
}

