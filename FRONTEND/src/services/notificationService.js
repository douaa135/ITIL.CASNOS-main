import api from '../api/axiosClient';

// L'intercepteur Axios retourne déjà response.data
// Donc api.get('/...') retourne { success, data, message }
// On retourne directement la réponse pour que NotificationCenter accède à .data

const notificationService = {
  getMyNotifications: async (params = {}) => {
    // response = { success, data: { notifications: [...], total, ... }, message }
    const response = await api.get('/notifications/me', { params });
    return response; // NotificationCenter accède à response.data.notifications
  },

  getUnreadCount: async () => {
    // response = { success, data: { unread: N }, message }
    const response = await api.get('/notifications/me/unread-count');
    return response; // NotificationCenter accède à response.data.unread
  },

  markAsRead: async (id_notif) => {
    const response = await api.patch(`/notifications/${id_notif}/read`);
    return response;
  },

  markAllAsRead: async () => {
    const response = await api.patch('/notifications/me/read-all');
    return response;
  },

  deleteNotification: async (id_notif) => {
    const response = await api.delete(`/notifications/${id_notif}`);
    return response;
  }
};

export default notificationService;
