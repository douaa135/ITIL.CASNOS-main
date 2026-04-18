'use strict';

const bcrypt      = require('bcryptjs');
const jwtUtils    = require('../utils/jwt.utils');
const userService = require('./user.service');
const prisma      = require('./prisma.service');


// ─── LOGIN ────────────────────────────────────────────────────────────────
async function login(email, password, ipAddress, userAgent) {
  const user = await userService.findByLogin(email);
  if (!user) throw new Error('Identifiants invalides');
  if (!user.actif) throw new Error('Compte désactivé');

  const passwordOk = await bcrypt.compare(password, user.mot_passe);
  if (!passwordOk) throw new Error('Identifiants invalides');

  // Extraire accessJti ici
  const { token: accessToken, jti: accessJti } = jwtUtils.generateAccessToken({
    id_user:     user.id_user,
    email:       user.email_user,
    roles:       user.roles,
    permissions: user.permissions,
  });

  const { token: refreshToken } = jwtUtils.generateRefreshToken(user.id_user);

  // jti = accessJti (identifie la session exacte au logout)
  await prisma.session.create({
    data: {
      userId:       user.id_user,
      jti:          accessJti,
      refreshToken: refreshToken,
      ip:           ipAddress,
      userAgent:    userAgent,
      active:       true,
      expiresAt:    new Date(Date.now() + 8 * 60 * 60 * 1000),
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 8 * 60 * 60,
    user: userService.sanitize(user),
  };
}


// ─── REFRESH TOKEN ─────────────────────────────────────────────────────────
async function refreshAccessToken(rawRefreshToken) {
  const { valid, decoded, error } = jwtUtils.verifyRefreshToken(rawRefreshToken);
  if (!valid) throw new Error(error || 'Refresh token invalide');

  const { sub: userId } = decoded;

  // Cherche par userId + refreshToken (pas par jti)
  const session = await prisma.session.findFirst({
    where: { userId, refreshToken: rawRefreshToken, active: true },
  });
  if (!session) throw new Error('Session invalide ou expirée');

  const user = await userService.findById(userId);
  if (!user || !user.actif) throw new Error('Compte désactivé');

  const { token: newAccessToken } = jwtUtils.generateAccessToken({
    id_user:     user.id_user,
    email:       user.email_user,
    roles:       user.roles,
    permissions: user.permissions,
  });

  return { accessToken: newAccessToken, expiresIn: 900 };
}


// ─── LOGOUT ───────────────────────────────────────────────────────────────
async function logout(rawRefreshToken, userId, accessJti) {
  try {
    // Ferme la session exacte via le JTI de l'access token (unique par login)
    await prisma.session.updateMany({
      where: { jti: accessJti, userId },
      data:  { active: false, logoutAt: new Date() },
    });

    // Blacklist le JTI du refresh token si dispo
    if (rawRefreshToken) {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(rawRefreshToken);
      if (decoded?.jti) {
        await prisma.revokedToken.upsert({
          where:  { jti: decoded.jti },
          update: {},
          create: { jti: decoded.jti },
        });
      }
    }
  } catch (err) {
    console.error('Erreur logout:', err);
  }
}

async function isTokenRevoked(jti) {
  const revoked = await prisma.revokedToken.findUnique({
    where: { jti },
  });
  return revoked !== null;
}

module.exports = { 
  login, 
  refreshAccessToken, 
  logout,
  isTokenRevoked
};