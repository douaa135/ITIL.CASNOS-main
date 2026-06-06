import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { FiBell, FiCheckCircle, FiBellOff, FiClock, FiExternalLink, FiRadio, FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import notificationService from '../../services/notificationService';
import './NotificationCenter.css';

const renderObjetWithBlueCode = (objet) => {
  if (!objet) return '—';
  objet = objet.replace(/[✅❌]/g, '');
  const codeRegex = /\b[A-Z]{3,10}-(?:SEED-)?[A-Z0-9_-]+\b/;
  const splitRegex = /(\b[A-Z]{3,10}-(?:SEED-)?[A-Z0-9_-]+\b)/g;
  const parts = objet.split(splitRegex);
  
  return parts.map((part, index) => {
    if (codeRegex.test(part)) {
      return (
        <span key={index} style={{ color: '#1d4ed8', fontWeight: 700 }}>
          {part}
        </span>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isOpen,        setIsOpen]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const [selectedNotif, setSelectedNotif] = useState(null);
  const dropdownRef    = useRef(null);
  const prevConnected  = useRef(false);
  const navigate       = useNavigate();
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket();

  // ── Fetch REST — unread notifications for the dropdown ─────
  const fetchNotifications = useCallback(async () => {
    if (!user?.id_user) return;
    setLoading(true);
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationService.getMyNotifications({ limit: 20, lue: false }), // fetch UNREAD only
        notificationService.countUnread(),
      ]);
      const unreadNotifs = (notifRes.data?.notifications || []).filter(n => !n.lue);
      setNotifications(unreadNotifs);
      setUnreadCount(countRes.data?.unread ?? 0);
    } catch (error) {
      console.error('[NotificationCenter] fetchNotifications :', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id_user]);

  // ── Chargement initial ─────────────────────────────────────
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Rattrapage à chaque reconnexion socket ─────────────────
  useEffect(() => {
    const vientDeReconnecter = connected && !prevConnected.current;
    if (vientDeReconnecter) {
      console.log('[NotificationCenter] reconnexion détectée → rattrapage');
      fetchNotifications();
    }
    prevConnected.current = connected;
  }, [connected, fetchNotifications]);

  // ── Nouvelle notif en temps réel ───────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      console.log('[NotificationCenter] notification:new :', notif);

      // Add unread notification to dropdown immediately
      setNotifications(prev => {
        if (prev.some(n => n.id_notif === notif.id_notif)) return prev;
        return [{ ...notif, lue: false }, ...prev];
      });

      setUnreadCount(prev => prev + 1);
    };

    const handleUserDesactive = (data) => {
      if (!data.actif) {
        logout();
        navigate('/login');
      }
    };

    socket.on('notification:new', handleNewNotif);
    socket.on('user:desactive',   handleUserDesactive);

    return () => {
      socket.off('notification:new', handleNewNotif);
      socket.off('user:desactive',   handleUserDesactive);
    };
  }, [socket, logout, navigate]);

  // ── Fermer au clic extérieur ───────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Marquer une notif comme lue → elle disparaît du dropdown ─
  const handleMarkRead = async (id_notif) => {
    try {
      await notificationService.markAsRead(id_notif);
      // Remove from dropdown (it's now read — visible in "Voir toutes les notifications")
      setNotifications(prev => prev.filter(n => n.id_notif !== id_notif));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[markAsRead]', error);
    }
  };

  // ── Marquer toutes comme lues ──────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('[markAllRead]', error);
    }
  };

  // ── Click on a notification → mark as read and it disappears from dropdown ─
  const handleNotifClick = (notif) => {
    if (!notif.lue) {
      handleMarkRead(notif.id_notif);
    }
    setIsOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────
  return (
    <div className="notif-center-container" ref={dropdownRef}>
      <button
        className={`itil-notif-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        style={{ color: 'white' }}
      >
        <FiBell style={{ color: 'white' }} />
        {unreadCount > 0 && (
          <span className="notif-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown glass-card">
          <div className="notif-dropdown-header">
            <h3>Notifications</h3>
            {unreadCount > 0 && (
              <button className="mark-all-btn" onClick={handleMarkAllRead}>
                <FiCheckCircle /> Tout marquer lu
              </button>
            )}
          </div>

          <div className="notif-list-container">
            {loading && notifications.length === 0 ? (
              <div className="notif-loading">Chargement...</div>
            ) : notifications.length === 0 ? (
              <div className="notif-empty">
                <FiBellOff />
                <p>Aucune notification non lue</p>
              </div>
            ) : (
              notifications.slice(0, 5).map(notif => (
                <div
                  key={notif.id_notif}
                  className="notif-item is-unread"
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="notif-item-icon" style={{ width: 10, height: 10, borderRadius: '50%', background: '#3b82f6', flexShrink: 0, marginTop: 6 }} />
                  <div className="notif-item-content">
                    <p className="notif-message">{notif.message?.replace(/[✅❌]/g, '')}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.35rem', color: '#64748b', fontSize: '0.78rem' }}>
                      <span>
                        Expéditeur : {notif.expediteur && notif.expediteur.email_user !== 'systeme@itil.internal'
                          ? `${notif.expediteur.prenom_user ?? ''} ${notif.expediteur.nom_user ?? ''}`
                          : 'Système'}
                      </span>
                    </div>
                    <div className="notif-meta">
                      <span className="notif-time">
                        <FiClock />{' '}
                        {new Date(notif.date_envoi).toLocaleDateString()}{' '}
                        {new Date(notif.date_envoi).toLocaleTimeString([], {
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </span>
                      <button
                        className="mark-read-dot"
                        onClick={e => { e.stopPropagation(); handleMarkRead(notif.id_notif); }}
                        title="Marquer comme lu"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="notif-dropdown-footer">
            <button onClick={() => { setIsOpen(false); navigate('/notifications'); }}>
              Voir toutes les notifications <FiExternalLink />
            </button>
          </div>
        </div>
      )}

      {/* ── DETAIL MODAL ── */}
      {selectedNotif && createPortal(
        <div
          className="modal-backdrop"
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}
          onClick={() => setSelectedNotif(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="premium-modal-blue-box"
            style={{ width: '600px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
          >
            {/* Header */}
            <div className="premium-modal-blue-header">
              <div className="premium-modal-blue-icon">
                <FiRadio size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Détails de la Notification</h2>
                <div className="premium-modal-info-value">{selectedNotif.objet?.replace(/[✅❌]/g, '') || 'Système'}</div>
                <div className="premium-modal-blue-header-subtitle">
                  {selectedNotif.date_envoi || selectedNotif.date
                    ? new Date(selectedNotif.date_envoi ?? selectedNotif.date).toLocaleString('fr-FR')
                    : ''}
                </div>
              </div>
              <button onClick={() => setSelectedNotif(null)} className="close-btn-rfc-style" style={{ color: '#fff' }}><FiX size={20} /></button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                
                {/* Objet */}
                {selectedNotif.objet && (
                  <div>
                    <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Objet</h4>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {renderObjetWithBlueCode(selectedNotif.objet)}
                    </div>
                  </div>
                )}

                {/* Info block */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <h5 style={{ margin: '0 0 0.5rem 0', fontSize: '0.7rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Expéditeur</h5>
                    {selectedNotif.expediteur ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.88rem' }}>
                            {selectedNotif.expediteur.prenom_user} {selectedNotif.expediteur.nom_user}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                            {selectedNotif.expediteur.roles?.[0] ?? 'Utilisateur'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Système</span>
                    )}
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</h4>
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', fontSize: '0.92rem', color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                    {selectedNotif.message?.replace(/[✅❌]/g, '')}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1.25rem 2rem', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setSelectedNotif(null)}
                style={{ padding: '0.6rem 2rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default NotificationCenter;