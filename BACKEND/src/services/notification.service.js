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
 *   countUrgents(id_user, roles)
 *
 * FONCTIONS AUTO (appelées depuis les autres services)
 *   notifyRfcStatusChange(id_rfc, newStatutCode, options)
 *   notifyChangementStatusChange(id_changement, newStatutCode)
 *   notifyTacheStatusChange(id_tache, newStatutCode)
 *   notifyEscalation(id_rfc, id_requester, id_change_managers)
 * ============================================================
 */

const prisma = require('./prisma.service');
const { codeNotification } = require('../utils/entity-code.utils');
const socketService = require('./socket.service');

// ── ID de l'utilisateur SYSTÈME (chargé une seule fois) ───────
let _systemeUserId = null;

// ── Libellés lisibles par statut ──────────────────────────────

const LIBELLES_STATUT_RFC = {
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

// ── Récupération de l'utilisateur SYSTÈME ─────────────────────
async function getSystemeUserId() {
  const systeme = await prisma.utilisateur.findFirst({
    where: {
      userRoles: { some: { role: { nom_role: 'SYSTEME' } } },
    },
    select: { id_user: true },
  });
  if (!systeme) throw new Error('Utilisateur SYSTÈME introuvable en base.');
  return systeme.id_user;
}

// ============================================================
// FONCTIONS UTILISATEUR (CRUD notifications)
// ============================================================

/**
 * Crée une notification avec UN expéditeur et N destinataires.
 *
 * @param {object}   data
 * @param {string}   data.message
 * @param {string[]} data.id_users       — tableau des destinataires
 * @param {string}   [data.id_expediteur] — null = SYSTÈME
 * @param {string}   [data.objet]
 * @param {string}   [data.id_rfc]
 * @param {string}   [data.id_changement]
 * @param {string}   [data.id_tache]
 */
async function createNotification(data) {
  const {
    id_users,
    message,
    objet         = null,
    type_notif    = 'IN_APP',
    id_rfc        = null,
    id_changement = null,
    id_tache      = null,
    id_expediteur = null,
  } = data;

  if (!id_users?.length || !message) {
    throw new Error('id_users (tableau non vide) et message sont obligatoires.');
  }

  const expediteur = id_expediteur ?? await getSystemeUserId();

  // 1. Créer la notification + tous les destinataires en une seule transaction
  const notification = await prisma.notification.create({
    data: {
      code_metier:   codeNotification(),
      message,
      objet,
      type_notif,
      id_expediteur: expediteur,
      id_rfc,
      id_changement,
      id_tache,
      destinataires: {
        create: id_users.map(id_user => ({
          id_user,
          lue: false,
        })),
      },
    },
    include: {
      expediteur:   { select: { id_user: true, nom_user: true, prenom_user: true } },
      destinataires: {
        include: {
          destinataire: { select: { id_user: true, nom_user: true, prenom_user: true } },
        },
      },
    },
  });

  // 2. Émettre via WebSocket à chaque destinataire
  for (const d of notification.destinataires) {
    socketService.emitNotification(d.id_user, notification);
  }

  return notification;
}

/**
 * Récupère les notifications d'un utilisateur (paginées).
 * FIX: requête sur userNotification (table de jonction) et non plus sur notification directement
 */
async function getNotificationsByUser(id_user, options = {}) {
  const { lue, page = 1, limit = 20 } = options;
  const skip = (Number(page) - 1) * Number(limit);

  const where = { id_user };
  if (lue !== undefined) where.lue = lue === 'true' || lue === true;

  const [liens, total] = await prisma.$transaction([
    prisma.userNotification.findMany({
      where,
      skip,
      take:    Number(limit),
      orderBy: { notification: { date_envoi: 'desc' } },
      select: {
        lue:          true,
        date_lecture: true,
        notification: {
          select: {
            id_notif:      true,
            code_metier:   true,
            message:       true,
            objet:         true,
            type_notif:    true,
            date_envoi:    true,
            id_rfc:        true,
            id_changement: true,
            id_tache:      true,
            expediteur: {
              select: { id_user: true, email_user: true, nom_user: true, prenom_user: true },
            },
          },
        },
      },
    }),
    prisma.userNotification.count({ where }),
  ]);

  // Aplatir le résultat pour que chaque notification porte son statut "lue"
  const notifications = liens.map(({ lue, date_lecture, notification }) => ({
    ...notification,
    lue,
    date_lecture,
  }));

  return {
    notifications,
    total,
    page:  Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / Number(limit)),
  };
}

async function getNotifications(options = {}) {
  const {
    page = 1,
    limit = 20,
    search,
    fromDate,
    toDate,
    id_expediteur,
    excludeSystem,
  } = options;

  const skip = (Number(page) - 1) * Number(limit);
  const where = {};

  if (id_expediteur) {
    where.id_expediteur = id_expediteur;
  }

  if (excludeSystem) {
    where.expediteur = { email_user: { not: 'systeme@itil.internal' } };
  }

  if (search) {
    where.OR = [
      { message: { contains: search, mode: 'insensitive' } },
      { objet:   { contains: search, mode: 'insensitive' } },
      { expediteur: { nom_user:    { contains: search, mode: 'insensitive' } } },
      { expediteur: { prenom_user: { contains: search, mode: 'insensitive' } } },
      { destinataires: { some: { destinataire: { nom_user:    { contains: search, mode: 'insensitive' } } } } },
      { destinataires: { some: { destinataire: { prenom_user: { contains: search, mode: 'insensitive' } } } } },
    ];
  }

  if (fromDate) {
    where.date_envoi = {
      ...(where.date_envoi || {}),
      gte: new Date(fromDate),
    };
  }

  if (toDate) {
    where.date_envoi = {
      ...(where.date_envoi || {}),
      lte: new Date(`${toDate}T23:59:59`),
    };
  }

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { date_envoi: 'desc' },
      include: {
        expediteur: { select: { id_user: true, email_user: true, nom_user: true, prenom_user: true } },
        destinataires: {
          include: {
            destinataire: { select: { id_user: true, nom_user: true, prenom_user: true } },
          },
        },
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
 * Marque une notification comme lue pour un utilisateur.
 * FIX: on met à jour userNotification et non plus notification directement
 */
async function markAsRead(id_notif, id_user) {
  const lien = await prisma.userNotification.findUnique({
    where: { id_notif_id_user: { id_notif, id_user } },
  });

  if (!lien) {
    const err = new Error('Notification introuvable ou non assignée à cet utilisateur.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  if (lien.lue) return lien; // déjà lue, rien à faire

  return prisma.userNotification.update({
    where: { id_notif_id_user: { id_notif, id_user } },
    data:  { lue: true, date_lecture: new Date() },
  });
}

/**
 * Marque toutes les notifications d'un utilisateur comme lues.
 * FIX: updateMany sur userNotification
 */
async function markAllAsRead(id_user) {
  const result = await prisma.userNotification.updateMany({
    where: { id_user, lue: false },
    data:  { lue: true, date_lecture: new Date() },
  });
  return { updated: result.count };
}

/**
 * Supprime le lien destinataire (masque la notification pour cet utilisateur).
 * FIX: on supprime dans userNotification, pas dans notification
 *      (la notification reste pour les autres destinataires)
 */
async function deleteNotification(id_notif, id_user) {
  const lien = await prisma.userNotification.findUnique({
    where: { id_notif_id_user: { id_notif, id_user } },
  });

  if (!lien) {
    const err = new Error('Notification introuvable ou non assignée à cet utilisateur.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  await prisma.userNotification.delete({
    where: { id_notif_id_user: { id_notif, id_user } },
  });

  return { deleted: true, id_notif };
}

/**
 * Compte les notifications non lues d'un utilisateur.
 * FIX: count sur userNotification
 */
async function countUnread(id_user) {
  const count = await prisma.userNotification.count({
    where: { id_user, lue: false },
  });
  return { unread: count };
}

/**
 * Compte les éléments urgents actifs selon le rôle de l'utilisateur.
 * (pas de changement nécessaire ici, cette fonction ne touche pas notification)
 */
async function countUrgents(id_user, roles = []) {
  const STATUTS_FERMES_RFC = ['CLOTUREE', 'REJETEE'];
  const STATUTS_FERMES_CHG = ['CLOTUREE'];
  const STATUTS_ACTIFS_TCH = ['EN_ATTENTE', 'EN_COURS'];

  const isAdmin = roles.includes('ADMIN');
  const isCM    = roles.includes('CHANGE_MANAGER');
  const isSD    = roles.includes('SERVICE_DESK');
  const isImp   = roles.includes('IMPLEMENTEUR');
  const isDem   = roles.includes('DEMANDEUR');
  const isCAB   = roles.includes('MEMBRE_CAB');

  const whereRfc = {
    urgence: true,
    statut:  { code_statut: { notIn: STATUTS_FERMES_RFC } },
  };
  if (isDem && !isAdmin && !isCM && !isSD && !isCAB) {
    whereRfc.id_user = id_user;
  }

  const whereChg = {
    statut: { code_statut: { notIn: STATUTS_FERMES_CHG } },
    rfc:    { urgence: true },
  };

  const whereTch = {
    id_user,
    statut:     { code_statut: { in: STATUTS_ACTIFS_TCH } },
    changement: { rfc: { urgence: true } },
  };

  const [rfcCount, changementCount, tacheCount] = await Promise.all([
    (isAdmin || isCM || isSD || isCAB || isDem)
      ? prisma.rfc.count({ where: whereRfc })
      : Promise.resolve(0),
    (isAdmin || isCM)
      ? prisma.changement.count({ where: whereChg })
      : Promise.resolve(0),
    (isAdmin || isCM || isImp)
      ? prisma.tache.count({ where: whereTch })
      : Promise.resolve(0),
  ]);

  return {
    rfc:         rfcCount,
    changements: changementCount,
    taches:      tacheCount,
    total:       rfcCount + changementCount + tacheCount,
  };
}

// ============================================================
// FONCTIONS AUTO — déclenchées par les changements de statut
// FIX: toutes les notifs auto passent maintenant par id_users (tableau)
// ============================================================

async function notifyRfcStatusChange(id_rfc, newStatutCode, options = {}) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: { id_user: true, code_rfc: true, titre_rfc: true },
    });
    if (!rfc) return;

    const libelle = LIBELLES_STATUT_RFC[newStatutCode] || newStatutCode;

    // ── Notifier le demandeur ──────────────────────────────────
    await createNotification({
      id_users: [rfc.id_user],
      message:  `Votre RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" est passée au statut : ${libelle}.`,
      objet:    `RFC ${rfc.code_rfc} — ${libelle}`,
      id_rfc,
    });

    // ── RFC approuvée → notifier le Change Manager ─────────────
    if (newStatutCode === 'APPROUVEE'
        && options.id_change_manager
        && options.id_change_manager !== rfc.id_user) {
      await createNotification({
        id_users: [options.id_change_manager],
        message:  `La RFC ${rfc.code_rfc} a été approuvée. Un Changement a été créé automatiquement.`,
        objet:    `RFC ${rfc.code_rfc} — Approuvée → Changement créé`,
        id_rfc,
      });
    }

    // ── RFC évaluée → notifier tous les membres CAB actifs ─────
    if (newStatutCode === 'EVALUEE') {
      const membresCab = await prisma.membreCab.findMany({
        select: { utilisateur: { select: { id_user: true, actif: true } } },
      });
      const id_users = membresCab
        .map(m => m.utilisateur)
        .filter(u => u.actif && u.id_user !== rfc.id_user)
        .map(u => u.id_user);

      if (id_users.length) {
        await createNotification({
          id_users,
          message: `La RFC ${rfc.code_rfc} est en attente d'évaluation CAB.`,
          objet:   `RFC ${rfc.code_rfc} — Évaluation CAB requise`,
          id_rfc,
        });
      }
    }

    // ── RFC pré-approuvée → notifier CHANGE_MANAGER et ADMIN ───
    if (newStatutCode === 'PRE_APPROUVEE') {
      const gestionnaires = await prisma.utilisateur.findMany({
        where: {
          actif:     true,
          userRoles: {
            some: {
              role: { nom_role: { in: ['ADMIN'] } },
            },
          },
        },
        select: { id_user: true },
      });
      const id_users = gestionnaires
        .map(u => u.id_user)
        .filter(id => id !== rfc.id_user);

      if (id_users.length) {
        await createNotification({
          id_users,
          message: `La RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" est pré-approuvée et attend votre évaluation.`,
          objet:   `RFC ${rfc.code_rfc} — Pré-approuvée, évaluation requise`,
          id_rfc,
        });
      }
    }

  } catch (err) {
    console.error('[notifyRfcStatusChange] Erreur non bloquante :', err.message);
  }
}

async function notifyChangementStatusChange(id_changement, newStatutCode) {
  try {
    const changement = await prisma.changement.findUnique({
      where:  { id_changement },
      select: {
        code_changement: true,
        id_user:         true,
        rfc:    { select: { id_user: true, code_rfc: true } },
        taches: { select: { id_user: true } },
      },
    });
    if (!changement) return;

    const libelle = LIBELLES_STATUT_CHG[newStatutCode] || newStatutCode;

    // ── Notifier le Change Manager ─────────────────────────────
    const destinataires = new Set([changement.id_user]);

    // ── Notifier le demandeur de la RFC (s'il est différent) ───
    if (changement.rfc && changement.rfc.id_user !== changement.id_user) {
      destinataires.add(changement.rfc.id_user);
    }

    await createNotification({
      id_users: [...destinataires],
      message:  `Le Changement ${changement.code_changement} est passé au statut : ${libelle}.`,
      objet:    `Changement ${changement.code_changement} — ${libelle}`,
      id_changement,
    });

    // ── EN_COURS → notifier les implémenteurs de leurs tâches ──
    if (newStatutCode === 'EN_COURS') {
      const implementeursIds = [
        ...new Set(
          changement.taches
            .map(t => t.id_user)
            .filter(id => !destinataires.has(id))
        ),
      ];

      if (implementeursIds.length) {
        await createNotification({
          id_users:     implementeursIds,
          message:      `Le Changement ${changement.code_changement} est démarré. Vos tâches sont actives.`,
          objet:        `Changement ${changement.code_changement} — En cours`,
          id_changement,
        });
      }
    }

  } catch (err) {
    console.error('[notifyChangementStatusChange] Erreur non bloquante :', err.message);
  }
}

async function notifyTacheStatusChange(id_tache, newStatutCode) {
  try {
    const tache = await prisma.tache.findUnique({
      where:  { id_tache },
      select: {
        code_tache:  true,
        titre_tache: true,
        id_user:     true,
        changement: {
          select: { id_user: true, code_changement: true, id_changement: true },
        },
      },
    });
    if (!tache) return;

    const libelle = LIBELLES_STATUT_TCH[newStatutCode] || newStatutCode;

    // Construire la liste unique des destinataires
    const destinataires = new Set([tache.id_user]);
    if (tache.changement && tache.changement.id_user !== tache.id_user) {
      destinataires.add(tache.changement.id_user);
    }

    await createNotification({
      id_users:      [...destinataires],
      message:       `La tâche "${tache.titre_tache.substring(0, 50)}" est passée au statut : ${libelle}.`,
      objet:         `Tâche ${tache.code_tache} — ${libelle}`,
      id_tache,
      id_changement: tache.changement?.id_changement ?? null,
    });

  } catch (err) {
    console.error('[notifyTacheStatusChange] Erreur non bloquante :', err.message);
  }
}

async function notifyEscalation(id_rfc, id_requester, id_change_managers = []) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: { code_rfc: true, titre_rfc: true },
    });
    if (!rfc) return;

    // ── Notifier le demandeur ──────────────────────────────────
    await createNotification({
      id_users: [id_requester],
      message:  `Votre demande d'escalade pour la RFC ${rfc.code_rfc} a été transmise au Change Manager et au CAB.`,
      objet:    `Escalade RFC ${rfc.code_rfc} — Confirmée`,
      id_rfc,
    });

    // ── Notifier les Change Managers ───────────────────────────
    const cmIds = id_change_managers.filter(id => id !== id_requester);
    if (cmIds.length) {
      await createNotification({
        id_users: cmIds,
        message:  `⚠️ ESCALADE — La RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" nécessite un traitement urgent.`,
        objet:    `Escalade urgente — RFC ${rfc.code_rfc}`,
        id_rfc,
      });
    }

    // ── Notifier les membres CAB actifs ────────────────────────
    const notified = new Set([id_requester, ...id_change_managers]);
    const membresCab = await prisma.membreCab.findMany({
      select: { utilisateur: { select: { id_user: true, actif: true } } },
    });
    const cabIds = membresCab
      .map(m => m.utilisateur)
      .filter(u => u.actif && !notified.has(u.id_user))
      .map(u => u.id_user);

    if (cabIds.length) {
      await createNotification({
        id_users: cabIds,
        message:  `⚠️ ESCALADE urgente — RFC ${rfc.code_rfc} : votre évaluation immédiate est requise.`,
        objet:    `Escalade urgente — RFC ${rfc.code_rfc}`,
        id_rfc,
      });
    }

  } catch (err) {
    console.error('[notifyEscalation] Erreur non bloquante :', err.message);
  }
}

async function notifyNewRfc(id_rfc) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: { code_rfc: true, titre_rfc: true, id_user: true },
    });
    if (!rfc) return;

    const serviceDesks = await prisma.utilisateur.findMany({
      where: {
        actif:     true,
        userRoles: { some: { role: { nom_role: 'SERVICE_DESK' } } },
      },
      select: { id_user: true },
    });

    const id_users = serviceDesks
      .map(u => u.id_user)
      .filter(id => id !== rfc.id_user);

    if (!id_users.length) return;

    await createNotification({
      id_users,
      message: `Nouvelle RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" soumise, en attente de traitement.`,
      objet:   `Nouvelle RFC — ${rfc.code_rfc}`,
      id_rfc,
    });

  } catch (err) {
    console.error('[notifyNewRfc] Erreur non bloquante :', err.message);
  }
}

/**
 * Broadcast manuel : un utilisateur envoie une notif à plusieurs.
 */
async function broadcastNotification({ id_expediteur, id_users, message, objet }) {
  if (!id_expediteur) throw new Error('id_expediteur requis pour un broadcast.');

  return createNotification({
    id_users,
    message,
    objet,
    id_expediteur,
  });
}

module.exports = {
  createNotification,
  getNotificationsByUser,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  countUnread,
  countUrgents,
  broadcastNotification,
  notifyNewRfc,
  notifyRfcStatusChange,
  notifyChangementStatusChange,
  notifyTacheStatusChange,
  notifyEscalation,
};