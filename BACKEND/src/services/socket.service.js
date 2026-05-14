'use strict';

/**
 * ============================================================
 * socket.service.js — Hub WebSocket centralisé
 * ============================================================
 * Source unique de vérité pour l'instance Socket.IO.
 * Tous les services métier importent CE fichier pour émettre
 * des événements — jamais directement depuis notification.service.
 *
 * ROOMS
 *   user_{id_user}          → notifications personnelles
 *   rfc_{id_rfc}            → watchers d'une RFC (page détail)
 *   changement_{id}         → watchers d'un Changement
 *   reunion_{id_reunion}    → watchers d'une réunion CAB (votes live)
 *   dashboard               → tableau de bord KPI global
 *
 * ÉVÉNEMENTS ÉMIS (côté serveur → client)
 *   notification:new        → nouvelle notification personnelle
 *   rfc:update              → RFC modifiée (statut, champs…)
 *   changement:update       → Changement modifié
 *   tache:update            → Tâche modifiée
 *   cab:vote                → nouveau vote enregistré
 *   cab:decision            → décision finale enregistrée
 *   user:desactive          → compte désactivé
 *   kpi:refresh             → signal de rafraîchissement dashboard
 *
 * ÉVÉNEMENTS REÇUS (côté client → serveur) — gérés dans app.js
 *   rejoindre:user          → join room user_{id}
 *   rejoindre:rfc           → join room rfc_{id}
 *   rejoindre:changement    → join room changement_{id}
 *   rejoindre:reunion       → join room reunion_{id}
 *   rejoindre:dashboard     → join room dashboard
 *   quitter:rfc             → leave room rfc_{id}
 *   quitter:changement      → leave room changement_{id}
 *   quitter:reunion         → leave room reunion_{id}
 * ============================================================
 */

let _io = null;

// ── Initialisation ────────────────────────────────────────────

/**
 * À appeler une seule fois dans app.js, juste après la création de io.
 * @param {import('socket.io').Server} io
 */
function setIo(io) {
  _io = io;
}

/** @returns {import('socket.io').Server|null} */
function getIo() {
  return _io;
}

// ── Helpers d'émission ────────────────────────────────────────

/**
 * Émet un événement à un utilisateur précis (room user_{id}).
 * Non bloquant : si socket non disponible, ignore silencieusement.
 */
function emitToUser(id_user, event, data) {
  if (!_io || !id_user) return;
  _io.to(`user_${id_user}`).emit(event, data);
}

/**
 * Émet un événement à une room nommée.
 */
function emitToRoom(room, event, data) {
  if (!_io || !room) return;
  _io.to(room).emit(event, data);
}

/**
 * Broadcast à tous les clients connectés.
 */
function emitToAll(event, data) {
  if (!_io) return;
  _io.emit(event, data);
}

// ── Émetteurs métier ──────────────────────────────────────────

/**
 * Notifie un utilisateur d'une nouvelle notification en base.
 * @param {string}  id_user
 * @param {object}  notification  Objet retourné par Prisma
 */
function emitNotification(id_user, notification) {
  emitToUser(id_user, 'notification:new', notification);
}

/**
 * Notifie tous les watchers d'une RFC + le dashboard.
 * @param {string}  id_rfc
 * @param {object}  payload  { code_rfc, statut, ... }
 */
function emitRfcUpdate(id_rfc, payload) {
  emitToRoom(`rfc_${id_rfc}`, 'rfc:update', { id_rfc, ...payload });
  emitToRoom('dashboard', 'kpi:refresh', { source: 'rfc', id_rfc });
}

/**
 * Notifie tous les watchers d'un Changement + le dashboard.
 * @param {string}  id_changement
 * @param {object}  payload
 */
function emitChangementUpdate(id_changement, payload) {
  emitToRoom(`changement_${id_changement}`, 'changement:update', { id_changement, ...payload });
  emitToRoom('dashboard', 'kpi:refresh', { source: 'changement', id_changement });
}

/**
 * Notifie les watchers du Changement parent d'une mise à jour de Tâche.
 * @param {string}  id_changement
 * @param {string}  id_tache
 * @param {object}  payload
 */
function emitTacheUpdate(id_changement, id_tache, payload) {
  emitToRoom(`changement_${id_changement}`, 'tache:update', { id_changement, id_tache, ...payload });
}

/**
 * Notifie les watchers d'une réunion CAB d'un nouveau vote.
 * @param {string}  id_reunion
 * @param {object}  vote
 */
function emitCabVote(id_reunion, vote) {
  emitToRoom(`reunion_${id_reunion}`, 'cab:vote', { id_reunion, vote });
}

/**
 * Notifie les watchers d'une réunion + de la RFC d'une décision finale.
 * @param {string}  id_reunion
 * @param {string}  id_rfc
 * @param {object}  decision
 */
function emitCabDecision(id_reunion, id_rfc, decision) {
  emitToRoom(`reunion_${id_reunion}`, 'cab:decision', { id_reunion, id_rfc, decision });
  emitToRoom(`rfc_${id_rfc}`,        'cab:decision', { id_reunion, id_rfc, decision });
  emitToRoom('dashboard', 'kpi:refresh', { source: 'cab', id_reunion });
}

/**
 * Notifie un utilisateur que son compte a été activé/désactivé.
 * @param {string}  id_user
 * @param {boolean} actif
 */
function emitUserActifChange(id_user, actif) {
  emitToUser(id_user, 'user:desactive', {
    actif,
    message: actif ? 'Votre compte a été activé.' : 'Votre compte a été désactivé.',
  });
}

module.exports = {
  setIo,
  getIo,
  // Helpers bas niveau
  emitToUser,
  emitToRoom,
  emitToAll,
  // Émetteurs métier
  emitNotification,
  emitRfcUpdate,
  emitChangementUpdate,
  emitTacheUpdate,
  emitCabVote,
  emitCabDecision,
  emitUserActifChange,
};