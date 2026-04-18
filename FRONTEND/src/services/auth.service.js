import api from '../api/axios';

const login = async (email, password) => {
  try {
    const response = await api.post('/auth/login', { email, password });
    if (response.success) {
      localStorage.setItem('accessToken', response.accessToken);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    return response;
  } catch (error) {
    throw error?.message || error?.error?.message || 'Identifiants invalides';
  }
};

const logout = async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
  }
};

const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

const AuthService = {
  login,
  logout,
  getCurrentUser,
};

export default AuthService;
