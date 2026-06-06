'use strict';

/**
 * ============================================================
 * notification.service.js — Notifications IN_APP + EMAIL
 * ============================================================
 * Chaque événement métier déclenche :
 *   1. Persistance en base (Notification + UserNotification)
 *   2. Émission WebSocket  → IN_APP temps réel
 *   3. Envoi email         → via email.service.js (non bloquant)
 *
 * FONCTIONS UTILISATEUR
 *   createNotification(data)
 *   getNotificationsByUser(id_user, options)
 *   getNotifications(options)           ← admin : toutes les notifs
 *   markAsRead(id_notif, id_user)
 *   markAllAsRead(id_user)
 *   deleteNotification(id_notif, id_user)
 *   countUnread(id_user)
 *   countUrgents(id_user, roles)
 *
 * FONCTIONS AUTO
 *   notifyRfcStatusChange(id_rfc, newStatutCode, options)
 *   notifyChangementStatusChange(id_changement, newStatutCode)
 *   notifyTacheStatusChange(id_tache, newStatutCode)
 *   notifyEscalation(id_rfc, id_requester, id_change_managers)
 *   notifyNewRfc(id_rfc)
 *   broadcastNotification(data)
 * ============================================================
 */

const prisma         = require('./prisma.service');
const { codeNotification } = require('../utils/entity-code.utils');
const socketService  = require('./socket.service');
const emailSvc       = require('./email.service');

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
  CLOTUREE:         'Clôturé ✅',
  EN_ECHEC:         'En échec ❌',
};

const LIBELLES_STATUT_TCH = {
  EN_ATTENTE: 'En attente',
  EN_COURS:   'En cours',
  TERMINEE:   'Terminée ✅',
  ANNULEE:    'Annulée',
};

// ── Récupération de l'utilisateur SYSTÈME (avec cache) ────────
let _systemeUserId = null;

async function getSystemeUserId() {
  if (_systemeUserId) return _systemeUserId;
  const sys = await prisma.utilisateur.findFirst({
    where:  { email_user: 'systeme@itil.internal' },
    select: { id_user: true },
  });
  if (!sys) throw new Error('Utilisateur SYSTÈME introuvable. Vérifiez le seed.');
  _systemeUserId = sys.id_user;
  return _systemeUserId;
}

// ── Helper : récupérer les emails d'une liste d'id_user ───────
async function _getEmails(id_users) {
  if (!id_users?.length) return [];
  const users = await prisma.utilisateur.findMany({
    where:  { id_user: { in: id_users } },
    select: { email_user: true },
  });
  return users.map(u => u.email_user).filter(Boolean);
}

// ============================================================
// CRÉATION — fonction centrale
// ============================================================

/**
 * Crée une notification en base, émet en WebSocket,
 * et envoie un email si type_notif = 'EMAIL'.
 *
 * @param {object}    data
 * @param {string[]}  data.id_users        Destinataires
 * @param {string}    data.message
 * @param {string}    [data.objet]
 * @param {string}    [data.type_notif]    'IN_APP' | 'EMAIL' | 'SMS'
 * @param {string}    [data.id_expediteur] null = SYSTÈME
 * @param {string}    [data.id_rfc]
 * @param {string}    [data.id_changement]
 * @param {string}    [data.id_tache]
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

  // 1. Persister en base
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
        create: id_users.map(id_user => ({ id_user, lue: false })),
      },
    },
    include: {
      expediteur: { select: { id_user: true, nom_user: true, prenom_user: true } },
      destinataires: {
        include: {
          destinataire: {
            select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
          },
        },
      },
    },
  });

  // 2. WebSocket — toujours, quel que soit type_notif
  for (const d of notification.destinataires) {
    socketService.emitNotification(d.id_user, notification);
  }

  // 3. Email — uniquement si type_notif = 'EMAIL'
  if (type_notif === 'EMAIL') {
    const emailAddresses = notification.destinataires
      .map(d => d.destinataire?.email_user)
      .filter(Boolean);

    if (emailAddresses.length) {
      emailSvc.sendGeneriqueEmail(emailAddresses, {
        objet:   objet || 'Notification ITIL',
        message,
      }).catch(err => console.error('[NOTIF] sendGeneriqueEmail :', err.message));
    }
  }

  return notification;
}

// ============================================================
// LECTURE
// ============================================================

async function getNotificationsByUser(id_user, options = {}) {
  const { lue, page = 1, limit = 20 } = options;
  const skip  = (Number(page) - 1) * Number(limit);
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

/**
 * Toutes les notifications — vue Admin avec filtres.
 */
async function getNotifications(options = {}) {
  const { page = 1, limit = 20, search, fromDate, toDate, id_expediteur, excludeSystem } = options;
  const skip  = (Number(page) - 1) * Number(limit);
  const where = {};

  if (id_expediteur)  where.id_expediteur = id_expediteur;
  if (excludeSystem)  where.expediteur = { email_user: { not: 'systeme@itil.internal' } };

  if (search) {
    where.OR = [
      { message: { contains: search, mode: 'insensitive' } },
      { objet:   { contains: search, mode: 'insensitive' } },
      { expediteur: { nom_user:    { contains: search, mode: 'insensitive' } } },
      { expediteur: { prenom_user: { contains: search, mode: 'insensitive' } } },
    ];
  }
  if (fromDate) where.date_envoi = { ...(where.date_envoi || {}), gte: new Date(fromDate) };
  if (toDate)   where.date_envoi = { ...(where.date_envoi || {}), lte: new Date(`${toDate}T23:59:59`) };

  const [notifications, total] = await prisma.$transaction([
    prisma.notification.findMany({
      where,
      skip,
      take: Number(limit),
      orderBy: { date_envoi: 'desc' },
      include: {
        expediteur:    { select: { id_user: true, email_user: true, nom_user: true, prenom_user: true } },
        destinataires: {
          include: {
            destinataire: { select: { id_user: true, nom_user: true, prenom_user: true } },
          },
        },
      },
    }),
    prisma.notification.count({ where }),
  ]);

  return { notifications, total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / Number(limit)) };
}

// ============================================================
// ACTIONS UTILISATEUR
// ============================================================

async function markAsRead(id_notif, id_user) {
  const lien = await prisma.userNotification.findUnique({
    where: { id_notif_id_user: { id_notif, id_user } },
  });
  if (!lien) {
    const err = new Error('Notification introuvable ou non assignée à cet utilisateur.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  if (lien.lue) return lien;
  return prisma.userNotification.update({
    where: { id_notif_id_user: { id_notif, id_user } },
    data:  { lue: true, date_lecture: new Date() },
  });
}

async function markAllAsRead(id_user) {
  const result = await prisma.userNotification.updateMany({
    where: { id_user, lue: false },
    data:  { lue: true, date_lecture: new Date() },
  });
  return { updated: result.count };
}

async function deleteNotification(id_notif, id_user) {
  const lien = await prisma.userNotification.findUnique({
    where: { id_notif_id_user: { id_notif, id_user } },
  });
  if (!lien) {
    const err = new Error('Notification introuvable ou non assignée à cet utilisateur.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  await prisma.userNotification.delete({ where: { id_notif_id_user: { id_notif, id_user } } });
  return { deleted: true, id_notif };
}

async function countUnread(id_user) {
  const count = await prisma.userNotification.count({ where: { id_user, lue: false } });
  return { unread: count };
}

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
  if (isDem && !isAdmin && !isCM && !isSD && !isCAB) whereRfc.id_user = id_user;

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
// NOTIFICATIONS AUTO — RFC
// ============================================================

async function notifyRfcStatusChange(id_rfc, newStatutCode, options = {}) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: {
        code_rfc:  true,
        titre_rfc: true,
        id_user:   true,
        demandeur: { select: { email_user: true, nom_user: true, prenom_user: true } },
      },
    });
    if (!rfc) return;

    const libelle    = LIBELLES_STATUT_RFC[newStatutCode] || newStatutCode;
    const demandeurNom = rfc.demandeur
      ? `${rfc.demandeur.prenom_user} ${rfc.demandeur.nom_user}`
      : '—';

    // ── 1. Notifier le demandeur (IN_APP + EMAIL) ──────────────
    await createNotification({
      id_users:   [rfc.id_user],
      message:    `Votre RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" est passée au statut : ${libelle}.`,
      objet:      `RFC ${rfc.code_rfc} — ${libelle}`,
      type_notif: 'IN_APP',
      id_rfc,
    });

    if (rfc.demandeur?.email_user) {
      emailSvc.sendRfcStatutEmail([rfc.demandeur.email_user], {
        id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc,
        nouveau_statut: newStatutCode, libelle_statut: libelle, demandeur: demandeurNom,
      }).catch(err => console.error('[NOTIF RFC email]', err.message));
    }

    // ── 2. RFC approuvée → Change Manager ─────────────────────
    if (newStatutCode === 'APPROUVEE' && options.id_change_manager && options.id_change_manager !== rfc.id_user) {
      await createNotification({
        id_users:   [options.id_change_manager],
        message:    `La RFC ${rfc.code_rfc} a été approuvée. Un Changement a été créé automatiquement.`,
        objet:      `RFC ${rfc.code_rfc} — Approuvée → Changement créé`,
        type_notif: 'IN_APP',
        id_rfc,
      });

      const cm = await prisma.utilisateur.findUnique({
        where:  { id_user: options.id_change_manager },
        select: { email_user: true },
      });
      if (cm?.email_user) {
        emailSvc.sendRfcStatutEmail([cm.email_user], {
          id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc,
          nouveau_statut: 'APPROUVEE',
          libelle_statut: 'Approuvée → Changement créé',
          demandeur: demandeurNom,
        }).catch(err => console.error('[NOTIF RFC CM email]', err.message));
      }
    }

    // ── 3. RFC évaluée → membres CAB (IN_APP + EMAIL) ─────────
    if (newStatutCode === 'EVALUEE') {
      const membresCab = await prisma.membreCab.findMany({
        select: { utilisateur: { select: { id_user: true, actif: true, email_user: true } } },
      });
      const membres = membresCab.map(m => m.utilisateur).filter(u => u.actif && u.id_user !== rfc.id_user);

      if (membres.length) {
        await createNotification({
          id_users:   membres.map(u => u.id_user),
          message:    `La RFC ${rfc.code_rfc} est en attente d'évaluation CAB.`,
          objet:      `RFC ${rfc.code_rfc} — Évaluation CAB requise`,
          type_notif: 'IN_APP',
          id_rfc,
        });

        const emails = membres.map(u => u.email_user).filter(Boolean);
        if (emails.length) {
          emailSvc.sendRfcStatutEmail(emails, {
            id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc,
            nouveau_statut: 'EVALUEE', libelle_statut: 'Évaluée — Vote CAB requis',
            demandeur: demandeurNom,
          }).catch(err => console.error('[NOTIF EVALUEE email]', err.message));
        }
      }
    }

    // ── 4. RFC pré-approuvée → ADMIN + CHANGE_MANAGER ─────────
    if (newStatutCode === 'PRE_APPROUVEE') {
      const gestionnaires = await prisma.utilisateur.findMany({
        where: {
          actif:     true,
          userRoles: { some: { role: { nom_role: { in: ['ADMIN', 'CHANGE_MANAGER'] } } } },
        },
        select: { id_user: true, email_user: true },
      });
      const dest = gestionnaires.filter(u => u.id_user !== rfc.id_user);

      if (dest.length) {
        await createNotification({
          id_users:   dest.map(u => u.id_user),
          message:    `La RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" est pré-approuvée et attend votre évaluation.`,
          objet:      `RFC ${rfc.code_rfc} — Pré-approuvée, évaluation requise`,
          type_notif: 'IN_APP',
          id_rfc,
        });

        const emails = dest.map(u => u.email_user).filter(Boolean);
        if (emails.length) {
          emailSvc.sendRfcStatutEmail(emails, {
            id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc,
            nouveau_statut: 'PRE_APPROUVEE', libelle_statut: 'Pré-approuvée — Évaluation requise',
            demandeur: demandeurNom,
          }).catch(err => console.error('[NOTIF PRE_APPROUVEE email]', err.message));
        }
      }
    }

  } catch (err) {
    console.error('[notifyRfcStatusChange]', err.message);
  }
}

// ── Nouvelle RFC soumise → Service Desk (IN_APP + EMAIL) ──────

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
      select: { id_user: true, email_user: true },
    });

    const dest = serviceDesks.filter(u => u.id_user !== rfc.id_user);
    if (!dest.length) return;

    await createNotification({
      id_users:   dest.map(u => u.id_user),
      message:    `Nouvelle RFC ${rfc.code_rfc} "${rfc.titre_rfc.substring(0, 50)}" soumise, en attente de traitement.`,
      objet:      `Nouvelle RFC — ${rfc.code_rfc}`,
      type_notif: 'IN_APP',
      id_rfc,
    });

    // Email au Service Desk
    const emails = dest.map(u => u.email_user).filter(Boolean);
    if (emails.length) {
      emailSvc.sendGeneriqueEmail(emails, {
        objet:    `Nouvelle RFC à traiter — ${rfc.code_rfc}`,
        message:  `Une nouvelle Request For Change a été soumise.\n\nRéférence : ${rfc.code_rfc}\nTitre : ${rfc.titre_rfc}\n\nConnectez-vous à l'application ITIL pour la traiter.`,
        lienUrl:  `${process.env.APP_URL || 'http://localhost:5173'}/rfc/${id_rfc}`,
      }).catch(err => console.error('[NOTIF newRfc email]', err.message));
    }

  } catch (err) {
    console.error('[notifyNewRfc]', err.message);
  }
}

// ============================================================
// NOTIFICATIONS AUTO — CHANGEMENT
// ============================================================

async function notifyChangementStatusChange(id_changement, newStatutCode) {
  try {
    const changement = await prisma.changement.findUnique({
      where:  { id_changement },
      select: {
        code_changement: true,
        id_user:         true,
        changeManager:   { select: { email_user: true, nom_user: true, prenom_user: true } },
        rfc:    { select: { id_user: true } },
        taches: { select: { id_user: true } },
      },
    });
    if (!changement) return;

    const libelle      = LIBELLES_STATUT_CHG[newStatutCode] || newStatutCode;
    const cmNom        = changement.changeManager
      ? `${changement.changeManager.prenom_user} ${changement.changeManager.nom_user}`
      : '—';

    // ── Notifier CM + demandeur RFC ─────────────────────────────
    const destinataires = new Set([changement.id_user]);
    if (changement.rfc?.id_user && changement.rfc.id_user !== changement.id_user) {
      destinataires.add(changement.rfc.id_user);
    }

    await createNotification({
      id_users:   [...destinataires],
      message:    `Le Changement ${changement.code_changement} est passé au statut : ${libelle}.`,
      objet:      `Changement ${changement.code_changement} — ${libelle}`,
      type_notif: 'IN_APP',
      id_changement,
    });

    // Email CM + demandeur
    const emailsCMDem = await _getEmails([...destinataires]);
    if (emailsCMDem.length) {
      emailSvc.sendChangementStatutEmail(emailsCMDem, {
        id_changement, code_changement: changement.code_changement,
        nouveau_statut: newStatutCode, libelle_statut: libelle, change_manager: cmNom,
      }).catch(err => console.error('[NOTIF CHG email]', err.message));
    }

    // ── EN_COURS → implémenteurs ────────────────────────────────
    if (newStatutCode === 'EN_COURS') {
      const implIds = [...new Set(
        changement.taches.map(t => t.id_user).filter(id => !destinataires.has(id))
      )];

      if (implIds.length) {
        await createNotification({
          id_users:   implIds,
          message:    `Le Changement ${changement.code_changement} est démarré. Vos tâches sont actives.`,
          objet:      `Changement ${changement.code_changement} — En cours`,
          type_notif: 'IN_APP',
          id_changement,
        });

        const emailsImpl = await _getEmails(implIds);
        if (emailsImpl.length) {
          emailSvc.sendChangementStatutEmail(emailsImpl, {
            id_changement, code_changement: changement.code_changement,
            nouveau_statut: 'EN_COURS',
            libelle_statut: 'En cours — Vos tâches sont actives',
            change_manager: cmNom,
          }).catch(err => console.error('[NOTIF IMP email]', err.message));
        }
      }
    }

  } catch (err) {
    console.error('[notifyChangementStatusChange]', err.message);
  }
}

// ============================================================
// NOTIFICATIONS AUTO — TÂCHE
// ============================================================

async function notifyTacheStatusChange(id_tache, newStatutCode) {
  try {
    const tache = await prisma.tache.findUnique({
      where:  { id_tache },
      select: {
        code_tache:  true,
        titre_tache: true,
        id_user:     true,
        implementeur: { select: { email_user: true, nom_user: true, prenom_user: true } },
        changement: {
          select: {
            id_user:         true,
            id_changement:   true,
            code_changement: true,
            changeManager:   { select: { email_user: true } },
          },
        },
      },
    });
    if (!tache) return;

    const libelle = LIBELLES_STATUT_TCH[newStatutCode] || newStatutCode;

    // Destinataires : implémenteur + Change Manager
    const destIds = new Set([tache.id_user]);
    if (tache.changement?.id_user && tache.changement.id_user !== tache.id_user) {
      destIds.add(tache.changement.id_user);
    }

    await createNotification({
      id_users:      [...destIds],
      message:       `La tâche "${tache.titre_tache.substring(0, 50)}" (${tache.code_tache}) est passée au statut : ${libelle}.`,
      objet:         `Tâche ${tache.code_tache} — ${libelle}`,
      type_notif:    'IN_APP',
      id_tache,
      id_changement: tache.changement?.id_changement ?? null,
    });

    // Email à l'implémenteur uniquement (statuts importants)
    const STATUTS_EMAIL_TACHE = ['TERMINEE', 'ANNULEE', 'EN_COURS'];
    if (STATUTS_EMAIL_TACHE.includes(newStatutCode) && tache.implementeur?.email_user) {
      // Email au Change Manager si la tâche est terminée ou annulée
      const emailsCM = [];
      if (['TERMINEE', 'ANNULEE'].includes(newStatutCode) && tache.changement?.changeManager?.email_user) {
        emailsCM.push(tache.changement.changeManager.email_user);
      }
      const emails = [...new Set([tache.implementeur.email_user, ...emailsCM])].filter(Boolean);

      emailSvc.sendGeneriqueEmail(emails, {
        objet:   `Tâche ${tache.code_tache} — ${libelle}`,
        message: `La tâche "${tache.titre_tache}" du changement ${tache.changement?.code_changement ?? ''} est passée au statut : ${libelle}.`,
        lienUrl: `${process.env.APP_URL || 'http://localhost:5173'}/changements/${tache.changement?.id_changement ?? ''}`,
      }).catch(err => console.error('[NOTIF TACHE email]', err.message));
    }

  } catch (err) {
    console.error('[notifyTacheStatusChange]', err.message);
  }
}

// ============================================================
// NOTIFICATIONS AUTO — ESCALADE
// ============================================================

async function notifyEscalation(id_rfc, id_requester, id_change_managers = []) {
  try {
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: {
        code_rfc:  true,
        titre_rfc: true,
        demandeur: { select: { email_user: true, nom_user: true, prenom_user: true } },
      },
    });
    if (!rfc) return;

    const demandeurNom = rfc.demandeur
      ? `${rfc.demandeur.prenom_user} ${rfc.demandeur.nom_user}`
      : '—';

    // ── Confirmation au demandeur ───────────────────────────────
    await createNotification({
      id_users:   [id_requester],
      message:    `Votre demande d'escalade pour la RFC ${rfc.code_rfc} a été transmise.`,
      objet:      `Escalade RFC ${rfc.code_rfc} — Confirmée`,
      type_notif: 'IN_APP',
      id_rfc,
    });

    // ── Change Managers (IN_APP + EMAIL urgence) ────────────────
    const cmIds = id_change_managers.filter(id => id !== id_requester);
    if (cmIds.length) {
      await createNotification({
        id_users:   cmIds,
        message:    `⚠️ ESCALADE — La RFC ${rfc.code_rfc} nécessite un traitement urgent.`,
        objet:      `Escalade urgente — RFC ${rfc.code_rfc}`,
        type_notif: 'IN_APP',
        id_rfc,
      });

      const emailsCM = await _getEmails(cmIds);
      if (emailsCM.length) {
        emailSvc.sendEscaladeEmail(emailsCM, {
          id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc, demandeur: demandeurNom,
        }).catch(err => console.error('[NOTIF ESC CM email]', err.message));
      }
    }

    // ── Membres CAB (IN_APP + EMAIL urgence) ───────────────────
    const notified = new Set([id_requester, ...id_change_managers]);
    const membresCab = await prisma.membreCab.findMany({
      select: { utilisateur: { select: { id_user: true, actif: true, email_user: true } } },
    });
    const membres = membresCab.map(m => m.utilisateur).filter(u => u.actif && !notified.has(u.id_user));

    if (membres.length) {
      await createNotification({
        id_users:   membres.map(u => u.id_user),
        message:    `⚠️ ESCALADE urgente — RFC ${rfc.code_rfc} : votre évaluation est requise.`,
        objet:      `Escalade urgente — RFC ${rfc.code_rfc}`,
        type_notif: 'IN_APP',
        id_rfc,
      });

      const emailsCAB = membres.map(u => u.email_user).filter(Boolean);
      if (emailsCAB.length) {
        emailSvc.sendEscaladeEmail(emailsCAB, {
          id_rfc, code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc, demandeur: demandeurNom,
        }).catch(err => console.error('[NOTIF ESC CAB email]', err.message));
      }
    }

  } catch (err) {
    console.error('[notifyEscalation]', err.message);
  }
}

// ============================================================
// BROADCAST MANUEL
// ============================================================

async function broadcastNotification({ id_expediteur, id_users, message, objet, type_notif = 'EMAIL' }) {
  if (!id_expediteur) throw new Error('id_expediteur requis pour un broadcast.');
  return createNotification({ id_users, message, objet, type_notif, id_expediteur });
}

// ============================================================
// EXPORTS
// ============================================================

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