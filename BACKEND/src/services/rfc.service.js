'use strict';

const prisma            = require('./prisma.service');
const notifSvc          = require('./notification.service');
const auditSvc          = require('./audit.service');
const statutHistorySvc  = require('./statuthistory.service');
const { TRANSITIONS_RFC } = require('./workflow.service');
const {
  codeRfc,
  codeChangement,
  codeCommentaire,
  codeEvaluationRisque,
  codePiecesJointe,
} = require('../utils/entity-code.utils');

// ── Machine à états RFC ───────────────────────────────────────
// const TRANSITIONS_RFC = {
//   SOUMIS:        ['PRE_APPROUVEE', 'REJETEE', 'CLOTUREE'],
//   PRE_APPROUVEE: ['EVALUEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
//   EVALUEE:       ['APPROUVEE', 'REJETEE', 'CLOTUREE'],
//   APPROUVEE:     ['CLOTUREE'],
//   REJETEE:       ['SOUMIS', 'CLOTUREE'],
//   CLOTUREE:      [],
// };

// ── Selects réutilisables ─────────────────────────────────────
const COMMENTAIRE_SELECT = {
  id_commentaire:   true,
  code_metier:      true,
  contenu:          true,
  date_publication: true,
  id_rfc:           true,
  id_user:          true,
  auteur: {
    select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
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
// 1. LISTER TOUTES LES RFC
// ─────────────────────────────────────────────────────────────
const getAllRfc = async (filters = {}) => {
  const { statut, type, priorite, id_user, search } = filters;

  return prisma.rfc.findMany({
    where: {
      ...(statut   && { id_statut:   statut }),
      ...(type     && { id_type:     type }),
      ...(priorite && { id_priorite: priorite }),
      ...(id_user  && { id_user }),
      ...(search   && {
        OR: [
          { code_rfc:  { contains: search } },
          { titre_rfc: { contains: search } },
        ],
      }),
    },
    include: {
      statut:    { select: { code_statut: true, libelle: true } },
      priorite:  { select: { code_priorite: true, libelle: true } },
      typeRfc:   { select: { id_type: true, type: true } },
      demandeur: { select: { id_user: true, nom_user: true, prenom_user: true, email_user: true, direction: { select: { nom_direction: true } } } },
      ciRfcs:    { include: { ci: { select: { id_ci: true, nom_ci: true, type_ci: true } } } },
    },
    orderBy: { date_creation: 'desc' },
  });
};

// ─────────────────────────────────────────────────────────────
// 2. RÉCUPÉRER UNE RFC PAR ID
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
      commentaires:     {
        orderBy: { date_publication: 'desc' },
        include: { auteur: { select: { nom_user: true, prenom_user: true } } },
      },
      changements: { select: { id_changement: true, code_changement: true, statut: true, date_debut: true } },
      historiques:  { orderBy: { date_changement: 'desc' }, include: { statut: true } },
    },
  });
};

// ─────────────────────────────────────────────────────────────
// 3. CRÉER UNE RFC
// ─────────────────────────────────────────────────────────────
const createRfc = async (data, id_user) => {
  if (!id_user) throw new Error("L'ID utilisateur est obligatoire");

  const code_rfc = codeRfc();

  const [statutParDefaut, prioriteParDefaut, typeStandard] = await Promise.all([
    prisma.statut.findFirst({ where: { code_statut: 'SOUMIS', contexte: 'RFC' } }),
    prisma.priorite.findFirst({ where: { code_priorite: 'P0' } }),
    prisma.typeRfc.findUnique({ where: { code_metier: 'TYPE-RFC-STD' } }),
  ]);

  if (!statutParDefaut)  throw new Error("Statut 'SOUMIS' non trouvé");
  if (!prioriteParDefaut) throw new Error("Priorité 'P0' non trouvée");
  if (!typeStandard)     throw new Error("Type RFC 'TYPE-RFC-STD' non trouvé");

  const {
    titre_rfc, description, justification,
    date_souhaitee, urgence, impacte_estimee,
    ci_ids = [], id_statut, id_priorite, id_type,
  } = data;

  const rfc = await prisma.rfc.create({
    data: {
      titre_rfc,
      description,
      code_rfc,
      justification,
      date_souhaitee:  date_souhaitee ? new Date(date_souhaitee) : null,
      urgence:         urgence ?? false,
      impacte_estimee,
      id_statut:       id_statut  || statutParDefaut.id_statut,
      id_priorite:     id_priorite || prioriteParDefaut.id_priorite,
      id_type:         id_type    || typeStandard.id_type,
      id_user,
      ciRfcs: ci_ids.length > 0
        ? { create: ci_ids.map(id_ci => ({ id_ci })) }
        : undefined,
    },
    include: {
      statut:   { select: { code_statut: true, libelle: true } },
      priorite: { select: { code_priorite: true, libelle: true } },
      typeRfc:  { select: { id_type: true, type: true } },
      ciRfcs:   { include: { ci: true } },
    },
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type:  auditSvc.ENTITES.RFC,
    entite_id:    rfc.id_rfc,
    id_user,
    ancienne_val: null,
    nouvelle_val: {
      code_rfc:    rfc.code_rfc,
      titre_rfc:   rfc.titre_rfc,
      statut:      rfc.statut.code_statut,
      urgence:     rfc.urgence,
      ci_count:    ci_ids.length,
    },
  });

  await notifSvc.notifyNewRfc(rfc.id_rfc, id_user);

  return rfc;
};

// ─────────────────────────────────────────────────────────────
// 4. MODIFIER LES CHAMPS TEXTE D'UNE RFC
// ─────────────────────────────────────────────────────────────
const updateRfc = async (id, data, id_user = null ) => {
  const avant = await prisma.rfc.findUnique({
    where:  { id_rfc: id },
    select: { titre_rfc: true, description: true, justification: true, urgence: true, impacte_estimee: true },
  });

  const {
    titre_rfc, description, justification,
    date_souhaitee, urgence, impacte_estimee,
    id_priorite, id_type,
  } = data;

  const updated = await prisma.rfc.update({
    where: { id_rfc: id },
    data: {
      ...(titre_rfc      !== undefined && { titre_rfc }),
      ...(description    !== undefined && { description }),
      ...(justification  !== undefined && { justification }),
      ...(date_souhaitee !== undefined && { date_souhaitee: new Date(date_souhaitee) }),
      ...(urgence        !== undefined && { urgence }),
      ...(impacte_estimee !== undefined && { impacte_estimee }),
      ...(id_priorite    !== undefined && { id_priorite }),
      ...(id_type        !== undefined && { id_type }),
      ...(data.ci_ids && {
        ciRfcs: { deleteMany: {}, create: data.ci_ids.map(id_ci => ({ id_ci })) },
      }),
    },
    include: {
      statut:   { select: { code_statut: true, libelle: true } },
      priorite: { select: { code_priorite: true, libelle: true } },
      typeRfc:  { select: { id_type: true, type: true } },
    },
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.RFC,
    entite_id:    id,
    id_user,
    ancienne_val: avant,
    nouvelle_val: { titre_rfc, description, justification, urgence, impacte_estimee },
  });

  // Émettre un événement WebSocket pour forcer le rechargement (ex: popup URGENT, tables)
  const socketService = require('./socket.service');
  if (socketService.getIO) {
    const io = socketService.getIO();
    if (io) {
      io.emit('rfc:update', { id_rfc: id });
    }
  }

  return updated;
};

// ─────────────────────────────────────────────────────────────
// 5. CHANGER LE STATUT D'UNE RFC (machine à états ITIL)
// ─────────────────────────────────────────────────────────────
async function updateRfcStatus(id_rfc, id_statut, id_change_manager, id_env, options = {}, id_user = null) {
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
      `Autorisées depuis "${statutActuel}" : [${transitionsOk.join(', ') || 'aucune'}]`
    );
  }

  if (statutCible.code_statut === 'APPROUVEE') {
    if (!id_change_manager) throw new Error("id_change_manager requis pour approuver une RFC");
    if (!id_env)            throw new Error("id_env requis pour approuver une RFC");
  }

  // ── Transaction ─────────────────────────────────────────────
  const { updatedRfc, changement } = await prisma.$transaction(async (tx) => {
    const updatedRfc = await tx.rfc.update({
      where: { id_rfc },
      data: {
        id_statut,
        ...(statutCible.code_statut === 'CLOTUREE' && { date_cloture: new Date() }),
      },
      include: { statut: { select: { code_statut: true, libelle: true } } },
    });

    // ── STATUT HISTORY ─────────────────────────────────────────
    await statutHistorySvc.createHistory({
      id_statut,
      id_rfc,
      id_user:     id_user || id_change_manager || null,
      commentaire: null,
    }, tx);

    let changement = null;
    if (statutCible.code_statut === 'APPROUVEE') {
      changement = await _createChangeFromApprovedRfc(id_rfc, id_change_manager, id_env, options, tx);
    }

    return { updatedRfc, changement };
  });

  // ── AUDIT — transition statut ──────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.STATUS_CHANGED,
    entite_type:  auditSvc.ENTITES.RFC,
    entite_id:    id_rfc,
    id_user:      id_user || id_change_manager || null,
    ancienne_val: { statut: statutActuel },
    nouvelle_val: { statut: statutCible.code_statut },
  });

  // ── AUDIT — approbation + création changement ──────────────
  if (statutCible.code_statut === 'APPROUVEE' && changement) {
    await auditSvc.logAction({
      action:       auditSvc.ACTIONS.APPROVE,
      entite_type:  auditSvc.ENTITES.RFC,
      entite_id:    id_rfc,
      id_user:      id_change_manager,
      ancienne_val: null,
      nouvelle_val: {
        changement_cree:  changement.id_changement,
        code_changement:  changement.code_changement,
        id_change_manager,
        id_env,
      },
    });

    // Audit côté CHANGEMENT aussi
    await auditSvc.logAction({
      action:       auditSvc.ACTIONS.CREATE,
      entite_type:  auditSvc.ENTITES.CHANGEMENT,
      entite_id:    changement.id_changement,
      id_user:      id_change_manager,
      ancienne_val: null,
      nouvelle_val: {
        code_changement: changement.code_changement,
        depuis_rfc:      id_rfc,
        id_env,
        statut:          'EN_PLANIFICATION',
      },
    });
  }

  // ── AUDIT — rejet ──────────────────────────────────────────
  if (statutCible.code_statut === 'REJETEE') {
    await auditSvc.logAction({
      action:       auditSvc.ACTIONS.REJECT,
      entite_type:  auditSvc.ENTITES.RFC,
      entite_id:    id_rfc,
      id_user:      id_user || null,
      ancienne_val: { statut: statutActuel },
      nouvelle_val: { statut: 'REJETEE' },
    });
  }

  // Notification
  await notifSvc.notifyRfcStatusChange(id_rfc, statutCible.code_statut, { id_change_manager });

  return { rfc: updatedRfc, changement };
}

// ─────────────────────────────────────────────────────────────
// 6. ANNULER UNE RFC → statut CLOTUREE
// ─────────────────────────────────────────────────────────────
const cancelRfc = async (id, id_user = null) => {
  const rfc = await prisma.rfc.findUnique({
    where:   { id_rfc: id },
    include: { statut: true },
  });
  if (!rfc) throw new Error("RFC introuvable");

  const statutActuel = rfc.statut.code_statut;
  if (statutActuel === 'CLOTUREE') throw new Error("Cette RFC est déjà clôturée");

  const transitionsOk = TRANSITIONS_RFC[statutActuel] || [];
  if (!transitionsOk.includes('CLOTUREE')) {
    throw new Error(`Impossible de clôturer une RFC au statut "${statutActuel}"`);
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

  // ── STATUT HISTORY ───────────────────────────────────────────
  await statutHistorySvc.createHistory({
    id_statut:   statutCloture.id_statut,
    id_rfc:      id,
    id_user,
    commentaire: 'RFC annulée.',
  });

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CANCEL,
    entite_type:  auditSvc.ENTITES.RFC,
    entite_id:    id,
    id_user,
    ancienne_val: { statut: statutActuel },
    nouvelle_val: { statut: 'CLOTUREE', date_cloture: new Date().toISOString() },
  });

  await notifSvc.notifyRfcStatusChange(id, 'CLOTUREE', {});
  return updated;
};

// ─────────────────────────────────────────────────────────────
// 7. CRÉER UN CHANGEMENT DEPUIS RFC APPROUVÉE (interne)
// ─────────────────────────────────────────────────────────────
async function _createChangeFromApprovedRfc(id_rfc, id_change_manager, id_env, options = {}, tx = prisma) {
  const rfc = await tx.rfc.findUnique({
    where:   { id_rfc },
    include: { priorite: true, typeRfc: true },
  });
  if (!rfc) throw new Error("RFC introuvable pour création du Changement");

  return tx.changement.create({
    data: {
      code_changement: codeChangement(),
      date_debut:      options.date_debut     ? new Date(options.date_debut)     : (rfc.date_souhaitee ?? null),
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

async function createCommentaire(id_rfc, id_user, contenu) {
  const commentaire = await prisma.commentaire.create({
    data: {
      code_metier: codeCommentaire(),
      contenu:     contenu.trim(),
      id_rfc,
      id_user,
    },
    select: COMMENTAIRE_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.COMMENT,
    entite_type:  auditSvc.ENTITES.COMMENTAIRE,
    entite_id:    commentaire.id_commentaire,
    id_user,
    ancienne_val: null,
    nouvelle_val: {
      id_rfc,
      contenu: contenu.substring(0, 200),
    },
  });

  return commentaire;
}

async function getCommentairesByRfc(id_rfc) {
  return prisma.commentaire.findMany({
    where:   { id_rfc },
    orderBy: { date_publication: 'desc' },
    select:  COMMENTAIRE_SELECT,
  });
}

async function updateCommentaire(id_commentaire, contenu) {
  const avant = await prisma.commentaire.findUnique({
    where: { id_commentaire },
    select: { contenu: true, id_user: true },
  });

  const commentaire = await prisma.commentaire.update({
    where:  { id_commentaire },
    data:   { contenu: contenu.trim() },
    select: COMMENTAIRE_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type:  auditSvc.ENTITES.COMMENTAIRE,
    entite_id:    id_commentaire,
    id_user:      avant?.id_user ?? null,
    ancienne_val: { contenu: avant?.contenu?.substring(0, 200) },
    nouvelle_val: { contenu: contenu.substring(0, 200) },
  });

  return commentaire;
}

async function deleteCommentaire(id_commentaire) {
  const avant = await prisma.commentaire.findUnique({
    where: { id_commentaire },
    select: { contenu: true, id_user: true, id_rfc: true },
  });

  await prisma.commentaire.delete({ where: { id_commentaire } });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.DELETE,
    entite_type:  auditSvc.ENTITES.COMMENTAIRE,
    entite_id:    id_commentaire,
    id_user:      avant?.id_user ?? null,
    ancienne_val: { contenu: avant?.contenu?.substring(0, 200), id_rfc: avant?.id_rfc },
    nouvelle_val: null,
  });

  return { deleted: true, id_commentaire };
}

// ============================================================
// ÉVALUATION DE RISQUE
// ============================================================

async function upsertEvaluationRisque(id_rfc, data) {
  const {
    _impacte:     impacte,
    _probabilite: probabilite,
    _score:       score_risque,
    description  = null,
    date_evaluation = null,
  } = data;

  const existing = await prisma.evaluationRisque.findUnique({ where: { id_rfc } });

  let evaluation;
  if (existing) {
    evaluation = await prisma.evaluationRisque.update({
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

    await auditSvc.logAction({
      action:       auditSvc.ACTIONS.RISK_EVAL,
      entite_type:  auditSvc.ENTITES.EVALUATION,
      entite_id:    evaluation.id_evaluation,
      id_user:      null,
      ancienne_val: { impacte: existing.impacte, probabilite: existing.probabilite, score: existing.score_risque },
      nouvelle_val: { impacte, probabilite, score_risque },
    });
  } else {
    evaluation = await prisma.evaluationRisque.create({
      data: {
        code_metier:     codeEvaluationRisque(),
        impacte,
        probabilite,
        score_risque,
        description,
        date_evaluation: date_evaluation ? new Date(date_evaluation) : null,
        id_rfc,
      },
      select: EVALUATION_SELECT,
    });

    await auditSvc.logAction({
      action:       auditSvc.ACTIONS.RISK_EVAL,
      entite_type:  auditSvc.ENTITES.EVALUATION,
      entite_id:    evaluation.id_evaluation,
      id_user:      null,
      ancienne_val: null,
      nouvelle_val: { id_rfc, impacte, probabilite, score_risque, description },
    });
  }

  return evaluation;
}

async function getEvaluationRisqueByRfc(id_rfc) {
  return prisma.evaluationRisque.findUnique({ where: { id_rfc }, select: EVALUATION_SELECT });
}

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

async function createPieceJointe(id_rfc, data) {
  const { nom_piece, type_piece = null, _taille = null } = data;

  const piece = await prisma.piecesJointe.create({
    data: {
      code_metier:  codePiecesJointe(),
      nom_piece:    nom_piece.trim(),
      type_piece,
      taille_piece: _taille,
      id_rfc,
    },
    select: PIECE_SELECT,
  });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.ATTACHMENT,
    entite_type:  auditSvc.ENTITES.PIECE,
    entite_id:    piece.id_piece,
    id_user:      null,
    ancienne_val: null,
    nouvelle_val: { id_rfc, nom_piece, type_piece },
  });

  return piece;
}

async function getPiecesJointesByRfc(id_rfc) {
  return prisma.piecesJointe.findMany({
    where:   { id_rfc },
    orderBy: { date_upload: 'desc' },
    select:  PIECE_SELECT,
  });
}

async function deletePieceJointe(id_piece) {
  const avant = await prisma.piecesJointe.findUnique({
    where: { id_piece },
    select: { nom_piece: true, id_rfc: true },
  });

  await prisma.piecesJointe.delete({ where: { id_piece } });

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.DELETE,
    entite_type:  auditSvc.ENTITES.PIECE,
    entite_id:    id_piece,
    id_user:      null,
    ancienne_val: { nom_piece: avant?.nom_piece, id_rfc: avant?.id_rfc },
    nouvelle_val: null,
  });

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
  createCommentaire,
  getCommentairesByRfc,
  updateCommentaire,
  deleteCommentaire,
  upsertEvaluationRisque,
  getEvaluationRisqueByRfc,
  deleteEvaluationRisque,
  createPieceJointe,
  getPiecesJointesByRfc,
  deletePieceJointe,
};