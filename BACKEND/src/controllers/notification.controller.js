'use strict';

/**
 * ============================================================
 * notification.controller.js — Orchestration Notifications
 * ============================================================
 */

const notifService = require('../services/notification.service');
const R            = require('../utils/response.utils');

// POST /api/notifications
const createNotification = async (req, res) => {
  try {
    const { id_user, message, objet, type_notif, id_rfc, id_changement, id_tache } = req.body;

    if (!id_user || !message) {
      return R.badRequest(res, 'id_user et message sont obligatoires.');
    }

    const notif = await notifService.createNotification({
      id_user, message, objet, type_notif, id_rfc, id_changement, id_tache,
    });

    return R.success(res, { notif }, 'Notification créée avec succès.', 201);
  } catch (err) {
    console.error('[NOTIF] createNotification :', err);
    return R.serverError(res);
  }
};

// GET /api/notifications/me
const getMyNotifications = async (req, res) => {
  try {
    const result = await notifService.getNotificationsByUser(req.user.id_user, req.query);
    return R.success(res, result, 'Notifications récupérées.');
  } catch (err) {
    console.error('[NOTIF] getMyNotifications :', err);
    return R.serverError(res);
  }
};

const getMySentNotifications = async (req, res) => {
  try {
    const result = await notifService.getNotifications({
      ...req.query,
      id_expediteur: req.user.id_user,
      excludeSystem: true,
    });
    return R.success(res, result, 'Notifications envoyées récupérées.');
  } catch (err) {
    console.error('[NOTIF] getMySentNotifications :', err);
    return R.serverError(res);
  }
};

// GET /api/notifications/me/unread-count
const getUnreadCount = async (req, res) => {
  try {
    const result = await notifService.countUnread(req.user.id_user);
    return R.success(res, result, 'Compteur non lues récupéré.');
  } catch (err) {
    console.error('[NOTIF] getUnreadCount :', err);
    return R.serverError(res);
  }
};

// GET /api/notifications/me/urgents-count
// Retourne le nombre d'éléments urgents actifs (RFC, Changements, Tâches)
// différenciés par type selon le rôle de l'utilisateur connecté.
const getUrgentsCount = async (req, res) => {
  try {
    const result = await notifService.countUrgents(
      req.user.id_user,
      req.user.roles ?? [],
    );
    return R.success(res, result, 'Compteur urgents récupéré.');
  } catch (err) {
    console.error('[NOTIF] getUrgentsCount :', err);
    return R.serverError(res);
  }
};

// PATCH /api/notifications/:id_notif/read
async function markAsRead(req, res) {
  try {
    const { id_notif } = req.params;
    const id_user = req.user.id_user; // depuis le token JWT

    const result = await notifService.markAsRead(id_notif, id_user);
    return res.json(result);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return res.status(404).json({ message: err.message });
    return res.status(500).json({ message: err.message });
  }
}

const getNotifications = async (req, res) => {
  try {
    const result = await notifService.getNotifications(req.query);
    return R.success(res, result, 'Notifications récupérées.');
  } catch (err) {
    console.error('[NOTIF] getNotifications :', err);
    return R.serverError(res);
  }
};

// PATCH /api/notifications/me/read-all
const markAllAsRead = async (req, res) => {
  try {
    const result = await notifService.markAllAsRead(req.user.id_user);
    return R.success(res, result, `${result.updated} notification(s) marquée(s) comme lue(s).`);
  } catch (err) {
    console.error('[NOTIF] markAllAsRead :', err);
    return R.serverError(res);
  }
};

// DELETE /api/notifications/:id_notif
const deleteNotification = async (req, res) => {
  try {
    const result = await notifService.deleteNotification(req.params.id_notif, req.user.id_user);
    return R.success(res, result, 'Notification supprimée.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    if (err.code === 'FORBIDDEN') return R.forbidden(res, err.message);
    console.error('[NOTIF] deleteNotification :', err);
    return R.serverError(res);
  }
};

const broadcastNotification = async (req, res, next) => {
  try {
    const { message, objet, id_users } = req.body;
    const result = await notifService.broadcastNotification({
      id_expediteur: req.user.id_user,  // ← priorité au user connecté, pas au body
      id_users,
      message,
      objet,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  getMySentNotifications,
  getUnreadCount,
  getUrgentsCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  broadcastNotification,
  getNotifications,
};