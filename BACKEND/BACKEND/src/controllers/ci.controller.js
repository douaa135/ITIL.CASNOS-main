'use strict';

/**
 * ============================================================
 * ci.controller.js — Orchestration CIs + Environnements
 * ============================================================
 * Validations   → ci.middleware.js
 * Logique DB    → ci.service.js
 * Ici           → appel service + réponse HTTP
 * ============================================================
 */

const ciService = require('../services/ci.service');
const R         = require('../utils/response.utils');

// ============================================================
// CONFIGURATION ITEMS
// ============================================================

const createCI = async (req, res) => {
  try {
    const ci = await ciService.createCI(req.body);
    return R.success(res, { ci }, 'Configuration Item créé avec succès.', 201);
  } catch (err) {
    if (err.code === 'CI_NAME_CONFLICT') return R.error(res, err.message, 409, err.code);
    if (err.code === 'ENV_NOT_FOUND')    return R.badRequest(res, err.message, err.code);
    console.error('[CI] createCI :', err);
    return R.serverError(res);
  }
};

const getAllCIs = async (req, res) => {
  try {
    const cis = await ciService.getAllCIs(req.query);
    return R.success(res, { cis, total: cis.length }, 'Configuration Items récupérés.');
  } catch (err) {
    console.error('[CI] getAllCIs :', err);
    return R.serverError(res);
  }
};

const getCIById = async (req, res) => {
  try {
    // req.ci déjà injecté par checkCIExists
    return R.success(res, { ci: req.ci }, 'Configuration Item récupéré.');
  } catch (err) {
    console.error('[CI] getCIById :', err);
    return R.serverError(res);
  }
};

const updateCI = async (req, res) => {
  try {
    const ci = await ciService.updateCI(req.ci.id_ci, req.body);
    return R.success(res, { ci }, 'Configuration Item mis à jour.');
  } catch (err) {
    if (err.code === 'CI_NAME_CONFLICT') return R.error(res, err.message, 409, err.code);
    console.error('[CI] updateCI :', err);
    return R.serverError(res);
  }
};

const deleteCI = async (req, res) => {
  try {
    const result = await ciService.deleteCI(req.ci.id_ci);
    return R.success(res, result, 'Configuration Item supprimé.');
  } catch (err) {
    if (err.code === 'CI_IN_USE') return R.error(res, err.message, 409, err.code);
    console.error('[CI] deleteCI :', err);
    return R.serverError(res);
  }
};

// ── Liaisons CI ↔ Environnement ──────────────────────────────

const addEnvironnement = async (req, res) => {
  try {
    const env = await ciService.addEnvironnement(req.ci.id_ci, req.environnement.id_env);
    return R.success(
      res,
      { ci_id: req.ci.id_ci, environnement: env },
      `CI "${req.ci.nom_ci}" lié à l'environnement "${env.nom_env}".`,
      201
    );
  } catch (err) {
    console.error('[CI] addEnvironnement :', err);
    return R.serverError(res);
  }
};

const removeEnvironnement = async (req, res) => {
  try {
    const result = await ciService.removeEnvironnement(req.ci.id_ci, req.params.id_env);
    return R.success(res, result, 'Lien CI ↔ Environnement supprimé.');
  } catch (err) {
    console.error('[CI] removeEnvironnement :', err);
    return R.serverError(res);
  }
};

const getEnvironnementsByCI = async (req, res) => {
  try {
    const envs = await ciService.getEnvironnementsByCI(req.ci.id_ci);
    return R.success(res, { environnements: envs, total: envs.length }, 'Environnements du CI récupérés.');
  } catch (err) {
    console.error('[CI] getEnvironnementsByCI :', err);
    return R.serverError(res);
  }
};

// ============================================================
// ENVIRONNEMENTS
// ============================================================

const getAllEnvironnements = async (req, res) => {
  try {
    const envs = await ciService.getAllEnvironnements();
    return R.success(res, { environnements: envs, total: envs.length }, 'Environnements récupérés.');
  } catch (err) {
    console.error('[ENV] getAllEnvironnements :', err);
    return R.serverError(res);
  }
};

const getEnvironnementById = async (req, res) => {
  try {
    // req.environnement déjà injecté par checkEnvExists
    return R.success(res, { environnement: req.environnement }, 'Environnement récupéré.');
  } catch (err) {
    console.error('[ENV] getEnvironnementById :', err);
    return R.serverError(res);
  }
};

const createEnvironnement = async (req, res) => {
  try {
    const env = await ciService.createEnvironnement(req.body);
    return R.success(res, { environnement: env }, 'Environnement créé avec succès.', 201);
  } catch (err) {
    if (err.code === 'ENV_NAME_CONFLICT') return R.error(res, err.message, 409, err.code);
    console.error('[ENV] createEnvironnement :', err);
    return R.serverError(res);
  }
};

const updateEnvironnement = async (req, res) => {
  try {
    const env = await ciService.updateEnvironnement(req.params.id_env, req.body);
    return R.success(res, { environnement: env }, 'Environnement mis à jour.');
  } catch (err) {
    if (err.code === 'ENV_NAME_CONFLICT') return R.error(res, err.message, 409, err.code);
    console.error('[ENV] updateEnvironnement :', err);
    return R.serverError(res);
  }
};

const deleteEnvironnement = async (req, res) => {
  try {
    const result = await ciService.deleteEnvironnement(req.params.id_env);
    return R.success(res, result, 'Environnement supprimé.');
  } catch (err) {
    if (err.code === 'ENV_IN_USE') return R.error(res, err.message, 409, err.code);
    console.error('[ENV] deleteEnvironnement :', err);
    return R.serverError(res);
  }
};

module.exports = {
  // CIs
  createCI,
  getAllCIs,
  getCIById,
  updateCI,
  deleteCI,
  addEnvironnement,
  removeEnvironnement,
  getEnvironnementsByCI,
  // Environnements
  getAllEnvironnements,
  getEnvironnementById,
  createEnvironnement,
  updateEnvironnement,
  deleteEnvironnement,
};