const rfcService = require('../services/rfc.service');
const prisma     = require('../services/prisma.service');
const R          = require('../utils/response.utils');

// GET /api/rfc
const getAllRfc = async (req, res) => {
  try {
    const rfcs = await rfcService.getAllRfc(req.query);
    return R.success(res, { rfcs, total: rfcs.length }, 'Liste des RFC récupérée.');
  } catch (err) {
    console.error('[RFC] getAllRfc :', err);
    return R.serverError(res, 'Erreur lors de la récupération des RFC.');
  }
};

// GET /api/rfc/:id
const getRfcById = async (req, res) => {
  try {
    const rfc = await rfcService.getRfcById(req.params.id);
    if (!rfc) return R.notFound(res, 'RFC introuvable.');
    return R.success(res, { rfc }, 'RFC récupérée.');
  } catch (err) {
    console.error('[RFC] getRfcById :', err);
    return R.serverError(res, 'Erreur lors de la récupération de la RFC.');
  }
};

// POST /api/rfc
const createRfc = async (req, res) => {
  try {
    const { titre_rfc, description, justification } = req.body;
    if (!titre_rfc || !description || !justification) {
      return R.badRequest(res, 'Champs obligatoires : titre_rfc, description, justification.', 'MISSING_FIELDS');
    }
    const rfc = await rfcService.createRfc(req.body, req.user.id_user);
    return R.success(res, { rfc }, 'RFC créée avec succès.', 201);
  } catch (err) {
    console.error('[RFC] createRfc :', err);
    return R.serverError(res, 'Erreur lors de la création de la RFC.');
  }
};

// PUT /api/rfc/:id  — modifier les champs texte
const updateRfc = async (req, res) => {
  try {
    const rfc = await rfcService.getRfcById(req.params.id);
    if (!rfc) return R.notFound(res, 'RFC introuvable.');

    const isOwner   = rfc.id_user === req.user.id_user;
    const isManager = req.user.roles?.includes('ADMIN') || req.user.roles?.includes('CHANGE_MANAGER');
    if (!isOwner && !isManager) return R.forbidden(res, 'Vous ne pouvez modifier que vos propres RFC.');

    const statutsBloquants = ['APPROUVEE', 'CLOTUREE', 'REJETEE'];
    if (statutsBloquants.includes(rfc.statut.code_statut)) {
      return R.badRequest(res, `Impossible de modifier une RFC au statut "${rfc.statut.code_statut}".`, 'INVALID_STATUT');
    }

    const updated = await rfcService.updateRfc(req.params.id, req.body);
    return R.success(res, { rfc: updated }, 'RFC mise à jour.');
  } catch (err) {
    console.error('[RFC] updateRfc :', err);
    return R.serverError(res, 'Erreur lors de la mise à jour de la RFC.');
  }
};

// PATCH /api/rfc/:id/status  — changer le statut (workflow ITIL)
// Si statut = APPROUVEE → body doit contenir id_change_manager + id_env
const updateRfcStatus = async (req, res) => {
  try {
    const { id_statut, id_change_manager, id_env, date_debut, date_fin_prevu } = req.body;

    if (!id_statut) {
      return R.badRequest(res, 'id_statut est obligatoire.', 'MISSING_STATUT');
    }

    // Récupérer le statut cible pour savoir si c'est une approbation
    const statutCible = await prisma.statut.findUnique({ where: { id_statut } });
    if (!statutCible) return R.notFound(res, 'Statut introuvable.');

    // Validation métier : approbation nécessite Change Manager + Environnement
    if (statutCible.code_statut === 'APPROUVEE') {
      if (!id_change_manager) {
        return R.badRequest(res, 'id_change_manager requis pour approuver une RFC.', 'MISSING_CHANGE_MANAGER');
      }
      if (!id_env) {
        return R.badRequest(res, 'id_env requis pour approuver une RFC.', 'MISSING_ENV');
      }
    }

    const result = await rfcService.updateRfcStatus(
      req.params.id,
      id_statut,
      id_change_manager,
      id_env,
      { date_debut, date_fin_prevu }
    );

    const message = statutCible.code_statut === 'APPROUVEE'
      ? 'RFC approuvée — Changement créé automatiquement.'
      : `RFC passée au statut "${statutCible.libelle}".`;

    const responseData = { rfc: result.rfc };

    if (result.changement) {
      responseData.changement = result.changement;
    }

    return R.success(res, responseData, message);
    //return R.success(res, { rfc }, message);

  } catch (err) {
    console.error('[RFC] updateRfcStatus :', err);
    return R.serverError(res, err.message || 'Erreur lors du changement de statut.');
  }
};

// DELETE /api/rfc/:id/cancel
const cancelRfc = async (req, res) => {
  try {
    const rfc = await rfcService.getRfcById(req.params.id);
    if (!rfc) return R.notFound(res, 'RFC introuvable.');

    const isOwner   = rfc.id_user === req.user.id_user;
    const isManager = req.user.roles?.includes('ADMIN') || req.user.roles?.includes('CHANGE_MANAGER');
    if (!isOwner && !isManager) return R.forbidden(res, 'Vous ne pouvez annuler que vos propres RFC.');

    const updated = await rfcService.cancelRfc(req.params.id);
    return R.success(res, { rfc: updated }, 'RFC annulée.');
  } catch (err) {
    console.error('[RFC] cancelRfc :', err);
    return R.serverError(res, 'Erreur lors de l\'annulation de la RFC.');
  }
};

// ── COMMENTAIRES ─────────────────────────────────────────────
 
const createCommentaire = async (req, res) => {
  try {
    const commentaire = await rfcService.createCommentaire(
      req.rfc.id_rfc,
      req.user.id_user,
      req.body.contenu,
    );
    return R.success(res, { commentaire }, 'Commentaire ajouté.', 201);
  } catch (err) {
    console.error('[RFC-EXTRAS] createCommentaire :', err);
    return R.serverError(res);
  }
};
 
const getCommentairesByRfc = async (req, res) => {
  try {
    const commentaires = await rfcService.getCommentairesByRfc(req.rfc.id_rfc);
    return R.success(res, { commentaires, total: commentaires.length }, 'Commentaires récupérés.');
  } catch (err) {
    console.error('[RFC-EXTRAS] getCommentairesByRfc :', err);
    return R.serverError(res);
  }
};
 
const updateCommentaire = async (req, res) => {
  try {
    const commentaire = await rfcService.updateCommentaire(req.commentaire.id_commentaire, req.body.contenu);
    return R.success(res, { commentaire }, 'Commentaire mis à jour.');
  } catch (err) {
    console.error('[RFC-EXTRAS] updateCommentaire :', err);
    return R.serverError(res);
  }
};
 
const deleteCommentaire = async (req, res) => {
  try {
    const result = await rfcService.deleteCommentaire(req.commentaire.id_commentaire);
    return R.success(res, result, 'Commentaire supprimé.');
  } catch (err) {
    console.error('[RFC-EXTRAS] deleteCommentaire :', err);
    return R.serverError(res);
  }
};
 
// ── ÉVALUATION DE RISQUE ─────────────────────────────────────
 
const upsertEvaluationRisque = async (req, res) => {
  try {
    const evaluation = await rfcService.upsertEvaluationRisque(req.rfc.id_rfc, req.body);
    const isNew = !req.rfc.evaluationRisque;
    return R.success(res, { evaluation }, 'Évaluation de risque enregistrée.', isNew ? 201 : 200);
  } catch (err) {
    console.error('[RFC-EXTRAS] upsertEvaluationRisque :', err);
    return R.serverError(res);
  }
};
 
const getEvaluationRisqueByRfc = async (req, res) => {
  try {
    const evaluation = await rfcService.getEvaluationRisqueByRfc(req.rfc.id_rfc);
    if (!evaluation) return R.notFound(res, "Cette RFC n'a pas encore d'évaluation de risque.");
    return R.success(res, { evaluation }, 'Évaluation de risque récupérée.');
  } catch (err) {
    console.error('[RFC-EXTRAS] getEvaluationRisqueByRfc :', err);
    return R.serverError(res);
  }
};
 
const deleteEvaluationRisque = async (req, res) => {
  try {
    const result = await rfcService.deleteEvaluationRisque(req.rfc.id_rfc);
    return R.success(res, result, 'Évaluation de risque supprimée.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[RFC-EXTRAS] deleteEvaluationRisque :', err);
    return R.serverError(res);
  }
};
 
// ── PIÈCES JOINTES ────────────────────────────────────────────
 
const createPieceJointe = async (req, res) => {
  try {
    const piece = await rfcService.createPieceJointe(req.rfc.id_rfc, req.body);
    return R.success(res, { piece }, 'Pièce jointe enregistrée.', 201);
  } catch (err) {
    console.error('[RFC-EXTRAS] createPieceJointe :', err);
    return R.serverError(res);
  }
};
 
const getPiecesJointesByRfc = async (req, res) => {
  try {
    const pieces = await rfcService.getPiecesJointesByRfc(req.rfc.id_rfc);
    return R.success(res, { pieces, total: pieces.length }, 'Pièces jointes récupérées.');
  } catch (err) {
    console.error('[RFC-EXTRAS] getPiecesJointesByRfc :', err);
    return R.serverError(res);
  }
};
 
const deletePieceJointe = async (req, res) => {
  try {
    const result = await rfcService.deletePieceJointe(req.pieceJointe.id_piece);
    return R.success(res, result, 'Pièce jointe supprimée.');
  } catch (err) {
    console.error('[RFC-EXTRAS] deletePieceJointe :', err);
    return R.serverError(res);
  }
};

module.exports = { 
  getAllRfc, 
  getRfcById, 
  createRfc, 
  updateRfc, 
  updateRfcStatus, 
  cancelRfc,
  // Commentaires
  createCommentaire, 
  getCommentairesByRfc, 
  updateCommentaire, 
  deleteCommentaire,
  // Évaluation de risque
  upsertEvaluationRisque, 
  getEvaluationRisqueByRfc, 
  deleteEvaluationRisque,
  // Pièces jointes
  createPieceJointe, 
  getPiecesJointesByRfc, 
  deletePieceJointe,
};