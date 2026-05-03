// ============================================================
// constants.js — Constantes partagées du projet ITIL CASNOS
// ============================================================

// ── Mapping rôle → route de redirection ──────────────────────
export const ROLE_ROUTES = {
  ADMIN:          '/admin-system',
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
  ADMIN_SYSTEME:  { color: '#dc2626', bg: '#fee2e2', label: 'Admin Système' },
};

// ── Mapping statut RFC → variante Badge ──────────────────────
export const RFC_STATUS_VARIANT = {
  BROUILLON:                 'neutral',
  SOUMIS:                    'info',
  EN_INSTRUCTION:            'warning',
  EVALUEE:                   'warning',
  EN_ATTENTE_CAB:            'warning',
  APPROUVEE:                 'success',
  EN_COURS_IMPLEMENTATION:   'info',
  CLOTUREE:                  'success',
  REJETEE:                   'danger',
};

// ── Libellés lisibles des statuts ────────────────────────────
export const RFC_STATUS_LABELS = {
  BROUILLON:                 'Brouillon',
  SOUMIS:                    'Soumis',
  EN_INSTRUCTION:            'En instruction',
  EVALUEE:                   'Évaluée',
  EN_ATTENTE_CAB:            'En attente CAB',
  APPROUVEE:                 'Approuvée',
  EN_COURS_IMPLEMENTATION:   'En cours',
  CLOTUREE:                  'Clôturée',
  REJETEE:                   'Rejetée',
};

// ── Mapping statut → classe CSS ──────────────────────────────
export const STATUS_CSS_CLASS = {
  SOUMIS:         'status-working',
  EVALUEE:        'status-working',
  EN_INSTRUCTION: 'status-working',
  APPROUVEE:      'status-success',
  CLOTUREE:       'status-success',
  REJETEE:        'status-danger',
  EN_ATTENTE_CAB: 'status-neutral',
  BROUILLON:      'status-neutral',
};
