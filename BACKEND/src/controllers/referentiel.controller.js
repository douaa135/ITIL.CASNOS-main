'use strict';

const referentielSvc = require('../services/referentiel.service');
const R              = require('../utils/response.utils');

async function getStatuts(req, res) {
  try {
    const { contexte } = req.query;
    const statuts = await referentielSvc.getStatuts(contexte);
    return R.success(res, { statuts, total: statuts.length }, 'Statuts récupérés.');
  } catch (err) {
    console.error('[REF] statuts :', err);
    return R.serverError(res);
  }
}

async function getPriorites(req, res) {
  try {
    const priorites = await referentielSvc.getPriorites();
    return R.success(res, { priorites, total: priorites.length }, 'Priorités récupérées.');
  } catch (err) {
    console.error('[REF] priorites :', err);
    return R.serverError(res);
  }
}

async function getTypesRfc(req, res) {
  try {
    const types = await referentielSvc.getTypesRfc();
    return R.success(res, { types, total: types.length }, 'Types RFC récupérés.');
  } catch (err) {
    console.error('[REF] types-rfc :', err);
    return R.serverError(res);
  }
}

async function getDirections(req, res) {
  try {
    const directions = await referentielSvc.getDirections();
    return R.success(res, { directions, total: directions.length }, 'Directions récupérées.');
  } catch (err) {
    console.error('[REF] directions :', err);
    return R.serverError(res);
  }
}

module.exports = { 
  getStatuts, 
  getPriorites, 
  getTypesRfc, 
  getDirections 
};