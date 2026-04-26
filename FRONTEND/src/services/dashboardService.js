import api from '../api/axios';

export const getDashboardStats = async () => {
    try {
        const response = await api.get('/dashboard/stats');
        return response;
    } catch (error) {
        console.error('Erreur stats dashboard:', error);
        // Fallback mock
        return {
            success: true,
            data: {
                rfc: { total: 0, approved: 0 },
                changement: { successRate: 0 }
            }
        };
    }
};

const dashboardService = {
    getDashboardStats
};

export default dashboardService;
