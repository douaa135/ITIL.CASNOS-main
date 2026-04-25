'use strict';

/**
 * ============================================================
 * user.controller.js — Contrôleur CRUD Utilisateur
 * ============================================================
 * Routes attendues (déclarées dans user.routes.js) :
 *   POST   /api/users              → createUser
 *   GET    /api/users              → getAllUsers
 *   GET    /api/users/:id          → getUserById
 *   PUT    /api/users/:id          → updateUser
 *   PATCH  /api/users/:id/actif    → toggleActif
 * ============================================================
 */

const userService = require('../services/user.service');
const R           = require('../utils/response.utils'); 

// ─── POST /api/users ──────────────────────────────────────────────────────────
/**
 * Crée un nouvel utilisateur.
 * Body attendu :
 *   { nom_user, prenom_user, email_user, mot_passe, nom_role,
 *     id_direction?, phone?, date_naissance? }
 */
const createUser = async (req, res) => {
  try {
    const { nom_user, prenom_user, email_user, mot_passe, date_naissance, nom_role } = req.body;

    // Validation minimale
    if (!nom_user || !prenom_user || !email_user || !mot_passe || !date_naissance ||!nom_role) {
      return R.badRequest(res, 'Champs obligatoires manquants : nom_user, prenom_user, email_user, mot_passe, date_naissance, nom_role.');
    }

    const user = await userService.createUser(req.body);
    return R.success(res, { user }, 'Utilisateur créé avec succès.', 201);

  } catch (err) {
    if (err.code === 'EMAIL_CONFLICT') return R.error(res, err.message, 409, err.code);
    if (err.code === 'INVALID_ROLE')   return R.badRequest(res, err.message, err.code);
    console.error('[createUser]', err);
    return R.serverError(res);
  }
};

// ─── GET /api/users ───────────────────────────────────────────────────────────
/**
 * Retourne la liste paginée des utilisateurs.
 * Query params optionnels : page, limit, actif, nom_role, search
 */
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

// ─── GET /api/users/:id ───────────────────────────────────────────────────────
/**
 * Retourne un utilisateur par son UUID.
 */
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

// ─── PUT /api/users/:id ───────────────────────────────────────────────────────
/**
 * Met à jour les champs éditables d'un utilisateur.
 * Champs acceptés : nom_user, prenom_user, phone, date_naissance,
 *                   id_direction, mot_passe
 * L'email n'est pas modifiable via cet endpoint.
 */
const updateUser = async (req, res) => {
  try {
    const user = await userService.updateUser(req.params.id, req.body);
    return R.success(res, { user }, 'Utilisateur mis à jour avec succès.');
  } catch (err) {
    if (err.code === 'NOT_FOUND')       return R.notFound(res, err.message);
    if (err.code === 'NO_VALID_FIELDS') return R.badRequest(res, err.message, err.code);
    console.error('[updateUser]', err);
    return R.serverError(res);
  }
};

// ─── PATCH /api/users/:id/actif ───────────────────────────────────────────────
/**
 * Active ou désactive un compte utilisateur.
 * Body attendu : { actif: true | false }
 */
const toggleActif = async (req, res) => {
  try {
    const { actif } = req.body;

    if (actif === undefined || actif === null) {
      return R.badRequest(res, 'Le champ "actif" (boolean) est requis.');
    }

    const user = await userService.toggleActif(req.params.id, actif);
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