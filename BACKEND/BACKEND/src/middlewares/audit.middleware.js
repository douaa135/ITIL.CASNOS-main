'use strict';

/**
 * ============================================================
 * audit.middleware.js — Enregistre automatiquement les actions
 *                       dans la table audit_log
 * ============================================================
 * Intercepte les réponses POST/PUT/PATCH/DELETE réussies et
 * crée une entrée audit_log avec l'action et l'entité concernée.
 * ============================================================
 */

const prisma = require('../services/prisma.service');
const { v4: uuidv4 } = require('uuid');

function codeAudit() {
  return 'AUD-' + uuidv4().slice(0, 8).toUpperCase();
}

// Mapping des routes vers les types d'entité
function resolveEntity(path, method) {
  if (path.includes('/rfc'))           return 'RFC';
  if (path.includes('/changements'))   return 'CHANGEMENT';
  if (path.includes('/tache'))         return 'TACHE';
  if (path.includes('/ci'))            return 'CI';
  if (path.includes('/users'))         return 'USER';
  if (path.includes('/notifications')) return 'NOTIFICATION';
  if (path.includes('/cab') || path.includes('/reunions')) return 'CAB';
  if (path.includes('/workflow'))      return 'WORKFLOW';
  return 'SYSTEM';
}

function resolveAction(method, path) {
  if (method === 'POST')   return 'CREATE';
  if (method === 'PUT')    return 'UPDATE';
  if (method === 'PATCH') {
    if (path.includes('actif'))    return 'TOGGLE';
    if (path.includes('read'))     return 'READ';
    if (path.includes('statut') || path.includes('escalade')) return 'STATUS_CHANGE';
    return 'UPDATE';
  }
  if (method === 'DELETE') return 'DELETE';
  return method;
}

function resolveEntityId(path) {
  // Extract UUID from path like /api/rfc/xxxx-xxxx or /api/users/xxxx-xxxx
  const uuidRegex = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
  const match = path.match(uuidRegex);
  return match ? match[1] : 'N/A';
}

function auditMiddleware(req, res, next) {
  // Only audit modifying requests
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    return next();
  }

  // Skip auth routes and notification reads
  if (req.path.includes('/auth/')) return next();
  if (req.path.includes('/read-all')) return next();
  if (req.path.includes('/read') && req.method === 'PATCH') return next();

  // Capture the original json method to intercept the response
  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Only log successful operations (status 2xx)
    if (res.statusCode >= 200 && res.statusCode < 300 && body?.success !== false) {
      const id_user = req.user?.id_user;
      if (id_user) {
        const entite_type = resolveEntity(req.path, req.method);
        const action = resolveAction(req.method, req.path);
        const entite_id = resolveEntityId(req.path);

        // Fire and forget — never block the response
        prisma.auditLog.create({
          data: {
            code_metier: codeAudit(),
            action,
            entite_type,
            entite_id,
            ancienne_val: undefined,
            nouvelle_val: req.body && Object.keys(req.body).length > 0
              ? JSON.parse(JSON.stringify(req.body))
              : undefined,
            id_user,
          },
        }).catch(err => {
          console.error('[AUDIT MW] Erreur écriture:', err.message);
        });
      }
    }

    return originalJson(body);
  };

  next();
}

module.exports = auditMiddleware;
