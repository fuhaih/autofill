const axios = require('axios');
import { Response, Request } from "express";

let oneceRequest: Request;
let oneceResult: Response;

const Axios = {} as any;
['post', 'get'].forEach(method => {
  Axios[method] = (reqUrl: string, reqData: any, head = {}) => {
    return toHttpRequest(reqUrl, reqData, method, head);
  }
});

function toHttpRequest(reqUrl: string, reqData: any, met = 'get', head = {}) {
  const axiosConfig: any = {
    url: reqUrl,
    method: met,
    json: true,
    headers: {
      "content-type": "application/json",
      ...head,
    },
    timeout: 10000,
    data: {},
    params: {}
  }
  if (/get/i.test(met)) {
    reqUrl += '?'
    Object.keys(reqData).forEach(key => {
      reqUrl += `${key}=${encodeURIComponent(reqData[key])}&`
    })
    axiosConfig.url = reqUrl.substring(0, reqUrl.length - 1);
  } else {
    axiosConfig.data = reqData;
  }
  return new Promise((resolve, reject) => {
    axios(axiosConfig).then(function (res: any) {
      if (res.status === 200) {
        resolve(res.data);
      } else {
        resolve(false);
      }
    }).catch((err: any) => {
      reject(false);
    });
  })
}

export function setOnece(req: Request, res: Response) {
  oneceRequest = req;
  oneceResult = res;
}

export function checkParameter(RequestKeyArr: Array<string>, Obj: any, cb: Function) {
  let isOk = true;
  let lostKey = '';
  for (const key of RequestKeyArr) {
    if (Obj[key] === undefined) {
      isOk = false;
      lostKey = key;
      break;
    }
  }
  if (isOk) {
    cb(Obj);
  } else {
    responseError(`缺少参数${lostKey}`);
  }
}

export function responseError(msg = 'error') {
  oneceResult.send({ msg }).end();
}

export function responseSuccess(data: Number | String | Array<any> | Object) {
  oneceResult.send({
    code: 200,
    msg: 'success',
    data
  }).end();
}

export { Axios };




