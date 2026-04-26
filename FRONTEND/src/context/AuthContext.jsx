import React, { createContext, useContext, useState, useEffect } from 'react';
import AuthService from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = AuthService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await AuthService.login(email, password);
      // After axios interceptor, response is { success, accessToken, user }
      if (response.success) {
        const userData = response.user;
        setUser(userData);
        return { success: true, role: userData?.roles?.[0] };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: typeof error === 'string' ? error : 'Identifiants invalides' };
    }
  };

  const logout = async () => {
    await AuthService.logout();
    setUser(null);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return (
    <AuthContext.Provider value={{ user, setUser, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
