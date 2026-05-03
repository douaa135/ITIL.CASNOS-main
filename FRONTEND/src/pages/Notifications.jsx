import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBell, FiCheckCircle, FiTrash2, FiClock,
  FiRefreshCw, FiInbox, FiMail
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const lue = filter === 'unread' ? false : (filter === 'read' ? true : undefined);
      const response = await notificationService.getMyNotifications({ page, limit, lue });
      setNotifications(response.data.notifications || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id_notif === id ? { ...n, lue: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id_notif !== id));
      setTotal(prev => prev - 1);
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleNotifClick = (notif) => {
    if (!notif.lue) handleMarkRead(notif.id_notif);
    if (notif.id_rfc) navigate(`/rfcs/${notif.id_rfc}`);
    else if (notif.id_changement) navigate(`/manager/changements`);
    else if (notif.id_tache) navigate(`/implementer/tasks`);
  };

  return (
    <div className="notif-page">
      <div className="notif-header-premium">
        <div>
          <h1><FiMail /> Boîte de Réception</h1>
          <p>Gérez vos notifications et alertes système</p>
        </div>
        <div className="notif-header-actions">
          <button className="refresh-btn-premium" onClick={fetchNotifications}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
          <button className="mark-all-btn-premium" onClick={handleMarkAllRead}>
            <FiCheckCircle /> Tout marquer comme lu
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="notif-toolbar-premium">
        <div className="notif-filters">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            Toutes
          </button>
          <button
            className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Non lues
          </button>
          <button
            className={`filter-tab ${filter === 'read' ? 'active' : ''}`}
            onClick={() => setFilter('read')}
          >
            Lues
          </button>
        </div>
        <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
          {total} notification{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Liste */}
      <div className="notif-list-premium glass-card">
        {loading && notifications.length === 0 ? (
          <div className="notif-state">
            <FiRefreshCw className="spinning" />
            <p>Chargement...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="notif-state">
            <FiInbox />
            <p>Aucune notification trouvée.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id_notif}
              className={`notif-card-premium ${notif.lue ? 'is-read' : 'is-unread'}`}
              onClick={() => handleNotifClick(notif)}
            >
              <div className="notif-card-icon">
                <FiBell />
              </div>
              <div className="notif-card-body">
                <div className="notif-card-header">
                  <span className="notif-card-objet">{notif.objet || 'Notification système'}</span>
                  <span className="notif-card-time">
                    <FiClock /> {new Date(notif.date_envoi).toLocaleString()}
                  </span>
                </div>
                <p className="notif-card-msg">{notif.message}</p>
                <div className="notif-card-footer">
                  <span className="notif-tag">
                    {notif.id_rfc ? 'RFC' : notif.id_changement ? 'Changement' : notif.id_tache ? 'Tâche' : 'Système'}
                  </span>
                  <div className="notif-card-actions">
                    {!notif.lue && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMarkRead(notif.id_notif); }}
                        title="Marquer comme lu"
                      >
                        <FiCheckCircle />
                      </button>
                    )}
                    <button
                      className="delete-btn"
                      onClick={(e) => { e.stopPropagation(); handleDelete(notif.id_notif); }}
                      title="Supprimer"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {total > limit && (
          <div className="notif-pagination-premium">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Précédent</button>
            <span>Page {page} sur {Math.ceil(total / limit)}</span>
            <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)}>Suivant</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
