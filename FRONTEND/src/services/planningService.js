import api from '../api/axiosClient';

const planningService = {
  getVueSemaine: (date) => api.get(`/planning/semaine${date ? `?date=${date}` : ''}`),
  getVueMois: (annee, mois) => api.get(`/planning/mois?annee=${annee}&mois=${mois}`),
  getVueSemestre: (annee, semestre) => api.get(`/planning/semestre?annee=${annee}&semestre=${semestre}`),
  getCalendrier: (params) => api.get('/planning/calendrier', { params }),
  getConflits: (date_debut, date_fin) => api.get('/planning/conflits', { params: { date_debut, date_fin } }),
  validerDate: (data) => api.post('/planning/valider-date', data),
  
  // Blackouts
  getAllBlackouts: () => api.get('/planning/blackouts'),
  getBlackoutById: (id) => api.get(`/planning/blackouts/${id}`),
  createBlackout: (data) => api.post('/planning/blackouts', data),
  updateBlackout: (id, data) => api.put(`/planning/blackouts/${id}`, data),
  deleteBlackout: (id) => api.delete(`/planning/blackouts/${id}`),
};

export default planningService;
