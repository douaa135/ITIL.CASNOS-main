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

// ── Directions ────────────────────────────────────────────────
const directions = [
  { code_metier: 'DIR-001', nom_direction: 'Direction des Prestations' },
  { code_metier: 'DIR-002', nom_direction: 'Direction Recouvrement du Contrôle et du Contentieux' },
  { code_metier: 'DIR-003', nom_direction: 'Direction des Opérations Financières' },
  { code_metier: 'DIR-004', nom_direction: 'Direction des Ressources Humaines et des Moyens (DRHM)' },
  { code_metier: 'DIR-005', nom_direction: "Direction de Modernisation des Systèmes d'Information (DMSI)" },
  { code_metier: 'DIR-006', nom_direction: 'Direction du Contrôle Médical, des Études et du Conventionnement' },
  { code_metier: 'DIR-007', nom_direction: "Direction de l'Audit et du Contrôle" },
];

// ── Rôles RBAC ────────────────────────────────────────────────
const roles = [
  { code_metier: 'ROLE-ADMIN', nom_role: 'ADMIN',          description: 'Administrateur système — accès total' },
  { code_metier: 'ROLE-CM',    nom_role: 'CHANGE_MANAGER',  description: 'Gestionnaire des changements' },
  { code_metier: 'ROLE-IMP',   nom_role: 'IMPLEMENTEUR',    description: 'Équipe technique — exécute les changements' },
  { code_metier: 'ROLE-CAB',   nom_role: 'MEMBRE_CAB',      description: 'Membre du CAB — évalue et vote les RFC' },
  { code_metier: 'ROLE-DEM',   nom_role: 'DEMANDEUR',       description: 'Demandeur — soumet des RFC' },
  { code_metier: 'ROLE-SD',    nom_role: 'SERVICE_DESK',    description: 'Service Desk' },
];

// ── Permissions ───────────────────────────────────────────────
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
];

// ── Matrice Rôle → Permissions ────────────────────────────────
const rolePermissionsMap = {
  ADMIN: permissions.map(p => p.code_permission),
  CHANGE_MANAGER: [
    'rfc:create','rfc:read','rfc:update','rfc:approve','rfc:reject','rfc:cancel','rfc:statut',
    'changement:create','changement:read','changement:update','changement:plan','changement:close','changement:statut',
    'tache:create','tache:read','tache:update',
    'cab:read','cab:manage',
    'rapport:read','rapport:generate',
  ],
  IMPLEMENTEUR: [
    'rfc:read',
    'changement:read','changement:execute','changement:statut',
    'tache:read','tache:update','tache:execute',
    'rapport:read',
  ],
  MEMBRE_CAB: [
    'rfc:read','changement:read',
    'cab:read','cab:vote',
    'rapport:read',
  ],
  DEMANDEUR: [
    'rfc:create','rfc:read','rfc:update','rfc:cancel',
    'rapport:read',
  ],
  SERVICE_DESK: [
    'rfc:create','rfc:read','rfc:update','rfc:cancel',
    'changement:read',
    'tache:read',
    'rapport:read',
  ],
};

// ── Statuts RFC ───────────────────────────────────────────────
const statutsRfc = [
  //{ code_metier: 'STAT-RFC-BRO', code_statut: 'BROUILLON',      libelle: 'Brouillon',     description: 'RFC en cours de rédaction',         contexte: 'RFC' },
  { code_metier: 'STAT-RFC-PAP', code_statut: 'PRE_APPROUVEE',  libelle: 'Pré-évaluée',   description: 'RFC pré-approuvee',                 contexte: 'RFC' },
  { code_metier: 'STAT-RFC-SOU', code_statut: 'SOUMIS',         libelle: 'Soumise',       description: 'RFC soumise pour évaluation',       contexte: 'RFC' },
  { code_metier: 'STAT-RFC-EVA', code_statut: 'EVALUEE',        libelle: 'Évaluée',       description: 'RFC évaluée par le Change Manager', contexte: 'RFC' },
  { code_metier: 'STAT-RFC-APR', code_statut: 'APPROUVEE',      libelle: 'Approuvée',     description: 'RFC approuvée par le CAB',          contexte: 'RFC' },
  { code_metier: 'STAT-RFC-REJ', code_statut: 'REJETEE',        libelle: 'Rejetée',       description: 'RFC rejetée',                       contexte: 'RFC' },
  { code_metier: 'STAT-RFC-CLO', code_statut: 'CLOTUREE',       libelle: 'Clôturée',      description: 'RFC clôturée ou annulée',           contexte: 'RFC' },
];

// ── Statuts Changement ────────────────────────────────────────
const statutsChangement = [
  { code_metier: 'STAT-CHG-PLA', code_statut: 'EN_PLANIFICATION',   libelle: 'En planification',   description: 'Changement en cours de planification',                     contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-ATT', code_statut: 'EN_ATTENTE',         libelle: 'En attente',         description: 'Changement planifié, en attente de date ou de ressources', contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-ENC', code_statut: 'EN_COURS',           libelle: 'En cours',           description: "Changement en cours d'exécution",                          contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-IMP', code_statut: 'IMPLEMENTE',         libelle: 'Implémenté',         description: 'Changement implémenté',                                    contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-TST', code_statut: 'TESTE',              libelle: 'Testé',              description: 'Changement testé et validé',                               contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-CLO', code_statut: 'CLOTUREE',            libelle: 'Clôturé',            description: 'Changement clôturé',                                       contexte: 'CHANGEMENT' },
  { code_metier: 'STAT-CHG-ECH', code_statut: 'EN_ECHEC',           libelle: 'En échec',           description: 'Changement échoué — rollback',                             contexte: 'CHANGEMENT' },
];

// ── Statuts Tâche (nouveau contexte TACHE) ────────────────────
// Remplace l'enum StatutTache — les tâches utilisent maintenant id_statut (FK Statut)
const statutsTache = [
  { code_metier: 'STAT-TCH-ATT', code_statut: 'EN_ATTENTE', libelle: 'En attente', description: 'Tâche créée, pas encore démarrée',       contexte: 'TACHE' },
  { code_metier: 'STAT-TCH-ENC', code_statut: 'EN_COURS',   libelle: 'En cours',   description: "Tâche en cours d'exécution",             contexte: 'TACHE' },
  { code_metier: 'STAT-TCH-TER', code_statut: 'TERMINEE',   libelle: 'Terminée',   description: 'Tâche terminée avec succès',             contexte: 'TACHE' },
  { code_metier: 'STAT-TCH-ANN', code_statut: 'ANNULEE',    libelle: 'Annulée',    description: 'Tâche annulée avant ou pendant exécution', contexte: 'TACHE' },
];

// ── Priorités ─────────────────────────────────────────────────
const priorites = [
  { code_metier: 'PRI-P0', code_priorite: 'P0', libelle: 'En_Etude' },
  { code_metier: 'PRI-P1', code_priorite: 'P1', libelle: 'Faible'   },
  { code_metier: 'PRI-P2', code_priorite: 'P2', libelle: 'Basse'    },
  { code_metier: 'PRI-P3', code_priorite: 'P3', libelle: 'Moyenne'  },
  { code_metier: 'PRI-P4', code_priorite: 'P4', libelle: 'Haute'    },
  { code_metier: 'PRI-P5', code_priorite: 'P5', libelle: 'Critique' },
];

// ── Types RFC ─────────────────────────────────────────────────
const typesRfc = [
  { code_metier: 'TYPE-RFC-STD', type: 'STANDARD', description: 'Changement récurrent, faible risque, pré-approuvé' },
  { code_metier: 'TYPE-RFC-NRM', type: 'NORMAL',   description: 'Changement nécessitant évaluation et validation CAB' },
  { code_metier: 'TYPE-RFC-URG', type: 'URGENT',   description: 'Changement critique devant être réalisé immédiatement' },
];

// ── Environnements ────────────────────────────────────────────
const environnements = [
  { code_metier: 'ENV-PRD', nom_env: 'PRODUCTION',    description: 'Environnement de production — critique' },
  { code_metier: 'ENV-REC', nom_env: 'RECETTE',       description: 'Environnement de recette / pré-production' },
  { code_metier: 'ENV-DEV', nom_env: 'DEVELOPPEMENT', description: 'Environnement de développement' },
  { code_metier: 'ENV-TST', nom_env: 'TEST',          description: 'Environnement de tests' },
];

// ── Configuration Items ───────────────────────────────────────
const configItems = [
  { code_metier: 'CI-001', nom_ci: 'Serveur Application Principal',      type_ci: 'Serveur',           version_ci: 'v2.1', description: 'Serveur principal CASNOS' },
  { code_metier: 'CI-002', nom_ci: 'Base de Données PostgreSQL',         type_ci: 'Base de données',   version_ci: '15.2', description: 'Base de données principale' },
  { code_metier: 'CI-003', nom_ci: 'Application Web CASNOS',             type_ci: 'Application',       version_ci: 'v3.5', description: 'Interface web usagers' },
  { code_metier: 'CI-004', nom_ci: 'Serveur de Fichiers',                type_ci: 'Serveur',           version_ci: 'v1.0', description: 'Stockage documents' },
  { code_metier: 'CI-005', nom_ci: 'Routeur Principal',                  type_ci: 'Réseau',            version_ci: 'v2.0', description: 'Routeur réseau principal' },
  { code_metier: 'CI-006', nom_ci: 'Système de Messagerie',              type_ci: 'Application',       version_ci: 'v4.1', description: 'Messagerie interne' },
  { code_metier: 'CI-007', nom_ci: 'Module Gestion des Assurés',         type_ci: 'Module applicatif', version_ci: 'v2.8', description: 'Gestion dossiers assurés' },
  { code_metier: 'CI-008', nom_ci: 'Module Recouvrement des Cotisations',type_ci: 'Module applicatif', version_ci: 'v1.5', description: 'Calcul et suivi cotisations' },
];

// ── Utilisateurs ──────────────────────────────────────────────
// date_naissance est maintenant OBLIGATOIRE dans le schéma
const usersRaw = [
  {
    code_metier:    'USR-2024-0001',
    nom_user:       'Boukhettala',
    prenom_user:    'Amira',
    email_user:     'admin@casnos.dz',
    date_naissance: new Date('1985-03-15'),
    directionCode:  'DIR-005',
    roleName:       'ADMIN',
    actif:          true,
  },
  {
    code_metier:    'USR-2024-0002',
    nom_user:       'Merabti',
    prenom_user:    'Karim',
    email_user:     'change.manager@casnos.dz',
    date_naissance: new Date('1982-07-22'),
    directionCode:  'DIR-005',
    roleName:       'CHANGE_MANAGER',
    actif:          true,
  },
  {
    code_metier:    'USR-2024-0003',
    nom_user:       'Rahmani',
    prenom_user:    'Sara',
    email_user:     'demandeur@casnos.dz',
    date_naissance: new Date('1990-11-08'),
    directionCode:  'DIR-001',
    roleName:       'DEMANDEUR',
    actif:          true,
  },
  {
    code_metier:    'USR-2024-0004',
    nom_user:       'Benamara',
    prenom_user:    'Youcef',
    email_user:     'implementeur@casnos.dz',
    date_naissance: new Date('1993-04-30'),
    directionCode:  'DIR-005',
    roleName:       'IMPLEMENTEUR',
    actif:          true,
  },
  {
    code_metier:    'USR-2024-0005',
    nom_user:       'Hamdi',
    prenom_user:    'Nadir',
    email_user:     'cab@casnos.dz',
    date_naissance: new Date('1979-09-12'),
    directionCode:  'DIR-004',
    roleName:       'MEMBRE_CAB',
    actif:          true,
  },
  {
    code_metier:    'USR-2024-0006',
    nom_user:       'Tlemcani',
    prenom_user:    'Rania',
    email_user:     'servicedesk@casnos.dz',
    date_naissance: new Date('1995-01-25'),
    directionCode:  'DIR-005',
    roleName:       'SERVICE_DESK',
    actif:          true,
  },
  {
    code_metier:    'USR-2024-0007',
    nom_user:       'Khelifi',
    prenom_user:    'Omar',
    email_user:     'inactif@casnos.dz',
    date_naissance: new Date('1988-06-14'),
    directionCode:  'DIR-001',
    roleName:       'DEMANDEUR',
    actif:          false,   // ← compte désactivé pour test login refusé
  },
];

// ============================================================
// ② DONNÉES DE TEST — Scénario ITIL complet
// ============================================================
//
// Flux couvert :
//   Demandeur crée RFC  →  Change Manager évalue  →  CAB vote  →
//   Change Manager décide (APPROUVER)  →  Changement créé  →
//   Implémenteur exécute les tâches  →  Journaux d'exécution
//
// RFC-SEED-001  : NORMAL   — statut APPROUVEE  → donne Changement + Tâches
// RFC-SEED-002  : URGENT   — statut SOUMIS     → en attente d'évaluation
// RFC-SEED-003  : STANDARD — statut BROUILLON  → draft en cours
// CAB-SEED-001  : NORMAL   — réunion avec vote et décision sur RFC-SEED-001
// ============================================================

// ── RFCs ──────────────────────────────────────────────────────
// Les IDs statuts/priorités/types/user seront résolus dynamiquement dans main()
const rfcsRaw = [
  {
    code_rfc:     'RFC-SEED-001',
    titre_rfc:    'Migration base de données — module gestion des assurés v3',
    description:  'Migration du schéma PostgreSQL du module gestion des assurés vers la version 3.0. Ajout de nouvelles colonnes, index et contraintes.',
    justification: "La version actuelle ne supporte pas les nouvelles exigences réglementaires 2025. La migration est nécessaire avant le déploiement du module v3.",
    date_souhaitee: new Date('2025-02-01'),
    urgence:       false,
    impacte_estimee: 'Impact fort sur le module Prestations. Fenêtre de maintenance requise (nuit du weekend).',
    typeCode:      'TYPE-RFC-NRM',    // NORMAL
    prioriteCode:  'PRI-P3',          // Moyenne
    statutCode:    'STAT-RFC-APR',    // APPROUVEE ← déjà passée par le CAB
    demandeurEmail:'demandeur@casnos.dz',
    // CIs impactés
    ciCodes:       ['CI-002', 'CI-007'],  // BDD PostgreSQL + Module Assurés
    // Évaluation risque
    evaluation: { impacte: 3, probabilite: 2, score_risque: 6, description: 'Risque moyen — rollback préparé, tests complets requis.' },
  },
  {
    code_rfc:     'RFC-SEED-002',
    titre_rfc:    'Correctif de sécurité urgence — vulnérabilité CVE-2025-1234',
    description:  'Application du patch de sécurité pour la vulnérabilité critique CVE-2025-1234 affectant le serveur application.',
    justification: 'Vulnérabilité activement exploitée. Patch éditeur disponible. Délai de correction : 24h maximum.',
    date_souhaitee: new Date('2025-01-16'),
    urgence:       true,
    impacte_estimee: 'Redémarrage du serveur application requis. Coupure de 10-15 minutes.',
    typeCode:      'TYPE-RFC-URG',    // URGENT
    prioriteCode:  'PRI-P5',          // Critique
    statutCode:    'STAT-RFC-SOU',    // SOUMIS ← en attente d'évaluation ECAB
    demandeurEmail:'servicedesk@casnos.dz',
    ciCodes:       ['CI-001'],         // Serveur Application
    evaluation:    null,               // pas encore évaluée
  },
  {
    code_rfc:     'RFC-SEED-003',
    titre_rfc:    'Ajout mémoire RAM serveur de fichiers',
    description:  'Extension de la RAM du serveur de fichiers de 16 Go à 32 Go pour améliorer les performances.',
    justification: 'Le serveur atteint régulièrement 90% de la RAM disponible aux heures de pointe.',
    date_souhaitee: new Date('2025-02-15'),
    urgence:       false,
    impacte_estimee: 'Impact faible. Arrêt planifié du serveur de 5 minutes.',
    typeCode:      'TYPE-RFC-STD',    // STANDARD
    prioriteCode:  'PRI-P2',          // Basse
    statutCode:    'STAT-RFC-REJ',    // BROUILLON ← en cours de rédaction
    demandeurEmail:'demandeur@casnos.dz',
    ciCodes:       ['CI-004'],         // Serveur de Fichiers
    evaluation:    null,
  },
];

// ── Changement ────────────────────────────────────────────────
// Issu de RFC-SEED-001 (APPROUVEE)
const changementsRaw = [
  {
    code_changement: 'CHG-SEED-001',
    date_debut:      new Date('2025-02-01'),
    date_fin_prevu:  new Date('2025-02-01'),
    reussite:        null,              // pas encore clôturé
    rfcCode:         'RFC-SEED-001',
    changeManagerEmail: 'change.manager@casnos.dz',
    envCode:         'ENV-PRD',         // PRODUCTION
    statutCode:      'STAT-CHG-PLA',    // PLANIFIE
  },
];

// ── Tâches du changement CHG-SEED-001 ─────────────────────────
// id_statut sera résolu dynamiquement (code_statut: 'EN_ATTENTE', contexte: 'TACHE')
const tachesRaw = [
  {
    code_tache:       'TCH-SEED-001',
    ordre_tache:      1,
    titre_tache:      'Sauvegarde complète de la base de données',
    description:      "Exécuter pg_dump sur la BDD de production. Vérifier l'intégrité du fichier. Stocker sur le serveur de fichiers.",
    duree:            2,
    statutCode:       'EN_ATTENTE',    // code_statut dans Statut (contexte: TACHE)
    changementCode:   'CHG-SEED-001',
    implementeurEmail:'implementeur@casnos.dz',
    journaux: [
      {
        code_metier:   'JRN-SEED-001',
        titre_journal: 'Tâche planifiée',
        description:   'Tâche planifiée pour la nuit du 01/02/2025 à 23h00. Serveur de backup disponible.',
      },
    ],
  },
  {
    code_tache:       'TCH-SEED-002',
    ordre_tache:      2,
    titre_tache:      'Exécution du script de migration du schéma',
    description:      'Appliquer le script SQL de migration v3 sur la base de production. Vérifier les contraintes et les index après migration.',
    duree:            3,
    statutCode:       'EN_ATTENTE',
    changementCode:   'CHG-SEED-001',
    implementeurEmail:'implementeur@casnos.dz',
    journaux: [],
  },
  {
    code_tache:       'TCH-SEED-003',
    ordre_tache:      3,
    titre_tache:      'Tests de validation fonctionnelle post-migration',
    description:      "Exécuter la suite de tests de régression du module Assurés. Vérifier les 15 cas de test définis dans le plan de recette.",
    duree:            2,
    statutCode:       'EN_ATTENTE',
    changementCode:   'CHG-SEED-001',
    implementeurEmail:'implementeur@casnos.dz',
    journaux: [],
  },
];

// ── CAB ───────────────────────────────────────────────────────
const cabsRaw = [
  {
    code_metier: 'CAB-SEED-001',
    type_cab:    'NORMAL',
    membres: [
      { email: 'change.manager@casnos.dz', role: 'PRESIDENT' },
      { email: 'cab@casnos.dz',            role: 'MEMBRE'    },
      { email: 'admin@casnos.dz',          role: 'MEMBRE'    },
    ],
  },
];

// ── Réunions CAB ──────────────────────────────────────────────
const reunionsRaw = [
  {
    code_metier:  'REU-SEED-001',
    cabCode:      'CAB-SEED-001',
    date_reunion: new Date('2025-01-20'),
    heure_debut:  new Date('1970-01-01T09:00:00'),
    heure_fin:    new Date('1970-01-01T11:00:00'),
    ordre_jour:   'Revue et vote sur RFC-SEED-001 — Migration BDD module assurés v3',
    // RFCs à l'ordre du jour
    rfcCodes:     ['RFC-SEED-001'],
    // Participants
    participantsEmails: ['change.manager@casnos.dz', 'cab@casnos.dz'],
    // Votes
    votes: [
      {
        code_metier:  'VOT-SEED-001',
        votantEmail:  'cab@casnos.dz',
        rfcCode:      'RFC-SEED-001',
        valeur_vote:  'APPROUVER',
      },
      {
        code_metier:  'VOT-SEED-002',
        votantEmail:  'admin@casnos.dz',
        rfcCode:      'RFC-SEED-001',
        valeur_vote:  'APPROUVER',
      },
    ],
    // Décision finale
    decision: {
      code_metier: 'DCB-SEED-001',
      rfcCode:     'RFC-SEED-001',
      decision:    'APPROUVER',
      motif:       'RFC conforme aux exigences ITIL. Risques maîtrisés. Rollback préparé. Vote unanime : 2 APPROUVER.',
    },
  },
];


// ============================================================
// SEED PRINCIPAL
// ============================================================
async function main() {
  console.log('🌱 Démarrage du seed CASNOS ITIL...\n');

  const hashedPassword = await bcrypt.hash(PLAIN_PASSWORD, BCRYPT_ROUNDS);

  // ── Maps de résolution (code_metier → id) ──────────────────
  const ids = {
    directions:   {},   // DIR-001 → uuid
    roles:        {},   // ADMIN   → { id_role, nom_role }
    permissions:  {},   // rfc:create → { id_permission }
    statuts:      {},   // 'APPROUVEE|RFC' → uuid  (clé = code_statut|contexte)
    priorites:    {},   // PRI-P3 → uuid
    typesRfc:     {},   // TYPE-RFC-NRM → uuid
    environnements:{},  // ENV-PRD → uuid
    configItems:  {},   // CI-002 → uuid
    users:        {},   // email → uuid
    rfcs:         {},   // RFC-SEED-001 → uuid
    changements:  {},   // CHG-SEED-001 → uuid
    taches:       {},   // TCH-SEED-001 → uuid
    cabs:         {},   // CAB-SEED-001 → uuid
    reunions:     {},   // REU-SEED-001 → uuid
  };

  // ──────────────────────────────────────────────────────────────
  // BLOC 1 — Données de référence
  // ──────────────────────────────────────────────────────────────

  console.log('📁 Directions...');
  for (const d of directions) {
    const r = await prisma.directionMetier.upsert({
      where:  { code_metier: d.code_metier },
      update: { nom_direction: d.nom_direction },
      create: d,
    });
    ids.directions[d.code_metier] = r.id_direction;
  }
  console.log(`   ✅ ${directions.length} directions`);

  console.log('🎭 Rôles...');
  for (const r of roles) {
    const res = await prisma.role.upsert({
      where:  { nom_role: r.nom_role },
      update: { description: r.description },
      create: r,
    });
    ids.roles[r.nom_role] = res;
  }
  console.log(`   ✅ ${roles.length} rôles`);

  console.log('🔑 Permissions...');
  for (const p of permissions) {
    const res = await prisma.permission.upsert({
      where:  { code_permission: p.code_permission },
      update: { description: p.description, module: p.module },
      create: p,
    });
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
        where:  { id_role_id_permission: { id_role: role.id_role, id_permission: perm.id_permission } },
        update: {},
        create: { id_role: role.id_role, id_permission: perm.id_permission },
      });
      rpCount++;
    }
  }
  console.log(`   ✅ ${rpCount} liaisons`);

  console.log('📊 Statuts RFC...');
  for (const s of statutsRfc) {
    const r = await prisma.statut.upsert({
      where:  { code_statut_contexte: { code_statut: s.code_statut, contexte: s.contexte } },
      update: { libelle: s.libelle, description: s.description },
      create: s,
    });
    ids.statuts[`${s.code_statut}|${s.contexte}`] = r.id_statut;
  }
  console.log(`   ✅ ${statutsRfc.length} statuts RFC`);

  console.log('📊 Statuts Changement...');
  for (const s of statutsChangement) {
    const r = await prisma.statut.upsert({
      where:  { code_statut_contexte: { code_statut: s.code_statut, contexte: s.contexte } },
      update: { libelle: s.libelle, description: s.description },
      create: s,
    });
    ids.statuts[`${s.code_statut}|${s.contexte}`] = r.id_statut;
  }
  console.log(`   ✅ ${statutsChangement.length} statuts Changement`);

  console.log('📊 Statuts Tâche...');
  for (const s of statutsTache) {
    const r = await prisma.statut.upsert({
      where:  { code_statut_contexte: { code_statut: s.code_statut, contexte: s.contexte } },
      update: { libelle: s.libelle, description: s.description },
      create: s,
    });
    ids.statuts[`${s.code_statut}|${s.contexte}`] = r.id_statut;
  }
  console.log(`   ✅ ${statutsTache.length} statuts Tâche`);

  console.log('🎯 Priorités...');
  for (const p of priorites) {
    const r = await prisma.priorite.upsert({
      where:  { code_priorite: p.code_priorite },
      update: { libelle: p.libelle },
      create: p,
    });
    ids.priorites[p.code_metier] = r.id_priorite;
  }
  console.log(`   ✅ ${priorites.length} priorités`);

  console.log('📋 Types RFC...');
  for (const t of typesRfc) {
    const r = await prisma.typeRfc.upsert({
      where:  { code_metier: t.code_metier },
      update: { description: t.description },
      create: t,
    });
    ids.typesRfc[t.code_metier] = r.id_type;
  }
  console.log(`   ✅ ${typesRfc.length} types RFC`);

  console.log('🌍 Environnements...');
  for (const e of environnements) {
    const r = await prisma.environnement.upsert({
      where:  { nom_env: e.nom_env },
      update: { description: e.description },
      create: e,
    });
    ids.environnements[e.code_metier] = r.id_env;
  }
  console.log(`   ✅ ${environnements.length} environnements`);

  console.log('⚙️  Configuration Items...');
  for (const ci of configItems) {
    const r = await prisma.configurationItem.upsert({
      where:  { nom_ci: ci.nom_ci },
      update: {},
      create: ci,
    });
    ids.configItems[ci.code_metier] = r.id_ci;
  }
  console.log(`   ✅ ${configItems.length} CIs`);

  // ──────────────────────────────────────────────────────────────
  // BLOC 2 — Utilisateurs
  // ──────────────────────────────────────────────────────────────
  console.log('👥 Utilisateurs...');
  for (const u of usersRaw) {
    const role         = ids.roles[u.roleName];
    const id_direction = ids.directions[u.directionCode];

    const user = await prisma.utilisateur.upsert({
      where:  { email_user: u.email_user },
      update: {
        nom_user:       u.nom_user,
        prenom_user:    u.prenom_user,
        date_naissance: u.date_naissance,
        actif:          u.actif,
        id_direction,
      },
      create: {
        code_metier:    u.code_metier,
        nom_user:       u.nom_user,
        prenom_user:    u.prenom_user,
        date_naissance: u.date_naissance,
        email_user:     u.email_user,
        mot_passe:      hashedPassword,
        actif:          u.actif,
        id_direction,
      },
    });

    ids.users[u.email_user] = user.id_user;

    await prisma.userRole.upsert({
      where:  { id_user_id_role: { id_user: user.id_user, id_role: role.id_role } },
      update: {},
      create: { id_user: user.id_user, id_role: role.id_role },
    });

    const flag = u.actif ? '✅' : '🔴';
    console.log(`   ${flag} ${u.email_user.padEnd(35)} → ${u.roleName}${u.actif ? '' : ' (inactif)'}`);
  }

  // ──────────────────────────────────────────────────────────────
  // BLOC 3 — RFCs de test
  // ──────────────────────────────────────────────────────────────
  console.log('\n📝 RFCs de test...');
  for (const rfc of rfcsRaw) {

    // Résoudre via code_metier
    const statutRfc = await prisma.statut.findUnique({ where: { code_metier: rfc.statutCode } });
    const typeRfc   = await prisma.typeRfc.findUnique({ where: { code_metier: rfc.typeCode } });
    const priorite  = await prisma.priorite.findUnique({ where: { code_metier: rfc.prioriteCode } });
    const demandeur = await prisma.utilisateur.findUnique({ where: { email_user: rfc.demandeurEmail } });

    const created = await prisma.rfc.upsert({
      where:  { code_rfc: rfc.code_rfc },
      update: {
        titre_rfc:       rfc.titre_rfc,
        description:     rfc.description,
        justification:   rfc.justification,
        urgence:         rfc.urgence,
        impacte_estimee: rfc.impacte_estimee,
        date_souhaitee:  rfc.date_souhaitee,
        id_statut:       statutRfc.id_statut,
        id_priorite:     priorite.id_priorite,
        id_type:         typeRfc.id_type,
        id_user:         demandeur.id_user,
      },
      create: {
        code_rfc:        rfc.code_rfc,
        titre_rfc:       rfc.titre_rfc,
        description:     rfc.description,
        justification:   rfc.justification,
        urgence:         rfc.urgence,
        impacte_estimee: rfc.impacte_estimee,
        date_souhaitee:  rfc.date_souhaitee,
        id_statut:       statutRfc.id_statut,
        id_priorite:     priorite.id_priorite,
        id_type:         typeRfc.id_type,
        id_user:         demandeur.id_user,
      },
    });
    ids.rfcs[rfc.code_rfc] = created.id_rfc;

    // CIs liés à la RFC
    for (const ciCode of rfc.ciCodes) {
      const id_ci = ids.configItems[ciCode];
      await prisma.ciRfc.upsert({
        where:  { id_ci_id_rfc: { id_ci, id_rfc: created.id_rfc } },
        update: {},
        create: { id_ci, id_rfc: created.id_rfc },
      });
    }

    // Évaluation risque
    if (rfc.evaluation) {
      await prisma.evaluationRisque.upsert({
        where:  { id_rfc: created.id_rfc },
        update: {
          impacte:      rfc.evaluation.impacte,
          probabilite:  rfc.evaluation.probabilite,
          score_risque: rfc.evaluation.score_risque,
          description:  rfc.evaluation.description,
        },
        create: {
          code_metier:  `EVR-${rfc.code_rfc}`,
          impacte:      rfc.evaluation.impacte,
          probabilite:  rfc.evaluation.probabilite,
          score_risque: rfc.evaluation.score_risque,
          description:  rfc.evaluation.description,
          id_rfc:       created.id_rfc,
        },
      });
    }

    const typLabel = rfc.urgence ? '🚨 URGENT' : '📋';
    console.log(`   ${typLabel} ${rfc.code_rfc} — ${rfc.titre_rfc.substring(0, 50)}...`);
    console.log(`       statut: ${rfc.statutCode} | priorité: ${rfc.prioriteCode} | CIs: ${rfc.ciCodes.join(', ')}`);
  }

  // ──────────────────────────────────────────────────────────────
  // BLOC 4 — Changements de test
  // ──────────────────────────────────────────────────────────────
  console.log('\n🔧 Changements de test...');
  for (const chg of changementsRaw) {
    const statutChg    = await prisma.statut.findUnique({ where: { code_metier: chg.statutCode } });
    const changeManager = await prisma.utilisateur.findUnique({ where: { email_user: chg.changeManagerEmail } });
    const env          = await prisma.environnement.findUnique({ where: { code_metier: chg.envCode } });
    const rfc          = await prisma.rfc.findUnique({ where: { code_rfc: chg.rfcCode } });

    const created = await prisma.changement.upsert({
      where:  { code_changement: chg.code_changement },
      update: {
        date_debut:     chg.date_debut,
        date_fin_prevu: chg.date_fin_prevu,
        id_statut:      statutChg.id_statut,
      },
      create: {
        code_changement: chg.code_changement,
        date_debut:      chg.date_debut,
        date_fin_prevu:  chg.date_fin_prevu,
        reussite:        chg.reussite,
        id_rfc:          rfc.id_rfc,
        id_user:         changeManager.id_user,
        id_env:          env.id_env,
        id_statut:       statutChg.id_statut,
      },
    });
    ids.changements[chg.code_changement] = created.id_changement;
    console.log(`   🔧 ${chg.code_changement} → RFC: ${chg.rfcCode} | env: ${chg.envCode} | statut: ${chg.statutCode}`);
  }

  // ──────────────────────────────────────────────────────────────
  // BLOC 5 — Tâches de test
  // ──────────────────────────────────────────────────────────────
  console.log('\n📌 Tâches de test...');
  for (const t of tachesRaw) {
    // Résoudre le statut tâche via code_statut + contexte TACHE
    const statutTache   = await prisma.statut.findUnique({
      where: { code_statut_contexte: { code_statut: t.statutCode, contexte: 'TACHE' } },
    });
    const implementeur  = await prisma.utilisateur.findUnique({ where: { email_user: t.implementeurEmail } });
    const id_changement = ids.changements[t.changementCode];

    const tache = await prisma.tache.upsert({
      where:  { code_tache: t.code_tache },
      update: {
        titre_tache:  t.titre_tache,
        description:  t.description,
        duree:        t.duree,
        id_statut:    statutTache.id_statut,
      },
      create: {
        code_tache:    t.code_tache,
        ordre_tache:   t.ordre_tache,
        titre_tache:   t.titre_tache,
        description:   t.description,
        duree:         t.duree,
        id_changement,
        id_user:       implementeur.id_user,
        id_statut:     statutTache.id_statut,
      },
    });
    ids.taches[t.code_tache] = tache.id_tache;

    // Journaux d'exécution de la tâche
    for (const j of t.journaux) {
      await prisma.journalExecution.upsert({
        where:  { code_metier: j.code_metier },
        update: { titre_journal: j.titre_journal, description: j.description },
        create: {
          code_metier:   j.code_metier,
          titre_journal: j.titre_journal,
          description:   j.description,
          id_tache:      tache.id_tache,
        },
      });
    }

    console.log(`   📌 ${t.code_tache} (ordre ${t.ordre_tache}) — ${t.titre_tache.substring(0, 45)}...`);
    if (t.journaux.length > 0) console.log(`       └─ ${t.journaux.length} journal(x)`);
  }

  // ──────────────────────────────────────────────────────────────
  // BLOC 6 — CAB de test
  // ──────────────────────────────────────────────────────────────
  console.log('\n🏛️  CAB de test...');
  for (const cab of cabsRaw) {
    const created = await prisma.cab.upsert({
      where:  { code_metier: cab.code_metier },
      update: { type_cab: cab.type_cab },
      create: { code_metier: cab.code_metier, type_cab: cab.type_cab },
    });
    ids.cabs[cab.code_metier] = created.id_cab;

    // Membres du CAB
    for (const m of cab.membres) {
      const user = await prisma.utilisateur.findUnique({ where: { email_user: m.email } });
      await prisma.membreCab.upsert({
        where:  { id_cab_id_user: { id_cab: created.id_cab, id_user: user.id_user } },
        update: { role: m.role },
        create: { id_cab: created.id_cab, id_user: user.id_user, role: m.role },
      });
    }

    console.log(`   🏛️  ${cab.code_metier} (${cab.type_cab}) — ${cab.membres.length} membre(s)`);
    cab.membres.forEach(m => console.log(`       └─ ${m.email} [${m.role}]`));
  }

  // ──────────────────────────────────────────────────────────────
  // BLOC 7 — Réunions, votes et décisions
  // ──────────────────────────────────────────────────────────────
  console.log('\n📅 Réunions CAB de test...');
  for (const reu of reunionsRaw) {
    const id_cab = ids.cabs[reu.cabCode];

    const reunion = await prisma.reunionCab.upsert({
      where:  { code_metier: reu.code_metier },
      update: {
        date_reunion: reu.date_reunion,
        heure_debut:  reu.heure_debut,
        heure_fin:    reu.heure_fin,
        ordre_jour:   reu.ordre_jour,
      },
      create: {
        code_metier:  reu.code_metier,
        date_reunion: reu.date_reunion,
        heure_debut:  reu.heure_debut,
        heure_fin:    reu.heure_fin,
        ordre_jour:   reu.ordre_jour,
        id_cab,
      },
    });
    ids.reunions[reu.code_metier] = reunion.id_reunion;

    // RFCs à l'ordre du jour
    for (const rfcCode of reu.rfcCodes) {
      const id_rfc = ids.rfcs[rfcCode];
      await prisma.rfcReunion.upsert({
        where:  { id_rfc_id_reunion: { id_rfc, id_reunion: reunion.id_reunion } },
        update: {},
        create: { id_rfc, id_reunion: reunion.id_reunion },
      });
    }

    // Participants
    for (const email of reu.participantsEmails) {
      const user = await prisma.utilisateur.findUnique({ where: { email_user: email } });
      await prisma.participant.upsert({
        where:  { id_reunion_id_user: { id_reunion: reunion.id_reunion, id_user: user.id_user } },
        update: {},
        create: { id_reunion: reunion.id_reunion, id_user: user.id_user },
      });
    }

    // Votes
    for (const v of reu.votes) {
      const votant = await prisma.utilisateur.findUnique({ where: { email_user: v.votantEmail } });
      const rfc    = await prisma.rfc.findUnique({ where: { code_rfc: v.rfcCode } });
      await prisma.voteCab.upsert({
        where:  { code_metier: v.code_metier },
        update: { valeur_vote: v.valeur_vote },
        create: {
          code_metier:  v.code_metier,
          valeur_vote:  v.valeur_vote,
          id_reunion:   reunion.id_reunion,
          id_user:      votant.id_user,
          id_rfc:       rfc.id_rfc,
        },
      });
    }

    // Décision finale
    if (reu.decision) {
      const d   = reu.decision;
      const rfc = await prisma.rfc.findUnique({ where: { code_rfc: d.rfcCode } });
      await prisma.decisionCab.upsert({
        where:  { code_metier: d.code_metier },
        update: { decision: d.decision, motif: d.motif },
        create: {
          code_metier: d.code_metier,
          decision:    d.decision,
          motif:       d.motif,
          id_reunion:  reunion.id_reunion,
          id_rfc:      rfc.id_rfc,
        },
      });
    }

    console.log(`   📅 ${reu.code_metier} — ${reu.date_reunion.toISOString().split('T')[0]}`);
    console.log(`       RFCs à l'OJ : ${reu.rfcCodes.join(', ')}`);
    console.log(`       Participants : ${reu.participantsEmails.join(', ')}`);
    console.log(`       Votes : ${reu.votes.length} | Décision : ${reu.decision?.decision ?? 'aucune'}`);
  }

  // ──────────────────────────────────────────────────────────────
  // RÉSUMÉ
  // ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(58));
  console.log('✅ Seed terminé avec succès !');
  console.log('═'.repeat(58));
  console.log('  DONNÉES DE BASE');
  console.log(`   Directions          : ${directions.length}`);
  console.log(`   Rôles               : ${roles.length}`);
  console.log(`   Permissions         : ${permissions.length}`);
  console.log(`   Statuts RFC         : ${statutsRfc.length}`);
  console.log(`   Statuts Changement  : ${statutsChangement.length}`);
  console.log(`   Statuts Tâche       : ${statutsTache.length}`);
  console.log(`   Priorités           : ${priorites.length}`);
  console.log(`   Types RFC           : ${typesRfc.length}`);
  console.log(`   Environnements      : ${environnements.length}`);
  console.log(`   Config Items        : ${configItems.length}`);
  console.log(`   Utilisateurs        : ${usersRaw.length}`);
  console.log('  DONNÉES DE TEST');
  console.log(`   RFCs                : ${rfcsRaw.length}`);
  console.log(`   Changements         : ${changementsRaw.length}`);
  console.log(`   Tâches              : ${tachesRaw.length}`);
  console.log(`   CABs                : ${cabsRaw.length}`);
  console.log(`   Réunions CAB        : ${reunionsRaw.length}`);
  console.log('═'.repeat(58));
  console.log(`\n🔐 Comptes de test (mot de passe : "${PLAIN_PASSWORD}")`);
  console.log('   Email                               Rôle');
  console.log('   ' + '─'.repeat(50));
  usersRaw.forEach(u => {
    const status = u.actif ? '' : '  ← inactif (login refusé)';
    console.log(`   ${u.email_user.padEnd(38)} ${u.roleName}${status}`);
  });
  console.log('\n📋 RFCs de test');
  console.log('   Code           Statut        Type      Priorité');
  console.log('   ' + '─'.repeat(50));
  rfcsRaw.forEach(r => {
    const statut = r.statutCode.replace('STAT-RFC-', '').padEnd(12);
    const type   = r.typeCode.replace('TYPE-RFC-', '').padEnd(9);
    console.log(`   ${r.code_rfc.padEnd(15)} ${statut} ${type} ${r.prioriteCode}`);
  });
  console.log('\n🔧 Tâches (changement CHG-SEED-001)');
  console.log('   Code           Ordre  Statut       Titre');
  console.log('   ' + '─'.repeat(60));
  tachesRaw.forEach(t => {
    console.log(`   ${t.code_tache.padEnd(15)} ${String(t.ordre_tache).padEnd(6)} ${t.statutCode.padEnd(12)} ${t.titre_tache.substring(0, 35)}...`);
  });
}

// ============================================================
// EXÉCUTION
// ============================================================
main()
  .catch((e) => {
    console.error('❌ Erreur seed :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });