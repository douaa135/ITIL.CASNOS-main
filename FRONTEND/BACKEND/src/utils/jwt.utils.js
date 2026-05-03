'use strict';

const jwt    = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const ACCESS_SECRET      = process.env.JWT_SECRET              || 'itil_casnos_secret_change_me';
const REFRESH_SECRET     = process.env.JWT_REFRESH_SECRET      || `${ACCESS_SECRET}_refresh`;
const ACCESS_EXPIRES_IN  = process.env.JWT_ACCESS_EXPIRES_IN   || process.env.JWT_EXPIRES_IN || '1h';
const REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN  || '7d';

const issuer   = 'casnos-itil';
const audience = 'casnos-itil-client';

/**
 * Génère un access token JWT
 * @param {Object} user  { id_user, email, roles, permissions, ... }
 * @returns {{ token: string, jti: string }}
 */
const generateAccessToken = (user) => {
  const jti = uuidv4();
  const payload = {
    jti,
    typ:         'access',
    sub:         user.id_user,
    email:       user.email,
    roles:       user.roles        || [],
    permissions: user.permissions  || [],
  };

  const token = jwt.sign(payload, ACCESS_SECRET, {
    expiresIn: ACCESS_EXPIRES_IN,
    issuer,
    audience,
  });

  return { token, jti };
};

/**
 * Génère un refresh token JWT
 * @param {string} id_user
 * @param {string} [refreshJti]  JTI existant (optionnel)
 * @returns {{ token: string, jti: string }}
 */
const generateRefreshToken = (id_user, refreshJti) => {
  const jti = refreshJti || uuidv4();
  const payload = { jti, typ: 'refresh', sub: id_user };

  const token = jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: REFRESH_EXPIRES_IN,
    issuer,
    audience,
  });

  return { token, jti };
};

/**
 * Vérifie un access token
 * @returns {{ valid: boolean, decoded: Object|null, error: string|null }}
 */
const verifyAccessToken = (token) => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, { issuer, audience });
    if (decoded.typ === 'refresh') {
      return { valid: false, decoded: null, error: 'Refresh token non autorisé ici' };
    }
    return { valid: true, decoded, error: null };
  } catch (err) {
    let message = 'Token invalide';
    if (err.name === 'TokenExpiredError')  message = 'Token expiré';
    if (err.name === 'JsonWebTokenError')  message = 'Token malformé';
    if (err.name === 'NotBeforeError')     message = 'Token pas encore actif';
    return { valid: false, decoded: null, error: message };
  }
};

/**
 * Vérifie un refresh token
 * @returns {{ valid: boolean, decoded: Object|null, error: string|null }}
 */
const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, { issuer, audience });
    if (decoded.typ !== 'refresh') {
      return { valid: false, decoded: null, error: 'Refresh token invalide' };
    }
    return { valid: true, decoded, error: null };
  } catch (err) {
    let message = 'Refresh token invalide';
    if (err.name === 'TokenExpiredError') message = 'Refresh token expiré';
    if (err.name === 'JsonWebTokenError') message = 'Refresh token malformé';
    return { valid: false, decoded: null, error: message };
  }
};

const verifyToken        = (token) => verifyAccessToken(token);
const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  return authHeader.split(' ')[1] || null;
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  verifyToken,
  extractBearerToken,
  ACCESS_EXPIRES_IN,
  REFRESH_EXPIRES_IN,
};