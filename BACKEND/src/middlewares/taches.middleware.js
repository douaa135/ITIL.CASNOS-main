'use strict';

/**
 * ============================================================
 * tache.middleware.js — Validations & Vérifications Tâches
 * ============================================================
 * ⚠️  CHANGEMENT SCHÉMA : Tache.statut_tache (enum) remplacé par
 *     Tache.id_statut (FK → Statut avec contexte: TACHE).
 *     Les transitions sont validées via statut.code_statut.
 *
 * 1. VALIDATION BODY
 *    validateCreateTache       → titre_tache, id_user, ordre_tache, id_statut?
 *    validateUpdateTache       → au moins un champ valide (statut exclu)
 *    validateStatutTache       → id_statut valide + transition autorisée
 *    validateJournal           → description obligatoire
 *
 * 2. VÉRIFICATION EXISTENCE DB
 *    checkChangementExists     → req.changement
 *    checkTacheExists          → req.tache (avec statut.code_statut)
 *    checkJournalExists        → req.journal
 *    checkImplementeurValid    → req.implementeur
 *    checkStatutTacheExists    → req.nouveauStatut (depuis body.id_statut)
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

// ─── Machine à états — transitions autorisées ─────────────────────────────────
// Clé = code_statut actuel, valeur = liste des code_statut cibles autorisés
// (contexte TACHE dans la table Statut)
const TRANSITIONS_AUTORISEES = {
  EN_ATTENTE: ['EN_COURS', 'ANNULEE'],
  EN_COURS:   ['TERMINEE', 'ANNULEE'],
  TERMINEE:   [],   // état final
  ANNULEE:    [],   // état final
};

const CODES_STATUT_TACHE_VALIDES = Object.keys(TRANSITIONS_AUTORISEES);

// ============================================================
// 1. VALIDATION BODY
// ============================================================

/**
 * validateCreateTache
 * Champs requis : titre_tache (string), id_user (UUID), ordre_tache (int > 0)
 * Champs optionnels : description, duree (int > 0)
 * Note : id_statut n'est PAS requis à la création — le service initialise EN_ATTENTE.
 */
const validateCreateTache = (req, res, next) => {
  const { titre_tache, id_user, ordre_tache, duree } = req.body;

  if (!titre_tache || typeof titre_tache !== 'string' || !titre_tache.trim()) {
    return R.badRequest(res, 'Le champ "titre_tache" est obligatoire (string non vide).');
  }
  if (!id_user || typeof id_user !== 'string') {
    return R.badRequest(res, 'Le champ "id_user" (UUID implémenteur) est obligatoire.');
  }
  if (ordre_tache === undefined || ordre_tache === null) {
    return R.badRequest(res, 'Le champ "ordre_tache" est obligatoire (entier > 0).');
  }
  const ordre = Number(ordre_tache);
  if (!Number.isInteger(ordre) || ordre < 1) {
    return R.badRequest(res, '"ordre_tache" doit être un entier supérieur à 0.');
  }
  if (duree !== undefined && duree !== null) {
    const d = Number(duree);
    if (!Number.isInteger(d) || d < 1) {
      return R.badRequest(res, '"duree" doit être un entier supérieur à 0 (en heures).');
    }
  }

  next();
};

/**
 * validateUpdateTache
 * Champs autorisés : titre_tache, description, ordre_tache, duree, id_user
 * Bloque id_statut dans PUT → doit passer par PATCH /statut
 */
const validateUpdateTache = (req, res, next) => {
  const CHAMPS_AUTORISES = ['titre_tache', 'description', 'ordre_tache', 'duree', 'id_user'];

  if (req.body.id_statut !== undefined) {
    return R.badRequest(
      res,
      'Le statut ne peut pas être modifié via PUT. Utilisez PATCH /taches/:id/statut.',
      'USE_STATUT_ENDPOINT'
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

  if (req.body.ordre_tache !== undefined) {
    const o = Number(req.body.ordre_tache);
    if (!Number.isInteger(o) || o < 1) return R.badRequest(res, '"ordre_tache" doit être un entier > 0.');
  }
  if (req.body.duree !== undefined && req.body.duree !== null) {
    const d = Number(req.body.duree);
    if (!Number.isInteger(d) || d < 1) return R.badRequest(res, '"duree" doit être un entier > 0.');
  }
  if (req.body.titre_tache !== undefined) {
    if (typeof req.body.titre_tache !== 'string' || !req.body.titre_tache.trim()) {
      return R.badRequest(res, '"titre_tache" doit être une chaîne non vide.');
    }
  }

  next();
};

/**
 * validateStatutTache
 * Vérifie que body.id_statut pointe vers un statut TACHE valide
 * ET que la transition depuis le statut actuel est autorisée.
 *
 * ⚠️  Doit être placé APRÈS checkTacheExists (utilise req.tache.statut.code_statut)
 *     ET APRÈS checkStatutTacheExists (utilise req.nouveauStatut.code_statut).
 */
const validateStatutTache = (req, res, next) => {
  // req.nouveauStatut est injecté par checkStatutTacheExists
  const nouveauCode = req.nouveauStatut.code_statut;
  const statutActuel = req.tache.statut.code_statut;

  // Vérifier que le nouveau statut est un statut de tâche connu
  if (!CODES_STATUT_TACHE_VALIDES.includes(nouveauCode)) {
    return R.badRequest(
      res,
      `Ce statut n'est pas applicable aux tâches. Codes acceptés : ${CODES_STATUT_TACHE_VALIDES.join(', ')}.`,
      'INVALID_STATUT_CONTEXTE'
    );
  }

  const transitionsAutorisees = TRANSITIONS_AUTORISEES[statutActuel];

  if (!transitionsAutorisees.includes(nouveauCode)) {
    const detail = transitionsAutorisees.length
      ? transitionsAutorisees.join(', ')
      : 'aucune (état final)';
    return R.error(
      res,
      `Transition invalide : ${statutActuel} → ${nouveauCode}. ` +
      `Depuis "${statutActuel}", transitions autorisées : [${detail}].`,
      422,
      'INVALID_TRANSITION'
    );
  }

  next();
};

/**
 * validateJournal
 * Le champ "description" est obligatoire.
 */
const validateJournal = (req, res, next) => {
  const { description } = req.body;
  if (!description || typeof description !== 'string' || !description.trim()) {
    return R.badRequest(res, "Le champ \"description\" est obligatoire pour un journal d'exécution.");
  }
  next();
};


// ============================================================
// 2. VÉRIFICATION EXISTENCE DB
// ============================================================

/**
 * checkChangementExists
 * Injecte req.changement
 */
const checkChangementExists = async (req, res, next) => {
  try {
    const { id_changement } = req.params;
    const changement = await prisma.changement.findUnique({
      where:  { id_changement },
      select: { id_changement: true, code_changement: true, id_statut: true },
    });
    if (!changement) return R.notFound(res, `Changement introuvable : ${id_changement}`);
    req.changement = changement;
    next();
  } catch (err) {
    console.error('[checkChangementExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkTacheExists
 * Injecte req.tache avec statut inclus (code_statut nécessaire pour validateStatutTache).
 */
const checkTacheExists = async (req, res, next) => {
  try {
    const { id_tache } = req.params;
    const tache = await prisma.tache.findUnique({
      where: { id_tache },
      select: {
        id_tache:      true,
        code_tache:    true,
        titre_tache:   true,
        id_changement: true,
        id_statut:     true,
        statut: {
          select: {
            id_statut:   true,
            code_statut: true,
            libelle:     true,
            contexte:    true,
          },
        },
      },
    });
    if (!tache) return R.notFound(res, 'Tâche introuvable.');
    req.tache = tache;
    next();
  } catch (err) {
    console.error('[checkTacheExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkJournalExists
 * Injecte req.journal
 */
const checkJournalExists = async (req, res, next) => {
  try {
    const { id_journal } = req.params;
    const journal = await prisma.journalExecution.findUnique({
      where:  { id_journal },
      select: { id_journal: true, id_tache: true, titre_journal: true },
    });
    if (!journal) return R.notFound(res, 'Entrée de journal introuvable.');
    req.journal = journal;
    next();
  } catch (err) {
    console.error('[checkJournalExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkImplementeurValid
 * Vérifie que body.id_user existe et est actif.
 * Passe silencieusement si id_user absent du body (update partiel).
 */
const checkImplementeurValid = async (req, res, next) => {
  try {
    const { id_user } = req.body;
    if (!id_user) return next();

    const user = await prisma.utilisateur.findUnique({
      where:  { id_user },
      select: { id_user: true, actif: true, nom_user: true, prenom_user: true },
    });
    if (!user) return R.notFound(res, `Implémenteur introuvable : ${id_user}`);
    if (!user.actif) {
      return R.badRequest(
        res,
        `Le compte de ${user.prenom_user} ${user.nom_user} est désactivé.`,
        'USER_INACTIVE'
      );
    }
    req.implementeur = user;
    next();
  } catch (err) {
    console.error('[checkImplementeurValid]', err);
    return R.serverError(res);
  }
};

/**
 * checkStatutTacheExists
 * Vérifie que body.id_statut existe dans la table Statut avec contexte = TACHE.
 * Injecte req.nouveauStatut = { id_statut, code_statut, libelle }
 *
 * ⚠️  Doit être placé AVANT validateStatutTache.
 */
const checkStatutTacheExists = async (req, res, next) => {
  try {
    const { id_statut } = req.body;

    if (!id_statut || typeof id_statut !== 'string') {
      return R.badRequest(
        res,
        'Le champ "id_statut" (UUID du statut tâche) est obligatoire pour changer le statut.'
      );
    }

    const statut = await prisma.statut.findUnique({
      where:  { id_statut },
      select: { id_statut: true, code_statut: true, libelle: true, contexte: true },
    });

    if (!statut) return R.notFound(res, `Statut introuvable : ${id_statut}`);

    if (statut.contexte !== 'TACHE') {
      return R.badRequest(
        res,
        `Ce statut (contexte: ${statut.contexte}) n'est pas applicable aux tâches. Utilisez un statut avec contexte TACHE.`,
        'WRONG_STATUT_CONTEXTE'
      );
    }

    req.nouveauStatut = statut;
    next();
  } catch (err) {
    console.error('[checkStatutTacheExists]', err);
    return R.serverError(res);
  }
};


module.exports = {
  // Validation body
  validateCreateTache,
  validateUpdateTache,
  validateStatutTache,
  validateJournal,
  // Vérification existence DB
  checkChangementExists,
  checkTacheExists,
  checkJournalExists,
  checkImplementeurValid,
  checkStatutTacheExists,
  // Export pour référence (utilisé dans les routes et tests)
  TRANSITIONS_AUTORISEES,
  CODES_STATUT_TACHE_VALIDES,
};