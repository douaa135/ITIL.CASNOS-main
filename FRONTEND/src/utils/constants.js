// ============================================================
// constants.js — Constantes partagées du projet ITIL CASNOS
// ============================================================

// ── Mapping rôle → route de redirection ──────────────────────
export const ROLE_ROUTES = {
  ADMIN:          '/admin',
  CHANGE_MANAGER: '/manager',
  IMPLEMENTEUR:   '/implementer/tasks',
  MEMBRE_CAB:     '/cab',
  DEMANDEUR:      '/demandeur',
  SERVICE_DESK:   '/servicedesk',
};

// ── Métadonnées des rôles (couleur, label) ────────────────────
export const ROLE_META = {
  ADMIN:          { color: '#7c3aed', bg: '#f5f3ff', label: 'Admin' },
  CHANGE_MANAGER: { color: '#0369a1', bg: '#e0f2fe', label: 'Change Manager' },
  IMPLEMENTEUR:   { color: '#047857', bg: '#d1fae5', label: 'Implémenteur' },
  MEMBRE_CAB:     { color: '#b45309', bg: '#fef3c7', label: 'Membre CAB' },
  DEMANDEUR:      { color: '#6b7280', bg: '#f3f4f6', label: 'Demandeur' },
  SERVICE_DESK:   { color: '#0e7490', bg: '#cffafe', label: 'Service Desk' },
  // ADMIN_SYSTEME retiré de la page Comptes & RBAC
};

// ── Mapping statut RFC → variante Badge ──────────────────────
export const RFC_STATUS_VARIANT = {
  //BROUILLON:                 'neutral',
  SOUMIS:                    'info',
  PRE_APPROUVEE:             'warning',
  EN_INSTRUCTION:            'warning',
  EVALUEE:                   'warning',
  EN_ATTENTE_CAB:            'warning',
  APPROUVEE:                 'success',
  EN_COURS_IMPLEMENTATION:   'info',
  CLOTUREE:                  'success',
  REJETEE:                   'danger',
};

// ── Libellés lisibles des statuts RFC ────────────────────────
export const RFC_STATUS_LABELS = {
  //BROUILLON:                 'Brouillon',
  SOUMIS:                    'Soumis',
  PRE_APPROUVEE:             'Pré-approuvée',
  EN_INSTRUCTION:            'En instruction',
  EVALUEE:                   'Évaluée',
  EN_ATTENTE_CAB:            'En attente CAB',
  APPROUVEE:                 'Approuvée',
  EN_COURS_IMPLEMENTATION:   'En cours',
  CLOTUREE:                  'Clôturée',
  REJETEE:                   'Rejetée',
};

// ── Machine à états RFC (transitions autorisées backend) ─────
// Clé = code_statut actuel → valeurs = codes_statut autorisés
export const RFC_TRANSITIONS = {
  //BROUILLON:     [],                                          // lecture seule (demandeur soumet)
  SOUMIS:        ['PRE_APPROUVEE', 'REJETEE', 'CLOTUREE'],
  PRE_APPROUVEE: ['EVALUEE', 'APPROUVEE', 'REJETEE', 'CLOTUREE'],
  EVALUEE:       ['APPROUVEE', 'REJETEE', 'CLOTUREE'],
  APPROUVEE:     [],                                          // état final géré par workflow
  REJETEE:       ['BROUILLON', 'CLOTUREE'],
  CLOTUREE:      [],                                          // état final absolu
};

// ── Machine à états Changement ────────────────────────────────
export const CHANGE_TRANSITIONS = {
  EN_PLANIFICATION: ['EN_COURS', 'EN_ATTENTE', 'CLOTURE'],
  EN_ATTENTE:       ['EN_COURS', 'CLOTURE'],
  EN_COURS:         ['IMPLEMENTE', 'EN_ECHEC', 'CLOTURE'],
  IMPLEMENTE:       ['TESTE', 'EN_ECHEC'],
  TESTE:            ['CLOTURE', 'EN_COURS'],
  EN_ECHEC:         ['EN_PLANIFICATION', 'CLOTURE'],
  CLOTURE:          [],
};

// ── Libellés statuts Changement ───────────────────────────────
export const CHANGE_STATUS_LABELS = {
  EN_PLANIFICATION: 'En planification',
  EN_ATTENTE:       'En attente',
  EN_COURS:         'En cours',
  IMPLEMENTE:       'Implémenté',
  TESTE:            'Testé',
  EN_ECHEC:         'En échec',
  CLOTURE:          'Clôturé',
};

// ── Machine à états Tâche ─────────────────────────────────────
export const TACHE_TRANSITIONS = {
  EN_ATTENTE: ['EN_COURS', 'ANNULEE'],
  EN_COURS:   ['TERMINEE', 'ANNULEE'],
  TERMINEE:   [],
  ANNULEE:    [],
};

// ── Libellés statuts Tâche ────────────────────────────────────
export const TACHE_STATUS_LABELS = {
  EN_ATTENTE: 'En attente',
  EN_COURS:   'En cours',
  TERMINEE:   'Terminée',
  ANNULEE:    'Annulée',
};

// ── Mapping statut → classe CSS ──────────────────────────────
export const STATUS_CSS_CLASS = {
  SOUMIS:           'status-working',
  PRE_APPROUVEE:    'status-working',
  EVALUEE:          'status-working',
  EN_INSTRUCTION:   'status-working',
  APPROUVEE:        'status-success',
  CLOTUREE:         'status-success',
  CLOTURE:          'status-success',
  IMPLEMENTE:       'status-success',
  TESTE:            'status-success',
  TERMINEE:         'status-success',
  REJETEE:          'status-danger',
  EN_ECHEC:         'status-danger',
  ANNULEE:          'status-danger',
  EN_ATTENTE_CAB:   'status-neutral',
  EN_ATTENTE:       'status-neutral',
  BROUILLON:        'status-neutral',
  EN_PLANIFICATION: 'status-working',
  EN_COURS:         'status-working',
};

// ── Priorités RFC ────────────────────────────────────────────
export const RFC_PRIORITY_LABELS = {
  BASSE:    'Basse',
  NORMALE:  'Normale',
  HAUTE:    'Haute',
  URGENTE:  'Urgente',
  CRITIQUE: 'Critique',
};

export const RFC_PRIORITY_VARIANT = {
  BASSE:    'neutral',
  NORMALE:  'info',
  HAUTE:    'warning',
  URGENTE:  'danger',
  CRITIQUE: 'danger',
};