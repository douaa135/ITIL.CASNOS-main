'use strict';

/**
 * ============================================================
 * audit.service.js — Écriture automatique des logs d'audit
 * ============================================================
 * Utilisable par tous les services métier pour tracer les actions.
 *
 * Usage :
 *   const audit = require('./audit.service');
 *   await audit.log({ action, entite_type, entite_id, id_user, ancienne_val, nouvelle_val });
 * ============================================================
 */

const prisma = require('./prisma.service');
const { v4: uuidv4 } = require('uuid');

function codeAudit() {
  return 'AUD-' + uuidv4().slice(0, 8).toUpperCase();
}

/**
 * Enregistre une entrée dans la table audit_log.
 * @param {object} data
 *   { action, entite_type, entite_id, id_user, ancienne_val?, nouvelle_val? }
 */
async function log(data) {
  const { action, entite_type, entite_id, id_user, ancienne_val = null, nouvelle_val = null } = data;

  if (!action || !entite_type || !entite_id || !id_user) {
    console.warn('[AUDIT] Données incomplètes, log ignoré:', data);
    return null;
  }

  try {
    return await prisma.auditLog.create({
      data: {
        code_metier: codeAudit(),
        action,
        entite_type,
        entite_id:    String(entite_id),
        ancienne_val: ancienne_val ? (typeof ancienne_val === 'string' ? JSON.parse(ancienne_val) : ancienne_val) : undefined,
        nouvelle_val: nouvelle_val ? (typeof nouvelle_val === 'string' ? JSON.parse(nouvelle_val) : nouvelle_val) : undefined,
        id_user,
      },
    });
  } catch (err) {
    // Ne jamais faire crasher l'action métier à cause de l'audit
    console.error('[AUDIT] Erreur écriture log:', err.message);
    return null;
  }
}

module.exports = { log };
