axios用于后端发送http请求第三方站点接口
body-parser用于处理post接口传的json数据
express后端框架主题
morgan是express官方推荐的日志记录 暂时不用
ts-node用于dev环境直接免编译成js运行ts代码
nodemon可以监听开发环境的改变自动重新编译，不太需要

创建项目
npm init 
npm i express 
npm i axios body-parser
npm i typescript @types/express @types/node -d
npm i nodemon -d  // 自选要不要装
npm i ts-node -d -g // 这个得全局安装！！

个人部署是依赖forever永久启动node程序，不需要窗口 npm i forever

编译部署的话，是将ts编译成js，然后用forever运行编译出的产物build下的js,命令：tsc forever restart xx文件地址

forever stopall
forever stop ./build/release/app.js

forever restartall
forever restart ./build/release/app.js


