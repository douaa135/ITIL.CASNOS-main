'use strict';

/**
 * ============================================================
 * notification.controller.js — Orchestration Notifications
 * ============================================================
 */

const notifService = require('../services/notification.service');
const R            = require('../utils/response.utils');

// POST /api/notifications — Créer une notification manuellement
const createNotification = async (req, res) => {
  try {
    const { id_user, message, objet, type_notif, id_rfc, id_changement, id_tache } = req.body;

    if (!id_user || !message) {
      return R.badRequest(res, 'id_user et message sont obligatoires.');
    }

    const notif = await notifService.createNotification({
      id_user,
      message,
      objet,
      type_notif,
      id_rfc,
      id_changement,
      id_tache,
    });

    return R.success(res, { notif }, 'Notification créée avec succès.', 201);
  } catch (err) {
    console.error('[NOTIF] createNotification :', err);
    return R.serverError(res);
  }
};

// GET /api/notifications/me — ?lue=false&page=1&limit=20
const getMyNotifications = async (req, res) => {
  try {
    const result = await notifService.getNotificationsByUser(req.user.id_user, req.query);
    return R.success(res, result, 'Notifications récupérées.');
  } catch (err) {
    console.error('[NOTIF] getMyNotifications :', err);
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

// PATCH /api/notifications/:id_notif/read
const markAsRead = async (req, res) => {
  try {
    const notif = await notifService.markAsRead(req.params.id_notif, req.user.id_user);
    return R.success(res, { notif }, 'Notification marquée comme lue.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    if (err.code === 'FORBIDDEN') return R.forbidden(res, err.message);
    console.error('[NOTIF] markAsRead :', err);
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

// GET /api/notifications — ?page=1&limit=20 (Admin only ideally, or used by broadcast center)
const getAllNotifications = async (req, res) => {
  try {
    const result = await notifService.getNotifications(req.query);
    return R.success(res, result, 'Toutes les notifications récupérées.');
  } catch (err) {
    console.error('[NOTIF] getAllNotifications :', err);
    return R.serverError(res);
  }
};

module.exports = {
  createNotification,
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getAllNotifications,
};