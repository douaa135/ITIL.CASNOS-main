// ============================================================
// authService.js — Service d'authentification
// ============================================================

import api from '../api/axiosClient';

const login = async (email, password) => {
  const result = await api.post('/auth/login', { email, password });
  if (result.success) {
    localStorage.setItem('accessToken', result.accessToken);
    localStorage.setItem('user', JSON.stringify(result.user));
  }
  return result;
};

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

const getCurrentUser = () => {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Réponse : { success, message, data: { user } }
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
  logout,
  getCurrentUser,
  refreshProfile,
  isAuthenticated,
  hasRole,
  hasPermission,
};

export default authService;
