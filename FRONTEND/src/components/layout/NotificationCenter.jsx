import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiBell, FiCheckCircle, FiBellOff, FiClock, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import notificationService from '../../services/notificationService';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [isOpen,        setIsOpen]        = useState(false);
  const [loading,       setLoading]       = useState(false);
  const dropdownRef    = useRef(null);
  const prevConnected  = useRef(false);       // ✅ pour détecter la reconnexion
  const navigate       = useNavigate();
  const { user, logout } = useAuth();
  const { socket, connected } = useSocket(); // ✅ récupérer connected

  // ── Fetch REST — notifs + compteur non lus ─────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user?.id_user) return;
    setLoading(true);
    try {
      const [notifRes, countRes] = await Promise.all([
        notificationService.getMyNotifications({ limit: 2, lue: false }),
        notificationService.countUnread(), // ✅ FIX 1 : vrai compteur non lus
      ]);
      setNotifications(notifRes.data?.notifications || []);
      setUnreadCount(countRes.data?.unread ?? 0);   // ✅ FIX 1 : .unread pas .urgents
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

  // ── FIX 3 : Rattrapage à chaque reconnexion socket ─────────
  useEffect(() => {
    const vientDeReconnecter = connected && !prevConnected.current;
    if (vientDeReconnecter) {
      console.log('[NotificationCenter] reconnexion détectée → rattrapage');
      fetchNotifications();
    }
    prevConnected.current = connected;
  }, [connected, fetchNotifications]);

  // ── FIX 4 : Nouvelle notif en temps réel ──────────────────
  useEffect(() => {
    if (!socket) return;

    const handleNewNotif = (notif) => {
      console.log('[NotificationCenter] notification:new :', notif);

      // Ajout immédiat en tête — limité à 2 pour l'affichage cockpit
      setNotifications(prev => {
        if (prev.some(n => n.id_notif === notif.id_notif)) return prev;
        const newList = [{ ...notif, lue: false }, ...prev];
        return newList.slice(0, 2);
      });

      // ✅ FIX 1+4 : incrémenter le badge unread correctement
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

  // ── Marquer une notif comme lue ────────────────────────────
  const handleMarkRead = async (id_notif) => {
    try {
      await notificationService.markAsRead(id_notif);
      // ✅ Mise à jour locale immédiate — pas de refetch
      setNotifications(prev =>
        prev.map(n =>
          n.id_notif === id_notif
            ? { ...n, lue: true }
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('[markAsRead]', error);
    }
  };

  // ── Marquer toutes comme lues ──────────────────────────────
  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('[markAllRead]', error);
    }
  };

  // ── Navigation au clic ─────────────────────────────────────
  const handleNotifClick = (notif) => {
    if (!notif.lue) handleMarkRead(notif.id_notif);
    // setIsOpen(false); // On laisse ouvert pour que l'utilisateur puisse voir l'état lu s'il le souhaite, ou on ferme mais sans naviguer
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
                <p>Aucune notification</p>
              </div>
            ) : (
              notifications.slice(0, 2).map(notif => (  // ✅ slice ici seulement pour l'affichage
                <div
                  key={notif.id_notif}
                  className={`notif-item ${notif.lue ? 'is-read' : 'is-unread'}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="notif-item-icon"><FiBell /></div>
                  <div className="notif-item-content">
                    <p className="notif-message">{notif.message}</p>
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
                      {!notif.lue && (
                        <button
                          className="mark-read-dot"
                          onClick={e => { e.stopPropagation(); handleMarkRead(notif.id_notif); }}
                          title="Marquer comme lu"
                        />
                      )}
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
    </div>
  );
};

export default NotificationCenter;