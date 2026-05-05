'use strict';

// ============================================================
// rapport.controller.js
// ============================================================

const svc = require('../services/rapport.service');
const R   = require('../utils/response.utils');

// ── KPI ───────────────────────────────────────────────────────
const getKpiDashboard = async (req, res) => {
  try {
    return R.success(res, await svc.getKpiDashboard(), 'Dashboard KPI ITIL.');
  } catch (err) { console.error('[KPI] dashboard :', err); return R.serverError(res); }
};

const getKpiRfc = async (req, res) => {
  try {
    return R.success(res, await svc.getKpiRfc(), 'KPI RFC.');
  } catch (err) { console.error('[KPI] rfc :', err); return R.serverError(res); }
};

const getKpiChangements = async (req, res) => {
  try {
    return R.success(res, await svc.getKpiChangements(), 'KPI Changements.');
  } catch (err) { console.error('[KPI] chg :', err); return R.serverError(res); }
};

const getKpiTaches = async (req, res) => {
  try {
    return R.success(res, await svc.getKpiTaches(), 'KPI Tâches.');
  } catch (err) { console.error('[KPI] tch :', err); return R.serverError(res); }
};

const getActivityTimeline = async (req, res) => {
  try {
    const days = req.query.days ?? 30;
    return R.success(res, await svc.getActivityTimeline(days), 'Timeline activité.');
  } catch (err) { console.error('[KPI] timeline :', err); return R.serverError(res); }
};

// ── Rapports RFC (table Rapport) ──────────────────────────────
const createRapport = async (req, res) => {
  try {
    const rapport = await svc.createRapport(req.params.id_rfc, req.body);
    return R.success(res, { rapport }, 'Rapport créé.', 201);
  } catch (err) {
    if (err.code === 'MISSING_TITRE') return R.badRequest(res, err.message, err.code);
    console.error('[RAPPORT] create :', err);
    return R.serverError(res);
  }
};

const getRapportsByRfc = async (req, res) => {
  try {
    const rapports = await svc.getRapportsByRfc(req.params.id_rfc);
    return R.success(res, { rapports, total: rapports.length }, 'Rapports récupérés.');
  } catch (err) { console.error('[RAPPORT] byRfc :', err); return R.serverError(res); }
};

const getRapportById = async (req, res) => {
  try {
    const rapport = await svc.getRapportById(req.params.id_rapport);
    if (!rapport) return R.notFound(res, 'Rapport introuvable.');
    return R.success(res, { rapport }, 'Rapport récupéré.');
  } catch (err) { console.error('[RAPPORT] byId :', err); return R.serverError(res); }
};

const deleteRapport = async (req, res) => {
  try {
    const result = await svc.deleteRapport(req.params.id_rapport);
    return R.success(res, result, 'Rapport supprimé.');
  } catch (err) { console.error('[RAPPORT] delete :', err); return R.serverError(res); }
};

// ── Audit Log ─────────────────────────────────────────────────
const getAuditLogs = async (req, res) => {
  try {
    const result = await svc.getAuditLogs(req.query);
    return R.success(res, result, "Journal d'audit récupéré.");
  } catch (err) { console.error('[AUDIT] logs :', err); return R.serverError(res); }
};

// ── Rapport complet RFC (temps réel — toute la chaîne ITIL) ───
/**
 * GET /api/rfc/:id_rfc/rapport-complet
 *
 * Retourne en temps réel le rapport exhaustif d'une RFC :
 *   RFC → CIs → Évaluation risque → Commentaires → Pièces jointes
 *   → Historique statuts
 *   → Changement(s) → Plan → Rollback → Tests → PIR
 *     → Tâches → Journaux d'exécution
 *   → Réunions CAB → Votes → Décisions
 *   → Statistiques calculées
 *   → Audit trail complet (toutes entités liées)
 */
const getFullRfcReport = async (req, res) => {
  try {
    const rapport = await svc.getFullRfcReport(req.params.id_rfc);
    return R.success(res, { rapport }, `Rapport complet RFC ${rapport.resume.code_rfc} généré.`);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[RAPPORT] fullRfc :', err);
    return R.serverError(res);
  }
};

module.exports = {
  getKpiDashboard,
  getKpiRfc,
  getKpiChangements,
  getKpiTaches,
  getActivityTimeline,
  createRapport,
  getRapportsByRfc,
  getRapportById,
  deleteRapport,
  getAuditLogs,
  getFullRfcReport,
};