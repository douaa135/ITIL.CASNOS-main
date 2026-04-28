import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBell, FiCheckCircle, FiTrash2, FiClock,
  FiRefreshCw, FiExternalLink, FiSearch, FiFilter,
  FiInbox, FiSend, FiPlus, FiMail, FiUser
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import notificationService from '../services/notificationService';
import userService from '../services/userService';
import './Notifications.css';

const Notifications = () => {
  const [activeTab, setActiveTab] = useState('received'); // received, sent, send
  const [notifications, setNotifications] = useState([]);
  const [sentNotifications, setSentNotifications] = useState([
    {
      id_notif: 1,
      objet: 'Demande de validation RFC',
      message: 'Votre RFC #RFC-001 a été soumise pour validation.',
      destinataire: 'Manager Changement',
      date_envoi: new Date().toISOString(),
      statut: 'Envoyée'
    },
    {
      id_notif: 2,
      objet: 'Tâche assignée',
      message: 'Une nouvelle tâche vous a été assignée.',
      destinataire: 'Jean Dupont',
      date_envoi: new Date(Date.now() - 86400000).toISOString(),
      statut: 'Envoyée'
    }
  ]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [showSendForm, setShowSendForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sendForm, setSendForm] = useState({
    destinataireId: '',
    selectedUsers: [], // Array of IDs
    objet: '',
    message: ''
  });
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    if (activeTab === 'received') {
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
    } else if (activeTab === 'sent') {
      // Pour l'instant, on simule les notifications envoyées
      // Dans un vrai backend, il faudrait une API pour récupérer les notifications envoyées
      setLoading(true);
      setTimeout(() => {
        // On ne réinitialise plus sentNotifications ici pour conserver les messages envoyés pendant la session
        setLoading(false);
      }, 500);
    }
  }, [page, limit, filter, activeTab]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Charger les utilisateurs au montage du composant
  useEffect(() => {
    const fetchUsers = async () => {
      setUsersLoading(true);
      try {
        const response = await userService.getAllUsers();
        setUsers(response.users || []);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    const targetIds = sendForm.selectedUsers;
    if (targetIds.length === 0 || !sendForm.objet.trim() || !sendForm.message.trim()) {
      alert('Veuillez sélectionner au moins un destinataire et remplir tous les champs');
      return;
    }

    try {
      // Simulation d'envoi multi-destinataires
      const newSentNotifs = targetIds.map(id => {
        const destUser = users.find(u => u.id_user === id);
        return {
          id_notif: Date.now() + Math.random(),
          objet: sendForm.objet,
          message: sendForm.message,
          destinataire: destUser ? `${destUser.nom} ${destUser.prenom}` : 'Inconnu',
          date_envoi: new Date().toISOString(),
          statut: 'Envoyée'
        };
      });

      setSentNotifications(prev => [...newSentNotifs, ...prev]);
      
      alert(`Notification envoyée avec succès à ${targetIds.length} utilisateur(s) !`);
      setSendForm({ destinataireId: '', selectedUsers: [], objet: '', message: '' });
      setShowSendForm(false);
      setActiveTab('sent');
      // On n'appelle plus fetchNotifications ici pour ne pas relancer le chargement simulé inutilement
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Erreur lors de l\'envoi de la notification');
    }
  };

  const toggleUserSelection = (userId) => {
    setSendForm(prev => {
      const isSelected = prev.selectedUsers.includes(userId);
      const newSelected = isSelected 
        ? prev.selectedUsers.filter(id => id !== userId)
        : [...prev.selectedUsers, userId];
      return { ...prev, selectedUsers: newSelected };
    });
  };

  const selectAllFiltered = () => {
    const filteredIds = filteredUsers.map(u => u.id_user);
    setSendForm(prev => ({
      ...prev,
      selectedUsers: Array.from(new Set([...prev.selectedUsers, ...filteredIds]))
    }));
  };

  const selectByProfile = (role) => {
    const roleUsersIds = users
      .filter(u => u.roles?.includes(role) || u.id_role === role)
      .map(u => u.id_user);
    
    setSendForm(prev => ({
      ...prev,
      selectedUsers: Array.from(new Set([...prev.selectedUsers, ...roleUsersIds]))
    }));
  };

  const deselectByProfile = (role) => {
    const roleUsersIds = users
      .filter(u => u.roles?.includes(role) || u.id_role === role)
      .map(u => u.id_user);
    
    setSendForm(prev => ({
      ...prev,
      selectedUsers: prev.selectedUsers.filter(id => !roleUsersIds.includes(id))
    }));
  };

  const availableRoles = ['ADMIN', 'CHANGE_MANAGER', 'SERVICE_DESK', 'IMPLEMENTER', 'DEMANDEUR', 'MEMBRE_CAB'];

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

  const filteredUsers = users.filter(u => 
    `${u.nom} ${u.prenom} ${u.email} ${u.roles?.[0] || u.id_role || ''}`.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  return (
    <div className="notif-page">
      <div className="notif-header-premium">
        <div>
          <h1><FiMail /> Boîte de Réception</h1>
          <p>Gérez vos messages et notifications</p>
        </div>
        <div className="notif-header-actions">
          <button className="refresh-btn-premium" onClick={fetchNotifications}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
          {activeTab === 'received' && (
            <button className="mark-all-btn-premium" onClick={handleMarkAllRead}>
              <FiCheckCircle /> Tout marquer comme lu
            </button>
          )}
        </div>
      </div>

      {/* Onglets */}
      <div className="notif-tabs">
        <button
          className={`notif-tab ${activeTab === 'received' ? 'active' : ''}`}
          onClick={() => setActiveTab('received')}
        >
          <FiInbox /> Reçues ({total})
        </button>
        <button
          className={`notif-tab ${activeTab === 'sent' ? 'active' : ''}`}
          onClick={() => setActiveTab('sent')}
        >
          <FiSend /> Envoyées
        </button>
        <button
          className={`notif-tab ${activeTab === 'send' ? 'active' : ''}`}
          onClick={() => setActiveTab('send')}
        >
          <FiPlus /> Envoyer
        </button>
      </div>

      {/* Contenu des onglets */}
      {activeTab === 'received' && (
        <>
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
          </div>

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
        </>
      )}

      {activeTab === 'sent' && (
        <div className="notif-list-premium glass-card">
          {loading ? (
            <div className="notif-state">
              <FiRefreshCw className="spinning" />
              <p>Chargement...</p>
            </div>
          ) : sentNotifications.length === 0 ? (
            <div className="notif-state">
              <FiSend />
              <p>Aucune notification envoyée.</p>
            </div>
          ) : (
            sentNotifications.map((notif) => (
              <div key={notif.id_notif} className="notif-card-premium sent">
                <div className="notif-card-icon">
                  <FiSend />
                </div>
                <div className="notif-card-body">
                  <div className="notif-card-header">
                    <span className="notif-card-objet">{notif.objet}</span>
                    <span className="notif-card-time">
                      <FiClock /> {new Date(notif.date_envoi).toLocaleString()}
                    </span>
                  </div>
                  <p className="notif-card-msg">{notif.message}</p>
                  <div className="notif-card-footer">
                    <span className="notif-tag">À: {notif.destinataire}</span>
                    <span className="notif-statut">{notif.statut}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'send' && (
        <div className="send-notification-form glass-card">
          <h2><FiPlus /> Envoyer une nouvelle notification</h2>
          <form onSubmit={handleSendNotification}>
            <div className="form-group">
              <label>Sélection par Profil (Rôles)</label>
              <div className="profile-selection-badges">
                {availableRoles.map(role => (
                  <button 
                    key={role}
                    type="button" 
                    className="profile-badge-btn"
                    onClick={() => selectByProfile(role)}
                    onDoubleClick={() => deselectByProfile(role)}
                    title="Clic simple pour ajouter, double clic pour retirer"
                  >
                    {role.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Destinataire(s) Individuels <span className="selection-count">{sendForm.selectedUsers.length} sélectionné(s)</span></label>
              
              <div className="user-selection-premium">
                <div className="user-selection-toolbar">
                  <div className="user-selection-search">
                    <FiSearch />
                    <input 
                      type="text" 
                      placeholder="Rechercher un utilisateur..." 
                      value={userSearchTerm}
                      onChange={(e) => setUserSearchTerm(e.target.value)}
                    />
                  </div>
                  <button type="button" className="select-all-btn" onClick={selectAllFiltered}>
                    Tout sélectionner
                  </button>
                </div>

                <div className="user-selection-list">
                  {usersLoading ? (
                    <div className="list-loading"><FiRefreshCw className="spinning" /> Chargement...</div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="list-empty">Aucun utilisateur trouvé.</div>
                  ) : (
                    filteredUsers.map((user) => (
                      <div 
                        key={user.id_user} 
                        className={`user-selection-item ${sendForm.selectedUsers.includes(user.id_user) ? 'active' : ''}`}
                        onClick={() => toggleUserSelection(user.id_user)}
                      >
                        <div className="user-selection-check">
                          <div className={`custom-checkbox ${sendForm.selectedUsers.includes(user.id_user) ? 'checked' : ''}`}>
                            {sendForm.selectedUsers.includes(user.id_user) && <FiCheckCircle />}
                          </div>
                        </div>
                        <div className="user-selection-info">
                          <div className="user-selection-name">{user.nom} {user.prenom}</div>
                          <div className="user-selection-email">{user.email} • {user.roles?.[0] || 'Utilisateur'}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="objet">Objet</label>
              <input
                type="text"
                id="objet"
                value={sendForm.objet}
                onChange={(e) => setSendForm(prev => ({ ...prev, objet: e.target.value }))}
                placeholder="Objet de la notification"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Message</label>
              <textarea
                id="message"
                value={sendForm.message}
                onChange={(e) => setSendForm(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Contenu de la notification"
                rows={5}
                required
              />
            </div>
            <div className="form-actions">
              <button type="submit" className="send-btn">
                <FiSend /> Envoyer
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Notifications;
