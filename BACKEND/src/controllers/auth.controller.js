'use strict';

const authService = require('../services/auth.service');
const userService = require('../services/user.service');

// ─── Cookie ───────────────────────────────────────────────────────────────────
const COOKIE_NAME    = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false, // mettre true seulement en HTTPS
  sameSite: "lax",
  maxAge: 8 * 60 * 60 * 1000 // 8h
};


// ─── POST /api/auth/login ─────────────────────────────────────────────────────
/**
 * Body : { "email": "k.merabti@casnos.dz", "password": "password" }
 *
 * ⚠️  Le champ s'appelle "email" (pas "login") — pas de champ login en base.
 *
 * Réponse 200 (une seule requête — profil complet inclus) :
 * {
 *   "success": true,
 *   "accessToken": "eyJhbGci...",
 *   "expiresIn": 900,
 *   "user": {
 *     "id_user":       "uuid...",
 *     "nom_user":      "Merabti",
 *     "prenom_user":   "Karim",
 *     "email_user":    "change.manager@casnos.dz",
 *     "nom_direction": "DMSI",
 *     "roles":         ["CHANGE_MANAGER"],
 *     "permissions":   ["rfc:create", "rfc:approve", ...]
 *   }
 * }
 * Cookie : refresh_token (httpOnly, 7 jours)
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'email et password sont obligatoires',
      });
    }

    const { accessToken, refreshToken, expiresIn, user } =
      await authService.login(
        email,
        password,
        req.ip,
        req.headers['user-agent'] || ''
      );

    // Refresh token → cookie httpOnly (non visible côté JS client)
    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      accessToken,
      expiresIn,
      user,
    });

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: err.message,
    });
  }
}


// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
/**
 * Renouvelle l'access token depuis le cookie refresh_token.
 * Réponse 200 : { success, accessToken, expiresIn }
 */
async function refresh(req, res) {
  try {
    const rawToken = req.cookies[COOKIE_NAME];

    if (!rawToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token manquant',
      });
    }

    const { accessToken, expiresIn } =
      await authService.refreshAccessToken(rawToken);

    return res.status(200).json({ success: true, accessToken, expiresIn });

  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ success: false, message: err.message });
  }
}


// ─── POST /api/auth/logout ────────────────────────────────────────────────────
/**
 * Révoque le refresh token + efface le cookie.
 * Réponse 200 : { success, message }
 */
async function logout(req, res) {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    await authService.logout(
      rawToken,
      req.user.sub,  // userId
      req.user.jti   // JTI access token — identifie la session exacte
    );
    res.clearCookie(COOKIE_NAME);
    return res.status(200).json({ success: true, message: 'Déconnexion réussie' });
  } catch {
    res.clearCookie(COOKIE_NAME);
    return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
  }
}


// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
/**
 * Optionnel — POST /login retourne déjà le profil complet.
 * Utile pour recharger le profil après un rechargement de page.
 *
 * Nécessite le middleware authenticateJWT → req.user.sub = UUID
 */
async function me(req, res) {
  try {
    const user = await userService.findByIdSafe(req.user.sub);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    }

    return res.status(200).json({ success: true, user });

  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

async function myPermissions(req, res) {
  try {
    const permissions = await userService.getUserPermissions(req.user.sub);
    return res.status(200).json({ success: true, permissions });

  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}


module.exports = {
  login,
  refresh,
  logout,
  me,
  myPermissions
};