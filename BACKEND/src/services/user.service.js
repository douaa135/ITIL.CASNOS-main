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
 * ============================================================
 */

const prisma    = require('./prisma.service');
const bcrypt    = require('bcryptjs');
const auditSvc  = require('./audit.service');
const { codeUtilisateur } = require('../utils/entity-code.utils');

const BCRYPT_ROUNDS = 10;

// ─── Select réutilisable ──────────────────────────────────────────────────────
const USER_WITH_ROLES = {
  id_user:        true,
  code_metier:    true,
  nom_user:       true,
  prenom_user:    true,
  email_user:     true,
  mot_passe:      true,
  phone:          true,
  date_naissance: true,
  actif:          true,
  date_creation:  true,
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
    roles,
    permissions: [...permissions],
  };
}

// ─── createUser ───────────────────────────────────────────────────────────────
async function createUser(data, id_user_admin = null) {
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
  const existing = await prisma.utilisateur.findUnique({ where: { email_user } });
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
      data: { id_user: created.id_user, id_role: role.id_role },
    });

    return tx.utilisateur.findUnique({
      where:  { id_user: created.id_user },
      select: USER_WITH_ROLES,
    });
  });

  const flat = _flatten(user);

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.CREATE,
    entite_type :  auditSvc.ENTITES.UTILISATEUR,
    entite_id:    flat.id_user,
    id_user:      id_user_admin,
    ancienne_val: null,
    nouvelle_val: {
      code_metier: flat.code_metier,
      nom_user:    flat.nom_user,
      prenom_user: flat.prenom_user,
      email_user:  flat.email_user,
      nom_role,
      actif:       true,
    },
  });

  return flat;
}

// ─── getAllUsers ──────────────────────────────────────────────────────────────
async function getAllUsers({ page = 1, limit = 10, actif, nom_role, search } = {}) {
  const skip  = (page - 1) * limit;
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
    where.userRoles = { some: { role: { nom_role } } };
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

// ─── updateUser ───────────────────────────────────────────────────────────────
async function updateUser(id, data, id_user_admin = null) {
  const avant = await getUserById(id); // lève 404 si absent

  const allowed = ['nom_user', 'prenom_user', 'phone', 'date_naissance', 'id_direction', 'mot_passe'];
  const updateData = {};

  for (const key of allowed) {
    if (data[key] !== undefined) updateData[key] = data[key];
  }

  if (updateData.mot_passe) {
    updateData.mot_passe = await bcrypt.hash(updateData.mot_passe, BCRYPT_ROUNDS);
  }
  if (updateData.date_naissance) {
    updateData.date_naissance = new Date(updateData.date_naissance);
  }

  const hasRoleChange = data.nom_role !== undefined;

  if (Object.keys(updateData).length === 0 && !hasRoleChange) {
    const err = new Error('Aucun champ valide fourni pour la mise à jour.');
    err.statusCode = 400;
    err.code = 'NO_VALID_FIELDS';
    throw err;
  }

  let newRole = null;
  if (hasRoleChange) {
    newRole = await prisma.role.findUnique({ where: { nom_role: data.nom_role } });
    if (!newRole) {
      const err = new Error(`Rôle introuvable : ${data.nom_role}`);
      err.statusCode = 400;
      err.code = 'INVALID_ROLE';
      throw err;
    }
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (Object.keys(updateData).length > 0) {
      await tx.utilisateur.update({ where: { id_user: id }, data: updateData });
    }
    if (newRole) {
      await tx.userRole.deleteMany({ where: { id_user: id } });
      await tx.userRole.create({ data: { id_user: id, id_role: newRole.id_role } });
    }
    return tx.utilisateur.findUnique({ where: { id_user: id }, select: USER_WITH_ROLES });
  });

  const flat = _flatten(updated);

  // ── AUDIT ──────────────────────────────────────────────────
  const changedFields = {};
  for (const key of Object.keys(updateData)) {
    if (key === 'mot_passe') { changedFields.mot_passe = '[modifié]'; continue; }
    changedFields[key] = data[key];
  }
  if (hasRoleChange) changedFields.nom_role = data.nom_role;

  await auditSvc.logAction({
    action:       auditSvc.ACTIONS.UPDATE,
    entite_type: auditSvc.ENTITES.UTILISATEUR, 
    entite_id:    id,
    id_user:      id_user_admin,
    ancienne_val: {
      nom_user:    avant.nom_user,
      prenom_user: avant.prenom_user,
      phone:       avant.phone,
      roles:       avant.roles,
    },
    nouvelle_val: changedFields,
  });

  return flat;
}

// ─── toggleActif ─────────────────────────────────────────────────────────────
async function toggleActif(id, actif, id_user_admin = null) {
  const avant = await getUserById(id); // lève 404 si absent

  const updated = await prisma.utilisateur.update({
    where:  { id_user: id },
    data:   { actif: Boolean(actif) },
    select: USER_WITH_ROLES,
  });

  const flat = _flatten(updated);

  // ── AUDIT ──────────────────────────────────────────────────
  await auditSvc.logAction({
    action:       actif ? auditSvc.ACTIONS.ACTIVATE ?? 'ACTIVATE' : auditSvc.ACTIONS.DEACTIVATE ?? 'DEACTIVATE',
    entite_type:  auditSvc.ENTITES.UTILISATEUR,
    entite_id:    id,
    id_user:      id_user_admin,
    ancienne_val: { actif: avant.actif },
    nouvelle_val: { actif: Boolean(actif) },
  });

  return flat;
}

// ─── sanitize ─────────────────────────────────────────────────────────────────
function sanitize(user) {
  if (!user) return null;
  const { mot_passe, ...safe } = user;
  return safe;
}

// ─── findByLogin ─────────────────────────────────────────────────────────────
async function findByLogin(email) {
  const user = await prisma.utilisateur.findFirst({
    where:  { email_user: email },
    select: USER_WITH_ROLES,
  });
  if (!user) return null;
  return _flatten(user);
}

// ─── findById ────────────────────────────────────────────────────────────────
async function findById(id) {
  const user = await prisma.utilisateur.findUnique({
    where:  { id_user: id },
    select: USER_WITH_ROLES,
  });
  if (!user) return null;
  return _flatten(user);
}

async function findByIdSafe(id) {
  const user = await findById(id);
  return sanitize(user);
}

async function getUserPermissions(id_user) {
  const user = await findById(id_user);
  return user ? user.permissions : [];
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  toggleActif,
  findByLogin,
  findById,
  findByIdSafe,
  sanitize,
  getUserPermissions,
};