'use strict';

const prisma = require('./prisma.service');
const { codeDirection } = require('../utils/entity-code.utils');

// ── GET tous ────────────────────────────────────────────────
async function getDirections() {
  return prisma.directionMetier.findMany({
    select: {
      id_direction:  true,
      code_metier:   true,
      nom_direction: true,
    },
    orderBy: { nom_direction: 'asc' },
  });
}

// ── GET un ──────────────────────────────────────────────────
async function getDirectionById(id_direction) {
  const direction = await prisma.directionMetier.findUnique({
    where:  { id_direction },
    select: {
      id_direction:  true,
      code_metier:   true,
      nom_direction: true,
      utilisateurs: {
        select: {
          id_user:     true,
          nom_user:    true,
          prenom_user: true,
          email_user:  true,
        },
      },
    },
  });

  if (!direction) {
    const err = new Error('Direction introuvable.');
    err.code = 'NOT_FOUND';
    throw err;
  }
  return direction;
}

// ── POST ─────────────────────────────────────────────────────
async function createDirection(data) {
  const { nom_direction } = data;

  if (!nom_direction || nom_direction.trim() === '') {
    const err = new Error('nom_direction est obligatoire.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Vérifier doublon
  const existing = await prisma.directionMetier.findUnique({
    where: { nom_direction: nom_direction.trim() },
  });
  if (existing) {
    const err = new Error(`Une direction avec le nom "${nom_direction}" existe déjà.`);
    err.code = 'CONFLICT';
    throw err;
  }

  return prisma.directionMetier.create({
    data: {
      code_metier:   codeDirection(),
      nom_direction: nom_direction.trim(),
    },
    select: {
      id_direction:  true,
      code_metier:   true,
      nom_direction: true,
    },
  });
}

// ── PUT ──────────────────────────────────────────────────────
async function updateDirection(id_direction, data) {
  const { nom_direction } = data;

  if (!nom_direction || nom_direction.trim() === '') {
    const err = new Error('nom_direction est obligatoire.');
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  // Vérifier que la direction existe
  const existing = await prisma.directionMetier.findUnique({ where: { id_direction } });
  if (!existing) {
    const err = new Error('Direction introuvable.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Vérifier doublon de nom (exclure la direction courante)
  const duplicate = await prisma.directionMetier.findFirst({
    where: {
      nom_direction: nom_direction.trim(),
      NOT: { id_direction },
    },
  });
  if (duplicate) {
    const err = new Error(`Une direction avec le nom "${nom_direction}" existe déjà.`);
    err.code = 'CONFLICT';
    throw err;
  }

  return prisma.directionMetier.update({
    where: { id_direction },
    data:  { nom_direction: nom_direction.trim() },
    select: {
      id_direction:  true,
      code_metier:   true,
      nom_direction: true,
    },
  });
}

// ── DELETE ───────────────────────────────────────────────────
async function deleteDirection(id_direction) {
  const existing = await prisma.directionMetier.findUnique({
    where:   { id_direction },
    include: { utilisateurs: { select: { id_user: true } } },
  });

  if (!existing) {
    const err = new Error('Direction introuvable.');
    err.code = 'NOT_FOUND';
    throw err;
  }

  // Empêcher la suppression si des utilisateurs sont rattachés
  if (existing.utilisateurs.length > 0) {
    const err = new Error(
      `Impossible de supprimer : ${existing.utilisateurs.length} utilisateur(s) rattaché(s) à cette direction.`
    );
    err.code = 'CONFLICT';
    throw err;
  }

  await prisma.directionMetier.delete({ where: { id_direction } });
  return { deleted: true, id_direction };
}

module.exports = {
  getDirections,
  getDirectionById,
  createDirection,
  updateDirection,
  deleteDirection,
};