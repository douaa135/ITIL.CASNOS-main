import React, { useState, useEffect } from 'react';
import { 
  FiRadio, FiSend, FiUsers, FiClock, 
  FiSettings, FiAlertCircle, FiInfo, FiTrash2
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './Broadcaster.css';

const ROLE_LABELS = {
  ADMIN:          'Admin',
  CHANGE_MANAGER: 'Change Manager',
  SERVICE_DESK:   'Service Desk',
  IMPLEMENTEUR:   'Implémenteur',
  DEMANDEUR:      'Demandeur',
  MEMBRE_CAB:     'Membre CAB',
  ADMIN_SYSTEME:  'Admin Système',
};

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
      const res = await api.get('/users?limit=1000');
      const list = res?.data?.data ?? res?.data ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) { console.error('[Broadcaster] fetchUsers error:', e); }
  };

  const fetchRecentNotifs = async () => {
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
      let targetIds;
      if (selectedUser === 'ALL') {
        targetIds = users.map(u => u.id_user);
      } else {
        targetIds = [selectedUser];
      }

      if (targetIds.length === 0) {
        alert('Aucun utilisateur correspondant trouvé.');
        setSending(false);
        return;
      }

      const limitedTargets = targetIds.slice(0, 20);

      const results = await Promise.allSettled(limitedTargets.map(id_user =>
        api.post('/notifications', { message, objet, type_notif: 'IN_APP', id_user })
      ));

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        alert(`${limitedTargets.length - failures.length} envoyées, ${failures.length} échec(s).`);
      } else {
        alert(`${limitedTargets.length} notification(s) diffusée(s) avec succès !`);
      }
      setMessage('');
      setObjet('');
    } catch (error) {
      console.error('[Broadcaster] Error:', error);
      alert(`Erreur: ${error?.error?.message ?? error?.message ?? 'Erreur lors de la diffusion.'}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="broadcaster-page">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiRadio /></div>
          <div className="premium-header-text">
            <h1>Centre de Diffusion</h1>
            <p>Envoyez des préavis de changement et des alertes de maintenance aux utilisateurs.</p>
          </div>
        </div>
        <div className="premium-header-actions">
           <button 
             className="btn-create-premium" 
             onClick={handleBroadcast} 
             disabled={sending}
             style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
           >
              {sending ? 'Diffusion en cours...' : <><FiSend /> Diffuser maintenant</>}
           </button>
        </div>
      </div>

      <div className="broadcast-grid">
         <div className="broadcast-form-card">
            <div className="card-header">
               <h3><FiSend /> Nouvelle Diffusion</h3>
               <p>Rédigez votre message pour les utilisateurs impactés.</p>
            </div>
            
            <form onSubmit={handleBroadcast}>
               <div className="form-group">
                  <label className="broadcast-destination-label">
                    <FiUsers className="broadcast-destination-icon" />
                    Destinataire
                  </label>
                  <select
                    value={selectedUser}
                    onChange={e => setSelectedUser(e.target.value)}
                    className="sd-input sd-select-input"
                  >
                    <option value="ALL">📢 Tous les utilisateurs</option>
                    
                    {users.map(u => (
                      <option key={u.id_user} value={u.id_user}>
                        👤 {u.prenom_user} {u.nom_user} ({ROLE_LABELS[u.roles?.[0]] || 'Utilisateur'})
                      </option>
                    ))}
                  </select>
                  {/* Compteur dynamique */}
                  <div className={`broadcast-target-pill ${selectedUser === 'ALL' ? 'all-targets' : 'single-target'}`}>
                    <FiUsers size={12} />
                    {selectedUser === 'ALL' 
                      ? `${users.length} utilisateur${users.length !== 1 ? 's' : ''} ciblé${users.length !== 1 ? 's' : ''}`
                      : '1 utilisateur ciblé'
                    }
                  </div>
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
