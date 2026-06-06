'use strict';

/**
 * ============================================================
 * planning.service.js — Logique Planification & Ordonnancement
 * ============================================================
 * Fonctionnalités :
 *  - Calendrier des changements (semaine / mois / semestre)
 *  - Validation de date : blackout + weekend
 *  - CRUD BlackoutPeriod (admin)
 *  - Vue Change Manager (ses changements + blackouts visibles)
 *  - Détection de conflits entre changements
 * ============================================================
 */

const prisma    = require('./prisma.service');
const auditSvc  = require('./audit.service');
const { makeDisplayCode } = require('../utils/entity-code.utils');

const codeBlackout = () => makeDisplayCode('BLK');

// ── Selects ──────────────────────────────────────────────────

const BLACKOUT_SELECT = {
  id_blackout:   true,
  code_metier:   true,
  libelle:       true,
  type:          true,
  date_debut:    true,
  date_fin:      true,
  recurrent:     true,
  description:   true,
  date_creation: true,
  actif:         true,
  createur: {
    select: { id_user: true, nom_user: true, prenom_user: true, email_user: true },
  },
};

const CHANGEMENT_CAL_SELECT = {
  id_changement:   true,
  code_changement: true,
  date_debut:      true,
  date_fin_prevu:  true,
  date_fin_reelle: true,
  reussite:        true,
  statut: { select: { code_statut: true, libelle: true } },
  changeManager: { select: { id_user: true, nom_user: true, prenom_user: true } },
  environnement: { select: { nom_env: true } },
  planChangement: { select: { titre_plan: true } },
  rfc: {
    select: {
      id_rfc:    true,
      code_rfc:  true,
      titre_rfc: true,
      urgence:   true,
      typeRfc:   { select: { type: true } },
      evaluationRisque: { select: { score_risque: true } },
    },
  },
};

// ============================================================
// UTILITAIRES DATE
// ============================================================

/**
 * Retourne true si la date est un vendredi ou samedi (weekend algérien).
 * En Algérie : vendredi = 5 (getDay()), samedi = 6.
 */
function isWeekend(date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=dim, 1=lun, ..., 5=ven, 6=sam
  return day === 5 || day === 6;
}

/**
 * Retourne true si la date tombe dans une période blackout active.
 * Gère les blackouts récurrents (comparaison mois+jour seulement).
 */
async function isBlackedOut(date) {
  const d     = new Date(date);
  const mois  = d.getMonth() + 1; // 1-12
  const jour  = d.getDate();

  const blackouts = await prisma.blackoutPeriod.findMany({
    where: { actif: true },
    select: {
      date_debut: true,
      date_fin:   true,
      recurrent:  true,
    },
  });

  for (const b of blackouts) {
    if (b.recurrent) {
      // Comparer uniquement mois/jour
      const debutMois = new Date(b.date_debut).getMonth() + 1;
      const debutJour = new Date(b.date_debut).getDate();
      const finMois   = new Date(b.date_fin).getMonth() + 1;
      const finJour   = new Date(b.date_fin).getDate();

      // Construire des objets date dans l'année courante pour comparer
      const year      = d.getFullYear();
      const debutAnn  = new Date(year, debutMois - 1, debutJour);
      const finAnn    = new Date(year, finMois - 1, finJour);

      if (d >= debutAnn && d <= finAnn) return true;
    } else {
      const debut = new Date(b.date_debut);
      const fin   = new Date(b.date_fin);
      debut.setHours(0, 0, 0, 0);
      fin.setHours(23, 59, 59, 999);
      if (d >= debut && d <= fin) return true;
    }
  }

  return false;
}

/**
 * Vérifie si une plage de dates (debut → fin) est valide :
 *   - Ni weekend
 *   - Ni blackout
 * Retourne { valid: boolean, raison?: string }
 */
async function validatePlage(date_debut, date_fin_prevu) {
  if (!date_debut) return { valid: true }; // pas de date = pas de validation

  const debut = new Date(date_debut);
  const fin   = date_fin_prevu ? new Date(date_fin_prevu) : debut;

  // Itérer sur chaque jour de la plage
  const current = new Date(debut);
  while (current <= fin) {
    if (isWeekend(current)) {
      return {
        valid:  false,
        raison: `La date ${current.toISOString().split('T')[0]} est un weekend (vendredi/samedi). Les changements sont interdits le weekend.`,
        code:   'WEEKEND',
      };
    }
    if (await isBlackedOut(current)) {
      return {
        valid:  false,
        raison: `La date ${current.toISOString().split('T')[0]} est une période blackout (jour férié ou période critique).`,
        code:   'BLACKOUT',
      };
    }
    current.setDate(current.getDate() + 1);
  }

  return { valid: true };
}

// ============================================================
// CALENDRIER DES CHANGEMENTS
// ============================================================

/**
 * Retourne les changements dans une plage donnée.
 * @param {object} params
 *   { date_debut, date_fin, id_user? (pour filtrer par CM), statuts? }
 */
async function getCalendrier(params = {}) {
  const { date_debut, date_fin, id_user, statuts } = params;

  const where = {};

  // Filtre plage temporelle sur date_debut OU date_fin_prevu
  if (date_debut || date_fin) {
    where.OR = [
      {
        date_debut: {
          ...(date_debut && { gte: new Date(date_debut) }),
          ...(date_fin   && { lte: new Date(date_fin)   }),
        },
      },
      {
        date_fin_prevu: {
          ...(date_debut && { gte: new Date(date_debut) }),
          ...(date_fin   && { lte: new Date(date_fin)   }),
        },
      },
    ];
  }

  // Filtre Change Manager
  if (id_user) where.id_user = id_user;

  // Filtre statuts (exclure CLOTUREE par défaut si non précisé)
  if (statuts && Array.isArray(statuts) && statuts.length > 0) {
    where.statut = { code_statut: { in: statuts } };
  }

  const changements = await prisma.changement.findMany({
    where,
    select:  CHANGEMENT_CAL_SELECT,
    orderBy: { date_debut: 'asc' },
  });

  return changements;
}

/**
 * Vue semaine — 7 jours à partir de date_debut (lundi par défaut).
 */
async function getVueSemaine(date_ref, id_user = null) {
  const d = date_ref ? new Date(date_ref) : new Date();
  // Trouver le lundi de la semaine
  const day    = d.getDay();
  const diff   = day === 0 ? -6 : 1 - day; // lundi
  const lundi  = new Date(d);
  lundi.setDate(d.getDate() + diff);
  lundi.setHours(0, 0, 0, 0);

  const dimanche = new Date(lundi);
  dimanche.setDate(lundi.getDate() + 6);
  dimanche.setHours(23, 59, 59, 999);

  const [changements, blackouts] = await Promise.all([
    getCalendrier({ date_debut: lundi, date_fin: dimanche, id_user }),
    getBlackoutsInRange(lundi, dimanche),
  ]);

  return {
    periode: 'semaine',
    debut:   lundi.toISOString().split('T')[0],
    fin:     dimanche.toISOString().split('T')[0],
    changements,
    blackouts,
    weekends: _getWeekendDays(lundi, dimanche),
  };
}

/**
 * Vue mois.
 */
async function getVueMois(annee, mois, id_user = null) {
  const y = annee  || new Date().getFullYear();
  const m = (mois  || new Date().getMonth() + 1) - 1; // 0-indexed

  const debut = new Date(y, m, 1);
  const fin   = new Date(y, m + 1, 0, 23, 59, 59, 999);

  const [changements, blackouts] = await Promise.all([
    getCalendrier({ date_debut: debut, date_fin: fin, id_user }),
    getBlackoutsInRange(debut, fin),
  ]);

  return {
    periode:    'mois',
    debut:      debut.toISOString().split('T')[0],
    fin:        fin.toISOString().split('T')[0],
    annee:      Number(y),
    mois:       Number(m) + 1,
    changements,
    blackouts,
    weekends:   _getWeekendDays(debut, fin),
  };
}

/**
 * Vue semestre (6 mois).
 */
async function getVueSemestre(annee, semestre, id_user = null) {
  const y = annee    || new Date().getFullYear();
  const s = semestre || (new Date().getMonth() < 6 ? 1 : 2);

  const moisDebut = s === 1 ? 0 : 6;  // 0-indexed
  const debut     = new Date(y, moisDebut, 1);
  const fin       = new Date(y, moisDebut + 6, 0, 23, 59, 59, 999);

  const [changements, blackouts] = await Promise.all([
    getCalendrier({ date_debut: debut, date_fin: fin, id_user }),
    getBlackoutsInRange(debut, fin),
  ]);

  // Regrouper par mois pour le frontend
  const parMois = {};
  for (let i = 0; i < 6; i++) {
    const moisKey = new Date(y, moisDebut + i, 1).toISOString().split('T')[0].slice(0, 7);
    parMois[moisKey] = changements.filter(c => {
      const dateRef = c.date_debut || c.date_fin_prevu;
      if (!dateRef) return false;
      return new Date(dateRef).toISOString().startsWith(moisKey);
    });
  }

  return {
    periode:    'semestre',
    debut:      debut.toISOString().split('T')[0],
    fin:        fin.toISOString().split('T')[0],
    annee:      Number(y),
    semestre:   Number(s),
    changements,
    par_mois:   parMois,
    blackouts,
    weekends:   _getWeekendDays(debut, fin),
  };
}

/**
 * Détecte les conflits entre changements sur des plages qui se chevauchent.
 * Utile pour l'admin avant de valider.
 */
async function detecterConflits(date_debut, date_fin, id_changement_exclu = null) {
  const where = {
    AND: [
      { date_debut:    { lte: new Date(date_fin)   } },
      { date_fin_prevu:{ gte: new Date(date_debut) } },
      { statut: { code_statut: { notIn: ['CLOTUREE', 'EN_ECHEC'] } } },
    ],
  };
  if (id_changement_exclu) {
    where.AND.push({ id_changement: { not: id_changement_exclu } });
  }

  return prisma.changement.findMany({
    where,
    select: CHANGEMENT_CAL_SELECT,
  });
}

// ── Helpers ──────────────────────────────────────────────────

function _getWeekendDays(debut, fin) {
  const days = [];
  const cur  = new Date(debut);
  while (cur <= fin) {
    if (isWeekend(cur)) days.push(cur.toISOString().split('T')[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return days;
}

async function getBlackoutsInRange(debut, fin) {
  const annee = debut.getFullYear();

  const all = await prisma.blackoutPeriod.findMany({
    where:  { actif: true },
    select: BLACKOUT_SELECT,
  });

  // Pour les récurrents, projeter dans l'année courante
  return all.filter(b => {
    let bDebut = new Date(b.date_debut);
    let bFin   = new Date(b.date_fin);

    if (b.recurrent) {
      bDebut = new Date(annee, bDebut.getMonth(), bDebut.getDate());
      bFin   = new Date(annee, bFin.getMonth(),   bFin.getDate(), 23, 59, 59);
    } else {
      bFin.setHours(23, 59, 59);
    }

    return bDebut <= fin && bFin >= debut;
  });
}

// ============================================================
// CRUD BLACKOUT PERIOD
// ============================================================

async function getAllBlackouts(inclureInactifs = false) {
  const where = inclureInactifs ? {} : { actif: true };
  return prisma.blackoutPeriod.findMany({
    where,
    select:  BLACKOUT_SELECT,
    orderBy: { date_debut: 'asc' },
  });
}

async function getBlackoutById(id_blackout) {
  const b = await prisma.blackoutPeriod.findUnique({
    where:  { id_blackout },
    select: BLACKOUT_SELECT,
  });
  if (!b) {
    const e = new Error('BlackoutPeriod introuvable.'); e.code = 'NOT_FOUND'; throw e;
  }
  return b;
}

async function createBlackout(data, id_user) {
  const {
    libelle, type, date_debut, date_fin,
    recurrent = false, description = null,
  } = data;

  // Validation : date_fin >= date_debut
  if (new Date(date_fin) < new Date(date_debut)) {
    const e = new Error('date_fin doit être >= date_debut.'); e.code = 'INVALID_DATES'; throw e;
  }

  const blackout = await prisma.blackoutPeriod.create({
    data: {
      code_metier:  codeBlackout(),
      libelle:      libelle.trim(),
      type,
      date_debut:   new Date(date_debut),
      date_fin:     new Date(date_fin),
      recurrent,
      description,
      actif:        true,
      id_user:      id_user ?? null,
    },
    select: BLACKOUT_SELECT,
  });

  await auditSvc.logAction({
    action:       'CREATE',
    entite_type:  'BLACKOUT',
    entite_id:    blackout.id_blackout,
    id_user,
    ancienne_val: null,
    nouvelle_val: { libelle, type, date_debut, date_fin, recurrent },
  });

  return blackout;
}

async function updateBlackout(id_blackout, data, id_user) {
  const avant = await getBlackoutById(id_blackout);

  const allowed   = ['libelle','type','date_debut','date_fin','recurrent','description','actif'];
  const updateData = {};
  for (const k of allowed) {
    if (data[k] !== undefined) {
      if (k === 'date_debut' || k === 'date_fin') updateData[k] = new Date(data[k]);
      else updateData[k] = data[k];
    }
  }

  if (Object.keys(updateData).length === 0) {
    const e = new Error('Aucun champ valide.'); e.code = 'NO_VALID_FIELDS'; throw e;
  }

  const fin   = updateData.date_fin   ? new Date(updateData.date_fin)   : new Date(avant.date_fin);
  const debut = updateData.date_debut ? new Date(updateData.date_debut) : new Date(avant.date_debut);
  if (fin < debut) {
    const e = new Error('date_fin doit être >= date_debut.'); e.code = 'INVALID_DATES'; throw e;
  }

  const blackout = await prisma.blackoutPeriod.update({
    where:  { id_blackout },
    data:   updateData,
    select: BLACKOUT_SELECT,
  });

  await auditSvc.logAction({
    action:       'UPDATE',
    entite_type:  'BLACKOUT',
    entite_id:    id_blackout,
    id_user,
    ancienne_val: { libelle: avant.libelle, date_debut: avant.date_debut, date_fin: avant.date_fin, actif: avant.actif },
    nouvelle_val: updateData,
  });

  return blackout;
}

async function deleteBlackout(id_blackout, id_user) {
  const avant = await getBlackoutById(id_blackout);

  // Soft delete — désactiver plutôt que supprimer (audit trail)
  const blackout = await prisma.blackoutPeriod.update({
    where:  { id_blackout },
    data:   { actif: false },
    select: BLACKOUT_SELECT,
  });

  await auditSvc.logAction({
    action:       'DELETE',
    entite_type:  'BLACKOUT',
    entite_id:    id_blackout,
    id_user,
    ancienne_val: { libelle: avant.libelle, actif: true },
    nouvelle_val: { actif: false },
  });

  return { deleted: true, id_blackout, libelle: avant.libelle };
}

module.exports = {
  // Calendrier
  getCalendrier,
  getVueSemaine,
  getVueMois,
  getVueSemestre,
  detecterConflits,
  // Validation
  validatePlage,
  isWeekend,
  isBlackedOut,
  // Blackouts
  getAllBlackouts,
  getBlackoutById,
  createBlackout,
  updateBlackout,
  deleteBlackout,
};