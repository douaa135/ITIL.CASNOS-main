import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // For httpOnly cookies
});

// Request interceptor to add JWT if available
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

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response.data,  // Unwrap data so components get { success, data, message } directly
  (error) => {
    if (error.response && error.response.status === 401) {
      console.error('Session expired or unauthorized');
      localStorage.removeItem('accessToken');
      localStorage.removeItem('user');
      // Force redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    // Pass the backend error message if available
    const backendError = error.response?.data;
    return Promise.reject(backendError || error);
  }
);

export default api;
