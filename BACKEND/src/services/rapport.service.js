'use strict';

/**
 * ============================================================
 * rapport.service.js — KPI Dashboard + Rapports RFC
 * ============================================================
 * KPI GLOBAUX
 *   getKpiDashboard()          → vue d'ensemble ITIL
 *   getKpiRfc()                → métriques RFC
 *   getKpiChangements()        → métriques Changements
 *   getKpiTaches()             → métriques Tâches
 *   getActivityTimeline(days)  → activité sur N jours
 *
 * RAPPORTS RFC (table Rapport)
 *   createRapport(id_rfc, data)
 *   getRapportsByRfc(id_rfc)
 *   getRapportById(id_rapport)
 *   deleteRapport(id_rapport)
 *
 * AUDIT LOG (lecture seule)
 *   getAuditLogs(filters)
 * ============================================================
 */

const prisma = require('./prisma.service');
const { codeRapport } = require('../utils/entity-code.utils');

// ============================================================
// KPI GLOBAUX
// ============================================================

/**
 * Vue d'ensemble complète — chiffres clés pour le dashboard.
 */
async function getKpiDashboard() {
  const [
    rfcTotal,
    rfcParStatut,
    changementTotal,
    changementParStatut,
    tacheTotal,
    tacheParStatut,
    tauxReussiteChangement,
  ] = await Promise.all([
    // Total RFC
    prisma.rfc.count(),

    // RFC par statut
    prisma.rfc.groupBy({
      by:       ['id_statut'],
      _count:   { id_rfc: true },
    }),

    // Total Changements
    prisma.changement.count(),

    // Changements par statut
    prisma.changement.groupBy({
      by:     ['id_statut'],
      _count: { id_changement: true },
    }),

    // Total Tâches
    prisma.tache.count(),

    // Tâches par statut
    prisma.tache.groupBy({
      by:     ['id_statut'],
      _count: { id_tache: true },
    }),

    // Taux de réussite Changements clôturés
    prisma.changement.findMany({
      where:  { statut: { code_statut: 'CLOTURE' } },
      select: { reussite: true },
    }),
  ]);

  // Résolution des libellés de statut
  const statuts = await prisma.statut.findMany({
    select: { id_statut: true, code_statut: true, libelle: true, contexte: true },
  });
  const statutMap = Object.fromEntries(statuts.map(s => [s.id_statut, s]));

  const rfcParStatutLabelle = rfcParStatut.map(row => ({
    statut:  statutMap[row.id_statut]?.code_statut ?? row.id_statut,
    libelle: statutMap[row.id_statut]?.libelle ?? '',
    count:   row._count.id_rfc,
  }));

  const chgParStatutLabelle = changementParStatut.map(row => ({
    statut:  statutMap[row.id_statut]?.code_statut ?? row.id_statut,
    libelle: statutMap[row.id_statut]?.libelle ?? '',
    count:   row._count.id_changement,
  }));

  const tacheParStatutLabelle = tacheParStatut.map(row => ({
    statut:  statutMap[row.id_statut]?.code_statut ?? row.id_statut,
    libelle: statutMap[row.id_statut]?.libelle ?? '',
    count:   row._count.id_tache,
  }));

  // Taux de réussite
  const clotures  = tauxReussiteChangement.length;
  const reussis   = tauxReussiteChangement.filter(c => c.reussite === true).length;
  const tauxRéussite = clotures > 0 ? Math.round((reussis / clotures) * 100) : null;

  return {
    rfc: {
      total:      rfcTotal,
      par_statut: rfcParStatutLabelle,
    },
    changements: {
      total:           changementTotal,
      par_statut:      chgParStatutLabelle,
      taux_reussite:   tauxRéussite !== null ? `${tauxRéussite}%` : 'N/A',
    },
    taches: {
      total:      tacheTotal,
      par_statut: tacheParStatutLabelle,
    },
    generated_at: new Date().toISOString(),
  };
}

/**
 * Métriques RFC détaillées.
 */
async function getKpiRfc() {
  const [total, parType, parPriorite, urgentes, delaiMoyen] = await Promise.all([
    prisma.rfc.count(),

    // Par type
    prisma.rfc.groupBy({
      by:     ['id_type'],
      _count: { id_rfc: true },
    }),

    // Par priorité
    prisma.rfc.groupBy({
      by:     ['id_priorite'],
      _count: { id_rfc: true },
    }),

    // Urgentes
    prisma.rfc.count({ where: { urgence: true } }),

    // Délai moyen BROUILLON → APPROUVEE (via StatutHistory)
    // Simplifié : on compare date_creation et date_cloture des approuvées
    prisma.rfc.aggregate({
      where: { statut: { code_statut: 'APPROUVEE' } },
      _count: { id_rfc: true },
    }),
  ]);

  const types     = await prisma.typeRfc.findMany({ select: { id_type: true, type: true } });
  const priorites = await prisma.priorite.findMany({ select: { id_priorite: true, code_priorite: true, libelle: true } });

  const typeMap     = Object.fromEntries(types.map(t => [t.id_type, t.type]));
  const prioriteMap = Object.fromEntries(priorites.map(p => [p.id_priorite, `${p.code_priorite} — ${p.libelle}`]));

  return {
    total,
    urgentes,
    approuvees: delaiMoyen._count.id_rfc,
    par_type: parType.map(r => ({
      type:  typeMap[r.id_type] ?? r.id_type,
      count: r._count.id_rfc,
    })),
    par_priorite: parPriorite.map(r => ({
      priorite: prioriteMap[r.id_priorite] ?? r.id_priorite,
      count:    r._count.id_rfc,
    })),
  };
}

/**
 * Métriques Changements détaillées.
 */
async function getKpiChangements() {
  const [total, parEnv, reussis, echecs, enCours] = await Promise.all([
    prisma.changement.count(),
    prisma.changement.groupBy({
      by:     ['id_env'],
      _count: { id_changement: true },
    }),
    prisma.changement.count({ where: { reussite: true } }),
    prisma.changement.count({ where: { reussite: false } }),
    prisma.changement.count({ where: { statut: { code_statut: 'EN_COURS' } } }),
  ]);

  const envs = await prisma.environnement.findMany({ select: { id_env: true, nom_env: true } });
  const envMap = Object.fromEntries(envs.map(e => [e.id_env, e.nom_env]));

  return {
    total,
    en_cours:      enCours,
    reussis,
    echecs,
    taux_reussite: total > 0 ? `${Math.round(((reussis) / (reussis + echecs || 1)) * 100)}%` : 'N/A',
    par_environnement: parEnv.map(r => ({
      environnement: envMap[r.id_env] ?? r.id_env,
      count:         r._count.id_changement,
    })),
  };
}

/**
 * Métriques Tâches.
 */
async function getKpiTaches() {
  const [total, terminees, annulees, enCours] = await Promise.all([
    prisma.tache.count(),
    prisma.tache.count({ where: { statut: { code_statut: 'TERMINEE' } } }),
    prisma.tache.count({ where: { statut: { code_statut: 'ANNULEE'  } } }),
    prisma.tache.count({ where: { statut: { code_statut: 'EN_COURS' } } }),
  ]);

  return {
    total,
    en_cours:      enCours,
    terminees,
    annulees,
    taux_completion: total > 0 ? `${Math.round((terminees / total) * 100)}%` : 'N/A',
  };
}

/**
 * Timeline d'activité sur les N derniers jours.
 * Retourne RFC créées + Changements créés par jour.
 * @param {number} days — par défaut 30
 */
async function getActivityTimeline(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const [rfcs, changements] = await Promise.all([
    prisma.rfc.findMany({
      where:  { date_creation: { gte: since } },
      select: { date_creation: true },
      orderBy: { date_creation: 'asc' },
    }),
    prisma.changement.findMany({
      where:  { date_creation: { gte: since } },
      select: { date_creation: true },
      orderBy: { date_creation: 'asc' },
    }),
  ]);

  // Agréger par jour (YYYY-MM-DD)
  const toDay = (d) => d.toISOString().split('T')[0];

  const rfcByDay = rfcs.reduce((acc, r) => {
    const day = toDay(r.date_creation);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  const chgByDay = changements.reduce((acc, c) => {
    const day = toDay(c.date_creation);
    acc[day] = (acc[day] ?? 0) + 1;
    return acc;
  }, {});

  // Fusionner toutes les dates
  const allDays = [...new Set([...Object.keys(rfcByDay), ...Object.keys(chgByDay)])].sort();

  return {
    periode: `${days} derniers jours`,
    depuis:  since.toISOString().split('T')[0],
    timeline: allDays.map(day => ({
      date:        day,
      rfc:         rfcByDay[day]  ?? 0,
      changements: chgByDay[day] ?? 0,
    })),
  };
}

// ============================================================
// RAPPORTS RFC (table Rapport)
// ============================================================

const RAPPORT_SELECT = {
  id_rapport:      true,
  code_metier:     true,
  titre_rapport:   true,
  type_rapport:    true,
  contenu_rapport: true,
  date_generation: true,
  id_rfc:          true,
  rfc: {
    select: { id_rfc: true, code_rfc: true, titre_rfc: true },
  },
};

async function createRapport(id_rfc, data) {
  const { titre_rapport, type_rapport = null, contenu_rapport = null } = data;
  if (!titre_rapport) throw Object.assign(new Error('"titre_rapport" est obligatoire.'), { code: 'MISSING_TITRE' });

  return prisma.rapport.create({
    data: {
      code_metier:     codeRapport(),
      titre_rapport:   titre_rapport.trim(),
      type_rapport,
      contenu_rapport,
      id_rfc,
    },
    select: RAPPORT_SELECT,
  });
}

async function getRapportsByRfc(id_rfc) {
  return prisma.rapport.findMany({
    where:   { id_rfc },
    orderBy: { date_generation: 'desc' },
    select:  RAPPORT_SELECT,
  });
}

async function getRapportById(id_rapport) {
  return prisma.rapport.findUnique({
    where:  { id_rapport },
    select: RAPPORT_SELECT,
  });
}

async function deleteRapport(id_rapport) {
  await prisma.rapport.delete({ where: { id_rapport } });
  return { deleted: true, id_rapport };
}

// ============================================================
// AUDIT LOG (lecture seule — admin)
// ============================================================

async function getAuditLogs(filters = {}) {
  const { entite_type, id_user, action, page = 1, limit = 50 } = filters;
  const skip = (Number(page) - 1) * Number(limit);

  const where = {
    ...(entite_type && { entite_type }),
    ...(id_user     && { id_user }),
    ...(action      && { action }),
  };

  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where,
      skip,
      take:    Number(limit),
      orderBy: { date_action: 'desc' },
      select: {
        id_log:       true,
        action:       true,
        entite_type:  true,
        entite_id:    true,
        ancienne_val: true,
        nouvelle_val: true,
        date_action:  true,
        utilisateur: {
          select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
        },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    logs,
    total,
    page:  Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
}

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
};