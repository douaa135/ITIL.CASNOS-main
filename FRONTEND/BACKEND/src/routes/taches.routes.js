'use strict';

/**
 * ============================================================
 * tache.routes.js — Routes Tâches & Journaux d'exécution
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api', tacheRoutes);
 *
 * CHANGEMENT SCHÉMA :
 *   PATCH /taches/:id_tache/statut attend maintenant :
 *   { "id_statut": "<UUID du statut TACHE>" }
 *   au lieu de { "statut_tache": "EN_COURS" }
 *
 * Pour obtenir les UUIDs des statuts TACHE disponibles :
 *   GET /api/statuts?contexte=TACHE  (si route statut existe)
 *   ou récupérer depuis le seed : STAT-TCH-ATT, STAT-TCH-ENC, etc.
 * ============================================================
 */

const express    = require('express');
const router     = express.Router();
const controller = require('../controllers/taches.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkPermission }    = require('../middlewares/rbac.middleware');

const {
  validateCreateTache,
  validateUpdateTache,
  validateStatutTache,
  validateJournal,
  checkChangementExists,
  checkTacheExists,
  checkJournalExists,
  checkImplementeurValid,
  checkStatutTacheExists,   // ← nouveau : vérifie que id_statut est un statut TACHE valide
} = require('../middlewares/taches.middleware');


// ============================================================
// TÂCHES — contexte changement
// ============================================================

router.post(
  '/changements/:id_changement/taches',
  authenticateJWT,
  checkPermission('tache:create'),
  validateCreateTache,        // body valide
  checkChangementExists,      // :id_changement existe → req.changement
  checkImplementeurValid,     // body.id_user existe + actif → req.implementeur
  controller.createTache
);

router.get(
  '/changements/:id_changement/taches',
  authenticateJWT,
  checkPermission('tache:read'),
  checkChangementExists,
  controller.getTachesByChangement
);


// ============================================================
// TÂCHES — accès direct
// ============================================================

router.get(
  '/taches/:id_tache',
  authenticateJWT,
  checkPermission('tache:read'),
  checkTacheExists,
  controller.getTacheById
);

router.put(
  '/taches/:id_tache',
  authenticateJWT,
  checkPermission('tache:update'),
  checkTacheExists,           // req.tache
  validateUpdateTache,        // champs valides, id_statut interdit ici
  checkImplementeurValid,     // body.id_user si présent → req.implementeur
  controller.updateTache
);

/**
 * PATCH /api/taches/:id_tache/statut
 * Transition de statut ITIL.
 *
 * Body : { "id_statut": "<UUID du statut TACHE cible>" }
 *
 * Pour connaître les UUIDs disponibles, consulter la table statut
 * avec contexte = 'TACHE' (insérés par le seed) :
 *   EN_ATTENTE → STAT-TCH-ATT
 *   EN_COURS   → STAT-TCH-ENC
 *   TERMINEE   → STAT-TCH-TER
 *   ANNULEE    → STAT-TCH-ANN
 *
 * Chaîne :
 *   checkTacheExists         → req.tache + req.tache.statut.code_statut (statut actuel)
 *   checkStatutTacheExists   → vérifie id_statut, contexte TACHE → req.nouveauStatut
 *   validateStatutTache      → transition autorisée via TRANSITIONS_AUTORISEES
 */
router.patch(
  '/taches/:id_tache/statut',
  authenticateJWT,
  checkPermission('tache:execute'),
  checkTacheExists,            // statut actuel dans req.tache.statut
  checkStatutTacheExists,      // id_statut valide + contexte TACHE → req.nouveauStatut
  validateStatutTache,         // transition autorisée
  controller.updateStatutTache
);

router.delete(
  '/taches/:id_tache',
  authenticateJWT,
  checkPermission('tache:create'),
  checkTacheExists,
  controller.deleteTache
);


// ============================================================
// JOURNAUX D'EXÉCUTION
// ============================================================

router.post(
  '/taches/:id_tache/journaux',
  authenticateJWT,
  checkPermission('tache:execute'),
  checkTacheExists,
  validateJournal,
  controller.addJournal
);

router.get(
  '/taches/:id_tache/journaux',
  authenticateJWT,
  checkPermission('tache:read'),
  checkTacheExists,
  controller.getJournauxByTache
);

router.delete(
  '/taches/:id_tache/journaux/:id_journal',
  authenticateJWT,
  checkPermission('tache:execute'),
  checkTacheExists,
  checkJournalExists,
  controller.deleteJournal
);


module.exports = router;