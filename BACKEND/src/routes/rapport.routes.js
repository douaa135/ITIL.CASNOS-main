'use strict';

// ============================================================
// rapport.routes.js
// ============================================================
// Montage : app.use('/api', rapportRoutes);
//
//  KPI
//   GET /api/kpi                          → dashboard global
//   GET /api/kpi/rfc                      → métriques RFC
//   GET /api/kpi/changements              → métriques Changements
//   GET /api/kpi/taches                   → métriques Tâches
//   GET /api/kpi/timeline?days=30         → activité N jours
//
//  RAPPORTS RFC (table Rapport)
//   GET    /api/rfc/:id_rfc/rapports
//   POST   /api/rfc/:id_rfc/rapports
//   GET    /api/rapports/:id_rapport
//   DELETE /api/rapports/:id_rapport
//
//  RAPPORT COMPLET RFC (temps réel — toute la chaîne ITIL)
//   GET /api/rfc/:id_rfc/rapport-complet
//
//  AUDIT LOG
//   GET /api/audit-logs?entite_type=RFC&action=APPROVE&page=1&limit=50
// ============================================================

const express = require('express');
const router  = express.Router();

const ctrl                   = require('../controllers/rapport.controller');
const { authenticateJWT }    = require('../middlewares/auth.middleware');
const { checkPermission, checkRole } = require('../middlewares/rbac.middleware');

// ── KPI (lecture — tout rôle avec rapport:read) ───────────────
router.get('/kpi',             authenticateJWT, checkPermission('rapport:read'), ctrl.getKpiDashboard);
router.get('/kpi/rfc',         authenticateJWT, checkPermission('rapport:read'), ctrl.getKpiRfc);
router.get('/kpi/changements', authenticateJWT, checkPermission('rapport:read'), ctrl.getKpiChangements);
router.get('/kpi/taches',      authenticateJWT, checkPermission('rapport:read'), ctrl.getKpiTaches);
router.get('/kpi/timeline',    authenticateJWT, checkPermission('rapport:read'), ctrl.getActivityTimeline);

// ── Rapport complet RFC (temps réel) ─────────────────────────
// IMPORTANT : placer AVANT /rfc/:id_rfc/rapports pour éviter
// que "rapport-complet" soit interprété comme un id_rapport
router.get(
  '/rfc/:id_rfc/rapport-complet',
  authenticateJWT,
  checkPermission('rapport:read'),
  ctrl.getFullRfcReport
);

// ── Rapports RFC (table Rapport) ──────────────────────────────
router.get(
  '/rfc/:id_rfc/rapports',
  authenticateJWT,
  checkPermission('rapport:read'),
  ctrl.getRapportsByRfc
);

router.post(
  '/rfc/:id_rfc/rapports',
  authenticateJWT,
  checkPermission('rapport:generate'),
  ctrl.createRapport
);

router.get(
  '/rapports/:id_rapport',
  authenticateJWT,
  checkPermission('rapport:read'),
  ctrl.getRapportById
);

router.delete(
  '/rapports/:id_rapport',
  authenticateJWT,
  checkPermission('rapport:generate'),
  ctrl.deleteRapport
);

// ── Audit Log (ADMIN uniquement) ─────────────────────────────
router.get(
  '/audit-logs',
  authenticateJWT,
  checkRole('ADMIN'),
  ctrl.getAuditLogs
);

module.exports = router;