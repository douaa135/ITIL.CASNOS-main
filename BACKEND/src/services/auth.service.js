'use strict';

const bcrypt      = require('bcryptjs');
const jwtUtils    = require('../utils/jwt.utils');
const userService = require('./user.service');
const prisma      = require('./prisma.service');

// ─── LOGIN ────────────────────────────────────────────────────────────────────
async function login(email, password, ipAddress, userAgent) {
  const user = await userService.findByLogin(email);
  if (!user)       throw new Error('Identifiants invalides');
  if (!user.actif) throw new Error('Compte désactivé');

  const passwordOk = await bcrypt.compare(password, user.mot_passe);
  if (!passwordOk) throw new Error('Identifiants invalides');

  const { token: accessToken, jti: accessJti } = jwtUtils.generateAccessToken({
    id_user:     user.id_user,
    email:       user.email_user,
    roles:       user.roles,
    permissions: user.permissions,
  });

  const { token: refreshToken } = jwtUtils.generateRefreshToken(user.id_user);

  // Session = 7 jours, aligné sur le refresh token JWT et le cookie
  await prisma.session.create({
    data: {
      userId:       user.id_user,
      jti:          accessJti,
      refreshToken: refreshToken,
      ip:           ipAddress,
      userAgent:    userAgent,
      active:       true,
      expiresAt:    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // ✅ 7 jours
    },
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes
    user: userService.sanitize(user),
  };
}

// ─── REFRESH TOKEN ────────────────────────────────────────────────────────────
async function refreshAccessToken(rawRefreshToken) {
  const { valid, decoded, error } = jwtUtils.verifyRefreshToken(rawRefreshToken);
  if (!valid) throw new Error(error || 'Refresh token invalide ou expiré');

  const { sub: userId } = decoded;

  // Cherche la session active correspondant au refresh token
  const session = await prisma.session.findFirst({
    where: {
      userId,
      refreshToken: rawRefreshToken,
      active:       true,
      revoked:      false,
      expiresAt:    { gt: new Date() }, // ✅ vérifier que la session n'est pas expirée
    },
  });

  if (!session) throw new Error('Session invalide ou expirée. Veuillez vous reconnecter.');

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

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
// ✅ FIX 3 : supprimé l'usage de prisma.revokedToken (model commenté dans le schéma)
// La révocation se fait uniquement via la table Session
async function logout(rawRefreshToken, userId, accessJti) {
  try {
    // Invalider la session exacte via le JTI de l'access token
    await prisma.session.updateMany({
      where: { jti: accessJti, userId },
      data:  { active: false, revoked: true, logoutAt: new Date() },
    });

    // Si plusieurs sessions actives du même user existent (multi-device),
    // on ne les invalide PAS — seule la session courante est révoquée.
    // Pour "déconnecter tous les appareils", voir POST /auth/logout-all (à implémenter si besoin).

  } catch (err) {
    // Ne jamais faire planter le logout côté client
    console.error('[AUTH] logout error (non bloquant) :', err.message);
  }
}

module.exports = {
  login,
  refreshAccessToken,
  logout,
};