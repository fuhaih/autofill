import { Response } from "express";
import { checkParameter, responseSuccess ,responseError ,Axios} from '../public/public';
import { versionInfo } from "../public/config";

//由于还是要使用到express模块所以继续引入
const app = require('express');
const route = app.Router();   //后面定义一个接口  就直接使用 route.xxx 即可\
// const addressDomain = 'http://service.anxhit.com/'
const addressDomain = 'http://pd-reverse.api.senruisoft.com/'
//导出 一个箭头函数  所有的接口逻辑  都在这个函数内
module.exports = ()=>{
	//创建 路由 路径 的链式句柄
	// const getInfoStr=`SELECT id,user,message,test,is_vip FROM firsttable`;//获取表格信息
  route.get('/', (req: any , res: Response) => {
    // console.log('参数', req.query);
    res.send({ msg: '连接成功，当前版本'+versionInfo.web }).end();
  })
  route.get('/version', (req: any, res: Response) => {
    getVersion();
  })

  route.get('/englishSentence', (req:any) => {
    checkParameter(['date'], req.query, (body: any) => {
      if (body.type === 'youdao') {
        getYDSentence(body.date);
      } else if (body.type === 'aiciba') {
        getICBSentence(body.date);
      } else {
        getSBSentence(body.date);
      }
		})
  })

	route.post('/translate', (req:any,res:Response) => {
		checkParameter(['text'],req.body, (body:any) => {
			getTranslate(body.text);
		})
  })

  
  route.get('/SyncWorkInfo', async (req: any, res: Response) => {
    let cookie = req.session.anxhit_token;
    if (!cookie) {
      cookie = await toAnxhitLogin(req);
    }
    getUserProject(cookie);
  })

  route.post('/AutoWorkTime', async (req: any, res: Response) => {
    let cookie = req.session.anxhit_token;
    if (!cookie) {
      cookie = await toAnxhitLogin(req);
    }
    checkParameter(['workList', 'workConfig', 'username', 'password'],
      req.body, async (body: any) => {
			await toFinishWork(body,cookie);
		})
  })

	return route;
}

// 获取系统版本
function getVersion() {
  responseSuccess({
    webVersion:versionInfo.web,
  })
}

// 直接提交审批的
async function toFinishWork(body,cookie) { 
  const workList = body.workList;
  const descList = body.descList; // 描述列表
  const oneceConfig = body.workConfig;
  const finishList = [];
  let needBreak = false;
  for (let i = 0; i < workList.length; i++) {
    if (descList && descList.length > 1) { // 有一个以上描述
      const randomDesc = descList[parseInt((Math.random() * descList.length).toString())]; // 随机一个描述
      if (randomDesc) {
        oneceConfig['new_notes-2'] = randomDesc;
      }
    }
    
    await Axios.get(addressDomain + 'Helpers/pms/ApprovingTs',{
      access_token:cookie,
      ts_date: workList[i],
      ...oneceConfig
    }, { cookie }).then(res => {
      // console.log('请求结果', res.msg);
      if (res.msg === 'success'){ //&& res.code === 0) {
        finishList.push(true);
      } else {
        needBreak = true;
        responseError(res.msg ? res.msg : '填写失败');
      }
    }).catch(err => {
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
    })
  }
}

// 这个只保存，不提交审核
async function toSaveWork(body,cookie) { 
  const workList = body.workList;
  const finishList = [];
  let needBreak = false;
  for (let i = 0; i < workList.length; i++) { 
    await Axios.get(addressDomain + 'Helpers/pms/SaveTs',{
      access_token:cookie,
      ts_date: workList[i],
      ...body.workConfig
    }, { cookie }).then(res => {
      // console.log('请求结果', res.msg);
      if (res.msg === 'success'){ //&& res.code === 0) {
        finishList.push(true);
      } else {
        needBreak = true;
        responseError(res.msg ? res.msg : '填写失败');
      }
    }).catch(err => {
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
    })
  }
}

function getUserProject(cookie) {
  Axios.get(addressDomain + 'Helpers/pms/ts_data', {
    access_token: cookie,
  }, { cookie }).then((res: any) => {
    if (res.msg === 'success' && res.data) {
      responseSuccess(res.data)
    } else {
      responseError(res.msg ? res.msg : '获取项目失败');
    }
  }).catch(err => {
    responseError('获取项目失败');
  });
}


async function toAnxhitLogin(req:any) {
  let backInfo = '';
  const send = Object.keys(req.body).length ? req.body : req.query;
  await Axios.get(addressDomain + 'NoAuth/Login', send).then((res:any) => {
    if (res.code === 0) {
      backInfo = res.data.cookie;
      req.session.anxhit_token = backInfo;
      console.log('获取新cookie_', backInfo);
    } else {
      responseError('登录失败：' + res.msg);
    }
  }).catch(err => {
    responseError('登录请求错误' + err);
  });
  return backInfo;
}

function getTranslate(word:string) {
  Axios.get('http://fanyi.youdao.com/translate', {
    type: 'auto',
    doctype: 'json',
    i: word
  }).then((res:any) => {
    const objTrans = res.translateResult[0][0];
		responseSuccess({
			origin: word,
			result: objTrans.tgt
		});		
  })
  /* ZH_CN2EN 中文　»　英语
  ZH_CN2JA 中文　»　日语
  ZH_CN2KR 中文　»　韩语
  ZH_CN2FR 中文　»　法语
  ZH_CN2RU 中文　»　俄语
  ZH_CN2SP 中文　»　西语
  EN2ZH_CN 英语　»　中文
  JA2ZH_CN 日语　»　中文
  KR2ZH_CN 韩语　»　中文
  FR2ZH_CN 法语　»　中文
  RU2ZH_CN 俄语　»　中文
  SP2ZH_CN 西语　»　中文 */
}


// 扇贝每日一句
function getSBSentence(date:string) {
  Axios.get('https://apiv3.shanbay.com/weapps/dailyquote/quote', {
    date,
  }).then((res: any) => {
		responseSuccess(res);		
  }).catch(err => {
    responseError(err);
  })
}
//有道
function getYDSentence(date:string) {
  Axios.get('https://dict.youdao.com/infoline', {
    mode: 'publish',
    update: 'auto',
    apiversion: 5.0,
    date,
  }).then((res: any) => {
		responseSuccess(res);		
  }).catch(err => {
    responseError(err);
  })
}

//爱词霸
function getICBSentence(date:string) {
  Axios.get('http://sentence.iciba.com/index.php', {
    c: 'dailysentence',
    m: 'getdetail',
    title:date,
  }).then((res: any) => {
		responseSuccess(res);		
  }).catch(err => {
    responseError(err);
  })
}

