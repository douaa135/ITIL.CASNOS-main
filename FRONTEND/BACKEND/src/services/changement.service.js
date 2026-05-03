'use strict';

/**
 * ============================================================
 * changement.service.js — Logique métier + Prisma
 * ============================================================
 * CORRECTIONS V2 :
 *  - _syncTaches : résout maintenant id_statut EN_ATTENTE (TACHE) à la création
 *  - Notifications automatiques sur chaque changement de statut
 * ============================================================
 */

const prisma                    = require('./prisma.service');
const notifSvc                  = require('./notification.service');
const { codeStatutHistory }     = require('../utils/entity-code.utils');

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
  EN_PLANIFICATION: ['EN_COURS', 'EN_ATTENTE',   'CLOTURE'],
  EN_ATTENTE :      ['EN_COURS', 'CLOTURE'],
  EN_COURS:         ['IMPLEMENTE', 'EN_ECHEC', 'CLOTURE'],
  IMPLEMENTE:       ['TESTE',      'EN_ECHEC'],
  TESTE:            ['CLOTURE'],
  EN_ECHEC:         ['EN_PLANIFICATION', 'CLOTURE'],
  CLOTURE:          [],
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

// ── Helper : résoudre le statut EN_ATTENTE pour les Tâches ───
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

// ─────────────────────────────────────────────────────────────
// 1. Lister tous les Changements
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
      rfc:           { select: { code_rfc: true, titre_rfc: true, typeRfc: { select: { type: true } } } },
      _count:        { select: { taches: true } },
    },
    orderBy: { date_creation: 'desc' },
  });
};

// ─────────────────────────────────────────────────────────────
// 2. Récupérer un Changement par ID
// ─────────────────────────────────────────────────────────────
const getChangementById = async (id) => {
  return prisma.changement.findUnique({
    where:   { id_changement: id },
    include: CHANGEMENT_INCLUDE,
  });
};

// ─────────────────────────────────────────────────────────────
// 3. Créer un Changement
// ─────────────────────────────────────────────────────────────
const createChangement = async (data, id_change_manager) => {
  if (!id_change_manager) throw new Error("Le Change Manager est obligatoire");

  const { id_env, id_rfc, date_debut, date_fin_prevu } = data;
  if (!id_env) throw new Error("L'environnement cible est obligatoire");

  if (id_rfc) {
    const rfc = await prisma.rfc.findUnique({
      where:   { id_rfc },
      include: { statut: true },
    });
    if (!rfc) throw new Error("RFC introuvable");
    if (rfc.statut.code_statut !== 'APPROUVEE') {
      throw new Error(
        `La RFC doit être APPROUVEE pour créer un Changement (statut actuel : ${rfc.statut.code_statut})`
      );
    }
  }

  const env = await prisma.environnement.findUnique({ where: { id_env } });
  if (!env) throw new Error("Environnement introuvable");

  const manager = await prisma.utilisateur.findUnique({ where: { id_user: id_change_manager } });
  if (!manager) throw new Error("Change Manager introuvable");

  return prisma.changement.create({
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
};

// ─────────────────────────────────────────────────────────────
// 4. Modifier un Changement (scope selon statut)
// ─────────────────────────────────────────────────────────────
const updateChangement = async (id, data) => {
  const changement = await prisma.changement.findUnique({
    where:   { id_changement: id },
    include: { statut: true, taches: true },
  });
  if (!changement) throw new Error("Changement introuvable");

  const statut = changement.statut.code_statut;

  if (!['EN_PLANIFICATION', 'EN_COURS', 'EN_ECHEC'].includes(statut)) {
    throw new Error(`Impossible de modifier un Changement au statut "${statut}"`);
  }

  // EN_COURS : tâches uniquement
  if (statut === 'EN_COURS') {
    if (data.taches) {
      await _syncTaches(id, data.taches, changement.taches);
    }
    return getChangementById(id);
  }

  // EN_ECHEC : dates seulement
  if (statut === 'EN_ECHEC') {
    const { date_debut, date_fin_prevu } = data;
    await prisma.changement.update({
      where: { id_changement: id },
      data: {
        ...(date_debut     && { date_debut:    new Date(date_debut) }),
        ...(date_fin_prevu && { date_fin_prevu: new Date(date_fin_prevu) }),
      },
    });
    return getChangementById(id);
  }

  // EN_PLANIFICATION : tout modifiable
  const {
    date_debut, date_fin_prevu,
    id_env, id_user,
    plan_changement,
    plan_rollback,
    guide,
    taches,
  } = data;

  await prisma.changement.update({
    where: { id_changement: id },
    data: {
      ...(date_debut     && { date_debut:    new Date(date_debut) }),
      ...(date_fin_prevu && { date_fin_prevu: new Date(date_fin_prevu) }),
      ...(id_env         && { environnement: { connect: { id_env } } }),
      ...(id_user        && { changeManager: { connect: { id_user } } }),
    },
  });

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
    } else {
      await prisma.planChangement.create({
        data: {
          code_metier:   codePlanChangement(),
          titre_plan:    plan_changement.titre_plan    ?? 'Plan de changement',
          etapes_plan:   plan_changement.etapes_plan   ?? null,
          duree_estimee: plan_changement.duree_estimee ?? null,
          id_changement: id,
        },
      });
    }
  }

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
    } else {
      await prisma.planRollback.create({
        data: {
          code_metier:        codePlanRollback(),
          description:        plan_rollback.description        ?? 'Plan de rollback',
          procedure_rollback: plan_rollback.procedure_rollback ?? null,
          id_changement:      id,
        },
      });
    }
  }

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

  if (taches) {
    await _syncTaches(id, taches, changement.taches);
  }

  return getChangementById(id);
};

// ─────────────────────────────────────────────────────────────
// Helper : synchroniser les tâches
// CORRECTION V2 : id_statut résolu dynamiquement (EN_ATTENTE/TACHE)
// ─────────────────────────────────────────────────────────────
async function _syncTaches(id_changement, taches, tachesExistantes) {
  // Résoudre le statut EN_ATTENTE une seule fois pour le batch
  const id_statut_initial = await _getStatutTacheEnAttente();

  for (const t of taches) {
    if (t._delete && t.id_tache) {
      // Suppression logique : on ne supprime pas physiquement (traçabilité ITIL)
      continue;
    }

    if (t.id_tache) {
      // Mise à jour d'une tâche existante
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
      // Création d'une nouvelle tâche
      if (!t.titre_tache) throw new Error("titre_tache est obligatoire pour créer une tâche");
      if (!t.id_user)     throw new Error("id_user (implémenteur) est obligatoire pour créer une tâche");

      await prisma.tache.create({
        data: {
          code_tache:   codeTache(),
          titre_tache:  t.titre_tache,
          description:  t.description  ?? null,
          duree:        t.duree        ?? null,
          ordre_tache:  t.ordre_tache  ?? (tachesExistantes.length + 1),
          id_changement,
          id_statut:    id_statut_initial,   // ← CORRECTION : était absent avant
          implementeur: { connect: { id_user: t.id_user } },
        },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Changer le statut d'un Changement
//    + notification automatique post-transition
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
  const transitionsOk = TRANSITIONS_AUTORISEES[statutActuel] || [];

  if (!transitionsOk.includes(statutCible.code_statut)) {
    throw new Error(
      `Transition Changement interdite : ${statutActuel} → ${statutCible.code_statut}. ` +
      `Autorisées : [${transitionsOk.join(', ') || 'aucune'}]`
    );
  }

  // Règle ITIL : plan de rollback obligatoire avant EN_COURS
  if (statutCible.code_statut === 'EN_COURS' && !changement.planRollback) {
    throw new Error(
      "Un Plan de Rollback est obligatoire avant de démarrer l'exécution (ITIL). " +
      "Ajoutez-le via PUT /api/changements/:id avec { plan_rollback: {...} }"
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.changement.update({
      where: { id_changement: id },
      data: {
        id_statut: statutCible.id_statut,
        ...(statutCible.code_statut === 'CLOTURE'  && { date_fin_reelle: new Date(), reussite: true }),
        ...(statutCible.code_statut === 'EN_ECHEC' && { reussite: false }),
      },
      include: CHANGEMENT_INCLUDE,
    });

    await tx.statutHistory.create({
      data: {
        code_metier:   codeStatutHistory(),
        id_statut:     statutCible.id_statut,
        id_changement: id,
        id_user:       id_user_action ?? null,
        commentaire:   commentaire    ?? null,
      },
    });

    return result;
  });

  // Notification post-transition (non bloquante)
  await notifSvc.notifyChangementStatusChange(id, statutCible.code_statut);

  return updated;
};

// ─────────────────────────────────────────────────────────────
// 6. Clôturer un Changement (soft delete ITIL)
// ─────────────────────────────────────────────────────────────
const cloturerChangement = async (id, id_user_action, raison, reussite = true) => {
  const changement = await prisma.changement.findUnique({
    where:   { id_changement: id },
    include: { statut: true },
  });
  if (!changement)                                   throw new Error("Changement introuvable");
  if (changement.statut.code_statut === 'CLOTURE')   throw new Error("Ce Changement est déjà clôturé");

  const statutCloture = await prisma.statut.findFirst({
    where: { code_statut: 'CLOTURE', contexte: 'CHANGEMENT' },
  });
  if (!statutCloture) throw new Error("Statut CLOTURE introuvable en BDD");

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.changement.update({
      where: { id_changement: id },
      data:  { id_statut: statutCloture.id_statut, date_fin_reelle: new Date(), reussite },
      include: CHANGEMENT_INCLUDE,
    });

    await tx.statutHistory.create({
      data: {
        code_metier:   `SHS-${Date.now()}`,
        id_statut:     statutCloture.id_statut,
        id_changement: id,
        id_user:       id_user_action ?? null,
        commentaire:   raison         ?? 'Changement clôturé.',
      },
    });

    return result;
  });

  await notifSvc.notifyChangementStatusChange(id, 'CLOTURE');

  return updated;
};

// ── PIR ───────────────────────────────────────────────────────
 
async function createPir(id_changement, data) {
  const existing = await prisma.postImplementationReview.findUnique({ where: { id_changement } });
  if (existing) {
    const err = new Error('Ce Changement a déjà un PIR. Utilisez PUT pour le modifier.');
    err.code = 'PIR_ALREADY_EXISTS';
    throw err;
  }
 
  const { conformite_objectifs, conformite_delais, description = null, date_pir = null } = data;
 
  return prisma.postImplementationReview.create({
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
}
 
async function getPirByChangement(id_changement) {
  return prisma.postImplementationReview.findUnique({
    where:  { id_changement },
    select: PIR_SELECT,
  });
}
 
async function updatePir(id_changement, data) {
  const { date_pir, description, conformite_objectifs, conformite_delais } = data;
 
  return prisma.postImplementationReview.update({
    where: { id_changement },
    data: {
      ...(date_pir              !== undefined && { date_pir: date_pir ? new Date(date_pir) : null }),
      ...(description           !== undefined && { description }),
      ...(conformite_objectifs  !== undefined && { conformite_objectifs }),
      ...(conformite_delais     !== undefined && { conformite_delais }),
    },
    select: PIR_SELECT,
  });
}
 
async function deletePir(id_changement) {
  await prisma.postImplementationReview.delete({ where: { id_changement } });
  return { deleted: true, id_changement };
}
 
// ── TESTS ─────────────────────────────────────────────────────
 
async function createTest(id_changement, data) {
  const { critere_test, resultat = 'EN_ATTENTE', contexte = null, date_test = null } = data;
 
  return prisma.test.create({
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
 
  return prisma.test.update({
    where: { id_test },
    data: {
      ...(date_test    !== undefined && { date_test:    date_test ? new Date(date_test) : null }),
      ...(critere_test !== undefined && { critere_test: critere_test.trim() }),
      ...(resultat     !== undefined && { resultat }),
      ...(contexte     !== undefined && { contexte }),
    },
    select: TEST_SELECT,
  });
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
  TRANSITIONS_AUTORISEES,
  // PIR
  createPir, 
  getPirByChangement, 
  updatePir, 
  deletePir,
  // Tests
  createTest, 
  getTestsByChangement, 
  updateTest, 
  deleteTest,
};