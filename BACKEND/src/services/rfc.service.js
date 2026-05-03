'use strict';

const prisma    = require('./prisma.service');
const notifSvc  = require('./notification.service');
const { 
  codeRfc, 
  codeChangement,
  codeCommentaire,
  codeEvaluationRisque,
  codePiecesJointe,
} = require('../utils/entity-code.utils');

const TRANSITIONS_RFC = {
  BROUILLON:     ['SOUMIS', 'CLOTUREE'],
  SOUMIS:        ['EN_EVALUATION', 'PRE_APPROUVEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
  EN_EVALUATION: ['EVALUEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
  PRE_APPROUVEE: ['EVALUEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
  EVALUEE:       ['APPROUVEE', 'REJETEE', 'CLOTUREE'],
  APPROUVEE:     ['CLOTUREE'],
  REJETEE:       ['BROUILLON', 'CLOTUREE'],
};

const COMMENTAIRE_SELECT = {
  id_commentaire:   true,
  code_metier:      true,
  contenu:          true,
  date_publication: true,
  id_rfc:           true,
  id_user:          true,
  auteur: {
    select: {
      id_user:     true,
      nom_user:    true,
      prenom_user: true,
      email_user:  true,
    },
  },
};
 
const EVALUATION_SELECT = {
  id_evaluation:   true,
  code_metier:     true,
  impacte:         true,
  probabilite:     true,
  score_risque:    true,
  description:     true,
  date_evaluation: true,
  id_rfc:          true,
};
 
const PIECE_SELECT = {
  id_piece:     true,
  code_metier:  true,
  nom_piece:    true,
  type_piece:   true,
  taille_piece: true,
  date_upload:  true,
  id_rfc:       true,
};

// ─────────────────────────────────────────────────────────────
// 1. Lister toutes les RFC
// ─────────────────────────────────────────────────────────────
const getAllRfc = async (filters = {}) => {
  const { statut, type, priorite, id_user, search } = filters;

  const idStatut = statut ? statut : undefined;
  const idType = type ? type : undefined;
  const idPriorite = priorite ? priorite : undefined;
  const idUser = id_user ? id_user : undefined;

  return prisma.rfc.findMany({
    where: {
      ...(idStatut && { id_statut: idStatut }),
      ...(idType && { id_type: idType }),
      ...(idPriorite && { id_priorite: idPriorite }),
      ...(idUser && { id_user: idUser }),
      ...(search && {
        OR: [
          { code_rfc: { contains: search } },
          { titre_rfc: { contains: search } },
        ]
      })
    },
    include: {
      statut:    { select: { code_statut: true, libelle: true } },
      priorite:  { select: { code_priorite: true, libelle: true } },
      typeRfc:   { select: { type: true } },
      demandeur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
      ciRfcs:    { include: { ci: { select: { id_ci: true, nom_ci: true, type_ci: true } } } },
    },
    orderBy: { date_creation: 'desc' },
  });
};

// ─────────────────────────────────────────────────────────────
// 2. Récupérer une RFC par ID
// ─────────────────────────────────────────────────────────────
const getRfcById = async (id) => {
  return prisma.rfc.findUnique({
    where: { id_rfc: id },
    include: {
      statut:           true,
      priorite:         true,
      typeRfc:          true,
      demandeur:        { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true } },
      ciRfcs:           { include: { ci: true } },
      evaluationRisque: true,
      piecesJointes:    true,
      commentaires:     { orderBy: { date_publication: 'desc' } },
      changements:      { select: { id_changement: true, statut: true, date_debut: true } },
      historiques:      { orderBy: { date_changement: 'desc' }, include: { statut: true } },
    },
  });
};

// ─────────────────────────────────────────────────────────────
// 3. Créer une RFC
// ─────────────────────────────────────────────────────────────
const createRfc = async (data, id_user) => {
  if (!id_user) throw new Error("L'ID utilisateur est obligatoire");

  const code_rfc = codeRfc();

  const statutParDefaut = await prisma.statut.findFirst({
    where: { code_statut: 'SOUMIS', contexte: 'RFC' },
  });
  if (!statutParDefaut) throw new Error("Statut 'BROUILLON' non trouvé");

  const prioriteParDefaut = await prisma.priorite.findFirst({
    where: { code_priorite: 'P0' },
  });
  if (!prioriteParDefaut) throw new Error("Priorité 'P0' non trouvée");

  const typeStandard = await prisma.typeRfc.findUnique({
    where: { code_metier: 'TYPE-RFC-STD' },
  });
  if (!typeStandard) throw new Error("Type RFC 'TYPE-RFC-STD' non trouvé");

  const { titre_rfc, description, justification, date_souhaitee, urgence, impacte_estimee, ci_ids = [], id_statut, id_priorite, id_type } = data;

  return prisma.rfc.create({
    data: {
      titre_rfc,
      description,
      code_rfc,
      justification,
      date_souhaitee:  date_souhaitee ? new Date(date_souhaitee) : null,
      urgence:         urgence ?? false,
      impacte_estimee,
      id_statut:       id_statut || statutParDefaut.id_statut,
      id_priorite:     id_priorite || prioriteParDefaut.id_priorite,
      id_type:         id_type || typeStandard.id_type,
      id_user,
      ciRfcs: ci_ids.length > 0
        ? { create: ci_ids.map(id_ci => ({ id_ci })) }
        : undefined,
    },
    include: {
      statut:   { select: { code_statut: true, libelle: true } },
      priorite: { select: { code_priorite: true, libelle: true } },
      typeRfc:  { select: { type: true } },
      ciRfcs:   { include: { ci: true } },
    },
  });
};

// ─────────────────────────────────────────────────────────────
// 4. Modifier les champs texte d'une RFC
// ─────────────────────────────────────────────────────────────
const updateRfc = async (id, data) => {
  const { titre_rfc, description, justification, date_souhaitee, urgence, impacte_estimee, id_priorite, id_type } = data;

  return prisma.rfc.update({
    where: { id_rfc: id },
    data: {
      ...(titre_rfc       && { titre_rfc }),
      ...(description     && { description }),
      ...(justification   && { justification }),
      ...(date_souhaitee  && { date_souhaitee: new Date(date_souhaitee) }),
      ...(urgence !== undefined && { urgence }),
      ...(impacte_estimee && { impacte_estimee }),
      ...(id_priorite     && { id_priorite }),
      ...(id_type         && { id_type }),
      ...(data.ci_ids && {
        ciRfcs: {
          deleteMany: {},
          create: data.ci_ids.map(id_ci => ({ id_ci }))
        }
      })
    },
    include: {
      statut:   { select: { code_statut: true, libelle: true } },
      priorite: { select: { code_priorite: true, libelle: true } },
      typeRfc:  { select: { type: true } },
    },
  });
};

// ─────────────────────────────────────────────────────────────
// 5. Changer le statut d'une RFC (machine à états)
//    + notification automatique post-transition
// ─────────────────────────────────────────────────────────────
async function updateRfcStatus(id_rfc, id_statut, id_change_manager, id_env, options = {}) {
  if (!id_statut) throw new Error("id_statut est requis");

  const rfc = await prisma.rfc.findUnique({
    where:   { id_rfc },
    include: { statut: true },
  });
  if (!rfc) throw new Error("RFC introuvable");

  const statutCible = await prisma.statut.findUnique({ where: { id_statut } });
  if (!statutCible)                   throw new Error("Statut cible introuvable");
  if (statutCible.contexte !== 'RFC') throw new Error("Ce statut n'appartient pas au workflow RFC");

  const statutActuel  = rfc.statut.code_statut;
  const transitionsOk = TRANSITIONS_RFC[statutActuel] || [];

  if (!transitionsOk.includes(statutCible.code_statut)) {
    throw new Error(
      `Transition RFC interdite : ${statutActuel} → ${statutCible.code_statut}. ` +
      `Transitions autorisées depuis ${statutActuel} : [${transitionsOk.join(', ') || 'aucune'}]`
    );
  }

  if (statutCible.code_statut === 'APPROUVEE') {
    if (!id_change_manager) throw new Error("id_change_manager requis pour approuver une RFC");
    if (!id_env)            throw new Error("id_env requis pour approuver une RFC");
  }

  // ── Transaction atomique ──────────────────────────────────
  const { updatedRfc, changement } = await prisma.$transaction(async (tx) => {

    const updatedRfc = await tx.rfc.update({
      where: { id_rfc },
      data: {
        id_statut,
        ...(statutCible.code_statut === 'CLOTUREE' && { date_cloture: new Date() }),
      },
      include: { statut: { select: { code_statut: true, libelle: true } } },
    });

    let changement = null;
    if (statutCible.code_statut === 'APPROUVEE') {
      changement = await createChangeFromApprovedRfc(id_rfc, id_change_manager, id_env, options, tx);
    }

    return { updatedRfc, changement };
  });

  // ── Notification post-transition (non bloquante) ──────────
  await notifSvc.notifyRfcStatusChange(id_rfc, statutCible.code_statut, {
    id_change_manager,
  });

  return { rfc: updatedRfc, changement };
}

// ─────────────────────────────────────────────────────────────
// 6. Annuler une RFC → statut CLOTUREE
// ─────────────────────────────────────────────────────────────
const cancelRfc = async (id) => {
  const rfc = await prisma.rfc.findUnique({
    where:   { id_rfc: id },
    include: { statut: true },
  });
  if (!rfc) throw new Error("RFC introuvable");

  if (rfc.statut.code_statut === 'CLOTUREE') {
    throw new Error("Cette RFC est déjà clôturée");
  }

  const transitionsOk = TRANSITIONS_RFC[rfc.statut.code_statut] || [];
  if (!transitionsOk.includes('CLOTUREE')) {
    throw new Error(`Impossible de clôturer une RFC au statut "${rfc.statut.code_statut}"`);
  }

  const statutCloture = await prisma.statut.findFirst({
    where: { code_statut: 'CLOTUREE', contexte: 'RFC' },
  });
  if (!statutCloture) throw new Error("Statut CLOTUREE introuvable en BDD");

  const updated = await prisma.rfc.update({
    where: { id_rfc: id },
    data:  { id_statut: statutCloture.id_statut, date_cloture: new Date() },
    include: { statut: { select: { code_statut: true, libelle: true } } },
  });

  // Notification annulation
  await notifSvc.notifyRfcStatusChange(id, 'CLOTUREE', {});

  return updated;
};

// ─────────────────────────────────────────────────────────────
// 7. Créer un Changement depuis une RFC approuvée (interne)
// ─────────────────────────────────────────────────────────────
async function createChangeFromApprovedRfc(id_rfc, id_change_manager, id_env, options = {}, tx = prisma) {
  const rfc = await tx.rfc.findUnique({
    where:   { id_rfc },
    include: { priorite: true, typeRfc: true },
  });
  if (!rfc) throw new Error("RFC introuvable pour création du Changement");

  return tx.changement.create({
    data: {
      code_changement: codeChangement(),
      date_debut:      options.date_debut ? new Date(options.date_debut) : (rfc.date_souhaitee ?? null),
      date_fin_prevu:  options.date_fin_prevu ? new Date(options.date_fin_prevu) : null,
      date_fin_reelle: null,
      reussite:        null,
      changeManager:   { connect: { id_user: id_change_manager } },
      rfc:             { connect: { id_rfc } },
      environnement:   { connect: { id_env } },
      statut: {
        connect: {
          code_statut_contexte: { code_statut: 'EN_PLANIFICATION', contexte: 'CHANGEMENT' },
        },
      },
    },
  });
}

// ============================================================
// COMMENTAIRES
// ============================================================
 
/**
 * Crée un commentaire sur une RFC.
 * Nécessite le schema fix (id_user + relation auteur).
 * @param {string} id_rfc
 * @param {string} id_user   Auteur (req.user.id_user)
 * @param {string} contenu
 */
async function createCommentaire(id_rfc, id_user, contenu) {
  return prisma.commentaire.create({
    data: {
      code_metier: codeCommentaire(),
      contenu:     contenu.trim(),
      id_rfc,
      id_user,
    },
    select: COMMENTAIRE_SELECT,
  });
}
 
/**
 * Liste les commentaires d'une RFC, du plus récent au plus ancien.
 */
async function getCommentairesByRfc(id_rfc) {
  return prisma.commentaire.findMany({
    where:   { id_rfc },
    orderBy: { date_publication: 'desc' },
    select:  COMMENTAIRE_SELECT,
  });
}
 
/**
 * Modifie le contenu d'un commentaire.
 */
async function updateCommentaire(id_commentaire, contenu) {
  return prisma.commentaire.update({
    where:  { id_commentaire },
    data:   { contenu: contenu.trim() },
    select: COMMENTAIRE_SELECT,
  });
}
 
/**
 * Supprime un commentaire.
 */
async function deleteCommentaire(id_commentaire) {
  await prisma.commentaire.delete({ where: { id_commentaire } });
  return { deleted: true, id_commentaire };
}
 
// ============================================================
// ÉVALUATION DE RISQUE
// ============================================================
 
/**
 * Crée ou met à jour l'évaluation de risque d'une RFC.
 * 1-to-1 → upsert.
 * @param {string} id_rfc
 * @param {object} data  { _impacte, _probabilite, _score, description?, date_evaluation? }
 */
async function upsertEvaluationRisque(id_rfc, data) {
  const {
    _impacte:     impacte,
    _probabilite: probabilite,
    _score:       score_risque,
    description  = null,
    date_evaluation = null,
  } = data;
 
  const existing = await prisma.evaluationRisque.findUnique({ where: { id_rfc } });
 
  if (existing) {
    return prisma.evaluationRisque.update({
      where: { id_rfc },
      data: {
        impacte,
        probabilite,
        score_risque,
        ...(description     !== null && { description }),
        ...(date_evaluation !== null && { date_evaluation: new Date(date_evaluation) }),
      },
      select: EVALUATION_SELECT,
    });
  }
 
  return prisma.evaluationRisque.create({
    data: {
      code_metier:    codeEvaluationRisque(),
      impacte,
      probabilite,
      score_risque,
      description,
      date_evaluation: date_evaluation ? new Date(date_evaluation) : null,
      id_rfc,
    },
    select: EVALUATION_SELECT,
  });
}
 
/**
 * Récupère l'évaluation de risque d'une RFC.
 */
async function getEvaluationRisqueByRfc(id_rfc) {
  return prisma.evaluationRisque.findUnique({
    where:  { id_rfc },
    select: EVALUATION_SELECT,
  });
}
 
/**
 * Supprime l'évaluation de risque d'une RFC.
 */
async function deleteEvaluationRisque(id_rfc) {
  const existing = await prisma.evaluationRisque.findUnique({ where: { id_rfc } });
  if (!existing) {
    const err = new Error("Cette RFC n'a pas encore d'évaluation de risque.");
    err.code = 'NOT_FOUND';
    throw err;
  }
  await prisma.evaluationRisque.delete({ where: { id_rfc } });
  return { deleted: true, id_rfc };
}
 
// ============================================================
// PIÈCES JOINTES
// ============================================================
 
/**
 * Ajoute une pièce jointe (métadonnées) à une RFC.
 * @param {string} id_rfc
 * @param {object} data  { nom_piece, type_piece?, _taille? }
 */
async function createPieceJointe(id_rfc, data) {
  const {
    nom_piece,
    type_piece   = null,
    _taille      = null,
  } = data;
 
  return prisma.piecesJointe.create({
    data: {
      code_metier:  codePiecesJointe(),
      nom_piece:    nom_piece.trim(),
      type_piece,
      taille_piece: _taille,
      id_rfc,
    },
    select: PIECE_SELECT,
  });
}
 
/**
 * Liste les pièces jointes d'une RFC.
 */
async function getPiecesJointesByRfc(id_rfc) {
  return prisma.piecesJointe.findMany({
    where:   { id_rfc },
    orderBy: { date_upload: 'desc' },
    select:  PIECE_SELECT,
  });
}
 
/**
 * Supprime une pièce jointe.
 */
async function deletePieceJointe(id_piece) {
  await prisma.piecesJointe.delete({ where: { id_piece } });
  return { deleted: true, id_piece };
}

module.exports = {
  getAllRfc,
  getRfcById,
  createRfc,
  updateRfc,
  updateRfcStatus,
  cancelRfc,
  TRANSITIONS_RFC,
  // Commentaires
  createCommentaire,
  getCommentairesByRfc,
  updateCommentaire,
  deleteCommentaire,
  // Évaluation risque
  upsertEvaluationRisque,
  getEvaluationRisqueByRfc,
  deleteEvaluationRisque,
  // Pièces jointes
  createPieceJointe,
  getPiecesJointesByRfc,
  deletePieceJointe,
};