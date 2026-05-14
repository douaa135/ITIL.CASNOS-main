'use strict';

/**
 * ============================================================
 * statut_history.service.js — Historique des transitions de statut
 * ============================================================
 * Centralisé pour RFC et Changement.
 * Supporte un client de transaction Prisma (tx) afin de
 * garantir l'atomicité avec l'opération parente.
 *
 * FONCTIONS
 *   createHistory(data, tx?)            → crée une entrée (RFC ou Changement)
 *   getHistoryByRfc(id_rfc)             → historique d'une RFC
 *   getHistoryByChangement(id_chg)      → historique d'un Changement
 *   getFullHistoryByRfc(id_rfc)         → RFC + tous ses Changements (rapport complet)
 * ============================================================
 */

const prisma = require('./prisma.service');
const { codeStatutHistory } = require('../utils/entity-code.utils');

// ── Select réutilisable ───────────────────────────────────────

const HISTORY_SELECT = {
  id_history:      true,
  code_metier:     true,
  id_statut:       true,
  id_rfc:          true,
  id_changement:   true,
  id_user:         true,
  date_changement: true,
  commentaire:     true,
  statut: {
    select: { code_statut: true, libelle: true, contexte: true },
  },
  utilisateur: {
    select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
  },
};

// ============================================================
// ÉCRITURE
// ============================================================

/**
 * Crée une entrée d'historique de statut.
 *
 * @param {object} data
 *   { id_statut, id_rfc?, id_changement?, id_user?, commentaire? }
 * @param {object|null} tx  Client Prisma de transaction (optionnel)
 *   Passer `tx` quand l'appel se fait à l'intérieur d'un prisma.$transaction()
 *   pour garantir l'atomicité avec l'opération parente.
 */
async function createHistory(data, tx = null) {
  const client = tx || prisma;

  const {
    id_statut,
    id_rfc        = null,
    id_changement = null,
    id_user       = null,
    commentaire   = null,
  } = data;

  return client.statutHistory.create({
    data: {
      code_metier:   codeStatutHistory(),
      id_statut,
      id_rfc,
      id_changement,
      id_user,
      commentaire,
    },
  });
}

// ============================================================
// LECTURE
// ============================================================

/**
 * Historique complet d'une RFC, du plus récent au plus ancien.
 * @param {string} id_rfc
 */
async function getHistoryByRfc(id_rfc) {
  return prisma.statutHistory.findMany({
    where:   { id_rfc },
    orderBy: { date_changement: 'desc' },
    select:  HISTORY_SELECT,
  });
}

/**
 * Historique complet d'un Changement, du plus récent au plus ancien.
 * @param {string} id_changement
 */
async function getHistoryByChangement(id_changement) {
  return prisma.statutHistory.findMany({
    where:   { id_changement },
    orderBy: { date_changement: 'desc' },
    select:  HISTORY_SELECT,
  });
}

/**
 * Historique consolidé d'une RFC ET de tous ses Changements liés.
 * Trié du plus ancien au plus récent (ordre chronologique pour le rapport complet).
 * @param {string} id_rfc
 */
async function getFullHistoryByRfc(id_rfc) {
  const changements = await prisma.changement.findMany({
    where:  { id_rfc },
    select: { id_changement: true },
  });

  const changementIds = changements.map(c => c.id_changement);

  return prisma.statutHistory.findMany({
    where: {
      OR: [
        { id_rfc },
        ...(changementIds.length > 0
          ? [{ id_changement: { in: changementIds } }]
          : []
        ),
      ],
    },
    orderBy: { date_changement: 'asc' },
    select:  HISTORY_SELECT,
  });
}

module.exports = {
  createHistory,
  getHistoryByRfc,
  getHistoryByChangement,
  getFullHistoryByRfc,
};