'use strict';

// ============================================================
// rapport.routes.js
// ============================================================
// Montage : app.use('/api', rapportRoutes);
//
//  KPI (tout rôle avec rapport:read)
//   GET /api/kpi                         → dashboard global
//   GET /api/kpi/rfc                     → métriques RFC
//   GET /api/kpi/changements             → métriques Changements
//   GET /api/kpi/taches                  → métriques Tâches
//   GET /api/kpi/timeline?days=30        → activité N jours
//
//  RAPPORTS RFC
//   GET    /api/rfc/:id_rfc/rapports
//   POST   /api/rfc/:id_rfc/rapports     → { titre_rapport, type_rapport?, contenu_rapport? }
//   GET    /api/rapports/:id_rapport
//   DELETE /api/rapports/:id_rapport
//
//  AUDIT LOG (admin uniquement)
//   GET /api/audit-logs?entite_type=RFC&action=APPROVE&page=1&limit=50
// ============================================================

const express = require('express');
const router  = express.Router();

const ctrl               = require('../controllers/rapport.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkPermission, checkRole } = require('../middlewares/rbac.middleware');

// KPI
router.get(
  '/kpi',                
  authenticateJWT, checkPermission('rapport:read'),    
  ctrl.getKpiDashboard
);

router.get(
  '/kpi/rfc',            
  authenticateJWT, checkPermission('rapport:read'),    
  ctrl.getKpiRfc
);
router.get(
  '/kpi/changements',    
  authenticateJWT, checkPermission('rapport:read'),    
  ctrl.getKpiChangements
);

router.get(
  '/kpi/taches',         
  authenticateJWT, 
  checkPermission('rapport:read'),    
ctrl.getKpiTaches
);
router.get(
  '/kpi/timeline',       
  authenticateJWT, 
  checkPermission('rapport:read'),    
ctrl.getActivityTimeline
);

// Rapports RFC
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

// Audit Log (ADMIN seulement)
router.get(
  '/audit-logs', 
  authenticateJWT, 
  checkRole('ADMIN'), 
ctrl.getAuditLogs
);

module.exports = router;