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

const {
  checkChangementParentExists,
  validateCreatePir,
  validateUpdatePir,
  validateCreateTest,
  validateUpdateTest,
  checkTestExists,
} = require('../middlewares/changement.middleware');

// ── Liste & Détail ───────────────────────────────────────────
router.get(
  '/',    
  authenticateJWT, 
  checkPermission(PERMISSIONS.CHANGEMENT_READ.code),   
  changeController.getAllChangements
);

router.get(
  '/:id', 
  authenticateJWT, 
  checkPermission(PERMISSIONS.CHANGEMENT_READ.code),   
  changeController.getChangementById
);

// ── Création ─────────────────────────────────────────────────
router.post('/',   
  authenticateJWT, 
  checkPermission(PERMISSIONS.CHANGEMENT_CREATE.code), 
  changeController.createChangement
);

// ── Modification champs planification ────────────────────────
router.put(
  '/:id', 
  authenticateJWT, 
  checkPermission(PERMISSIONS.CHANGEMENT_UPDATE.code), 
  changeController.updateChangement
);

// ── Transition de statut (workflow ITIL) ─────────────────────
router.patch(
  '/:id/status', 
  authenticateJWT, 
  checkPermission(PERMISSIONS.CHANGEMENT_STATUT.code), 
  changeController.updateChangementStatus
);

// ── Clôture logique (soft delete ITIL) ───────────────────────
router.delete(
  '/:id', 
  authenticateJWT, 
  checkPermission(PERMISSIONS.CHANGEMENT_CLOSE.code), 
  changeController.cloturerChangement
);

// ============================================================
// Routes supplémentaires pour la gestion des PIR et Tests associés à un changement
 
// ── PIR ───────────────────────────────────────────────────────
 
router.get(
  '/:id/pir',
  authenticateJWT, checkPermission('changement:read'),
  checkChangementParentExists,
  changeController.getPirByChangement
);
 
router.post(
  '/:id/pir',
  authenticateJWT, checkPermission('changement:update'),
  checkChangementParentExists,
  validateCreatePir,
  changeController.createPir
);
 
router.put(
  '/:id/pir',
  authenticateJWT, checkPermission('changement:update'),
  checkChangementParentExists,
  validateUpdatePir,
  changeController.updatePir
);
 
router.delete(
  '/:id/pir',
  authenticateJWT, checkPermission('changement:close'),
  checkChangementParentExists,
  changeController.deletePir
);
 
// ── TESTS ─────────────────────────────────────────────────────
 
router.get(
  '/:id/tests',
  authenticateJWT, checkPermission('changement:read'),
  checkChangementParentExists,
  changeController.getTestsByChangement
);
 
router.post(
  '/:id/tests',
  authenticateJWT, checkPermission('changement:execute'),
  checkChangementParentExists,
  validateCreateTest,
  changeController.createTest
);
 
router.put(
  '/:id/tests/:id_test',
  authenticateJWT, checkPermission('changement:execute'),
  checkChangementParentExists,
  checkTestExists,
  validateUpdateTest,
  changeController.updateTest
);
 
router.delete(
  '/:id/tests/:id_test',
  authenticateJWT, checkPermission('changement:update'),
  checkChangementParentExists,
  checkTestExists,
  changeController.deleteTest
);

module.exports = router;