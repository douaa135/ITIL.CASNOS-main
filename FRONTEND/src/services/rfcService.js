import api from '../api/axios';

export const getAllRfcs = async (params = {}) => {
    try {
        const response = await api.get('/rfc', { params });
        return response;
    } catch (error) {
        console.error('Erreur lors du chargement des RFCs:', error);
        return { success: true, data: { rfcs: [] } };
    }
};
