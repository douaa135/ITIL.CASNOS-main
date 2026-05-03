/**
 * Codes métier (PRM-…, RFC-…, etc.) — id technique = UUID en base.
 */
const { randomBytes } = require('crypto');

const SUFFIX_BYTES = 4;

const makeDisplayCode = (prefix) => {
  const suffix = randomBytes(SUFFIX_BYTES).toString('hex').toUpperCase();
  return `${prefix}-${suffix}`;
};

module.exports = {
  makeDisplayCode,
  // Exemples initiaux (RFC / CHG / TCH)
  codeRfc: () => makeDisplayCode('RFC'),
  codeChangement: () => makeDisplayCode('CHG'),
  codeTache: () => makeDisplayCode('TCH'),
  // Toutes les entités
  codePermission: () => makeDisplayCode('PRM'),
  codeRole: () => makeDisplayCode('ROL'),
  codeDirection: () => makeDisplayCode('DIR'),
  codeUtilisateur: () => makeDisplayCode('USR'),
  codeCab: () => makeDisplayCode('CAB'),
  codeTypeRfc: () => makeDisplayCode('TRF'),
  codeStatut: () => makeDisplayCode('STA'),
  codeStatutHistory: () => makeDisplayCode('SHS'),
  codePriorite: () => makeDisplayCode('PRI'),
  codeEnvironnement: () => makeDisplayCode('ENV'),
  codeConfigurationItem: () => makeDisplayCode('CNF'),
  codeEvaluationRisque: () => makeDisplayCode('EVR'),
  codePiecesJointe: () => makeDisplayCode('PJS'),
  codeCommentaire: () => makeDisplayCode('CMT'),
  codePlanChangement: () => makeDisplayCode('PLN'),
  codePlanRollback: () => makeDisplayCode('RBK'),
  codeTest: () => makeDisplayCode('TST'),
  codePir: () => makeDisplayCode('PIR'),
  codeGuide: () => makeDisplayCode('GDE'),
  codeJournalExecution: () => makeDisplayCode('JRN'),
  codeReunionCab: () => makeDisplayCode('REU'),
  codeVoteCab: () => makeDisplayCode('VOT'),
  codeDecisionCab: () => makeDisplayCode('DCB'),
  codeNotification: () => makeDisplayCode('NOT'),
  codeRapport: () => makeDisplayCode('RPT'),
  codeAuditLog: () => makeDisplayCode('AUD'),
};
