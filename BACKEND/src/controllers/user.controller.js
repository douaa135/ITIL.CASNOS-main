'use strict';

/**
 * ============================================================
 * user.controller.js — Contrôleur CRUD Utilisateur
 * ============================================================
 * Toutes les émissions WebSocket passent par socket.service.
 * Plus de req.app.get('io').
 * ============================================================
 */

const userService = require('../services/user.service');
const socketSvc   = require('../services/socket.service');
const R           = require('../utils/response.utils');

// ─── POST /api/users ──────────────────────────────────────────
const createUser = async (req, res) => {
  try {
    const { nom_user, prenom_user, email_user, mot_passe, date_naissance, nom_role } = req.body;

    if (!nom_user || !prenom_user || !email_user || !mot_passe || !date_naissance || !nom_role) {
      return R.badRequest(res, 'Champs obligatoires manquants : nom_user, prenom_user, email_user, mot_passe, date_naissance, nom_role.');
    }

    const user = await userService.createUser(req.body, req.user.id_user);
    return R.success(res, { user }, 'Utilisateur créé avec succès.', 201);

  } catch (err) {
    if (err.code === 'EMAIL_CONFLICT') return R.error(res, err.message, 409, err.code);
    if (err.code === 'INVALID_ROLE')   return R.badRequest(res, err.message, err.code);
    console.error('[createUser]', err);
    return R.serverError(res);
  }
};

// ─── GET /api/users ───────────────────────────────────────────
const getAllUsers = async (req, res) => {
  try {
    const { page, limit, actif, nom_role, search } = req.query;
    const result = await userService.getAllUsers({ page, limit, actif, nom_role, search });
    return R.success(res, result, 'Utilisateurs récupérés avec succès.');
  } catch (err) {
    console.error('[getAllUsers]', err);
    return R.serverError(res);
  }
};

// ─── GET /api/users/:id ───────────────────────────────────────
const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    return R.success(res, { user }, 'Utilisateur récupéré avec succès.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[getUserById]', err);
    return R.serverError(res);
  }
};

// ─── PUT /api/users/:id ───────────────────────────────────────
const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body, req.user.id_user);
    return R.success(res, { user }, 'Utilisateur mis à jour avec succès.');
  } catch (err) {
    if (err.code === 'NOT_FOUND')       return R.notFound(res, err.message);
    if (err.code === 'NO_VALID_FIELDS') return R.badRequest(res, err.message, err.code);
    console.error('[updateUser]', err);
    return R.serverError(res);
  }
};

// ─── PATCH /api/users/:id/actif ───────────────────────────────
/**
 * Active ou désactive un compte.
 * Émet user:desactive via WebSocket directement dans la room user_{id}
 * → le client déconnecte immédiatement si son compte est désactivé.
 */
const toggleActif = async (req, res) => {
  try {
    const { actif } = req.body;

    if (actif === undefined || actif === null) {
      return R.badRequest(res, 'Le champ "actif" (boolean) est requis.');
    }

    const user = await userService.toggleActif(req.params.id, actif, req.user.id_user);

    socketSvc.emitUserActifChange(req.params.id, user.actif);

    const label = user.actif ? 'activé' : 'désactivé';
    return R.success(res, { user }, `Compte utilisateur ${label} avec succès.`);

  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[toggleActif]', err);
    return R.serverError(res);
  }
};

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleActif,
};