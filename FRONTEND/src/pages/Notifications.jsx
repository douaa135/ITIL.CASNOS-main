import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  FiBell, FiCheckCircle, FiTrash2, FiClock,
  FiRefreshCw, FiInbox, FiMail
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import notificationService from '../services/notificationService';
import './Notifications.css';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [limit]                           = useState(20);
  const [filter, setFilter]               = useState('all');
  const [viewMode, setViewMode]           = useState('RECEPTION');
  const [liveCount, setLiveCount]         = useState(0);
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { socket } = useSocket();

  const canSendNotifications = user?.roles?.includes('ADMIN') || user?.roles?.includes('CHANGE_MANAGER');

  // ── Fetch REST ──────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      if (viewMode === 'ENVOI') {
        const response = await notificationService.getMySentNotifications({ page, limit });
        setNotifications(response.data.notifications || []);
        setTotal(response.data.total || 0);
        setLiveCount(0);
        return;
      }

      const lue = filter === 'unread' ? false : filter === 'read' ? true : undefined;
      const response = await notificationService.getMyNotifications({ page, limit, lue });
      setNotifications(response.data.notifications || []);
      setTotal(response.data.total || 0);
      setLiveCount(0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filter, viewMode]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── WebSocket — via SocketContext ────────────────────
  useEffect(() => {
    if (!user?.id_user || !socket || viewMode !== 'RECEPTION') return;

    const handleNewNotif = (notif) => {
      console.log('[Socket] notification:new reçue :', notif);

      if (filter !== 'read') {
        setNotifications(prev => {
          if (prev.some(n => n.id_notif === notif.id_notif)) return prev;
          return [notif, ...prev];
        });
        setTotal(prev => prev + 1);
        setLiveCount(prev => prev + 1);
      }
    };

    socket.on('notification:new', handleNewNotif);

    return () => {
      socket.off('notification:new', handleNewNotif);
    };
  }, [user?.id_user, filter, socket, viewMode]);

  // ── Actions ─────────────────────────────────────────────────
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

  return (
    <div className="notif-page">
      <div className="notif-header-premium">
        <div>
          <h1><FiMail /> Boîte de Réception</h1>
          <p>Gérez vos notifications et alertes système</p>
        </div>
        <div className="notif-header-actions">
          {viewMode === 'RECEPTION' && liveCount > 0 && (
            <button
              className="mark-all-btn-premium"
              onClick={fetchNotifications}
              style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
            >
              <FiRefreshCw /> {liveCount} nouvelle{liveCount > 1 ? 's' : ''} — Actualiser
            </button>
          )}
          <button className="refresh-btn-premium" onClick={fetchNotifications}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
          <button className="mark-all-btn-premium" onClick={handleMarkAllRead}>
            <FiCheckCircle /> Tout marquer comme lu
          </button>
        </div>
      </div>

      {/* Filtres */}
      <div className="notif-toolbar-premium" style={{ alignItems: 'center' }}>
        <div className="notif-filters" style={{ display: 'flex', gap: '0.75rem' }}>
          {(canSendNotifications ? ['RECEPTION', 'ENVOI'] : ['RECEPTION']).map(mode => (
            <button
              key={mode}
              className={`filter-tab ${viewMode === mode ? 'active' : ''}`}
              onClick={() => { setViewMode(mode); setPage(1); setFilter('all'); }}
            >
              {mode === 'RECEPTION' ? 'Réception' : 'Envoi'}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {viewMode === 'RECEPTION' && (
            <div className="notif-filters" style={{ display: 'flex', gap: '0.5rem' }}>
              {['all', 'unread', 'read'].map(f => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => { setFilter(f); setPage(1); }}
                >
                  {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Lues'}
                </button>
              ))}
            </div>
          )}
          <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
            {total} notification{total !== 1 ? 's' : ''}
          </span>
        </div>
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
          notifications.map((notif) => {
            const isRead = notif.lue === true;
            const recipients = notif.destinataires ?? [];
            const recipientLabel = recipients.length === 0
              ? 'Sans destinataire'
              : recipients.length === 1
                ? `${recipients[0].destinataire?.prenom_user || ''} ${recipients[0].destinataire?.nom_user || ''}`.trim()
                : `${recipients.length} destinataires`;

            return (
              <div
                key={notif.id_notif}
                className={`notif-card-premium ${isRead ? 'is-read' : 'is-unread'}`}
              >
                <div className="notif-card-icon"><FiBell /></div>
                <div className="notif-card-body">
                  <div className="notif-card-header">
                    <span className="notif-card-objet">{notif.objet?.replace(/[✅❌]/g, '') || 'Notification système'}</span>
                    <span className="notif-card-time">
                      <FiClock /> {new Date(notif.date_envoi).toLocaleString()}
                    </span>
                  </div>
                  <p className="notif-card-msg">{notif.message?.replace(/[✅❌]/g, '')}</p>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem', color: '#64748b', fontSize: '0.85rem' }}>
                    <span>
                      Expéditeur : {notif.expediteur && notif.expediteur.email_user !== 'systeme@itil.internal'
                        ? `${notif.expediteur.prenom_user ?? ''} ${notif.expediteur.nom_user ?? ''}`
                        : 'Système'}
                    </span>
                  </div>
                  <div className="notif-card-footer">
                    <span className="notif-tag">
                      {notif.id_rfc ? 'RFC' : notif.id_changement ? 'Changement' : notif.id_tache ? 'Tâche' : 'Système'}
                    </span>
                    <div className="notif-card-actions">
                      {/* Boutons retirés à la demande de l'utilisateur */}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
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