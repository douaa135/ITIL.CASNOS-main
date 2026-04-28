import api from '../api/axiosClient';

const systemService = {
  // ── Environnements (CRUD) ──────────────────────────────────────────
  getEnvironnements: async () => {
    const response = await api.get('/environnements');
    return response; 
  },
  
  createEnvironnement: async (data) => {
    const response = await api.post('/environnements', data);
    return response;
  },

  updateEnvironnement: async (id, data) => {
    const response = await api.put(`/environnements/${id}`, data);
    return response;
  },

  deleteEnvironnement: async (id) => {
    const response = await api.delete(`/environnements/${id}`);
    return response;
  },

  // ── Référentiels (Lecture Seule) ────────────────────────────────────
  getStatuts: async (contexte = '') => {
    const params = contexte ? { contexte } : {};
    const response = await api.get('/statuts', { params });
    return response;
  },

  getPriorites: async () => {
    const response = await api.get('/priorites');
    return response;
  },

  getTypesRfc: async () => {
    const response = await api.get('/types-rfc');
    return response;
  },

  getDirections: async () => {
    const response = await api.get('/directions');
    return response;
  }
};

export default systemService;
