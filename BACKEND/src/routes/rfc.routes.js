/**
 * ============================================================
 * Routes — /api/rfc
 * ============================================================
 */

const router = require('express').Router();

const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/rbac.middleware');
const { PERMISSIONS } = require('../config/roles.config');

const rfcController = require('../controllers/rfc.controller');

// ── CRUD RFC ─────────────────────────────────

router.get(
  '/',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_READ.code),
  rfcController.getAllRfc
);

router.get(
  '/:id',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_READ.code),
  rfcController.getRfcById
);

router.post(
  '/',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_CREATE.code),
  rfcController.createRfc
);

router.put(
  '/:id',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_UPDATE.code),
  rfcController.updateRfc
);

router.delete(
  '/:id',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_CANCEL.code),
  rfcController.cancelRfc
);

// ── Gestion du statut RFC ─────────────────────

router.patch(
  '/:id/status',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_STATUT.code),
  rfcController.updateRfcStatus
);

router.put(
  '/:id/evaluate',
  authenticateJWT,
  checkPermission(PERMISSIONS.RFC_STATUT.code), // Using status permission for evaluation
  rfcController.evaluateRfc
);

module.exports = router;