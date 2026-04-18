'use strict';

/**
 * ============================================================
 * cab.middleware.js — Validations & Vérifications CAB
 * ============================================================
 * 1. VALIDATION BODY
 *    validateCreateCab         → nom_cab, type_cab
 *    validateCreateReunion     → date_reunion, id_cab
 *    validateUpdateReunion     → au moins un champ éditable
 *    validateAddMembre         → id_user, role?
 *    validateAddRfcToAgenda    → id_rfc
 *    validateVote              → valeur_vote
 *    validateDecision          → decision, motif?
 *
 * 2. VÉRIFICATION EXISTENCE (injecte dans req)
 *    checkCabExists            → req.cab
 *    checkReunionExists        → req.reunion
 *    checkRfcExists            → req.rfc
 *    checkMembreExists         → req.membre (membre du CAB)
 *    checkUserExists           → req.targetUser
 *    checkRfcOnAgenda          → vérifie que la RFC est bien inscrite à la réunion
 *    checkDejaVote             → bloque le double vote (unique constraint)
 *    checkDejaDecision         → bloque la double décision (unique constraint)
 *    checkUserIsCabMembre      → vérifie que body.id_user est membre du CAB de la réunion
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

const TYPES_CAB_VALIDES     = ['STANDARD', 'NORMAL', 'URGENT'];
const VALEURS_VOTE_VALIDES  = ['APPROUVER', 'REJETER', 'ABSTENTION'];
const DECISIONS_VALIDES     = ['APPROUVER', 'REJETER', 'REPORTER'];
const ROLES_MEMBRE_VALIDES  = ['PRESIDENT', 'MEMBRE'];

// ============================================================
// 1. VALIDATION BODY
// ============================================================

/**
 * validateCreateCab
 * Champs requis : type_cab (enum TypeCab)
 * Champs optionnels : date_creation
 */
const validateCreateCab = (req, res, next) => {
  const { type_cab } = req.body;

  if (!type_cab) {
    return R.badRequest(res, `Le champ "type_cab" est obligatoire. Valeurs : ${TYPES_CAB_VALIDES.join(', ')}.`);
  }
  if (!TYPES_CAB_VALIDES.includes(type_cab)) {
    return R.badRequest(
      res,
      `Type de CAB invalide : "${type_cab}". Valeurs acceptées : ${TYPES_CAB_VALIDES.join(', ')}.`,
      'INVALID_TYPE_CAB'
    );
  }

  next();
};

/**
 * validateCreateReunion
 * Champs requis : date_reunion (YYYY-MM-DD)
 * Champs optionnels : heure_debut, heure_fin, ordre_jour
 */
const validateCreateReunion = (req, res, next) => {
  const { date_reunion } = req.body;

  if (!date_reunion) {
    return R.badRequest(res, 'Le champ "date_reunion" est obligatoire (format YYYY-MM-DD).');
  }

  const date = new Date(date_reunion);
  if (isNaN(date.getTime())) {
    return R.badRequest(res, '"date_reunion" n\'est pas une date valide (format attendu : YYYY-MM-DD).');
  }

  // Vérifier cohérence heure_debut / heure_fin si les deux sont fournis
  if (req.body.heure_debut && req.body.heure_fin) {
    if (req.body.heure_debut >= req.body.heure_fin) {
      return R.badRequest(res, '"heure_debut" doit être antérieure à "heure_fin".');
    }
  }

  next();
};

/**
 * validateUpdateReunion
 * Au moins un champ éditable doit être présent.
 * Champs autorisés : date_reunion, heure_debut, heure_fin, ordre_jour
 */
const validateUpdateReunion = (req, res, next) => {
  const CHAMPS_AUTORISES = ['date_reunion', 'heure_debut', 'heure_fin', 'ordre_jour'];
  const champsPresents   = CHAMPS_AUTORISES.filter(k => req.body[k] !== undefined);

  if (champsPresents.length === 0) {
    return R.badRequest(
      res,
      `Aucun champ valide. Champs acceptés : ${CHAMPS_AUTORISES.join(', ')}.`,
      'NO_VALID_FIELDS'
    );
  }

  if (req.body.date_reunion) {
    const date = new Date(req.body.date_reunion);
    if (isNaN(date.getTime())) {
      return R.badRequest(res, '"date_reunion" n\'est pas une date valide.');
    }
  }

  if (req.body.heure_debut && req.body.heure_fin) {
    if (req.body.heure_debut >= req.body.heure_fin) {
      return R.badRequest(res, '"heure_debut" doit être antérieure à "heure_fin".');
    }
  }

  next();
};

/**
 * validateAddMembre
 * Champs requis : id_user
 * Champs optionnels : role (PRESIDENT | MEMBRE), date_adhesion
 */
const validateAddMembre = (req, res, next) => {
  const { id_user, role } = req.body;

  if (!id_user || typeof id_user !== 'string') {
    return R.badRequest(res, 'Le champ "id_user" (UUID) est obligatoire.');
  }

  if (role !== undefined && !ROLES_MEMBRE_VALIDES.includes(role)) {
    return R.badRequest(
      res,
      `Rôle CAB invalide : "${role}". Valeurs acceptées : ${ROLES_MEMBRE_VALIDES.join(', ')}.`,
      'INVALID_ROLE_MEMBRE'
    );
  }

  next();
};

/**
 * validateAddRfcToAgenda
 * Champs requis : id_rfc
 */
const validateAddRfcToAgenda = (req, res, next) => {
  const { id_rfc } = req.body;

  if (!id_rfc || typeof id_rfc !== 'string') {
    return R.badRequest(res, 'Le champ "id_rfc" (UUID) est obligatoire.');
  }

  next();
};

/**
 * validateVote
 * Champs requis : valeur_vote (enum ValeurVote), id_user (votant)
 */
const validateVote = (req, res, next) => {
  const { valeur_vote, id_user } = req.body;

  if (!id_user || typeof id_user !== 'string') {
    return R.badRequest(res, 'Le champ "id_user" (UUID du votant) est obligatoire.');
  }

  if (!valeur_vote) {
    return R.badRequest(
      res,
      `Le champ "valeur_vote" est obligatoire. Valeurs : ${VALEURS_VOTE_VALIDES.join(', ')}.`
    );
  }

  if (!VALEURS_VOTE_VALIDES.includes(valeur_vote)) {
    return R.badRequest(
      res,
      `Valeur de vote invalide : "${valeur_vote}". Valeurs acceptées : ${VALEURS_VOTE_VALIDES.join(', ')}.`,
      'INVALID_VOTE'
    );
  }

  next();
};

/**
 * validateDecision
 * Champs requis : decision (enum TypeDecision)
 * Champs optionnels : motif
 */
const validateDecision = (req, res, next) => {
  const { decision } = req.body;

  if (!decision) {
    return R.badRequest(
      res,
      `Le champ "decision" est obligatoire. Valeurs : ${DECISIONS_VALIDES.join(', ')}.`
    );
  }

  if (!DECISIONS_VALIDES.includes(decision)) {
    return R.badRequest(
      res,
      `Décision invalide : "${decision}". Valeurs acceptées : ${DECISIONS_VALIDES.join(', ')}.`,
      'INVALID_DECISION'
    );
  }

  next();
};


// ============================================================
// 2. VÉRIFICATION EXISTENCE DB
// ============================================================

/**
 * checkCabExists
 * Injecte req.cab
 */
const checkCabExists = async (req, res, next) => {
  try {
    const { id_cab } = req.params;
    const cab = await prisma.cab.findUnique({
      where:  { id_cab },
      select: { id_cab: true, code_metier: true, type_cab: true, date_creation: true },
    });

    if (!cab) return R.notFound(res, `CAB introuvable : ${id_cab}`);

    req.cab = cab;
    next();
  } catch (err) {
    console.error('[checkCabExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkReunionExists
 * Injecte req.reunion (avec id_cab pour relier au CAB parent)
 */
const checkReunionExists = async (req, res, next) => {
  try {
    const { id_reunion } = req.params;
    const reunion = await prisma.reunionCab.findUnique({
      where:  { id_reunion },
      select: {
        id_reunion:   true,
        code_metier:  true,
        date_reunion: true,
        heure_debut:  true,
        heure_fin:    true,
        ordre_jour:   true,
        id_cab:       true,
      },
    });

    if (!reunion) return R.notFound(res, 'Réunion CAB introuvable.');

    req.reunion = reunion;
    next();
  } catch (err) {
    console.error('[checkReunionExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkRfcExists
 * Vérifie que la RFC (depuis req.params.id_rfc OU req.body.id_rfc) existe.
 * Injecte req.rfc
 */
const checkRfcExists = async (req, res, next) => {
  try {
    const id_rfc = req.params.id_rfc || req.body.id_rfc;

    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: {
        id_rfc:    true,
        code_rfc:  true,
        titre_rfc: true,
        id_statut: true,
      },
    });

    if (!rfc) return R.notFound(res, `RFC introuvable : ${id_rfc}`);

    req.rfc = rfc;
    next();
  } catch (err) {
    console.error('[checkRfcExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkRfcOnAgenda
 * Vérifie que la RFC est bien inscrite à l'ordre du jour de la réunion.
 * Doit être placé APRÈS checkReunionExists et checkRfcExists.
 */
const checkRfcOnAgenda = async (req, res, next) => {
  try {
    const id_reunion = req.reunion?.id_reunion || req.params.id_reunion;
    const id_rfc     = req.rfc?.id_rfc         || req.params.id_rfc;

    const lien = await prisma.rfcReunion.findUnique({
      where: { id_rfc_id_reunion: { id_rfc, id_reunion } },
    });

    if (!lien) {
      return R.badRequest(
        res,
        'Cette RFC n\'est pas inscrite à l\'ordre du jour de cette réunion. Ajoutez-la d\'abord via POST /reunions/:id/rfcs.',
        'RFC_NOT_ON_AGENDA'
      );
    }

    next();
  } catch (err) {
    console.error('[checkRfcOnAgenda]', err);
    return R.serverError(res);
  }
};

/**
 * checkUserExists
 * Vérifie que body.id_user (ou params.id_user) existe et est actif.
 * Injecte req.targetUser
 */
const checkUserExists = async (req, res, next) => {
  try {
    const id_user = req.params.id_user || req.body.id_user;

    const user = await prisma.utilisateur.findUnique({
      where:  { id_user },
      select: { id_user: true, nom_user: true, prenom_user: true, actif: true },
    });

    if (!user) return R.notFound(res, `Utilisateur introuvable : ${id_user}`);
    if (!user.actif) {
      return R.badRequest(
        res,
        `Le compte de ${user.prenom_user} ${user.nom_user} est désactivé.`,
        'USER_INACTIVE'
      );
    }

    req.targetUser = user;
    next();
  } catch (err) {
    console.error('[checkUserExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkUserIsCabMembre
 * Vérifie que body.id_user est membre du CAB auquel appartient la réunion.
 * Doit être placé APRÈS checkReunionExists et checkUserExists.
 * Utilisé avant castVote pour garantir que seul un membre CAB peut voter.
 */
const checkUserIsCabMembre = async (req, res, next) => {
  try {
    const id_cab  = req.reunion.id_cab;
    const id_user = req.body.id_user;

    const membre = await prisma.membreCab.findUnique({
      where: { id_cab_id_user: { id_cab, id_user } },
    });

    if (!membre) {
      return R.forbidden(
        res,
        'Cet utilisateur n\'est pas membre de ce CAB et ne peut pas voter.'
      );
    }

    req.membreCab = membre;
    next();
  } catch (err) {
    console.error('[checkUserIsCabMembre]', err);
    return R.serverError(res);
  }
};

/**
 * checkDejaVote
 * Bloque le double vote : un membre ne peut voter qu'une fois par RFC par réunion.
 * Doit être placé APRÈS checkReunionExists, checkRfcExists, checkUserExists.
 */
const checkDejaVote = async (req, res, next) => {
  try {
    const id_reunion = req.reunion.id_reunion;
    const id_rfc     = req.rfc.id_rfc;
    const id_user    = req.body.id_user;

    const voteExistant = await prisma.voteCab.findUnique({
      where: { id_reunion_id_user_id_rfc: { id_reunion, id_user, id_rfc } },
    });

    if (voteExistant) {
      return R.error(
        res,
        'Cet utilisateur a déjà voté sur cette RFC lors de cette réunion.',
        409,
        'ALREADY_VOTED'
      );
    }

    next();
  } catch (err) {
    console.error('[checkDejaVote]', err);
    return R.serverError(res);
  }
};

/**
 * checkDejaDecision
 * Bloque la double décision : une seule décision par RFC par réunion.
 * Doit être placé APRÈS checkReunionExists et checkRfcExists.
 */
const checkDejaDecision = async (req, res, next) => {
  try {
    const id_reunion = req.reunion.id_reunion;
    const id_rfc     = req.rfc.id_rfc;

    const decisionExistante = await prisma.decisionCab.findUnique({
      where: { id_reunion_id_rfc: { id_reunion, id_rfc } },
    });

    if (decisionExistante) {
      return R.error(
        res,
        'Une décision a déjà été enregistrée pour cette RFC lors de cette réunion.',
        409,
        'DECISION_ALREADY_EXISTS'
      );
    }

    next();
  } catch (err) {
    console.error('[checkDejaDecision]', err);
    return R.serverError(res);
  }
};


module.exports = {
  // Validation body
  validateCreateCab,
  validateCreateReunion,
  validateUpdateReunion,
  validateAddMembre,
  validateAddRfcToAgenda,
  validateVote,
  validateDecision,
  // Vérification existence DB
  checkCabExists,
  checkReunionExists,
  checkRfcExists,
  checkRfcOnAgenda,
  checkUserExists,
  checkUserIsCabMembre,
  checkDejaVote,
  checkDejaDecision,
};