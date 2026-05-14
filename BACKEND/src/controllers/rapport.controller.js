'use strict';

// ============================================================
// rapport.controller.js
// ============================================================

const svc      = require('../services/rapport.service');
const R        = require('../utils/response.utils');
const auditSvc = require('../services/audit.service');
const prisma   = require('../services/prisma.service');

// ─── KPI ────────────────────────────────────────────────────
const getKpiDashboard     = async (req, res) => { try { return R.success(res, await svc.getKpiDashboard(),     'Dashboard KPI ITIL.'); } catch (err) { console.error('[KPI] dashboard :', err); return R.serverError(res); } };
const getKpiRfc           = async (req, res) => { try { return R.success(res, await svc.getKpiRfc(),           'KPI RFC.');           } catch (err) { console.error('[KPI] rfc :', err);       return R.serverError(res); } };
const getKpiChangements   = async (req, res) => { try { return R.success(res, await svc.getKpiChangements(),   'KPI Changements.');   } catch (err) { console.error('[KPI] chg :', err);       return R.serverError(res); } };
const getKpiTaches        = async (req, res) => { try { return R.success(res, await svc.getKpiTaches(),        'KPI Tâches.');        } catch (err) { console.error('[KPI] tch :', err);       return R.serverError(res); } };
const getActivityTimeline = async (req, res) => { try { const days = req.query.days ?? 30; return R.success(res, await svc.getActivityTimeline(days), 'Timeline.'); } catch (err) { console.error('[KPI] timeline :', err); return R.serverError(res); } };

// ─── Rapports — lecture globale ──────────────────────────────

/**
 * GET /rapports
 * Retourne tous les rapports (RFC + Changement).
 * Utilisé par le Centre de Rapports pour alimenter les KPIs et les maps.
 */
const getAllRapports = async (req, res) => {
  try {
    const rapports = await prisma.rapport.findMany({
      orderBy: { date_generation: 'desc' },
      select: {
        id_rapport:       true,
        titre_rapport:    true,
        type_rapport:     true,
        contenu_rapport:  true,
        code_metier:      true,
        date_generation:  true,
        // ✅ Clés de liaison — les deux doivent être retournées
        id_rfc:           true,
        id_changement:    true,
      },
    });
    return R.success(res, { rapports, total: rapports.length }, 'Rapports récupérés.');
  } catch (err) {
    console.error('[RAPPORT] getAll :', err);
    return R.serverError(res);
  }
};

// ─── Rapports RFC ────────────────────────────────────────────

/**
 * POST /rfc/:id_rfc/rapports
 */
const createRapport = async (req, res) => {
  try {
    const { id_rfc } = req.params;
    const rapport = await svc.createRapport(id_rfc, req.body);
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

// ─── Rapports Changement ─────────────────────────────────────

/**
 * POST /changements/:id_changement/rapports
 * ✅ NOUVEAU — crée un rapport lié à un changement avec id_changement correctement renseigné.
 */
const createRapportForChangement = async (req, res) => {
  try {
    const { id_changement } = req.params;
    const rapport = await svc.createRapportForChangement(id_changement, req.body);
    return R.success(res, { rapport }, 'Rapport de changement créé.', 201);
  } catch (err) {
    if (err.code === 'MISSING_TITRE') return R.badRequest(res, err.message, err.code);
    if (err.code === 'NOT_FOUND')     return R.notFound(res, err.message);
    console.error('[RAPPORT] createForChangement :', err);
    return R.serverError(res);
  }
};

const getRapportsByChangement = async (req, res) => {
  try {
    const rapports = await svc.getRapportsByChangement(req.params.id_changement);
    return R.success(res, { rapports, total: rapports.length }, 'Rapports récupérés.');
  } catch (err) { console.error('[RAPPORT] byChangement :', err); return R.serverError(res); }
};

// ─── Rapport individuel ──────────────────────────────────────

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

// ─── Audit Log ───────────────────────────────────────────────

const getAuditLogs = async (req, res) => {
  try {
    const result = await svc.getAuditLogs(req.query);
    return R.success(res, result, "Journal d'audit récupéré.");
  } catch (err) { console.error('[AUDIT] logs :', err); return R.serverError(res); }
};

const getFullRfcReport = async (req, res) => {
  try {
    const id_rfc = req.params.id_rfc;

    const rfc = await prisma.rfc.findUnique({
      where: { id_rfc },
      include: {
        statut:    { select: { code_statut: true, libelle: true } },
        demandeur: { select: { prenom_user: true, nom_user: true } },
      },
    });

    if (!rfc) return R.notFound(res, 'RFC introuvable.');

    const trail = await auditSvc.getAuditTrailByRfc(id_rfc);

    const resolveVal = async (val) => {
      if (!val || typeof val !== 'object') return val;
      const r = { ...val };

      if (r.id_env) {
        const env = await prisma.environnement.findUnique({ where: { id_env: r.id_env }, select: { nom_env: true } });
        r.environnement = env?.nom_env || r.id_env;
        delete r.id_env;
      }
      if (r.depuis_rfc) {
        const rfcRef = await prisma.rfc.findUnique({ where: { id_rfc: r.depuis_rfc }, select: { code_rfc: true, titre_rfc: true } });
        r.rfc = rfcRef ? `${rfcRef.code_rfc} — ${rfcRef.titre_rfc}` : r.depuis_rfc;
        delete r.depuis_rfc;
      }
      if (r.id_statut) {
        const statut = await prisma.statut.findUnique({ where: { id_statut: r.id_statut }, select: { libelle: true } });
        r.statut = statut?.libelle || r.statut || r.id_statut;
        delete r.id_statut;
      }
      if (r.id_change_manager) {
        const user = await prisma.utilisateur.findUnique({ where: { id_user: r.id_change_manager }, select: { prenom_user: true, nom_user: true } });
        r.change_manager = user ? `${user.prenom_user} ${user.nom_user}` : r.id_change_manager;
        delete r.id_change_manager;
      }
      if (r.changement_cree) {
        const chg = await prisma.changement.findUnique({ where: { id_changement: r.changement_cree }, select: { code_changement: true } });
        r.changement = chg?.code_changement || r.changement_cree;
        delete r.changement_cree;
      }

      return r;
    };

    const resolvedLogs = await Promise.all(
      trail.map(async (l) => ({
        ...l,
        ancienne_val: await resolveVal(l.ancienne_val),
        nouvelle_val: await resolveVal(l.nouvelle_val),
      }))
    );

    return R.success(res, {
      resume: {
        code_rfc:       rfc.code_rfc,
        titre_rfc:      rfc.titre_rfc,
        statut:         rfc.statut?.code_statut || 'inconnu',
        libelle_statut: rfc.statut?.libelle || '—',
        demandeur:      rfc.demandeur ? `${rfc.demandeur.prenom_user} ${rfc.demandeur.nom_user}` : '—',
      },
      logs: resolvedLogs,
      total: resolvedLogs.length,
    });
  } catch (err) { return R.serverError(res, err.message); }
};

const getFullChangementReport = async (req, res) => {
  try {
    const id_changement = req.params.id_changement;

    const changement = await prisma.changement.findUnique({
      where: { id_changement },
      include: {
        statut:        { select: { code_statut: true, libelle: true } },
        environnement: { select: { nom_env: true } },
        changeManager: { select: { prenom_user: true, nom_user: true } },
        taches:        { select: { id_tache: true } },
        tests:         { select: { id_test: true } },
        pir:           { select: { id_pir: true } },
        rfc:           { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
      },
    });

    if (!changement) return R.notFound(res, 'Changement introuvable.');

    const entityIds = [id_changement];
    changement.taches.forEach(t => entityIds.push(t.id_tache));
    changement.tests.forEach(t  => entityIds.push(t.id_test));
    if (changement.pir) entityIds.push(changement.pir.id_pir);

    const logs = await prisma.auditLog.findMany({
      where: {
        entite_id:   { in: [...new Set(entityIds)] },
        entite_type: { in: ['CHANGEMENT', 'TACHE', 'TEST', 'PIR'] },
      },
      orderBy: { date_action: 'asc' },
      select: {
        id_log: true, action: true, entite_type: true,
        entite_id: true, ancienne_val: true, nouvelle_val: true,
        date_action: true,
        utilisateur: { select: { prenom_user: true, nom_user: true, email_user: true } },
      },
    });

    const resolveLog = async (val) => {
      if (!val || typeof val !== 'object') return val;
      const resolved = { ...val };
      if (resolved.id_env) {
        const env = await prisma.environnement.findUnique({ where: { id_env: resolved.id_env }, select: { nom_env: true } });
        resolved.environnement = env?.nom_env || resolved.id_env;
        delete resolved.id_env;
      }
      if (resolved.depuis_rfc) {
        const rfc = await prisma.rfc.findUnique({ where: { id_rfc: resolved.depuis_rfc }, select: { code_rfc: true, titre_rfc: true } });
        resolved.rfc = rfc ? `${rfc.code_rfc} — ${rfc.titre_rfc}` : resolved.depuis_rfc;
        delete resolved.depuis_rfc;
      }
      if (resolved.id_statut) {
        const statut = await prisma.statut.findUnique({ where: { id_statut: resolved.id_statut }, select: { libelle: true } });
        resolved.statut = statut?.libelle || resolved.statut || resolved.id_statut;
        delete resolved.id_statut;
      }
      return resolved;
    };

    const resolvedLogs = await Promise.all(
      logs.map(async (l) => ({
        ...l,
        ancienne_val: await resolveLog(l.ancienne_val),
        nouvelle_val: await resolveLog(l.nouvelle_val),
      }))
    );

    return R.success(res, {
      resume: {
        code_changement: changement.code_changement,
        statut:          changement.statut?.code_statut || 'inconnu',
        libelle_statut:  changement.statut?.libelle || '—',
        environnement:   changement.environnement?.nom_env || '—',
        change_manager:  changement.changeManager
                           ? `${changement.changeManager.prenom_user} ${changement.changeManager.nom_user}`
                           : '—',
        rfc_liee:        changement.rfc?.code_rfc || null,
      },
      logs: resolvedLogs,
      total: resolvedLogs.length,
    });
  } catch (err) { return R.serverError(res, err.message); }
};

// ─── Exports ─────────────────────────────────────────────────
module.exports = {
  // KPI
  getKpiDashboard, getKpiRfc, getKpiChangements, getKpiTaches, getActivityTimeline,
  // Rapports globaux
  getAllRapports,
  // Rapports RFC
  createRapport, getRapportsByRfc,
  // Rapports Changement ✅
  createRapportForChangement, getRapportsByChangement,
  // Rapport individuel
  getRapportById, deleteRapport,
  // Audit
  getAuditLogs, getFullRfcReport, getFullChangementReport,
};