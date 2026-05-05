'use strict';

const authService = require('../services/auth.service');
const userService = require('../services/user.service');

// ✅ FIX 2 : Cookie maxAge aligné sur la durée du refresh token (7 jours)
const COOKIE_NAME    = 'refresh_token';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure:   process.env.NODE_ENV === 'production', // true en prod (HTTPS), false en dev
  sameSite: 'lax',
  maxAge:   7 * 24 * 60 * 60 * 1000,  // 7 jours — même durée que le refresh token JWT
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
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

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({
      success: true,
      accessToken,
      expiresIn,   // 900 secondes = 15 min (aligné sur ACCESS_EXPIRES_IN='15m')
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
async function logout(req, res) {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    await authService.logout(
      rawToken,
      req.user.sub,  // userId
      req.user.jti   // JTI access token
    );
    res.clearCookie(COOKIE_NAME);
    return res.status(200).json({ success: true, message: 'Déconnexion réussie' });
  } catch {
    res.clearCookie(COOKIE_NAME);
    return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
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
  myPermissions,
};