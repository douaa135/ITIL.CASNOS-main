'use strict';

const directionSvc = require('../services/direction.service');
const R            = require('../utils/response.utils');

// GET /api/directions
async function getDirections(req, res) {
  try {
    const directions = await directionSvc.getDirections();
    return R.success(res, { directions, total: directions.length }, 'Directions récupérées.');
  } catch (err) {
    console.error('[DIR] getDirections :', err);
    return R.serverError(res);
  }
}

// GET /api/directions/:id_direction
async function getDirectionById(req, res) {
  try {
    const direction = await directionSvc.getDirectionById(req.params.id_direction);
    return R.success(res, { direction }, 'Direction récupérée.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[DIR] getDirectionById :', err);
    return R.serverError(res);
  }
}

// POST /api/directions
async function createDirection(req, res) {
  try {
    const direction = await directionSvc.createDirection(req.body);
    return R.success(res, { direction }, 'Direction créée avec succès.', 201);
  } catch (err) {
    if (err.code === 'VALIDATION_ERROR') return R.badRequest(res, err.message);
    if (err.code === 'CONFLICT')         return R.error(res, err.message, 409, 'CONFLICT');
    console.error('[DIR] createDirection :', err);
    return R.serverError(res);
  }
}

// PUT /api/directions/:id_direction
async function updateDirection(req, res) {
  try {
    const direction = await directionSvc.updateDirection(req.params.id_direction, req.body);
    return R.success(res, { direction }, 'Direction mise à jour.');
  } catch (err) {
    if (err.code === 'NOT_FOUND')        return R.notFound(res, err.message);
    if (err.code === 'VALIDATION_ERROR') return R.badRequest(res, err.message);
    if (err.code === 'CONFLICT')         return R.error(res, err.message, 409, 'CONFLICT');
    console.error('[DIR] updateDirection :', err);
    return R.serverError(res);
  }
}

// DELETE /api/directions/:id_direction
async function deleteDirection(req, res) {
  try {
    const result = await directionSvc.deleteDirection(req.params.id_direction);
    return R.success(res, result, 'Direction supprimée.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    if (err.code === 'CONFLICT')  return R.error(res, err.message, 409, 'CONFLICT');
    console.error('[DIR] deleteDirection :', err);
    return R.serverError(res);
  }
}

module.exports = {
  getDirections,
  getDirectionById,
  createDirection,
  updateDirection,
  deleteDirection,
};