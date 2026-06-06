'use strict';

const prisma = require('./prisma.service');

/**
 * Retourne les statuts, filtrés par contexte si fourni.
 * @param {string|undefined} contexte - 'RFC' | 'CHANGEMENT' | 'TACHE'
 */
async function getStatuts(contexte) {
  const where = contexte ? { contexte } : {};
  return prisma.statut.findMany({
    where,
    select: {
      id_statut:   true,
      code_metier: true,
      code_statut: true,
      libelle:     true,
      description: true,
      contexte:    true,
    },
    orderBy: [{ contexte: 'asc' }, { libelle: 'asc' }],
  });
}

async function getPriorites() {
  return prisma.priorite.findMany({
    select: {
      id_priorite:   true,
      code_metier:   true,
      code_priorite: true,
      libelle:       true,
    },
    orderBy: { code_priorite: 'asc' },
  });
}

async function getTypesRfc() {
  return prisma.typeRfc.findMany({
    select: {
      id_type:     true,
      code_metier: true,
      type:        true,
      description: true,
    },
    orderBy: { type: 'asc' },
  });
}

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

module.exports = { 
  getStatuts, 
  getPriorites, 
  getTypesRfc, 
  getDirections 
};