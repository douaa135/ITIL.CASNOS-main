'use strict';

/**
 * ============================================================
 * auth.middleware.js — Vérification JWT + blacklist JTI
 * ============================================================
 * Adapté au schema.prisma réel :
 *   - RevokedToken { id, jti (unique), revokedAt }
 *   - isTokenRevoked() depuis user.service (remplace le Set du mock)
 * ============================================================
 */

const jwtUtils    = require('../utils/jwt.utils');
const userService = require('../services/user.service');


// ─── authenticateJWT ──────────────────────────────────────────────────────────
/**
 * Vérifie l'access token JWT dans le header Authorization.
 * Header attendu : "Authorization: Bearer eyJhbGci..."
 *
 * Si valide → injecte req.user = { sub, email, roles, permissions, jti, ... }
 * Si invalide / expiré / révoqué → 401
 */
async function authenticateJWT(req, res, next) {

  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Token d'authentification manquant"
    });
  }

  const token = authHeader.split(' ')[1];

  const { valid, decoded, error } = jwtUtils.verifyAccessToken(token);

  if (!valid) {
    return res.status(401).json({
      success: false,
      message: error || "Token invalide"
    });
  }

  req.user = {
    ...decoded,
    id_user: decoded.sub,
  };

  next();
}


module.exports = { authenticateJWT };