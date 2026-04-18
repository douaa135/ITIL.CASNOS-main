'use strict';

/**
 * ============================================================
 * user.service.js — CRUD Utilisateur (admin)
 * ============================================================
 * Fonctions exposées :
 *   createUser(data)          → crée un utilisateur + UserRole
 *   getAllUsers(filters)      → liste paginée avec filtres
 *   getUserById(id)           → un user complet (sans mot_passe)
 *   updateUser(id, data)      → met à jour les champs éditables
 *   toggleActif(id, actif)    → active / désactive un compte
 *
 * Réutilise le USER_WITH_ROLES select + _flatten + sanitize
 * déjà établis dans le service auth.
 * ============================================================
 */

const prisma  = require('./prisma.service');
const bcrypt  = require('bcryptjs');
const { codeUtilisateur } = require('../utils/entity-code.utils');

const BCRYPT_ROUNDS = 10;

// ─── Select réutilisable ──────────────────────────────────────────────────────
const USER_WITH_ROLES = {
  id_user:       true,
  code_metier:   true,
  nom_user:      true,
  prenom_user:   true,
  email_user:    true,
  mot_passe:     true,
  phone:         true,
  date_naissance: true,
  actif:         true,
  date_creation: true,
  direction: {
    select: { id_direction: true, nom_direction: true, code_metier: true },
  },
  userRoles: {
    select: {
      role: {
        select: {
          id_role:  true,
          nom_role: true,
          rolePermissions: {
            select: {
              permission: { select: { code_permission: true } },
            },
          },
        },
      },
    },
  },
};

// ─── Helper — aplatir la structure Prisma ────────────────────────────────────
function _flatten(user) {
  const roles       = [];
  const permissions = new Set();

  for (const ur of user.userRoles) {
    roles.push(ur.role.nom_role);
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.code_permission);
    }
  }

  return {
    id_user:        user.id_user,
    code_metier:    user.code_metier,
    nom_user:       user.nom_user,
    prenom_user:    user.prenom_user,
    email_user:     user.email_user,
    mot_passe:      user.mot_passe,
    phone:          user.phone ?? null,
    date_naissance: user.date_naissance ?? null,
    actif:          user.actif,
    date_creation:  user.date_creation,
    direction:      user.direction ?? null,
    nom_direction:  user.direction?.nom_direction ?? null,
    roles,
    permissions: [...permissions],
  };
}

// ─── createUser ───────────────────────────────────────────────────────────────
/**
 * Crée un nouvel utilisateur et l'associe à un rôle.
 *
 * @param {object} data
 *   { nom_user, prenom_user, email_user, mot_passe,
 *     nom_role, id_direction?, phone?, date_naissance? }
 * @returns {object}  User aplati sans mot_passe
 * @throws  Si l'email existe déjà | le rôle est introuvable
 */
async function createUser(data) {
  const {
    nom_user,
    prenom_user,
    email_user,
    mot_passe,
    date_naissance,
    nom_role,
    id_direction = null,
    phone        = null,
  } = data;

  // 1. Vérifier doublon email
  const existing = await prisma.utilisateur.findUnique({
    where: { email_user },
  });
  if (existing) {
    const err = new Error('Un utilisateur avec cet email existe déjà.');
    err.statusCode = 409;
    err.code = 'EMAIL_CONFLICT';
    throw err;
  }

  // 2. Résoudre le rôle
  const role = await prisma.role.findUnique({ where: { nom_role } });
  if (!role) {
    const err = new Error(`Rôle introuvable : ${nom_role}`);
    err.statusCode = 400;
    err.code = 'INVALID_ROLE';
    throw err;
  }

  // 3. Hasher le mot de passe
  const hashed = await bcrypt.hash(mot_passe, BCRYPT_ROUNDS);

  // 4. Créer l'utilisateur + UserRole dans une transaction
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.utilisateur.create({
      data: {
        code_metier:    codeUtilisateur(),
        nom_user,
        prenom_user,
        email_user,
        mot_passe:      hashed,
        phone,
        date_naissance: date_naissance ? new Date(date_naissance) : null,
        actif:          true,
        id_direction,
      },
      select: USER_WITH_ROLES,
    });

    await tx.userRole.create({
      data: {
        id_user: created.id_user,
        id_role: role.id_role,
      },
    });

    // Re-fetch pour avoir les relations complètes
    return tx.utilisateur.findUnique({
      where:  { id_user: created.id_user },
      select: USER_WITH_ROLES,
    });
  });

  return _flatten(user);
}

// ─── getAllUsers ──────────────────────────────────────────────────────────────
/**
 * Liste des utilisateurs avec pagination et filtres optionnels.
 *
 * @param {object} options
 *   { page=1, limit=10, actif?, nom_role?, search? }
 *   search → cherche dans nom_user | prenom_user | email_user
 * @returns {{ data: object[], total: number, page: number, limit: number }}
 */
async function getAllUsers({ page = 1, limit = 10, actif, nom_role, search } = {}) {
  const skip = (page - 1) * limit;

  // Construction du where
  const where = {};

  if (actif !== undefined) {
    where.actif = actif === 'true' || actif === true;
  }

  if (search) {
    where.OR = [
      { nom_user:    { contains: search, mode: 'insensitive' } },
      { prenom_user: { contains: search, mode: 'insensitive' } },
      { email_user:  { contains: search, mode: 'insensitive' } },
    ];
  }

  if (nom_role) {
    where.userRoles = {
      some: { role: { nom_role } },
    };
  }

  const [users, total] = await prisma.$transaction([
    prisma.utilisateur.findMany({
      where,
      skip,
      take:    Number(limit),
      orderBy: { date_creation: 'desc' },
      select:  USER_WITH_ROLES,
    }),
    prisma.utilisateur.count({ where }),
  ]);

  return {
    data:  users.map(_flatten),
    total,
    page:  Number(page),
    limit: Number(limit),
    pages: Math.ceil(total / limit),
  };
}

// ─── getUserById ──────────────────────────────────────────────────────────────
/**
 * Récupère un utilisateur par son UUID (sans mot_passe).
 *
 * @param {string} id  UUID
 * @returns {object}
 * @throws 404 si introuvable
 */
async function getUserById(id) {
  const user = await prisma.utilisateur.findUnique({
    where:  { id_user: id },
    select: USER_WITH_ROLES,
  });

  if (!user) {
    const err = new Error('Utilisateur introuvable.');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    throw err;
  }

  return _flatten(user);
}

  async function findByIdSafe(id) {
    const user = await findById(id);
    return sanitize(user);
  }

// ─── updateUser ───────────────────────────────────────────────────────────────
/**
 * Met à jour les champs éditables d'un utilisateur.
 * Champs autorisés : nom_user, prenom_user, phone, date_naissance,
 *                    id_direction, mot_passe (re-hashé automatiquement)
 * Champ email non modifiable via ce service (évite les conflits d'identité).
 *
 * @param {string} id    UUID de l'utilisateur
 * @param {object} data  Champs à mettre à jour
 * @returns {object}     User mis à jour (sans mot_passe)
 */
async function updateUser(id, data) {
  // Vérifier que l'utilisateur existe
  await getUserById(id); // lève 404 si absent

  const allowed = ['nom_user', 'prenom_user', 'email_user', 'phone', 'date_naissance', 'id_direction', 'mot_passe'];
  const updateData = {};

  for (const key of allowed) {
    if (data[key] !== undefined) {
      updateData[key] = data[key];
    }
  }

  // Si l'email est modifié, vérifier l'unicité
  if (updateData.email_user) {
    const current = await prisma.utilisateur.findUnique({ where: { id_user: id } });
    if (updateData.email_user !== current.email_user) {
      const existing = await prisma.utilisateur.findFirst({
        where: { email_user: updateData.email_user, id_user: { not: id } }
      });
      if (existing) {
        const err = new Error('Cet email est déjà utilisé par un autre compte.');
        err.statusCode = 409;
        err.code = 'EMAIL_CONFLICT';
        throw err;
      }
    }
  }

  // Re-hasher le mot de passe si fourni
  if (updateData.mot_passe) {
    updateData.mot_passe = await bcrypt.hash(updateData.mot_passe, BCRYPT_ROUNDS);
  }

  // Convertir date_naissance si nécessaire
  if (updateData.date_naissance) {
    updateData.date_naissance = new Date(updateData.date_naissance);
  }

  // Update role if provided (manually to avoid nested write issues)
  let updatedRole = null;
  if (data.nom_role) {
    updatedRole = await prisma.role.findUnique({ where: { nom_role: data.nom_role } });
    if (updatedRole) {
      await prisma.userRole.deleteMany({ where: { id_user: id } });
      await prisma.userRole.create({ data: { id_user: id, id_role: updatedRole.id_role } });
    }
  }

  if (Object.keys(updateData).length === 0 && !updatedRole) {
    const err = new Error('Aucun champ valide fourni pour la mise à jour.');
    err.statusCode = 400;
    err.code = 'NO_VALID_FIELDS';
    throw err;
  }

  let updated;
  if (Object.keys(updateData).length > 0) {
    updated = await prisma.utilisateur.update({
      where:  { id_user: id },
      data:   updateData,
      select: USER_WITH_ROLES,
    });
  } else {
    updated = await prisma.utilisateur.findUnique({
      where: { id_user: id },
      select: USER_WITH_ROLES,
    });
  }

  return _flatten(updated);
}

// ─── toggleActif ─────────────────────────────────────────────────────────────
/**
 * Active ou désactive un compte utilisateur.
 *
 * @param {string}  id     UUID de l'utilisateur
 * @param {boolean} actif  true = activer | false = désactiver
 * @returns {object}  User mis à jour (sans mot_passe)
 */
async function toggleActif(id, actif) {
  await getUserById(id); // lève 404 si absent

  const updated = await prisma.utilisateur.update({
    where:  { id_user: id },
    data:   { actif: Boolean(actif) },
    select: USER_WITH_ROLES,
  });

  return _flatten(updated);
}

// ─── deleteUser ──────────────────────────────────────────────────────────────
/**
 * Supprime définitivement un compte utilisateur de la base de données.
 *
 * @param {string} id  UUID de l'utilisateur
 * @returns {object}   L'utilisateur supprimé
 */
async function deleteUser(id) {
  await getUserById(id); // vérifie existence

  try {
    const deleted = await prisma.utilisateur.delete({
      where: { id_user: id },
      select: USER_WITH_ROLES,
    });
    return _flatten(deleted);
  } catch (err) {
    if (err.code === 'P2003') {
      const e = new Error('Impossible de supprimer cet utilisateur car il est lié à d\'autres enregistrements (ex: RFC, Changement).');
      e.statusCode = 400;
      e.code = 'HAS_RELATIONS';
      throw e;
    }
    throw err;
  }
}

// ─── sanitize ─────────────────────────────────────────────────────────────────
// Retire mot_passe de l'objet utilisateur avant envoi au client.
function sanitize(user) {
  if (!user) return null;
  const { mot_passe, ...safe } = user;
  return safe;
}

// ─── Référentiels ─────────────────────────────────────────────────────────────
async function getAllRoles() {
  return await prisma.role.findMany({
    select: { id_role: true, nom_role: true, code_metier: true }
  });
}

async function getAllDirections() {
  return await prisma.directionMetier.findMany({
    select: { id_direction: true, nom_direction: true, code_metier: true }
  });
}

async function findByLogin(loginStr) {
  const user = await prisma.utilisateur.findFirst({
    where: {
      OR: [
        { email_user: loginStr },
        { code_metier: loginStr }
      ]
    },
    select: USER_WITH_ROLES,
  });

  if (!user) return null;
  return _flatten(user);
}

async function findById(id) {
  const user = await prisma.utilisateur.findUnique({
    where:  { id_user: id },
    select: USER_WITH_ROLES,
  });

  if (!user) return null;
  return _flatten(user);
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  toggleActif,
  findByLogin,
  findByIdSafe,
  findById,
  sanitize,
  getAllRoles,
  getAllDirections
};