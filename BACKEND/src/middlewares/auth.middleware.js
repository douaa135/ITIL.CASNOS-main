'use strict';

const jwtUtils = require('../utils/jwt.utils');
const prisma   = require('../services/prisma.service'); // ← BUG FIX

// ─── authenticateJWT ─────────────────────────────────────────
async function authenticateJWT(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: "Token d'authentification manquant",
    });
  }

  const token = authHeader.split(' ')[1];
  const { valid, decoded, error } = jwtUtils.verifyAccessToken(token);

  if (!valid) {
    return res.status(401).json({
      success: false,
      message: error || 'Token invalide',
    });
  }

  // Vérifier que le compte est toujours actif en base
  const utilisateur = await prisma.utilisateur.findUnique({
    where:  { id_user: decoded.sub },
    select: { actif: true },
  });

  if (!utilisateur || !utilisateur.actif) {
    return res.status(401).json({
      success: false,
      error: { code: 'ACCOUNT_DISABLED', message: 'Votre compte a été désactivé.' },
    });
  }

  req.user = {
    ...decoded,
    id_user: decoded.sub,
  };

  next();
}

module.exports = { authenticateJWT };