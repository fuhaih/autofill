export const isProd = process.env.NODE_ENV === 'prod';
export const port = 9667; // 端口号
export const versionInfo = {
  web:'1.0.05'
}

export const sessionConfig={
	secret: 'jone_keystore', // 加密钥匙串
	resave: false,
	name:'jone_session_name',	
	saveUninitialized: true,//无论是否使用sessionid都默认分配一把钥匙，如果设置为false就是传数据的时候才分配钥匙
	cookie: {maxAge: 1000 * 3600 * 24, secure: false }
}