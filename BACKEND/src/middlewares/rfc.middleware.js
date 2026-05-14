'use strict';

/**
 * ============================================================
 * rfc_extras.middleware.js
 * ============================================================
 * Validations pour les sous-ressources RFC :
 *   Commentaire, EvaluationRisque, PiecesJointe
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const R      = require('../utils/response.utils');

// ============================================================
// VÉRIFICATION RFC PARENTE
// ============================================================

/**
 * checkRfcExists
 * Injecte req.rfc depuis params.id_rfc (ou params.id).
 */
const checkRfcExists = async (req, res, next) => {
  try {
    const id_rfc = req.params.id_rfc || req.params.id;
    const rfc = await prisma.rfc.findUnique({
      where:  { id_rfc },
      select: {
        id_rfc:    true,
        code_rfc:  true,
        titre_rfc: true,
        id_user:   true,
        statut:    { select: { code_statut: true } },
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

// ============================================================
// COMMENTAIRES
// ============================================================

/**
 * validateCreateCommentaire
 * Requis : contenu (string non vide)
 */
const validateCreateCommentaire = (req, res, next) => {
  const { contenu } = req.body;
  if (!contenu || typeof contenu !== 'string' || !contenu.trim()) {
    return R.badRequest(res, 'Le champ "contenu" est obligatoire (string non vide).');
  }
  next();
};

/**
 * validateUpdateCommentaire
 * Requis : contenu (string non vide)
 */
const validateUpdateCommentaire = (req, res, next) => {
  const { contenu } = req.body;
  if (!contenu || typeof contenu !== 'string' || !contenu.trim()) {
    return R.badRequest(res, 'Le champ "contenu" est obligatoire pour modifier un commentaire.');
  }
  next();
};

/**
 * checkCommentaireExists
 * Injecte req.commentaire depuis params.id_commentaire.
 */
const checkCommentaireExists = async (req, res, next) => {
  try {
    const { id_commentaire } = req.params;
    const commentaire = await prisma.commentaire.findUnique({
      where:  { id_commentaire },
      select: {
        id_commentaire:   true,
        contenu:          true,
        date_publication: true,
        id_rfc:           true,
        id_user:          true,
      },
    });
    if (!commentaire) return R.notFound(res, 'Commentaire introuvable.');
    req.commentaire = commentaire;
    next();
  } catch (err) {
    console.error('[checkCommentaireExists]', err);
    return R.serverError(res);
  }
};

/**
 * checkCommentaireOwner
 * Vérifie que le commentaire appartient à req.user OU que l'utilisateur est Admin/Change Manager.
 * À placer APRÈS checkCommentaireExists.
 */
const checkCommentaireOwner = (req, res, next) => {
  const isOwner   = req.commentaire.id_user === req.user.id_user;
  const isManager = req.user.roles?.some(r => ['CHANGE_MANAGER', 'ADMIN'].includes(r));
  if (!isOwner && !isManager) {
    return R.forbidden(res, 'Vous ne pouvez modifier ou supprimer que vos propres commentaires.');
  }
  next();
};

// ============================================================
// ÉVALUATION DE RISQUE
// ============================================================

/**
 * validateEvaluationRisque
 * Requis : impacte (1-5), probabilite (1-5)
 * Optionnel : description, date_evaluation
 * score_risque = impacte × probabilite (calculé côté service)
 */
const validateEvaluationRisque = (req, res, next) => {
  const { impacte, probabilite } = req.body;

  if (impacte === undefined || impacte === null) {
    return R.badRequest(res, 'Le champ "impacte" est obligatoire (entier 1 à 5).');
  }
  if (probabilite === undefined || probabilite === null) {
    return R.badRequest(res, 'Le champ "probabilite" est obligatoire (entier 1 à 5).');
  }

  const imp = Number(impacte);
  const pro = Number(probabilite);

  if (!Number.isInteger(imp) || imp < 1 || imp > 5) {
    return R.badRequest(res, '"impacte" doit être un entier entre 1 et 5.');
  }
  if (!Number.isInteger(pro) || pro < 1 || pro > 5) {
    return R.badRequest(res, '"probabilite" doit être un entier entre 1 et 5.');
  }

  // Injecter les valeurs nettoyées + score calculé
  req.body._impacte     = imp;
  req.body._probabilite = pro;
  req.body._score       = imp * pro;

  next();
};

/**
 * validateUpdateEvaluationRisque
 * Au moins impacte ou probabilite requis.
 */
const validateUpdateEvaluationRisque = (req, res, next) => {
  const { impacte, probabilite } = req.body;
  const hasImpacte    = impacte    !== undefined && impacte    !== null;
  const hasProbabilite = probabilite !== undefined && probabilite !== null;

  if (!hasImpacte && !hasProbabilite) {
    return R.badRequest(res, 'Au moins "impacte" ou "probabilite" est requis pour la mise à jour.');
  }

  if (hasImpacte) {
    const imp = Number(impacte);
    if (!Number.isInteger(imp) || imp < 1 || imp > 5) {
      return R.badRequest(res, '"impacte" doit être un entier entre 1 et 5.');
    }
    req.body._impacte = imp;
  }
  if (hasProbabilite) {
    const pro = Number(probabilite);
    if (!Number.isInteger(pro) || pro < 1 || pro > 5) {
      return R.badRequest(res, '"probabilite" doit être un entier entre 1 et 5.');
    }
    req.body._probabilite = pro;
  }

  next();
};

// ============================================================
// PIÈCES JOINTES
// ============================================================

/**
 * validateCreatePieceJointe
 * Requis : nom_piece (string non vide)
 * Optionnel : type_piece, taille_piece
 * Note : le fichier réel est géré côté frontend (stockage S3/local)
 *        Ce module gère uniquement les métadonnées.
 */
const validateCreatePieceJointe = (req, res, next) => {
  const { nom_piece } = req.body;
  if (!nom_piece || typeof nom_piece !== 'string' || !nom_piece.trim()) {
    return R.badRequest(res, 'Le champ "nom_piece" est obligatoire (nom du fichier).');
  }
  if (req.body.taille_piece !== undefined) {
    const taille = Number(req.body.taille_piece);
    if (isNaN(taille) || taille < 0) {
      return R.badRequest(res, '"taille_piece" doit être un nombre positif (octets).');
    }
    req.body._taille = BigInt(Math.floor(taille));
  }
  next();
};

/**
 * checkPieceJointeExists
 * Injecte req.pieceJointe depuis params.id_piece.
 */
const checkPieceJointeExists = async (req, res, next) => {
  try {
    const { id_piece } = req.params;
    const pj = await prisma.piecesJointe.findUnique({
      where:  { id_piece },
      select: {
        id_piece:     true,
        code_metier:  true,
        nom_piece:    true,
        type_piece:   true,
        taille_piece: true,
        date_upload:  true,
        id_rfc:       true,
      },
    });
    if (!pj) return R.notFound(res, 'Pièce jointe introuvable.');
    req.pieceJointe = pj;
    next();
  } catch (err) {
    console.error('[checkPieceJointeExists]', err);
    return R.serverError(res);
  }
};

module.exports = {
  checkRfcExists,
  // Commentaires
  validateCreateCommentaire,
  validateUpdateCommentaire,
  checkCommentaireExists,
  checkCommentaireOwner,
  // Évaluation risque
  validateEvaluationRisque,
  validateUpdateEvaluationRisque,
  // Pièces jointes
  validateCreatePieceJointe,
  checkPieceJointeExists,
};