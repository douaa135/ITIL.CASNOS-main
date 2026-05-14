import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';
// ✅ Plus d'import socket ici

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user,    setUser]    = useState(authService.getCurrentUser());
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const result = await authService.login(email, password);
      if (result.success) setUser(result.user);
      return result;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await authService.logout();
    setUser(null);
  };

  const refreshUser = async () => {
    const freshUser = await authService.refreshProfile();
    if (freshUser) setUser(freshUser);
    return freshUser;
  };

  useEffect(() => {
    const onStorage = () => setUser(authService.getCurrentUser());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    // ✅ Exposer aussi le token depuis localStorage
    <AuthContext.Provider value={{
      user,
      loading,
      login,
      logout,
      refreshUser,
      token: localStorage.getItem('accessToken'), // ✅ requis par SocketContext
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans un <AuthProvider>');
  return ctx;
};

// ✅ useSocket supprimé d'ici — il est dans SocketContext.jsx

export default AuthContext;