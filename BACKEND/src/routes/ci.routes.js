'use strict';

/**
 * ============================================================
 * ci.routes.js — Routes Configuration Items + Environnements
 * ============================================================
 * Montage dans app.js :
 *   app.use('/api', ciRoutes);
 *
 * URLS COMPLÈTES :
 *
 * CONFIGURATION ITEMS
 *   GET    /api/ci                          → liste (filtres: type_ci, id_env, search)
 *   POST   /api/ci                          → créer (body: nom_ci, type_ci, env_ids?)
 *   GET    /api/ci/:id                      → détail avec envs et RFCs liées
 *   PUT    /api/ci/:id                      → modifier
 *   DELETE /api/ci/:id                      → supprimer (bloqué si RFC active liée)
 *
 * LIAISONS CI ↔ ENVIRONNEMENT
 *   GET    /api/ci/:id/environnements       → envs du CI
 *   POST   /api/ci/:id/environnements       → lier un env (body: id_env)
 *   DELETE /api/ci/:id/environnements/:id_env → délier
 *
 * ENVIRONNEMENTS (référentiel)
 *   GET    /api/environnements              → liste avec CIs liés
 *   POST   /api/environnements              → créer (ADMIN)
 *   GET    /api/environnements/:id_env      → détail
 *   PUT    /api/environnements/:id_env      → modifier (ADMIN)
 *   DELETE /api/environnements/:id_env      → supprimer (ADMIN, bloqué si utilisé)
 *
 * PERMISSIONS RBAC :
 *   changement:read → lire CIs et Envs (tout rôle connecté)
 *   changement:plan → créer/modifier CI et lier Env (Change Manager, Admin)
 *   system:config   → créer/modifier/supprimer Environnement (Admin)
 * ============================================================
 */

const express = require('express');
const router  = express.Router();

const ctrl                  = require('../controllers/ci.controller');
const { authenticateJWT }   = require('../middlewares/auth.middleware');
const { checkPermission }   = require('../middlewares/rbac.middleware');

const {
  validateCreateCI,
  validateUpdateCI,
  validateEnvLink,
  validateCreateEnv,
  validateUpdateEnv,
  checkCIExists,
  checkEnvExists,
  checkEnvBodyExists,
  checkCIEnvNotLinked,
  checkCIEnvLinked,
} = require('../middlewares/ci.middleware');

// ============================================================
// CONFIGURATION ITEMS
// ============================================================

// GET /api/ci — Filtres optionnels : ?type_ci=Serveur&id_env=uuid&search=postgres
router.get(
  '/ci',
  authenticateJWT,
  checkPermission('changement:read'),
  ctrl.getAllCIs
);

// POST /api/ci — { nom_ci, type_ci, version_ci?, description?, env_ids? }
router.post(
  '/ci',
  authenticateJWT,
  checkPermission('changement:plan'),
  validateCreateCI,
  ctrl.createCI
);

// GET /api/ci/:id
router.get(
  '/ci/:id',
  authenticateJWT,
  checkPermission('changement:read'),
  checkCIExists,
  ctrl.getCIById
);

// PUT /api/ci/:id — { nom_ci?, type_ci?, version_ci?, description? }
router.put(
  '/ci/:id',
  authenticateJWT,
  checkPermission('changement:plan'),
  checkCIExists,
  validateUpdateCI,
  ctrl.updateCI
);

// DELETE /api/ci/:id
router.delete(
  '/ci/:id',
  authenticateJWT,
  checkPermission('system:config'),
  checkCIExists,
  ctrl.deleteCI
);

// ============================================================
// LIAISONS CI ↔ ENVIRONNEMENT
// ============================================================

// GET /api/ci/:id/environnements
router.get(
  '/ci/:id/environnements',
  authenticateJWT,
  checkPermission('changement:read'),
  checkCIExists,
  ctrl.getEnvironnementsByCI
);

// POST /api/ci/:id/environnements — { id_env }
router.post(
  '/ci/:id/environnements',
  authenticateJWT,
  checkPermission('changement:plan'),
  checkCIExists,          // req.ci
  validateEnvLink,        // body.id_env requis
  checkEnvBodyExists,     // req.environnement (depuis body.id_env)
  checkCIEnvNotLinked,    // bloquer doublon
  ctrl.addEnvironnement
);

// DELETE /api/ci/:id/environnements/:id_env
router.delete(
  '/ci/:id/environnements/:id_env',
  authenticateJWT,
  checkPermission('changement:plan'),
  checkCIExists,          // req.ci
  checkEnvExists,         // req.environnement (depuis params.id_env)
  checkCIEnvLinked,       // exiger que le lien existe
  ctrl.removeEnvironnement
);

// ============================================================
// ENVIRONNEMENTS (référentiel)
// ============================================================

// GET /api/environnements
router.get(
  '/environnements',
  authenticateJWT,
  checkPermission('changement:read'),
  ctrl.getAllEnvironnements
);

// POST /api/environnements — { nom_env, description? }
router.post(
  '/environnements',
  authenticateJWT,
  checkPermission('system:config'),
  validateCreateEnv,
  ctrl.createEnvironnement
);

// GET /api/environnements/:id_env
router.get(
  '/environnements/:id_env',
  authenticateJWT,
  checkPermission('changement:read'),
  checkEnvExists,
  ctrl.getEnvironnementById
);

// PUT /api/environnements/:id_env — { nom_env?, description? }
router.put(
  '/environnements/:id_env',
  authenticateJWT,
  checkPermission('system:config'),
  checkEnvExists,
  validateUpdateEnv,
  ctrl.updateEnvironnement
);

// DELETE /api/environnements/:id_env
router.delete(
  '/environnements/:id_env',
  authenticateJWT,
  checkPermission('system:config'),
  checkEnvExists,
  ctrl.deleteEnvironnement
);

module.exports = router;