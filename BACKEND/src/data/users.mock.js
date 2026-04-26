/**
 * ============================================================
 * MOCK DATA — Utilisateurs en mémoire (Phase 2, sans BDD)
 * Les mots de passe sont hashés avec bcrypt (10 rounds)
 * Mot de passe en clair pour les tests : "password123"
 * ============================================================
 *
 * Pour regénérer les hashes (Node REPL) :
 *   const bcrypt = require('bcryptjs');
 *   bcrypt.hashSync('password123', 10)
 */

const { ROLES } = require('../config/roles.config');

// Tokens révoqués (logout) — remplace une blacklist Redis en Phase 2
const revokedTokens = new Set();

// ── Mock Users ───────────────────────────────────────────────
const users = [
  {
    id_user:        1,
    nom:            'Boukhettala',
    prenom:         'Amira',
    email:          'admin@casnos.dz',
    login:          'admin',
    // bcrypt hash of "password"
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.ADMIN,
    id_direction:   1,
    actif:          true,
    date_creation:  '2024-01-01T08:00:00Z',
  },
  {
    id_user:        2,
    nom:            'Merabti',
    prenom:         'Karim',
    email:          'change.manager@casnos.dz',
    login:          'k.merabti',
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.CHANGE_MANAGER,
    id_direction:   2,
    actif:          true,
    date_creation:  '2024-01-15T08:00:00Z',
  },
  {
    id_user:        3,
    nom:            'Rahmani',
    prenom:         'Sara',
    email:          'demandeur@casnos.dz',
    login:          's.rahmani',
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.DEMANDEUR,
    id_direction:   3,
    actif:          true,
    date_creation:  '2024-02-01T08:00:00Z',
  },
  {
    id_user:        4,
    nom:            'Benamara',
    prenom:         'Youcef',
    email:          'implementeur@casnos.dz',
    login:          'y.benamara',
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.IMPLEMENTEUR,
    id_direction:   2,
    actif:          true,
    date_creation:  '2024-02-10T08:00:00Z',
  },
  {
    id_user:        5,
    nom:            'Hamdi',
    prenom:         'Nadir',
    email:          'cab@casnos.dz',
    login:          'n.hamdi',
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.MEMBRE_CAB,
    id_direction:   4,
    actif:          true,
    date_creation:  '2024-03-01T08:00:00Z',
  },
  {
    id_user:        6,
    nom:            'Tlemcani',
    prenom:         'Rania',
    email:          'servicedesk@casnos.dz',
    login:          'r.tlemcani',
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.SERVICE_DESK,
    id_direction:   2,
    actif:          true,
    date_creation:  '2024-03-15T08:00:00Z',
  },
  {
    id_user:        7,
    nom:            'Khelifi',
    prenom:         'Omar',
    email:          'inactif@casnos.dz',
    login:          'o.khelifi',
    mot_passe:      '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
    role:           ROLES.DEMANDEUR,
    id_direction:   3,
    actif:          false,   // ← compte désactivé (test)
    date_creation:  '2024-01-20T08:00:00Z',
  },
];

// ── Helpers ──────────────────────────────────────────────────

/** Recherche par login ou email */
const findByLogin = (login) =>
  users.find(
    (u) => (u.login === login || u.email === login) && u.actif
  ) || null;

/** Recherche par id */
const findById = (id) =>
  users.find((u) => u.id_user === parseInt(id)) || null;

/** Retourne l'objet user sans le mot de passe */
const sanitize = (user) => {
  if (!user) return null;
  const { mot_passe, ...safe } = user;
  return safe;
};

/** Gestion de la blacklist tokens (logout) */
const revokeToken    = (jti) => revokedTokens.add(jti);
const isTokenRevoked = (jti) => revokedTokens.has(jti);

module.exports = {
  users,
  findByLogin,
  findById,
  sanitize,
  revokeToken,
  isTokenRevoked,
};
