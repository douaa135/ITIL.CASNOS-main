'use strict';

const express = require('express');
const router  = express.Router();

const { authenticateJWT }                        = require('../middlewares/auth.middleware');
const { checkEscaladeStatut, checkEscaladePermission } = require('../middlewares/workflow.middleware');
const ctrl                                       = require('../controllers/workflow.controller');

router.post(
  '/rfcs/:id_rfc/escalade',
  authenticateJWT,
  checkEscaladeStatut,
  checkEscaladePermission,
  ctrl.escaladeRfc
);

router.get(
  '/transitions/rfc',        
  authenticateJWT, 
  ctrl.getTransitionsRfc
);
router.get(
  '/transitions/changement', 
  authenticateJWT, 
  ctrl.getTransitionsChangement
);
router.get(
  '/transitions/tache',      
  authenticateJWT, 
  ctrl.getTransitionsTache
);

module.exports = router;