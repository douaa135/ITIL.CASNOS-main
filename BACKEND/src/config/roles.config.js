/**
 * ============================================================
 * RBAC — Rôles & Permissions
 * Conforme au modèle ITIL Change Management (CASNOS)
 * ============================================================
 */

// ── 1. Permissions (objet complet avec code, description, module) ────────────
const PERMISSIONS = {
  // RFC
  RFC_CREATE:         { code: 'rfc:create',         description: 'Créer une RFC',              module: 'RFC' },
  RFC_READ:           { code: 'rfc:read',           description: 'Lire les RFC',               module: 'RFC' },
  RFC_UPDATE:         { code: 'rfc:update',         description: 'Modifier une RFC',           module: 'RFC' },
  RFC_APPROVE:        { code: 'rfc:approve',        description: 'Approuver une RFC',          module: 'RFC' },
  RFC_REJECT:         { code: 'rfc:reject',         description: 'Rejeter une RFC',            module: 'RFC' },
  RFC_CANCEL:         { code: 'rfc:cancel',         description: 'Annuler une RFC',            module: 'RFC' },
  RFC_STATUT:         { code: 'rfc:statut',         description: 'Modifier statut RFC',        module: 'RFC' },
  // CHANGEMENT
  CHANGEMENT_CREATE:  { code: 'changement:create',  description: 'Créer un changement',        module: 'CHANGEMENT' },
  CHANGEMENT_READ:    { code: 'changement:read',    description: 'Lire les changements',       module: 'CHANGEMENT' },
  CHANGEMENT_UPDATE:  { code: 'changement:update',  description: 'Modifier un changement',     module: 'CHANGEMENT' },
  CHANGEMENT_PLAN:    { code: 'changement:plan',    description: 'Planifier un changement',    module: 'CHANGEMENT' },
  CHANGEMENT_EXECUTE: { code: 'changement:execute', description: 'Exécuter un changement',     module: 'CHANGEMENT' },
  CHANGEMENT_CLOSE:   { code: 'changement:close',   description: 'Clôturer un changement',     module: 'CHANGEMENT' },
  CHANGEMENT_STATUT:  { code: 'changement:statut',  description: 'Modifier statut changement', module: 'CHANGEMENT' },
  // TACHE
  TACHE_CREATE:       { code: 'tache:create',       description: 'Créer une tâche',            module: 'TACHE' },
  TACHE_READ:         { code: 'tache:read',         description: 'Lire les tâches',            module: 'TACHE' },
  TACHE_UPDATE:       { code: 'tache:update',       description: 'Modifier une tâche',         module: 'TACHE' },
  TACHE_EXECUTE:      { code: 'tache:execute',       description: 'Exécuter une tâche',         module: 'TACHE' },
  // CAB
  CAB_READ:           { code: 'cab:read',           description: 'Voir les réunions CAB',      module: 'CAB' },
  CAB_MANAGE:         { code: 'cab:manage',         description: 'Gérer les réunions CAB',     module: 'CAB' },
  CAB_VOTE:           { code: 'cab:vote',           description: 'Voter sur une RFC',          module: 'CAB' },
  // RAPPORT
  RAPPORT_READ:       { code: 'rapport:read',       description: 'Lire les rapports',          module: 'RAPPORT' },
  RAPPORT_GENERATE:   { code: 'rapport:generate',   description: 'Générer un rapport',         module: 'RAPPORT' },
  // ADMIN
  USER_MANAGE:        { code: 'user:manage',        description: 'Gérer les utilisateurs',     module: 'ADMIN' },
  SYSTEM_CONFIG:      { code: 'system:config',      description: 'Configurer le système',      module: 'ADMIN' },
  
};

// ── 2. Liste des rôles ───────────────────────────────────────
const ROLES = {
  ADMIN:          'ADMIN',
  CHANGE_MANAGER: 'CHANGE_MANAGER',
  IMPLEMENTEUR:   'IMPLEMENTEUR',
  MEMBRE_CAB:     'MEMBRE_CAB',
  DEMANDEUR:      'DEMANDEUR',
  SERVICE_DESK:   'SERVICE_DESK',
};

// ── 3. Matrice Rôle → Permissions (codes string uniquement) ─────────────────
//   On stocke les codes 'rfc:create' pour que le middleware puisse faire
//   permissions.includes('rfc:create')
const ROLE_PERMISSIONS = {

  [ROLES.ADMIN]: Object.values(PERMISSIONS).map(p => p.code), // toutes les permissions

  [ROLES.CHANGE_MANAGER]: [
    PERMISSIONS.RFC_CREATE.code,
    PERMISSIONS.RFC_READ.code,
    PERMISSIONS.RFC_UPDATE.code,
    PERMISSIONS.RFC_APPROVE.code,
    PERMISSIONS.RFC_REJECT.code,
    PERMISSIONS.RFC_CANCEL.code,
    PERMISSIONS.RFC_STATUT.code,
    PERMISSIONS.CHANGEMENT_CREATE.code,
    PERMISSIONS.CHANGEMENT_READ.code,
    PERMISSIONS.CHANGEMENT_UPDATE.code,
    PERMISSIONS.CHANGEMENT_PLAN.code,
    PERMISSIONS.CHANGEMENT_CLOSE.code,
    PERMISSIONS.CHANGEMENT_STATUT.code,
    PERMISSIONS.TACHE_CREATE.code,
    PERMISSIONS.TACHE_READ.code,
    PERMISSIONS.TACHE_UPDATE.code,
    PERMISSIONS.CAB_READ.code,
    PERMISSIONS.CAB_MANAGE.code,
    PERMISSIONS.RAPPORT_READ.code,
    PERMISSIONS.RAPPORT_GENERATE.code,
  ],

  [ROLES.IMPLEMENTEUR]: [
    PERMISSIONS.CHANGEMENT_READ.code,
    PERMISSIONS.CHANGEMENT_EXECUTE.code,
    PERMISSIONS.CHANGEMENT_STATUT.code,
    PERMISSIONS.TACHE_READ.code,
    PERMISSIONS.TACHE_UPDATE.code,
    PERMISSIONS.TACHE_EXECUTE.code,
    PERMISSIONS.RAPPORT_READ.code,
  ],

  [ROLES.MEMBRE_CAB]: [
    PERMISSIONS.RFC_READ.code,
    PERMISSIONS.CHANGEMENT_READ.code,
    PERMISSIONS.CAB_READ.code,
    PERMISSIONS.CAB_VOTE.code,
    PERMISSIONS.RAPPORT_READ.code,
  ],

  [ROLES.DEMANDEUR]: [
    PERMISSIONS.RFC_CREATE.code,
    PERMISSIONS.RFC_READ.code,
    PERMISSIONS.RFC_UPDATE.code,
    PERMISSIONS.RFC_CANCEL.code,
    PERMISSIONS.RAPPORT_READ.code,
  ],

  [ROLES.SERVICE_DESK]: [
    PERMISSIONS.RFC_CREATE.code,
    PERMISSIONS.RFC_READ.code,
    PERMISSIONS.RFC_UPDATE.code,
    PERMISSIONS.RFC_CANCEL.code,
    PERMISSIONS.CHANGEMENT_READ.code,
    PERMISSIONS.TACHE_READ.code,
    PERMISSIONS.RAPPORT_READ.code,
  ],
};

// ── 4. Helpers ───────────────────────────────────────────────
const getPermissionsForRole = (role) => ROLE_PERMISSIONS[role] || [];

const roleHasPermission = (role, permission) =>
  getPermissionsForRole(role).includes(permission);

module.exports = {
  PERMISSIONS,
  ROLES,
  ROLE_PERMISSIONS,
  getPermissionsForRole,
  roleHasPermission,
};