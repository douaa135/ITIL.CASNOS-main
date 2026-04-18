/**
 * ============================================================
 * app.js — Configuration Express
 * ============================================================
 */

const express    = require('express');
const cors       = require('cors');         // mecanisme de secu qui permet au serveur d'autoriser des requetes provenant de domaine differents (origines croisees)
const helmet     = require('helmet');       // Middleware de securite HTTP
const morgan     = require('morgan');       // Middleware de logs HTTP
const cookieParser = require('cookie-parser');   // Middleware pour parser les cookies (req.cookies)

// Routes
const authRoutes = require('./routes/auth.routes');
const rfcRoutes  = require('./routes/rfc.routes');
const changementRoutes = require('./routes/changement.routes');
const userRoutes = require('./routes/user.routes');
const tacheRoutes = require('./routes/taches.routes');
const cabRoutes = require('./routes/cab.routes');
const adminRoutes = require('./routes/admin.routes');

const app = express();

// ── Sécurité ──────────────────────────────────────────────────
app.use(helmet());                            // headers HTTP sécurisés

// ── CORS ──────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
];
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, etc.)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  },
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ── Body parsers ──────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// ── Logs HTTP (dev) ───────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rfc',  rfcRoutes);
app.use('/api/changements', changementRoutes);
app.use('/api/users', userRoutes);
app.use('/api', tacheRoutes);
app.use('/api', cabRoutes);
app.use('/api/admin', adminRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'ITIL Change Management API — en ligne ✅',
    version: '1.0.0-phase2',
    timestamp: new Date().toISOString(),
  });
});

// ── 404 — Route inexistante ───────────────────────────────────
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

  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      code:    'SERVER_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'Erreur interne du serveur.'
        : err.message,
    },
  });
});

module.exports = app;
