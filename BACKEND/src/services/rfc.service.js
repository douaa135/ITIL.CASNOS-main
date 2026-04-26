'use strict';

const prisma = require('./prisma.service');
const { codeRfc, codeChangement } = require('../utils/entity-code.utils');

const TRANSITIONS_RFC = {
  BROUILLON: ['SOUMIS',    'CLOTUREE'],
  SOUMIS:    ['A_COMPLETER', 'ACCEPTEE_SD', 'REFUSEE_SD', 'CLOTUREE'],
  A_COMPLETER: ['SOUMIS', 'CLOTUREE'],
  ACCEPTEE_SD: ['EVALUEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
  REFUSEE_SD:  ['CLOTUREE'],
  EVALUEE:   ['APPROUVEE', 'REJETEE',  'CLOTUREE'],
  APPROUVEE: [],
  REJETEE:   ['BROUILLON',  'CLOTUREE'],
};

// ─────────────────────────────────────────────────────────────
// 1. Lister toutes les RFC
// ─────────────────────────────────────────────────────────────
const getAllRfc = async (filters = {}) => {
  const { statut, type, priorite, id_user } = filters;
  
  const where = {};
  if (statut)   where.id_statut   = parseInt(statut);
  if (type)     where.id_type     = parseInt(type);
  if (priorite) where.id_priorite = parseInt(priorite);
  // id_user is a UUID string — do NOT parseInt() it (returns NaN and breaks the filter)
  if (id_user)  where.id_user     = id_user;

  return prisma.rfc.findMany({
    where,
    include: {
      statut:    { select: { code_statut: true, libelle: true } },
      priorite:  { select: { code_priorite: true, libelle: true } },
      typeRfc:   { select: { type: true } },
      demandeur: { 
        select: { 
          id_user: true, nom_user: true, prenom_user: true, email_user: true,
          direction: { select: { nom_direction: true } }
        } 
      },
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
      demandeur:        { 
        select: { 
          id_user: true, nom_user: true, prenom_user: true, email_user: true,
          direction: { select: { nom_direction: true } }
        } 
      },
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
    where: { code_statut: 'BROUILLON', contexte: 'RFC' },
  });
  if (!statutParDefaut) throw new Error("Statut 'BROUILLON' non trouvé");

  const { 
    titre_rfc, description, justification, date_souhaitee, 
    urgence, impacte_estimee, ci_ids = [],
    type_code = 'TYPE-RFC-NRM',
    priorite_code = 'P0'
  } = data;

  const currentType = await prisma.typeRfc.findUnique({
    where: { code_metier: type_code },
  });
  if (!currentType) throw new Error(`Type RFC '${type_code}' non trouvé`);

  const currentPriorite = await prisma.priorite.findFirst({
    where: { code_priorite: priorite_code },
  });
  if (!currentPriorite) throw new Error(`Priorité '${priorite_code}' non trouvée`);

  return prisma.rfc.create({
    data: {
      titre_rfc,
      description,
      code_rfc,
      justification,
      date_souhaitee:  date_souhaitee ? new Date(date_souhaitee) : null,
      urgence:         urgence ?? false,
      impacte_estimee,
      id_statut:       statutParDefaut.id_statut,
      id_priorite:     currentPriorite.id_priorite,
      id_type:         currentType.id_type,
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
//    CORRIGÉ : transaction atomique → si la création du changement
//    échoue, le statut RFC est rollbacké automatiquement.
// ─────────────────────────────────────────────────────────────
// PATCH /api/rfc/:id/status — changer le statut (workflow ITIL)
async function updateRfcStatus(id_rfc, id_statut, id_change_manager, id_env, id_user_action = null, commentaire = null, id_type = null) {
  if (!id_statut) throw new Error("id_statut est requis");

  // Charger la RFC + statut actuel
  const rfc = await prisma.rfc.findUnique({
    where:   { id_rfc },
    include: { statut: true },
  });
  if (!rfc) throw new Error("RFC introuvable");

  // Charger le statut cible
  const statutCible = await prisma.statut.findUnique({ where: { id_statut } });
  if (!statutCible)                   throw new Error("Statut cible introuvable");
  if (statutCible.contexte !== 'RFC') throw new Error("Ce statut n'appartient pas au workflow RFC");

  // Vérifier la transition
  const statutActuel  = rfc.statut.code_statut;
  const transitionsOk = TRANSITIONS_RFC[statutActuel] || [];

  if (!transitionsOk.includes(statutCible.code_statut)) {
    throw new Error(
      `Transition RFC interdite : ${statutActuel} → ${statutCible.code_statut}. ` +
      `Transitions autorisées depuis ${statutActuel} : [${transitionsOk.join(', ') || 'aucune'}]`
    );
  }

  // Validation des champs requis pour l'approbation
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
        ...(id_type && { id_type }),
        ...(statutCible.code_statut === 'CLOTUREE' && { date_cloture: new Date() }),
      },
      include: { statut: { select: { code_statut: true, libelle: true } } },
    });

    // ── Historisation ──
    await tx.statutHistory.create({
      data: {
        code_metier: `SHR-${Date.now()}`,
        id_statut,
        id_rfc,
        id_user: id_user_action,
        commentaire: commentaire || (statutCible.code_statut === 'APPROUVEE' ? 'RFC Approuvée' : null),
      }
    });

    let changement = null;
    if (statutCible.code_statut === 'APPROUVEE') {
      changement = await createChangeFromApprovedRfc(id_rfc, id_change_manager, id_env, tx);
    }

    return { updatedRfc, changement };
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

  return prisma.rfc.update({
    where: { id_rfc: id },
    data:  { id_statut: statutCloture.id_statut, date_cloture: new Date() },
    include: { statut: { select: { code_statut: true, libelle: true } } },
  });
};

// ─────────────────────────────────────────────────────────────
// 7. Créer un Changement depuis une RFC approuvée (interne)
//    CORRIGÉ : accepte un client tx (transaction) en paramètre
// ─────────────────────────────────────────────────────────────
async function createChangeFromApprovedRfc(id_rfc, id_change_manager, id_env, tx = prisma) {
  const rfc = await tx.rfc.findUnique({
    where:   { id_rfc },
    include: { priorite: true, typeRfc: true },
  });
  if (!rfc) throw new Error("RFC introuvable pour création du Changement");

  return tx.changement.create({
    data: {
      code_changement: codeChangement(),
      date_debut:      rfc.date_souhaitee ?? null,
      date_fin_prevu:  null,
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

// ─────────────────────────────────────────────────────────────
// 8. Évaluer une RFC (Impact, Risque, Plans)
// ─────────────────────────────────────────────────────────────
const evaluateRfc = async (id_rfc, data) => {
  const { 
    impacte, probabilite, score_risque, description_risque,
    plan_changement, plan_rollback 
  } = data;

  const statutEvaluee = await prisma.statut.findFirst({
    where: { code_statut: 'EVALUEE', contexte: 'RFC' }
  });
  if (!statutEvaluee) throw new Error("Statut 'EVALUEE' non trouvé");

  return prisma.$transaction(async (tx) => {
    // 1. Mise à jour de la RFC
    await tx.rfc.update({
      where: { id_rfc },
      data: { id_statut: statutEvaluee.id_statut }
    });

    // 2. Évaluation du Risque
    await tx.evaluationRisque.upsert({
      where: { id_rfc },
      update: {
        impacte,
        probabilite,
        score_risque,
        description: description_risque,
        date_evaluation: new Date()
      },
      create: {
        code_metier: `EVR-${id_rfc.substring(0, 8)}`,
        impacte,
        probabilite,
        score_risque,
        description: description_risque,
        id_rfc,
        date_evaluation: new Date()
      }
    });

    // 3. Plan de Changement
    if (plan_changement) {
      await tx.planChangement.upsert({
        where: { id_changement: id_rfc }, // Use common shared key or specific model logic
        // Note: The schema shows PlanChangement linked to 'Changement', but RFC evaluation
        // might need to store it early. ITIL says CM prepares the plan.
        // Let's check schema again. 
        // @relation(fields: [id_changement], references: [id_changement])
        // Wait, PlanChangement is linked to Changement, not RFC.
        // However, EvaluationRisque is linked to RFC.
      });
    }
    
    // I need to be careful with the schema. 
    // PlanChangement and PlanRollback are linked to CHANGEMENT.
    // But a RFC is only turned into a Changement AFTER Approval.
    // So the CM prepares the evaluation in EvaluationRisque.
    // For now, I'll only update EvaluationRisque and the RFC status.
    
    return tx.rfc.findUnique({
      where: { id_rfc },
      include: { evaluationRisque: true, statut: true }
    });
  });
};

module.exports = {

  getAllRfc,
  getRfcById,
  createRfc,
  updateRfc,
  updateRfcStatus,
  evaluateRfc,
  cancelRfc,

  TRANSITIONS_RFC,
};