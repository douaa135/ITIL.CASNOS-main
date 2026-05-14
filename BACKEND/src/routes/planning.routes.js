'use strict';

/**
 * ============================================================
 * planning.routes.js — Routes Planification & Blackouts
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api/planning', planningRoutes);
 *
 * MATRICE DE PERMISSIONS :
 * ┌─────────────────────────────┬───────┬──────┬─────┬─────┬──────────┐
 * │ Route                       │ ADMIN │ CM   │ IMP │ CAB │ DEM / SD │
 * ├─────────────────────────────┼───────┼──────┼─────┼─────┼──────────┤
 * │ GET  /semaine               │  ✅   │ ✅   │ ✅  │ ✅  │ ✅       │
 * │ GET  /mois                  │  ✅   │ ✅   │ ✅  │ ✅  │ ✅       │
 * │ GET  /semestre              │  ✅   │ ✅   │ ✅  │ ✅  │ ✅       │
 * │ GET  /calendrier            │  ✅   │ ✅   │ ✅  │ ✅  │ ✅       │
 * │ GET  /conflits              │  ✅   │ ✅   │ ❌  │ ❌  │ ❌       │
 * │ POST /valider-date          │  ✅   │ ✅   │ ❌  │ ❌  │ ❌       │
 * │ GET  /blackouts             │  ✅   │ ✅   │ ✅  │ ✅  │ ✅       │
 * │ GET  /blackouts/:id         │  ✅   │ ✅   │ ✅  │ ✅  │ ✅       │
 * │ POST /blackouts             │  ✅   │ ❌   │ ❌  │ ❌  │ ❌       │
 * │ PUT  /blackouts/:id         │  ✅   │ ❌   │ ❌  │ ❌  │ ❌       │
 * │ DELETE /blackouts/:id       │  ✅   │ ❌   │ ❌  │ ❌  │ ❌       │
 * └─────────────────────────────┴───────┴──────┴─────┴─────┴──────────┘
 *
 * PERMISSIONS :
 *   planning:read    → lecture calendrier + blackouts (tous rôles)
 *   planning:manage  → CRUD blackouts (ADMIN uniquement)
 *   changement:plan  → valider date + voir conflits (CM + ADMIN)
 * ============================================================
 */

const express = require('express');
const router  = express.Router();

const ctrl                = require('../controllers/planning.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { checkPermission } = require('../middlewares/rbac.middleware');

// ── CALENDRIER — planning:read ────────────────────────────────
// Tous les rôles : ADMIN, CM, IMP, CAB, DEMANDEUR, SERVICE_DESK

router.get('/semaine',
  authenticateJWT,
  checkPermission('planning:read'),
  ctrl.getVueSemaine
);

router.get('/mois',
  authenticateJWT,
  checkPermission('planning:read'),
  ctrl.getVueMois
);

router.get('/semestre',
  authenticateJWT,
  checkPermission('planning:read'),
  ctrl.getVueSemestre
);

router.get('/calendrier',
  authenticateJWT,
  checkPermission('planning:read'),
  ctrl.getCalendrier
);

// ── CONFLITS + VALIDATION — changement:plan (CM + ADMIN) ─────
// Uniquement ceux qui créent/modifient des changements

router.get('/conflits',
  authenticateJWT,
  checkPermission('changement:plan'),
  ctrl.getConflits
);

router.post('/valider-date',
  authenticateJWT,
  checkPermission('changement:plan'),
  ctrl.validerDate
);

// ── BLACKOUTS Lecture — planning:read (tous rôles) ────────────

router.get('/blackouts',
  authenticateJWT,
  checkPermission('planning:read'),
  ctrl.getAllBlackouts
);

router.get('/blackouts/:id_blackout',
  authenticateJWT,
  checkPermission('planning:read'),
  ctrl.getBlackoutById
);

// ── BLACKOUTS Écriture — planning:manage (ADMIN uniquement) ──

router.post('/blackouts',
  authenticateJWT,
  checkPermission('planning:manage'),
  ctrl.createBlackout
);

router.put('/blackouts/:id_blackout',
  authenticateJWT,
  checkPermission('planning:manage'),
  ctrl.updateBlackout
);

router.delete('/blackouts/:id_blackout',
  authenticateJWT,
  checkPermission('planning:manage'),
  ctrl.deleteBlackout
);

module.exports = router;