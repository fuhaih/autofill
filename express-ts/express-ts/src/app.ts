import { Request,Response,NextFunction } from "express";
import { isProd, port, sessionConfig } from "./public/config";

const fileSaver = require('fs');
const FileStreamRotator = require('file-stream-rotator'); //npm i file-stream-rotator
const morgan=require('morgan');// 日志记录器 //npm i morgan
const path = require('path'); // 路径

const express=require('express'); //express 框架模块
const session=require('express-session'); //express中是把session信息存储在内存中
const bodyParser = require('body-parser');//引入bady-parser 用于解析 json text等格式的数据
/* const cookieParser = require("cookie-parser"); // 引用cookie-parser
app.use(cookieParser());
 */
import { setOnece } from './public/public';
const app = express();

/* if (app.get('env') === 'production') {
  // app.set('trust proxy', 1) // trust first proxy
  sessionConfig.cookie.secure = true // https用到
} */
app.use(session(sessionConfig))

// 每天定时生成日志，放到use前
var logDirectory = path.join(__dirname, 'log')
fileSaver.existsSync(logDirectory) || fileSaver.mkdirSync(logDirectory)


const accessLogStream = FileStreamRotator.getStream({
  date_format: 'YYYYMMDD',
  filename: path.join(logDirectory, 'morgan-%DATE%.log'),
  frequency: 'daily',
  verbose: false,
  max_logs: 10 // 最大保留n个文件，10d保留10天
})

// app.use(morgan('combined', { stream: accessLogStream }))
app.use(morgan(
	function (tokens, req, res) {
		return [
			tokens['remote-addr'](req, res).replace("::ffff",""),
			tokens.method(req, res),
			tokens.url(req, res),
			tokens.status(req, res),
			'body:',
			JSON.stringify(req.body)
		].join(' ')+'\r\n'
	},
	{
		stream: accessLogStream,
		skip: function (req, res) {
			return req.method === 'OPTIONS'
		}
	})
);

//* 匹配所有请求做处理，最先执行的中间件，server.use()的中间件都先经过all
app.all('*', (req: Request, res: Response, next: NextFunction) => {
	let origin = req.headers.origin;
	// console.log('访问源站点', origin);
	//设置允许任何域访问
	res.header('Access-Control-Allow-Origin', origin ? origin:'*'); //本来是*，兼容前端withCredentials=true改的取访问源的站点
	//设置  允许任何 数据类型
	res.header('Access-Control-Allow-Headers', 'Content-Type, Content-Length, Authorization, Accept, X-Requested-With');
	//设置 允许 使用的HTTP方法
	res.header('Access-Control-Allow-Methods', 'PUT, POST, GET, DELETE, OPTIONS');
	// 兼容前端withCredentials=true的设置
	res.header('Access-Control-Allow-Credentials', 'true');
	
	//过滤预请求
	if (req.method === 'OPTIONS') {
		res.sendStatus(200);  //如果是预请求 就不再进行后面的中间件匹配执行了   直接发送回数据
	} else {
		setOnece(req,res); // 将本次请求和响应记录到全局，让全局都可以随时获取或进行响应请求
		next();//  进入下一个中间件  
	}
});


// 使用 express 对象设置传输数据键值对的格式 use方法就是引入使用一个只中间件 
//解析 json数据   解析头文件为   application/json 
app.use(bodyParser.json());

//  解析头文件为  application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
/* 解析请求体中的信息 并将返回的数据存入request 的 body中，只支持utf-8的编码的字符,也支持自动的解析gzip和 zlib
设置为false 则数据的值 为string array类型，设置为true 则为任何类型 */


// console.log('node进程环境', process.env.NODE_ENV );
//监听的端口号
app.listen(port,()=>{
	console.log(`${isProd?'':'非'}正式环境，正在监听${port}`);
})
//匹配到 /  就会执行：     所以我所有前端的请求接口前面都会加/     -----eg:    /getInfo      /deleteInfo
app.use('/',require(`./routes/index.${isProd?'js':'ts'}`)());



/* stream: fileSaver.createWriteStream(path.join(__dirname, 'log/daily.log'), {
	flags: 'a+'
}) */