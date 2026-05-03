'use strict';

/**
 * ============================================================
 * tache.controller.js — Orchestration Tâches + Journaux
 * ============================================================
 * Validations body   → tache.middleware.js
 * Vérifications DB   → tache.middleware.js
 * Logique Prisma     → tache.service.js
 * Ici                → appel service + réponse HTTP
 *
 * Changement schéma : updateStatutTache reçoit maintenant
 * req.nouveauStatut.id_statut (UUID) au lieu d'un code enum.
 * ============================================================
 */

const tacheService = require('../services/taches.service');
const R            = require('../utils/response.utils');

// ============================================================
// TÂCHES
// ============================================================

const createTache = async (req, res) => {
  try {
    const tache = await tacheService.createTache(req.params.id_changement, req.body);
    return R.success(res, { tache }, 'Tâche créée avec succès.', 201);
  } catch (err) {
    console.error('[createTache]', err);
    return R.serverError(res);
  }
};

const getTachesByChangement = async (req, res) => {
  try {
    const taches = await tacheService.getTachesByChangement(req.params.id_changement);
    return R.success(res, { taches, total: taches.length }, 'Tâches récupérées avec succès.');
  } catch (err) {
    console.error('[getTachesByChangement]', err);
    return R.serverError(res);
  }
};

const getTacheById = async (req, res) => {
  try {
    const tache = await tacheService.getTacheById(req.params.id_tache);
    return R.success(res, { tache }, 'Tâche récupérée avec succès.');
  } catch (err) {
    console.error('[getTacheById]', err);
    return R.serverError(res);
  }
};

const updateTache = async (req, res) => {
  try {
    const tache = await tacheService.updateTache(req.params.id_tache, req.body);
    return R.success(res, { tache }, 'Tâche mise à jour avec succès.');
  } catch (err) {
    console.error('[updateTache]', err);
    return R.serverError(res);
  }
};

/**
 * PATCH /api/taches/:id_tache/statut
 * Body : { "id_statut": "<UUID du nouveau statut TACHE>" }
 *
 * Chaîne middleware garantit :
 *   1. checkTacheExists          → req.tache.statut.code_statut (statut actuel)
 *   2. checkStatutTacheExists    → req.nouveauStatut (statut cible validé, contexte TACHE)
 *   3. validateStatutTache       → transition autorisée
 * Le controller ne fait que passer req.nouveauStatut.id_statut au service.
 */
const updateStatutTache = async (req, res) => {
  try {
    const tache = await tacheService.updateStatutTache(
      req.params.id_tache,
      req.nouveauStatut.id_statut   // injecté par checkStatutTacheExists
    );

    const labels = {
      EN_COURS:  'démarrée',
      TERMINEE:  'terminée',
      ANNULEE:   'annulée',
      EN_ATTENTE:'remise en attente',
    };
    const label = labels[req.nouveauStatut.code_statut] ?? 'mise à jour';

    return R.success(res, { tache }, `Tâche ${label} avec succès.`);
  } catch (err) {
    console.error('[updateStatutTache]', err);
    return R.serverError(res);
  }
};

const deleteTache = async (req, res) => {
  try {
    const result = await tacheService.deleteTache(req.params.id_tache);
    return R.success(res, result, 'Tâche et journaux supprimés avec succès.');
  } catch (err) {
    console.error('[deleteTache]', err);
    return R.serverError(res);
  }
};


// ============================================================
// JOURNAUX D'EXÉCUTION
// ============================================================

const addJournal = async (req, res) => {
  try {
    const journal = await tacheService.addJournal(req.params.id_tache, req.body);
    return R.success(res, { journal }, 'Entrée de journal ajoutée avec succès.', 201);
  } catch (err) {
    console.error('[addJournal]', err);
    return R.serverError(res);
  }
};

const getJournauxByTache = async (req, res) => {
  try {
    const journaux = await tacheService.getJournauxByTache(req.params.id_tache);
    return R.success(res, { journaux, total: journaux.length }, 'Journaux récupérés avec succès.');
  } catch (err) {
    console.error('[getJournauxByTache]', err);
    return R.serverError(res);
  }
};

const deleteJournal = async (req, res) => {
  try {
    const result = await tacheService.deleteJournal(req.params.id_journal);
    return R.success(res, result, 'Entrée de journal supprimée avec succès.');
  } catch (err) {
    console.error('[deleteJournal]', err);
    return R.serverError(res);
  }
};


module.exports = {
  createTache,
  getTachesByChangement,
  getTacheById,
  updateTache,
  updateStatutTache,
  deleteTache,
  addJournal,
  getJournauxByTache,
  deleteJournal,
};