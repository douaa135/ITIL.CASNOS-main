/**
 * ============================================================
 * Routes — /api/changements
 * ============================================================
 */

'use strict';

const router = require('express').Router();

const { authenticateJWT }  = require('../middlewares/auth.middleware');
const { checkPermission }  = require('../middlewares/rbac.middleware');
const { PERMISSIONS }      = require('../config/roles.config');
const changeController     = require('../controllers/changement.controller');

// ── Liste & Détail ───────────────────────────────────────────
router.get('/',    authenticateJWT, checkPermission(PERMISSIONS.CHANGEMENT_READ.code),   changeController.getAllChangements);
router.get('/:id', authenticateJWT, checkPermission(PERMISSIONS.CHANGEMENT_READ.code),   changeController.getChangementById);

// ── Création ─────────────────────────────────────────────────
router.post('/',   authenticateJWT, checkPermission(PERMISSIONS.CHANGEMENT_CREATE.code), changeController.createChangement);

// ── Modification champs planification ────────────────────────
router.put('/:id', authenticateJWT, checkPermission(PERMISSIONS.CHANGEMENT_UPDATE.code), changeController.updateChangement);

// ── Transition de statut (workflow ITIL) ─────────────────────
router.patch('/:id/status', authenticateJWT, checkPermission(PERMISSIONS.CHANGEMENT_STATUT.code), changeController.updateChangementStatus);

// ── Clôture logique (soft delete ITIL) ───────────────────────
router.delete('/:id', authenticateJWT, checkPermission(PERMISSIONS.CHANGEMENT_CLOSE.code), changeController.cloturerChangement);

module.exports = router;