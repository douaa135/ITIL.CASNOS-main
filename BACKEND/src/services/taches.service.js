'use strict';

/**
 * ============================================================
 * taches.service.js — Logique Prisma pure (Tâches + Journaux)
 * Toutes les actions tracées dans AuditLog via audit.service.js
 * ============================================================
 */

const prisma           = require('./prisma.service');
const notifSvc         = require('./notification.service');
const auditSvc         = require('./audit.service');
const statutHistorySvc = require('./statuthistory.service');
const { codeTache, codeJournalExecution } = require('../utils/entity-code.utils');

// ─── Select réutilisable ──────────────────────────────────────
const TACHE_SELECT = {
  id_tache:      true,
  code_tache:    true,
  date_creation: true,
  ordre_tache:   true,
  titre_tache:   true,
  description:   true,
  duree:         true,
  id_changement: true,
  statut: {
    select: { id_statut: true, code_statut: true, libelle: true },
  },
  implementeur: {
    select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
  },
  journaux: {
    orderBy: { date_entree: 'asc' },
    select: {
      id_journal:    true,
      code_metier:   true,
      titre_journal: true,
      description:   true,
      date_entree:   true,
    },
  },
};

const JOURNAL_SELECT = {
  id_journal:    true,
  code_metier:   true,
  titre_journal: true,
  description:   true,
  date_entree:   true,
  id_tache:      true,
};

// ─── Statut initial EN_ATTENTE (TACHE) ────────────────────────
async function _getStatutEnAttente() {
  const statut = await prisma.statut.findUnique({
    where:  { code_statut_contexte: { code_statut: 'EN_ATTENTE', contexte: 'TACHE' } },
    select: { id_statut: true },
  });
  if (!statut) throw new Error("Statut 'EN_ATTENTE' (TACHE) introuvable. Vérifiez le seed.");
  return statut.id_statut;
}

// ============================================================
// TÂCHES
// ============================================================

async function createTache(id_changement, data) {
  const { titre_tache, id_user, ordre_tache, description = null, duree = null } = data;

  const id_statut_initial = await _getStatutEnAttente();

  const tache = await prisma.tache.create({
    data: {
      code_tache:   codeTache(),
      ordre_tache:  Number(ordre_tache),
      titre_tache:  titre_tache.trim(),
      description,
      duree:        duree ? Number(duree) : null,
      id_changement,
      id_user,
      id_statut:    id_statut_initial,
    },
    select: TACHE_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  auditSvc.ENTITES.TACHE,
    entite_id:    tache.id_tache,
    id_user,
    ancienne_val: null,
    nouvelle_val: {
      code_tache:    tache.code_tache,
      titre_tache:   tache.titre_tache,
      ordre_tache:   tache.ordre_tache,
      id_changement,
      statut:        'EN_ATTENTE',
      implementeur:  id_user,
    },
  });

  return tache;
}

async function getTachesByChangement(id_changement) {
  return prisma.tache.findMany({
    where:   { id_changement },
    orderBy: { ordre_tache: 'asc' },
    select:  TACHE_SELECT,
  });
}

async function getTacheById(id_tache) {
  return prisma.tache.findUnique({ where: { id_tache }, select: TACHE_SELECT });
}

async function updateTache(id_tache, data) {
  const allowed    = ['titre_tache', 'description', 'ordre_tache', 'duree', 'id_user'];
  const updateData = {};
  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }
  if (updateData.ordre_tache) updateData.ordre_tache = Number(updateData.ordre_tache);
  if (updateData.duree)       updateData.duree        = Number(updateData.duree);
  if (updateData.titre_tache) updateData.titre_tache  = updateData.titre_tache.trim();

  // Snapshot avant
  const avant = await prisma.tache.findUnique({
    where:  { id_tache },
    select: { titre_tache: true, ordre_tache: true, duree: true, id_user: true },
  });

  const tache = await prisma.tache.update({
    where:  { id_tache },
    data:   updateData,
    select: TACHE_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.TACHE,
    entite_id:    id_tache,
    id_user:      data.id_user ?? avant?.id_user ?? null,
    ancienne_val: avant,
    nouvelle_val: updateData,
  });

  return tache;
}

/**
 * Transition de statut ITIL sur une tâche.
 * @param {string} id_tache
 * @param {string} id_statut  UUID du nouveau statut (contexte TACHE)
 * @param {string} [id_user]  UUID de l'acteur
 */
async function updateStatutTache(id_tache, id_statut, id_user = null) {
  // Snapshot statut actuel + id_changement pour lier l'historique
  const avant = await prisma.tache.findUnique({
    where:  { id_tache },
    select: {
      statut:        { select: { code_statut: true } },
      id_user:       true,
      id_changement: true,
    },
  });

  const tache = await prisma.tache.update({
    where:  { id_tache },
    data:   { id_statut },
    select: TACHE_SELECT,
  });

  const acteurId = id_user ?? tache.implementeur?.id_user ?? avant?.id_user ?? null;

  // ── STATUT HISTORY ───────────────────────────────────────────
  await statutHistorySvc.createHistory({
    id_statut,
    id_changement: avant?.id_changement ?? null,
    id_user:       acteurId,
    commentaire:   null,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.STATUS_CHANGED,
    entite_type:  auditSvc.ENTITES.TACHE,
    entite_id:    id_tache,
    id_user:      acteurId,
    ancienne_val: { statut: avant?.statut?.code_statut ?? '?' },
    nouvelle_val: { statut: tache.statut.code_statut },
  });

  // Notification (non bloquante)
  await notifSvc.notifyTacheStatusChange(id_tache, tache.statut.code_statut);

  return tache;
}

async function deleteTache(id_tache) {
  // Snapshot avant suppression
  const snap = await prisma.tache.findUnique({
    where:  { id_tache },
    select: { code_tache: true, titre_tache: true, id_changement: true, id_user: true },
  });

  await prisma.tache.delete({ where: { id_tache } });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.DELETE,
    entite_type:  auditSvc.ENTITES.TACHE,
    entite_id:    id_tache,
    id_user:      snap?.id_user ?? null,
    ancienne_val: { code_tache: snap?.code_tache, titre: snap?.titre_tache, id_changement: snap?.id_changement },
    nouvelle_val: null,
  });

  return { deleted: true, id_tache };
}

// ============================================================
// JOURNAUX D'EXÉCUTION
// ============================================================

async function addJournal(id_tache, data) {
  const { description, titre_journal = null } = data;

  // Récupérer le changement parent pour lier l'audit au bon périmètre
  const tache = await prisma.tache.findUnique({
    where:  { id_tache },
    select: { id_changement: true, id_user: true },
  });

  const journal = await prisma.journalExecution.create({
    data: {
      code_metier:   codeJournalExecution(),
      titre_journal,
      description:   description.trim(),
      id_tache,
    },
    select: JOURNAL_SELECT,
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  auditSvc.ENTITES.JOURNAL,
    entite_id:    journal.id_journal,
    id_user:      tache?.id_user ?? null,
    ancienne_val: null,
    nouvelle_val: {
      id_tache,
      id_changement: tache?.id_changement ?? null,
      titre_journal,
      description:   description.substring(0, 200),
    },
  });

  return journal;
}

async function getJournauxByTache(id_tache) {
  return prisma.journalExecution.findMany({
    where:   { id_tache },
    orderBy: { date_entree: 'asc' },
    select:  JOURNAL_SELECT,
  });
}

async function deleteJournal(id_journal) {
  const snap = await prisma.journalExecution.findUnique({
    where:  { id_journal },
    select: { titre_journal: true, id_tache: true },
  });

  await prisma.journalExecution.delete({ where: { id_journal } });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.DELETE,
    entite_type:  auditSvc.ENTITES.JOURNAL,
    entite_id:    id_journal,
    id_user:      null,
    ancienne_val: { titre_journal: snap?.titre_journal, id_tache: snap?.id_tache },
    nouvelle_val: null,
  });

  return { deleted: true, id_journal };
}

module.exports = {
  createTache,
  getTachesByChangement,
  getTacheById,
  updateTache,
  updateStatutTache,
  deleteTache,
  addJournal,
  getJournauxByTache,
  deleteJournal,
};