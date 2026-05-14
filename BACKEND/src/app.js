'use strict';

// ============================================================
// app.js — WebSocket first (Socket.IO) — suppression du polling
// ============================================================

const express      = require('express');
const cors         = require('cors');
const http         = require('http');
const { Server }   = require('socket.io');
const helmet       = require('helmet');
const morgan       = require('morgan');
const cookieParser = require('cookie-parser');

// Hub WebSocket centralisé — doit être initialisé AVANT tout import de service
const socketSvc = require('./services/socket.service');

// ── Routes ───────────────────────────────────────────────────
const authRoutes        = require('./routes/auth.routes');
const rfcRoutes         = require('./routes/rfc.routes');
const changementRoutes  = require('./routes/changement.routes');
const userRoutes        = require('./routes/user.routes');
const tacheRoutes       = require('./routes/taches.routes');
const cabRoutes         = require('./routes/cab.routes');
const ciRoutes          = require('./routes/ci.routes');
const notifRoutes       = require('./routes/notification.routes');
const workflowRoutes    = require('./routes/workflow.routes');
const referentielRoutes = require('./routes/referentiel.routes');
const rapportRoutes     = require('./routes/rapport.routes');
const directionRoutes   = require('./routes/direction.routes');
const planningRoutes    = require('./routes/planning.routes');

// ── App + Serveur HTTP ───────────────────────────────────────
const app    = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isLocal =
        origin.includes('localhost') ||
        /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
        /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin);
      callback(null, isLocal ? true : new Error(`CORS bloqué: ${origin}`));
    },
    methods:     ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
});

// Enregistrer l'instance dans le hub centralisé
socketSvc.setIo(io);

// ── Gestion des rooms ─────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[WS] Client connecté : ${socket.id}`);

  // ── Rejoindre une room ──────────────────────────────────────

  /** Room personnelle — notifications, compte */
  socket.on('rejoindre:user', (id_user) => {
    if (!id_user) return;
    socket.join(`user_${id_user}`);
    console.log(`[WS] ${socket.id} → room user_${id_user}`);
  });

  /** Room d'une RFC spécifique (page détail RFC) */
  socket.on('rejoindre:rfc', (id_rfc) => {
    if (!id_rfc) return;
    socket.join(`rfc_${id_rfc}`);
    console.log(`[WS] ${socket.id} → room rfc_${id_rfc}`);
  });

  /** Room d'un Changement (page détail Changement) */
  socket.on('rejoindre:changement', (id_changement) => {
    if (!id_changement) return;
    socket.join(`changement_${id_changement}`);
    console.log(`[WS] ${socket.id} → room changement_${id_changement}`);
  });

  /** Room d'une réunion CAB (votes live) */
  socket.on('rejoindre:reunion', (id_reunion) => {
    if (!id_reunion) return;
    socket.join(`reunion_${id_reunion}`);
    console.log(`[WS] ${socket.id} → room reunion_${id_reunion}`);
  });

  /** Room dashboard — rafraîchissement KPI global */
  socket.on('rejoindre:dashboard', () => {
    socket.join('dashboard');
    console.log(`[WS] ${socket.id} → room dashboard`);
  });

  // ── Quitter une room ────────────────────────────────────────

  socket.on('quitter:rfc', (id_rfc) => {
    socket.leave(`rfc_${id_rfc}`);
  });

  socket.on('quitter:changement', (id_changement) => {
    socket.leave(`changement_${id_changement}`);
  });

  socket.on('quitter:reunion', (id_reunion) => {
    socket.leave(`reunion_${id_reunion}`);
  });

  socket.on('quitter:dashboard', () => {
    socket.leave('dashboard');
  });

  // ── Rétro-compatibilité ancienne API ─────────────────────────
  socket.on('rejoindre', (userId) => {
    socket.join(`user_${userId}`);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client déconnecté : ${socket.id}`);
  });
});

// ── Middlewares HTTP ─────────────────────────────────────────
app.use(helmet());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const isLocal =
      origin.includes('localhost') ||
      /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) ||
      /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin);
    callback(null, isLocal ? true : new Error(`CORS bloqué: ${origin}`));
  },
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:    true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ── Routes ───────────────────────────────────────────────────
app.use('/api/auth',          authRoutes);
app.use('/api/rfc',           rfcRoutes);
app.use('/api/changements',   changementRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/',              tacheRoutes);
app.use('/api/',              cabRoutes);
app.use('/api',               ciRoutes);
app.use('/api/notifications',  notifRoutes);
app.use('/api/workflow',       workflowRoutes);
app.use('/api/directions',     directionRoutes);
app.use('/api',                referentielRoutes);
app.use('/api',                rapportRoutes);
app.use('/api/planning',       planningRoutes);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    success:   true,
    message:   'ITIL Change Management API ✅',
    version:   '2.0.0-websocket',
    transport: 'websocket (no polling)',
    rooms:     ['user_{id}', 'rfc_{id}', 'changement_{id}', 'reunion_{id}', 'dashboard'],
    events: {
      server_to_client: [
        'notification:new',
        'rfc:update',
        'changement:update',
        'tache:update',
        'cab:vote',
        'cab:decision',
        'user:desactive',
        'kpi:refresh',
      ],
      client_to_server: [
        'rejoindre:user',
        'rejoindre:rfc',
        'rejoindre:changement',
        'rejoindre:reunion',
        'rejoindre:dashboard',
        'quitter:rfc',
        'quitter:changement',
        'quitter:reunion',
        'quitter:dashboard',
      ],
    },
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

// ── Erreurs globales ──────────────────────────────────────────
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

module.exports = { app, server, io };