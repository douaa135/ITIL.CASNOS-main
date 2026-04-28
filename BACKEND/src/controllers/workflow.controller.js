'use strict';

const workflowSvc = require('../services/workflow.service');
const R           = require('../utils/response.utils');

/**
 * POST /api/workflow/rfcs/:id_rfc/escalade
 * req.rfc est déjà injecté par le middleware checkEscaladeStatut.
 */
async function escaladeRfc(req, res) {
  try {
    const { id_rfc }         = req.params;
    const { motif }          = req.body;
    const { rfcUpdated, cmIds } = await workflowSvc.escaladerRfc(id_rfc, req.user.id_user);

    return R.success(
      res,
      { rfc: rfcUpdated, notifies: cmIds.length, motif: motif ?? null },
      `Escalade déclenchée — RFC ${req.rfc.code_rfc} passée en URGENCE. ${cmIds.length} Change Manager(s) et membres CAB notifiés.`
    );
  } catch (err) {
    console.error('[WORKFLOW] escalade :', err);
    return R.serverError(res);
  }
}

/**
 * GET /api/workflow/transitions/rfc
 */
function getTransitionsRfc(req, res) {
  return R.success(res, { transitions: workflowSvc.TRANSITIONS_RFC }, 'Matrice de transitions RFC.');
}

/**
 * GET /api/workflow/transitions/changement
 */
function getTransitionsChangement(req, res) {
  return R.success(res, { transitions: workflowSvc.TRANSITIONS_CHG }, 'Matrice de transitions Changement.');
}

/**
 * GET /api/workflow/transitions/tache
 */
function getTransitionsTache(req, res) {
  return R.success(res, { transitions: workflowSvc.TRANSITIONS_TCH }, 'Matrice de transitions Tâche.');
}

module.exports = {
  escaladeRfc,
  getTransitionsRfc,
  getTransitionsChangement,
  getTransitionsTache,
};