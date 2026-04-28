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
'use strict';

const express    = require('express');
const router     = express.Router();
const userController = require('../controllers/user.controller');
const prisma = require('../services/prisma.service');

const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkRole }       = require('../middlewares/rbac.middleware');

// ── GET    /api/users/roles → lit la table `role` via Prisma
router.get(
  '/roles', 
  authenticateJWT, 
  checkRole('ADMIN'), 
    async (req, res) => {
    try {
      const roles = await prisma.role.findMany({
        select: {
          id_role: true,
          nom_role: true,
          code_metier: true,
        },
        orderBy: { nom_role: 'asc' },
      });
      res.json({ success: true, data: roles });
    } catch (err) {
      console.error('[GET /roles]', err);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des rôles.' });
    }
});

// ── GET    /api/users/directions → lit la table `direction_metier` via Prisma
router.get(
  '/directions', 
  authenticateJWT, 
  checkRole('ADMIN'), 
  async (req, res) => {
    try {
      const directions = await prisma.directionMetier.findMany({
        select: {
          id_direction: true,
          nom_direction: true,
          code_metier: true,
        },
        orderBy: { nom_direction: 'asc' },
      });
      res.json({ success: true, data: directions });
    } catch (err) {
      console.error('[GET /directions]', err);
      res.status(500).json({ success: false, message: 'Erreur lors de la récupération des directions.' });
    }
});

// ── POST   /api/users
router.post(
  '/', 
  authenticateJWT, 
  checkRole('ADMIN'), 
  userController.createUser
);

// ── GET    /api/users
router.get(
  '/', 
  authenticateJWT, 
  checkRole('ADMIN'), 
userController.getAllUsers
);


// ── GET    /api/users/:id  (après /roles et /directions)
router.get(
  '/:id', 
  authenticateJWT, 
  checkRole('ADMIN'), 
userController.getUserById
);

// ── PUT    /api/users/:id
router.put(
  '/:id', 
  authenticateJWT, 
  checkRole('ADMIN'), 
userController.updateUser
);

// ── PATCH  /api/users/:id/actif
router.patch(
  '/:id/actif', 
  authenticateJWT, 
  checkRole('ADMIN'), 
userController.toggleActif)
;

module.exports = router;