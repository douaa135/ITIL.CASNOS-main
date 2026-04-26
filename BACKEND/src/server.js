/**
 * ============================================================
 * server.js — Point d'entrée du serveur
 * ============================================================
 */

require('dotenv').config();    // Charge .env AVANT tout import

const app  = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
  console.log('\n========================================');
  console.log('  🚀 ITIL Change Management API');
  console.log('========================================');
  console.log(`  Environnement : ${process.env.NODE_ENV || 'development'}`);
  console.log(`  Serveur       : http://${HOST}:${PORT}`);
  console.log(`  Health check  : http://${HOST}:${PORT}/api/health`);
  console.log('----------------------------------------');
  console.log('  Comptes de test (mot de passe : password)');
  console.log('  admin        → ADMIN');
  console.log('  k.merabti    → CHANGE_MANAGER');
  console.log('  s.rahmani    → DEMANDEUR');
  console.log('  y.benamara   → IMPLEMENTEUR');
  console.log('  n.hamdi      → MEMBRE_CAB');
  console.log('  r.tlemcani   → SERVICE_DESK');
  console.log('========================================\n');
});

// ── Graceful shutdown ─────────────────────────────────────────
const shutdown = (signal) => {
  console.log(`\n[${signal}] Arrêt du serveur...`);
  server.close(() => {
    console.log('Serveur arrêté proprement.');
    process.exit(0);
  });
  // Force exit après 10 secondes
  setTimeout(() => process.exit(1), 10000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Erreurs non gérées
process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[UNHANDLED REJECTION]', reason);
});

module.exports = server;
