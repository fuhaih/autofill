import { Response } from "express";
import { checkParameter, responseSuccess, responseError, Axios } from '../utils/public';
import { versionInfo } from "../config/config";
import { getConfig, saveConfig, getTaskStatus } from '../services/database';
import { filterHolidays } from '../utils/holiday';

const app = require('express');
const route = app.Router();
const addressDomain = 'http://pd-reverse.api.senruisoft.com/';

module.exports = () => {
  // 根路径
  route.get('/', (req: any, res: Response) => {
    res.send({ msg: '连接成功，当前版本' + versionInfo.web }).end();
  });

  // 获取版本
  route.get('/version', (req: any, res: Response) => {
    responseSuccess({
      webVersion: versionInfo.web,
    });
  });

  // 获取配置
  route.get('/config', (req: any, res: Response) => {
    const config = getConfig();
    responseSuccess(config);
  });

  // 保存配置
  route.post('/config', (req: any, res: Response) => {
    try {
      const config = req.body;
      const savedConfig = saveConfig(config);
      console.log('[配置保存] 配置已保存:', config);
      responseSuccess(savedConfig);
    } catch (error: any) {
      console.error('[配置保存] 保存失败:', error);
      responseError('保存配置失败: ' + error.message);
    }
  });

  // 获取任务状态
  route.get('/taskStatus', (req: any, res: Response) => {
    const status = getTaskStatus();
    responseSuccess(status);
  });

  // 英语句子
  route.get('/englishSentence', (req: any) => {
    checkParameter(['date'], req.query, (body: any) => {
      if (body.type === 'youdao') {
        getYDSentence(body.date);
      } else if (body.type === 'aiciba') {
        getICBSentence(body.date);
      } else {
        getSBSentence(body.date);
      }
    });
  });

  // 翻译
  route.post('/translate', (req: any, res: Response) => {
    checkParameter(['text'], req.body, (body: any) => {
      getTranslate(body.text);
    });
  });

  // 同步工作信息
  route.get('/SyncWorkInfo', async (req: any, res: Response) => {
    let cookie = req.session.anxhit_token;
    if (!cookie) {
      cookie = await toAnxhitLogin(req);
    }
    getUserProject(cookie);
  });

  // 拉取项目列表（通过账户密码）
  route.post('/fetchProjects', async (req: any, res: Response) => {
    checkParameter(['username', 'password'], req.body, async (body: any) => {
      try {
        // 先登录获取cookie
        const cookie = await toAnxhitLoginWithCredentials(body.username, body.password);
        if (!cookie) {
          responseError('登录失败，无法获取认证信息');
          return;
        }
        // 获取项目列表
        getUserProject(cookie);
      } catch (error: any) {
        responseError('拉取项目失败: ' + (error.message || error));
      }
    });
  });

  // 自动填写工时（手动触发）
  route.post('/AutoWorkTime', async (req: any, res: Response) => {
    checkParameter(['workConfig', 'username', 'password'],
      req.body, async (body: any) => {
        // 先登录获取cookie（因为需要cookie来获取历史填报信息）
        const cookie = await toAnxhitLoginWithCredentials(body.username, body.password);
        if (!cookie) {
          responseError('登录失败，无法获取认证信息');
          return;
        }
        await toFinishWork(body, cookie);
      });
  });

  return route;
}

// 获取系统版本
function getVersion() {
  responseSuccess({
    webVersion: versionInfo.web,
  });
}

// 获取历史填报信息
async function getFilledDates(cookie: string, projectId: string, taskId: string): Promise<Set<string>> {
  const filledDates = new Set<string>();
  
  try {
    const res: any = await Axios.get(addressDomain + 'Helpers/pms/ts_data', {
      access_token: cookie
    }, { cookie });
    
    if (res && res.code === 0 && res.data) {
      const tss = res.data.tss;
      const tssHour = res.data.tss_hour; // tss_hour 数组，包含可填报的日期信息
      
      // 构建 tss_hour 中日期的 Set，只有在这个 Set 中的日期才能填报
      const availableDates = new Set<string>();
      if (Array.isArray(tssHour)) {
        for (const item of tssHour) {
          if (item.ts_date) {
            availableDates.add(item.ts_date);
          }
        }
      }
      
      console.log(`[获取历史填报] tss_hour 中共有 ${availableDates.size} 个可填报日期`);
      
      if (tss) {
        // tss是一个对象，键是日期字符串，值是该日期的填报记录数组
        for (const dateStr in tss) {
          // 只有当日期在 tss_hour 中存在时，才检查是否已填报
          if (!availableDates.has(dateStr)) {
            continue;
          }
          
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

// 获取未填报的日期列表
async function getUnfilledDates(cookie: string, projectId: string, taskId: string): Promise<string[]> {
  // 生成40天日期列表
  const allDates = generateWorkDateList();
  
  try {
    // 获取 tss_hour 数据，筛选出可填报的日期
    const res: any = await Axios.get(addressDomain + 'Helpers/pms/ts_data', {
      access_token: cookie
    }, { cookie });
    
    // 构建 tss_hour 中日期的 Set，只有在这个 Set 中的日期才能填报
    const availableDates = new Set<string>();
    if (res && res.code === 0 && res.data && Array.isArray(res.data.tss_hour)) {
      for (const item of res.data.tss_hour) {
        if (item.ts_date) {
          availableDates.add(item.ts_date);
        }
      }
    }
    
    // 筛选出40天范围内且在 tss_hour 中的日期
    const availableDatesInRange = allDates.filter(date => availableDates.has(date));
    
    console.log(`[未填报日期] 40天范围内共有 ${allDates.length} 天，tss_hour 中有 ${availableDates.size} 个可填报日期，其中在40天范围内的有 ${availableDatesInRange.length} 天`);
    
    // 获取已填报的日期
    const filledDates = await getFilledDates(cookie, projectId, taskId);
    
    // 筛选出未填报的日期（在40天范围内且在 tss_hour 中，且未填报）
    const unfilledDates = availableDatesInRange.filter(date => !filledDates.has(date));
    
    console.log(`[未填报日期] 已填报 ${filledDates.size} 天，未填报 ${unfilledDates.length} 天`);
    
    return unfilledDates;
  } catch (error) {
    console.error('[未填报日期] 获取数据失败，使用所有40天日期:', error);
    // 如果获取失败，返回所有40天日期（降级处理）
    return allDates;
  }
}

// 提交审批（填写工时）
async function toFinishWork(body: any, cookie: string) {
  let workList = body.workList;
  const oneceConfig = body.workConfig;
  const projectId = oneceConfig?.project_id;
  const taskId = oneceConfig?.task_id;
  
  // 如果没有提供workList，则获取未填报的日期列表
  if (!workList || workList.length === 0) {
    if (projectId && taskId) {
      // 获取未填报的日期
      workList = await getUnfilledDates(cookie, projectId, taskId);
      console.log(`[手动填写] 获取到 ${workList.length} 个未填报的日期`);
    } else {
      // 如果没有项目ID和任务ID，则生成40天日期列表
      workList = generateWorkDateList();
      console.log(`[手动填写] 未提供项目ID和任务ID，使用所有40天日期`);
    }
  }
  
  if (workList.length === 0) {
    responseSuccess({
      finishList: [],
      successCount: 0,
      failCount: 0,
      totalCount: 0,
      successDates: [],
      failDates: [],
      message: '没有需要填写的日期，所有日期都已填报'
    });
    return;
  }
  
  const descList = body.descList;
  const finishList: boolean[] = [];
  const successDates: string[] = [];
  const failDates: string[] = [];
  let needBreak = false;

  // 获取选中的项目和任务对象（从请求body或配置中）
  const selectedProject = body.selectedProject || oneceConfig.selectedProject;
  const selectedTask = body.selectedTask || oneceConfig.selectedTask;
  
  // new_project-3 使用 project_id，new_task-3 使用 task 对象的 id 字段
  const taskIdForApi = selectedTask?.id; // task 对象的 id 字段（用于 new_task-3）
  const hours = oneceConfig.hours || '8';
  
  // 确保必要字段存在
  if (!projectId || !taskIdForApi || !hours) {
    console.error(`[填写工时] 配置缺少必要字段:`, {
      project_id: projectId,
      task_id_for_api: taskIdForApi,
      task_object: selectedTask,
      hours: hours
    });
    responseError('配置缺少必要字段：项目ID、任务ID和工时');
    return;
  }

  for (let i = 0; i < workList.length; i++) {
    // 确定描述信息
    let description = '';
    if (descList && descList.length > 1) {
      // 如果有多条描述，随机选择一条
      const randomDesc = descList[parseInt((Math.random() * descList.length).toString())];
      if (randomDesc) {
        description = randomDesc;
      }
    } else if (descList && descList.length === 1) {
      description = descList[0];
    } else if (oneceConfig.description) {
      // 如果有单个描述，使用它
      description = oneceConfig.description;
    }
    
    // 构建API请求参数 - 参照示例URL的格式
    // new_project-3 使用 project_id，new_task-3 使用 task 对象的 id 字段
    const apiParams: any = {
      access_token: cookie,
      ts_date: workList[i],
      'new_project-3': projectId, // 使用 project_id
      'new_task-3': taskIdForApi, // 使用 task 对象的 id 字段
      'new_ts_hour-3': hours,
      'new_notes-3': description
    };
    
    console.log(`[填写工时] 填写日期 ${workList[i]}，参数:`, {
      ts_date: apiParams.ts_date,
      'new_project-3': apiParams['new_project-3'],
      'new_task-3': apiParams['new_task-3'],
      'new_ts_hour-3': apiParams['new_ts_hour-3'],
      'new_notes-3': apiParams['new_notes-3']
    });

    // 使用 SaveTs 接口（参照示例URL）
    await Axios.get(addressDomain + 'Helpers/pms/SaveTs', apiParams, { cookie }).then((res: any) => {
      if (res.msg === 'success') {
        finishList.push(true);
        successDates.push(workList[i]);
      } else {
        // 如果失败，可能是该日期已经填写过了，记录但不中断
        failDates.push(workList[i]);
        console.log(`填写 ${workList[i]} 失败: ${res.msg || '未知错误'}`);
        // 不再中断，继续填写其他日期
        // needBreak = true;
        // responseError(res.msg ? res.msg : '填写失败');
      }
    }).catch((err: any) => {
      failDates.push(workList[i]);
      console.log(`填写 ${workList[i]} 异常: ${err ? String(err) : '未知错误'}`);
      // 不再中断，继续填写其他日期
      // needBreak = true;
      // responseError(err ? err : '填写失败');
    });

    // 移除中断逻辑，继续填写所有日期
    // if (needBreak) {
    //   break;
    // }
  }

  // 返回填写结果
  responseSuccess({
    finishList,
    successCount: successDates.length,
    failCount: failDates.length,
    totalCount: workList.length,
    successDates,
    failDates,
    message: `成功填写 ${successDates.length}/${workList.length} 天的工时`
  });
}

// 生成今天之前40天的日期列表（不包含今天，排除法定节假日）
function generateWorkDateList(): string[] {
  const dates: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 生成今天之前40天的日期（不包含今天）
  for (let i = 1; i <= 40; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    dates.push(dateStr);
  }
  
  // 排除法定节假日和周末
  const workDates = filterHolidays(dates);
  
  console.log(`[生成日期列表] 原始40天日期，排除 ${dates.length - workDates.length} 个法定节假日和周末，剩余 ${workDates.length} 个工作日`);
  
  return workDates;
}

// 获取用户项目
function getUserProject(cookie: string) {
  Axios.get(addressDomain + 'Helpers/pms/ts_data', {
    access_token: cookie,
  }, { cookie }).then((res: any) => {
    if (res.msg === 'success' && res.data) {
      responseSuccess(res.data);
    } else {
      responseError(res.msg ? res.msg : '获取项目失败');
    }
  }).catch((err: any) => {
    responseError('获取项目失败');
  });
}

// 登录（通过请求参数）
async function toAnxhitLogin(req: any): Promise<string> {
  let backInfo = '';
  const send = Object.keys(req.body).length ? req.body : req.query;
  await Axios.get(addressDomain + 'NoAuth/Login', send).then((res: any) => {
    if (res.code === 0) {
      backInfo = res.data.cookie;
      req.session.anxhit_token = backInfo;
      console.log('获取新cookie_', backInfo);
    } else {
      responseError('登录失败：' + res.msg);
    }
  }).catch((err: any) => {
    responseError('登录请求错误' + err);
  });
  return backInfo;
}

// 登录（通过账户密码）
async function toAnxhitLoginWithCredentials(username: string, password: string): Promise<string> {
  let backInfo = '';
  await Axios.get(addressDomain + 'NoAuth/Login', {
    username,
    password
  }).then((res: any) => {
    if (res.code === 0) {
      backInfo = res.data.cookie;
      console.log('获取新cookie_', backInfo);
    } else {
      throw new Error(res.msg || '登录失败');
    }
  }).catch((err: any) => {
    throw new Error(err?.message || '登录请求错误');
  });
  return backInfo;
}

// 翻译
function getTranslate(word: string) {
  Axios.get('http://fanyi.youdao.com/translate', {
    type: 'auto',
    doctype: 'json',
    i: word
  }).then((res: any) => {
    const objTrans = res.translateResult[0][0];
    responseSuccess({
      origin: word,
      result: objTrans.tgt
    });
  });
}

// 扇贝每日一句
function getSBSentence(date: string) {
  Axios.get('https://apiv3.shanbay.com/weapps/dailyquote/quote', {
    date,
  }).then((res: any) => {
    responseSuccess(res);
  }).catch((err: any) => {
    responseError(err);
  });
}

// 有道
function getYDSentence(date: string) {
  Axios.get('https://dict.youdao.com/infoline', {
    mode: 'publish',
    update: 'auto',
    apiversion: 5.0,
    date,
  }).then((res: any) => {
    responseSuccess(res);
  }).catch((err: any) => {
    responseError(err);
  });
}

// 爱词霸
function getICBSentence(date: string) {
  Axios.get('http://sentence.iciba.com/index.php', {
    c: 'dailysentence',
    m: 'getdetail',
    title: date,
  }).then((res: any) => {
    responseSuccess(res);
  }).catch((err: any) => {
    responseError(err);
  });
}


