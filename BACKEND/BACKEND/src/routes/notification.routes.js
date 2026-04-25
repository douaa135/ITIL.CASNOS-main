'use strict';

/**
 * ============================================================
 * notification.routes.js — Routes Notifications
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api/notifications', notifRoutes);
 *
 * URLS :
 *   GET    /api/notifications/me               → mes notifs (filtres: lue, page, limit)
 *   GET    /api/notifications/me/unread-count  → compteur non lues
 *   PATCH  /api/notifications/me/read-all      → tout marquer lu
 *   PATCH  /api/notifications/:id_notif/read   → marquer une notif lue
 *   DELETE /api/notifications/:id_notif        → supprimer une notif
 *
 * Toutes les routes nécessitent un JWT valide.
 * ============================================================
 */

const express = require('express');
const router  = express.Router();

const ctrl               = require('../controllers/notification.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkRole }       = require('../middlewares/rbac.middleware');

// Routes Admin
router.post('/', authenticateJWT, checkRole('ADMIN'), ctrl.createNotification);

// Routes "me" AVANT les routes avec :id_notif (éviter collision)
router.get('/me',              authenticateJWT, ctrl.getMyNotifications);
router.get('/me/unread-count', authenticateJWT, ctrl.getUnreadCount);
router.patch('/me/read-all',   authenticateJWT, ctrl.markAllAsRead);

// Routes avec paramètre
router.patch('/:id_notif/read', authenticateJWT, ctrl.markAsRead);
router.delete('/:id_notif',     authenticateJWT, ctrl.deleteNotification);

module.exports = router;