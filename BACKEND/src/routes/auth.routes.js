'use strict';

/**
 * ============================================================
 * Routes — /api/auth
 * ============================================================
 *
 * ROUTES PUBLIQUES (sans JWT)
 *   POST /api/auth/login                → connexion
 *   POST /api/auth/refresh              → renouveler le token
 *   POST /api/auth/forgot-password      → demande de réinitialisation
 *   POST /api/auth/reset-password       → valider code + nouveau mdp
 *
 * ROUTES PRIVÉES (JWT requis)
 *   POST   /api/auth/logout             → déconnexion
 *   GET    /api/auth/me                 → profil connecté
 *   GET    /api/auth/me/permissions     → permissions du rôle
 *   PATCH  /api/auth/me/change-password → changer son propre mdp
 * ============================================================
 */

const router = require('express').Router();

const {
  login,
  refresh,
  logout,
  me,
  myPermissions,
  forgotPassword,
  resetPassword,
  changePassword,
} = require('../controllers/auth.controller');

const { authenticateJWT } = require('../middlewares/auth.middleware');

// ── Publiques ─────────────────────────────────────────────────

/** POST /api/auth/login */
router.post('/login', login);

/** POST /api/auth/refresh */
router.post('/refresh', refresh);

/** POST /api/auth/forgot-password */
router.post('/forgot-password', forgotPassword);

/** POST /api/auth/reset-password */
router.post('/reset-password', resetPassword);

// ── Privées (JWT requis) ──────────────────────────────────────

/** POST /api/auth/logout */
router.post('/logout', authenticateJWT, logout);

/** GET /api/auth/me */
router.get('/me', authenticateJWT, me);

/** GET /api/auth/me/permissions */
router.get('/me/permissions', authenticateJWT, myPermissions);

/** PATCH /api/auth/me/change-password */
router.patch('/me/change-password', authenticateJWT, changePassword);

module.exports = router;