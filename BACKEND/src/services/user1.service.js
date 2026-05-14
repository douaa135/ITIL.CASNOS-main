'use strict';

const prisma = require('./prisma.service');


const USER_WITH_ROLES = {
  id_user:      true,
  code_metier:  true,
  nom_user:     true,
  prenom_user:  true,
  email_user:   true,
  mot_passe:    true,   // inclus pour bcrypt.compare — retiré par sanitize()
  actif:        true,
  date_creation: true,
  direction: {
    select: { nom_direction: true },
  },
  userRoles: {
    select: {
      role: {
        select: {
          nom_role: true,
          rolePermissions: {
            select: {
              permission: {
                select: { code_permission: true },
              },
            },
          },
        },
      },
    },
  },
};



async function findByLogin(email) {
  const user = await prisma.utilisateur.findFirst({
    where:  { email_user: email },
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

async function findByIdSafe(id) {
  const user = await findById(id);
  return sanitize(user);
}


function _flatten(user) {
  const roles       = [];
  const permissions = new Set(); // Set pour éviter les doublons (multi-rôles)

  for (const ur of user.userRoles) {
    roles.push(ur.role.nom_role);
    for (const rp of ur.role.rolePermissions) {
      permissions.add(rp.permission.code_permission);
    }
  }

  return {
    id_user:       user.id_user,
    code_metier:   user.code_metier,
    nom_user:      user.nom_user,
    prenom_user:   user.prenom_user,
    email_user:    user.email_user,
    mot_passe:     user.mot_passe,      // présent — retiré par sanitize()
    actif:         user.actif,
    date_creation: user.date_creation,
    nom_direction: user.direction?.nom_direction ?? null,
    roles:         roles,
    permissions:   [...permissions],
  };
}


module.exports = {
  findByLogin,
  findById,
  findByIdSafe,
};