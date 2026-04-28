/**
 * ============================================================
 * Changement Controller
 * GET    /api/changements           → liste
 * GET    /api/changements/:id       → détail
 * POST   /api/changements           → créer (indépendant ou depuis RFC)
 * PUT    /api/changements/:id       → modifier champs planification
 * PATCH  /api/changements/:id/status → changer le statut (workflow)
 * DELETE /api/changements/:id       → clôturer (soft delete ITIL)
 * ============================================================
*/

'use strict';

const changementService = require('../services/changement.service');
const R   = require('../utils/response.utils');

// ─────────────────────────────────────────────────────────────
// GET /api/changements
// ─────────────────────────────────────────────────────────────
const getAllChangements = async (req, res) => {
  try {
    const changements = await changementService.getAllChangements(req.query);
    return R.success(res, { changements, total: changements.length }, 'Liste des Changements récupérée.');
  } catch (err) {
    console.error('[CHG] getAllChangements :', err);
    return R.serverError(res, 'Erreur lors de la récupération des Changements.');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/changements/:id
// ─────────────────────────────────────────────────────────────
const getChangementById = async (req, res) => {
  try {
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return R.notFound(res, 'Changement introuvable.');
    return R.success(res, { changement }, 'Changement récupéré.');
  } catch (err) {
    console.error('[CHG] getChangementById :', err);
    return R.serverError(res, 'Erreur lors de la récupération du Changement.');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/changements
// ─────────────────────────────────────────────────────────────
const createChangement = async (req, res) => {
  try {
    const { id_env, id_rfc } = req.body;

    if (!id_env) {
      return R.badRequest(res, "id_env (environnement cible) est obligatoire.", 'MISSING_ENV');
    }

    // Seul un CHANGE_MANAGER ou ADMIN peut créer un Changement
    const canCreate = req.user.roles?.includes('CHANGE_MANAGER') || req.user.roles?.includes('ADMIN');
    if (!canCreate) {
      return R.forbidden(res, 'Seul un Change Manager ou Admin peut créer un Changement.');
    }

    const changement = await changementService.createChangement(req.body, req.user.id_user);

    const message = id_rfc
      ? 'Changement créé depuis la RFC approuvée.'
      : 'Changement STANDARD créé sans RFC (pré-approuvé).';

    return R.success(res, { changement }, message, 201);
  } catch (err) {
    console.error('[CHG] createChangement :', err);
    return R.serverError(res, err.message || 'Erreur lors de la création du Changement.');
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/changements/:id
// ─────────────────────────────────────────────────────────────
const updateChangement = async (req, res) => {
  try {
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return R.notFound(res, 'Changement introuvable.');

    // Seul le Change Manager assigné ou un Admin peut modifier
    const isManager = changement.changeManager?.id_user === req.user.id_user;
    const isAdmin   = req.user.roles?.includes('ADMIN');
    if (!isManager && !isAdmin) {
      return R.forbidden(res, 'Seul le Change Manager assigné peut modifier ce Changement.');
    }

    const updated = await changementService.updateChangement(req.params.id, req.body);
    return R.success(res, { changement: updated }, 'Changement mis à jour.');
  } catch (err) {
    console.error('[CHG] updateChangement :', err);
    return R.serverError(res, err.message || 'Erreur lors de la mise à jour du Changement.');
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/changements/:id/status
// ─────────────────────────────────────────────────────────────
const updateChangementStatus = async (req, res) => {
  try {
    const { id_statut, commentaire } = req.body;

    if (!id_statut) {
      return R.badRequest(res, 'id_statut est obligatoire.', 'MISSING_STATUT');
    }

    // Vérifier que l'utilisateur a le droit de changer le statut
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return R.notFound(res, 'Changement introuvable.');

    // Change Manager assigné, Admin, ou Implémenteur (pour EN_COURS / IMPLEMENTE)
    const isManager      = changement.changeManager?.id_user === req.user.id_user;
    const isAdmin        = req.user.roles?.includes('ADMIN');
    const isImplementeur = req.user.roles?.includes('IMPLEMENTEUR');

    if (!isManager && !isAdmin && !isImplementeur) {
      return R.forbidden(res, 'Permission insuffisante pour changer le statut de ce Changement.');
    }

    const updated = await changementService.updateChangementStatus(
      req.params.id,
      id_statut,
      req.user.id_user,
      commentaire,
    );

    return R.success(res, { changement: updated }, `Statut mis à jour → ${updated.statut.code_statut}.`);
  } catch (err) {
    console.error('[CHG] updateChangementStatus :', err);
    return R.serverError(res, err.message || 'Erreur lors du changement de statut.');
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/changements/:id  — Clôture logique (soft delete ITIL)
// ─────────────────────────────────────────────────────────────
const cloturerChangement = async (req, res) => {
  try {
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return R.notFound(res, 'Changement introuvable.');

    // Seul le Change Manager assigné ou un Admin
    const isManager = changement.changeManager?.id_user === req.user.id_user;
    const isAdmin   = req.user.roles?.includes('ADMIN');
    if (!isManager && !isAdmin) {
      return R.forbidden(res, 'Seul le Change Manager assigné peut clôturer ce Changement.');
    }

    const { raison, reussite } = req.body;

    const updated = await changementService.cloturerChangement(
      req.params.id,
      req.user.id_user,
      raison  ?? 'Clôture manuelle.',
      reussite !== undefined ? Boolean(reussite) : true,
    );

    return R.success(res, { changement: updated }, 'Changement clôturé (conservation ITIL).');
  } catch (err) {
    console.error('[CHG] cloturerChangement :', err);
    return R.serverError(res, err.message || 'Erreur lors de la clôture du Changement.');
  }
};



// PIR
const createPir = async (req, res) => {
  try {
    const pir = await changementService.createPir(req.changement.id_changement, req.body);
    return R.success(res, { pir }, 'PIR créé avec succès.', 201);
  } catch (err) {
    if (err.code === 'PIR_ALREADY_EXISTS') return R.error(res, err.message, 409, err.code);
    console.error('[CHG-EXTRAS] createPir :', err);
    return R.serverError(res);
  }
};

const getPirByChangement = async (req, res) => {
  try {
    const pir = await changementService.getPirByChangement(req.changement.id_changement);
    if (!pir) return R.notFound(res, "Ce Changement n'a pas encore de PIR.");
    return R.success(res, { pir }, 'PIR récupéré.');
  } catch (err) {
    console.error('[CHG-EXTRAS] getPirByChangement :', err);
    return R.serverError(res);
  }
};

const updatePir = async (req, res) => {
  try {
    const pir = await changementService.updatePir(req.changement.id_changement, req.body);
    return R.success(res, { pir }, 'PIR mis à jour.');
  } catch (err) {
    if (err.code === 'P2025') return R.notFound(res, "Aucun PIR trouvé pour ce Changement.");
    console.error('[CHG-EXTRAS] updatePir :', err);
    return R.serverError(res);
  }
};

const deletePir = async (req, res) => {
  try {
    const result = await changementService.deletePir(req.changement.id_changement);
    return R.success(res, result, 'PIR supprimé.');
  } catch (err) {
    if (err.code === 'P2025') return R.notFound(res, "Aucun PIR trouvé pour ce Changement.");
    console.error('[CHG-EXTRAS] deletePir :', err);
    return R.serverError(res);
  }
};

// TESTS
const createTest = async (req, res) => {
  try {
    const test = await changementService.createTest(req.changement.id_changement, req.body);
    return R.success(res, { test }, 'Test créé avec succès.', 201);
  } catch (err) {
    console.error('[CHG-EXTRAS] createTest :', err);
    return R.serverError(res);
  }
};

const getTestsByChangement = async (req, res) => {
  try {
    const tests = await changementService.getTestsByChangement(req.changement.id_changement);
    return R.success(res, { tests, total: tests.length }, 'Tests récupérés.');
  } catch (err) {
    console.error('[CHG-EXTRAS] getTestsByChangement :', err);
    return R.serverError(res);
  }
};

const updateTest = async (req, res) => {
  try {
    const test = await changementService.updateTest(req.test.id_test, req.body);
    return R.success(res, { test }, 'Test mis à jour.');
  } catch (err) {
    console.error('[CHG-EXTRAS] updateTest :', err);
    return R.serverError(res);
  }
};

const deleteTest = async (req, res) => {
  try {
    const result = await changementService.deleteTest(req.test.id_test);
    return R.success(res, result, 'Test supprimé.');
  } catch (err) {
    console.error('[CHG-EXTRAS] deleteTest :', err);
    return R.serverError(res);
  }
};

module.exports = {
  getAllChangements,
  getChangementById,
  createChangement,
  updateChangement,
  updateChangementStatus,
  cloturerChangement,
  // PIR
  createPir, 
  getPirByChangement, 
  updatePir, 
  deletePir,
  // Tests
  createTest, 
  getTestsByChangement, 
  updateTest, 
  deleteTest,
};