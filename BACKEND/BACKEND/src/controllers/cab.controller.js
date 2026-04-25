'use strict';

/**
 * ============================================================
 * cab.controller.js — Orchestration CAB
 * ============================================================
 * Validations   → cab.middleware.js
 * Logique DB    → cab.service.js
 * Ici           → appel service + réponse HTTP
 * ============================================================
 */

const prisma     = require('../services/prisma.service')
const cabService = require('../services/cab.service');
const R          = require('../utils/response.utils');

// ============================================================
// CAB
// ============================================================

const createCab = async (req, res) => {
  try {
    const cab = await cabService.createCab(req.body);
    return R.success(res, { cab }, 'CAB créé avec succès.', 201);
  } catch (err) {
    console.error('[createCab]', err);
    return R.serverError(res);
  }
};

const getAllCabs = async (req, res) => {
  try {
    const cabs = await cabService.getAllCabs();
    return R.success(res, { cabs, total: cabs.length }, 'CABs récupérés avec succès.');
  } catch (err) {
    console.error('[getAllCabs]', err);
    return R.serverError(res);
  }
};

const getCabById = async (req, res) => {
  try {
    const cab = await cabService.getCabById(req.params.id_cab);
    return R.success(res, { cab }, 'CAB récupéré avec succès.');
  } catch (err) {
    console.error('[getCabById]', err);
    return R.serverError(res);
  }
};


// ============================================================
// MEMBRES
// ============================================================

/**
 * POST /api/cab/:id_cab/membres
 * Ajoute un membre au CAB.
 * Body : { id_user, role?, date_adhesion? }
 */
const addMembre = async (req, res) => {
  try {
    // Bloquer si déjà membre
    const existant = await prisma.membreCab.findUnique({
      where: { id_cab_id_user: { id_cab: req.params.id_cab, id_user: req.body.id_user } },
    });
    if (existant) {
      return R.error(res, 'Cet utilisateur est déjà membre de ce CAB.', 409, 'ALREADY_MEMBRE');
    }

    const membre = await cabService.addMembre(req.params.id_cab, req.body);
    return R.success(res, { membre }, 'Membre ajouté au CAB avec succès.', 201);
  } catch (err) {
    console.error('[addMembre]', err);
    return R.serverError(res);
  }
};

const getMembresByCab = async (req, res) => {
  try {
    const membres = await cabService.getMembresByCab(req.params.id_cab);
    return R.success(res, { membres, total: membres.length }, 'Membres récupérés avec succès.');
  } catch (err) {
    console.error('[getMembresByCab]', err);
    return R.serverError(res);
  }
};

const removeMembre = async (req, res) => {
  try {
    const result = await cabService.removeMembre(req.params.id_cab, req.params.id_user);
    return R.success(res, result, 'Membre retiré du CAB avec succès.');
  } catch (err) {
    // P2025 = record not found (Prisma)
    if (err.code === 'P2025') {
      return R.notFound(res, 'Cet utilisateur n\'est pas membre de ce CAB.');
    }
    console.error('[removeMembre]', err);
    return R.serverError(res);
  }
};


// ============================================================
// RÉUNIONS
// ============================================================

const createReunion = async (req, res) => {
  try {
    const reunion = await cabService.createReunion(req.params.id_cab, req.body);
    return R.success(res, { reunion }, 'Réunion CAB créée avec succès.', 201);
  } catch (err) {
    console.error('[createReunion]', err);
    return R.serverError(res);
  }
};

const getReunionsByCab = async (req, res) => {
  try {
    const reunions = await cabService.getReunionsByCab(req.params.id_cab);
    return R.success(res, { reunions, total: reunions.length }, 'Réunions récupérées avec succès.');
  } catch (err) {
    console.error('[getReunionsByCab]', err);
    return R.serverError(res);
  }
};

const getReunionById = async (req, res) => {
  try {
    // req.reunion (injecté par checkReunionExists) contient la version légère.
    // On appelle le service pour la version complète avec votes/décisions.
    const reunion = await cabService.getReunionById(req.params.id_reunion);
    return R.success(res, { reunion }, 'Réunion récupérée avec succès.');
  } catch (err) {
    console.error('[getReunionById]', err);
    return R.serverError(res);
  }
};

const updateReunion = async (req, res) => {
  try {
    const reunion = await cabService.updateReunion(req.params.id_reunion, req.body);
    return R.success(res, { reunion }, 'Réunion mise à jour avec succès.');
  } catch (err) {
    console.error('[updateReunion]', err);
    return R.serverError(res);
  }
};


// ============================================================
// AGENDA
// ============================================================

/**
 * POST /api/reunions/:id_reunion/rfcs
 * Inscrit une RFC à l'ordre du jour.
 * Body : { id_rfc }
 */
const addRfcToAgenda = async (req, res) => {
  try {
    // Vérifier doublon agenda
    const { id_reunion } = req.params;
    const id_rfc         = req.rfc.id_rfc;

    const existant = await prisma.rfcReunion.findUnique({
      where: { id_rfc_id_reunion: { id_rfc, id_reunion } },
    });
    if (existant) {
      return R.error(res, 'Cette RFC est déjà à l\'ordre du jour de cette réunion.', 409, 'RFC_ALREADY_ON_AGENDA');
    }

    const rfc = await cabService.addRfcToAgenda(id_reunion, id_rfc);
    return R.success(res, { rfc }, 'RFC ajoutée à l\'ordre du jour.', 201);
  } catch (err) {
    console.error('[addRfcToAgenda]', err);
    return R.serverError(res);
  }
};

const getRfcsByReunion = async (req, res) => {
  try {
    const rfcs = await cabService.getRfcsByReunion(req.params.id_reunion);
    return R.success(res, { rfcs, total: rfcs.length }, 'RFCs de la réunion récupérées.');
  } catch (err) {
    console.error('[getRfcsByReunion]', err);
    return R.serverError(res);
  }
};

const removeRfcFromAgenda = async (req, res) => {
  try {
    const result = await cabService.removeRfcFromAgenda(req.params.id_reunion, req.params.id_rfc);
    return R.success(res, result, 'RFC retirée de l\'ordre du jour.');
  } catch (err) {
    if (err.code === 'P2025') return R.notFound(res, 'Cette RFC n\'est pas à l\'ordre du jour.');
    console.error('[removeRfcFromAgenda]', err);
    return R.serverError(res);
  }
};


// ============================================================
// PARTICIPANTS
// ============================================================

const addParticipant = async (req, res) => {
  try {
    const { id_reunion } = req.params;
    const id_user        = req.targetUser.id_user;

    // Vérifier doublon
    const existant = await prisma.participant.findUnique({
      where: { id_reunion_id_user: { id_reunion, id_user } },
    });
    if (existant) {
      return R.error(res, 'Cet utilisateur participe déjà à cette réunion.', 409, 'ALREADY_PARTICIPANT');
    }

    const user = await cabService.addParticipant(id_reunion, id_user);
    return R.success(res, { participant: user }, 'Participant ajouté à la réunion.', 201);
  } catch (err) {
    console.error('[addParticipant]', err);
    return R.serverError(res);
  }
};

const getParticipantsByReunion = async (req, res) => {
  try {
    const participants = await cabService.getParticipantsByReunion(req.params.id_reunion);
    return R.success(res, { participants, total: participants.length }, 'Participants récupérés.');
  } catch (err) {
    console.error('[getParticipantsByReunion]', err);
    return R.serverError(res);
  }
};

const removeParticipant = async (req, res) => {
  try {
    const result = await cabService.removeParticipant(req.params.id_reunion, req.params.id_user);
    return R.success(res, result, 'Participant retiré de la réunion.');
  } catch (err) {
    if (err.code === 'P2025') return R.notFound(res, 'Ce participant n\'est pas inscrit à cette réunion.');
    console.error('[removeParticipant]', err);
    return R.serverError(res);
  }
};


// ============================================================
// VOTES
// ============================================================

/**
 * POST /api/reunions/:id_reunion/rfcs/:id_rfc/votes
 * Enregistre le vote d'un membre sur une RFC.
 * Body : { id_user, valeur_vote }
 * Middleware garantit : RFC sur agenda, utilisateur membre CAB, pas de double vote.
 */
const castVote = async (req, res) => {
  try {
    const { id_reunion, id_rfc } = req.params;
    const vote = await cabService.castVote(id_reunion, id_rfc, req.body);

    const labels = { APPROUVER: 'approuvé', REJETER: 'rejeté', ABSTENTION: 'abstenu' };
    return R.success(res, { vote }, `Vote enregistré : ${labels[vote.valeur_vote]}.`, 201);
  } catch (err) {
    console.error('[castVote]', err);
    return R.serverError(res);
  }
};

const getVotesByReunion = async (req, res) => {
  try {
    const votes = await cabService.getVotesByReunion(req.params.id_reunion);
    return R.success(res, { votes, total: votes.length }, 'Votes récupérés.');
  } catch (err) {
    console.error('[getVotesByReunion]', err);
    return R.serverError(res);
  }
};

const getVotesByRfc = async (req, res) => {
  try {
    const { id_reunion, id_rfc } = req.params;
    const votes = await cabService.getVotesByRfc(id_reunion, id_rfc);
    return R.success(res, { votes, total: votes.length }, 'Votes sur la RFC récupérés.');
  } catch (err) {
    console.error('[getVotesByRfc]', err);
    return R.serverError(res);
  }
};


// ============================================================
// DÉCISIONS
// ============================================================

/**
 * POST /api/reunions/:id_reunion/rfcs/:id_rfc/decision
 * Enregistre la décision finale du Change Manager sur une RFC.
 * Body : { decision, motif? }
 * Middleware garantit : RFC sur agenda, pas de double décision.
 */
const createDecision = async (req, res) => {
  try {
    const { id_reunion, id_rfc } = req.params;
    const decision = await cabService.createDecision(id_reunion, id_rfc, req.body);

    const labels = { APPROUVER: 'approuvée', REJETER: 'rejetée', REPORTER: 'reportée' };
    return R.success(res, { decision }, `RFC ${labels[decision.decision]} avec succès.`, 201);
  } catch (err) {
    console.error('[createDecision]', err);
    return R.serverError(res);
  }
};

const getDecisionsByReunion = async (req, res) => {
  try {
    const decisions = await cabService.getDecisionsByReunion(req.params.id_reunion);
    return R.success(res, { decisions, total: decisions.length }, 'Décisions récupérées.');
  } catch (err) {
    console.error('[getDecisionsByReunion]', err);
    return R.serverError(res);
  }
};

const getDecisionByRfc = async (req, res) => {
  try {
    const { id_reunion, id_rfc } = req.params;
    const decision = await cabService.getDecisionByRfc(id_reunion, id_rfc);

    if (!decision) return R.notFound(res, 'Aucune décision enregistrée pour cette RFC dans cette réunion.');

    return R.success(res, { decision }, 'Décision récupérée.');
  } catch (err) {
    console.error('[getDecisionByRfc]', err);
    return R.serverError(res);
  }
};


module.exports = {
  createCab, getAllCabs, getCabById,
  addMembre, getMembresByCab, removeMembre,
  createReunion, getReunionsByCab, getReunionById, updateReunion,
  addRfcToAgenda, getRfcsByReunion, removeRfcFromAgenda,
  addParticipant, getParticipantsByReunion, removeParticipant,
  castVote, getVotesByReunion, getVotesByRfc,
  createDecision, getDecisionsByReunion, getDecisionByRfc,
};