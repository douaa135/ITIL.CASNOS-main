'use strict';

/**
 * ============================================================
 * rapport.service.js — KPI + Rapports RFC + Rapport complet RFC
 * ============================================================
 * NOUVEAU : getFullRfcReport(id_rfc)
 *   Génère en temps réel le rapport complet d'une RFC :
 *   RFC → Évaluation risque → CIs → Commentaires → Pièces jointes
 *     → Changement(s) → Plan → Rollback → Tâches → Journaux
 *     → Tests → PIR → Réunions CAB → Votes → Décisions
 *     → Historique statuts → Audit trail complet
 * ============================================================
 */
// ============================================================
// rapport.service.js
// ============================================================

const prisma     = require('./prisma.service');
const auditSvc   = require('./audit.service');
const { codeRapport } = require('../utils/entity-code.utils');

// ============================================================
// KPI GLOBAUX
// ============================================================

async function getKpiDashboard() {
  const [
    rfcTotal, rfcParStatut,
    changementTotal, changementParStatut,
    tacheTotal, tacheParStatut,
    tauxReussiteChangement,
  ] = await Promise.all([
    prisma.rfc.count(),
    prisma.rfc.groupBy({ by: ['id_statut'], _count: { id_rfc: true } }),
    prisma.changement.count(),
    prisma.changement.groupBy({ by: ['id_statut'], _count: { id_changement: true } }),
    prisma.tache.count(),
    prisma.tache.groupBy({ by: ['id_statut'], _count: { id_tache: true } }),
    prisma.changement.findMany({
      where:  { statut: { code_statut: 'CLOTUREE' } },
      select: { reussite: true },
    }),
  ]);

  const statuts   = await prisma.statut.findMany({ select: { id_statut: true, code_statut: true, libelle: true, contexte: true } });
  const statutMap = Object.fromEntries(statuts.map(s => [s.id_statut, s]));

  const clotures      = tauxReussiteChangement.length;
  const reussis       = tauxReussiteChangement.filter(c => c.reussite === true).length;
  const tauxRéussite  = clotures > 0 ? Math.round((reussis / clotures) * 100) : null;

  return {
    rfc: {
      total:      rfcTotal,
      par_statut: rfcParStatut.map(r => ({
        statut:  statutMap[r.id_statut]?.code_statut ?? r.id_statut,
        libelle: statutMap[r.id_statut]?.libelle ?? '',
        count:   r._count.id_rfc,
      })),
    },
    changements: {
      total:         changementTotal,
      par_statut:    changementParStatut.map(r => ({
        statut:  statutMap[r.id_statut]?.code_statut ?? r.id_statut,
        libelle: statutMap[r.id_statut]?.libelle ?? '',
        count:   r._count.id_changement,
      })),
      taux_reussite: tauxRéussite !== null ? `${tauxRéussite}%` : 'N/A',
    },
    taches: {
      total:      tacheTotal,
      par_statut: tacheParStatut.map(r => ({
        statut:  statutMap[r.id_statut]?.code_statut ?? r.id_statut,
        libelle: statutMap[r.id_statut]?.libelle ?? '',
        count:   r._count.id_tache,
      })),
    },
    generated_at: new Date().toISOString(),
  };
}

async function getKpiRfc() {
  const [total, parType, parPriorite, urgentes, approuvees] = await Promise.all([
    prisma.rfc.count(),
    prisma.rfc.groupBy({ by: ['id_type'],     _count: { id_rfc: true } }),
    prisma.rfc.groupBy({ by: ['id_priorite'], _count: { id_rfc: true } }),
    prisma.rfc.count({ where: { urgence: true } }),
    prisma.rfc.count({ where: { statut: { code_statut: 'APPROUVEE' } } }),
  ]);
  const [types, priorites] = await Promise.all([
    prisma.typeRfc.findMany({ select: { id_type: true, type: true } }),
    prisma.priorite.findMany({ select: { id_priorite: true, code_priorite: true, libelle: true } }),
  ]);
  const typeMap     = Object.fromEntries(types.map(t    => [t.id_type,     t.type]));
  const prioriteMap = Object.fromEntries(priorites.map(p => [p.id_priorite, `${p.code_priorite} — ${p.libelle}`]));
  return {
    total, urgentes, approuvees,
    par_type:     parType.map(r    => ({ type:     typeMap[r.id_type]         ?? r.id_type,     count: r._count.id_rfc })),
    par_priorite: parPriorite.map(r => ({ priorite: prioriteMap[r.id_priorite] ?? r.id_priorite, count: r._count.id_rfc })),
  };
}

async function getKpiChangements() {
  const [total, parEnv, reussis, echecs, enCours] = await Promise.all([
    prisma.changement.count(),
    prisma.changement.groupBy({ by: ['id_env'], _count: { id_changement: true } }),
    prisma.changement.count({ where: { reussite: true } }),
    prisma.changement.count({ where: { reussite: false } }),
    prisma.changement.count({ where: { statut: { code_statut: 'EN_COURS' } } }),
  ]);
  const envs   = await prisma.environnement.findMany({ select: { id_env: true, nom_env: true } });
  const envMap = Object.fromEntries(envs.map(e => [e.id_env, e.nom_env]));
  return {
    total, en_cours: enCours, reussis, echecs,
    taux_reussite:     total > 0 ? `${Math.round((reussis / (reussis + echecs || 1)) * 100)}%` : 'N/A',
    par_environnement: parEnv.map(r => ({ environnement: envMap[r.id_env] ?? r.id_env, count: r._count.id_changement })),
  };
}

async function getKpiTaches() {
  const [total, terminees, annulees, enCours] = await Promise.all([
    prisma.tache.count(),
    prisma.tache.count({ where: { statut: { code_statut: 'TERMINEE' } } }),
    prisma.tache.count({ where: { statut: { code_statut: 'ANNULEE'  } } }),
    prisma.tache.count({ where: { statut: { code_statut: 'EN_COURS' } } }),
  ]);
  return {
    total, en_cours: enCours, terminees, annulees,
    taux_completion: total > 0 ? `${Math.round((terminees / total) * 100)}%` : 'N/A',
  };
}

async function getActivityTimeline(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - Number(days));
  const [rfcs, changements] = await Promise.all([
    prisma.rfc.findMany({ where: { date_creation: { gte: since } }, select: { date_creation: true }, orderBy: { date_creation: 'asc' } }),
    prisma.changement.findMany({ where: { date_creation: { gte: since } }, select: { date_creation: true }, orderBy: { date_creation: 'asc' } }),
  ]);
  const toDay    = (d) => d.toISOString().split('T')[0];
  const rfcByDay = rfcs.reduce((acc, r)       => { const d = toDay(r.date_creation); acc[d] = (acc[d] ?? 0) + 1; return acc; }, {});
  const chgByDay = changements.reduce((acc, c) => { const d = toDay(c.date_creation); acc[d] = (acc[d] ?? 0) + 1; return acc; }, {});
  const allDays  = [...new Set([...Object.keys(rfcByDay), ...Object.keys(chgByDay)])].sort();
  return {
    periode:  `${days} derniers jours`,
    depuis:   since.toISOString().split('T')[0],
    timeline: allDays.map(day => ({ date: day, rfc: rfcByDay[day] ?? 0, changements: chgByDay[day] ?? 0 })),
  };
}

// ============================================================
// RAPPORTS — sélection commune
// ============================================================

const RAPPORT_SELECT = {
  id_rapport:      true,
  code_metier:     true,
  titre_rapport:   true,
  type_rapport:    true,
  contenu_rapport: true,
  date_generation: true,
  id_rfc:          true,   
  id_changement:   true,   
  rfc:          { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
  changement:   { select: { id_changement: true, code_changement: true } },
};

// ============================================================
// RAPPORTS RFC
// ============================================================

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
      id_changement: null, 
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

// ============================================================
// RAPPORTS CHANGEMENT  
// ============================================================

/**
 * Crée un rapport lié à un changement.
 * id_changement est explicitement renseigné ; id_rfc reste null.
 */
async function createRapportForChangement(id_changement, data) {
  const { titre_rapport, type_rapport = 'Post-Implémentation', contenu_rapport = null, code_metier = null } = data;
  if (!titre_rapport) throw Object.assign(new Error('"titre_rapport" est obligatoire.'), { code: 'MISSING_TITRE' });
  return prisma.rapport.create({
    data: {
      code_metier:     code_metier ?? codeRapport(),
      titre_rapport:   titre_rapport.trim(),
      type_rapport,
      contenu_rapport,
      id_changement,   
      id_rfc: null,    
    },
    select: RAPPORT_SELECT,
  });
}

/**
 * Retourne tous les rapports d'un changement.
 */
async function getRapportsByChangement(id_changement) {
  return prisma.rapport.findMany({
    where:   { id_changement },
    orderBy: { date_generation: 'desc' },
    select:  RAPPORT_SELECT,
  });
}

// ============================================================
// RAPPORT INDIVIDUEL
// ============================================================

async function getRapportById(id_rapport) {
  return prisma.rapport.findUnique({ where: { id_rapport }, select: RAPPORT_SELECT });
}

async function deleteRapport(id_rapport) {
  await prisma.rapport.delete({ where: { id_rapport } });
  return { deleted: true, id_rapport };
}

// ============================================================
// AUDIT LOG
// ============================================================

async function getAuditLogs(filters = {}) {
  const { entite_type, id_user, action, page = 1, limit = 50 } = filters;
  const skip  = (Number(page) - 1) * Number(limit);
  const where = {
    ...(entite_type && { entite_type }),
    ...(id_user     && { id_user }),
    ...(action      && { action }),
  };
  const [logs, total] = await prisma.$transaction([
    prisma.auditLog.findMany({
      where, skip, take: Number(limit), orderBy: { date_action: 'desc' },
      select: {
        id_log: true, action: true, entite_type: true, entite_id: true,
        ancienne_val: true, nouvelle_val: true, date_action: true,
        utilisateur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { logs, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) };
}

// ============================================================
// RAPPORT COMPLET RFC (temps réel — toute la chaîne ITIL)
// ============================================================

async function getFullRfcReport(id_rfc) {
  const rfc = await prisma.rfc.findUnique({
    where: { id_rfc },
    include: {
      statut:    { select: { code_statut: true, libelle: true } },
      priorite:  { select: { code_priorite: true, libelle: true } },
      typeRfc:   { select: { type: true, description: true } },
      demandeur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true, direction: { select: { nom_direction: true } } } },
      ciRfcs: {
        include: {
          ci: {
            select: {
              id_ci: true, code_metier: true, nom_ci: true, type_ci: true, version_ci: true, description: true,
              ciEnvs: { select: { environnement: { select: { nom_env: true } } } },
            },
          },
        },
      },
      evaluationRisque: true,
      piecesJointes:    true,
      commentaires: {
        orderBy: { date_publication: 'asc' },
        include: { auteur: { select: { nom_user: true, prenom_user: true, email_user: true } } },
      },
      historiques: {
        orderBy: { date_changement: 'asc' },
        include: {
          statut:      { select: { code_statut: true, libelle: true } },
          utilisateur: { select: { nom_user: true, prenom_user: true } },
        },
      },
    },
  });

  if (!rfc) throw Object.assign(new Error('RFC introuvable.'), { code: 'NOT_FOUND' });

  const changements = await prisma.changement.findMany({
    where: { id_rfc },
    include: {
      statut:         { select: { code_statut: true, libelle: true } },
      changeManager:  { select: { nom_user: true, prenom_user: true, email_user: true } },
      environnement:  { select: { nom_env: true } },
      planChangement: true,
      planRollback:   true,
      guides:         true,
      pir:            true,
      tests:          { orderBy: { date_test: 'asc' } },
      taches: {
        orderBy: { ordre_tache: 'asc' },
        include: {
          statut:       { select: { code_statut: true, libelle: true } },
          implementeur: { select: { nom_user: true, prenom_user: true, email_user: true } },
          journaux:     { orderBy: { date_entree: 'asc' } },
        },
      },
      historiques: {
        orderBy: { date_changement: 'asc' },
        include: {
          statut:      { select: { code_statut: true, libelle: true } },
          utilisateur: { select: { nom_user: true, prenom_user: true } },
        },
      },
    },
    orderBy: { date_creation: 'asc' },
  });

  const rfcReunions = await prisma.rfcReunion.findMany({
    where: { id_rfc },
    include: {
      reunion: {
        include: {
          cab:          { select: { code_metier: true, type_cab: true } },
          participants: { select: { utilisateur: { select: { nom_user: true, prenom_user: true, email_user: true } } } },
          votesCab:     { where: { id_rfc }, include: { utilisateur: { select: { nom_user: true, prenom_user: true, email_user: true } } } },
          decisionsCab: { where: { id_rfc } },
        },
      },
    },
    orderBy: { reunion: { date_reunion: 'asc' } },
  });

  const auditTrail = await auditSvc.getAuditTrailByRfc(id_rfc);
  const stats      = _computeStats(rfc, changements, auditTrail);

  return {
    generated_at: new Date().toISOString(),
    resume: {
      code_rfc:       rfc.code_rfc,
      titre_rfc:      rfc.titre_rfc,
      statut:         rfc.statut.code_statut,
      libelle_statut: rfc.statut.libelle,
      type:           rfc.typeRfc.type,
      priorite:       rfc.priorite.code_priorite,
      urgence:        rfc.urgence,
      demandeur:      `${rfc.demandeur.prenom_user} ${rfc.demandeur.nom_user}`,
      direction:      rfc.demandeur.direction?.nom_direction ?? null,
      date_creation:  rfc.date_creation,
      date_souhaitee: rfc.date_souhaitee ?? null,
      date_cloture:   rfc.date_cloture   ?? null,
      duree_traitement_jours: _dureeJours(rfc.date_creation, rfc.date_cloture),
    },
    rfc: {
      id_rfc: rfc.id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc,
      description: rfc.description, justification: rfc.justification,
      impacte_estimee: rfc.impacte_estimee ?? null,
      date_creation: rfc.date_creation, date_modification: rfc.date_modification ?? null,
      date_souhaitee: rfc.date_souhaitee ?? null, date_cloture: rfc.date_cloture ?? null,
      urgence: rfc.urgence, statut: rfc.statut, priorite: rfc.priorite,
      type: rfc.typeRfc, demandeur: rfc.demandeur,
    },
    configuration_items: rfc.ciRfcs.map(c => ({
      ...c.ci,
      environnements: c.ci.ciEnvs.map(e => e.environnement.nom_env),
    })),
    evaluation_risque: rfc.evaluationRisque ? {
      impacte: rfc.evaluationRisque.impacte, probabilite: rfc.evaluationRisque.probabilite,
      score_risque: rfc.evaluationRisque.score_risque, niveau: _niveauRisque(rfc.evaluationRisque.score_risque),
      description: rfc.evaluationRisque.description, date_evaluation: rfc.evaluationRisque.date_evaluation,
    } : null,
    commentaires: rfc.commentaires.map(c => ({
      auteur: `${c.auteur.prenom_user} ${c.auteur.nom_user}`, email: c.auteur.email_user,
      contenu: c.contenu, date_publication: c.date_publication,
    })),
    pieces_jointes: rfc.piecesJointes.map(p => ({
      nom_piece: p.nom_piece, type_piece: p.type_piece,
      taille_piece: p.taille_piece?.toString() ?? null, date_upload: p.date_upload,
    })),
    historique_statuts_rfc: rfc.historiques.map(h => ({
      statut: h.statut.code_statut, libelle: h.statut.libelle,
      date_changement: h.date_changement,
      acteur: h.utilisateur ? `${h.utilisateur.prenom_user} ${h.utilisateur.nom_user}` : 'Système',
      commentaire: h.commentaire ?? null,
    })),
    changements: changements.map(chg => ({
      id_changement: chg.id_changement, code_changement: chg.code_changement,
      statut: chg.statut, date_creation: chg.date_creation,
      date_debut: chg.date_debut ?? null, date_fin_prevu: chg.date_fin_prevu ?? null,
      date_fin_reelle: chg.date_fin_reelle ?? null, reussite: chg.reussite,
      environnement: chg.environnement.nom_env,
      change_manager: `${chg.changeManager.prenom_user} ${chg.changeManager.nom_user}`,
      duree_reelle_jours: _dureeJours(chg.date_debut, chg.date_fin_reelle),
      plan_changement: chg.planChangement ? {
        titre_plan: chg.planChangement.titre_plan,
        etapes_plan: chg.planChangement.etapes_plan ?? null,
        duree_estimee: chg.planChangement.duree_estimee ?? null,
      } : null,
      plan_rollback: chg.planRollback ? {
        description: chg.planRollback.description,
        procedure_rollback: chg.planRollback.procedure_rollback ?? null,
      } : null,
      pir: chg.pir ? {
        date_pir: chg.pir.date_pir ?? null, description: chg.pir.description ?? null,
        conformite_objectifs: chg.pir.conformite_objectifs, conformite_delais: chg.pir.conformite_delais,
      } : null,
      tests: chg.tests.map(t => ({ critere_test: t.critere_test, resultat: t.resultat, date_test: t.date_test ?? null, contexte: t.contexte ?? null })),
      taches: chg.taches.map(t => ({
        code_tache: t.code_tache, ordre_tache: t.ordre_tache, titre_tache: t.titre_tache,
        statut: t.statut.code_statut,
        implementeur: `${t.implementeur.prenom_user} ${t.implementeur.nom_user}`,
        email_implementeur: t.implementeur.email_user,
        duree: t.duree ?? null, date_creation: t.date_creation,
        journaux: t.journaux.map(j => ({ titre: j.titre_journal ?? null, description: j.description, date: j.date_entree })),
      })),
      historique_statuts: chg.historiques.map(h => ({
        statut: h.statut.code_statut, libelle: h.statut.libelle, date_changement: h.date_changement,
        acteur: h.utilisateur ? `${h.utilisateur.prenom_user} ${h.utilisateur.nom_user}` : 'Système',
        commentaire: h.commentaire ?? null,
      })),
    })),
    reunions_cab: rfcReunions.map(r => ({
      code_metier: r.reunion.code_metier, type_cab: r.reunion.cab.type_cab,
      date_reunion: r.reunion.date_reunion, heure_debut: r.reunion.heure_debut ?? null,
      heure_fin: r.reunion.heure_fin ?? null, ordre_jour: r.reunion.ordre_jour ?? null,
      participants: r.reunion.participants.map(p => `${p.utilisateur.prenom_user} ${p.utilisateur.nom_user}`),
      votes: r.reunion.votesCab.map(v => ({
        votant: `${v.utilisateur.prenom_user} ${v.utilisateur.nom_user}`,
        email: v.utilisateur.email_user, valeur_vote: v.valeur_vote, date_vote: v.date_vote,
      })),
      decisions: r.reunion.decisionsCab.map(d => ({ decision: d.decision, motif: d.motif ?? null, date_decision: d.date_decision })),
    })),
    statistiques: stats,
    audit_trail: auditTrail.map(log => ({
      date: log.date_action, action: log.action, entite_type: log.entite_type, entite_id: log.entite_id,
      acteur: log.utilisateur
        ? `${log.utilisateur.prenom_user} ${log.utilisateur.nom_user} <${log.utilisateur.email_user}>`
        : 'Système',
      avant: log.ancienne_val ?? null, apres: log.nouvelle_val ?? null,
    })),
  };
}

// ── Helpers privés ────────────────────────────────────────────

function _dureeJours(debut, fin) {
  if (!debut || !fin) return null;
  return Math.round((new Date(fin) - new Date(debut)) / (1000 * 60 * 60 * 24));
}

function _niveauRisque(score) {
  if (score <= 4)  return 'FAIBLE';
  if (score <= 9)  return 'MOYEN';
  if (score <= 16) return 'ÉLEVÉ';
  return 'CRITIQUE';
}

function _computeStats(rfc, changements, auditTrail) {
  const totalTaches     = changements.reduce((s, c) => s + c.taches.length, 0);
  const tachesTerminees = changements.reduce((s, c) => s + c.taches.filter(t => t.statut.code_statut === 'TERMINEE').length, 0);
  const totalJournaux   = changements.reduce((s, c) => s + c.taches.reduce((ss, t) => ss + t.journaux.length, 0), 0);
  const totalTests      = changements.reduce((s, c) => s + c.tests.length, 0);
  const testsReussis    = changements.reduce((s, c) => s + c.tests.filter(t => t.resultat === 'REUSSI').length, 0);
  return {
    nb_changements:      changements.length,
    nb_taches:           totalTaches,
    nb_taches_terminees: tachesTerminees,
    taux_taches:         totalTaches > 0 ? `${Math.round((tachesTerminees / totalTaches) * 100)}%` : 'N/A',
    nb_journaux:         totalJournaux,
    nb_tests:            totalTests,
    nb_tests_reussis:    testsReussis,
    taux_tests:          totalTests > 0 ? `${Math.round((testsReussis / totalTests) * 100)}%` : 'N/A',
    pir_present:         changements.some(c => c.pir !== null),
    rollback_present:    changements.some(c => c.planRollback !== null),
    nb_commentaires:     rfc.commentaires.length,
    nb_pieces_jointes:   rfc.piecesJointes.length,
    nb_evenements_audit: auditTrail.length,
    evaluation_risque:   rfc.evaluationRisque
      ? `${_niveauRisque(rfc.evaluationRisque.score_risque)} (score ${rfc.evaluationRisque.score_risque}/25)`
      : 'Non évaluée',
  };
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  // KPI
  getKpiDashboard,
  getKpiRfc,
  getKpiChangements,
  getKpiTaches,
  getActivityTimeline,
  // Rapports RFC
  createRapport,
  getRapportsByRfc,
  // Rapports Changement 
  createRapportForChangement,
  getRapportsByChangement,
  // Rapport individuel
  getRapportById,
  deleteRapport,
  // Audit
  getAuditLogs,
  getFullRfcReport,
};