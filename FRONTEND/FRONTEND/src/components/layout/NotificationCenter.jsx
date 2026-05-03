import React, { useState, useEffect, useRef } from 'react';
import { FiBell, FiCheck, FiCheckCircle, FiX, FiBellOff, FiClock, FiExternalLink } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import notificationService from '../../services/notificationService';
import './NotificationCenter.css';

const NotificationCenter = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const response = await notificationService.getMyNotifications({ limit: 5 });
      setNotifications(response.data.notifications || []);
      
      const countRes = await notificationService.getUnreadCount();
      setUnreadCount(countRes.data.unread || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh every 10 seconds for near real-time updates
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id_notif === id ? { ...n, lue: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotifClick = (notif) => {
    handleMarkRead(notif.id_notif);
    setIsOpen(false);
    
    // Redirection selon le type
    if (notif.id_rfc) navigate(`/rfcs/${notif.id_rfc}`);
    else if (notif.id_changement) navigate(`/manager/changements`); // Or specific change view if exists
    else if (notif.id_tache) navigate(`/implementer/tasks`);
  };

  return (
    <div className="notif-center-container" ref={dropdownRef}>
      <button 
        className={`itil-notif-btn ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <FiBell />
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
              notifications.map((notif) => (
                <div 
                  key={notif.id_notif} 
                  className={`notif-item ${notif.lue ? 'is-read' : 'is-unread'}`}
                  onClick={() => handleNotifClick(notif)}
                >
                  <div className="notif-item-icon">
                    <FiBell />
                  </div>
                  <div className="notif-item-content">
                    <p className="notif-message">{notif.message}</p>
                    <div className="notif-meta">
                      <span className="notif-time">
                        <FiClock /> {new Date(notif.date_envoi).toLocaleDateString()} {new Date(notif.date_envoi).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {!notif.lue && (
                        <button 
                          className="mark-read-dot" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkRead(notif.id_notif);
                          }}
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
