'use strict';

// ============================================================
// referentiel.routes.js
// ============================================================
// Montage : app.use('/api', referentielRoutes);
//
// Endpoints référentiels (lecture seule pour les rôles normaux,
// création/modification uniquement Admin via system:config) :
//
//   GET /api/statuts?contexte=RFC|CHANGEMENT|TACHE
//   GET /api/priorites
//   GET /api/types-rfc
//   GET /api/directions
// ============================================================

'use strict';

const express = require('express');
const router  = express.Router();

const { authenticateJWT } = require('../middlewares/auth.middleware');
const ctrl                = require('../controllers/referentiel.controller');

// GET /api/statuts?contexte=RFC
router.get(
  '/statuts',    
  authenticateJWT, 
  ctrl.getStatuts
);

// GET /api/priorites
router.get(
  '/priorites',  
  authenticateJWT, 
  ctrl.getPriorites
);

// GET /api/types-rfc
router.get(
  '/types-rfc',  
  authenticateJWT, 
  ctrl.getTypesRfc
);

// GET /api/directions
router.get(
  '/directions', 
  authenticateJWT, 
  ctrl.getDirections
);

module.exports = router;



// const express  = require('express');
// const router   = express.Router();
// const prisma   = require('../services/prisma.service');
// const { authenticateJWT } = require('../middlewares/auth.middleware');
// const R = require('../utils/response.utils');


// router.get('/statuts', authenticateJWT, async (req, res) => {
//   try {
//     const { contexte } = req.query;
//     const where = contexte ? { contexte } : {};
//     const statuts = await prisma.statut.findMany({
//       where,
//       select: {
//         id_statut:   true,
//         code_metier: true,
//         code_statut: true,
//         libelle:     true,
//         description: true,
//         contexte:    true,
//       },
//       orderBy: [{ contexte: 'asc' }, { libelle: 'asc' }],
//     });
//     return R.success(res, { statuts, total: statuts.length }, 'Statuts récupérés.');
//   } catch (err) {
//     console.error('[REF] statuts :', err);
//     return R.serverError(res);
//   }
// });

// router.get('/priorites', authenticateJWT, async (req, res) => {
//   try {
//     const priorites = await prisma.priorite.findMany({
//       select: {
//         id_priorite:   true,
//         code_metier:   true,
//         code_priorite: true,
//         libelle:       true,
//       },
//       orderBy: { code_priorite: 'asc' },
//     });
//     return R.success(res, { priorites, total: priorites.length }, 'Priorités récupérées.');
//   } catch (err) {
//     console.error('[REF] priorites :', err);
//     return R.serverError(res);
//   }
// });

// router.get('/types-rfc', authenticateJWT, async (req, res) => {
//   try {
//     const types = await prisma.typeRfc.findMany({
//       select: {
//         id_type:     true,
//         code_metier: true,
//         type:        true,
//         description: true,
//       },
//       orderBy: { type: 'asc' },
//     });
//     return R.success(res, { types, total: types.length }, 'Types RFC récupérés.');
//   } catch (err) {
//     console.error('[REF] types-rfc :', err);
//     return R.serverError(res);
//   }
// });

// router.get('/directions', authenticateJWT, async (req, res) => {
//   try {
//     const directions = await prisma.directionMetier.findMany({
//       select: {
//         id_direction:  true,
//         code_metier:   true,
//         nom_direction: true,
//       },
//       orderBy: { nom_direction: 'asc' },
//     });
//     return R.success(res, { directions, total: directions.length }, 'Directions récupérées.');
//   } catch (err) {
//     console.error('[REF] directions :', err);
//     return R.serverError(res);
//   }
// });