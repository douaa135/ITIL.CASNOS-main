import api from '../api/axiosClient';

// L'intercepteur Axios retourne déjà response.data → { success, data, message }
// On retourne la réponse complète pour que AuditLog.jsx accède à response.data.logs et response.data.total

const auditService = {
  getAuditLogs: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.entite_type) params.append('entite_type', filters.entite_type);
    if (filters.id_user)     params.append('id_user', filters.id_user);
    if (filters.action)      params.append('action', filters.action);
    if (filters.page)        params.append('page', filters.page);
    if (filters.limit)       params.append('limit', filters.limit);

    // api retourne { success, data: { logs: [...], total }, message }
    const response = await api.get(`/audit-logs?${params.toString()}`);
    return response; // AuditLog.jsx accède à response.data.logs et response.data.total
  }
};

export default auditService;
