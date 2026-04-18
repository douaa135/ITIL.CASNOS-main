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
const { success, badRequest, notFound, serverError, forbidden } = require('../utils/response.utils');

// ─────────────────────────────────────────────────────────────
// GET /api/changements
// ─────────────────────────────────────────────────────────────
const getAllChangements = async (req, res) => {
  try {
    const changements = await changementService.getAllChangements(req.query);
    return success(res, { changements, total: changements.length }, 'Liste des Changements récupérée.');
  } catch (err) {
    console.error('[CHG] getAllChangements :', err);
    return serverError(res, 'Erreur lors de la récupération des Changements.');
  }
};

// ─────────────────────────────────────────────────────────────
// GET /api/changements/:id
// ─────────────────────────────────────────────────────────────
const getChangementById = async (req, res) => {
  try {
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return notFound(res, 'Changement introuvable.');
    return success(res, { changement }, 'Changement récupéré.');
  } catch (err) {
    console.error('[CHG] getChangementById :', err);
    return serverError(res, 'Erreur lors de la récupération du Changement.');
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/changements
// ─────────────────────────────────────────────────────────────
const createChangement = async (req, res) => {
  try {
    const { id_env, id_rfc } = req.body;

    if (!id_env) {
      return badRequest(res, "id_env (environnement cible) est obligatoire.", 'MISSING_ENV');
    }

    // Seul un CHANGE_MANAGER ou ADMIN peut créer un Changement
    const canCreate = req.user.roles?.includes('CHANGE_MANAGER') || req.user.roles?.includes('ADMIN_SYSTEME');
    if (!canCreate) {
      return forbidden(res, 'Seul un Change Manager ou Admin peut créer un Changement.');
    }

    const changement = await changementService.createChangement(req.body, req.user.id_user);

    const message = id_rfc
      ? 'Changement créé depuis la RFC approuvée.'
      : 'Changement STANDARD créé sans RFC (pré-approuvé).';

    return success(res, { changement }, message, 201);
  } catch (err) {
    console.error('[CHG] createChangement :', err);
    return serverError(res, err.message || 'Erreur lors de la création du Changement.');
  }
};

// ─────────────────────────────────────────────────────────────
// PUT /api/changements/:id
// ─────────────────────────────────────────────────────────────
const updateChangement = async (req, res) => {
  try {
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return notFound(res, 'Changement introuvable.');

    // Seul le Change Manager assigné ou un Admin peut modifier
    const isManager = changement.changeManager?.id_user === req.user.id_user;
    const isAdmin   = req.user.roles?.includes('ADMIN_SYSTEME');
    if (!isManager && !isAdmin) {
      return forbidden(res, 'Seul le Change Manager assigné peut modifier ce Changement.');
    }

    const updated = await changementService.updateChangement(req.params.id, req.body);
    return success(res, { changement: updated }, 'Changement mis à jour.');
  } catch (err) {
    console.error('[CHG] updateChangement :', err);
    return serverError(res, err.message || 'Erreur lors de la mise à jour du Changement.');
  }
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/changements/:id/status
// ─────────────────────────────────────────────────────────────
const updateChangementStatus = async (req, res) => {
  try {
    const { id_statut, commentaire } = req.body;

    if (!id_statut) {
      return badRequest(res, 'id_statut est obligatoire.', 'MISSING_STATUT');
    }

    // Vérifier que l'utilisateur a le droit de changer le statut
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return notFound(res, 'Changement introuvable.');

    // Change Manager assigné, Admin, ou Implémenteur (pour EN_COURS / IMPLEMENTE)
    const isManager      = changement.changeManager?.id_user === req.user.id_user;
    const isAdmin        = req.user.roles?.includes('ADMIN_SYSTEME');
    const isImplementeur = req.user.roles?.includes('IMPLEMENTEUR');

    if (!isManager && !isAdmin && !isImplementeur) {
      return forbidden(res, 'Permission insuffisante pour changer le statut de ce Changement.');
    }

    const updated = await changementService.updateChangementStatus(
      req.params.id,
      id_statut,
      req.user.id_user,
      commentaire,
    );

    return success(res, { changement: updated }, `Statut mis à jour → ${updated.statut.code_statut}.`);
  } catch (err) {
    console.error('[CHG] updateChangementStatus :', err);
    return serverError(res, err.message || 'Erreur lors du changement de statut.');
  }
};

// ─────────────────────────────────────────────────────────────
// DELETE /api/changements/:id  — Clôture logique (soft delete ITIL)
// ─────────────────────────────────────────────────────────────
const cloturerChangement = async (req, res) => {
  try {
    const changement = await changementService.getChangementById(req.params.id);
    if (!changement) return notFound(res, 'Changement introuvable.');

    // Seul le Change Manager assigné ou un Admin
    const isManager = changement.changeManager?.id_user === req.user.id_user;
    const isAdmin   = req.user.roles?.includes('ADMIN_SYSTEME');
    if (!isManager && !isAdmin) {
      return forbidden(res, 'Seul le Change Manager assigné peut clôturer ce Changement.');
    }

    const { raison, reussite } = req.body;

    const updated = await changementService.cloturerChangement(
      req.params.id,
      req.user.id_user,
      raison  ?? 'Clôture manuelle.',
      reussite !== undefined ? Boolean(reussite) : true,
    );

    return success(res, { changement: updated }, 'Changement clôturé (conservation ITIL).');
  } catch (err) {
    console.error('[CHG] cloturerChangement :', err);
    return serverError(res, err.message || 'Erreur lors de la clôture du Changement.');
  }
};

module.exports = {
  getAllChangements,
  getChangementById,
  createChangement,
  updateChangement,
  updateChangementStatus,
  cloturerChangement,
};