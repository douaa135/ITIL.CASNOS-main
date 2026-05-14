'use strict';

/**
 * ============================================================
 * planning.controller.js — Orchestration Planning & Blackouts
 * ============================================================
 * Validations body → planning.middleware.js (intégré ici en inline
 * pour garder la convention du projet : middleware séparé quand volumineux)
 * Logique métier  → planning.service.js
 * Ici             → appel service + réponse HTTP
 * ============================================================
 */

const planningSvc = require('../services/planning.service');
const R           = require('../utils/response.utils');

// ============================================================
// CALENDRIER
// ============================================================

/**
 * GET /api/planning/semaine?date=2025-05-12&id_user=...
 * Accessible : ADMIN voit tout, CHANGE_MANAGER voit ses changements.
 */
const getVueSemaine = async (req, res) => {
  try {
    const { date } = req.query;

    // CHANGE_MANAGER ne voit que ses propres changements
    const id_user = _resoudreIdUser(req);

    const data = await planningSvc.getVueSemaine(date, id_user);
    return R.success(res, data, `Calendrier semaine (${data.debut} → ${data.fin}).`);
  } catch (err) {
    console.error('[PLANNING] getVueSemaine :', err);
    return R.serverError(res);
  }
};

/**
 * GET /api/planning/mois?annee=2025&mois=6&id_user=...
 */
const getVueMois = async (req, res) => {
  try {
    const { annee, mois } = req.query;
    const id_user = _resoudreIdUser(req);

    const data = await planningSvc.getVueMois(annee, mois, id_user);
    return R.success(res, data, `Calendrier mois ${data.mois}/${data.annee}.`);
  } catch (err) {
    console.error('[PLANNING] getVueMois :', err);
    return R.serverError(res);
  }
};

/**
 * GET /api/planning/semestre?annee=2025&semestre=1
 */
const getVueSemestre = async (req, res) => {
  try {
    const { annee, semestre } = req.query;
    const id_user = _resoudreIdUser(req);

    const data = await planningSvc.getVueSemestre(annee, semestre, id_user);
    return R.success(res, data, `Calendrier semestre ${data.semestre} / ${data.annee}.`);
  } catch (err) {
    console.error('[PLANNING] getVueSemestre :', err);
    return R.serverError(res);
  }
};

/**
 * GET /api/planning/calendrier?date_debut=...&date_fin=...
 * Plage libre — admin uniquement.
 */
const getCalendrier = async (req, res) => {
  try {
    const { date_debut, date_fin, id_user: qUser, statuts } = req.query;

    if (!date_debut || !date_fin) {
      return R.badRequest(res, 'date_debut et date_fin sont obligatoires.', 'MISSING_DATES');
    }

    const id_user = _resoudreIdUser(req, qUser);
    const data    = await planningSvc.getCalendrier({
      date_debut, date_fin, id_user,
      statuts: statuts ? statuts.split(',') : undefined,
    });

    return R.success(res, { changements: data, total: data.length }, 'Changements récupérés.');
  } catch (err) {
    console.error('[PLANNING] getCalendrier :', err);
    return R.serverError(res);
  }
};

/**
 * POST /api/planning/valider-date
 * Body : { date_debut, date_fin? }
 * Vérifie si la plage est autorisée (pas weekend, pas blackout).
 */
const validerDate = async (req, res) => {
  try {
    const { date_debut, date_fin } = req.body;

    if (!date_debut) {
      return R.badRequest(res, 'date_debut est obligatoire.', 'MISSING_DATE');
    }

    const validation = await planningSvc.validatePlage(date_debut, date_fin || date_debut);

    if (!validation.valid) {
      return R.success(res, {
        valide:  false,
        raison:  validation.raison,
        code:    validation.code,
      }, 'Date non autorisée.');
    }

    // Vérifier également les conflits
    const conflits = await planningSvc.detecterConflits(date_debut, date_fin || date_debut);

    return R.success(res, {
      valide:   true,
      conflits: conflits.length > 0 ? conflits : [],
      nb_conflits: conflits.length,
      message: conflits.length > 0
        ? `${conflits.length} changement(s) déjà planifié(s) sur cette plage.`
        : 'Plage disponible.',
    }, 'Validation effectuée.');
  } catch (err) {
    console.error('[PLANNING] validerDate :', err);
    return R.serverError(res);
  }
};

/**
 * GET /api/planning/conflits?date_debut=...&date_fin=...&exclu=id_changement
 */
const getConflits = async (req, res) => {
  try {
    const { date_debut, date_fin, exclu } = req.query;

    if (!date_debut || !date_fin) {
      return R.badRequest(res, 'date_debut et date_fin sont obligatoires.', 'MISSING_DATES');
    }

    const conflits = await planningSvc.detecterConflits(date_debut, date_fin, exclu || null);
    return R.success(res, { conflits, total: conflits.length }, 'Conflits détectés.');
  } catch (err) {
    console.error('[PLANNING] getConflits :', err);
    return R.serverError(res);
  }
};

// ============================================================
// BLACKOUTS
// ============================================================

/**
 * GET /api/planning/blackouts?inclure_inactifs=true
 */
const getAllBlackouts = async (req, res) => {
  try {
    const inclureInactifs = req.query.inclure_inactifs === 'true';
    const blackouts = await planningSvc.getAllBlackouts(inclureInactifs);
    return R.success(res, { blackouts, total: blackouts.length }, 'Blackouts récupérés.');
  } catch (err) {
    console.error('[PLANNING] getAllBlackouts :', err);
    return R.serverError(res);
  }
};

/**
 * GET /api/planning/blackouts/:id_blackout
 */
const getBlackoutById = async (req, res) => {
  try {
    const blackout = await planningSvc.getBlackoutById(req.params.id_blackout);
    return R.success(res, { blackout }, 'Blackout récupéré.');
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[PLANNING] getBlackoutById :', err);
    return R.serverError(res);
  }
};

/**
 * POST /api/planning/blackouts
 * Admin uniquement.
 * Body : { libelle, type, date_debut, date_fin, recurrent?, description? }
 */
const createBlackout = async (req, res) => {
  try {
    const { libelle, type, date_debut, date_fin } = req.body;

    // Validation
    if (!libelle || !type || !date_debut || !date_fin) {
      return R.badRequest(
        res,
        'Champs obligatoires : libelle, type, date_debut, date_fin.',
        'MISSING_FIELDS'
      );
    }

    const TYPES_VALIDES = ['JOUR_FERIE', 'PERIODE_CRITIQUE', 'MAINTENANCE', 'AUTRE'];
    if (!TYPES_VALIDES.includes(type)) {
      return R.badRequest(
        res,
        `type invalide. Valeurs : ${TYPES_VALIDES.join(', ')}.`,
        'INVALID_TYPE'
      );
    }

    const blackout = await planningSvc.createBlackout(req.body, req.user.id_user);
    return R.success(res, { blackout }, 'Blackout créé avec succès.', 201);
  } catch (err) {
    if (err.code === 'INVALID_DATES') return R.badRequest(res, err.message, err.code);
    console.error('[PLANNING] createBlackout :', err);
    return R.serverError(res);
  }
};

/**
 * PUT /api/planning/blackouts/:id_blackout
 * Admin uniquement.
 */
const updateBlackout = async (req, res) => {
  try {
    const blackout = await planningSvc.updateBlackout(
      req.params.id_blackout,
      req.body,
      req.user.id_user
    );
    return R.success(res, { blackout }, 'Blackout mis à jour.');
  } catch (err) {
    if (err.code === 'NOT_FOUND')       return R.notFound(res, err.message);
    if (err.code === 'NO_VALID_FIELDS') return R.badRequest(res, err.message, err.code);
    if (err.code === 'INVALID_DATES')   return R.badRequest(res, err.message, err.code);
    console.error('[PLANNING] updateBlackout :', err);
    return R.serverError(res);
  }
};

/**
 * DELETE /api/planning/blackouts/:id_blackout
 * Admin uniquement. Soft-delete (actif = false).
 */
const deleteBlackout = async (req, res) => {
  try {
    const result = await planningSvc.deleteBlackout(
      req.params.id_blackout,
      req.user.id_user
    );
    return R.success(res, result, `Blackout "${result.libelle}" désactivé.`);
  } catch (err) {
    if (err.code === 'NOT_FOUND') return R.notFound(res, err.message);
    console.error('[PLANNING] deleteBlackout :', err);
    return R.serverError(res);
  }
};

// ── Helper privé ─────────────────────────────────────────────

/**
 * Si l'utilisateur est CHANGE_MANAGER → filtrer sur ses propres changements.
 * Si ADMIN → peut passer un id_user en query param, ou voir tout (null).
 */
function _resoudreIdUser(req, queryUser = null) {
  const roles = req.user?.roles || [];

  if (roles.includes('ADMIN')) {
    // Admin peut filtrer par un CM précis ou voir tout
    return queryUser || null;
  }

  if (roles.includes('CHANGE_MANAGER')) {
    return req.user.id_user;
  }

  // Autres rôles : leurs propres changements
  return req.user.id_user;
}

module.exports = {
  // Calendrier
  getVueSemaine,
  getVueMois,
  getVueSemestre,
  getCalendrier,
  validerDate,
  getConflits,
  // Blackouts
  getAllBlackouts,
  getBlackoutById,
  createBlackout,
  updateBlackout,
  deleteBlackout,
};