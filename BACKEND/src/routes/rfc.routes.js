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

/**
 * ============================================================
 * COMMENTAIRES (discussion entre acteurs)
 *   GET    /api/rfc/:id/commentaires
 *   POST   /api/rfc/:id/commentaires
 *   PUT    /api/rfc/:id/commentaires/:id_commentaire
 *   DELETE /api/rfc/:id/commentaires/:id_commentaire
 *
 * ÉVALUATION DE RISQUE (1-to-1, upsert)
 *   GET    /api/rfc/:id/evaluation-risque
 *   PUT    /api/rfc/:id/evaluation-risque     ← crée ou met à jour
 *   DELETE /api/rfc/:id/evaluation-risque
 *
 * PIÈCES JOINTES (métadonnées)
 *   GET    /api/rfc/:id/pieces-jointes
 *   POST   /api/rfc/:id/pieces-jointes
 *   DELETE /api/rfc/:id/pieces-jointes/:id_piece
 * ============================================================
 */
 
const {
  checkRfcExists,
  validateCreateCommentaire,
  validateUpdateCommentaire,
  checkCommentaireExists,
  checkCommentaireOwner,
  validateEvaluationRisque,
  validateUpdateEvaluationRisque,
  validateCreatePieceJointe,
  checkPieceJointeExists,
} = require('../middlewares/rfc.middleware');
 
// ============================================================
// COMMENTAIRES
// ============================================================
 
router.get(
  '/:id/commentaires',
  authenticateJWT,
  checkPermission('rfc:read'),
  checkRfcExists,
  rfcController.getCommentairesByRfc
);
 
router.post(
  '/:id/commentaires',
  authenticateJWT,
  checkPermission('rfc:read'),    // tout acteur lisant la RFC peut commenter
  checkRfcExists,
  validateCreateCommentaire,
  rfcController.createCommentaire
);
 
router.put(
  '/:id/commentaires/:id_commentaire',
  authenticateJWT,
  checkPermission('rfc:read'),
  checkRfcExists,
  checkCommentaireExists,
  checkCommentaireOwner,          // propriétaire ou manager
  validateUpdateCommentaire,
  rfcController.updateCommentaire
);
 
router.delete(
  '/:id/commentaires/:id_commentaire',
  authenticateJWT,
  checkPermission('rfc:read'),
  checkRfcExists,
  checkCommentaireExists,
  checkCommentaireOwner,
  rfcController.deleteCommentaire
);
 
// ============================================================
// ÉVALUATION DE RISQUE
// ============================================================
 
router.get(
  '/:id/evaluation-risque',
  authenticateJWT,
  checkPermission('rfc:read'),
  checkRfcExists,
  rfcController.getEvaluationRisqueByRfc
);
 
// PUT = créer ou mettre à jour (upsert)
router.put(
  '/:id/evaluation-risque',
  authenticateJWT,
  checkPermission('rfc:update'),
  checkRfcExists,
  validateEvaluationRisque,
  rfcController.upsertEvaluationRisque
);
 
router.delete(
  '/:id/evaluation-risque',
  authenticateJWT,
  checkPermission('rfc:update'),
  checkRfcExists,
  rfcController.deleteEvaluationRisque
);
 
// ============================================================
// PIÈCES JOINTES
// ============================================================
 
router.get(
  '/:id/pieces-jointes',
  authenticateJWT,
  checkPermission('rfc:read'),
  checkRfcExists,
  rfcController.getPiecesJointesByRfc
);
 
router.post(
  '/:id/pieces-jointes',
  authenticateJWT,
  checkPermission('rfc:update'),
  checkRfcExists,
  validateCreatePieceJointe,
  rfcController.createPieceJointe
);
 
router.delete(
  '/:id/pieces-jointes/:id_piece',
  authenticateJWT,
  checkPermission('rfc:update'),
  checkRfcExists,
  checkPieceJointeExists,
  rfcController.deletePieceJointe
);
 
module.exports = router;