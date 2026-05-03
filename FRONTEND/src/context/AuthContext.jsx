// ============================================================
// AuthContext.jsx — Contexte d'authentification global
// ============================================================

import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  // ── Connexion ─────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) {
        setUser(result.user);
      }
      return result;
    } finally {
      setLoading(false);
    }
  };

  // ── Déconnexion ───────────────────────────────────────────
  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  // ── Rafraîchir le profil depuis le serveur ────────────────
  const refreshUser = async () => {
    const freshUser = await authService.refreshProfile();
    if (freshUser) setUser(freshUser);
    return freshUser;
  };

  // Synchroniser si localStorage change (multi-onglets)
  useEffect(() => {
    const onStorage = () => setUser(authService.getCurrentUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
};

export default AuthContext;
