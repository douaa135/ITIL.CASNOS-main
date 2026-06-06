import api from '../api/axiosClient';

const notificationService = {

  getMyNotifications: async (params = {}) => {
    const response = await api.get('/notifications/me', { params });
    return response;
  },

  // ✅ Compte les notifs non lues (UserNotification.lue = false)
  countUnread: async () => {
    const response = await api.get('/notifications/me/unread-count');
    return response;
  },

  getMySentNotifications: async (params = {}) => {
    const response = await api.get('/notifications/me/sent', { params });
    return response;
  },

  // Garder pour la compatibilité (badges urgents dans le dashboard)
  getUrgentsCount: async () => {
    const response = await api.get('/notifications/me/urgents-count');
    return response;
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
  },
};

export default notificationService;