'use strict';

/**
 * ============================================================
 * notification.routes.js — Routes Notifications
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api/notifications', notifRoutes);
 *
 * URLS :
 *   POST   /api/notifications                   → créer manuellement (Admin)
 *   GET    /api/notifications/me                → mes notifs (?lue, page, limit)
 *   GET    /api/notifications/me/unread-count   → compteur non lues
 *   GET    /api/notifications/me/urgents-count  → compteur urgents (RFC/CHG/TCH)
 *   PATCH  /api/notifications/me/read-all       → tout marquer lu
 *   PATCH  /api/notifications/:id_notif/read    → marquer une notif lue
 *   DELETE /api/notifications/:id_notif         → supprimer une notif
 *
 * ⚠️  Toutes les routes "/me/..." doivent être déclarées AVANT "/:id_notif"
 *     pour éviter qu'Express interprète "me" comme un UUID de paramètre.
 * ============================================================
 */

const express = require('express');
const router  = express.Router();

const ctrl                = require('../controllers/notification.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkRole }        = require('../middlewares/rbac.middleware');

// ── POST /api/notifications ──────────────────────────────────
router.post('/', authenticateJWT, ctrl.createNotification);

// ── GET /api/notifications — historique global (admin)
router.get('/', authenticateJWT, checkRole('ADMIN'), ctrl.getNotifications);

// ── Routes /me/** — AVANT /:id_notif ────────────────────────
router.get('/me',                authenticateJWT, ctrl.getMyNotifications);
router.get('/me/sent',           authenticateJWT, ctrl.getMySentNotifications);
router.get('/me/unread-count',   authenticateJWT, ctrl.getUnreadCount);
router.get('/me/urgents-count',  authenticateJWT, ctrl.getUrgentsCount);
router.patch('/me/read-all',     authenticateJWT, ctrl.markAllAsRead);

// ── Routes avec paramètre ────────────────────────────────────
router.patch('/:id_notif/read',  authenticateJWT, ctrl.markAsRead);
router.delete('/:id_notif',      authenticateJWT, ctrl.deleteNotification);

// notification.routes.js
router.post('/broadcast', authenticateJWT, ctrl.broadcastNotification );

module.exports = router;