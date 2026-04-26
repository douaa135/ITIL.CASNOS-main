/**
 * ============================================================
 * Routes — /api/auth
 * ============================================================
 */

const router = require('express').Router();

const { login, refresh, logout, me, myPermissions } = require('../controllers/auth.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');

/**
 * @route   POST /api/auth/login
 * @desc    Connexion — access_token + refresh_token (profil : GET /me)
 * @access  Public
 * @body    { login: string, password: string }
 */
router.post('/login', login);

/**
 * @route   POST /api/auth/refresh
 * @desc    Nouvel access_token à partir du refresh_token
 * @access  Public
 * @body    { refresh_token: string }
 */
router.post('/refresh', refresh);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion — révoque le token
 * @access  Privé (JWT requis)
 */
router.post('/logout', authenticateJWT, logout);

/**
 * @route   GET /api/auth/me
 * @desc    Profil de l'utilisateur connecté
 * @access  Privé (JWT requis)
 */
router.get('/me', authenticateJWT, me);

/**
 * @route   GET /api/auth/me/permissions
 * @desc    Liste des permissions du rôle courant
 * @access  Privé (JWT requis)
 */
router.get('/me/permissions', authenticateJWT, myPermissions);

module.exports = router;