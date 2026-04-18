'use strict';

/**
 * ============================================================
 * user.routes.js — Routes CRUD Utilisateur
 * ============================================================
 * Toutes les routes sont protégées par :
 *   authenticate   → vérifie le JWT (access token)
 *   authorize(...) → vérifie la permission RBAC
 *
 * Seul l'ADMIN peut créer / modifier / désactiver des comptes.
 * La lecture de la liste et d'un profil est accessible à tous
 * les rôles connectés (user:manage pour la liste complète).
 * ============================================================
 */

const express    = require('express');
const router     = express.Router();
const userController = require('../controllers/user.controller');

// Middlewares auth — à adapter selon votre arborescence
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkRole }    = require('../middlewares/rbac.middleware');

// ── GET    /api/users/by-role/:roleName  — Accessor pour Change Manager & Service Desk
router.get('/by-role/:roleName', authenticateJWT, checkRole('CHANGE_MANAGER', 'ADMIN_SYSTEME', 'SERVICE_DESK'), userController.getUsersByRole);

// ── PATCH  /api/users/profile/password — Modifier son propre mot de passe
router.patch('/profile/password', authenticateJWT, userController.updateMyPassword);

// ── POST   /api/users       
router.post('/',  authenticateJWT,  checkRole('ADMIN_SYSTEME'),  userController.createUser );

// ── GET    /api/users          
router.get('/',   authenticateJWT,  checkRole('ADMIN_SYSTEME'),  userController.getAllUsers );

// ── GET    /api/users/roles
router.get('/roles', authenticateJWT, checkRole('ADMIN_SYSTEME'), userController.getAllRoles);

// ── GET    /api/users/directions
router.get('/directions', authenticateJWT, checkRole('ADMIN_SYSTEME'), userController.getAllDirections);

// ── GET    /api/users/:id 
router.get('/:id', authenticateJWT, checkRole('ADMIN_SYSTEME'),  userController.getUserById);

// ── PUT    /api/users/:id         — Modifier un utilisateur (ADMIN)
router.put('/:id',authenticateJWT,  checkRole('ADMIN_SYSTEME'),  userController.updateUser );

// ── PATCH  /api/users/:id/actif
router.patch('/:id/actif',  authenticateJWT,  checkRole('ADMIN_SYSTEME'),  userController.toggleActif );

// ── DELETE /api/users/:id
router.delete('/:id',       authenticateJWT,  checkRole('ADMIN_SYSTEME'),  userController.deleteUser );

module.exports = router;