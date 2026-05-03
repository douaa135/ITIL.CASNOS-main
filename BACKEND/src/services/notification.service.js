'use strict';

/**
 * ============================================================
 * notification.service.js — Notifications IN_APP + auto-déclenchement
 * ============================================================
 * FONCTIONS UTILISATEUR (routes)
 *   createNotification(data)
 *   getNotificationsByUser(id_user, options)
 *   markAsRead(id_notif, id_user)
 *   markAllAsRead(id_user)
 *   deleteNotification(id_notif, id_user)
 *   countUnread(id_user)
 *
 * FONCTIONS AUTO (appelées depuis les autres services)
 *   notifyRfcStatusChange(id_rfc, newStatutCode, options)
 *   notifyChangementStatusChange(id_changement, newStatutCode, options)
 *   notifyTacheStatusChange(id_tache, newStatutCode)
 *   notifyEscalation(id_rfc, id_requester)
 * ============================================================
 */

const prisma = require('./prisma.service');
const { codeNotification } = require('../utils/entity-code.utils');

// ── Libellés lisibles par statut ──────────────────────────────

const LIBELLES_STATUT_RFC = {
  BROUILLON:     'Brouillon',
  SOUMIS:        'Soumise',
  PRE_APPROUVEE: 'Pré-approuvée',
  EVALUEE:       'Évaluée',
  APPROUVEE:     'Approuvée ✅',
  REJETEE:       'Rejetée ❌',
  CLOTUREE:      'Clôturée',
};

const LIBELLES_STATUT_CHG = {
  EN_PLANIFICATION: 'En planification',
  EN_ATTENTE:       'En attente',
  EN_COURS:         'En cours',
  IMPLEMENTE:       'Implémenté',
  TESTE:            'Testé',
  CLOTURE:          'Clôturé ✅',
  EN_ECHEC:         'En échec ❌',
};

const LIBELLES_STATUT_TCH = {
  EN_ATTENTE: 'En attente',
  EN_COURS:   'En cours',
  TERMINEE:   'Terminée ✅',
  ANNULEE:    'Annulée',
};

// ============================================================
// FONCTIONS UTILISATEUR (CRUD notifications)
// ============================================================

/**
 * Crée une notification en base.
 * @param {object} data
 *   { id_user, message, objet?, type_notif?, id_rfc?, id_changement?, id_tache? }
 */
async function createNotification(data) {
  const {
    id_user,
    message,
    objet       = null,
    type_notif  = 'IN_APP',
    id_rfc      = null,
    id_changement = null,
    id_tache    = null,
  } = data;

  if (!id_user || !message) {
    throw new Error('id_user et message sont obligatoires pour créer une notification.');
  }

  return prisma.notification.create({
    data: {
      code_metier: codeNotification(),
      message,
      objet,
      type_notif,
      lue:          false,
      id_user,
      id_rfc,
      id_changement,
      id_tache,
    },
    select: {
      id_notif:      true,
      code_metier:   true,
      message:       true,
      objet:         true,
      type_notif:    true,
      lue:           true,
      date_envoi:    true,
      id_rfc:        true,
      id_changement: true,
      id_tache:      true,
    },
  });
}

/**
 * Récupère les notifications d'un utilisateur.
 * @param {string} id_user
 * @param {object} options { lue?, page?, limit? }
 */
async function getNotificationsByUser(id_user, options = {}) {
  const { lue, page = 1, limit = 20 } = options;
  const skip = (Number(page) - 1) * Number(limit);

  const where = { id_user };
  if (lue !== undefined) where.lue = lue === 'true' || lue === true;

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take:    Number(limit),
      orderBy: { date_envoi: 'desc' },
      select: {
        id_notif:      true,
        code_metier:   true,
        message:       true,
        objet:         true,
        type_notif:    true,
        lue:           true,
        date_envoi:    true,
        id_rfc:        true,
        id_changement: true,
        id_tache:      true,
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return {
    notifications,
    total,
    page:  Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
}

/**
 * Marque une notification comme lue.
 * @param {string} id_notif
 * @param {string} id_user   Propriétaire attendu (sécurité)
 */
async function markAsRead(id_notif, id_user) {
  const notif = await prisma.notification.findUnique({ where: { id_notif } });
  if (!notif) {
    const err = new Error('Notification introuvable.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (notif.id_user !== id_user) {
    const err = new Error('Vous ne pouvez marquer que vos propres notifications.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  return prisma.notification.update({
    where: { id_notif },
    data:  { lue: true },
    select: {
      id_notif:   true,
      lue:        true,
      date_envoi: true,
      message:    true,
    },
  });
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues.
 */
async function markAllAsRead(id_user) {
  const result = await prisma.notification.updateMany({
    where: { id_user, lue: false },
    data:  { lue: true },
  });
  return { updated: result.count };
}

/**
 * Supprime une notification.
 * @param {string} id_notif
 * @param {string} id_user  Propriétaire attendu
 */
async function deleteNotification(id_notif, id_user) {
  const notif = await prisma.notification.findUnique({ where: { id_notif } });
  if (!notif) {
    const err = new Error('Notification introuvable.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (notif.id_user !== id_user) {
    const err = new Error('Vous ne pouvez supprimer que vos propres notifications.');
    err.code = 'FORBIDDEN';
    throw err;
  }

  await prisma.notification.delete({ where: { id_notif } });
  return { deleted: true, id_notif };
}

/**
 * Compte les notifications non lues d'un utilisateur.
 */
async function countUnread(id_user) {
  const count = await prisma.notification.count({
    where: { id_user, lue: false },
  });
  return { unread: count };
}

// ============================================================
// FONCTIONS AUTO — déclenchées par les changements de statut
// ============================================================

/**
 * Notifie les acteurs concernés lors d'un changement de statut RFC.
 *
 * Destinataires :
 *  - Toujours : le demandeur (créateur de la RFC)
 *  - Si APPROUVEE : le Change Manager assigné (options.id_change_manager)
 *  - Si REJETEE   : le demandeur (déjà inclus)
 *  - Si EVALUEE   : les membres CAB actifs
 *
 * @param {string} id_rfc
 * @param {string} newStatutCode  ex: 'APPROUVEE'
 * @param {object} options        { id_change_manager? }
 */
async function notifyRfcStatusChange(id_rfc, newStatutCode, options = {}) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:   { id_rfc },
      select:  { id_user: true, code_rfc: true, titre_rfc: true },
    });
    if (!rfc) return;

    const libelle = LIBELLES_STATUT_RFC[newStatutCode] || newStatutCode;
    const notifs  = [];

    // 1. Notifier le demandeur
    notifs.push({
      id_user:  rfc.id_user,
      message:  `Votre RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" est passée au statut : ${libelle}.`,
      objet:    `RFC ${rfc.code_rfc} — ${libelle}`,
      id_rfc,
    });

    // 2. Si APPROUVEE : notifier le Change Manager
    if (newStatutCode === 'APPROUVEE' && options.id_change_manager) {
      // Éviter doublon si le demandeur EST le change manager
      if (options.id_change_manager !== rfc.id_user) {
        notifs.push({
          id_user:  options.id_change_manager,
          message:  `La RFC ${rfc.code_rfc} a été approuvée. Un Changement a été créé automatiquement.`,
          objet:    `RFC ${rfc.code_rfc} — Approuvée → Changement créé`,
          id_rfc,
        });
      }
    }

    // 3. Si EVALUEE : notifier tous les membres CAB actifs
    if (newStatutCode === 'EVALUEE') {
      const membresCab = await prisma.membreCab.findMany({
        select: {
          utilisateur: { select: { id_user: true, actif: true } },
        },
      });

      for (const m of membresCab) {
        if (m.utilisateur.actif && m.utilisateur.id_user !== rfc.id_user) {
          notifs.push({
            id_user:  m.utilisateur.id_user,
            message:  `La RFC ${rfc.code_rfc} est en attente d'évaluation CAB.`,
            objet:    `RFC ${rfc.code_rfc} — Évaluation CAB requise`,
            id_rfc,
          });
        }
      }
    }

    // Créer toutes les notifications (sans bloquer le flux principal)
    await Promise.all(notifs.map(n => createNotification(n).catch(e => console.error('[notifyRfcStatusChange]', e))));

  } catch (err) {
    // Ne jamais bloquer le flux principal sur une erreur de notification
    console.error('[notifyRfcStatusChange] Erreur non bloquante :', err.message);
  }
}

/**
 * Notifie les acteurs lors d'un changement de statut de Changement.
 *
 * Destinataires :
 *  - Le Change Manager assigné
 *  - Si RFC liée : le demandeur de la RFC
 *  - Si EN_COURS : les implémenteurs des tâches
 *  - Si CLOTURE ou EN_ECHEC : Change Manager + demandeur RFC
 *
 * @param {string} id_changement
 * @param {string} newStatutCode
 */
async function notifyChangementStatusChange(id_changement, newStatutCode) {
  try {
    const changement = await prisma.changement.findUnique({
      where:  { id_changement },
      select: {
        code_changement: true,
        id_user:         true,   // change manager
        rfc: {
          select: { id_user: true, code_rfc: true },
        },
        taches: {
          select: { id_user: true },
        },
      },
    });
    if (!changement) return;

    const libelle = LIBELLES_STATUT_CHG[newStatutCode] || newStatutCode;
    const cible   = new Set();   // éviter doublons
    const notifs  = [];

    // 1. Change Manager
    cible.add(changement.id_user);
    notifs.push({
      id_user:       changement.id_user,
      message:       `Le Changement ${changement.code_changement} est passé au statut : ${libelle}.`,
      objet:         `Changement ${changement.code_changement} — ${libelle}`,
      id_changement,
    });

    // 2. Demandeur de la RFC liée
    if (changement.rfc && changement.rfc.id_user !== changement.id_user) {
      cible.add(changement.rfc.id_user);
      notifs.push({
        id_user:       changement.rfc.id_user,
        message:       `Le Changement issu de votre RFC ${changement.rfc.code_rfc} est passé au statut : ${libelle}.`,
        objet:         `Changement ${changement.code_changement} — ${libelle}`,
        id_changement,
      });
    }

    // 3. Si EN_COURS : notifier les implémenteurs des tâches
    if (newStatutCode === 'EN_COURS') {
      const implementeursIds = [...new Set(changement.taches.map(t => t.id_user))];
      for (const id_user of implementeursIds) {
        if (!cible.has(id_user)) {
          cible.add(id_user);
          notifs.push({
            id_user,
            message:       `Le Changement ${changement.code_changement} est démarré. Vos tâches sont actives.`,
            objet:         `Changement ${changement.code_changement} — En cours`,
            id_changement,
          });
        }
      }
    }

    await Promise.all(notifs.map(n => createNotification(n).catch(e => console.error('[notifyChangementStatusChange]', e))));

  } catch (err) {
    console.error('[notifyChangementStatusChange] Erreur non bloquante :', err.message);
  }
}

/**
 * Notifie lors d'un changement de statut d'une Tâche.
 *
 * Destinataires :
 *  - L'implémenteur de la tâche
 *  - Le Change Manager du Changement parent
 *
 * @param {string} id_tache
 * @param {string} newStatutCode
 */
async function notifyTacheStatusChange(id_tache, newStatutCode) {
  try {
    const tache = await prisma.tache.findUnique({
      where:  { id_tache },
      select: {
        code_tache:  true,
        titre_tache: true,
        id_user:     true,   // implémenteur
        changement: {
          select: { id_user: true, code_changement: true, id_changement: true },
        },
      },
    });
    if (!tache) return;

    const libelle = LIBELLES_STATUT_TCH[newStatutCode] || newStatutCode;
    const notifs  = [];

    // 1. Implémenteur
    notifs.push({
      id_user:       tache.id_user,
      message:       `Votre tâche "${tache.titre_tache.substring(0, 50)}" est passée au statut : ${libelle}.`,
      objet:         `Tâche ${tache.code_tache} — ${libelle}`,
      id_tache,
      id_changement: tache.changement?.id_changement ?? null,
    });

    // 2. Change Manager (si différent de l'implémenteur)
    if (tache.changement && tache.changement.id_user !== tache.id_user) {
      notifs.push({
        id_user:       tache.changement.id_user,
        message:       `La tâche "${tache.titre_tache.substring(0, 50)}" du Changement ${tache.changement.code_changement} : ${libelle}.`,
        objet:         `Tâche ${tache.code_tache} — ${libelle}`,
        id_tache,
        id_changement: tache.changement.id_changement,
      });
    }

    await Promise.all(notifs.map(n => createNotification(n).catch(e => console.error('[notifyTacheStatusChange]', e))));

  } catch (err) {
    console.error('[notifyTacheStatusChange] Erreur non bloquante :', err.message);
  }
}

/**
 * Notifie lors d'une escalade d'urgence.
 * Notifie tous les membres CAB actifs + le Change Manager.
 *
 * @param {string} id_rfc
 * @param {string} id_requester  Utilisateur qui demande l'escalade
 * @param {string[]} id_change_managers   UUIDs des Change Managers à notifier
 */
async function notifyEscalation(id_rfc, id_requester, id_change_managers = []) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: { code_rfc: true, titre_rfc: true },
    });
    if (!rfc) return;

    const notified = new Set([id_requester]);
    const notifs   = [];

    // Notifier le demandeur (confirmation)
    notifs.push({
      id_user: id_requester,
      message: `Votre demande d'escalade pour la RFC ${rfc.code_rfc} a été transmise au Change Manager et au CAB.`,
      objet:   `Escalade RFC ${rfc.code_rfc} — Confirmée`,
      id_rfc,
    });

    // Notifier les Change Managers
    for (const id_user of id_change_managers) {
      if (!notified.has(id_user)) {
        notified.add(id_user);
        notifs.push({
          id_user,
          message: `⚠️ ESCALADE — La RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" nécessite un traitement urgent.`,
          objet:   `Escalade urgente — RFC ${rfc.code_rfc}`,
          id_rfc,
        });
      }
    }

    // Notifier les membres CAB
    const membresCab = await prisma.membreCab.findMany({
      select: { utilisateur: { select: { id_user: true, actif: true } } },
    });

    for (const m of membresCab) {
      if (m.utilisateur.actif && !notified.has(m.utilisateur.id_user)) {
        notified.add(m.utilisateur.id_user);
        notifs.push({
          id_user:  m.utilisateur.id_user,
          message:  `⚠️ ESCALADE urgente — RFC ${rfc.code_rfc} : votre évaluation immédiate est requise.`,
          objet:    `Escalade urgente — RFC ${rfc.code_rfc}`,
          id_rfc,
        });
      }
    }

    await Promise.all(notifs.map(n => createNotification(n).catch(e => console.error('[notifyEscalation]', e))));

  } catch (err) {
    console.error('[notifyEscalation] Erreur non bloquante :', err.message);
  }
}

/**
 * Récupère toutes les notifications (global).
 * Utile pour l'historique des diffusions par l'admin.
 */
async function getNotifications(options = {}) {
  const { page = 1, limit = 20 } = options;
  const skip = (Number(page) - 1) * Number(limit);

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      skip,
      take:    Number(limit),
      orderBy: { date_envoi: 'desc' },
      include: {
        utilisateur: {
          select: { prenom_user: true, nom_user: true, email_user: true }
        }
      }
    }),
    prisma.notification.count(),
  ]);

  return {
    notifications,
    total,
    page:  Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
}

module.exports = {
  // CRUD utilisateur
  createNotification,
  getNotificationsByUser,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  countUnread,
  // Auto-notification
  notifyRfcStatusChange,
  notifyChangementStatusChange,
  notifyTacheStatusChange,
  notifyEscalation,
};