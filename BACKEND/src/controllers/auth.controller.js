'use strict';

/**
 * ============================================================
 * auth.controller.js — Orchestration Auth + Mot de passe
 * ============================================================
 * NOUVEAUX ENDPOINTS :
 *   POST /api/auth/forgot-password        → demande reset (public)
 *   POST /api/auth/reset-password         → valider code + nouveau mdp (public)
 *   PATCH /api/auth/me/change-password    → changer son propre mdp (privé, JWT requis)
 * ============================================================
 */

const authService = require('../services/auth.service');
const userService = require('../services/user.service');
const { COOKIE_NAME, COOKIE_OPTIONS } = require('../config/auth.config');

// ─── POST /api/auth/login ─────────────────────────────────────
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
      await authService.login(email, password, req.ip, req.headers['user-agent'] || '');

    res.cookie(COOKIE_NAME, refreshToken, COOKIE_OPTIONS);

    return res.status(200).json({ success: true, accessToken, expiresIn, user });

  } catch (err) {
    return res.status(401).json({ success: false, message: err.message });
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────
async function refresh(req, res) {
  try {
    const rawToken = req.cookies[COOKIE_NAME];

    if (!rawToken) {
      return res.status(401).json({ success: false, message: 'Refresh token manquant' });
    }

    const { accessToken, expiresIn } = await authService.refreshAccessToken(rawToken);
    return res.status(200).json({ success: true, accessToken, expiresIn });

  } catch (err) {
    res.clearCookie(COOKIE_NAME);
    return res.status(401).json({ success: false, message: err.message });
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────
async function logout(req, res) {
  try {
    const rawToken = req.cookies[COOKIE_NAME];
    await authService.logout(rawToken, req.user.sub, req.user.jti);
    res.clearCookie(COOKIE_NAME);
    return res.status(200).json({ success: true, message: 'Déconnexion réussie' });
  } catch {
    res.clearCookie(COOKIE_NAME);
    return res.status(500).json({ success: false, message: 'Erreur lors de la déconnexion' });
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────
async function me(req, res) {
  try {
    const user = await userService.findByIdSafe(req.user.sub);
    if (!user) return res.status(404).json({ success: false, message: 'Utilisateur introuvable' });
    return res.status(200).json({ success: true, user });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// ─── GET /api/auth/me/permissions ────────────────────────────
async function myPermissions(req, res) {
  try {
    const permissions = await userService.getUserPermissions(req.user.sub);
    return res.status(200).json({ success: true, permissions });
  } catch {
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// ─── POST /api/auth/forgot-password ──────────────────────────
/**
 * @route   POST /api/auth/forgot-password
 * @desc    Demande de réinitialisation — génère un code à 6 chiffres
 * @access  Public
 * @body    { email: string }
 *
 * En développement : le code est retourné dans la réponse (champ debug_token).
 * En production    : le code doit être envoyé par email (nodemailer).
 */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Le champ "email" est obligatoire.',
      });
    }

    const result = await authService.requestPasswordReset(email.trim().toLowerCase());

    // Toujours retourner 200 même si l'email n'existe pas (anti-énumération)
    return res.status(200).json({
      success: true,
      message: result.message,
      // Uniquement en dev — retirer en production
      ...(result.debug_token && { debug_token: result.debug_token }),
      expires_in: result.expires_in,
    });

  } catch (err) {
    console.error('[AUTH] forgotPassword :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// ─── POST /api/auth/reset-password ───────────────────────────
/**
 * @route   POST /api/auth/reset-password
 * @desc    Valide le code et applique le nouveau mot de passe
 * @access  Public
 * @body    { email: string, code: string, new_password: string }
 *
 * Règles :
 *   - Le code doit être valide et non expiré (15 min)
 *   - Le nouveau mot de passe doit faire au moins 8 caractères
 *   - Toutes les sessions actives sont révoquées après le reset
 */
async function resetPassword(req, res) {
  try {
    const { email, code, new_password } = req.body;

    // Validation des champs
    if (!email || !code || !new_password) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires : email, code, new_password.',
      });
    }
    if (typeof code !== 'string' || code.trim().length !== 6 || !/^\d{6}$/.test(code.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Le code doit être composé de 6 chiffres.',
      });
    }
    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
      });
    }

    const result = await authService.resetPassword(
      email.trim().toLowerCase(),
      code.trim(),
      new_password,
    );

    return res.status(200).json({ success: true, message: result.message });

  } catch (err) {
    const code = err.code || 'SERVER_ERROR';

    if (code === 'INVALID_RESET') {
      return res.status(400).json({ success: false, message: err.message, code });
    }
    if (code === 'WEAK_PASSWORD') {
      return res.status(400).json({ success: false, message: err.message, code });
    }

    console.error('[AUTH] resetPassword :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

// ─── PATCH /api/auth/me/change-password ──────────────────────
/**
 * @route   PATCH /api/auth/me/change-password
 * @desc    Changement de mot de passe par l'utilisateur connecté
 * @access  Privé (JWT requis)
 * @body    { current_password: string, new_password: string, confirm_password: string }
 *
 * Règles :
 *   - current_password doit correspondre au mot de passe en base
 *   - new_password ≥ 8 caractères
 *   - new_password ≠ current_password
 *   - new_password === confirm_password
 *   - Toutes les sessions sont révoquées après changement (reconnexion obligatoire)
 */
async function changePassword(req, res) {
  try {
    const { current_password, new_password, confirm_password } = req.body;

    // Validation des champs
    if (!current_password || !new_password || !confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Champs obligatoires : current_password, new_password, confirm_password.',
      });
    }
    if (new_password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Le nouveau mot de passe doit contenir au moins 8 caractères.',
      });
    }
    if (new_password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'new_password et confirm_password ne correspondent pas.',
        code: 'PASSWORD_MISMATCH',
      });
    }

    const result = await authService.changePassword(
      req.user.id_user,
      current_password,
      new_password,
    );

    // Effacer le cookie refresh — l'utilisateur doit se reconnecter
    res.clearCookie(COOKIE_NAME);

    return res.status(200).json({ success: true, message: result.message });

  } catch (err) {
    const errCode = err.code || 'SERVER_ERROR';

    if (errCode === 'WRONG_PASSWORD') {
      return res.status(400).json({ success: false, message: err.message, code: errCode });
    }
    if (errCode === 'WEAK_PASSWORD' || errCode === 'SAME_PASSWORD') {
      return res.status(400).json({ success: false, message: err.message, code: errCode });
    }
    if (errCode === 'NOT_FOUND') {
      return res.status(404).json({ success: false, message: err.message, code: errCode });
    }

    console.error('[AUTH] changePassword :', err);
    return res.status(500).json({ success: false, message: 'Erreur serveur' });
  }
}

module.exports = {
  login,
  refresh,
  logout,
  me,
  myPermissions,
  forgotPassword,
  resetPassword,
  changePassword,
};