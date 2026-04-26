'use strict';

/**
 * ============================================================
 * tache.service.js — Logique Prisma pure (Tâches + Journaux)
 * ============================================================
 * ⚠️  CHANGEMENT SCHÉMA :
 *     Tache.statut_tache (enum) → Tache.id_statut (FK → Statut, contexte: TACHE)
 *     Le service résout id_statut "EN_ATTENTE" au démarrage via findFirst.
 *
 * Toutes les validations sont dans tache.middleware.js.
 * Ce fichier ne contient que les opérations Prisma.
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const { codeTache, codeJournalExecution } = require('../utils/entity-code.utils');

// ─── Select réutilisable ──────────────────────────────────────────────────────
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
    select: {
      id_statut:   true,
      code_statut: true,
      libelle:     true,
    },
  },
  implementeur: {
    select: {
      id_user:     true,
      nom_user:    true,
      prenom_user: true,
      email_user:  true,
    },
  },
  changement: {
    select: {
      id_changement: true,
      code_changement: true,
      rfc: {
        select: {
          id_rfc: true,
          code_rfc: true,
          typeRfc: {
            select: {
              type: true,
            },
          },
        },
      },
    },
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

// ─── Résolution du statut initial EN_ATTENTE ──────────────────────────────────
/**
 * Récupère l'id du statut EN_ATTENTE (contexte TACHE).
 * Appelé une seule fois par createTache — le middleware garantit que le seed
 * a bien inséré ce statut avant tout appel.
 */
async function _getStatutEnAttente() {
  const statut = await prisma.statut.findUnique({
    where: { code_statut_contexte: { code_statut: 'EN_ATTENTE', contexte: 'TACHE' } },
    select: { id_statut: true },
  });
  if (!statut) {
    throw new Error(
      "Statut 'EN_ATTENTE' (contexte TACHE) introuvable en base. Vérifiez que le seed a été exécuté."
    );
  }
  return statut.id_statut;
}


// ============================================================
// TÂCHES
// ============================================================

/**
 * Crée une tâche rattachée à un changement.
 * Le statut initial est toujours EN_ATTENTE (résolu dynamiquement).
 */
async function createTache(id_changement, data) {
  const {
    titre_tache,
    id_user,
    ordre_tache,
    description = null,
    duree       = null,
  } = data;

  const id_statut_initial = await _getStatutEnAttente();

  return prisma.tache.create({
    data: {
      code_tache:    codeTache(),
      ordre_tache:   Number(ordre_tache),
      titre_tache:   titre_tache.trim(),
      description,
      duree:         duree ? Number(duree) : null,
      id_changement,
      id_user,
      id_statut:     id_statut_initial,
    },
    select: TACHE_SELECT,
  });
}

/**
 * Toutes les tâches d'un changement, triées par ordre_tache.
 */
async function getTachesByChangement(id_changement) {
  return prisma.tache.findMany({
    where:   { id_changement },
    orderBy: { ordre_tache: 'asc' },
    select:  TACHE_SELECT,
  });
}

/**
 * Toutes les tâches assignées à un implémenteur spécifique.
 */
async function getTachesByImplementeur(id_user) {
  return prisma.tache.findMany({
    where:   { id_user },
    orderBy: { date_creation: 'desc' },
    select:  TACHE_SELECT,
  });
}

/**
 * Détail complet d'une tâche avec journaux.
 */
async function getTacheById(id_tache) {
  return prisma.tache.findUnique({
    where:  { id_tache },
    select: TACHE_SELECT,
  });
}

/**
 * Met à jour les champs éditables d'une tâche.
 * id_statut est exclu — passe par updateStatutTache.
 */
async function updateTache(id_tache, data) {
  const allowed    = ['titre_tache', 'description', 'ordre_tache', 'duree', 'id_user'];
  const updateData = {};

  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  if (updateData.ordre_tache) updateData.ordre_tache = Number(updateData.ordre_tache);
  if (updateData.duree)       updateData.duree        = Number(updateData.duree);
  if (updateData.titre_tache) updateData.titre_tache  = updateData.titre_tache.trim();

  return prisma.tache.update({
    where:  { id_tache },
    data:   updateData,
    select: TACHE_SELECT,
  });
}

/**
 * Applique une transition de statut.
 * req.nouveauStatut.id_statut est injecté par checkStatutTacheExists (middleware).
 * La validité de la transition est garantie par validateStatutTache (middleware).
 *
 * @param {string} id_tache
 * @param {string} id_statut  UUID du nouveau statut (depuis req.nouveauStatut)
 */
async function updateStatutTache(id_tache, id_statut) {
  return prisma.tache.update({
    where:  { id_tache },
    data:   { id_statut },
    select: TACHE_SELECT,
  });
}

/**
 * Supprime une tâche et ses journaux (onDelete: Cascade dans schema).
 */
async function deleteTache(id_tache) {
  await prisma.tache.delete({ where: { id_tache } });
  return { deleted: true, id_tache };
}


// ============================================================
// JOURNAUX D'EXÉCUTION
// ============================================================

async function addJournal(id_tache, data) {
  const { description, titre_journal = null } = data;
  return prisma.journalExecution.create({
    data: {
      code_metier:   codeJournalExecution(),
      titre_journal,
      description:   description.trim(),
      id_tache,
    },
    select: JOURNAL_SELECT,
  });
}

async function getJournauxByTache(id_tache) {
  return prisma.journalExecution.findMany({
    where:   { id_tache },
    orderBy: { date_entree: 'asc' },
    select:  JOURNAL_SELECT,
  });
}

async function deleteJournal(id_journal) {
  await prisma.journalExecution.delete({ where: { id_journal } });
  return { deleted: true, id_journal };
}


module.exports = {
  createTache,
  getTachesByChangement,
  getTachesByImplementeur,
  getTacheById,
  updateTache,
  updateStatutTache,
  deleteTache,
  addJournal,
  getJournauxByTache,
  deleteJournal,
};