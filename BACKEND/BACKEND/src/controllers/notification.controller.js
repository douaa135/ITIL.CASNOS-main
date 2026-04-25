'use strict';

/**
 * ============================================================
 * notification.controller.js — Orchestration Notifications
 * ============================================================
 */

const notifService = require('../services/notification.service');
const R            = require('../utils/response.utils');

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

// POST /api/notifications — Création manuelle (Admin)
const createNotification = async (req, res) => {
  try {
    // Note: On pourrait ajouter un checkRole('ADMIN') ici ou dans la route
    const result = await notifService.createNotification(req.body);
    return R.success(res, result, 'Notification envoyée avec succès.');
  } catch (err) {
    console.error('[NOTIF] createNotification :', err);
    return R.badRequest(res, err.message);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  createNotification,
};