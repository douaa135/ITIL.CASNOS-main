/**
 * ============================================================
 * Changement Service — logique métier + Prisma
 * ============================================================
 * Règles ITIL :
 *  - STANDARD  → peut être créé sans RFC
 *  - NORMAL/URGENT → RFC APPROUVEE obligatoire
 *  - Pas de suppression physique → soft delete via statut CLOTURE
 *
 * Droits de modification par statut :
 *  - PLANIFIE  → tout modifiable (dates, env, manager, plan, rollback, guide, tâches)
 *  - EN_COURS  → tâches uniquement (avancement)
 *  - EN_ECHEC  → dates de reprogrammation seulement
 *  - autres    → rien
 * ============================================================
 */

'use strict';

const prisma = require('./prisma.service');
const { codeChangement, codeTache, codePlanChangement, codePlanRollback, codeGuide, codeJournalExecution } = require('../utils/entity-code.utils');

// ── Machine à états Changement ────────────────────────────────
const TRANSITIONS_AUTORISEES = {
  EN_PLANIFICATION: ['EN_COURS',    'CLOTURE'],
  EN_COURS:         ['IMPLEMENTE',  'EN_ECHEC', 'CLOTURE'],
  IMPLEMENTE:       ['TESTE',       'EN_ECHEC'],
  TESTE:            ['CLOTURE'],
  EN_ECHEC:         ['EN_PLANIFICATION',    'CLOTURE'],
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
      rfc:           { select: { code_rfc: true, titre_rfc: true } },
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

  // Règle ITIL : RFC APPROUVEE obligatoire si fournie
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

  // Vérifications
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
      statut:          {
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
//
//  EN_PLANIFICATION  → dates, env, manager, plan, rollback, guide, tâches
//  EN_COURS          → tâches uniquement
//  EN_ECHEC          → dates de reprogrammation seulement
// ─────────────────────────────────────────────────────────────
const updateChangement = async (id, data) => {
  const changement = await prisma.changement.findUnique({
    where:   { id_changement: id },
    include: { statut: true, taches: true },
  });
  if (!changement) throw new Error("Changement introuvable");

  const statut = changement.statut.code_statut;

  // ── Statut non modifiable ─────────────────────────────────
  if (!['EN_PLANIFICATION', 'EN_COURS', 'EN_ECHEC'].includes(statut)) {
    throw new Error(`Impossible de modifier un Changement au statut "${statut}"`);
  }

  // ── EN_COURS : tâches uniquement ─────────────────────────
  if (statut === 'EN_COURS') {
    if (data.taches) {
      await _syncTaches(id, data.taches, changement.taches);
    }
    return getChangementById(id);
  }

  // ── EN_ECHEC : dates seulement ────────────────────────────
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

  // ── PLANIFIE : tout modifiable ────────────────────────────
  const {
    date_debut, date_fin_prevu,
    id_env, id_user,
    plan_changement,   // { titre_plan, etapes_plan, duree_estimee }
    plan_rollback,     // { description, procedure_rollback }
    guide,             // { nom_guide, contenu }
    taches,            // tableau de tâches
  } = data;

  // Mise à jour des champs de base
  await prisma.changement.update({
    where: { id_changement: id },
    data: {
      ...(date_debut     && { date_debut:    new Date(date_debut) }),
      ...(date_fin_prevu && { date_fin_prevu: new Date(date_fin_prevu) }),
      ...(id_env         && { environnement: { connect: { id_env } } }),
      ...(id_user        && { changeManager: { connect: { id_user } } }),
    },
  });

  // Plan de Changement (upsert)
  if (plan_changement) {
    const existing = await prisma.planChangement.findUnique({
      where: { id_changement: id },
    });
    if (existing) {
      await prisma.planChangement.update({
        where: { id_changement: id },
        data: {
          ...(plan_changement.titre_plan   && { titre_plan:   plan_changement.titre_plan }),
          ...(plan_changement.etapes_plan  && { etapes_plan:  plan_changement.etapes_plan }),
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

  // Plan de Rollback (upsert)
  if (plan_rollback) {
    const existing = await prisma.planRollback.findUnique({
      where: { id_changement: id },
    });
    if (existing) {
      await prisma.planRollback.update({
        where: { id_changement: id },
        data: {
          ...(plan_rollback.description         && { description:         plan_rollback.description }),
          ...(plan_rollback.procedure_rollback  && { procedure_rollback:  plan_rollback.procedure_rollback }),
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

  // Guide (crée ou met à jour le premier guide du changement)
  if (guide) {
    const existingGuide = await prisma.guide.findFirst({
      where: { id_changement: id },
    });
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

  // Tâches
  if (taches) {
    await _syncTaches(id, taches, changement.taches);
  }

  return getChangementById(id);
};

// ─────────────────────────────────────────────────────────────
// Helper interne : synchroniser les tâches
//
//  Chaque item dans le tableau `taches` peut être :
//  - { titre_tache, description, duree, id_user, ordre_tache }   → créer
//  - { id_tache, titre_tache, ... }                              → mettre à jour
//  - { id_tache, _delete: true }                                 → supprimer (logique : statut TERMINEE)
// ─────────────────────────────────────────────────────────────
async function _syncTaches(id_changement, taches, tachesExistantes) {
  for (const t of taches) {
    if (t._delete && t.id_tache) {
      // Suppression logique : on ne supprime pas physiquement
      // On ne fait rien — les tâches restent pour la traçabilité
      // Si besoin on pourrait ajouter un champ `annulee: true`
      continue;
    }

    if (t.id_tache) {
      // Mise à jour d'une tâche existante
      await prisma.tache.update({
        where: { id_tache: t.id_tache },
        data: {
          ...(t.titre_tache   && { titre_tache:  t.titre_tache }),
          ...(t.description   && { description:  t.description }),
          ...(t.duree         !== undefined && { duree: t.duree }),
          ...(t.ordre_tache   !== undefined && { ordre_tache: t.ordre_tache }),
          ...(t.id_user       && { implementeur: { connect: { id_user: t.id_user } } }),
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
          implementeur: { connect: { id_user: t.id_user } },
        },
      });
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 5. Changer le statut d'un Changement (machine à états)
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

  // ── Vérifier la transition ────────────────────────────────
  const statutActuel  = changement.statut.code_statut;
  const transitionsOk = TRANSITIONS_AUTORISEES[statutActuel] || [];

  if (!transitionsOk.includes(statutCible.code_statut)) {
    throw new Error(
      `Transition Changement interdite : ${statutActuel} → ${statutCible.code_statut}. ` +
      `Autorisées : [${transitionsOk.join(', ') || 'aucune'}]`
    );
  }

  // ── Règle ITIL : plan de rollback obligatoire avant EN_COURS ─
  if (statutCible.code_statut === 'EN_COURS' && !changement.planRollback) {
    throw new Error(
      "Un Plan de Rollback est obligatoire avant de démarrer l'exécution (ITIL). " +
      "Ajoutez-le via PUT /api/changements/:id avec { plan_rollback: {...} }"
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.changement.update({
      where: { id_changement: id },
      data: {
        id_statut: statutCible.id_statut,
        ...(statutCible.code_statut === 'CLOTURE'  && { date_fin_reelle: new Date(), reussite: true }),
        ...(statutCible.code_statut === 'EN_ECHEC' && { reussite: false }),
      },
      include: CHANGEMENT_INCLUDE,
    });

    // Historiser
    await tx.statutHistory.create({
      data: {
        code_metier:   `SHS-${Date.now()}`,
        id_statut:     statutCible.id_statut,
        id_changement: id,
        id_user:       id_user_action ?? null,
        commentaire:   commentaire ?? null,
      },
    });

    return updated;
  });
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

  return prisma.$transaction(async (tx) => {
    const updated = await tx.changement.update({
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
        commentaire:   raison ?? 'Changement clôturé.',
      },
    });

    return updated;
  });
};

module.exports = {
  getAllChangements,
  getChangementById,
  createChangement,
  updateChangement,
  updateChangementStatus,
  cloturerChangement,
  TRANSITIONS_AUTORISEES,
};