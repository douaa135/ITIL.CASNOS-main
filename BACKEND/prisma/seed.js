require('dotenv').config();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg }     = require('@prisma/adapter-pg');
const bcrypt           = require('bcryptjs');

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma  = new PrismaClient({ adapter });

const PLAIN_PASSWORD = 'password';
const BCRYPT_ROUNDS  = 10;

// ============================================================
// ① DONNÉES DE BASE
// ============================================================

const directions = [
  { code_metier: 'DIR-001', nom_direction: 'Direction des Prestations' },
  { code_metier: 'DIR-002', nom_direction: 'Direction Recouvrement du Contrôle et du Contentieux' },
  { code_metier: 'DIR-003', nom_direction: 'Direction des Opérations Financières' },
  { code_metier: 'DIR-004', nom_direction: 'Direction des Ressources Humaines et des Moyens (DRHM)' },
  { code_metier: 'DIR-005', nom_direction: "Direction de Modernisation des Systèmes d'Information (DMSI)" },
  { code_metier: 'DIR-006', nom_direction: 'Direction du Contrôle Médical, des Études et du Conventionnement' },
  { code_metier: 'DIR-007', nom_direction: "Direction de l'Audit et du Contrôle" },
];

const roles = [
  { code_metier: 'ROLE-ADMIN', nom_role: 'ADMIN',          description: 'Administrateur système — accès total' },
  { code_metier: 'ROLE-CM',    nom_role: 'CHANGE_MANAGER',  description: 'Gestionnaire des changements' },
  { code_metier: 'ROLE-IMP',   nom_role: 'IMPLEMENTEUR',    description: 'Équipe technique — exécute les changements' },
  { code_metier: 'ROLE-CAB',   nom_role: 'MEMBRE_CAB',      description: 'Membre du CAB — évalue et vote les RFC' },
  { code_metier: 'ROLE-DEM',   nom_role: 'DEMANDEUR',       description: 'Demandeur — soumet des RFC' },
  { code_metier: 'ROLE-SD',    nom_role: 'SERVICE_DESK',    description: 'Service Desk' },
];

const permissions = [
  { code_metier: 'PRM-RFC-CREATE',  code_permission: 'rfc:create',         description: 'Créer une RFC',              module: 'RFC' },
  { code_metier: 'PRM-RFC-READ',    code_permission: 'rfc:read',           description: 'Lire les RFC',               module: 'RFC' },
  { code_metier: 'PRM-RFC-UPDATE',  code_permission: 'rfc:update',         description: 'Modifier une RFC',           module: 'RFC' },
  { code_metier: 'PRM-RFC-APR',     code_permission: 'rfc:approve',        description: 'Approuver une RFC',          module: 'RFC' },
  { code_metier: 'PRM-RFC-REJ',     code_permission: 'rfc:reject',         description: 'Rejeter une RFC',            module: 'RFC' },
  { code_metier: 'PRM-RFC-CAN',     code_permission: 'rfc:cancel',         description: 'Annuler une RFC',            module: 'RFC' },
  { code_metier: 'PRM-RFC-STAT',    code_permission: 'rfc:statut',         description: 'Modifier statut RFC',        module: 'RFC' },
  { code_metier: 'PRM-CHG-CREATE',  code_permission: 'changement:create',  description: 'Créer un changement',        module: 'CHANGEMENT' },
  { code_metier: 'PRM-CHG-READ',    code_permission: 'changement:read',    description: 'Lire les changements',       module: 'CHANGEMENT' },
  { code_metier: 'PRM-CHG-UPDATE',  code_permission: 'changement:update',  description: 'Modifier un changement',     module: 'CHANGEMENT' },
  { code_metier: 'PRM-CHG-PLAN',    code_permission: 'changement:plan',    description: 'Planifier un changement',    module: 'CHANGEMENT' },
  { code_metier: 'PRM-CHG-EXEC',    code_permission: 'changement:execute', description: 'Exécuter un changement',     module: 'CHANGEMENT' },
  { code_metier: 'PRM-CHG-CLOSE',   code_permission: 'changement:close',   description: 'Clôturer un changement',     module: 'CHANGEMENT' },
  { code_metier: 'PRM-CHG-STAT',    code_permission: 'changement:statut',  description: 'Modifier statut changement', module: 'CHANGEMENT' },
  { code_metier: 'PRM-TCH-CREATE',  code_permission: 'tache:create',       description: 'Créer une tâche',            module: 'TACHE' },
  { code_metier: 'PRM-TCH-READ',    code_permission: 'tache:read',         description: 'Lire les tâches',            module: 'TACHE' },
  { code_metier: 'PRM-TCH-UPDATE',  code_permission: 'tache:update',       description: 'Modifier une tâche',         module: 'TACHE' },
  { code_metier: 'PRM-TCH-EXEC',    code_permission: 'tache:execute',      description: 'Exécuter une tâche',         module: 'TACHE' },
  { code_metier: 'PRM-CAB-READ',    code_permission: 'cab:read',           description: 'Voir les réunions CAB',      module: 'CAB' },
  { code_metier: 'PRM-CAB-MANAGE',  code_permission: 'cab:manage',         description: 'Gérer les réunions CAB',     module: 'CAB' },
  { code_metier: 'PRM-CAB-VOTE',    code_permission: 'cab:vote',           description: 'Voter sur une RFC',          module: 'CAB' },
  { code_metier: 'PRM-RPT-READ',    code_permission: 'rapport:read',       description: 'Lire les rapports',          module: 'RAPPORT' },
  { code_metier: 'PRM-RPT-GEN',     code_permission: 'rapport:generate',   description: 'Générer un rapport',         module: 'RAPPORT' },
  { code_metier: 'PRM-ADM-USER',    code_permission: 'user:manage',        description: 'Gérer les utilisateurs',     module: 'ADMIN' },
  { code_metier: 'PRM-ADM-CFG',     code_permission: 'system:config',      description: 'Configurer le système',      module: 'ADMIN' },
  { code_metier: 'PRM-PLN-READ',   code_permission: 'planning:read',   description: 'Voir le calendrier et les blackouts',        module: 'PLANNING' },
  { code_metier: 'PRM-PLN-MANAGE', code_permission: 'planning:manage', description: 'Créer / modifier / supprimer des blackouts', module: 'PLANNING' },
];

const rolePermissionsMap = {
  ADMIN: permissions.map(p => p.code_permission),
  CHANGE_MANAGER: [
    'rfc:create','rfc:read','rfc:update','rfc:approve','rfc:reject','rfc:cancel','rfc:statut',
    'changement:create','changement:read','changement:update','changement:plan','changement:close','changement:statut',
    'tache:create','tache:read','tache:update',
    'cab:read','cab:manage',
    'rapport:read','rapport:generate',
    'planning:read',
  ],
  IMPLEMENTEUR: [
    'rfc:read',
    'changement:read','changement:execute','changement:statut',
    'tache:read','tache:update','tache:execute',
    'rapport:read',
    'planning:read',
  ],
  MEMBRE_CAB: [
    'rfc:read','changement:read',
    'cab:read','cab:vote',
    'rapport:read',
    'planning:read',
  ],
  DEMANDEUR: [
    'rfc:create','rfc:read','rfc:update','rfc:cancel',
    'rapport:read',
  ],
  SERVICE_DESK: [
    'rfc:create','rfc:read','rfc:update','rfc:statut','rfc:cancel',
    'changement:read',
    'tache:read',
    'rapport:read',
  ],
};

const statutsRfc = [
  { code_metier: 'STAT-RFC-PAP', code_statut: 'PRE_APPROUVEE',  libelle: 'Pré-évaluée',   description: 'RFC pré-approuvée',                 contexte: 'RFC' },
  { code_metier: 'STAT-RFC-SOU', code_statut: 'SOUMIS',         libelle: 'Soumise',        description: 'RFC soumise pour évaluation',        contexte: 'RFC' },
  { code_metier: 'STAT-RFC-EVA', code_statut: 'EVALUEE',        libelle: 'Évaluée',        description: 'RFC évaluée par le Change Manager',  contexte: 'RFC' },
  { code_metier: 'STAT-RFC-APR', code_statut: 'APPROUVEE',      libelle: 'Approuvée',      description: 'RFC approuvée par le CAB',           contexte: 'RFC' },
  { code_metier: 'STAT-RFC-REJ', code_statut: 'REJETEE',        libelle: 'Rejetée',        description: 'RFC rejetée',                        contexte: 'RFC' },
  { code_metier: 'STAT-RFC-CLO', code_statut: 'CLOTUREE',       libelle: 'Clôturée',       description: 'RFC clôturée ou annulée',            contexte: 'RFC' },
];

const statutsChangement = [
  { code_metier: 'STAT-CHG-PLA', code_statut: 'EN_PLANIFICATION', libelle: 'En planification', description: 'Changement en cours de planification',                     contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-ATT', code_statut: 'EN_ATTENTE',       libelle: 'En attente',       description: 'Changement planifié, en attente de date ou de ressources', contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-ENC', code_statut: 'EN_COURS',         libelle: 'En cours',         description: "Changement en cours d'exécution",                          contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-IMP', code_statut: 'IMPLEMENTE',       libelle: 'Implémenté',       description: 'Changement implémenté',                                    contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-TST', code_statut: 'TESTE',            libelle: 'Testé',            description: 'Changement testé et validé',                               contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-CLO', code_statut: 'CLOTUREE',         libelle: 'Clôturé',          description: 'Changement clôturé',                                       contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-ECH', code_statut: 'EN_ECHEC',         libelle: 'En échec',         description: 'Changement échoué — rollback',                             contexte: 'CHANGEMENT' },
];

const statutsTache = [
  { code_metier: 'STAT-TCH-ATT', code_statut: 'EN_ATTENTE', libelle: 'En attente', description: 'Tâche créée, pas encore démarrée',        contexte: 'TACHE' },
  { code_metier: 'STAT-TCH-ENC', code_statut: 'EN_COURS',   libelle: 'En cours',   description: "Tâche en cours d'exécution",              contexte: 'TACHE' },
  { code_metier: 'STAT-TCH-TER', code_statut: 'TERMINEE',   libelle: 'Terminée',   description: 'Tâche terminée avec succès',              contexte: 'TACHE' },
  { code_metier: 'STAT-TCH-ANN', code_statut: 'ANNULEE',    libelle: 'Annulée',    description: 'Tâche annulée avant ou pendant exécution', contexte: 'TACHE' },
];

const priorites = [
  { code_metier: 'PRI-P0', code_priorite: 'P0', libelle: 'En_Etude' },
  { code_metier: 'PRI-P1', code_priorite: 'P1', libelle: 'Faible'   },
  { code_metier: 'PRI-P2', code_priorite: 'P2', libelle: 'Basse'    },
  { code_metier: 'PRI-P3', code_priorite: 'P3', libelle: 'Moyenne'  },
  { code_metier: 'PRI-P4', code_priorite: 'P4', libelle: 'Haute'    },
  { code_metier: 'PRI-P5', code_priorite: 'P5', libelle: 'Critique' },
];

const typesRfc = [
  { code_metier: 'TYPE-RFC-STD', type: 'STANDARD', description: 'Changement récurrent, faible risque, pré-approuvé' },
  { code_metier: 'TYPE-RFC-NRM', type: 'NORMAL',   description: 'Changement nécessitant évaluation et validation CAB' },
  { code_metier: 'TYPE-RFC-URG', type: 'URGENT',   description: 'Changement critique devant être réalisé immédiatement' },
];

const environnements = [
  { code_metier: 'ENV-PRD', nom_env: 'PRODUCTION',    description: 'Environnement de production — critique' },
  { code_metier: 'ENV-REC', nom_env: 'RECETTE',       description: 'Environnement de recette / pré-production' },
  { code_metier: 'ENV-DEV', nom_env: 'DEVELOPPEMENT', description: 'Environnement de développement' },
  { code_metier: 'ENV-TST', nom_env: 'TEST',          description: 'Environnement de tests' },
];

const configItems = [
  { code_metier: 'CI-001', nom_ci: 'Serveur Application Principal',       type_ci: 'Serveur',           version_ci: 'v2.1', description: 'Serveur principal CASNOS' },
  { code_metier: 'CI-002', nom_ci: 'Base de Données PostgreSQL',          type_ci: 'Base de données',   version_ci: '15.2', description: 'Base de données principale' },
  { code_metier: 'CI-003', nom_ci: 'Application Web CASNOS',              type_ci: 'Application',       version_ci: 'v3.5', description: 'Interface web usagers' },
  { code_metier: 'CI-004', nom_ci: 'Serveur de Fichiers',                 type_ci: 'Serveur',           version_ci: 'v1.0', description: 'Stockage documents' },
  { code_metier: 'CI-005', nom_ci: 'Routeur Principal',                   type_ci: 'Réseau',            version_ci: 'v2.0', description: 'Routeur réseau principal' },
  { code_metier: 'CI-006', nom_ci: 'Système de Messagerie',               type_ci: 'Application',       version_ci: 'v4.1', description: 'Messagerie interne' },
  { code_metier: 'CI-007', nom_ci: 'Module Gestion des Assurés',          type_ci: 'Module applicatif', version_ci: 'v2.8', description: 'Gestion dossiers assurés' },
  { code_metier: 'CI-008', nom_ci: 'Module Recouvrement des Cotisations', type_ci: 'Module applicatif', version_ci: 'v1.5', description: 'Calcul et suivi cotisations' },
  { code_metier: 'CI-009', nom_ci: 'Firewall Périmétrique',               type_ci: 'Sécurité',          version_ci: 'v3.2', description: 'Pare-feu principal' },
  { code_metier: 'CI-010', nom_ci: 'Serveur de Sauvegarde',               type_ci: 'Serveur',           version_ci: 'v1.8', description: 'Serveur de backup automatisé' },
  { code_metier: 'CI-011', nom_ci: 'Annuaire LDAP',                       type_ci: 'Service',           version_ci: 'v2.0', description: 'Service annuaire et authentification' },
  { code_metier: 'CI-012', nom_ci: 'Module Paiement en Ligne',            type_ci: 'Module applicatif', version_ci: 'v1.2', description: 'Paiement des cotisations en ligne' },
];

const blackoutsInitiaux = [
  {
    code_metier: 'BLK-ALG-001',
    libelle:     'Jour de l\'An',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-01-01'),
    date_fin:    new Date('2025-01-01'),
    recurrent:   true,
    description: '1er janvier',
  },
  {
    code_metier: 'BLK-ALG-002',
    libelle:     'Yennayer — Nouvel An Amazigh',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-01-12'),
    date_fin:    new Date('2025-01-12'),
    recurrent:   true,
    description: '12 janvier',
  },
  {
    code_metier: 'BLK-ALG-003',
    libelle:     'Fête du Travail',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-05-01'),
    date_fin:    new Date('2025-05-01'),
    recurrent:   true,
    description: '1er mai',
  },
  {
    code_metier: 'BLK-ALG-004',
    libelle:     'Fête de l\'Indépendance',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-07-05'),
    date_fin:    new Date('2025-07-05'),
    recurrent:   true,
    description: '5 juillet',
  },
  {
    code_metier: 'BLK-ALG-005',
    libelle:     'Fête de la Révolution',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-11-01'),
    date_fin:    new Date('2025-11-01'),
    recurrent:   true,
    description: '1er novembre',
  },
  // ── Jours fériés islamiques 2025 (non récurrents — dates variables) ──
  {
    code_metier: 'BLK-ALG-006',
    libelle:     'Aïd El Fitr 2025',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-03-30'),
    date_fin:    new Date('2025-04-01'),
    recurrent:   false,
    description: 'Aïd El Fitr — fin du Ramadan (3 jours)',
  },
  {
    code_metier: 'BLK-ALG-007',
    libelle:     'Aïd El Adha 2025',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-06-06'),
    date_fin:    new Date('2025-06-08'),
    recurrent:   false,
    description: 'Aïd El Adha (3 jours)',
  },
  {
    code_metier: 'BLK-ALG-008',
    libelle:     'Mouled Ennabawi 2025',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2025-09-04'),
    date_fin:    new Date('2025-09-04'),
    recurrent:   false,
    description: 'Anniversaire du Prophète',
  },
  {
    code_metier: 'BLK-ALG-009',
    libelle:     'Aïd El Fitr 2026',
    type:        'JOUR_FERIE',
    date_debut:  new Date('2026-03-20'),
    date_fin:    new Date('2026-03-22'),
    recurrent:   false,
    description: 'Aïd El Fitr 2026 (dates approximatives)',
  },
  // ── Périodes critiques CASNOS ─────────────────────────────
  {
    code_metier: 'BLK-CASNOS-001',
    libelle:     'Clôture Trimestrielle Q1',
    type:        'PERIODE_CRITIQUE',
    date_debut:  new Date('2025-03-28'),
    date_fin:    new Date('2025-03-31'),
    recurrent:   true,
    description: 'Gel des changements production — clôture comptable Q1. Aucune modification des systèmes de recouvrement et prestations.',
  },
  {
    code_metier: 'BLK-CASNOS-002',
    libelle:     'Clôture Trimestrielle Q2',
    type:        'PERIODE_CRITIQUE',
    date_debut:  new Date('2025-06-28'),
    date_fin:    new Date('2025-06-30'),
    recurrent:   true,
    description: 'Gel des changements production — clôture Q2.',
  },
  {
    code_metier: 'BLK-CASNOS-003',
    libelle:     'Clôture Trimestrielle Q3',
    type:        'PERIODE_CRITIQUE',
    date_debut:  new Date('2025-09-28'),
    date_fin:    new Date('2025-09-30'),
    recurrent:   true,
    description: 'Gel des changements production — clôture Q3.',
  },
  {
    code_metier: 'BLK-CASNOS-004',
    libelle:     'Clôture Annuelle',
    type:        'PERIODE_CRITIQUE',
    date_debut:  new Date('2025-12-25'),
    date_fin:    new Date('2025-12-31'),
    recurrent:   true,
    description: 'Gel complet — clôture annuelle CASNOS. Aucun changement en production du 25/12 au 31/12.',
  },
  {
    code_metier: 'BLK-CASNOS-005',
    libelle:     'Pic de déclarations — Janvier',
    type:        'PERIODE_CRITIQUE',
    date_debut:  new Date('2025-01-15'),
    date_fin:    new Date('2025-01-31'),
    recurrent:   true,
    description: 'Période de forte charge — déclarations annuelles des assurés non-salariés.',
  },
  {
    code_metier: 'BLK-CASNOS-006',
    libelle:     'Ramadan 2025',
    type:        'PERIODE_CRITIQUE',
    date_debut:  new Date('2025-03-01'),
    date_fin:    new Date('2025-03-29'),
    recurrent:   false,
    description: 'Période sensible — réduire les changements à risque. Maintenir la disponibilité des services.',
  },
];
 
// ============================================================
// UTILISATEURS — Élargi
// ============================================================
const usersRaw = [
  { code_metier: 'USR-2024-0001', nom_user: 'Boukhettala', prenom_user: 'Amira',    email_user: 'admin@casnos.dz',          date_naissance: new Date('1985-03-15'), directionCode: 'DIR-005', roleName: 'ADMIN',          actif: true },
  { code_metier: 'USR-2024-0002', nom_user: 'Merabti',     prenom_user: 'Karim',    email_user: 'change.manager@casnos.dz', date_naissance: new Date('1982-07-22'), directionCode: 'DIR-005', roleName: 'CHANGE_MANAGER', actif: true },
  { code_metier: 'USR-2024-0003', nom_user: 'Rahmani',     prenom_user: 'Sara',     email_user: 'demandeur@casnos.dz',      date_naissance: new Date('1990-11-08'), directionCode: 'DIR-001', roleName: 'DEMANDEUR',       actif: true },
  { code_metier: 'USR-2024-0004', nom_user: 'Benamara',    prenom_user: 'Youcef',   email_user: 'implementeur@casnos.dz',   date_naissance: new Date('1993-04-30'), directionCode: 'DIR-005', roleName: 'IMPLEMENTEUR',    actif: true },
  { code_metier: 'USR-2024-0005', nom_user: 'Hamdi',       prenom_user: 'Nadir',    email_user: 'cab@casnos.dz',            date_naissance: new Date('1979-09-12'), directionCode: 'DIR-004', roleName: 'MEMBRE_CAB',      actif: true },
  { code_metier: 'USR-2024-0006', nom_user: 'Tlemcani',    prenom_user: 'Rania',    email_user: 'servicedesk@casnos.dz',    date_naissance: new Date('1995-01-25'), directionCode: 'DIR-005', roleName: 'SERVICE_DESK',    actif: true },
  { code_metier: 'USR-2024-0007', nom_user: 'Khelifi',     prenom_user: 'Omar',     email_user: 'inactif@casnos.dz',        date_naissance: new Date('1988-06-14'), directionCode: 'DIR-001', roleName: 'DEMANDEUR',       actif: false },
  // Utilisateurs supplémentaires
  { code_metier: 'USR-2024-0008', nom_user: 'Bensalem',    prenom_user: 'Fatima',   email_user: 'fatima.bensalem@casnos.dz',date_naissance: new Date('1987-05-20'), directionCode: 'DIR-003', roleName: 'DEMANDEUR',       actif: true },
  { code_metier: 'USR-2024-0009', nom_user: 'Cherif',      prenom_user: 'Mohamed',  email_user: 'mohamed.cherif@casnos.dz', date_naissance: new Date('1980-12-03'), directionCode: 'DIR-002', roleName: 'IMPLEMENTEUR',    actif: true },
  { code_metier: 'USR-2024-0010', nom_user: 'Zerrouki',    prenom_user: 'Leila',    email_user: 'leila.zerrouki@casnos.dz', date_naissance: new Date('1992-08-17'), directionCode: 'DIR-006', roleName: 'MEMBRE_CAB',      actif: true },
  { code_metier: 'USR-2024-0011', nom_user: 'Boukhari',    prenom_user: 'Rachid',   email_user: 'rachid.boukhari@casnos.dz',date_naissance: new Date('1975-03-28'), directionCode: 'DIR-007', roleName: 'MEMBRE_CAB',      actif: true },
  { code_metier: 'USR-2024-0012', nom_user: 'Mansouri',    prenom_user: 'Nadia',    email_user: 'nadia.mansouri@casnos.dz', date_naissance: new Date('1991-10-14'), directionCode: 'DIR-004', roleName: 'DEMANDEUR',       actif: true },
  { code_metier: 'USR-2024-0013', nom_user: 'Ouali',       prenom_user: 'Tarek',    email_user: 'tarek.ouali@casnos.dz',    date_naissance: new Date('1984-06-09'), directionCode: 'DIR-005', roleName: 'IMPLEMENTEUR',    actif: true },
  { code_metier: 'USR-2024-0014', nom_user: 'Belhadj',     prenom_user: 'Samira',   email_user: 'samira.belhadj@casnos.dz', date_naissance: new Date('1989-02-22'), directionCode: 'DIR-001', roleName: 'SERVICE_DESK',    actif: true },
  { code_metier: 'USR-2024-0015', nom_user: 'Ghozlane',    prenom_user: 'Djamel',   email_user: 'djamel.ghozlane@casnos.dz',date_naissance: new Date('1978-11-30'), directionCode: 'DIR-005', roleName: 'CHANGE_MANAGER',  actif: true },
];

// ============================================================
// ② DONNÉES DE TEST ENRICHIES
// ============================================================

const rfcsRaw = [
  // ── RFC 001 — APPROUVÉE → donne CHG-001
  {
    code_rfc: 'RFC-SEED-001',
    titre_rfc: 'Migration base de données — module gestion des assurés v3',
    description: 'Migration du schéma PostgreSQL du module gestion des assurés vers la version 3.0. Ajout de nouvelles colonnes, index et contraintes.',
    justification: "La version actuelle ne supporte pas les nouvelles exigences réglementaires 2025. La migration est nécessaire avant le déploiement du module v3.",
    date_souhaitee: new Date('2025-02-01'),
    urgence: false,
    impacte_estimee: 'Impact fort sur le module Prestations. Fenêtre de maintenance requise (nuit du weekend).',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P3', statutCode: 'STAT-RFC-APR',
    demandeurEmail: 'demandeur@casnos.dz',
    ciCodes: ['CI-002', 'CI-007'],
    evaluation: { impacte: 3, probabilite: 2, score_risque: 6, description: 'Risque moyen — rollback préparé, tests complets requis.' },
  },
  // ── RFC 002 — SOUMISE
  {
    code_rfc: 'RFC-SEED-002',
    titre_rfc: 'Correctif de sécurité urgence — vulnérabilité CVE-2025-1234',
    description: 'Application du patch de sécurité pour la vulnérabilité critique CVE-2025-1234 affectant le serveur application.',
    justification: 'Vulnérabilité activement exploitée. Patch éditeur disponible. Délai de correction : 24h maximum.',
    date_souhaitee: new Date('2025-01-16'),
    urgence: true,
    impacte_estimee: 'Redémarrage du serveur application requis. Coupure de 10-15 minutes.',
    typeCode: 'TYPE-RFC-URG', prioriteCode: 'PRI-P5', statutCode: 'STAT-RFC-SOU',
    demandeurEmail: 'servicedesk@casnos.dz',
    ciCodes: ['CI-001'],
    evaluation: null,
  },
  // ── RFC 003 — REJETÉE
  {
    code_rfc: 'RFC-SEED-003',
    titre_rfc: 'Ajout mémoire RAM serveur de fichiers',
    description: 'Extension de la RAM du serveur de fichiers de 16 Go à 32 Go pour améliorer les performances.',
    justification: 'Le serveur atteint régulièrement 90% de la RAM disponible aux heures de pointe.',
    date_souhaitee: new Date('2025-02-15'),
    urgence: false,
    impacte_estimee: 'Impact faible. Arrêt planifié du serveur de 5 minutes.',
    typeCode: 'TYPE-RFC-STD', prioriteCode: 'PRI-P2', statutCode: 'STAT-RFC-REJ',
    demandeurEmail: 'demandeur@casnos.dz',
    ciCodes: ['CI-004'],
    evaluation: { impacte: 1, probabilite: 1, score_risque: 1, description: 'Risque très faible. Opération matérielle standard.' },
  },
  // ── RFC 004 — APPROUVÉE → donne CHG-002
  {
    code_rfc: 'RFC-SEED-004',
    titre_rfc: 'Déploiement module paiement en ligne v1.2',
    description: 'Mise en production du nouveau module de paiement en ligne des cotisations. Intégration avec la passerelle bancaire CIB.',
    justification: 'Réduction des files d\'attente aux guichets. Objectif stratégique 2025 du DSI.',
    date_souhaitee: new Date('2025-03-10'),
    urgence: false,
    impacte_estimee: 'Impact élevé — touche le portail usagers et la BDD des cotisations. Fenêtre de 2h requise.',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P4', statutCode: 'STAT-RFC-APR',
    demandeurEmail: 'fatima.bensalem@casnos.dz',
    ciCodes: ['CI-003', 'CI-012', 'CI-002'],
    evaluation: { impacte: 4, probabilite: 3, score_risque: 12, description: 'Risque élevé — intégration bancaire sensible. Plan de rollback obligatoire.' },
  },
  // ── RFC 005 — ÉVALUÉE
  {
    code_rfc: 'RFC-SEED-005',
    titre_rfc: 'Remplacement du firewall périmétrique — FortiGate 600E',
    description: 'Remplacement du firewall existant par un FortiGate 600E avec migration des règles de filtrage et des politiques de sécurité.',
    justification: "L'équipement actuel est en fin de vie (EOL janvier 2025). Plus de mises à jour de sécurité disponibles.",
    date_souhaitee: new Date('2025-04-05'),
    urgence: false,
    impacte_estimee: 'Coupure réseau totale de 30 à 60 minutes lors du basculement. Planification weekend obligatoire.',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P4', statutCode: 'STAT-RFC-EVA',
    demandeurEmail: 'servicedesk@casnos.dz',
    ciCodes: ['CI-009', 'CI-001', 'CI-005'],
    evaluation: { impacte: 5, probabilite: 2, score_risque: 10, description: 'Risque élevé mais maîtrisé. Équipement de secours disponible. Tests en recette préalables.' },
  },
  // ── RFC 006 — PRÉ-APPROUVÉE
  {
    code_rfc: 'RFC-SEED-006',
    titre_rfc: 'Mise à jour antivirus — passage à Kaspersky Endpoint 12',
    description: 'Déploiement de la nouvelle version de l\'antivirus sur l\'ensemble du parc informatique (120 postes + 8 serveurs).',
    justification: 'La version actuelle ne couvre plus les nouvelles signatures de malwares 2025. Mise à jour annuelle planifiée.',
    date_souhaitee: new Date('2025-01-28'),
    urgence: false,
    impacte_estimee: 'Impact très faible. Redémarrage de session requis sur les postes. Hors heures de bureau.',
    typeCode: 'TYPE-RFC-STD', prioriteCode: 'PRI-P1', statutCode: 'STAT-RFC-PAP',
    demandeurEmail: 'servicedesk@casnos.dz',
    ciCodes: ['CI-001', 'CI-004'],
    evaluation: { impacte: 1, probabilite: 1, score_risque: 1, description: 'Risque minimal. Opération de routine.' },
  },
  // ── RFC 007 — APPROUVÉE → donne CHG-003
  {
    code_rfc: 'RFC-SEED-007',
    titre_rfc: 'Migration messagerie interne vers Exchange Online 365',
    description: 'Migration de la messagerie interne hébergée on-premise vers Exchange Online (Microsoft 365). Migration des boîtes mail, calendriers et contacts de 200 utilisateurs.',
    justification: 'Réduction des coûts d\'infrastructure. Gain en mobilité et collaboration. Contrat Microsoft signé.',
    date_souhaitee: new Date('2025-05-01'),
    urgence: false,
    impacte_estimee: 'Indisponibilité messagerie estimée à 4h lors de la bascule DNS. Communication préalable aux utilisateurs requise.',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P3', statutCode: 'STAT-RFC-APR',
    demandeurEmail: 'nadia.mansouri@casnos.dz',
    ciCodes: ['CI-006', 'CI-011'],
    evaluation: { impacte: 3, probabilite: 3, score_risque: 9, description: 'Risque modéré. Migration par vagues recommandée. Rollback DNS possible en 15 min.' },
  },
  // ── RFC 008 — SOUMISE (urgente)
  {
    code_rfc: 'RFC-SEED-008',
    titre_rfc: 'Restauration d\'urgence — corruption index BDD prestations',
    description: 'Restauration d\'index corrompus sur la table des prestations suite à une coupure électrique non planifiée. La consultation des dossiers est partielle.',
    justification: 'Dysfonctionnement en production. Les agents ne peuvent plus consulter 15% des dossiers actifs.',
    date_souhaitee: new Date('2025-01-10'),
    urgence: true,
    impacte_estimee: 'Blocage partiel des consultations de dossiers assurés. Impact direct sur les usagers au guichet.',
    typeCode: 'TYPE-RFC-URG', prioriteCode: 'PRI-P5', statutCode: 'STAT-RFC-SOU',
    demandeurEmail: 'servicedesk@casnos.dz',
    ciCodes: ['CI-002', 'CI-007'],
    evaluation: null,
  },
  // ── RFC 009 — CLÔTURÉE
  {
    code_rfc: 'RFC-SEED-009',
    titre_rfc: 'Extension stockage NAS — ajout de 10 To',
    description: 'Extension de la capacité de stockage du NAS principal par ajout de 4 disques durs de 4 To en configuration RAID 6.',
    justification: 'Le NAS est à 87% de capacité. Croissance des données de 20% par an. Seuil critique prévu dans 4 mois.',
    date_souhaitee: new Date('2024-12-15'),
    urgence: false,
    impacte_estimee: 'Aucune interruption de service. Hot-swap disponible.',
    typeCode: 'TYPE-RFC-STD', prioriteCode: 'PRI-P2', statutCode: 'STAT-RFC-CLO',
    demandeurEmail: 'demandeur@casnos.dz',
    ciCodes: ['CI-004'],
    evaluation: { impacte: 1, probabilite: 1, score_risque: 1, description: 'Risque nul. Opération à chaud sans interruption.' },
  },
  // ── RFC 010 — APPROUVÉE → donne CHG-004
  {
    code_rfc: 'RFC-SEED-010',
    titre_rfc: 'Déploiement module recouvrement cotisations v2.0',
    description: 'Mise en production de la version 2.0 du module de recouvrement des cotisations. Nouvelles fonctionnalités : calcul automatique des pénalités, export SEPA, tableau de bord.',
    justification: 'La v1.5 ne supporte pas les nouvelles règles de calcul des pénalités de retard (circulaire CASNOS 2025-03).',
    date_souhaitee: new Date('2025-03-20'),
    urgence: false,
    impacte_estimee: 'Impact fort sur le module recouvrement. Recette complète requise. Formation des agents avant déploiement.',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P4', statutCode: 'STAT-RFC-APR',
    demandeurEmail: 'rachid.boukhari@casnos.dz',
    ciCodes: ['CI-008', 'CI-002', 'CI-003'],
    evaluation: { impacte: 4, probabilite: 2, score_risque: 8, description: 'Risque modéré. Tests de non-régression sur les calculs de cotisations obligatoires.' },
  },
  // ── RFC 011 — SOUMISE
  {
    code_rfc: 'RFC-SEED-011',
    titre_rfc: 'Mise en place supervision réseau — Zabbix',
    description: 'Installation et configuration d\'une solution de supervision réseau Zabbix sur un serveur dédié. Monitoring de l\'ensemble des équipements actifs.',
    justification: 'Absence de supervision centralisée. Les pannes ne sont détectées que signalées par les utilisateurs.',
    date_souhaitee: new Date('2025-04-15'),
    urgence: false,
    impacte_estimee: 'Impact nul. Nouveau serveur dédié. Aucune modification des systèmes existants.',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P3', statutCode: 'STAT-RFC-SOU',
    demandeurEmail: 'tarek.ouali@casnos.dz',
    ciCodes: ['CI-005', 'CI-001'],
    evaluation: null,
  },
  // ── RFC 012 — ÉVALUÉE
  {
    code_rfc: 'RFC-SEED-012',
    titre_rfc: 'Mise à jour LDAP — OpenLDAP 2.6 vers 2.7',
    description: 'Mise à jour majeure du serveur LDAP vers la version 2.7 avec migration des schémas et des ACL. Amélioration des performances de 40%.',
    justification: 'La version 2.6 atteint sa fin de support en mars 2025. Correctifs de sécurité critiques uniquement disponibles en v2.7.',
    date_souhaitee: new Date('2025-02-28'),
    urgence: false,
    impacte_estimee: 'Coupure authentification de 20 minutes. Tous les services dépendants (portail, messagerie, VPN) indisponibles pendant la bascule.',
    typeCode: 'TYPE-RFC-NRM', prioriteCode: 'PRI-P4', statutCode: 'STAT-RFC-EVA',
    demandeurEmail: 'djamel.ghozlane@casnos.dz',
    ciCodes: ['CI-011', 'CI-001'],
    evaluation: { impacte: 4, probabilite: 2, score_risque: 8, description: 'Risque modéré. Test en environnement de recette préalable obligatoire.' },
  },
];

// ============================================================
// CHANGEMENTS — 4 changements issus des RFCs approuvées
// ============================================================
const changementsRaw = [
  {
    code_changement: 'CHG-SEED-001',
    date_debut:      new Date('2025-02-01'),
    date_fin_prevu:  new Date('2025-02-01'),
    date_fin_reelle: null,
    reussite:        null,
    rfcCode:         'RFC-SEED-001',
    changeManagerEmail: 'change.manager@casnos.dz',
    envCode:         'ENV-PRD',
    statutCode:      'STAT-CHG-ENC',
    planChangement: {
      code_metier:   'PLN-SEED-001',
      titre_plan:    'Plan de migration BDD assurés v3',
      etapes_plan:   '1. Sauvegarde complète\n2. Mise en maintenance\n3. Exécution script migration\n4. Vérification contraintes\n5. Tests fonctionnels\n6. Remise en production',
      duree_estimee: 7,
    },
    planRollback: {
      code_metier:        'RBK-SEED-001',
      description:        'Restauration depuis la sauvegarde pg_dump réalisée avant la migration.',
      procedure_rollback: '1. Arrêt application\n2. Drop schéma v3\n3. Restauration pg_restore depuis backup\n4. Vérification intégrité\n5. Redémarrage application\n6. Tests de smoke',
    },
    tests: [
      { code_metier: 'TST-SEED-001', date_test: new Date('2025-02-01'), critere_test: 'Vérifier que toutes les tables sont créées correctement', resultat: 'EN_ATTENTE', contexte: 'Migration schéma' },
      { code_metier: 'TST-SEED-002', date_test: new Date('2025-02-01'), critere_test: 'Vérifier que les données existantes sont intactes', resultat: 'EN_ATTENTE', contexte: 'Intégrité données' },
      { code_metier: 'TST-SEED-003', date_test: new Date('2025-02-01'), critere_test: 'Valider les 15 cas de test du plan de recette module assurés', resultat: 'EN_ATTENTE', contexte: 'Recette fonctionnelle' },
    ],
  },
  {
    code_changement: 'CHG-SEED-002',
    date_debut:      new Date('2025-03-10'),
    date_fin_prevu:  new Date('2025-03-10'),
    date_fin_reelle: null,
    reussite:        null,
    rfcCode:         'RFC-SEED-004',
    changeManagerEmail: 'djamel.ghozlane@casnos.dz',
    envCode:         'ENV-PRD',
    statutCode:      'STAT-CHG-PLA',
    planChangement: {
      code_metier:   'PLN-SEED-002',
      titre_plan:    'Plan déploiement module paiement en ligne v1.2',
      etapes_plan:   '1. Déploiement en recette\n2. Tests intégration bancaire CIB\n3. Validation métier\n4. Déploiement production (nuit)\n5. Tests smoke production\n6. Activation progressive',
      duree_estimee: 5,
    },
    planRollback: {
      code_metier:        'RBK-SEED-002',
      description:        'Désactivation du module paiement en ligne et redirection vers page de maintenance.',
      procedure_rollback: '1. Désactiver le module dans la configuration applicative\n2. Vider le cache nginx\n3. Afficher page de maintenance paiement\n4. Restaurer ancienne version si nécessaire',
    },
    tests: [
      { code_metier: 'TST-SEED-004', date_test: new Date('2025-03-08'), critere_test: 'Test de paiement CIB avec carte de test — montant 100 DA', resultat: 'EN_ATTENTE', contexte: 'Intégration bancaire' },
      { code_metier: 'TST-SEED-005', date_test: new Date('2025-03-08'), critere_test: 'Vérifier la sécurisation SSL du formulaire de paiement', resultat: 'EN_ATTENTE', contexte: 'Sécurité' },
    ],
  },
  {
    code_changement: 'CHG-SEED-003',
    date_debut:      new Date('2025-05-01'),
    date_fin_prevu:  new Date('2025-05-03'),
    date_fin_reelle: null,
    reussite:        null,
    rfcCode:         'RFC-SEED-007',
    changeManagerEmail: 'change.manager@casnos.dz',
    envCode:         'ENV-PRD',
    statutCode:      'STAT-CHG-ATT',
    planChangement: {
      code_metier:   'PLN-SEED-003',
      titre_plan:    'Plan migration messagerie Exchange Online',
      etapes_plan:   '1. Préparation tenant Microsoft 365\n2. Migration par vague (50 boîtes/nuit)\n3. Vague 1 : Direction DMSI\n4. Vague 2 : Directions métier\n5. Vague 3 : Direction générale\n6. Coupure MX record on-premise\n7. Décommissionnement serveur Exchange local',
      duree_estimee: 48,
    },
    planRollback: {
      code_metier:        'RBK-SEED-003',
      description:        'Rétablissement du MX record pointant vers le serveur Exchange on-premise.',
      procedure_rollback: '1. Modifier le MX record DNS vers Exchange on-premise (TTL 300)\n2. Attendre propagation DNS (max 10 min)\n3. Vérifier réception mail\n4. Informer les utilisateurs',
    },
    tests: [
      { code_metier: 'TST-SEED-006', date_test: new Date('2025-04-28'), critere_test: 'Vérifier la migration des calendriers et contacts d\'un utilisateur pilote', resultat: 'EN_ATTENTE', contexte: 'Pilote migration' },
      { code_metier: 'TST-SEED-007', date_test: new Date('2025-04-29'), critere_test: 'Tester l\'envoi/réception mail depuis mobile et Outlook', resultat: 'EN_ATTENTE', contexte: 'Compatibilité clients' },
      { code_metier: 'TST-SEED-008', date_test: new Date('2025-04-30'), critere_test: 'Vérifier les règles de flux mail (SPF, DKIM, DMARC)', resultat: 'EN_ATTENTE', contexte: 'Sécurité mail' },
    ],
  },
  {
    code_changement: 'CHG-SEED-004',
    date_debut:      new Date('2025-03-20'),
    date_fin_prevu:  new Date('2025-03-20'),
    date_fin_reelle: new Date('2025-03-20'),
    reussite:        true,
    rfcCode:         'RFC-SEED-010',
    changeManagerEmail: 'djamel.ghozlane@casnos.dz',
    envCode:         'ENV-PRD',
    statutCode:      'STAT-CHG-CLO',
    planChangement: {
      code_metier:   'PLN-SEED-004',
      titre_plan:    'Plan déploiement recouvrement cotisations v2.0',
      etapes_plan:   '1. Sauvegarde BDD recouvrement\n2. Déploiement WAR sur Tomcat recette\n3. Tests de non-régression (50 cas)\n4. Formation agents (2h)\n5. Déploiement WAR production\n6. Validation calculs pénalités\n7. Go-live',
      duree_estimee: 6,
    },
    planRollback: {
      code_metier:        'RBK-SEED-004',
      description:        'Redéploiement du WAR v1.5 depuis le dépôt d\'artefacts.',
      procedure_rollback: '1. Arrêt Tomcat\n2. Suppression WAR v2.0\n3. Déploiement WAR v1.5 depuis Nexus\n4. Démarrage Tomcat\n5. Vérification des calculs',
    },
    tests: [
      { code_metier: 'TST-SEED-009', date_test: new Date('2025-03-18'), critere_test: '50 cas de test de calcul de pénalités — résultats conformes à la circulaire 2025-03', resultat: 'REUSSI', contexte: 'Non-régression calculs' },
      { code_metier: 'TST-SEED-010', date_test: new Date('2025-03-19'), critere_test: 'Export SEPA — fichier conforme au format ISO 20022', resultat: 'REUSSI', contexte: 'Export SEPA' },
      { code_metier: 'TST-SEED-011', date_test: new Date('2025-03-20'), critere_test: 'Test de charge — 50 utilisateurs simultanés sur le tableau de bord', resultat: 'REUSSI', contexte: 'Performance' },
    ],
    pir: {
      code_metier:          'PIR-SEED-001',
      date_pir:             new Date('2025-03-25'),
      description:          'Déploiement réussi sans incident. Les agents ont validé les nouveaux calculs de pénalités. Légère latence observée sur le tableau de bord (< 2s acceptable). Formation jugée suffisante.',
      conformite_objectifs: true,
      conformite_delais:    true,
    },
  },
];

// ============================================================
// TÂCHES PAR CHANGEMENT
// ============================================================
const tachesRaw = [
  // ── CHG-SEED-001 : Migration BDD assurés
  {
    code_tache: 'TCH-SEED-001', ordre_tache: 1, changementCode: 'CHG-SEED-001',
    titre_tache: 'Sauvegarde complète de la base de données',
    description: "Exécuter pg_dump sur la BDD de production. Vérifier l'intégrité du fichier. Stocker sur le serveur de fichiers.",
    duree: 2, statutCode: 'EN_ATTENTE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [
      { code_metier: 'JRN-SEED-001', titre_journal: 'Tâche planifiée', description: 'Tâche planifiée pour la nuit du 01/02/2025 à 23h00. Serveur de backup disponible.' },
    ],
  },
  {
    code_tache: 'TCH-SEED-002', ordre_tache: 2, changementCode: 'CHG-SEED-001',
    titre_tache: 'Exécution du script de migration du schéma',
    description: 'Appliquer le script SQL de migration v3 sur la base de production. Vérifier les contraintes et les index après migration.',
    duree: 3, statutCode: 'EN_ATTENTE', implementeurEmail: 'mohamed.cherif@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-003', ordre_tache: 3, changementCode: 'CHG-SEED-001',
    titre_tache: 'Tests de validation fonctionnelle post-migration',
    description: "Exécuter la suite de tests de régression du module Assurés. Vérifier les 15 cas de test définis dans le plan de recette.",
    duree: 2, statutCode: 'EN_ATTENTE', implementeurEmail: 'tarek.ouali@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-004', ordre_tache: 4, changementCode: 'CHG-SEED-001',
    titre_tache: 'Remise en production et validation finale',
    description: 'Désactiver le mode maintenance. Vérifier la disponibilité du service. Valider avec le responsable métier.',
    duree: 1, statutCode: 'EN_ATTENTE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [],
  },

  // ── CHG-SEED-002 : Paiement en ligne
  {
    code_tache: 'TCH-SEED-005', ordre_tache: 1, changementCode: 'CHG-SEED-002',
    titre_tache: 'Déploiement du module en environnement de recette',
    description: 'Déployer le package de paiement en ligne sur le serveur de recette. Configurer les paramètres de la passerelle CIB (mode test).',
    duree: 2, statutCode: 'EN_ATTENTE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-006', ordre_tache: 2, changementCode: 'CHG-SEED-002',
    titre_tache: 'Tests d\'intégration avec la passerelle bancaire CIB',
    description: 'Exécuter les cas de test de paiement (succès, échec, timeout, remboursement) avec les cartes de test CIB.',
    duree: 3, statutCode: 'EN_ATTENTE', implementeurEmail: 'mohamed.cherif@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-007', ordre_tache: 3, changementCode: 'CHG-SEED-002',
    titre_tache: 'Validation métier et UAT',
    description: 'Présentation du module aux responsables de la direction financière. Validation des scénarios de paiement et des reçus.',
    duree: 2, statutCode: 'EN_ATTENTE', implementeurEmail: 'tarek.ouali@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-008', ordre_tache: 4, changementCode: 'CHG-SEED-002',
    titre_tache: 'Déploiement en production (fenêtre nuit)',
    description: 'Déployer le module en production. Activer la configuration CIB mode production. Activer le module sur le portail usagers.',
    duree: 2, statutCode: 'EN_ATTENTE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [],
  },

  // ── CHG-SEED-003 : Migration messagerie
  {
    code_tache: 'TCH-SEED-009', ordre_tache: 1, changementCode: 'CHG-SEED-003',
    titre_tache: 'Préparation du tenant Microsoft 365 et configuration des domaines',
    description: 'Créer et configurer le tenant Microsoft 365. Valider le domaine casnos.dz. Configurer les enregistrements DNS (MX, SPF, DKIM, DMARC).',
    duree: 4, statutCode: 'EN_ATTENTE', implementeurEmail: 'tarek.ouali@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-010', ordre_tache: 2, changementCode: 'CHG-SEED-003',
    titre_tache: 'Migration pilote — Direction DMSI (20 boîtes)',
    description: 'Migrer les 20 boîtes mail de la DMSI en utilisant l\'outil de migration Exchange hybride. Valider avec les utilisateurs pilotes.',
    duree: 8, statutCode: 'EN_ATTENTE', implementeurEmail: 'mohamed.cherif@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-011', ordre_tache: 3, changementCode: 'CHG-SEED-003',
    titre_tache: 'Migration vague 2 — Directions métier (150 boîtes)',
    description: 'Migration par nuit (50 boîtes/nuit sur 3 nuits) pour les directions métier. Vérification post-migration de chaque vague.',
    duree: 24, statutCode: 'EN_ATTENTE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [],
  },
  {
    code_tache: 'TCH-SEED-012', ordre_tache: 4, changementCode: 'CHG-SEED-003',
    titre_tache: 'Décommissionnement serveur Exchange on-premise',
    description: 'Après validation de la migration complète, archiver les logs du serveur Exchange, désactiver le service et préparer la réaffectation du serveur.',
    duree: 4, statutCode: 'EN_ATTENTE', implementeurEmail: 'tarek.ouali@casnos.dz',
    journaux: [],
  },

  // ── CHG-SEED-004 : Recouvrement cotisations (clôturé — tâches TERMINÉES)
  {
    code_tache: 'TCH-SEED-013', ordre_tache: 1, changementCode: 'CHG-SEED-004',
    titre_tache: 'Sauvegarde BDD recouvrement',
    description: 'Sauvegarde complète de la base de données du module recouvrement avant déploiement.',
    duree: 1, statutCode: 'TERMINEE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [
      { code_metier: 'JRN-SEED-002', titre_journal: 'Sauvegarde réalisée', description: 'pg_dump exécuté avec succès. Fichier backup: recouvrement_20250320_2300.dump (2.3 Go). Intégrité vérifiée.' },
    ],
  },
  {
    code_tache: 'TCH-SEED-014', ordre_tache: 2, changementCode: 'CHG-SEED-004',
    titre_tache: 'Déploiement WAR v2.0 sur Tomcat production',
    description: 'Arrêt Tomcat, suppression du WAR v1.5, déploiement du WAR v2.0 depuis Nexus, démarrage Tomcat.',
    duree: 1, statutCode: 'TERMINEE', implementeurEmail: 'mohamed.cherif@casnos.dz',
    journaux: [
      { code_metier: 'JRN-SEED-003', titre_journal: 'Déploiement réussi', description: 'WAR recouvrement-2.0.war déployé. Tomcat démarré en 45 secondes. Aucune erreur au démarrage.' },
    ],
  },
  {
    code_tache: 'TCH-SEED-015', ordre_tache: 3, changementCode: 'CHG-SEED-004',
    titre_tache: 'Validation des calculs de pénalités en production',
    description: 'Vérifier sur 10 dossiers réels que les pénalités de retard sont calculées conformément à la circulaire 2025-03.',
    duree: 2, statutCode: 'TERMINEE', implementeurEmail: 'tarek.ouali@casnos.dz',
    journaux: [
      { code_metier: 'JRN-SEED-004', titre_journal: 'Validation métier OK', description: 'Les 10 dossiers de contrôle présentent des calculs conformes. Validation signée par le Directeur du Recouvrement.' },
    ],
  },
  {
    code_tache: 'TCH-SEED-016', ordre_tache: 4, changementCode: 'CHG-SEED-004',
    titre_tache: 'Formation des agents sur le nouveau module',
    description: 'Session de formation de 2 heures pour les agents du recouvrement. Présentation du tableau de bord, de l\'export SEPA et des nouvelles fonctionnalités.',
    duree: 2, statutCode: 'TERMINEE', implementeurEmail: 'implementeur@casnos.dz',
    journaux: [
      { code_metier: 'JRN-SEED-005', titre_journal: 'Formation terminée', description: '18 agents formés. Support utilisateur distribué. Questions portant principalement sur l\'export SEPA.' },
    ],
  },
];

// ============================================================
// CABs — 3 comités
// ============================================================
const cabsRaw = [
  {
    code_metier: 'CAB-SEED-001',
    nom_cab: 'Comité Aviseur du Changement — CASNOS',
    type_cab: 'NORMAL',
    membres: [
      { email: 'change.manager@casnos.dz', role: 'PRESIDENT' },
      { email: 'cab@casnos.dz',            role: 'MEMBRE'    },
      { email: 'admin@casnos.dz',          role: 'MEMBRE'    },
      { email: 'leila.zerrouki@casnos.dz', role: 'MEMBRE'    },
      { email: 'rachid.boukhari@casnos.dz',role: 'MEMBRE'    },
    ],
  },
  {
    code_metier: 'CAB-SEED-002',
    type_cab: 'URGENT',
    nom_cab: 'Comité de Changement d\'Urgence (CCU)',
    membres: [
      { email: 'djamel.ghozlane@casnos.dz',role: 'PRESIDENT' },
      { email: 'admin@casnos.dz',           role: 'MEMBRE'    },
      { email: 'cab@casnos.dz',             role: 'MEMBRE'    },
    ],
  },
  {
    code_metier: 'CAB-SEED-003',
    type_cab: 'NORMAL',
    nom_cab: 'Comité des Changements Standard',
    membres: [
      { email: 'change.manager@casnos.dz', role: 'PRESIDENT' },
      { email: 'leila.zerrouki@casnos.dz', role: 'MEMBRE'    },
      { email: 'rachid.boukhari@casnos.dz',role: 'MEMBRE'    },
    ],
  },
];

// ============================================================
// RÉUNIONS CAB
// ============================================================
const reunionsRaw = [
  // Réunion 1 — CAB normal — RFC-001 approuvée
  {
    code_metier:  'REU-SEED-001',
    cabCode:      'CAB-SEED-001',
    date_reunion: new Date('2025-01-20'),
    heure_debut:  new Date('1970-01-01T09:00:00'),
    heure_fin:    new Date('1970-01-01T11:30:00'),
    ordre_jour:   'Revue et vote RFC-SEED-001 — Migration BDD module assurés v3\nRevue RFC-SEED-003 — Extension RAM serveur fichiers',
    rfcCodes:     ['RFC-SEED-001', 'RFC-SEED-003'],
    participantsEmails: ['change.manager@casnos.dz', 'cab@casnos.dz', 'admin@casnos.dz', 'leila.zerrouki@casnos.dz'],
    votes: [
      { code_metier: 'VOT-SEED-001', votantEmail: 'cab@casnos.dz',            rfcCode: 'RFC-SEED-001', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-002', votantEmail: 'admin@casnos.dz',          rfcCode: 'RFC-SEED-001', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-003', votantEmail: 'leila.zerrouki@casnos.dz', rfcCode: 'RFC-SEED-001', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-004', votantEmail: 'cab@casnos.dz',            rfcCode: 'RFC-SEED-003', valeur_vote: 'REJETER'   },
      { code_metier: 'VOT-SEED-005', votantEmail: 'admin@casnos.dz',          rfcCode: 'RFC-SEED-003', valeur_vote: 'REJETER'   },
      { code_metier: 'VOT-SEED-006', votantEmail: 'leila.zerrouki@casnos.dz', rfcCode: 'RFC-SEED-003', valeur_vote: 'ABSTENTION'},
    ],
    decisions: [
      {
        code_metier: 'DCB-SEED-001', rfcCode: 'RFC-SEED-001', decision: 'APPROUVER',
        motif: 'RFC conforme aux exigences ITIL. Risques maîtrisés. Rollback préparé. Vote unanime : 3 APPROUVER.',
      },
      {
        code_metier: 'DCB-SEED-002', rfcCode: 'RFC-SEED-003', decision: 'REJETER',
        motif: 'Budget non alloué pour ce trimestre. Extension RAM à réétudier dans le budget Q2 2025.',
      },
    ],
  },
  // Réunion 2 — CAB normal — RFC-004 et RFC-007 approuvées
  {
    code_metier:  'REU-SEED-002',
    cabCode:      'CAB-SEED-001',
    date_reunion: new Date('2025-02-17'),
    heure_debut:  new Date('1970-01-01T10:00:00'),
    heure_fin:    new Date('1970-01-01T12:00:00'),
    ordre_jour:   'Revue RFC-SEED-004 — Module paiement en ligne v1.2\nRevue RFC-SEED-007 — Migration messagerie Exchange Online\nRevue RFC-SEED-010 — Module recouvrement v2.0',
    rfcCodes:     ['RFC-SEED-004', 'RFC-SEED-007', 'RFC-SEED-010'],
    participantsEmails: ['change.manager@casnos.dz', 'cab@casnos.dz', 'leila.zerrouki@casnos.dz', 'rachid.boukhari@casnos.dz'],
    votes: [
      { code_metier: 'VOT-SEED-007', votantEmail: 'cab@casnos.dz',             rfcCode: 'RFC-SEED-004', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-008', votantEmail: 'leila.zerrouki@casnos.dz',  rfcCode: 'RFC-SEED-004', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-009', votantEmail: 'rachid.boukhari@casnos.dz', rfcCode: 'RFC-SEED-004', valeur_vote: 'ABSTENTION'},
      { code_metier: 'VOT-SEED-010', votantEmail: 'cab@casnos.dz',             rfcCode: 'RFC-SEED-007', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-011', votantEmail: 'leila.zerrouki@casnos.dz',  rfcCode: 'RFC-SEED-007', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-012', votantEmail: 'rachid.boukhari@casnos.dz', rfcCode: 'RFC-SEED-007', valeur_vote: 'REJETER'   },
      { code_metier: 'VOT-SEED-013', votantEmail: 'cab@casnos.dz',             rfcCode: 'RFC-SEED-010', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-014', votantEmail: 'leila.zerrouki@casnos.dz',  rfcCode: 'RFC-SEED-010', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-015', votantEmail: 'rachid.boukhari@casnos.dz', rfcCode: 'RFC-SEED-010', valeur_vote: 'APPROUVER' },
    ],
    decisions: [
      {
        code_metier: 'DCB-SEED-003', rfcCode: 'RFC-SEED-004', decision: 'APPROUVER',
        motif: 'Module validé en recette. Intégration CIB testée. Plan de rollback solide. Vote : 2 APPROUVER, 1 ABSTENTION.',
      },
      {
        code_metier: 'DCB-SEED-004', rfcCode: 'RFC-SEED-007', decision: 'APPROUVER',
        motif: 'Migration par vagues validée. Risque de coupure maîtrisé par le rollback DNS. Vote majoritaire : 2 APPROUVER, 1 REJETER.',
      },
      {
        code_metier: 'DCB-SEED-005', rfcCode: 'RFC-SEED-010', decision: 'APPROUVER',
        motif: 'Tests de non-régression complets. Conformité à la circulaire 2025-03 vérifiée. Vote unanime : 3 APPROUVER.',
      },
    ],
  },
  // Réunion 3 — CAB urgence — RFC-002
  {
    code_metier:  'REU-SEED-003',
    cabCode:      'CAB-SEED-002',
    date_reunion: new Date('2025-01-16'),
    heure_debut:  new Date('1970-01-01T08:00:00'),
    heure_fin:    new Date('1970-01-01T09:00:00'),
    ordre_jour:   'Traitement en urgence RFC-SEED-002 — Patch sécurité CVE-2025-1234',
    rfcCodes:     ['RFC-SEED-002'],
    participantsEmails: ['djamel.ghozlane@casnos.dz', 'admin@casnos.dz', 'cab@casnos.dz'],
    votes: [
      { code_metier: 'VOT-SEED-016', votantEmail: 'admin@casnos.dz', rfcCode: 'RFC-SEED-002', valeur_vote: 'APPROUVER' },
      { code_metier: 'VOT-SEED-017', votantEmail: 'cab@casnos.dz',   rfcCode: 'RFC-SEED-002', valeur_vote: 'APPROUVER' },
    ],
    decisions: [
      {
        code_metier: 'DCB-SEED-006', rfcCode: 'RFC-SEED-002', decision: 'APPROUVER',
        motif: 'Vulnérabilité critique activement exploitée. Application du patch en urgence autorisée. Vote : 2 APPROUVER.',
      },
    ],
  },
];

// ============================================================
// GUIDES TECHNIQUES
// ============================================================
const guidesRaw = [
  {
    changementCode: 'CHG-SEED-001',
    guides: [
      { code_metier: 'GDE-SEED-001', nom_guide: 'Guide de migration PostgreSQL v3', contenu: '# Guide de migration BDD Assurés v3\n\n## Prérequis\n- pg_dump installé\n- Accès DBA production\n- Fenêtre de maintenance confirmée\n\n## Étapes\n1. Connexion au serveur BDD en tant que postgres\n2. Exécution pg_dump\n3. Application du script de migration\n4. Vérification des contraintes\n\n## Commandes\n```bash\npg_dump -Fc casnos_prod > backup_$(date +%Y%m%d).dump\npsql casnos_prod < migration_v3.sql\n```' },
      { code_metier: 'GDE-SEED-002', nom_guide: 'Procédure de rollback BDD', contenu: '# Procédure de Rollback BDD Assurés\n\n## Déclenchement\nSi erreur critique pendant ou après la migration.\n\n## Étapes\n1. Arrêt immédiat de l\'application\n2. Restauration depuis le backup\n```bash\npg_restore -Fc -d casnos_prod backup_YYYYMMDD.dump\n```\n3. Vérification de l\'intégrité\n4. Redémarrage application\n5. Notification des utilisateurs' },
    ],
  },
  {
    changementCode: 'CHG-SEED-004',
    guides: [
      { code_metier: 'GDE-SEED-003', nom_guide: 'Guide utilisateur module recouvrement v2.0', contenu: '# Guide Utilisateur — Module Recouvrement v2.0\n\n## Nouveautés\n- Calcul automatique des pénalités selon circulaire 2025-03\n- Export SEPA (ISO 20022)\n- Tableau de bord temps réel\n\n## Calcul des pénalités\nLe taux de pénalité est de 1.5% par mois de retard, plafonné à 50%.\n\n## Export SEPA\nMenu : Recouvrement > Exports > SEPA\nSélectionner la période et cliquer sur "Générer".' },
    ],
  },
];

// ============================================================
// COMMENTAIRES RFC
// ============================================================
const commentairesRaw = [
  {
    rfcCode: 'RFC-SEED-001',
    commentaires: [
      { code_metier: 'COM-SEED-001', contenu: 'RFC bien documentée. Prévoir un test de charge post-migration pour valider les performances des nouvelles colonnes indexées.', auteurEmail: 'change.manager@casnos.dz' },
      { code_metier: 'COM-SEED-002', contenu: 'Confirmer la disponibilité de l\'espace disque pour le backup avant d\'initier la migration (minimum 5 Go libres).', auteurEmail: 'cab@casnos.dz' },
      { code_metier: 'COM-SEED-003', contenu: 'OK pour la planification nuit du vendredi. Communication aux agents faite par mail.', auteurEmail: 'demandeur@casnos.dz' },
    ],
  },
  {
    rfcCode: 'RFC-SEED-002',
    commentaires: [
      { code_metier: 'COM-SEED-004', contenu: 'URGENT — Patch éditeur validé sur environnement de test. Aucun effet secondaire détecté. Prêt pour production.', auteurEmail: 'servicedesk@casnos.dz' },
      { code_metier: 'COM-SEED-005', contenu: 'Planifier le redémarrage à 23h pour minimiser l\'impact sur les utilisateurs distants.', auteurEmail: 'admin@casnos.dz' },
    ],
  },
  {
    rfcCode: 'RFC-SEED-004',
    commentaires: [
      { code_metier: 'COM-SEED-006', contenu: 'Intégration CIB : confirmer avec la banque le passage en mode production (délai 48h après validation).', auteurEmail: 'fatima.bensalem@casnos.dz' },
      { code_metier: 'COM-SEED-007', contenu: 'Penser à activer le 3D Secure sur toutes les transactions supérieures à 5000 DA.', auteurEmail: 'admin@casnos.dz' },
    ],
  },
  {
    rfcCode: 'RFC-SEED-007',
    commentaires: [
      { code_metier: 'COM-SEED-008', contenu: 'Vérifier la compatibilité de l\'application mobile (version Android 8+) avec Exchange Online.', auteurEmail: 'nadia.mansouri@casnos.dz' },
      { code_metier: 'COM-SEED-009', contenu: 'Ne pas oublier de migrer les archives mail (.pst) des utilisateurs VIP avant la coupure.', auteurEmail: 'change.manager@casnos.dz' },
    ],
  },
  {
    rfcCode: 'RFC-SEED-010',
    commentaires: [
      { code_metier: 'COM-SEED-010', contenu: 'Les tests de calcul ont été validés avec la direction du recouvrement. Aucun écart constaté sur les 50 cas de test.', auteurEmail: 'rachid.boukhari@casnos.dz' },
    ],
  },
];

// ============================================================
// NOTIFICATIONS
// ============================================================
const notificationsRaw = [
  { code_metier: 'NOT-SEED-001', message: 'Votre RFC-SEED-001 a été approuvée par le CAB. Un changement CHG-SEED-001 a été créé.', objet: 'RFC approuvée — RFC-SEED-001', type_notif: 'IN_APP', lue: true,  destinataireEmail: 'demandeur@casnos.dz',      rfcCode: 'RFC-SEED-001', changementCode: null },
  { code_metier: 'NOT-SEED-002', message: 'Un nouveau changement CHG-SEED-001 vous a été assigné. Veuillez prendre en charge la planification.', objet: 'Nouveau changement assigné — CHG-SEED-001', type_notif: 'EMAIL', lue: false, destinataireEmail: 'change.manager@casnos.dz', rfcCode: null, changementCode: 'CHG-SEED-001' },
  { code_metier: 'NOT-SEED-003', message: 'Votre RFC-SEED-003 a été rejetée par le CAB. Motif : Budget non alloué pour ce trimestre.', objet: 'RFC rejetée — RFC-SEED-003', type_notif: 'IN_APP', lue: true,  destinataireEmail: 'demandeur@casnos.dz',      rfcCode: 'RFC-SEED-003', changementCode: null },
  { code_metier: 'NOT-SEED-004', message: 'Réunion CAB planifiée le 20/01/2025 à 09h00. Ordre du jour : RFC-SEED-001 et RFC-SEED-003.', objet: 'Convocation CAB — REU-SEED-001', type_notif: 'EMAIL', lue: true,  destinataireEmail: 'cab@casnos.dz',            rfcCode: null, changementCode: null },
  { code_metier: 'NOT-SEED-005', message: 'Votre RFC-SEED-002 (CVE-2025-1234) a été soumise au CCU. Traitement en urgence en cours.', objet: 'RFC urgente en traitement — RFC-SEED-002', type_notif: 'SMS', lue: false, destinataireEmail: 'servicedesk@casnos.dz',    rfcCode: 'RFC-SEED-002', changementCode: null },
  { code_metier: 'NOT-SEED-006', message: 'Le changement CHG-SEED-004 a été clôturé avec succès. PIR disponible.', objet: 'Changement clôturé — CHG-SEED-004', type_notif: 'IN_APP', lue: false, destinataireEmail: 'rachid.boukhari@casnos.dz',  rfcCode: null, changementCode: 'CHG-SEED-004' },
];

// ============================================================
// RAPPORTS
// ============================================================
const rapportsRaw = [
  {
    code_metier: 'RPT-SEED-001', rfcCode: 'RFC-SEED-001',
    titre_rapport: 'Rapport de migration BDD Assurés v3 — RFC-SEED-001',
    type_rapport: 'RAPPORT_RFC',
    contenu_rapport: 'Rapport généré automatiquement.\n\nRFC : RFC-SEED-001\nTitre : Migration base de données — module gestion des assurés v3\nStatut : APPROUVÉE\nPriorité : Moyenne (P3)\nScore de risque : 6/25\n\nChangement associé : CHG-SEED-001\nStatut changement : EN_COURS\n\nTâches : 4 tâches planifiées\nAvancement : 0/4 tâches terminées',
  },
  {
    code_metier: 'RPT-SEED-002', rfcCode: 'RFC-SEED-010',
    titre_rapport: 'Rapport de clôture — Module Recouvrement v2.0 — RFC-SEED-010',
    type_rapport: 'RAPPORT_CLOTURE',
    contenu_rapport: 'Rapport de clôture.\n\nRFC : RFC-SEED-010\nTitre : Déploiement module recouvrement cotisations v2.0\nStatut final : APPROUVÉE → CHG clôturé avec succès\n\nConformité objectifs : OUI\nConformité délais : OUI\n\nBilan :\n- 4/4 tâches terminées\n- 3/3 tests réussis\n- Formation 18 agents effectuée\n- Aucun incident de production post-déploiement',
  },
];

// ============================================================
// AUDIT LOGS
// ============================================================
const auditLogsRaw = [
  { code_metier: 'AUD-SEED-001', action: 'CREATE', entite_type: 'RFC', entite_id: 'RFC-SEED-001', ancienne_val: null, nouvelle_val: { statut: 'SOUMIS', demandeur: 'Sara Rahmani' }, auteurEmail: 'demandeur@casnos.dz' },
  { code_metier: 'AUD-SEED-002', action: 'UPDATE', entite_type: 'RFC', entite_id: 'RFC-SEED-001', ancienne_val: { statut: 'SOUMIS' }, nouvelle_val: { statut: 'EVALUEE' }, auteurEmail: 'change.manager@casnos.dz' },
  { code_metier: 'AUD-SEED-003', action: 'APPROVE', entite_type: 'RFC', entite_id: 'RFC-SEED-001', ancienne_val: { statut: 'EVALUEE' }, nouvelle_val: { statut: 'APPROUVEE' }, auteurEmail: 'change.manager@casnos.dz' },
  { code_metier: 'AUD-SEED-004', action: 'CREATE', entite_type: 'CHANGEMENT', entite_id: 'CHG-SEED-001', ancienne_val: null, nouvelle_val: { statut: 'EN_PLANIFICATION', rfc: 'RFC-SEED-001' }, auteurEmail: 'change.manager@casnos.dz' },
  { code_metier: 'AUD-SEED-005', action: 'UPDATE', entite_type: 'CHANGEMENT', entite_id: 'CHG-SEED-001', ancienne_val: { statut: 'EN_PLANIFICATION' }, nouvelle_val: { statut: 'EN_COURS' }, auteurEmail: 'change.manager@casnos.dz' },
  { code_metier: 'AUD-SEED-006', action: 'UPDATE', entite_type: 'CHANGEMENT', entite_id: 'CHG-SEED-004', ancienne_val: { statut: 'IMPLEMENTE' }, nouvelle_val: { statut: 'CLOTUREE', reussite: true }, auteurEmail: 'djamel.ghozlane@casnos.dz' },
  { code_metier: 'AUD-SEED-007', action: 'CREATE', entite_type: 'RFC', entite_id: 'RFC-SEED-002', ancienne_val: null, nouvelle_val: { statut: 'SOUMIS', urgence: true }, auteurEmail: 'servicedesk@casnos.dz' },
  { code_metier: 'AUD-SEED-008', action: 'REJECT', entite_type: 'RFC', entite_id: 'RFC-SEED-003', ancienne_val: { statut: 'EVALUEE' }, nouvelle_val: { statut: 'REJETEE' }, auteurEmail: 'change.manager@casnos.dz' },
];

// ============================================================
// SEED PRINCIPAL
// ============================================================
async function main() {
  console.log('🌱 Démarrage du seed CASNOS ITIL enrichi...\n');

  const hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, BCRYPT_ROUNDS);

  const ids = {
    directions: {}, roles: {}, permissions: {}, statuts: {},
    priorites: {}, typesRfc: {}, environnements: {}, configItems: {},
    users: {}, rfcs: {}, changements: {}, taches: {}, cabs: {}, reunions: {},
  };

  // ── BLOC 1 : Données de référence ───────────────────────────

  console.log('📁 Directions...');
  for (const d of directions) {
    const r = await prisma.directionMetier.upsert({ where: { code_metier: d.code_metier }, update: { nom_direction: d.nom_direction }, create: d });
    ids.directions[d.code_metier] = r.id_direction;
  }
  console.log(`   ✅ ${directions.length} directions`);

  console.log('🎭 Rôles...');
  for (const r of roles) {
    const res = await prisma.role.upsert({ where: { nom_role: r.nom_role }, update: { description: r.description }, create: r });
    ids.roles[r.nom_role] = res;
  }
  console.log(`   ✅ ${roles.length} rôles`);

  console.log('🔑 Permissions...');
  for (const p of permissions) {
    const res = await prisma.permission.upsert({ where: { code_permission: p.code_permission }, update: { description: p.description, module: p.module }, create: p });
    ids.permissions[p.code_permission] = res;
  }
  console.log(`   ✅ ${permissions.length} permissions`);

  console.log('🔗 Liaisons rôles ↔ permissions...');
  let rpCount = 0;
  for (const [roleName, permCodes] of Object.entries(rolePermissionsMap)) {
    const role = ids.roles[roleName];
    for (const code of permCodes) {
      const perm = ids.permissions[code];
      await prisma.rolePermission.upsert({
        where: { id_role_id_permission: { id_role: role.id_role, id_permission: perm.id_permission } },
        update: {}, create: { id_role: role.id_role, id_permission: perm.id_permission },
      });
      rpCount++;
    }
  }
  console.log(`   ✅ ${rpCount} liaisons`);

  console.log('📊 Statuts...');
  for (const s of [...statutsRfc, ...statutsChangement, ...statutsTache]) {
    const r = await prisma.statut.upsert({
      where: { code_statut_contexte: { code_statut: s.code_statut, contexte: s.contexte } },
      update: { libelle: s.libelle, description: s.description }, create: s,
    });
    ids.statuts[`${s.code_statut}|${s.contexte}`] = r.id_statut;
  }
  console.log(`   ✅ ${statutsRfc.length + statutsChangement.length + statutsTache.length} statuts`);

  console.log('🎯 Priorités...');
  for (const p of priorites) {
    const r = await prisma.priorite.upsert({ where: { code_priorite: p.code_priorite }, update: { libelle: p.libelle }, create: p });
    ids.priorites[p.code_metier] = r.id_priorite;
  }
  console.log(`   ✅ ${priorites.length} priorités`);

  console.log('📋 Types RFC...');
  for (const t of typesRfc) {
    const r = await prisma.typeRfc.upsert({ where: { code_metier: t.code_metier }, update: { description: t.description }, create: t });
    ids.typesRfc[t.code_metier] = r.id_type;
  }
  console.log(`   ✅ ${typesRfc.length} types RFC`);

  console.log('🌍 Environnements...');
  for (const e of environnements) {
    const r = await prisma.environnement.upsert({ where: { nom_env: e.nom_env }, update: { description: e.description }, create: e });
    ids.environnements[e.code_metier] = r.id_env;
  }
  console.log(`   ✅ ${environnements.length} environnements`);

  console.log('⚙️  Configuration Items...');
  for (const ci of configItems) {
    const r = await prisma.configurationItem.upsert({ where: { nom_ci: ci.nom_ci }, update: {}, create: ci });
    ids.configItems[ci.code_metier] = r.id_ci;
  }
  console.log(`   ✅ ${configItems.length} CIs`);

  // ── BLOC 2 : Utilisateurs ────────────────────────────────────

  console.log('\n👥 Utilisateurs...');
  for (const u of usersRaw) {
    const role = ids.roles[u.roleName];
    const id_direction = ids.directions[u.directionCode];
    const user = await prisma.utilisateur.upsert({
      where: { email_user: u.email_user },
      update: { nom_user: u.nom_user, prenom_user: u.prenom_user, date_naissance: u.date_naissance, actif: u.actif, id_direction },
      create: { code_metier: u.code_metier, nom_user: u.nom_user, prenom_user: u.prenom_user, date_naissance: u.date_naissance, email_user: u.email_user, mot_passe: hashedPassword, actif: u.actif, id_direction },
    });
    ids.users[u.email_user] = user.id_user;
    await prisma.userRole.upsert({
      where: { id_user_id_role: { id_user: user.id_user, id_role: role.id_role } },
      update: {}, create: { id_user: user.id_user, id_role: role.id_role },
    });
    const flag = u.actif ? '✅' : '🔴';
    console.log(`   ${flag} ${u.email_user.padEnd(38)} → ${u.roleName}`);
  }
  // Dans prisma/seed.js ou seed.ts

// ── Rôle SYSTÈME ──────────────────────────────────────────────
const roleSysteme = await prisma.role.upsert({
  where:  { nom_role: 'SYSTEME' },
  update: {},
  create: {
    code_metier: 'ROLE-SYS',
    nom_role:    'SYSTEME',
    description: 'Acteur automatique — émetteur des notifications système',
  },
});

// ── Utilisateur SYSTÈME (bot) ─────────────────────────────────
const systemeUser = await prisma.utilisateur.upsert({
  where:  { email_user: 'systeme@itil.internal' },
  update: {},
  create: {
    code_metier:    'USR-SYS-001',
    nom_user:       'SYSTÈME',
    prenom_user:    'ITIL',
    date_naissance: new Date('2000-01-01'),
    email_user:     'systeme@itil.internal',
    mot_passe:      await bcrypt.hash(crypto.randomUUID(), 12), // mot de passe aléatoire, jamais utilisé
    actif:          true,
    userRoles: {
      create: { id_role: roleSysteme.id_role },
    },
  },
});

console.log('✅ Utilisateur SYSTÈME créé :', systemeUser.id_user);
  // ── BLOC 3 : RFCs ────────────────────────────────────────────

  console.log('\n📝 RFCs...');
  for (const rfc of rfcsRaw) {
    const statutRfc = await prisma.statut.findUnique({ where: { code_metier: rfc.statutCode } });
    const typeRfc   = await prisma.typeRfc.findUnique({ where: { code_metier: rfc.typeCode } });
    const priorite  = await prisma.priorite.findUnique({ where: { code_metier: rfc.prioriteCode } });
    const demandeur = await prisma.utilisateur.findUnique({ where: { email_user: rfc.demandeurEmail } });

    const created = await prisma.rfc.upsert({
      where: { code_rfc: rfc.code_rfc },
      update: { titre_rfc: rfc.titre_rfc, description: rfc.description, justification: rfc.justification, urgence: rfc.urgence, impacte_estimee: rfc.impacte_estimee, date_souhaitee: rfc.date_souhaitee, id_statut: statutRfc.id_statut, id_priorite: priorite.id_priorite, id_type: typeRfc.id_type, id_user: demandeur.id_user },
      create: { code_rfc: rfc.code_rfc, titre_rfc: rfc.titre_rfc, description: rfc.description, justification: rfc.justification, urgence: rfc.urgence, impacte_estimee: rfc.impacte_estimee, date_souhaitee: rfc.date_souhaitee, id_statut: statutRfc.id_statut, id_priorite: priorite.id_priorite, id_type: typeRfc.id_type, id_user: demandeur.id_user },
    });
    ids.rfcs[rfc.code_rfc] = created.id_rfc;

    for (const ciCode of rfc.ciCodes) {
      const id_ci = ids.configItems[ciCode];
      await prisma.ciRfc.upsert({ where: { id_ci_id_rfc: { id_ci, id_rfc: created.id_rfc } }, update: {}, create: { id_ci, id_rfc: created.id_rfc } });
    }

    if (rfc.evaluation) {
      await prisma.evaluationRisque.upsert({
        where: { id_rfc: created.id_rfc },
        update: { impacte: rfc.evaluation.impacte, probabilite: rfc.evaluation.probabilite, score_risque: rfc.evaluation.score_risque, description: rfc.evaluation.description },
        create: { code_metier: `EVR-${rfc.code_rfc}`, impacte: rfc.evaluation.impacte, probabilite: rfc.evaluation.probabilite, score_risque: rfc.evaluation.score_risque, description: rfc.evaluation.description, id_rfc: created.id_rfc },
      });
    }

    const flag = rfc.urgence ? '🚨' : '📋';
    console.log(`   ${flag} ${rfc.code_rfc} — ${rfc.titre_rfc.substring(0, 45)}...`);
  }

  // ── BLOC 4 : Commentaires ────────────────────────────────────

  console.log('\n💬 Commentaires...');
  let comCount = 0;
  for (const { rfcCode, commentaires } of commentairesRaw) {
    const id_rfc = ids.rfcs[rfcCode];
    for (const com of commentaires) {
      const id_user = ids.users[com.auteurEmail];
      await prisma.commentaire.upsert({
        where: { code_metier: com.code_metier },
        update: { contenu: com.contenu },
        create: { code_metier: com.code_metier, contenu: com.contenu, id_rfc, id_user },
      });
      comCount++;
    }
  }
  console.log(`   ✅ ${comCount} commentaires`);

  // ── BLOC 5 : CABs ────────────────────────────────────────────

  console.log('\n🏛️  CABs...');
  for (const cab of cabsRaw) {
    const created = await prisma.cab.upsert({
      where: { code_metier: cab.code_metier },
      update: { type_cab: cab.type_cab },
      create: { code_metier: cab.code_metier, type_cab: cab.type_cab, nom_cab: cab.nom_cab },
    });
    ids.cabs[cab.code_metier] = created.id_cab;

    for (const m of cab.membres) {
      const user = await prisma.utilisateur.findUnique({ where: { email_user: m.email } });
      await prisma.membreCab.upsert({
        where: { id_cab_id_user: { id_cab: created.id_cab, id_user: user.id_user } },
        update: { role: m.role }, create: { id_cab: created.id_cab, id_user: user.id_user, role: m.role },
      });
    }
    console.log(`   🏛️  ${cab.code_metier} (${cab.type_cab}) — ${cab.membres.length} membres`);
  }

  // ── BLOC 6 : Réunions, votes, décisions ─────────────────────

  console.log('\n📅 Réunions CAB...');
  for (const reu of reunionsRaw) {
    const id_cab = ids.cabs[reu.cabCode];
    const reunion = await prisma.reunionCab.upsert({
      where: { code_metier: reu.code_metier },
      update: { date_reunion: reu.date_reunion, heure_debut: reu.heure_debut, heure_fin: reu.heure_fin, ordre_jour: reu.ordre_jour },
      create: { code_metier: reu.code_metier, date_reunion: reu.date_reunion, heure_debut: reu.heure_debut, heure_fin: reu.heure_fin, ordre_jour: reu.ordre_jour, id_cab },
    });
    ids.reunions[reu.code_metier] = reunion.id_reunion;

    for (const rfcCode of reu.rfcCodes) {
      const id_rfc = ids.rfcs[rfcCode];
      await prisma.rfcReunion.upsert({ where: { id_rfc_id_reunion: { id_rfc, id_reunion: reunion.id_reunion } }, update: {}, create: { id_rfc, id_reunion: reunion.id_reunion } });
    }

    for (const email of reu.participantsEmails) {
      const user = await prisma.utilisateur.findUnique({ where: { email_user: email } });
      await prisma.participant.upsert({ where: { id_reunion_id_user: { id_reunion: reunion.id_reunion, id_user: user.id_user } }, update: {}, create: { id_reunion: reunion.id_reunion, id_user: user.id_user } });
    }

    for (const v of reu.votes) {
      const votant = await prisma.utilisateur.findUnique({ where: { email_user: v.votantEmail } });
      const rfc    = await prisma.rfc.findUnique({ where: { code_rfc: v.rfcCode } });
      await prisma.voteCab.upsert({
        where: { code_metier: v.code_metier },
        update: { valeur_vote: v.valeur_vote },
        create: { code_metier: v.code_metier, valeur_vote: v.valeur_vote, id_reunion: reunion.id_reunion, id_user: votant.id_user, id_rfc: rfc.id_rfc },
      });
    }

    for (const d of reu.decisions) {
      const rfc = await prisma.rfc.findUnique({ where: { code_rfc: d.rfcCode } });
      await prisma.decisionCab.upsert({
        where: { code_metier: d.code_metier },
        update: { decision: d.decision, motif: d.motif },
        create: { code_metier: d.code_metier, decision: d.decision, motif: d.motif, id_reunion: reunion.id_reunion, id_rfc: rfc.id_rfc },
      });
    }

    console.log(`   📅 ${reu.code_metier} — ${reu.date_reunion.toISOString().split('T')[0]} | ${reu.votes.length} votes | ${reu.decisions.length} décisions`);
  }

  // ── BLOC 7 : Changements ─────────────────────────────────────

  console.log('\n🔧 Changements...');
  for (const chg of changementsRaw) {
    const statut       = await prisma.statut.findUnique({ where: { code_metier: chg.statutCode } });
    const changeManager = await prisma.utilisateur.findUnique({ where: { email_user: chg.changeManagerEmail } });
    const env          = await prisma.environnement.findUnique({ where: { code_metier: chg.envCode } });
    const rfc          = await prisma.rfc.findUnique({ where: { code_rfc: chg.rfcCode } });

    const created = await prisma.changement.upsert({
      where: { code_changement: chg.code_changement },
      update: { date_debut: chg.date_debut, date_fin_prevu: chg.date_fin_prevu, date_fin_reelle: chg.date_fin_reelle, reussite: chg.reussite, id_statut: statut.id_statut },
      create: { code_changement: chg.code_changement, date_debut: chg.date_debut, date_fin_prevu: chg.date_fin_prevu, date_fin_reelle: chg.date_fin_reelle, reussite: chg.reussite, id_rfc: rfc.id_rfc, id_user: changeManager.id_user, id_env: env.id_env, id_statut: statut.id_statut },
    });
    ids.changements[chg.code_changement] = created.id_changement;

    if (chg.planChangement) {
      const p = chg.planChangement;
      await prisma.planChangement.upsert({
        where: { code_metier: p.code_metier },
        update: { titre_plan: p.titre_plan, etapes_plan: p.etapes_plan, duree_estimee: p.duree_estimee },
        create: { code_metier: p.code_metier, titre_plan: p.titre_plan, etapes_plan: p.etapes_plan, duree_estimee: p.duree_estimee, id_changement: created.id_changement },
      });
    }

    if (chg.planRollback) {
      const rb = chg.planRollback;
      await prisma.planRollback.upsert({
        where: { code_metier: rb.code_metier },
        update: { description: rb.description, procedure_rollback: rb.procedure_rollback },
        create: { code_metier: rb.code_metier, description: rb.description, procedure_rollback: rb.procedure_rollback, id_changement: created.id_changement },
      });
    }

    for (const t of (chg.tests || [])) {
      await prisma.test.upsert({
        where: { code_metier: t.code_metier },
        update: { resultat: t.resultat },
        create: { code_metier: t.code_metier, date_test: t.date_test, critere_test: t.critere_test, resultat: t.resultat, contexte: t.contexte, id_changement: created.id_changement },
      });
    }

    if (chg.pir) {
      const pir = chg.pir;
      await prisma.postImplementationReview.upsert({
        where: { code_metier: pir.code_metier },
        update: { date_pir: pir.date_pir, description: pir.description, conformite_objectifs: pir.conformite_objectifs, conformite_delais: pir.conformite_delais },
        create: { code_metier: pir.code_metier, date_pir: pir.date_pir, description: pir.description, conformite_objectifs: pir.conformite_objectifs, conformite_delais: pir.conformite_delais, id_changement: created.id_changement },
      });
    }

    const flag = chg.reussite === true ? '✅' : chg.reussite === false ? '❌' : '🔧';
    console.log(`   ${flag} ${chg.code_changement} → ${chg.rfcCode} | ${chg.statutCode}`);
  }

  // ── BLOC 8 : Tâches ──────────────────────────────────────────

  console.log('\n📌 Tâches...');
  for (const t of tachesRaw) {
    const statutTache  = await prisma.statut.findUnique({ where: { code_statut_contexte: { code_statut: t.statutCode, contexte: 'TACHE' } } });
    const implementeur = await prisma.utilisateur.findUnique({ where: { email_user: t.implementeurEmail } });
    const id_changement = ids.changements[t.changementCode];

    const tache = await prisma.tache.upsert({
      where: { code_tache: t.code_tache },
      update: { titre_tache: t.titre_tache, description: t.description, duree: t.duree, id_statut: statutTache.id_statut },
      create: { code_tache: t.code_tache, ordre_tache: t.ordre_tache, titre_tache: t.titre_tache, description: t.description, duree: t.duree, id_changement, id_user: implementeur.id_user, id_statut: statutTache.id_statut },
    });
    ids.taches[t.code_tache] = tache.id_tache;

    for (const j of t.journaux) {
      await prisma.journalExecution.upsert({
        where: { code_metier: j.code_metier },
        update: { titre_journal: j.titre_journal, description: j.description },
        create: { code_metier: j.code_metier, titre_journal: j.titre_journal, description: j.description, id_tache: tache.id_tache },
      });
    }

    const flag = t.statutCode === 'TERMINEE' ? '✅' : t.statutCode === 'EN_COURS' ? '🔄' : '⏳';
    console.log(`   ${flag} ${t.code_tache} (${t.changementCode}) — ${t.titre_tache.substring(0, 40)}...`);
  }

  // ── BLOC 9 : Guides ──────────────────────────────────────────

  console.log('\n📖 Guides techniques...');
  let guideCount = 0;
  for (const { changementCode, guides } of guidesRaw) {
    const id_changement = ids.changements[changementCode];
    for (const g of guides) {
      await prisma.guide.upsert({
        where: { code_metier: g.code_metier },
        update: { nom_guide: g.nom_guide, contenu: g.contenu },
        create: { code_metier: g.code_metier, nom_guide: g.nom_guide, contenu: g.contenu, id_changement },
      });
      guideCount++;
    }
  }
  console.log(`   ✅ ${guideCount} guides`);

  // ── BLOC 10 : Notifications ──────────────────────────────────

console.log('\n🔔 Notifications...');

const adminId = ids.users['admin@casnos.dz']; // Expéditeur par défaut

for (const n of notificationsRaw) {
  const id_destinataire = ids.users[n.destinataireEmail];
  const id_rfc          = n.rfcCode ? ids.rfcs[n.rfcCode] : null;
  const id_changement   = n.changementCode ? ids.changements[n.changementCode] : null;
  const id_tache        = null; // tu peux l'ajouter plus tard si besoin

  // Création de la notification
  const notification = await prisma.notification.upsert({
    where: { code_metier: n.code_metier },
    update: {
      message: n.message,
      objet: n.objet,
    },
    create: {
      code_metier: n.code_metier,
      message: n.message,
      objet: n.objet,
      type_notif: n.type_notif || 'IN_APP',
      id_expediteur: adminId,                    // ← CORRECTION
      id_rfc,
      id_changement,
      // id_tache si besoin
    },
  });

  // Liaison avec le destinataire via UserNotification
  await prisma.userNotification.upsert({
    where: {
      id_notif_id_user: {
        id_notif: notification.id_notif,
        id_user: id_destinataire,
      }
    },
    update: {
      lue: n.lue || false,
      date_lecture: n.lue ? new Date() : null,
    },
    create: {
      id_notif: notification.id_notif,
      id_user: id_destinataire,
      lue: n.lue || false,
      date_lecture: n.lue ? new Date() : null,
    },
  });
}

console.log(`   ✅ ${notificationsRaw.length} notifications créées avec destinataires`);

  // ── BLOC 11 : Rapports ───────────────────────────────────────

  console.log('\n📊 Rapports...');
  for (const r of rapportsRaw) {
    const id_rfc = ids.rfcs[r.rfcCode];
    await prisma.rapport.upsert({
      where: { code_metier: r.code_metier },
      update: { titre_rapport: r.titre_rapport, contenu_rapport: r.contenu_rapport },
      create: { code_metier: r.code_metier, titre_rapport: r.titre_rapport, type_rapport: r.type_rapport, contenu_rapport: r.contenu_rapport, id_rfc },
    });
  }
  console.log(`   ✅ ${rapportsRaw.length} rapports`);

  // ── BLOC 12 : Audit Logs ─────────────────────────────────────

  console.log('\n📋 Audit Logs...');
  for (const log of auditLogsRaw) {
    const id_user = ids.users[log.auteurEmail];
    await prisma.auditLog.upsert({
      where: { code_metier: log.code_metier },
      update: { action: log.action, nouvelle_val: log.nouvelle_val },
      create: { code_metier: log.code_metier, action: log.action, entite_type: log.entite_type, entite_id: log.entite_id, ancienne_val: log.ancienne_val, nouvelle_val: log.nouvelle_val, id_user },
    });
  }
  console.log(`   ✅ ${auditLogsRaw.length} logs d'audit`);

  // ── BLOC 13 : Blackouts ─────────────────────
    async function seedBlackouts() {
    console.log('\n🚫 Seed BlackoutPeriod — CASNOS / Algérie 2025-2026\n');
  
    let created = 0;
    let skipped = 0;
  
    for (const b of blackoutsInitiaux) {
      try {
        await prisma.blackoutPeriod.upsert({
          where:  { code_metier: b.code_metier },
          update: {
            libelle:     b.libelle,
            date_debut:  b.date_debut,
            date_fin:    b.date_fin,
            recurrent:   b.recurrent,
            description: b.description,
            actif:       true,
          },
          create: {
            code_metier: b.code_metier,
            libelle:     b.libelle,
            type:        b.type,
            date_debut:  b.date_debut,
            date_fin:    b.date_fin,
            recurrent:   b.recurrent,
            description: b.description,
            actif:       true,
          },
        });
        console.log(`   ✅ ${b.code_metier} — ${b.libelle}`);
        created++;
      } catch (err) {
        console.error(`   ❌ ${b.code_metier} — ${err.message}`);
        skipped++;
      }
    }
  
    console.log(`\n${'═'.repeat(50)}`);
    console.log(`✅ Seed terminé : ${created} blackouts créés/mis à jour, ${skipped} erreurs.`);
    console.log(`${'═'.repeat(50)}\n`);
  }
  
  seedBlackouts()
    .catch(e => { console.error('❌ Erreur seed blackout :', e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
  

  // ── RÉSUMÉ ───────────────────────────────────────────────────

  console.log('\n' + '═'.repeat(62));
  console.log('✅ Seed enrichi terminé avec succès !');
  console.log('═'.repeat(62));
  console.log('  DONNÉES DE BASE');
  console.log(`   Directions          : ${directions.length}`);
  console.log(`   Rôles               : ${roles.length}`);
  console.log(`   Permissions         : ${permissions.length}`);
  console.log(`   Statuts (total)     : ${statutsRfc.length + statutsChangement.length + statutsTache.length}`);
  console.log(`   Priorités           : ${priorites.length}`);
  console.log(`   Types RFC           : ${typesRfc.length}`);
  console.log(`   Environnements      : ${environnements.length}`);
  console.log(`   Config Items        : ${configItems.length}`);
  console.log(`   Utilisateurs        : ${usersRaw.length}`);
  console.log('  DONNÉES DE TEST');
  console.log(`   RFCs                : ${rfcsRaw.length}`);
  console.log(`   Commentaires        : ${commentairesRaw.reduce((a,c) => a + c.commentaires.length, 0)}`);
  console.log(`   Changements         : ${changementsRaw.length}`);
  console.log(`   Plans de changement : ${changementsRaw.filter(c => c.planChangement).length}`);
  console.log(`   Plans de rollback   : ${changementsRaw.filter(c => c.planRollback).length}`);
  console.log(`   Tests               : ${changementsRaw.reduce((a,c) => a + (c.tests?.length || 0), 0)}`);
  console.log(`   PIR                 : ${changementsRaw.filter(c => c.pir).length}`);
  console.log(`   Tâches              : ${tachesRaw.length}`);
  console.log(`   Journaux exécution  : ${tachesRaw.reduce((a,t) => a + t.journaux.length, 0)}`);
  console.log(`   CABs                : ${cabsRaw.length}`);
  console.log(`   Réunions CAB        : ${reunionsRaw.length}`);
  console.log(`   Votes               : ${reunionsRaw.reduce((a,r) => a + r.votes.length, 0)}`);
  console.log(`   Décisions CAB       : ${reunionsRaw.reduce((a,r) => a + r.decisions.length, 0)}`);
  console.log(`   Guides techniques   : ${guidesRaw.reduce((a,g) => a + g.guides.length, 0)}`);
  console.log(`   Notifications       : ${notificationsRaw.length}`);
  console.log(`   Rapports            : ${rapportsRaw.length}`);
  console.log(`   Audit Logs          : ${auditLogsRaw.length}`);
  console.log('═'.repeat(62));
  console.log(`\n🔐 Comptes de test (mot de passe : "${PLAIN_PASSWORD}")`);
  console.log('   Email                                    Rôle');
  console.log('   ' + '─'.repeat(55));
  usersRaw.forEach(u => {
    const status = u.actif ? '' : '  ← inactif';
    console.log(`   ${u.email_user.padEnd(42)} ${u.roleName}${status}`);
  });
}

main()
  .catch((e) => { console.error('❌ Erreur seed :', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
  