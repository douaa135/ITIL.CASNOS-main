// ============================================================
// helpers.js — Fonctions utilitaires partagées
// ============================================================

/**
 * Formate une date en format court français
 * @param {string|Date} d
 * @returns {string}
 */
export const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : '—';

/**
 * Formate une date + heure
 */
export const formatDateTime = (d) =>
  d
    ? new Date(d).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '—';

/**
 * Formate une date en format court (jj/mm/aaaa)
 */
export const formatDateShort = (d) =>
  d ? new Date(d).toLocaleDateString('fr-FR') : '—';

/**
 * Formate une taille en octets (Ko / Mo)
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 Ko';
  return bytes >= 1_048_576
    ? `${(bytes / 1_048_576).toFixed(1)} Mo`
    : `${(bytes / 1024).toFixed(0)} Ko`;
};

/**
 * Retourne les initiales d'un utilisateur
 */
export const getUserInitials = (user) => {
  if (!user) return '?';
  return `${user.prenom_user?.[0] ?? ''}${user.nom_user?.[0] ?? ''}`.toUpperCase();
};

/**
 * Tronque un texte à une longueur donnée
 */
export const truncate = (str, max = 60) => {
  if (!str) return '';
  return str.length > max ? `${str.slice(0, max)}…` : str;
};

/**
 * Retourne 'Oui' / 'Non'
 */
export const boolToFr = (val) => (val ? 'Oui' : 'Non');
