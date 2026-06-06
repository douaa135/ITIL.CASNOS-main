'use strict';

// ============================================================
// changement_extras.middleware.js
// ============================================================

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

const RESULTATS_TEST = ['REUSSI', 'ECHOUE', 'EN_ATTENTE'];

/** checkChangementParentExists — injecte req.changement */
const checkChangementParentExists = async (req, res, next) => {
  try {
    const id_changement = req.params.id_changement || req.params.id;
    const chg = await prisma.changement.findUnique({
      where:  { id_changement },
      select: {
        id_changement:   true,
        code_changement: true,
        pir:             { select: { id_pir: true } },
        statut:          { select: { code_statut: true } },
      },
    });
    if (!chg) return R.notFound(res, `Changement introuvable : ${id_changement}`);
    req.changement = chg;
    next();
  } catch (err) {
    console.error('[checkChangementParentExists]', err);
    return R.serverError(res);
  }
};

/** validateCreatePir — date_pir, conformite_objectifs, conformite_delais requis */
const validateCreatePir = (req, res, next) => {
  const { conformite_objectifs, conformite_delais } = req.body;
  if (conformite_objectifs === undefined || conformite_delais === undefined) {
    return R.badRequest(res, '"conformite_objectifs" et "conformite_delais" (boolean) sont obligatoires.');
  }
  if (typeof conformite_objectifs !== 'boolean' || typeof conformite_delais !== 'boolean') {
    return R.badRequest(res, '"conformite_objectifs" et "conformite_delais" doivent être des booléens.');
  }
  next();
};

/** validateUpdatePir — au moins un champ valide */
const validateUpdatePir = (req, res, next) => {
  const CHAMPS = ['date_pir', 'description', 'conformite_objectifs', 'conformite_delais'];
  const present = CHAMPS.filter(k => req.body[k] !== undefined);
  if (present.length === 0) {
    return R.badRequest(res, `Aucun champ valide. Acceptés : ${CHAMPS.join(', ')}.`, 'NO_VALID_FIELDS');
  }
  next();
};

/** validateCreateTest */
const validateCreateTest = (req, res, next) => {
  const { critere_test, resultat } = req.body;
  if (resultat !== undefined && !RESULTATS_TEST.includes(resultat)) {
    return R.badRequest(res, `"resultat" invalide. Valeurs : ${RESULTATS_TEST.join(', ')}.`);
  }
  if (!critere_test || typeof critere_test !== 'string' || !critere_test.trim()) {
    return R.badRequest(res, '"critere_test" est obligatoire.');
  }
  next();
};

/** validateUpdateTest */
const validateUpdateTest = (req, res, next) => {
  const CHAMPS = ['date_test', 'critere_test', 'resultat', 'contexte'];
  const present = CHAMPS.filter(k => req.body[k] !== undefined);
  if (present.length === 0) {
    return R.badRequest(res, `Aucun champ valide. Acceptés : ${CHAMPS.join(', ')}.`, 'NO_VALID_FIELDS');
  }
  if (req.body.resultat && !RESULTATS_TEST.includes(req.body.resultat)) {
    return R.badRequest(res, `"resultat" invalide. Valeurs : ${RESULTATS_TEST.join(', ')}.`);
  }
  next();
};

/** checkTestExists — injecte req.test */
const checkTestExists = async (req, res, next) => {
  try {
    const { id_test } = req.params;
    const test = await prisma.test.findUnique({
      where: { id_test },
      select: {
        id_test:       true,
        code_metier:   true,
        date_test:     true,
        critere_test:  true,
        resultat:      true,
        contexte:      true,
        id_changement: true,
      },
    });
    if (!test) return R.notFound(res, 'Test introuvable.');
    req.test = test;
    next();
  } catch (err) {
    console.error('[checkTestExists]', err);
    return R.serverError(res);
  }
};

module.exports = {
  checkChangementParentExists,
  validateCreatePir,
  validateUpdatePir,
  validateCreateTest,
  validateUpdateTest,
  checkTestExists,
};