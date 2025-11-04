import { Response } from "express";
import { checkParameter, responseSuccess, responseError, Axios } from '../utils/public';
import { versionInfo } from "../config/config";
import { getConfig, saveConfig, getTaskStatus } from '../services/database';

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

  // 自动填写工时（手动触发）
  route.post('/AutoWorkTime', async (req: any, res: Response) => {
    let cookie = req.session.anxhit_token;
    if (!cookie) {
      cookie = await toAnxhitLogin(req);
    }
    checkParameter(['workList', 'workConfig', 'username', 'password'],
      req.body, async (body: any) => {
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

// 提交审批（填写工时）
async function toFinishWork(body: any, cookie: string) {
  const workList = body.workList;
  const descList = body.descList;
  const oneceConfig = body.workConfig;
  const finishList: boolean[] = [];
  let needBreak = false;

  for (let i = 0; i < workList.length; i++) {
    if (descList && descList.length > 1) {
      const randomDesc = descList[parseInt((Math.random() * descList.length).toString())];
      if (randomDesc) {
        oneceConfig['new_notes-2'] = randomDesc;
      }
    }

    await Axios.get(addressDomain + 'Helpers/pms/ApprovingTs', {
      access_token: cookie,
      ts_date: workList[i],
      ...oneceConfig
    }, { cookie }).then((res: any) => {
      if (res.msg === 'success') {
        finishList.push(true);
      } else {
        needBreak = true;
        responseError(res.msg ? res.msg : '填写失败');
      }
    }).catch((err: any) => {
      needBreak = true;
      responseError(err ? err : '填写失败');
    });

    if (needBreak) {
      break;
    }
  }

  if (!needBreak) {
    responseSuccess({
      finishList,
    });
  }
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

// 登录
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

