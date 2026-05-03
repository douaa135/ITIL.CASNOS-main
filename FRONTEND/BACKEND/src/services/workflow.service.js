'use strict';

const prisma   = require('../services/prisma.service');
const notifSvc = require('../services/notification.service');

const TRANSITIONS_RFC = {
  BROUILLON:     ['SOUMIS', 'CLOTUREE'],
  SOUMIS:        ['PRE_APPROUVEE', 'REJETEE', 'CLOTUREE'],
  PRE_APPROUVEE: ['EVALUEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
  EVALUEE:       ['APPROUVEE', 'REJETEE', 'CLOTUREE'],
  APPROUVEE:     [],
  REJETEE:       ['BROUILLON', 'CLOTUREE'],
  CLOTUREE:      [],
};

const TRANSITIONS_CHG = {
  EN_PLANIFICATION: ['EN_COURS',   'CLOTURE'],
  EN_COURS:         ['IMPLEMENTE', 'EN_ECHEC', 'CLOTURE'],
  IMPLEMENTE:       ['TESTE',      'EN_ECHEC'],
  TESTE:            ['CLOTURE'],
  EN_ECHEC:         ['EN_PLANIFICATION', 'CLOTURE'],
  CLOTURE:          [],
};

const TRANSITIONS_TCH = {
  EN_ATTENTE: ['EN_COURS', 'ANNULEE'],
  EN_COURS:   ['TERMINEE', 'ANNULEE'],
  TERMINEE:   [],
  ANNULEE:    [],
};

/**
 * Escalade une RFC vers ECAB :
 *  - Passe urgence = true
 *  - Change le type RFC → URGENT (TYPE-RFC-URG)
 *  - Notifie les Change Managers actifs
 *
 * @param {string} id_rfc       - RFC à escalader
 * @param {string} id_demandeur - Utilisateur déclenchant l'escalade
 * @returns {{ rfcUpdated, cmIds }}
 */
async function escaladerRfc(id_rfc, id_demandeur) {
  const typeUrgent = await prisma.typeRfc.findUnique({
    where: { code_metier: 'TYPE-RFC-URG' },
  });
  if (!typeUrgent) throw new Error('Type RFC URGENT introuvable en BDD.');

  const rfcUpdated = await prisma.rfc.update({
    where: { id_rfc },
    data:  { urgence: true, id_type: typeUrgent.id_type },
    include: {
      statut:    { select: { code_statut: true, libelle: true } },
      typeRfc:   { select: { type: true } },
      priorite:  { select: { code_priorite: true, libelle: true } },
      demandeur: { select: { id_user: true, nom_user: true, prenom_user: true } },
    },
  });

  const changeManagers = await prisma.utilisateur.findMany({
    where: {
      actif:     true,
      userRoles: { some: { role: { nom_role: 'CHANGE_MANAGER' } } },
    },
    select: { id_user: true },
  });

  const cmIds = changeManagers.map(u => u.id_user);

  await notifSvc.notifyEscalation(id_rfc, id_demandeur, cmIds);

  return { rfcUpdated, cmIds };
}

module.exports = {
  escaladerRfc,
  TRANSITIONS_RFC,
  TRANSITIONS_CHG,
  TRANSITIONS_TCH,
};