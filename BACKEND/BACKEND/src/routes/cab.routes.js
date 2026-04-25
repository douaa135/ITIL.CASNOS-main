'use strict';

/**
 * ============================================================
 * cab.routes.js — Routes CAB
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api', cabRoutes);
 *
 * URLS COMPLÈTES :
 *
 *  CAB
 *  POST   /api/cab                                             créer un CAB
 *  GET    /api/cab                                             lister les CABs
 *  GET    /api/cab/:id_cab                                     détail d'un CAB
 *
 *  MEMBRES
 *  POST   /api/cab/:id_cab/membres                             ajouter un membre
 *  GET    /api/cab/:id_cab/membres                             lister les membres
 *  DELETE /api/cab/:id_cab/membres/:id_user                    retirer un membre
 *
 *  RÉUNIONS
 *  POST   /api/cab/:id_cab/reunions                            créer une réunion
 *  GET    /api/cab/:id_cab/reunions                            lister les réunions
 *  GET    /api/reunions/:id_reunion                            détail d'une réunion
 *  PUT    /api/reunions/:id_reunion                            modifier une réunion
 *
 *  AGENDA (RFCs à l'ordre du jour)
 *  POST   /api/reunions/:id_reunion/rfcs                       inscrire une RFC
 *  GET    /api/reunions/:id_reunion/rfcs                       RFCs de la réunion
 *  DELETE /api/reunions/:id_reunion/rfcs/:id_rfc               retirer une RFC
 *
 *  PARTICIPANTS
 *  POST   /api/reunions/:id_reunion/participants               ajouter un participant
 *  GET    /api/reunions/:id_reunion/participants               lister les participants
 *  DELETE /api/reunions/:id_reunion/participants/:id_user      retirer un participant
 *
 *  VOTES
 *  POST   /api/reunions/:id_reunion/rfcs/:id_rfc/votes         voter sur une RFC
 *  GET    /api/reunions/:id_reunion/votes                      tous les votes
 *  GET    /api/reunions/:id_reunion/rfcs/:id_rfc/votes         votes d'une RFC
 *
 *  DÉCISIONS
 *  POST   /api/reunions/:id_reunion/rfcs/:id_rfc/decision      décision finale
 *  GET    /api/reunions/:id_reunion/decisions                  toutes les décisions
 *  GET    /api/reunions/:id_reunion/rfcs/:id_rfc/decision      décision d'une RFC
 *
 * PERMISSIONS RBAC :
 *  cab:manage  → CHANGE_MANAGER, ADMIN  (créer, modifier, décider)
 *  cab:read    → tous les rôles connectés
 *  cab:vote    → MEMBRE_CAB
 * ============================================================
 */

const express    = require('express');
const router     = express.Router();
const ctrl       = require('../controllers/cab.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkPermission }    = require('../middlewares/rbac.middleware');

const {
  validateCreateCab,
  validateCreateReunion,
  validateUpdateReunion,
  validateAddMembre,
  validateAddRfcToAgenda,
  validateVote,
  validateDecision,
  checkCabExists,
  checkReunionExists,
  checkRfcExists,
  checkRfcOnAgenda,
  checkUserExists,
  checkUserIsCabMembre,
  checkDejaVote,
  checkDejaDecision,
} = require('../middlewares/cab.middleware');

// ============================================================
// CAB
// ============================================================

router.post(
  '/cab',
  authenticateJWT, 
  checkPermission('cab:manage'),
  validateCreateCab,
  ctrl.createCab
);

router.get(
  '/cab',
  authenticateJWT, checkPermission('cab:read'),
  ctrl.getAllCabs
);

router.get(
  '/cab/:id_cab',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkCabExists,
  ctrl.getCabById
);


// ============================================================
// MEMBRES
// ============================================================

router.post(
  '/cab/:id_cab/membres',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkCabExists,          // req.cab
  validateAddMembre,       // body.id_user requis
  checkUserExists,         // body.id_user existe + actif → req.targetUser
  ctrl.addMembre
);

router.get(
  '/cab/:id_cab/membres',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkCabExists,
  ctrl.getMembresByCab
);

router.delete(
  '/cab/:id_cab/membres/:id_user',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkCabExists,
  ctrl.removeMembre
);


// ============================================================
// RÉUNIONS
// ============================================================

router.post(
  '/cab/:id_cab/reunions',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkCabExists,            // req.cab
  validateCreateReunion,     // date_reunion requise
  ctrl.createReunion
);

router.get(
  '/cab/:id_cab/reunions',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkCabExists,
  ctrl.getReunionsByCab
);

router.get(
  '/reunions/:id_reunion',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,        // req.reunion
  ctrl.getReunionById
);

router.put(
  '/reunions/:id_reunion',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkReunionExists,        // req.reunion
  validateUpdateReunion,     // au moins un champ
  ctrl.updateReunion
);


// ============================================================
// AGENDA
// ============================================================

router.post(
  '/reunions/:id_reunion/rfcs',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkReunionExists,         // req.reunion
  validateAddRfcToAgenda,     // body.id_rfc requis
  checkRfcExists,             // req.rfc (depuis body.id_rfc)
  ctrl.addRfcToAgenda
);

router.get(
  '/reunions/:id_reunion/rfcs',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,
  ctrl.getRfcsByReunion
);

router.delete(
  '/reunions/:id_reunion/rfcs/:id_rfc',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkReunionExists,
  ctrl.removeRfcFromAgenda
);


// ============================================================
// PARTICIPANTS
// ============================================================

router.post(
  '/reunions/:id_reunion/participants',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkReunionExists,         // req.reunion
  validateAddMembre,          // body.id_user requis (réutilisation)
  checkUserExists,            // req.targetUser
  ctrl.addParticipant
);

router.get(
  '/reunions/:id_reunion/participants',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,
  ctrl.getParticipantsByReunion
);

router.delete(
  '/reunions/:id_reunion/participants/:id_user',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkReunionExists,
  ctrl.removeParticipant
);


// ============================================================
// VOTES
// ============================================================

/**
 * POST /api/reunions/:id_reunion/rfcs/:id_rfc/votes
 * Chaîne : réunion existe → RFC existe → RFC sur agenda
 *        → body valide → utilisateur actif → est membre CAB
 *        → n'a pas encore voté sur cette RFC
 */
router.post(
  '/reunions/:id_reunion/rfcs/:id_rfc/votes',
  authenticateJWT, 
  checkPermission('cab:vote'),
  checkReunionExists,         // req.reunion
  checkRfcExists,             // req.rfc (depuis params.id_rfc)
  checkRfcOnAgenda,           // RFC bien à l'ordre du jour
  validateVote,               // body.id_user + body.valeur_vote
  checkUserExists,            // req.targetUser
  checkUserIsCabMembre,       // l'utilisateur est membre du CAB de la réunion
  checkDejaVote,              // pas de double vote
  ctrl.castVote
);

router.get(
  '/reunions/:id_reunion/votes',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,
  ctrl.getVotesByReunion
);

router.get(
  '/reunions/:id_reunion/rfcs/:id_rfc/votes',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,
  checkRfcExists,
  checkRfcOnAgenda,
  ctrl.getVotesByRfc
);


// ============================================================
// DÉCISIONS
// ============================================================

/**
 * POST /api/reunions/:id_reunion/rfcs/:id_rfc/decision
 * Chaîne : réunion existe → RFC existe → RFC sur agenda
 *        → body valide → pas de double décision
 * Seul le Change Manager / Admin peut décider.
 */
router.post(
  '/reunions/:id_reunion/rfcs/:id_rfc/decision',
  authenticateJWT, 
  checkPermission('cab:manage'),
  checkReunionExists,         // req.reunion
  checkRfcExists,             // req.rfc
  checkRfcOnAgenda,           // RFC bien à l'ordre du jour
  validateDecision,           // body.decision valide
  checkDejaDecision,          // une seule décision par RFC par réunion
  ctrl.createDecision
);

router.get(
  '/reunions/:id_reunion/decisions',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,
  ctrl.getDecisionsByReunion
);

router.get(
  '/reunions/:id_reunion/rfcs/:id_rfc/decision',
  authenticateJWT, 
  checkPermission('cab:read'),
  checkReunionExists,
  checkRfcExists,
  ctrl.getDecisionByRfc
);


module.exports = router;