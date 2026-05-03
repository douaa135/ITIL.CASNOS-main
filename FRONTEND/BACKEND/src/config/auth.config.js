const COOKIE_NAME = "refresh_token";

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // mettre true seulement en HTTPS
  sameSite: "lax",
  maxAge: 8 * 60 * 60 * 1000 // 8h
};

module.exports = { 
  COOKIE_NAME, 
  COOKIE_OPTIONS 
};