// ============================================================
// axiosClient.js — Instance Axios avec refresh token automatique
// ============================================================

import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // envoie le cookie refresh_token automatiquement
});

// ── Intercepteur requête : injecte le JWT ─────────────────────
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Gestion du refresh : une seule promesse partagée ─────────
// Évite les appels simultanés à /auth/refresh si plusieurs
// requêtes expirent en même temps (race condition).
let isRefreshing = false;
let pendingQueue = []; // [{ resolve, reject }]

function processQueue(error, token = null) {
  pendingQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  pendingQueue = [];
}

// ── Intercepteur réponse : refresh automatique sur 401 ────────
api.interceptors.response.use(
  // Succès → on déroule la data comme avant
  (response) => response.data,

  async (error) => {
    const originalRequest = error.config;

    // Si ce n'est pas un 401, ou si c'est déjà une requête de refresh
    // qui échoue → on déconnecte proprement sans boucle infinie.
    const isRefreshEndpoint = originalRequest?.url?.includes('/auth/refresh');
    const isLoginEndpoint   = originalRequest?.url?.includes('/auth/login');

    if (
      error.response?.status !== 401 ||
      originalRequest._retried ||
      isRefreshEndpoint ||
      isLoginEndpoint
    ) {
      // Déconnexion propre uniquement si ce n'est pas une simple erreur API
      if (error.response?.status === 401 && !isLoginEndpoint) {
        _forceLogout();
      }
      return Promise.reject(error.response?.data ?? error);
    }

    // Marquer pour ne pas retenter une 2e fois
    originalRequest._retried = true;

    if (isRefreshing) {
      // Une autre requête est déjà en train de refresh → on attend
      return new Promise((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    // C'est nous qui lançons le refresh
    isRefreshing = true;

    try {
      // Le cookie refresh_token est envoyé automatiquement (withCredentials: true)
      const data = await axios.post(
        '/api/auth/refresh',
        {},
        { withCredentials: true }
      );

      const newAccessToken = data.data?.accessToken || data.accessToken;

      if (!newAccessToken) throw new Error('Pas de token dans la réponse refresh');

      // Sauvegarder le nouveau token
      localStorage.setItem('accessToken', newAccessToken);

      // Débloquer les requêtes en attente
      processQueue(null, newAccessToken);

      // Relancer la requête originale avec le nouveau token
      originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
      return api(originalRequest);

    } catch (refreshError) {
      // Le refresh a échoué (cookie expiré, session révoquée…)
      processQueue(refreshError, null);
      _forceLogout();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── Déconnexion forcée ────────────────────────────────────────
function _forceLogout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('user');
  if (!window.location.pathname.includes('/login')) {
    window.location.href = '/login';
  }
}

export default api;