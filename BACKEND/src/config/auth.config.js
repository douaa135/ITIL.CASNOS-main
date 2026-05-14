const COOKIE_NAME    = 'refresh_token';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production', // true en prod (HTTPS), false en dev
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 jours — même durée que le refresh token JWT
};

module.exports = { 
  COOKIE_NAME, 
  COOKIE_OPTIONS 
};