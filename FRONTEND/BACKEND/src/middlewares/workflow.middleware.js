'use strict';

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

const STATUTS_BLOQUES = ['APPROUVEE', 'CLOTUREE', 'REJETEE'];

/**
 * Vérifie que la RFC existe et que son statut autorise l'escalade.
 * Injecte req.rfc si OK.
 */
async function checkEscaladeStatut(req, res, next) {
  const { id_rfc } = req.params;

  const rfc = await prisma.rfc.findUnique({
    where:   { id_rfc },
    include: { statut: true, demandeur: true, typeRfc: true },
  });

  if (!rfc) return R.notFound(res, 'RFC introuvable.');

  if (STATUTS_BLOQUES.includes(rfc.statut.code_statut)) {
    return R.badRequest(
      res,
      `Impossible d'escalader une RFC au statut "${rfc.statut.code_statut}". ` +
      `L'escalade est possible uniquement sur les RFC en cours d'évaluation.`,
      'ESCALADE_NOT_ALLOWED'
    );
  }

  req.rfc = rfc;
  return next();
}

/**
 * Vérifie que le demandeur est propriétaire de la RFC
 * ou possède le rôle CHANGE_MANAGER / ADMIN.
 * Doit être appelé après checkEscaladeStatut (req.rfc doit exister).
 */
function checkEscaladePermission(req, res, next) {
  const isOwner   = req.rfc.id_user === req.user.id_user;
  const isManager = req.user.roles?.some(r => ['CHANGE_MANAGER', 'ADMIN'].includes(r));

  if (!isOwner && !isManager) {
    return R.forbidden(res, 'Seul le demandeur ou un Change Manager peut déclencher une escalade.');
  }

  return next();
}

module.exports = { checkEscaladeStatut, checkEscaladePermission };