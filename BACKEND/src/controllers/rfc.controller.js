const rfcService = require('../services/rfc.service');
const prisma     = require('../services/prisma.service');
const { success, badRequest, notFound, serverError, forbidden } = require('../utils/response.utils');

// GET /api/rfc
const getAllRfc = async (req, res) => {
  try {
    const rfcs = await rfcService.getAllRfc(req.query);
    return success(res, { rfcs, total: rfcs.length }, 'Liste des RFC récupérée.');
  } catch (err) {
    console.error('[RFC] getAllRfc :', err);
    return serverError(res, 'Erreur lors de la récupération des RFC.');
  }
};

// GET /api/rfc/:id
const getRfcById = async (req, res) => {
  try {
    const rfc = await rfcService.getRfcById(req.params.id);
    if (!rfc) return notFound(res, 'RFC introuvable.');
    return success(res, { rfc }, 'RFC récupérée.');
  } catch (err) {
    console.error('[RFC] getRfcById :', err);
    return serverError(res, 'Erreur lors de la récupération de la RFC.');
  }
};

// POST /api/rfc
const createRfc = async (req, res) => {
  try {
    const { titre_rfc, description, justification } = req.body;
    if (!titre_rfc || !description || !justification) {
      return badRequest(res, 'Champs obligatoires : titre_rfc, description, justification.', 'MISSING_FIELDS');
    }
    const rfc = await rfcService.createRfc(req.body, req.user.id_user);
    return success(res, { rfc }, 'RFC créée avec succès.', 201);
  } catch (err) {
    console.error('[RFC] createRfc :', err);
    return serverError(res, err.message || 'Erreur lors de la création de la RFC.');
  }
};

// PUT /api/rfc/:id  — modifier les champs texte
const updateRfc = async (req, res) => {
  try {
    const rfc = await rfcService.getRfcById(req.params.id);
    if (!rfc) return notFound(res, 'RFC introuvable.');

    const isOwner   = rfc.id_user === req.user.id_user;
    const isManager = req.user.roles?.includes('ADMIN_SYSTEME') || req.user.roles?.includes('CHANGE_MANAGER');
    if (!isOwner && !isManager) return forbidden(res, 'Vous ne pouvez modifier que vos propres RFC.');

    const statutsBloquants = ['APPROUVEE', 'CLOTUREE', 'REJETEE'];
    if (statutsBloquants.includes(rfc.statut.code_statut)) {
      return badRequest(res, `Impossible de modifier une RFC au statut "${rfc.statut.code_statut}".`, 'INVALID_STATUT');
    }

    const updated = await rfcService.updateRfc(req.params.id, req.body);
    return success(res, { rfc: updated }, 'RFC mise à jour.');
  } catch (err) {
    console.error('[RFC] updateRfc :', err);
    return serverError(res, 'Erreur lors de la mise à jour de la RFC.');
  }
};

// PATCH /api/rfc/:id/status  — changer le statut (workflow ITIL)
// Si statut = APPROUVEE → body doit contenir id_change_manager + id_env
const updateRfcStatus = async (req, res) => {
  try {
    const { id_statut, id_change_manager, id_env, commentaire, id_type } = req.body;

    if (!id_statut) {
      return badRequest(res, 'id_statut est obligatoire.', 'MISSING_STATUT');
    }

    // Récupérer le statut cible pour savoir si c'est une approbation
    const statutCible = await prisma.statut.findUnique({ where: { id_statut } });
    if (!statutCible) return notFound(res, 'Statut introuvable.');

    // Validation métier : approbation nécessite Change Manager + Environnement
    if (statutCible.code_statut === 'APPROUVEE') {
      if (!id_change_manager) {
        return badRequest(res, 'id_change_manager requis pour approuver une RFC.', 'MISSING_CHANGE_MANAGER');
      }
      if (!id_env) {
        return badRequest(res, 'id_env requis pour approuver une RFC.', 'MISSING_ENV');
      }
    }

    const result = await rfcService.updateRfcStatus(
      req.params.id,
      id_statut,
      id_change_manager,
      id_env,
      req.user.id_user,
      commentaire,
      id_type
    );


    const message = statutCible.code_statut === 'APPROUVEE'
      ? 'RFC approuvée — Changement créé automatiquement.'
      : `RFC passée au statut "${statutCible.libelle}".`;

    const responseData = { rfc: result.rfc };

    if (result.changement) {
      responseData.changement = result.changement;
    }

    return success(res, responseData, message);
    //return success(res, { rfc }, message);

  } catch (err) {
    console.error('[RFC] updateRfcStatus :', err);
    return serverError(res, err.message || 'Erreur lors du changement de statut.');
  }
};

// DELETE /api/rfc/:id/cancel
const cancelRfc = async (req, res) => {
  try {
    const rfc = await rfcService.getRfcById(req.params.id);
    if (!rfc) return notFound(res, 'RFC introuvable.');

    const isOwner   = rfc.id_user === req.user.id_user;
    const isManager = req.user.roles?.includes('ADMIN_SYSTEME') || req.user.roles?.includes('CHANGE_MANAGER');
    if (!isOwner && !isManager) return forbidden(res, 'Vous ne pouvez annuler que vos propres RFC.');

    const updated = await rfcService.cancelRfc(req.params.id);
    return success(res, { rfc: updated }, 'RFC annulée.');
  } catch (err) {
    console.error('[RFC] cancelRfc :', err);
    return serverError(res, 'Erreur lors de l\'annulation de la RFC.');
  }
};

// PUT /api/rfc/:id/evaluate
const evaluateRfc = async (req, res) => {
  try {
    const { impacte, probabilite, score_risque } = req.body;
    if (!impacte || !probabilite || !score_risque) {
      return badRequest(res, 'Impact, Probabilité et Score Risque sont obligatoires.', 'MISSING_DATA');
    }
    
    const rfc = await rfcService.evaluateRfc(req.params.id, req.body);
    return success(res, { rfc }, 'Évaluation enregistrée et RFC passée au statut Évaluée.');
  } catch (err) {
    console.error('[RFC] evaluateRfc :', err);
    return serverError(res, err.message || 'Erreur lors de l\'évaluation de la RFC.');
  }
};

module.exports = { 
  getAllRfc, 
  getRfcById, 
  createRfc, 
  updateRfc, 
  evaluateRfc,
  updateRfcStatus, 
  cancelRfc 
};