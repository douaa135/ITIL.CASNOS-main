'use strict';

/**
 * ============================================================
 * changement.service.js — Logique métier + Prisma + Audit
 * ============================================================
 */

const prisma           = require('./prisma.service');
const notifSvc         = require('./notification.service');
const auditSvc         = require('./audit.service');
const statutHistorySvc = require('./statuthistory.service');
const { TRANSITIONS_CHG } = require('./workflow.service');
const planningSvc = require('./planning.service');

const {
  codeChangement,
  codeTache,
  codePlanChangement,
  codePlanRollback,
  codeGuide,
  codePir,
  codeTest,
} = require('../utils/entity-code.utils');

// ── Machine à états Changement ────────────────────────────────
const TRANSITIONS_AUTORISEES = {
  EN_PLANIFICATION: ['EN_COURS', 'EN_ATTENTE', 'CLOTUREE'],
  EN_ATTENTE:       ['EN_COURS', 'CLOTUREE'],
  EN_COURS:         ['IMPLEMENTE', 'EN_ECHEC', 'CLOTUREE'],
  IMPLEMENTE:       ['TESTE', 'EN_ECHEC'],
  TESTE:            ['IMPLEMENTE', 'CLOTUREE'],
  EN_ECHEC:         ['EN_PLANIFICATION', 'CLOTUREE'],
  CLOTUREE:         [],
};

// ── Include complet ───────────────────────────────────────────
const CHANGEMENT_INCLUDE = {
  statut:        { select: { code_statut: true, libelle: true } },
  changeManager: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
  environnement: { select: { id_env: true, nom_env: true } },
  rfc:           { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
  planChangement: true,
  planRollback:   true,
  guides:         true,
  taches: {
    include: {
      implementeur: { select: { id_user: true, nom_user: true, prenom_user: true } },
      statut:       { select: { code_statut: true, libelle: true } },
      journaux:     { orderBy: { date_entree: 'desc' } },
    },
    orderBy: { ordre_tache: 'asc' },
  },
  tests: true,
  pir:   true,
  historiques: {
    orderBy: { date_changement: 'desc' },
    include: { statut: { select: { code_statut: true, libelle: true } } },
  },
};

const PIR_SELECT = {
  id_pir:               true,
  code_metier:          true,
  date_pir:             true,
  description:          true,
  conformite_objectifs: true,
  conformite_delais:    true,
  id_changement:        true,
};

const TEST_SELECT = {
  id_test:       true,
  code_metier:   true,
  date_test:     true,
  critere_test:  true,
  resultat:      true,
  contexte:      true,
  id_changement: true,
};

// ── Helper : statut EN_ATTENTE TACHE ─────────────────────────
let _cachedStatutTacheEnAttente = null;
async function _getStatutTacheEnAttente() {
  if (_cachedStatutTacheEnAttente) return _cachedStatutTacheEnAttente;
  const statut = await prisma.statut.findUnique({
    where:  { code_statut_contexte: { code_statut: 'EN_ATTENTE', contexte: 'TACHE' } },
    select: { id_statut: true },
  });
  if (!statut) throw new Error("Statut 'EN_ATTENTE' (TACHE) introuvable. Vérifiez le seed.");
  _cachedStatutTacheEnAttente = statut.id_statut;
  return _cachedStatutTacheEnAttente;
}

// ─────────────────────────────────────────────────────────────
// 1. LISTER
// ─────────────────────────────────────────────────────────────
const getAllChangements = async (filters = {}) => {
  const { statut, id_env, id_user, id_rfc } = filters;

  return prisma.changement.findMany({
    where: {
      ...(statut  && { id_statut: statut }),
      ...(id_env  && { id_env }),
      ...(id_user && { id_user }),
      ...(id_rfc  && { id_rfc }),
    },
    include: {
      statut:        { select: { code_statut: true, libelle: true } },
      changeManager: { select: { id_user: true, nom_user: true, prenom_user: true } },
      environnement: { select: { nom_env: true } },
      rfc: {
        select: {
          code_rfc:  true,
          titre_rfc: true,
          typeRfc:   { select: { type: true } },
          demandeur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
          evaluationRisque: { select: { score_risque: true } },
        },
      },
      _count:        { select: { taches: true } },
    },
    orderBy: { date_creation: 'desc' },
  });
};

// ─────────────────────────────────────────────────────────────
// 2. DÉTAIL
// ─────────────────────────────────────────────────────────────
const getChangementById = async (id) => {
  return prisma.changement.findUnique({
    where:   { id_changement: id },
    include: CHANGEMENT_INCLUDE,
  });
};

// ─────────────────────────────────────────────────────────────
// 3. CRÉER UN CHANGEMENT
// ─────────────────────────────────────────────────────────────
const createChangement = async (data, id_change_manager) => {
  if (!id_change_manager) throw new Error("Le Change Manager est obligatoire");

  const { id_env, id_rfc, date_debut, date_fin_prevu } = data;
  if (!id_env) throw new Error("L'environnement cible est obligatoire");

  if (id_rfc) {
    const rfc = await prisma.rfc.findUnique({ where: { id_rfc }, include: { statut: true } });
    if (!rfc) throw new Error("RFC introuvable");
    if (rfc.statut.code_statut !== 'APPROUVEE') {
      throw new Error(`La RFC doit être APPROUVEE (statut actuel : ${rfc.statut.code_statut})`);
    }
  }

  const [env, manager] = await Promise.all([
    prisma.environnement.findUnique({ where: { id_env } }),
    prisma.utilisateur.findUnique({ where: { id_user: id_change_manager } }),
  ]);

  if (!env)     throw new Error("Environnement introuvable");
  if (!manager) throw new Error("Change Manager introuvable");
 
  // ── Validation dates (blackout + weekend) ──────────────────
  if (date_debut) {
    const validation = await planningSvc.validatePlage(date_debut, date_fin_prevu || date_debut);
    if (!validation.valid) {
      const err = new Error(validation.raison);
      err.code  = validation.code; // 'WEEKEND' | 'BLACKOUT'
      err.statusCode = 422;
      throw err;
    }
  }
  const changement = await prisma.changement.create({
    data: {
      code_changement: codeChangement(),
      date_debut:      date_debut     ? new Date(date_debut)     : null,
      date_fin_prevu:  date_fin_prevu ? new Date(date_fin_prevu) : null,
      date_fin_reelle: null,
      reussite:        null,
      changeManager:   { connect: { id_user: id_change_manager } },
      environnement:   { connect: { id_env } },
      statut: {
        connect: {
          code_statut_contexte: { code_statut: 'EN_PLANIFICATION', contexte: 'CHANGEMENT' },
        },
      },
      ...(id_rfc && { rfc: { connect: { id_rfc } } }),
    },
    include: CHANGEMENT_INCLUDE,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  auditSvc.ENTITES.CHANGEMENT,
    entite_id:    changement.id_changement,
    id_user:      id_change_manager,
    ancienne_val: null,
    nouvelle_val: {
      code_changement: changement.code_changement,
      statut:          'EN_PLANIFICATION',
      id_rfc:          id_rfc ?? null,
      id_env,
    },
  });

  return changement;
};

// ─────────────────────────────────────────────────────────────
// 4. MODIFIER UN CHANGEMENT
// ─────────────────────────────────────────────────────────────
const updateChangement = async (id, data, id_user = null) => {
  const changement = await prisma.changement.findUnique({
    where:   { id_changement: id },
    include: { statut: true, taches: true },
  });
  if (!changement) throw new Error("Changement introuvable");

  const statut = changement.statut.code_statut;

  if (!['EN_PLANIFICATION', 'EN_COURS', 'EN_ECHEC'].includes(statut)) {
    throw new Error(`Impossible de modifier un Changement au statut "${statut}"`);
  }

  // EN_COURS : uniquement sync tâches
  if (statut === 'EN_COURS') {
    const newDebut = data.date_debut     || changement.date_debut;
    const newFin   = data.date_fin_prevu || changement.date_fin_prevu;
    if (data.date_debut || data.date_fin_prevu) {
      const validation = await planningSvc.validatePlage(
        newDebut ? new Date(newDebut).toISOString() : null,
        newFin   ? new Date(newFin).toISOString()   : null
      );
      if (!validation.valid) {
        const err = new Error(validation.raison);
        err.code  = validation.code;
        err.statusCode = 422;
        throw err;
      }
    }
    if (data.taches) await _syncTaches(id, data.taches, changement.taches, id_user);
    return getChangementById(id);
  }

  // EN_ECHEC : uniquement dates
  if (statut === 'EN_ECHEC') {
    const { date_debut, date_fin_prevu } = data;
    await prisma.changement.update({
      where: { id_changement: id },
      data: {
        ...(date_debut     && { date_debut:     new Date(date_debut) }),
        ...(date_fin_prevu && { date_fin_prevu: new Date(date_fin_prevu) }),
      },
    });
    return getChangementById(id);
  }

  // EN_PLANIFICATION : tout modifiable
  // Validation dates si modifiées
  const newDebut = data.date_debut     || changement.date_debut;
  const newFin   = data.date_fin_prevu || changement.date_fin_prevu;
  if (data.date_debut || data.date_fin_prevu) {
    const validation = await planningSvc.validatePlage(
      newDebut ? new Date(newDebut).toISOString() : null,
      newFin   ? new Date(newFin).toISOString()   : null
    );
    if (!validation.valid) {
      const err = new Error(validation.raison);
      err.code  = validation.code;
      err.statusCode = 422;
      throw err;
    }
  }
  const {
    date_debut, date_fin_prevu, id_env, id_user: new_manager,
    plan_changement, plan_rollback, guide, taches,
  } = data;

  await prisma.changement.update({
    where: { id_changement: id },
    data: {
      ...(date_debut     && { date_debut:     new Date(date_debut) }),
      ...(date_fin_prevu && { date_fin_prevu: new Date(date_fin_prevu) }),
      ...(id_env         && { environnement:  { connect: { id_env } } }),
      ...(new_manager    && { changeManager:  { connect: { id_user: new_manager } } }),
    },
  });

  // Plan de changement
  if (plan_changement) {
    const existing = await prisma.planChangement.findUnique({ where: { id_changement: id } });
    if (existing) {
      await prisma.planChangement.update({
        where: { id_changement: id },
        data: {
          ...(plan_changement.titre_plan    && { titre_plan:    plan_changement.titre_plan }),
          ...(plan_changement.etapes_plan   && { etapes_plan:   plan_changement.etapes_plan }),
          ...(plan_changement.duree_estimee !== undefined && { duree_estimee: plan_changement.duree_estimee }),
        },
      });
      await auditSvc.logAction({
        action:      auditSvc.ACTIONS.UPDATE,
        entite_type: auditSvc.ENTITES.PLAN_CHANGEMENT,
        entite_id:   existing.id_plan,
        id_user,
        nouvelle_val: { titre_plan: plan_changement.titre_plan },
      });
    } else {
      const plan = await prisma.planChangement.create({
        data: {
          code_metier:   codePlanChangement(),
          titre_plan:    plan_changement.titre_plan    ?? 'Plan de changement',
          etapes_plan:   plan_changement.etapes_plan   ?? null,
          duree_estimee: plan_changement.duree_estimee ?? null,
          id_changement: id,
        },
      });
      await auditSvc.logAction({
        action:      auditSvc.ACTIONS.CREATE,
        entite_type: auditSvc.ENTITES.PLAN_CHANGEMENT,
        entite_id:   plan.id_plan,
        id_user,
        nouvelle_val: { id_changement: id, titre_plan: plan.titre_plan },
      });
    }
  }

  // Plan de rollback
  if (plan_rollback) {
    const existing = await prisma.planRollback.findUnique({ where: { id_changement: id } });
    if (existing) {
      await prisma.planRollback.update({
        where: { id_changement: id },
        data: {
          ...(plan_rollback.description        && { description:        plan_rollback.description }),
          ...(plan_rollback.procedure_rollback && { procedure_rollback: plan_rollback.procedure_rollback }),
        },
      });
      await auditSvc.logAction({
        action:      auditSvc.ACTIONS.UPDATE,
        entite_type: auditSvc.ENTITES.PLAN_ROLLBACK,
        entite_id:   existing.id_rollback,
        id_user,
        nouvelle_val: { description: plan_rollback.description },
      });
    } else {
      const rollback = await prisma.planRollback.create({
        data: {
          code_metier:        codePlanRollback(),
          description:        plan_rollback.description        ?? 'Plan de rollback',
          procedure_rollback: plan_rollback.procedure_rollback ?? null,
          id_changement:      id,
        },
      });
      await auditSvc.logAction({
        action:      auditSvc.ACTIONS.CREATE,
        entite_type: auditSvc.ENTITES.PLAN_ROLLBACK,
        entite_id:   rollback.id_rollback,
        id_user,
        nouvelle_val: { id_changement: id, description: rollback.description },
      });
    }
  }

  // Guide
  if (guide) {
    const existingGuide = await prisma.guide.findFirst({ where: { id_changement: id } });
    if (existingGuide) {
      await prisma.guide.update({
        where: { id_guide: existingGuide.id_guide },
        data: {
          ...(guide.nom_guide && { nom_guide: guide.nom_guide }),
          ...(guide.contenu   && { contenu:   guide.contenu }),
        },
      });
    } else {
      await prisma.guide.create({
        data: {
          code_metier:   codeGuide(),
          nom_guide:     guide.nom_guide ?? 'Guide de changement',
          contenu:       guide.contenu   ?? null,
          id_changement: id,
        },
      });
    }
  }

  if (taches) await _syncTaches(id, taches, changement.taches, id_user);

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:      auditSvc.ACTIONS.UPDATE,
    entite_type: auditSvc.ENTITES.CHANGEMENT,
    entite_id:   id,
    id_user,
    nouvelle_val: { date_debut, date_fin_prevu, id_env },
  });

  return getChangementById(id);
};

// ─────────────────────────────────────────────────────────────
// Helper : synchroniser les tâches
// ─────────────────────────────────────────────────────────────
async function _syncTaches(id_changement, taches, tachesExistantes, id_user = null) {
  const id_statut_initial = await _getStatutTacheEnAttente();

  for (const t of taches) {
    if (t._delete && t.id_tache) continue;

    if (t.id_tache) {
      await prisma.tache.update({
        where: { id_tache: t.id_tache },
        data: {
          ...(t.titre_tache !== undefined && { titre_tache:  t.titre_tache }),
          ...(t.description !== undefined && { description:  t.description }),
          ...(t.duree       !== undefined && { duree:        t.duree }),
          ...(t.ordre_tache !== undefined && { ordre_tache:  t.ordre_tache }),
          ...(t.id_user     !== undefined && { implementeur: { connect: { id_user: t.id_user } } }),
        },
      });
    } else {
      if (!t.titre_tache) throw new Error("titre_tache est obligatoire");
      if (!t.id_user)     throw new Error("id_user (implémenteur) est obligatoire");

      const tache = await prisma.tache.create({
        data: {
          code_tache:   codeTache(),
          titre_tache:  t.titre_tache,
          description:  t.description  ?? null,
          duree:        t.duree        ?? null,
          ordre_tache:  t.ordre_tache  ?? (tachesExistantes.length + 1),
          id_changement,
          id_statut:    id_statut_initial,
          implementeur: { connect: { id_user: t.id_user } },
        },
      });

      await auditSvc.logAction({
        action:      auditSvc.ACTIONS.CREATE,
        entite_type: auditSvc.ENTITES.TACHE,
        entite_id:   tache.id_tache,
        id_user,
        nouvelle_val: {
          code_tache:    tache.code_tache,
          titre_tache:   t.titre_tache,
          ordre_tache:   t.ordre_tache,
          id_changement,
          implementeur:  t.id_user,
        },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. CHANGER LE STATUT D'UN CHANGEMENT
// ─────────────────────────────────────────────────────────────
const updateChangementStatus = async (id, id_statut, id_user_action, commentaire) => {
  if (!id_statut) throw new Error("id_statut est requis");

  const changement = await prisma.changement.findUnique({
    where:   { id_changement: id },
    include: { statut: true, planRollback: true },
  });
  if (!changement) throw new Error("Changement introuvable");

  const statutCible = await prisma.statut.findUnique({ where: { id_statut } });
  if (!statutCible)                          throw new Error("Statut cible introuvable");
  if (statutCible.contexte !== 'CHANGEMENT') throw new Error("Ce statut n'appartient pas au workflow Changement");

  const statutActuel  = changement.statut.code_statut;
  const transitionsOk = TRANSITIONS_CHG[statutActuel] || [];

  if (!transitionsOk.includes(statutCible.code_statut)) {
    throw new Error(
      `Transition Changement interdite : ${statutActuel} → ${statutCible.code_statut}. ` +
      `Autorisées : [${transitionsOk.join(', ') || 'aucune'}]`
    );
  }

  // Plan de Rollback optionnel, mais warning en audit
  let rollbackWarning = null;
  if (statutCible.code_statut === 'EN_COURS' && !changement.planRollback) {
    rollbackWarning = "Passage à EN_COURS sans Plan de Rollback";
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.changement.update({
      where: { id_changement: id },
      data: {
        id_statut: statutCible.id_statut,
        ...(statutCible.code_statut === 'CLOTUREE'  && { date_fin_reelle: new Date(), reussite: true }),
        ...(statutCible.code_statut === 'EN_ECHEC'  && { reussite: false }),
      },
      include: CHANGEMENT_INCLUDE,
    });

    // ── STATUT HISTORY ─────────────────────────────────────────
    await statutHistorySvc.createHistory({
      id_statut:     statutCible.id_statut,
      id_changement: id,
      id_user:       id_user_action ?? null,
      commentaire:   commentaire    ?? null,
    }, tx);

    return result;
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.STATUS_CHANGED,
    entite_type:  auditSvc.ENTITES.CHANGEMENT,
    entite_id:    id,
    id_user:      id_user_action,
    ancienne_val: { statut: statutActuel },
    nouvelle_val: {
      statut:      statutCible.code_statut,
      commentaire: commentaire ?? null,
      warning:     rollbackWarning ?? null,
    },
  });

  await notifSvc.notifyChangementStatusChange(id, statutCible.code_statut);

  return updated;
};

// ─────────────────────────────────────────────────────────────
// 6. CLÔTURER UN CHANGEMENT (soft delete ITIL)
// ─────────────────────────────────────────────────────────────
const cloturerChangement = async (id, id_user_action, raison, reussite = true) => {
  const changement = await prisma.changement.findUnique({
    where:   { id_changement: id },
    include: { statut: true },
  });
  if (!changement)                                   throw new Error("Changement introuvable");
  if (changement.statut.code_statut === 'CLOTUREE')  throw new Error("Ce Changement est déjà clôturé");

  const statutCloture = await prisma.statut.findFirst({
    where: { code_statut: 'CLOTUREE', contexte: 'CHANGEMENT' },
  });
  if (!statutCloture) throw new Error("Statut CLOTUREE introuvable en BDD");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.changement.update({
      where: { id_changement: id },
      data:  { id_statut: statutCloture.id_statut, date_fin_reelle: new Date(), reussite },
      include: CHANGEMENT_INCLUDE,
    });

    // ── STATUT HISTORY ─────────────────────────────────────────
    await statutHistorySvc.createHistory({
      id_statut:     statutCloture.id_statut,
      id_changement: id,
      id_user:       id_user_action ?? null,
      commentaire:   raison         ?? 'Changement clôturé.',
    }, tx);

    return result;
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CLOTURE,
    entite_type:  auditSvc.ENTITES.CHANGEMENT,
    entite_id:    id,
    id_user:      id_user_action,
    ancienne_val: { statut: changement.statut.code_statut },
    nouvelle_val: { statut: 'CLOTUREE', reussite, raison: raison ?? null },
  });

  await notifSvc.notifyChangementStatusChange(id, 'CLOTUREE');

  return updated;
};

// ============================================================
// PIR
// ============================================================

async function createPir(id_changement, data) {
  const existing = await prisma.postImplementationReview.findUnique({ where: { id_changement } });
  if (existing) {
    const err = new Error('Ce Changement a déjà un PIR. Utilisez PUT pour le modifier.');
    err.code = 'PIR_ALREADY_EXISTS';
    throw err;
  }

  const { conformite_objectifs, conformite_delais, description = null, date_pir = null } = data;

  const pir = await prisma.postImplementationReview.create({
    data: {
      code_metier:          codePir(),
      date_pir:             date_pir ? new Date(date_pir) : null,
      description,
      conformite_objectifs,
      conformite_delais,
      id_changement,
    },
    select: PIR_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.PIR_CREATE,
    entite_type:  auditSvc.ENTITES.PIR,
    entite_id:    pir.id_pir,
    id_user:      null,
    ancienne_val: null,
    nouvelle_val: {
      id_changement,
      conformite_objectifs,
      conformite_delais,
      description,
    },
  });

  return pir;
}

async function getPirByChangement(id_changement) {
  return prisma.postImplementationReview.findUnique({
    where:  { id_changement },
    select: PIR_SELECT,
  });
}

async function updatePir(id_changement, data) {
  const { date_pir, description, conformite_objectifs, conformite_delais } = data;

  const avant = await prisma.postImplementationReview.findUnique({
    where:  { id_changement },
    select: { conformite_objectifs: true, conformite_delais: true },
  });

  const pir = await prisma.postImplementationReview.update({
    where: { id_changement },
    data: {
      ...(date_pir             !== undefined && { date_pir: date_pir ? new Date(date_pir) : null }),
      ...(description          !== undefined && { description }),
      ...(conformite_objectifs !== undefined && { conformite_objectifs }),
      ...(conformite_delais    !== undefined && { conformite_delais }),
    },
    select: PIR_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.PIR,
    entite_id:    pir.id_pir,
    id_user:      null,
    ancienne_val: avant,
    nouvelle_val: { conformite_objectifs, conformite_delais, description },
  });

  return pir;
}

async function deletePir(id_changement) {
  await prisma.postImplementationReview.delete({ where: { id_changement } });
  return { deleted: true, id_changement };
}

// ============================================================
// TESTS
// ============================================================

async function createTest(id_changement, data) {
  const { critere_test, resultat = 'EN_ATTENTE', contexte = null, date_test = null } = data;

  const test = await prisma.test.create({
    data: {
      code_metier:  codeTest(),
      critere_test: critere_test.trim(),
      resultat,
      contexte,
      date_test:    date_test ? new Date(date_test) : null,
      id_changement,
    },
    select: TEST_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.TEST_CREATE,
    entite_type:  auditSvc.ENTITES.TEST,
    entite_id:    test.id_test,
    id_user:      null,
    ancienne_val: null,
    nouvelle_val: {
      id_changement,
      critere_test: critere_test.substring(0, 200),
      resultat,
    },
  });

  return test;
}

async function getTestsByChangement(id_changement) {
  return prisma.test.findMany({
    where:   { id_changement },
    orderBy: { date_test: 'desc' },
    select:  TEST_SELECT,
  });
}

async function updateTest(id_test, data) {
  const { date_test, critere_test, resultat, contexte } = data;

  const avant = await prisma.test.findUnique({
    where:  { id_test },
    select: { resultat: true, critere_test: true },
  });

  const test = await prisma.test.update({
    where: { id_test },
    data: {
      ...(date_test    !== undefined && { date_test:    date_test ? new Date(date_test) : null }),
      ...(critere_test !== undefined && { critere_test: critere_test.trim() }),
      ...(resultat     !== undefined && { resultat }),
      ...(contexte     !== undefined && { contexte }),
    },
    select: TEST_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.TEST,
    entite_id:    id_test,
    id_user:      null,
    ancienne_val: { resultat: avant?.resultat },
    nouvelle_val: { resultat, critere_test },
  });

  return test;
}

async function deleteTest(id_test) {
  await prisma.test.delete({ where: { id_test } });
  return { deleted: true, id_test };
}

module.exports = {
  getAllChangements,
  getChangementById,
  createChangement,
  updateChangement,
  updateChangementStatus,
  cloturerChangement,
  createPir, 
  getPirByChangement, 
  updatePir, 
  deletePir,
  createTest, 
  getTestsByChangement, 
  updateTest, 
  deleteTest,
};