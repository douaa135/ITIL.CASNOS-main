'use strict';

// ============================================================
// app.js — VERSION FINALE (tous les modules backend)
// ============================================================

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');

// ── Routes existantes ─────────────────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const rfcRoutes         = require('./routes/rfc.routes');
const changementRoutes  = require('./routes/changement.routes');
const userRoutes        = require('./routes/user.routes');
const tacheRoutes       = require('./routes/taches.routes');
const cabRoutes         = require('./routes/cab.routes');

const ciRoutes              = require('./routes/ci.routes');
const notifRoutes           = require('./routes/notification.routes');
const workflowRoutes        = require('./routes/workflow.routes');

const referentielRoutes     = require('./routes/referentiel.routes');
const rapportRoutes         = require('./routes/rapport.routes');
const directionRoutes       = require('./routes/direction.routes');

const app = express();

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────────
app.use(cors({
  origin:         process.env.CLIENT_ORIGIN || '*',
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Logs HTTP ─────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ============================================================
// ROUTES
// ============================================================

// Auth
app.use('/api/auth',          authRoutes);

// Entités principales
app.use('/api/rfc',           rfcRoutes);
app.use('/api/changements',   changementRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/',             tacheRoutes);            // /api/t/changements/:id/taches + /api/t/taches/:id
app.use('/api/',             cabRoutes);              // /api/c/cab + /api/c/reunions

// CI + Environnements
app.use('/api',               ciRoutes);               // /api/ci + /api/environnements

// Notifications + Workflow
app.use('/api/notifications', notifRoutes);
app.use('/api/workflow',      workflowRoutes);

// Directions CRUD (avant referentiel pour éviter conflit sur GET /api/directions)
app.use('/api/directions',    directionRoutes);        // CRUD /api/directions

// Référentiels (lecture seule — /api/statuts, /api/priorites, /api/types-rfc)
app.use('/api',               referentielRoutes);

// Rapports / KPI / Audit
app.use('/api',               rapportRoutes);          // /api/kpi, /api/rapports, /api/audit-logs

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:    true,
    message:    'ITIL Change Management API — BACKEND COMPLET ✅',
    version:    '1.0.0-final',
    modules: [
      'auth', 'users',
      'rfc', 'rfc/commentaires', 'rfc/evaluation-risque', 'rfc/pieces-jointes',
      'changements', 'changements/pir', 'changements/tests',
      'taches', 'journaux',
      'cab', 'reunions', 'votes', 'decisions',
      'ci', 'environnements',
      'notifications', 'workflow',
      'statuts', 'priorites', 'types-rfc', 'directions',
      'kpi', 'rapports', 'audit-logs',
    ],
    timestamp: new Date().toISOString(),
  });
});

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code:    'NOT_FOUND',
      message: `La route ${req.method} ${req.path} n'existe pas.`,
    },
  });
});

// ── Gestionnaire d'erreurs global ────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.stack || err.message);
  res.status(err.statusCode || err.status || 500).json({
    success: false,
    error: {
      code:    'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Erreur interne.' : err.message,
    },
  });
});

module.exports = app;