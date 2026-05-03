'use strict';

/**
 * ============================================================
 * ci.middleware.js — Validations & Vérifications DB
 * ============================================================
 * 1. VALIDATION BODY
 *    validateCreateCI      → nom_ci, type_ci requis
 *    validateUpdateCI      → au moins un champ valide
 *    validateEnvLink       → body.id_env requis (UUID)
 *    validateCreateEnv     → nom_env requis, code_metier auto
 *    validateUpdateEnv     → au moins un champ valide
 *
 * 2. VÉRIFICATION EXISTENCE DB
 *    checkCIExists         → req.ci
 *    checkEnvExists        → req.environnement (params.id_env)
 *    checkEnvBodyExists    → req.environnement (body.id_env)
 *    checkCIEnvNotLinked   → bloque doublon CiEnv
 *    checkCIEnvLinked      → exige que le lien existe (pour DELETE)
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

const TYPES_CI_VALIDES = ['Serveur', 'Application', 'Base de données', 'Réseau', 'Module applicatif', 'Infrastructure', 'Autre'];

// ============================================================
// 1. VALIDATION BODY
// ============================================================

/**
 * validateCreateCI
 * Requis : nom_ci (string), type_ci (string)
 * Optionnels : version_ci, description, env_ids (UUID[])
 */
const validateCreateCI = (req, res, next) => {
  const { nom_ci, type_ci } = req.body;

  if (!nom_ci || typeof nom_ci !== 'string' || !nom_ci.trim()) {
    return R.badRequest(res, 'Le champ "nom_ci" est obligatoire (string non vide).');
  }
  if (!type_ci || typeof type_ci !== 'string' || !type_ci.trim()) {
    return R.badRequest(
      res,
      `Le champ "type_ci" est obligatoire. Exemples : ${TYPES_CI_VALIDES.join(', ')}.`
    );
  }

  // Valider env_ids si fourni
  if (req.body.env_ids !== undefined) {
    if (!Array.isArray(req.body.env_ids)) {
      return R.badRequest(res, '"env_ids" doit être un tableau d\'UUIDs d\'environnements.');
    }
    for (const id of req.body.env_ids) {
      if (typeof id !== 'string') {
        return R.badRequest(res, `"env_ids" contient une valeur invalide : ${id}. Attendu : UUID string.`);
      }
    }
  }

  next();
};

/**
 * validateUpdateCI
 * Champs autorisés : nom_ci, type_ci, version_ci, description
 * Bloque env_ids → passer par les routes /environnements
 */
const validateUpdateCI = (req, res, next) => {
  const CHAMPS_AUTORISES = ['nom_ci', 'type_ci', 'version_ci', 'description'];

  if (req.body.env_ids !== undefined) {
    return R.badRequest(
      res,
      'Les liaisons environnement ne peuvent pas être modifiées via PUT. ' +
      'Utilisez POST /ci/:id/environnements ou DELETE /ci/:id/environnements/:id_env.',
      'USE_ENV_ENDPOINT'
    );
  }

  const champsPresents = CHAMPS_AUTORISES.filter(k => req.body[k] !== undefined);
  if (champsPresents.length === 0) {
    return R.badRequest(
      res,
      `Aucun champ valide. Champs acceptés : ${CHAMPS_AUTORISES.join(', ')}.`,
      'NO_VALID_FIELDS'
    );
  }

  if (req.body.nom_ci !== undefined) {
    if (typeof req.body.nom_ci !== 'string' || !req.body.nom_ci.trim()) {
      return R.badRequest(res, '"nom_ci" doit être une chaîne non vide.');
    }
  }
  if (req.body.type_ci !== undefined) {
    if (typeof req.body.type_ci !== 'string' || !req.body.type_ci.trim()) {
      return R.badRequest(res, '"type_ci" doit être une chaîne non vide.');
    }
  }

  next();
};

/**
 * validateEnvLink
 * Champ requis : body.id_env (UUID)
 */
const validateEnvLink = (req, res, next) => {
  const { id_env } = req.body;
  if (!id_env || typeof id_env !== 'string') {
    return R.badRequest(res, 'Le champ "id_env" (UUID de l\'environnement) est obligatoire.');
  }
  next();
};

/**
 * validateCreateEnv
 * Requis : nom_env (string unique)
 * Optionnel : description
 */
const validateCreateEnv = (req, res, next) => {
  const { nom_env } = req.body;
  if (!nom_env || typeof nom_env !== 'string' || !nom_env.trim()) {
    return R.badRequest(res, 'Le champ "nom_env" est obligatoire (string non vide).');
  }
  next();
};

/**
 * validateUpdateEnv
 * Au moins un champ parmi : nom_env, description
 */
const validateUpdateEnv = (req, res, next) => {
  const CHAMPS = ['nom_env', 'description'];
  const present = CHAMPS.filter(k => req.body[k] !== undefined);
  if (present.length === 0) {
    return R.badRequest(res, `Aucun champ valide. Champs acceptés : ${CHAMPS.join(', ')}.`, 'NO_VALID_FIELDS');
  }
  if (req.body.nom_env !== undefined) {
    if (typeof req.body.nom_env !== 'string' || !req.body.nom_env.trim()) {
      return R.badRequest(res, '"nom_env" doit être une chaîne non vide.');
    }
  }
  next();
};

// ============================================================
// 2. VÉRIFICATION EXISTENCE DB
// ============================================================

/**
 * checkCIExists
 * Charge le CI par id_ci (params.id).
 * Injecte req.ci avec ses environnements.
 */
const checkCIExists = async (req, res, next) => {
  try {
    const id_ci = req.params.id || req.params.id_ci;
    const ci = await prisma.configurationItem.findUnique({
      where: { id_ci },
      select: {
        id_ci:       true,
        code_metier: true,
        nom_ci:      true,
        type_ci:     true,
        version_ci:  true,
        description: true,
        ciEnvs: {
          select: {
            environnement: {
              select: { id_env: true, code_metier: true, nom_env: true, description: true },
            },
          },
        },
      },
    });

    if (!ci) return R.notFound(res, `Configuration Item introuvable : ${id_ci}`);
    req.ci = ci;
    next();
  } catch (err) {
    console.error('[checkCIExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkEnvExists
 * Charge l'environnement par params.id_env.
 * Injecte req.environnement.
 */
const checkEnvExists = async (req, res, next) => {
  try {
    const { id_env } = req.params;
    const env = await prisma.environnement.findUnique({
      where:  { id_env },
      select: { id_env: true, code_metier: true, nom_env: true, description: true },
    });

    if (!env) return R.notFound(res, `Environnement introuvable : ${id_env}`);
    req.environnement = env;
    next();
  } catch (err) {
    console.error('[checkEnvExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkEnvBodyExists
 * Charge l'environnement par body.id_env.
 * Injecte req.environnement.
 * À placer APRÈS validateEnvLink.
 */
const checkEnvBodyExists = async (req, res, next) => {
  try {
    const { id_env } = req.body;
    const env = await prisma.environnement.findUnique({
      where:  { id_env },
      select: { id_env: true, code_metier: true, nom_env: true, description: true },
    });

    if (!env) return R.notFound(res, `Environnement introuvable : ${id_env}`);
    req.environnement = env;
    next();
  } catch (err) {
    console.error('[checkEnvBodyExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkCIEnvNotLinked
 * Vérifie que le lien CI ↔ Env N'EXISTE PAS encore (évite doublon).
 * Doit être placé APRÈS checkCIExists et checkEnvBodyExists.
 */
const checkCIEnvNotLinked = async (req, res, next) => {
  try {
    const id_ci  = req.ci.id_ci;
    const id_env = req.environnement.id_env;

    const lien = await prisma.ciEnv.findUnique({
      where: { id_ci_id_env: { id_ci, id_env } },
    });

    if (lien) {
      return R.error(
        res,
        `Ce CI est déjà lié à l'environnement "${req.environnement.nom_env}".`,
        409,
        'CI_ENV_ALREADY_LINKED'
      );
    }

    next();
  } catch (err) {
    console.error('[checkCIEnvNotLinked]', err);
    return R.serverError(res);
  }
};

/**
 * checkCIEnvLinked
 * Vérifie que le lien CI ↔ Env EXISTE (pour le DELETE).
 * Doit être placé APRÈS checkCIExists et checkEnvExists.
 */
const checkCIEnvLinked = async (req, res, next) => {
  try {
    const id_ci  = req.ci.id_ci;
    const id_env = req.params.id_env;

    const lien = await prisma.ciEnv.findUnique({
      where: { id_ci_id_env: { id_ci, id_env } },
    });

    if (!lien) {
      return R.notFound(res, `Ce CI n'est pas lié à cet environnement.`);
    }

    next();
  } catch (err) {
    console.error('[checkCIEnvLinked]', err);
    return R.serverError(res);
  }
};

module.exports = {
  // Validation body
  validateCreateCI,
  validateUpdateCI,
  validateEnvLink,
  validateCreateEnv,
  validateUpdateEnv,
  // Vérification DB
  checkCIExists,
  checkEnvExists,
  checkEnvBodyExists,
  checkCIEnvNotLinked,
  checkCIEnvLinked,
};