// ============================================================
// authService.js — Service d'authentification
// ============================================================

import api from '../api/axiosClient';

// ─── Login ────────────────────────────────────────────────────
const login = async (email, password) => {
  const result = await api.post('/auth/login', { email, password });
  if (result.success) {
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('user', JSON.stringify(result.user));
  }
  return result;
};

// ─── Refresh token ────────────────────────────────────────────
// Appelé manuellement si besoin (ex: au démarrage de l'app).
// L'axiosClient gère le refresh automatique sur 401 — cette
// fonction sert pour un refresh proactif (avant expiration).
const refresh = async () => {
  try {
    // withCredentials est déjà activé dans l'instance api
    const result = await api.post('/auth/refresh');
    if (result.success && result.accessToken) {
      localStorage.setItem('accessToken', result.accessToken);
      return result.accessToken;
    }
  } catch {
    // Refresh échoué → laisser l'intercepteur gérer
  }
  return null;
};

// ─── Logout ───────────────────────────────────────────────────
const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Déconnexion côté client même si le serveur répond mal
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

// ─── Profil courant ───────────────────────────────────────────
const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const refreshProfile = async () => {
  try {
    const result = await api.get('/auth/me');
    if (result.success && result.data?.user) {
      localStorage.setItem('user', JSON.stringify(result.data.user));
      return result.data.user;
    }
  } catch {
    // Silencieux — retourne l'utilisateur en cache
  }
  return getCurrentUser();
};

// ─── Helpers ──────────────────────────────────────────────────
const isAuthenticated = () =>
  !!(localStorage.getItem('accessToken') && getCurrentUser());

const hasRole = (role) => {
  const user = getCurrentUser();
  return user?.roles?.includes(role) ?? false;
};

const hasPermission = (permission) => {
  const user = getCurrentUser();
  return user?.permissions?.includes(permission) ?? false;
};

const authService = {
  login,
  refresh,
  logout,
  getCurrentUser,
  refreshProfile,
  isAuthenticated,
  hasRole,
  hasPermission,
};

export default authService;