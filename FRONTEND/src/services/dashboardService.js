// ============================================================
// dashboardService.js
// ============================================================

import api from '../api/axiosClient';

const dashboardService = {
  getDashboardStats: async () => {
    try {
      const response = await api.get('/kpi');
      return response;
    } catch (error) {
      console.error('Error fetching KPIs', error);
      return { success: false, data: null };
    }
  },
  getKpiRfc: async () => {
    try {
      const response = await api.get('/kpi/rfc');
      return response;
    } catch (error) {
      return { success: false, data: null };
    }
  },
  getKpiChangements: async () => {
    try {
      const response = await api.get('/kpi/changements');
      return response;
    } catch (error) {
      return { success: false, data: null };
    }
  },
  getKpiTaches: async () => {
    try {
      const response = await api.get('/kpi/taches');
      return response;
    } catch (error) {
      return { success: false, data: null };
    }
  }
};

export default dashboardService;
