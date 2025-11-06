export const isProd = process.env.NODE_ENV === 'prod';
export const port = 9667;
export const versionInfo = {
  web: '1.0.05'
}

export const sessionConfig = {
  secret: 'jone_keystore',
  resave: false,
  name: 'jone_session_name',
  saveUninitialized: true,
  cookie: { maxAge: 1000 * 3600 * 24, secure: false }
}



