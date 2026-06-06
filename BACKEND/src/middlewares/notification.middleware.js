'use strict';

// ============================================================
// notification.middleware.js
// ============================================================

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

/**
 * checkNotifExists
 * Charge la notification par params.id_notif.
 * Injecte req.notif.
 */
const checkNotifExists = async (req, res, next) => {
  try {
    const { id_notif } = req.params;
    const notif = await prisma.notification.findUnique({
      where:  { id_notif },
      select: {
        id_notif:      true,
        id_user:       true,
        message:       true,
        lue:           true,
        date_envoi:    true,
        id_rfc:        true,
        id_changement: true,
        id_tache:      true,
      },
    });
    if (!notif) return R.notFound(res, 'Notification introuvable.');
    req.notif = notif;
    next();
  } catch (err) {
    console.error('[checkNotifExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkNotifOwner
 * Vérifie que la notification appartient à req.user.
 * Doit être placé APRÈS checkNotifExists.
 */
const checkNotifOwner = (req, res, next) => {
  if (req.notif.id_user !== req.user.id_user) {
    return R.forbidden(res, 'Vous ne pouvez accéder qu\'à vos propres notifications.');
  }
  next();
};

module.exports = { 
  checkNotifExists, 
  checkNotifOwner 
};