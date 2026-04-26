import React, { useState, useEffect } from 'react';
import { 
  FiRadio, FiSend, FiUsers, FiClock, 
  FiSettings, FiAlertCircle, FiInfo, FiTrash2
} from 'react-icons/fi';
import api from '../../api/axios';
import './Broadcaster.css';

const Broadcaster = () => {
  const [users, setUsers] = useState([]);
  const [message, setMessage] = useState('');
  const [objet, setObjet] = useState('');
  const [selectedUser, setSelectedUser] = useState('ALL');
  const [sending, setSending] = useState(false);
  const [recentNotifs, setRecentNotifs] = useState([]);

  useEffect(() => {
    fetchUsers();
    fetchRecentNotifs();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      if (res.success) setUsers(res.data.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchRecentNotifs = async () => {
    // This is a mockup of recent notifications sent by this role/user
    // In a real app, we'd have a specific endpoint for sent notifications
    setRecentNotifs([
      { id: 1, date: '2026-04-13T10:00:00', objet: 'Maintenance Serveur', destinataire: 'Tous' },
      { id: 2, date: '2026-04-12T15:30:00', objet: 'Mise à jour CRM', destinataire: 'Direction des Prestations' }
    ]);
  };

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim() || !objet.trim()) return;

    setSending(true);
    try {
      // If selectedUser is 'ALL', we'd normally loop or have a broadcast endpoint
      // Here we simulate for the selected user
      const targetIds = selectedUser === 'ALL' ? users.map(u => u.id_user) : [selectedUser];
      
      // We take only first 10 for safety if ALL
      const limitedTargets = targetIds.slice(0, 10);

      await Promise.all(limitedTargets.map(id => api.post('/notifications', {
        message,
        objet,
        type_notif: 'INFO',
        id_user: id
      })));

      alert('Notification diffusée avec succès !');
      setMessage('');
      setObjet('');
    } catch (error) {
       console.error('Broadcast Error:', error);
       alert('Erreur lors de la diffusion.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="broadcaster-page">
      <div className="broadcast-header">
         <h2><FiRadio /> Centre de Diffusion</h2>
         <p>Envoyez des préavis de changement et des alertes de maintenance aux utilisateurs.</p>
      </div>

      <div className="broadcast-grid">
         <div className="broadcast-form-card">
            <div className="card-header">
               <h3><FiSend /> Nouvelle Diffusion</h3>
               <p>Rédigez votre message pour les utilisateurs impactés.</p>
            </div>
            
            <form onSubmit={handleBroadcast}>
               <div className="form-group">
                  <label>Destinataire(s)</label>
                  <select 
                    value={selectedUser} 
                    onChange={e => setSelectedUser(e.target.value)}
                    className="sd-input"
                  >
                     <option value="ALL">Tous les utilisateurs actifs</option>
                     {users.map(u => (
                       <option key={u.id_user} value={u.id_user}>{u.nom_user} {u.prenom_user} ({u.roles?.[0]})</option>
                     ))}
                  </select>
               </div>

               <div className="form-group">
                  <label>Objet du message</label>
                  <input 
                    type="text" 
                    placeholder="ex: Maintenance planifiée du module ERP"
                    value={objet}
                    onChange={e => setObjet(e.target.value)}
                    required
                    className="sd-input"
                  />
               </div>

               <div className="form-group">
                  <label>Message aux utilisateurs</label>
                  <textarea 
                    placeholder="Décrivez l'impact, la durée prévue et les éventuelles solutions de secours..."
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    required
                    className="sd-textarea"
                  />
               </div>

               <div className="broadcast-tips">
                  <FiInfo />
                  <p>Un préavis minimum de 24h est recommandé pour les changements normaux.</p>
               </div>

               <button type="submit" className="btn-broadcast" disabled={sending}>
                  {sending ? 'Diffusion en cours...' : <><FiSend /> Diffuser maintenant</>}
               </button>
            </form>
         </div>

         <div className="broadcast-history-card">
            <div className="card-header">
               <h3><FiClock /> Diffusions Récentes</h3>
            </div>
            <div className="history-list">
               {recentNotifs.map(n => (
                 <div key={n.id} className="history-item">
                    <div className="history-icon"><FiRadio /></div>
                    <div className="history-info">
                       <strong>{n.objet}</strong>
                       <span>Dest: {n.destinataire} • {new Date(n.date).toLocaleString()}</span>
                    </div>
                    <button className="del-btn"><FiTrash2 /></button>
                 </div>
               ))}
            </div>

            <div className="templates-section">
               <h4>Modèles de Message</h4>
               <button className="template-btn">Mise à jour préventive</button>
               <button className="template-btn">Interruption de service</button>
               <button className="template-btn">Restauration de service</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default Broadcaster;
