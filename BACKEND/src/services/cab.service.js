'use strict';

/**
 * ============================================================
 * cab.service.js — Logique Prisma pure (CAB) + Audit + WebSocket
 * ============================================================
 * Votes, Décisions, Membres, Réunions → tout tracé dans AuditLog.
 * Votes et Décisions → émis en temps réel via socket.service.
 * ============================================================
 */

const prisma      = require('./prisma.service');
const auditSvc    = require('./audit.service');
const socketSvc   = require('./socket.service');
const {
  codeCab,
  codeReunionCab,
  codeVoteCab,
  codeDecisionCab,
} = require('../utils/entity-code.utils');

// ─── Selects réutilisables ────────────────────────────────────

const CAB_SELECT = {
  id_cab:        true,
  nom_cab:       true,
  code_metier:   true,
  type_cab:      true,
  date_creation: true,
  membres: {
    select: {
      role:          true,
      date_adhesion: true,
      utilisateur: {
        select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
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
        select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
      },
    },
  },
  rfcReunions: {
    select: {
      rfc: {
        select: { id_rfc: true, code_rfc: true, titre_rfc: true, id_statut: true },
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
  utilisateur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
  rfc:         { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
};

const DECISION_SELECT = {
  id_decision:   true,
  code_metier:   true,
  decision:      true,
  motif:         true,
  date_decision: true,
  id_reunion:    true,
  id_rfc:        true,
  rfc: { select: { id_rfc: true, code_rfc: true, titre_rfc: true } },
};

// ============================================================
// CAB
// ============================================================

async function createCab(data) {
  const { nom_cab, type_cab, id_president, member_ids = [] } = data;

  const membresToCreate = [];
  if (id_president) membresToCreate.push({ id_user: id_president, role: 'PRESIDENT' });
  member_ids.forEach(id_user => {
    if (id_user !== id_president) membresToCreate.push({ id_user, role: 'MEMBRE' });
  });

  const cab = await prisma.cab.create({
    data: {
      nom_cab,
      code_metier: codeCab(),
      type_cab,
      membres: { create: membresToCreate },
    },
    select: CAB_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  auditSvc.ENTITES.REUNION,
    entite_id:    cab.id_cab,
    id_user:      id_president ?? null,
    nouvelle_val: { nom_cab, type_cab, membres: membresToCreate.length },
  });

  return cab;
}

async function getAllCabs() {
  return prisma.cab.findMany({ orderBy: { date_creation: 'desc' }, select: CAB_SELECT });
}

async function getCabById(id_cab) {
  return prisma.cab.findUnique({ where: { id_cab }, select: CAB_SELECT });
}

async function updateCab(id_cab, data) {
  const { nom_cab, type_cab, membres = [] } = data;

  const ACTIONS_VALIDES = ['ADD', 'REMOVE', 'UPDATE'];
  const ROLES_VALIDES   = ['PRESIDENT', 'MEMBRE'];

  if (membres) {
    for (const op of membres) {
      if (!ACTIONS_VALIDES.includes(op.action)) {
        const err = new Error(`Action invalide : "${op.action}".`);
        err.code = 'INVALID_ACTION'; throw err;
      }
      if (!op.id_user || typeof op.id_user !== 'string') {
        const err = new Error('id_user (UUID) est obligatoire.');
        err.code = 'MISSING_ID_USER'; throw err;
      }
      if ((op.action === 'ADD' || op.action === 'UPDATE') && op.role && !ROLES_VALIDES.includes(op.role)) {
        const err = new Error(`Rôle invalide : "${op.role}".`);
        err.code = 'INVALID_ROLE'; throw err;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    const updateData = {};
    if (nom_cab !== undefined) updateData.nom_cab = nom_cab;
    if (type_cab !== undefined) updateData.type_cab = type_cab;
    if (Object.keys(updateData).length > 0)
      await tx.cab.update({ where: { id_cab }, data: updateData });

    if (membres?.length > 0) {
      for (const op of membres) {
        const { action, id_user, role } = op;

        if (action === 'REMOVE') {
          await tx.membreCab.deleteMany({ where: { id_cab, id_user } });

        } else if (action === 'ADD') {
          const user = await tx.utilisateur.findUnique({
            where: { id_user }, select: { id_user: true, actif: true, nom_user: true, prenom_user: true },
          });
          if (!user) { const e = new Error(`Utilisateur introuvable : ${id_user}`); e.code = 'USER_NOT_FOUND'; throw e; }
          if (!user.actif) { const e = new Error('Compte désactivé.'); e.code = 'USER_INACTIVE'; throw e; }

          const roleEffectif = role ?? 'MEMBRE';
          if (roleEffectif === 'PRESIDENT') await _destituerPresidents(tx, id_cab, id_user);

          await tx.membreCab.upsert({
            where:  { id_cab_id_user: { id_cab, id_user } },
            update: { role: roleEffectif },
            create: { id_cab, id_user, role: roleEffectif },
          });

        } else if (action === 'UPDATE') {
          const existing = await tx.membreCab.findUnique({ where: { id_cab_id_user: { id_cab, id_user } } });
          if (!existing) { const e = new Error(`L'utilisateur ${id_user} n'est pas membre.`); e.code = 'MEMBRE_NOT_FOUND'; throw e; }
          if (role === 'PRESIDENT') await _destituerPresidents(tx, id_cab, id_user);
          await tx.membreCab.update({ where: { id_cab_id_user: { id_cab, id_user } }, data: { role } });
        }
      }
    }
  });

  return prisma.cab.findUnique({ where: { id_cab }, select: CAB_SELECT });
}

async function _destituerPresidents(tx, id_cab, id_user_exclu) {
  await tx.membreCab.updateMany({
    where: { id_cab, role: 'PRESIDENT', id_user: { not: id_user_exclu } },
    data:  { role: 'MEMBRE' },
  });
}

async function deleteCab(id_cab) {
  const reunionActive = await prisma.reunionCab.findFirst({ where: { id_cab } });
  if (reunionActive) {
    const err = new Error('Impossible de supprimer ce CAB : des réunions lui sont associées.');
    err.code = 'CAB_IN_USE'; err.statusCode = 409; throw err;
  }
  await prisma.cab.delete({ where: { id_cab } });
  return { deleted: true, id_cab };
}

// ============================================================
// MEMBRES
// ============================================================

async function addMembre(id_cab, data) {
  const { id_user, role = 'MEMBRE' } = data;

  const membre = await prisma.membreCab.create({
    data: { id_cab, id_user, role },
    select: {
      role: true, date_adhesion: true,
      utilisateur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
    },
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  'MEMBRE_CAB',
    entite_id:    id_cab,
    id_user,
    nouvelle_val: { id_cab, id_user, role },
  });

  return membre;
}

async function getMembresByCab(id_cab) {
  return prisma.membreCab.findMany({
    where:   { id_cab },
    orderBy: { date_adhesion: 'asc' },
    select: {
      role: true, date_adhesion: true,
      utilisateur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
    },
  });
}

async function removeMembre(id_cab, id_user) {
  await prisma.membreCab.delete({ where: { id_cab_id_user: { id_cab, id_user } } });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.DELETE,
    entite_type:  'MEMBRE_CAB',
    entite_id:    id_cab,
    id_user,
    ancienne_val: { id_cab, id_user },
    nouvelle_val: null,
  });

  return { deleted: true, id_cab, id_user };
}

// ============================================================
// RÉUNIONS
// ============================================================

async function createReunion(id_cab, data) {
  const { date_reunion, heure_debut = null, heure_fin = null, ordre_jour = null } = data;

  const reunion = await prisma.reunionCab.create({
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

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  auditSvc.ENTITES.REUNION,
    entite_id:    reunion.id_reunion,
    id_user:      null,
    nouvelle_val: { id_cab, date_reunion, ordre_jour },
  });

  return reunion;
}

async function getReunionsByCab(id_cab) {
  return prisma.reunionCab.findMany({
    where: { id_cab }, orderBy: { date_reunion: 'desc' }, select: REUNION_SELECT,
  });
}

async function getReunionById(id_reunion) {
  return prisma.reunionCab.findUnique({ where: { id_reunion }, select: REUNION_SELECT });
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

  const reunion = await prisma.reunionCab.update({
    where: { id_reunion }, data: updateData, select: REUNION_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.REUNION,
    entite_id:    id_reunion,
    id_user:      null,
    nouvelle_val: updateData,
  });

  return reunion;
}

// ============================================================
// AGENDA (RfcReunion)
// ============================================================

async function addRfcToAgenda(id_reunion, id_rfc) {
  await prisma.rfcReunion.create({ data: { id_rfc, id_reunion } });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.REUNION,
    entite_id:    id_reunion,
    id_user:      null,
    nouvelle_val: { action: 'RFC_AJOUTEE_AGENDA', id_rfc, id_reunion },
  });

  return prisma.rfc.findUnique({
    where:  { id_rfc },
    select: { id_rfc: true, code_rfc: true, titre_rfc: true, id_statut: true },
  });
}

async function getRfcsByReunion(id_reunion) {
  const liens = await prisma.rfcReunion.findMany({
    where: { id_reunion },
    select: {
      rfc: {
        select: {
          id_rfc: true, code_rfc: true, titre_rfc: true, id_statut: true,
          demandeur: { select: { nom_user: true, prenom_user: true } },
        },
      },
    },
  });
  return liens.map(l => l.rfc);
}

async function removeRfcFromAgenda(id_reunion, id_rfc) {
  await prisma.rfcReunion.delete({ where: { id_rfc_id_reunion: { id_rfc, id_reunion } } });
  return { deleted: true, id_reunion, id_rfc };
}

// ============================================================
// PARTICIPANTS
// ============================================================

async function addParticipant(id_reunion, id_user) {
  await prisma.participant.create({ data: { id_reunion, id_user } });
  return prisma.utilisateur.findUnique({
    where:  { id_user },
    select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
  });
}

async function getParticipantsByReunion(id_reunion) {
  const participants = await prisma.participant.findMany({
    where:  { id_reunion },
    select: { utilisateur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } } },
  });
  return participants.map(p => p.utilisateur);
}

async function removeParticipant(id_reunion, id_user) {
  await prisma.participant.delete({ where: { id_reunion_id_user: { id_reunion, id_user } } });
  return { deleted: true, id_reunion, id_user };
}

// ============================================================
// VOTES
// ============================================================

/**
 * Enregistre un vote et l'émet en temps réel aux watchers de la réunion.
 * Événement : cab:vote  →  room reunion_{id_reunion}
 */
async function castVote(id_reunion, id_rfc, data) {
  const { id_user, valeur_vote } = data;

  const vote = await prisma.voteCab.create({
    data: {
      code_metier: codeVoteCab(),
      valeur_vote,
      id_reunion,
      id_user,
      id_rfc,
    },
    select: VOTE_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.VOTE,
    entite_type:  auditSvc.ENTITES.VOTE,
    entite_id:    vote.id_vote,
    id_user,
    ancienne_val: null,
    nouvelle_val: {
      id_reunion,
      id_rfc,
      valeur_vote,
      rfc_code: vote.rfc?.code_rfc ?? null,
    },
  });

  // ── WebSocket — temps réel ─────────────────────────────────
  socketSvc.emitCabVote(id_reunion, {
    id_vote:     vote.id_vote,
    valeur_vote: vote.valeur_vote,
    date_vote:   vote.date_vote,
    id_rfc,
    rfc_code:    vote.rfc?.code_rfc ?? null,
    votant: vote.utilisateur
      ? `${vote.utilisateur.prenom_user} ${vote.utilisateur.nom_user}`
      : null,
    timestamp: new Date().toISOString(),
  });

  return vote;
}

async function getVotesByReunion(id_reunion) {
  return prisma.voteCab.findMany({
    where: { id_reunion }, orderBy: { date_vote: 'asc' }, select: VOTE_SELECT,
  });
}

async function getVotesByRfc(id_reunion, id_rfc) {
  return prisma.voteCab.findMany({
    where: { id_reunion, id_rfc }, orderBy: { date_vote: 'asc' }, select: VOTE_SELECT,
  });
}

// ============================================================
// DÉCISIONS
// ============================================================

/**
 * Enregistre une décision finale et l'émet en temps réel.
 * Événements :
 *   cab:decision → room reunion_{id_reunion}
 *   cab:decision → room rfc_{id_rfc}
 *   kpi:refresh  → room dashboard
 */
async function createDecision(id_reunion, id_rfc, data) {
  const { decision, motif = null } = data;

  const dec = await prisma.decisionCab.create({
    data: {
      code_metier: codeDecisionCab(),
      decision,
      motif,
      id_reunion,
      id_rfc,
    },
    select: DECISION_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.DECISION,
    entite_type:  auditSvc.ENTITES.DECISION,
    entite_id:    dec.id_decision,
    id_user:      null,
    ancienne_val: null,
    nouvelle_val: {
      id_reunion,
      id_rfc,
      decision,
      motif,
      rfc_code: dec.rfc?.code_rfc ?? null,
    },
  });

  // ── WebSocket — temps réel ─────────────────────────────────
  socketSvc.emitCabDecision(id_reunion, id_rfc, {
    id_decision:   dec.id_decision,
    decision:      dec.decision,
    motif:         dec.motif,
    date_decision: dec.date_decision,
    rfc_code:      dec.rfc?.code_rfc ?? null,
    timestamp:     new Date().toISOString(),
  });

  return dec;
}

async function getDecisionsByReunion(id_reunion) {
  return prisma.decisionCab.findMany({
    where: { id_reunion }, orderBy: { date_decision: 'asc' }, select: DECISION_SELECT,
  });
}

async function getDecisionByRfc(id_reunion, id_rfc) {
  return prisma.decisionCab.findUnique({
    where: { id_reunion_id_rfc: { id_reunion, id_rfc } }, select: DECISION_SELECT,
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