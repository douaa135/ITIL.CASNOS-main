'use strict';

/**
 * ============================================================
 * cab.service.js — Logique Prisma pure (CAB)
 * ============================================================
 * Toutes les validations et vérifications sont dans cab.middleware.js.
 * Ce fichier ne contient que les opérations base de données.
 *
 * GROUPES DE FONCTIONS :
 *
 *  CAB
 *   createCab(data)
 *   getAllCabs()
 *   getCabById(id_cab)
 *
 *  MEMBRES
 *   addMembre(id_cab, data)
 *   getMembresByCab(id_cab)
 *   removeMembre(id_cab, id_user)
 *
 *  RÉUNIONS
 *   createReunion(id_cab, data)
 *   getReunionsByCab(id_cab)
 *   getReunionById(id_reunion)
 *   updateReunion(id_reunion, data)
 *
 *  AGENDA (RfcReunion)
 *   addRfcToAgenda(id_reunion, id_rfc)
 *   getRfcsByReunion(id_reunion)
 *   removeRfcFromAgenda(id_reunion, id_rfc)
 *
 *  PARTICIPANTS
 *   addParticipant(id_reunion, id_user)
 *   getParticipantsByReunion(id_reunion)
 *   removeParticipant(id_reunion, id_user)
 *
 *  VOTES
 *   castVote(id_reunion, id_rfc, data)
 *   getVotesByReunion(id_reunion)
 *   getVotesByRfc(id_reunion, id_rfc)
 *
 *  DÉCISIONS
 *   createDecision(id_reunion, id_rfc, data)
 *   getDecisionsByReunion(id_reunion)
 *   getDecisionByRfc(id_reunion, id_rfc)
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const {
  codeCab,
  codeReunionCab,
  codeVoteCab,
  codeDecisionCab,
} = require('../utils/entity-code.utils');

// ─── Selects réutilisables ────────────────────────────────────────────────────

const CAB_SELECT = {
  id_cab:        true,
  code_metier:   true,
  nom_cab:       true,
  type_cab:      true,
  date_creation: true,
  membres: {
    select: {
      role:          true,
      date_adhesion: true,
      utilisateur: {
        select: {
          id_user:     true,
          nom_user:    true,
          prenom_user: true,
          email_user:  true,
        },
      },
    },
  },
};

const REUNION_SELECT = {
  id_reunion:   true,
  code_metier:  true,
  date_reunion: true,
  heure_debut:  true,
  heure_fin:    true,
  ordre_jour:   true,
  id_cab:       true,
  participants: {
    select: {
      utilisateur: {
        select: {
          id_user:     true,
          nom_user:    true,
          prenom_user: true,
          email_user:  true,
        },
      },
    },
  },
  rfcReunions: {
    select: {
      rfc: {
        select: {
          id_rfc:    true,
          code_rfc:  true,
          titre_rfc: true,
          id_statut: true,
        },
      },
    },
  },
  votesCab: {
    select: {
      id_vote:     true,
      valeur_vote: true,
      date_vote:   true,
      utilisateur: { select: { id_user: true, nom_user: true, prenom_user: true } },
      rfc:         { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
    },
  },
  decisionsCab: {
    select: {
      id_decision:   true,
      decision:      true,
      motif:         true,
      date_decision: true,
      rfc:           { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
    },
  },
};

const VOTE_SELECT = {
  id_vote:     true,
  code_metier: true,
  valeur_vote: true,
  date_vote:   true,
  id_reunion:  true,
  id_rfc:      true,
  utilisateur: { 
    select: { 
      id_user: true, 
      nom_user: true, 
      prenom_user: true, 
      email_user: true 
    } 
  },
  rfc:         { 
    select: { 
      id_rfc: true, 
      code_rfc: true, 
      titre_rfc: true 
    } 
  },
};

const DECISION_SELECT = {
  id_decision:   true,
  code_metier:   true,
  decision:      true,
  motif:         true,
  date_decision: true,
  id_reunion:    true,
  id_rfc:        true,
  rfc: { 
    select: { 
      id_rfc: true, 
      code_rfc: true, 
      titre_rfc: true 
    } 
  },
};


// ============================================================
// CAB
// ============================================================

async function createCab(data) {
  const { nom_cab, type_cab, id_president, member_ids = [] } = data;

  const membresToCreate = [];
  if (id_president) {
    membresToCreate.push({ id_user: id_president, role: 'PRESIDENT' });
  }
  member_ids.forEach(id_user => {
    if (id_user !== id_president) {
      membresToCreate.push({ id_user, role: 'MEMBRE' });
    }
  });

  return prisma.cab.create({
    data: {
      code_metier:   codeCab(),
      nom_cab,
      type_cab,
      membres: {
        create: membresToCreate
      }
    },
    select: CAB_SELECT,
  });
}

async function getAllCabs() {
  return prisma.cab.findMany({
    orderBy: { date_creation: 'desc' },
    select:  CAB_SELECT,
  });
}

async function getCabById(id_cab) {
  return prisma.cab.findUnique({
    where:  { id_cab },
    select: CAB_SELECT,
  });
}

// ─── deleteCab ────────
async function deleteCab(id_cab) {
  // Vérifier qu'aucune réunion active n'est attachée
  const reunionActive = await prisma.reunionCab.findFirst({
    where: { id_cab },
  });

  if (reunionActive) {
    const err = new Error(
      'Impossible de supprimer ce CAB : des réunions lui sont associées. ' +
      'Supprimez-les d\'abord.'
    );
    err.code = 'CAB_IN_USE';
    err.statusCode = 409;
    throw err;
  }

  await prisma.cab.delete({ where: { id_cab } });
  return { deleted: true, id_cab };
}

// ─── updateCab (admin) ────────────────────────────────────────
/**
 * Met à jour un CAB côté admin.
 * Permet de modifier :
 *   - type_cab         → champ principal du CAB
 *   - membres          → tableau d'opérations sur les membres
 *
 * Format du tableau "membres" :
 * [
 *   // Ajouter un nouveau membre
 *   { action: 'ADD',    id_user: 'uuid', role: 'MEMBRE' },
 *   // Retirer un membre existant
 *   { action: 'REMOVE', id_user: 'uuid' },
 *   // Changer le rôle d'un membre (ex: promouvoir PRESIDENT)
 *   { action: 'UPDATE', id_user: 'uuid', role: 'PRESIDENT' },
 * ]
 *
 * Règle ITIL : un seul PRESIDENT par CAB.
 * Si on attribue PRESIDENT à un membre, l'ancien PRESIDENT
 * est automatiquement rétrogradé à MEMBRE.
 *
 * @param {string} id_cab
 * @param {object} data   { type_cab?, membres? }
 * @returns {object}      CAB complet mis à jour
 */
async function updateCab(id_cab, data) {
  const { nom_cab, type_cab, id_president, membres = [] } = data;

  if (id_president) {
    const alreadyInOps = membres.find(m => m.id_user === id_president);
    if (!alreadyInOps) {
      membres.push({ action: 'ADD', id_user: id_president, role: 'PRESIDENT' });
    } else {
      alreadyInOps.role = 'PRESIDENT';
      if (alreadyInOps.action === 'REMOVE') alreadyInOps.action = 'UPDATE';
    }
  }

  // ── 1. Valider les actions membres avant toute modification ──
  const ACTIONS_VALIDES = ['ADD', 'REMOVE', 'UPDATE'];
  const ROLES_VALIDES   = ['PRESIDENT', 'MEMBRE'];

  if (membres) {
    for (const op of membres) {
      if (!ACTIONS_VALIDES.includes(op.action)) {
        const err = new Error(
          `Action invalide : "${op.action}". Valeurs acceptées : ${ACTIONS_VALIDES.join(', ')}.`
        );
        err.code = 'INVALID_ACTION';
        err.statusCode = 400;
        throw err;
      }

      if (!op.id_user || typeof op.id_user !== 'string') {
        const err = new Error('Chaque opération membre doit contenir "id_user" (UUID).');
        err.code = 'MISSING_ID_USER';
        err.statusCode = 400;
        throw err;
      }

      if ((op.action === 'ADD' || op.action === 'UPDATE') && op.role) {
        if (!ROLES_VALIDES.includes(op.role)) {
          const err = new Error(
            `Rôle invalide : "${op.role}". Valeurs acceptées : ${ROLES_VALIDES.join(', ')}.`
          );
          err.code = 'INVALID_ROLE';
          err.statusCode = 400;
          throw err;
        }
      }
    }
  }

  // ── 2. Transaction atomique ───────────────────────────────────
  await prisma.$transaction(async (tx) => {

    // 2a. Modifier les champs principaux si fournis
    const updateData = {};
    if (nom_cab !== undefined) updateData.nom_cab = nom_cab;
    if (type_cab !== undefined) updateData.type_cab = type_cab;

    if (Object.keys(updateData).length > 0) {
      await tx.cab.update({
        where: { id_cab },
        data:  updateData,
      });
    }

    // 2b. Appliquer les opérations sur les membres
    if (membres && membres.length > 0) {
      for (const op of membres) {
        const { action, id_user, role } = op;

        if (action === 'REMOVE') {
          // Supprimer le lien membre ↔ CAB (silencieux si déjà absent)
          await tx.membreCab.deleteMany({
            where: { id_cab, id_user },
          });

        } else if (action === 'ADD') {
          // Vérifier que l'utilisateur existe et est actif
          const user = await tx.utilisateur.findUnique({
            where:  { id_user },
            select: { id_user: true, actif: true, nom_user: true, prenom_user: true },
          });

          if (!user) {
            const err = new Error(`Utilisateur introuvable : ${id_user}`);
            err.code = 'USER_NOT_FOUND';
            err.statusCode = 404;
            throw err;
          }
          if (!user.actif) {
            const err = new Error(
              `Le compte de ${user.prenom_user} ${user.nom_user} est désactivé.`
            );
            err.code = 'USER_INACTIVE';
            err.statusCode = 400;
            throw err;
          }

          // Si le nouveau rôle est PRESIDENT, rétrograder l'ancien
          const roleEffectif = role ?? 'MEMBRE';
          if (roleEffectif === 'PRESIDENT') {
            await _destituerPresidents(tx, id_cab, id_user);
          }

          // Upsert : crée ou met à jour si déjà membre
          await tx.membreCab.upsert({
            where:  { id_cab_id_user: { id_cab, id_user } },
            update: { role: roleEffectif },
            create: { id_cab, id_user, role: roleEffectif },
          });

        } else if (action === 'UPDATE') {
          // Vérifier que le membre existe
          const existing = await tx.membreCab.findUnique({
            where: { id_cab_id_user: { id_cab, id_user } },
          });

          if (!existing) {
            const err = new Error(
              `L'utilisateur ${id_user} n'est pas membre de ce CAB. ` +
              'Utilisez action: "ADD" pour l\'ajouter.'
            );
            err.code = 'MEMBRE_NOT_FOUND';
            err.statusCode = 404;
            throw err;
          }

          // Si promotion PRESIDENT → rétrograder l'ancien
          if (role === 'PRESIDENT') {
            await _destituerPresidents(tx, id_cab, id_user);
          }

          await tx.membreCab.update({
            where: { id_cab_id_user: { id_cab, id_user } },
            data:  { role },
          });
        }
      }
    }
  });

  // ── 3. Retourner le CAB complet mis à jour ────────────────────
  return prisma.cab.findUnique({
    where:  { id_cab },
    select: CAB_SELECT,
  });
}

// ─── Helper : rétrograder l'actuel PRESIDENT en MEMBRE ───────
/**
 * @param {object} tx          Transaction Prisma
 * @param {string} id_cab
 * @param {string} id_user_exclu  UUID du nouveau PRESIDENT (ne pas rétrograder)
 */
async function _destituerPresidents(tx, id_cab, id_user_exclu) {
  await tx.membreCab.updateMany({
    where: {
      id_cab,
      role:    'PRESIDENT',
      id_user: { not: id_user_exclu },
    },
    data: { role: 'MEMBRE' },
  });
}

// ============================================================
// MEMBRES
// ============================================================

async function addMembre(id_cab, data) {
  const { id_user, role = 'MEMBRE', date_adhesion = null } = data;

  return prisma.membreCab.create({
    data: {
      id_cab,
      id_user,
      role,
    },
    select: {
      role:          true,
      date_adhesion: true,
      utilisateur: {
        select: { 
          id_user: true, 
          nom_user: true, 
          prenom_user: true, 
          email_user: true 
        },
      },
    },
  });
}

async function getMembresByCab(id_cab) {
  return prisma.membreCab.findMany({
    where:   { id_cab },
    orderBy: { date_adhesion: 'asc' },
    select: {
      role:          true,
      date_adhesion: true,
      utilisateur: {
        select: { 
          id_user: true, 
          nom_user: true, 
          prenom_user: true, 
          email_user: true 
        },
      },
    },
  });
}

async function removeMembre(id_cab, id_user) {
  await prisma.membreCab.delete({
    where: { id_cab_id_user: { id_cab, id_user } },
  });
  return { deleted: true, id_cab, id_user };
}


// ============================================================
// RÉUNIONS
// ============================================================

async function createReunion(id_cab, data) {
  const {
    date_reunion,
    heure_debut = null,
    heure_fin   = null,
    ordre_jour  = null,
  } = data;

  return prisma.reunionCab.create({
    data: {
      code_metier:  codeReunionCab(),
      date_reunion: new Date(date_reunion),
      heure_debut:  heure_debut ? new Date(`1970-01-01T${heure_debut}`) : null,
      heure_fin:    heure_fin   ? new Date(`1970-01-01T${heure_fin}`)   : null,
      ordre_jour,
      id_cab,
    },
    select: REUNION_SELECT,
  });
}

async function getReunionsByCab(id_cab) {
  return prisma.reunionCab.findMany({
    where:   { id_cab },
    orderBy: { date_reunion: 'desc' },
    select:  REUNION_SELECT,
  });
}

async function getReunionById(id_reunion) {
  return prisma.reunionCab.findUnique({
    where:  { id_reunion },
    select: REUNION_SELECT,
  });
}

async function updateReunion(id_reunion, data) {
  const allowed    = ['date_reunion', 'heure_debut', 'heure_fin', 'ordre_jour'];
  const updateData = {};

  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  if (updateData.date_reunion) updateData.date_reunion = new Date(updateData.date_reunion);
  if (updateData.heure_debut)  updateData.heure_debut  = new Date(`1970-01-01T${updateData.heure_debut}`);
  if (updateData.heure_fin)    updateData.heure_fin    = new Date(`1970-01-01T${updateData.heure_fin}`);

  return prisma.reunionCab.update({
    where:  { id_reunion },
    data:   updateData,
    select: REUNION_SELECT,
  });
}


// ============================================================
// AGENDA (RfcReunion)
// ============================================================

async function addRfcToAgenda(id_reunion, id_rfc) {
  await prisma.rfcReunion.create({
    data: { id_rfc, id_reunion },
  });

  // Retourner la RFC inscrite avec ses infos
  return prisma.rfc.findUnique({
    where:  { id_rfc },
    select: { 
      id_rfc: true, 
      code_rfc: true, 
      titre_rfc: true, 
      id_statut: true 
    },
  });
}

async function getRfcsByReunion(id_reunion) {
  const liens = await prisma.rfcReunion.findMany({
    where:  { id_reunion },
    select: {
      rfc: {
        select: {
          id_rfc:    true,
          code_rfc:  true,
          titre_rfc: true,
          id_statut: true,
          demandeur: { 
            select: { 
              nom_user: true, 
              prenom_user: true 
            } 
          },
        },
      },
    },
  });
  return liens.map(l => l.rfc);
}

async function removeRfcFromAgenda(id_reunion, id_rfc) {
  await prisma.rfcReunion.delete({
    where: { id_rfc_id_reunion: { id_rfc, id_reunion } },
  });
  return { deleted: true, id_reunion, id_rfc };
}


// ============================================================
// PARTICIPANTS
// ============================================================

async function addParticipant(id_reunion, id_user) {
  await prisma.participant.create({
    data: { id_reunion, id_user },
  });

  return prisma.utilisateur.findUnique({
    where:  { id_user },
    select: { 
      id_user: true, 
      nom_user: true, 
      prenom_user: true, 
      email_user: true 
    },
  });
}

async function getParticipantsByReunion(id_reunion) {
  const participants = await prisma.participant.findMany({
    where:  { id_reunion },
    select: {
      utilisateur: {
        select: { 
          id_user: true, 
          nom_user: true, 
          prenom_user: true, 
          email_user: true 
        },
      },
    },
  });
  return participants.map(p => p.utilisateur);
}

async function removeParticipant(id_reunion, id_user) {
  await prisma.participant.delete({
    where: { id_reunion_id_user: { id_reunion, id_user } },
  });
  return { deleted: true, id_reunion, id_user };
}


// ============================================================
// VOTES
// ============================================================

async function castVote(id_reunion, id_rfc, data) {
  const { id_user, valeur_vote } = data;

  return prisma.voteCab.create({
    data: {
      code_metier: codeVoteCab(),
      valeur_vote,
      id_reunion,
      id_user,
      id_rfc,
    },
    select: VOTE_SELECT,
  });
}

async function getVotesByReunion(id_reunion) {
  return prisma.voteCab.findMany({
    where:   { id_reunion },
    orderBy: { date_vote: 'asc' },
    select:  VOTE_SELECT,
  });
}

async function getVotesByRfc(id_reunion, id_rfc) {
  return prisma.voteCab.findMany({
    where:   { id_reunion, id_rfc },
    orderBy: { date_vote: 'asc' },
    select:  VOTE_SELECT,
  });
}


// ============================================================
// DÉCISIONS
// ============================================================

async function createDecision(id_reunion, id_rfc, data) {
  const { decision, motif = null } = data;

  return prisma.decisionCab.create({
    data: {
      code_metier: codeDecisionCab(),
      decision,
      motif,
      id_reunion,
      id_rfc,
    },
    select: DECISION_SELECT,
  });
}

async function getDecisionsByReunion(id_reunion) {
  return prisma.decisionCab.findMany({
    where:   { id_reunion },
    orderBy: { date_decision: 'asc' },
    select:  DECISION_SELECT,
  });
}

async function getDecisionByRfc(id_reunion, id_rfc) {
  return prisma.decisionCab.findUnique({
    where:  { id_reunion_id_rfc: { id_reunion, id_rfc } },
    select: DECISION_SELECT,
  });
}


module.exports = {
  // CAB
  createCab,
  getAllCabs,
  getCabById,
  updateCab,
  deleteCab,
  // Membres
  addMembre,
  getMembresByCab,
  removeMembre,
  // Réunions
  createReunion,
  getReunionsByCab,
  getReunionById,
  updateReunion,
  // Agenda
  addRfcToAgenda,
  getRfcsByReunion,
  removeRfcFromAgenda,
  // Participants
  addParticipant,
  getParticipantsByReunion,
  removeParticipant,
  // Votes
  castVote,
  getVotesByReunion,
  getVotesByRfc,
  // Décisions
  createDecision,
  getDecisionsByReunion,
  getDecisionByRfc,
};