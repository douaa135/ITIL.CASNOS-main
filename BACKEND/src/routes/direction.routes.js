'use strict';

/**
 * ============================================================
 * direction.routes.js — CRUD Directions Métier
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api/directions', directionRoutes);
 *
 * URLS :
 *   GET    /api/directions                     → liste toutes les directions
 *   GET    /api/directions/:id_direction        → détail + utilisateurs rattachés
 *   POST   /api/directions                     → créer une direction (Admin)
 *   PUT    /api/directions/:id_direction        → modifier une direction (Admin)
 *   DELETE /api/directions/:id_direction        → supprimer une direction (Admin)
 *
 * Lecture : tous les rôles authentifiés
 * Écriture : ADMIN uniquement (permission system:config)
 * ============================================================
 */

const express = require('express');
const router  = express.Router();

const ctrl               = require('../controllers/direction.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/rbac.middleware');

// ── Lecture — accessible à tous les utilisateurs authentifiés ────────────────
router.get(
  '/',                
  authenticateJWT, 
  ctrl.getDirections
);

router.get(
  '/:id_direction',   
  authenticateJWT, 
  ctrl.getDirectionById
);

// ── Écriture — Admin uniquement ──────────────────────────────────────────────
router.post(
  '/',               
  authenticateJWT, 
  checkPermission('system:config'), 
  ctrl.createDirection
);

router.put(
  '/:id_direction',   
  authenticateJWT, 
  checkPermission('system:config'), 
  ctrl.updateDirection
);

router.delete(
  '/:id_direction',
  authenticateJWT, 
  checkPermission('system:config'), 
  ctrl.deleteDirection
);

module.exports = router;