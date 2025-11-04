const axios = require('axios');
import { Response,Request } from "express";

let oneceRequest:Request;
let oneceResult:Response;

const Axios = {} as any;
['post', 'get'].forEach(method => { 
  Axios[method] = (reqUrl: string, reqData: any, head = {}) => {
    return toHttpRequest(reqUrl, reqData, method, head);
  }
})


function toHttpRequest(reqUrl, reqData, met = 'get', head = {}) {
  const axiosConfig = {
    url: reqUrl,
    method: met,
    json: true,
    // withCredentials: true,
    headers: {
      "content-type": "application/json",
      ...head,
    },
    timeout:10000,
    data: {},
    params: {}
  }
  if (/get/i.test(met)) {
    reqUrl += '?' // 拼接参数
    Object.keys(reqData).forEach(key => {
      reqUrl += `${key}=${encodeURIComponent(reqData[key])}&`
    })
    axiosConfig.url = reqUrl.substring(0, reqUrl.length - 1) // 删除最后一个&字符
    // axiosConfig.params = reqData; // 这里可能存在坑，空格变加号类似的，目前没必要处理
  } else {
    axiosConfig.data = reqData;
  }
  // console.log('请求信息', axiosConfig);
  return new Promise((resolve, reject) => {
    axios(axiosConfig).then(function (res:any) {
      // console.log('http结果', res);
      if (res.status === 200) {
        resolve(res.data);
        // 这个res.data就是网页里看到的Preview中所有
      } else {
        // reject(false);
        resolve(false);
      }
    }).catch((err:any) => {
      reject(false);
    });
  })
}


function setOnece(req:Request,res:Response) { 
  oneceRequest = req;
  oneceResult = res;
}
// 检测参数齐了吗
function checkParameter(RequestKeyArr:Array<string>, Obj:any, cb:Function) {
  let isOk = true;
  let lostKey = '';
  for (const key of RequestKeyArr) {
    if (Obj[key] === undefined) {
      isOk = false;
      lostKey =key;
      break;
    }
  }
  if (isOk) {
    cb(Obj);
  } else {
    responseError(`缺少参数${lostKey}`);
  }
}

function responseError(msg ='error') { 
  oneceResult.send({ msg }).end();
  // oneceResult.status(500).send('访问错误').end();
}

function responseSuccess(data:Number|String|Array<any>|Object) { 
  oneceResult.send({
    code: 200,
    msg: 'success',
    data
  }).end();
}

// module.exports= { 
export { 
  Axios,
  // toHttpRequest,
  checkParameter,
  setOnece,
  responseError,
  responseSuccess,
}


/* 
//引入数据库模块   这里我使用的是mysql       使用什么引入什么
const  mysql=require('mysql');

//创建连接池   请求过一次之后，会有缓存之后请求就不用重新连接数据库了  从而减少了连接数据库的次数  提高效率
const db=mysql.createPool({
  host:'localhost',//数据库的地址         我这里是在我本地  所以写的是 localhost
  user:'sa',   //数据库登陆名
  password:'123456', //数据库登陆密码      这里我设置的都是 root  
  database:'test'     //连接的库名       这里我使用的是 test 数据库
}) */

/*
  ...  接口
  定义一个get请求接口      接口名为：/getInfo
  eg:  route.get('/getInfo',(req,res)=>{
           getInfo(getInfoStr,res); //调用方法  并且将res传入  用于发送数据
    })
    function getInfo(getInfoStr,res){
      //使用连接池对象调用  query进行数据库操作    第一个参数为 sql操作语句
      db.query(getInfoStr,(err,data)=>{
        if(err){//出错了
          res.status(500).send('database err').end();//将响应状态值设置为500 并且返回  database err 字符串   end()方法是为了防止客户端没有接收到数据而一直处于等待状态
        }else{//没出错
            res.send(data)
        }
      })
    }

    设置一个post接口
  	
      route.post('/addInfo',(req,res)=>{
     // 获取post 请求客户端传的数据      get请求 是使用  req.query.xxx访问   传的数据都存储在req.query里面了
     let obj={};
     for(let  attr  in req.body){   // req.body === {'前端传过来的数据对象': ''}      所以 取到前端传过来的对象需要取  req.body 的键名  并且还要将其转化为 普通对象  （因为他是字符串对象）        
       obj=JSON.parse(attr);
     }
     console.log(req.body);
     console.log(obj);
     let {user,message,is_vip,test}=obj;
     message=JSON.stringify(message);
     test=JSON.stringify(test);
     //添加数据的 数据库 命令
     let addInfoStr=`INSERT INTO firsttable(user,message,is_vip,test) VALUES('${user}','${message}','${is_vip}','${test}')`;
     addInfo(addInfoStr,res);
    })
    function addInfo(addInfoStr,res){
      db.query(addInfoStr,(err,data)=>{
        if(err){
          console.log(err);
          res.status(202).send({'msg':err.sqlMessage,'status':500}).end();//调用end方法防止 客户端一直等待响应数据   
        }else{
          res.send({"msg":"添加成功!","status":200,"data":data}).end();
        }	
      })
      
    }
  */