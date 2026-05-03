'use strict';

/**
 * ============================================================
 * rbac.middleware.js — Contrôle d'accès par permission / rôle
 * ============================================================
 * Les permissions sont encodées dans le JWT au moment du login.
 * → Pas de requête DB à chaque vérification (performances optimales).
 *
 * Usage dans les routes :
 *   router.post('/rfc',
 *     authenticateJWT,
 *     checkPermission('rfc:create'),
 *     rfcController.create
 *   );
 * ============================================================
 */


// ─── checkPermission ──────────────────────────────────────────────────────────
/**
 * Vérifie qu'une permission précise est présente dans req.user.permissions.
 *
 * Codes de permission définis dans le seed :
 *   rfc:create / rfc:read / rfc:update / rfc:approve / rfc:reject / rfc:cancel / rfc:statut
 *   changement:create / changement:read / changement:update / changement:plan
 *   changement:execute / changement:close / changement:statut
 *   tache:create / tache:read / tache:update / tache:execute
 *   cab:read / cab:manage / cab:vote
 *   rapport:read / rapport:generate
 *   user:manage / system:config
 *
 * @param {string} requiredPermission  ex: 'rfc:approve'
 */
function checkPermission(permission) {

  return (req, res, next) => {

    const userPermissions = req.user.permissions || [];



    if (!userPermissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        message: "Accès refusé — permission insuffisante",
        required: permission
      });
    }

    next();
  };

}


// ─── checkRole ────────────────────────────────────────────────────────────────
/**
 * Vérifie qu'au moins un des rôles listés est présent dans req.user.roles.
 * Préférer checkPermission() pour un contrôle plus fin.
 *
 * @param {...string} allowedRoles  ex: 'ADMIN', 'CHANGE_MANAGER'
 */
function checkRole(...allowedRoles) {
  return (req, res, next) => {
    const userRoles = req.user?.roles;

    if (!Array.isArray(userRoles)) {
      return res.status(403).json({
        success: false,
        message: 'Aucun rôle assigné',
      });
    }

    const hasRole = allowedRoles.some(r => userRoles.includes(r));

    if (!hasRole) {
      return res.status(403).json({
        success:  false,
        message:  'Accès refusé — rôle insuffisant',
        required: allowedRoles,
      });
    }

    next();
  };
}


module.exports = { checkPermission, checkRole};