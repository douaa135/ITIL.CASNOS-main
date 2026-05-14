'use strict';

/**
 * ============================================================
 * ci.service.js — Logique Prisma pure (CIs + Environnements)
 * ============================================================
 * CONFIGURATION ITEMS
 *   createCI(data)
 *   getAllCIs(filters)
 *   getCIById(id)
 *   updateCI(id, data)
 *   deleteCI(id)                  → physique (pas de soft delete défini)
 *   addEnvironnement(id_ci, id_env)
 *   removeEnvironnement(id_ci, id_env)
 *   getEnvironnementsByCI(id_ci)
 *
 * ENVIRONNEMENTS (référentiel)
 *   getAllEnvironnements()
 *   getEnvironnementById(id)
 *   createEnvironnement(data)
 *   updateEnvironnement(id, data)
 *   deleteEnvironnement(id)
 * ============================================================
 */

const prisma = require('./prisma.service');
const {
  codeConfigurationItem,
  codeEnvironnement,
} = require('../utils/entity-code.utils');

// ── Selects réutilisables ─────────────────────────────────────

const CI_SELECT = {
  id_ci:       true,
  code_metier: true,
  nom_ci:      true,
  type_ci:     true,
  version_ci:  true,
  description: true,
  ciEnvs: {
    select: {
      environnement: {
        select: { id_env: true, code_metier: true, nom_env: true, description: true },
      },
    },
    orderBy: { id_env: 'asc' },
  },
  ciRfcs: {
    select: {
      rfc: {
        select: { id_rfc: true, code_rfc: true, titre_rfc: true },
      },
    },
  },
};

const CI_LIST_SELECT = {
  id_ci:       true,
  code_metier: true,
  nom_ci:      true,
  type_ci:     true,
  version_ci:  true,
  ciEnvs: {
    select: {
      environnement: { select: { id_env: true, nom_env: true } },
    },
  },
};

const ENV_SELECT = {
  id_env:      true,
  code_metier: true,
  nom_env:     true,
  description: true,
  ciEnvs: {
    select: {
      ci: {
        select: { id_ci: true, code_metier: true, nom_ci: true, type_ci: true },
      },
    },
  },
};

// ============================================================
// CONFIGURATION ITEMS
// ============================================================

/**
 * Crée un CI + liens CiEnv en une seule transaction.
 * @param {object} data { nom_ci, type_ci, version_ci?, description?, env_ids? }
 */
async function createCI(data) {
  const { nom_ci, type_ci, version_ci = null, description = null, env_ids = [] } = data;

  // Vérifier unicité nom_ci
  const existing = await prisma.configurationItem.findUnique({ where: { nom_ci: nom_ci.trim() } });
  if (existing) {
    const err = new Error(`Un CI avec le nom "${nom_ci}" existe déjà.`);
    err.code = 'CI_NAME_CONFLICT';
    err.statusCode = 409;
    throw err;
  }

  // Vérifier que tous les env_ids existent
  if (env_ids.length > 0) {
    const envs = await prisma.environnement.findMany({
      where: { id_env: { in: env_ids } },
      select: { id_env: true },
    });
    if (envs.length !== env_ids.length) {
      const found   = envs.map(e => e.id_env);
      const missing = env_ids.filter(id => !found.includes(id));
      const err = new Error(`Environnements introuvables : ${missing.join(', ')}`);
      err.code = 'ENV_NOT_FOUND';
      err.statusCode = 400;
      throw err;
    }
  }

  return prisma.configurationItem.create({
    data: {
      code_metier: codeConfigurationItem(),
      nom_ci:      nom_ci.trim(),
      type_ci:     type_ci.trim(),
      version_ci,
      description,
      ciEnvs: env_ids.length > 0
        ? { create: env_ids.map(id_env => ({ id_env })) }
        : undefined,
    },
    select: CI_SELECT,
  });
}

/**
 * Liste tous les CIs avec filtres optionnels.
 * @param {object} filters { type_ci?, nom_env? (filtre sur env lié), search? }
 */
async function getAllCIs(filters = {}) {
  const { type_ci, id_env, search } = filters;

  const where = {};

  if (type_ci) {
    where.type_ci = { equals: type_ci, mode: 'insensitive' };
  }
  if (id_env) {
    where.ciEnvs = { some: { id_env } };
  }
  if (search) {
    where.OR = [
      { nom_ci:      { contains: search, mode: 'insensitive' } },
      { type_ci:     { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.configurationItem.findMany({
    where,
    select:  CI_LIST_SELECT,
    orderBy: { nom_ci: 'asc' },
  });
}

/**
 * Détail complet d'un CI (avec RFC liées et environnements).
 */
async function getCIById(id_ci) {
  return prisma.configurationItem.findUnique({
    where:  { id_ci },
    select: CI_SELECT,
  });
}

/**
 * Met à jour les champs éditables d'un CI.
 * @param {string} id_ci
 * @param {object} data { nom_ci?, type_ci?, version_ci?, description? }
 */
async function updateCI(id_ci, data) {
  const { nom_ci, type_ci, version_ci, description, env_ids } = data;

  // Vérifier unicité nom_ci si on le change
  if (nom_ci) {
    const existing = await prisma.configurationItem.findFirst({
      where: { nom_ci: nom_ci.trim(), NOT: { id_ci } },
    });
    if (existing) {
      const err = new Error(`Un autre CI porte déjà le nom "${nom_ci}".`);
      err.code = 'CI_NAME_CONFLICT';
      err.statusCode = 409;
      throw err;
    }
  }

  // Gérer les liens avec les environnements si env_ids est fourni
  let envUpdates = {};
  if (env_ids !== undefined) {
    // Vérifier que tous les env_ids existent
    if (env_ids.length > 0) {
      const envs = await prisma.environnement.findMany({
        where: { id_env: { in: env_ids } },
        select: { id_env: true },
      });
      if (envs.length !== env_ids.length) {
        const found   = envs.map(e => e.id_env);
        const missing = env_ids.filter(id => !found.includes(id));
        const err = new Error(`Environnements introuvables : ${missing.join(', ')}`);
        err.code = 'ENV_NOT_FOUND';
        err.statusCode = 400;
        throw err;
      }
    }

    // Supprimer tous les liens existants et créer les nouveaux
    envUpdates = {
      ciEnvs: {
        deleteMany: {},
        create: env_ids.map(id_env => ({ id_env })),
      },
    };
  }

  return prisma.configurationItem.update({
    where: { id_ci },
    data: {
      ...(nom_ci      !== undefined && { nom_ci:      nom_ci.trim() }),
      ...(type_ci     !== undefined && { type_ci:     type_ci.trim() }),
      ...(version_ci  !== undefined && { version_ci }),
      ...(description !== undefined && { description }),
      ...envUpdates,
    },
    select: CI_SELECT,
  });
}

/**
 * Supprime un CI (physique — cascade sur CiEnv et CiRfc).
 * ⚠️  À appeler uniquement si le CI n'est lié à aucune RFC active.
 */
async function deleteCI(id_ci) {
  // Vérifier s'il est lié à des RFC non clôturées
  const rfcsActives = await prisma.ciRfc.findFirst({
    where: {
      id_ci,
      rfc: {
        statut: { code_statut: { notIn: ['CLOTUREE', 'REJETEE'] } },
      },
    },
  });

  if (rfcsActives) {
    const err = new Error(
      'Impossible de supprimer ce CI : il est lié à des RFC actives. ' +
      'Clôturez ou rejetez les RFC concernées avant de supprimer le CI.'
    );
    err.code = 'CI_IN_USE';
    err.statusCode = 409;
    throw err;
  }

  await prisma.configurationItem.delete({ where: { id_ci } });
  return { deleted: true, id_ci };
}

/**
 * Lie un CI à un environnement.
 */
async function addEnvironnement(id_ci, id_env) {
  await prisma.ciEnv.create({ data: { id_ci, id_env } });

  return prisma.environnement.findUnique({
    where:  { id_env },
    select: { id_env: true, code_metier: true, nom_env: true, description: true },
  });
}

/**
 * Retire le lien CI ↔ Environnement.
 */
async function removeEnvironnement(id_ci, id_env) {
  await prisma.ciEnv.delete({
    where: { id_ci_id_env: { id_ci, id_env } },
  });
  return { deleted: true, id_ci, id_env };
}

/**
 * Liste les environnements d'un CI.
 */
async function getEnvironnementsByCI(id_ci) {
  const liens = await prisma.ciEnv.findMany({
    where:  { id_ci },
    select: {
      environnement: {
        select: { id_env: true, code_metier: true, nom_env: true, description: true },
      },
    },
    orderBy: { id_env: 'asc' },
  });
  return liens.map(l => l.environnement);
}

// ============================================================
// ENVIRONNEMENTS (référentiel)
// ============================================================

async function getAllEnvironnements() {
  return prisma.environnement.findMany({
    select:  ENV_SELECT,
    orderBy: { nom_env: 'asc' },
  });
}

async function getEnvironnementById(id_env) {
  return prisma.environnement.findUnique({
    where:  { id_env },
    select: ENV_SELECT,
  });
}

/**
 * Crée un environnement.
 * @param {object} data { nom_env, description? }
 */
async function createEnvironnement(data) {
  const { nom_env, description = null } = data;

  const existing = await prisma.environnement.findUnique({ where: { nom_env: nom_env.trim() } });
  if (existing) {
    const err = new Error(`Un environnement avec le nom "${nom_env}" existe déjà.`);
    err.code = 'ENV_NAME_CONFLICT';
    err.statusCode = 409;
    throw err;
  }

  return prisma.environnement.create({
    data: {
      code_metier: codeEnvironnement(),
      nom_env:     nom_env.trim(),
      description,
    },
    select: ENV_SELECT,
  });
}

/**
 * Modifie un environnement.
 */
async function updateEnvironnement(id_env, data) {
  const { nom_env, description } = data;

  if (nom_env) {
    const existing = await prisma.environnement.findFirst({
      where: { nom_env: nom_env.trim(), NOT: { id_env } },
    });
    if (existing) {
      const err = new Error(`Un autre environnement porte déjà le nom "${nom_env}".`);
      err.code = 'ENV_NAME_CONFLICT';
      err.statusCode = 409;
      throw err;
    }
  }

  return prisma.environnement.update({
    where: { id_env },
    data: {
      ...(nom_env     !== undefined && { nom_env: nom_env.trim() }),
      ...(description !== undefined && { description }),
    },
    select: ENV_SELECT,
  });
}

/**
 * Supprime un environnement.
 * Bloqué si des CIs ou Changements y sont liés.
 */
async function deleteEnvironnement(id_env) {
  const ciCount   = await prisma.ciEnv.count({ where: { id_env } });
  const chgCount  = await prisma.changement.count({ where: { id_env } });

  if (ciCount > 0 || chgCount > 0) {
    const err = new Error(
      `Impossible de supprimer cet environnement : ${ciCount} CI(s) et ${chgCount} Changement(s) y sont liés.`
    );
    err.code = 'ENV_IN_USE';
    err.statusCode = 409;
    throw err;
  }

  await prisma.environnement.delete({ where: { id_env } });
  return { deleted: true, id_env };
}

module.exports = {
  // CIs
  createCI,
  getAllCIs,
  getCIById,
  updateCI,
  deleteCI,
  addEnvironnement,
  removeEnvironnement,
  getEnvironnementsByCI,
  // Environnements
  getAllEnvironnements,
  getEnvironnementById,
  createEnvironnement,
  updateEnvironnement,
  deleteEnvironnement,
};