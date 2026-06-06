'use strict';

/**
 * ============================================================
 * audit.service.js — Journal d'audit centralisé ITIL
 * ============================================================
 * Principe : NON BLOQUANT. Une erreur d'audit ne perturbe
 * jamais l'opération principale.
 *
 * AMÉLIORATION v2 :
 *  - id_user n'est plus obligatoire (actions système sans acteur)
 *  - Sérialisation BigInt incluse
 *  - getAuditTrailByRfc() remonte toute la chaîne RFC → tout
 * ============================================================
 */

const prisma = require('./prisma.service');
const { codeAuditLog } = require('../utils/entity-code.utils');

// ─── Actions standardisées ────────────────────────────────────
const ACTIONS = {
  CREATE:         'CREATE',
  UPDATE:         'UPDATE',
  DELETE:         'DELETE',
  STATUS_CHANGED: 'STATUS_CHANGED',
  APPROVE:        'APPROVE',
  REJECT:         'REJECT',
  CANCEL:         'CANCEL',
  VOTE:           'VOTE',
  DECISION:       'DECISION',
  ESCALADE:       'ESCALADE',
  COMMENT:        'COMMENT',
  ATTACHMENT:     'ATTACHMENT',
  RISK_EVAL:      'RISK_EVAL',
  PIR_CREATE:     'PIR_CREATE',
  TEST_CREATE:    'TEST_CREATE',
  CLOTURE:        'CLOTURE',
};

// ─── Types d'entités standardisés ─────────────────────────────
const ENTITES = {
  RFC:              'RFC',
  CHANGEMENT:       'CHANGEMENT',
  TACHE:            'TACHE',
  JOURNAL:          'JOURNAL',
  REUNION:          'REUNION',
  VOTE:             'VOTE',
  DECISION:         'DECISION',
  COMMENTAIRE:      'COMMENTAIRE',
  PIECE:            'PIECE_JOINTE',
  EVALUATION:       'EVALUATION_RISQUE',
  PIR:              'PIR',
  TEST:             'TEST',
  PLAN_CHANGEMENT:  'PLAN_CHANGEMENT',
  PLAN_ROLLBACK:    'PLAN_ROLLBACK',
  UTILISATEUR:       'UTILISATEUR',
};

// ─── Sérialisation sûre (BigInt + circularité) ────────────────
function _serialize(val) {
  if (val == null) return null;
  try {
    return JSON.parse(
      JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? v.toString() : v))
    );
  } catch {
    return null;
  }
}

/**
 * Écrit une entrée dans le journal d'audit.
 * id_user est OPTIONNEL (actions système sans acteur humain).
 *
 * @param {object} params
 *   action       {string}   CREATE | UPDATE | STATUS_CHANGED | APPROVE …
 *   entite_type  {string}   RFC | CHANGEMENT | TACHE | VOTE …
 *   entite_id    {string}   UUID de l'entité concernée
 *   id_user      {string?}  UUID de l'acteur (null = système)
 *   ancienne_val {object?}  État avant  (null si création)
 *   nouvelle_val {object?}  État après  (null si suppression)
 */
async function logAction({
  action,
  entite_type,
  entite_id,
  id_user      = null,
  ancienne_val = null,
  nouvelle_val = null,
}) {
  // Seuls action, entite_type et entite_id sont vraiment obligatoires
  if (!action || !entite_type || !entite_id) return;

  try {
    await prisma.auditLog.create({
      data: {
        code_metier:  codeAuditLog(),
        action,
        entite_type,
        entite_id:    String(entite_id),
        id_user:      id_user ?? null,
        ancienne_val: _serialize(ancienne_val),
        nouvelle_val: _serialize(nouvelle_val),
      },
    });
  } catch (err) {
    console.error('[AuditLog] Erreur non bloquante :', err.message, {
      action, entite_type, entite_id,
    });
  }
}

/**
 * Récupère TOUT l'historique d'audit lié à une RFC :
 *   RFC → Changements → Tâches → Tests → PIR
 *      → Réunions CAB → Votes → Décisions
 *      → Commentaires → Évaluation risque → Pièces jointes
 *
 * @param   {string}     id_rfc
 * @returns {AuditLog[]} triés du plus ancien au plus récent
 */
async function getAuditTrailByRfc(id_rfc) {
  try {
    const changements = await prisma.changement.findMany({
      where:  { id_rfc },
      select: {
        id_changement: true,
        taches:  { select: { id_tache: true } },
        tests:   { select: { id_test: true } },
        pir:     { select: { id_pir: true } },
      },
    });

    // Uniquement RFC + Changements + Tâches + Tests + PIR
    // On exclut volontairement : réunions CAB, votes, décisions, commentaires, pièces jointes
    const entityIds = [id_rfc];

    for (const chg of changements) {
      entityIds.push(chg.id_changement);
      chg.taches.forEach(t => entityIds.push(t.id_tache));
      chg.tests.forEach(t  => entityIds.push(t.id_test));
      if (chg.pir) entityIds.push(chg.pir.id_pir);
    }

    // Filtrer uniquement les types pertinents
    return prisma.auditLog.findMany({
      where: {
        entite_id:   { in: [...new Set(entityIds)] },
        entite_type: { in: ['RFC', 'CHANGEMENT', 'TACHE', 'TEST', 'PIR', 'PLAN_CHANGEMENT', 'PLAN_ROLLBACK'] },
      },
      orderBy: { date_action: 'asc' },
      select: {
        id_log:       true,
        code_metier:  true,
        action:       true,
        entite_type:  true,
        entite_id:    true,
        ancienne_val: true,
        nouvelle_val: true,
        date_action:  true,
        utilisateur: {
          select: {
            id_user:     true,
            nom_user:    true,
            prenom_user: true,
            email_user:  true,
          },
        },
      },
    });
  } catch (err) {
    console.error('[AuditLog] getAuditTrailByRfc error :', err.message);
    return [];
  }
}

module.exports = {
  logAction,
  getAuditTrailByRfc,
  ACTIONS,
  ENTITES,
};