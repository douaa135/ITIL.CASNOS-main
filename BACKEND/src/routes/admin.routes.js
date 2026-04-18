'use strict';

/**
 * ============================================================
 * admin.routes.js — Routes de données de référence
 * ============================================================
 * GET /api/admin/statuts          → liste des statuts (RFC/CHANGEMENT)
 * GET /api/admin/environnements   → liste des environnements
 * GET /api/admin/types-rfc        → liste des types de RFC
 * ============================================================
 */

const express  = require('express');
const router   = express.Router();
const prisma   = require('../services/prisma.service');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { success, serverError } = require('../utils/response.utils');

// GET /api/admin/statuts?contexte=RFC|CHANGEMENT
router.get('/statuts', authenticateJWT, async (req, res) => {
  try {
    const { contexte } = req.query;
    const where = contexte ? { contexte } : {};
    const statuts = await prisma.statut.findMany({
      where,
      orderBy: { id_statut: 'asc' },
    });
    return success(res, { statuts }, 'Statuts récupérés.');
  } catch (err) {
    console.error('[ADMIN] statuts :', err);
    return serverError(res, 'Erreur lors de la récupération des statuts.');
  }
});

// GET /api/admin/environnements
router.get('/environnements', authenticateJWT, async (req, res) => {
  try {
    const environnements = await prisma.environnement.findMany({
      orderBy: { nom_env: 'asc' },
    });
    return success(res, { environnements }, 'Environnements récupérés.');
  } catch (err) {
    console.error('[ADMIN] environnements :', err);
    return serverError(res, 'Erreur lors de la récupération des environnements.');
  }
});

// GET /api/admin/types-rfc
router.get('/types-rfc', authenticateJWT, async (req, res) => {
  try {
    const types = await prisma.typeRfc.findMany({
      orderBy: { type: 'asc' },
    });
    return success(res, { types }, 'Types RFC récupérés.');
  } catch (err) {
    console.error('[ADMIN] types-rfc :', err);
    return serverError(res, 'Erreur lors de la récupération des types.');
  }
});

module.exports = router;
