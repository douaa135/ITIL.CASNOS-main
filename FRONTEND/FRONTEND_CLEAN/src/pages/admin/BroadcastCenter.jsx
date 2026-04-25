import React, { useState, useEffect } from 'react';
import { 
  FiRadio, FiSend, FiUsers, FiClock, 
  FiSettings, FiAlertCircle, FiInfo, FiTrash2
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './BroadcastCenter.css';

const BroadcastCenter = () => {
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
      // L'intercepteur Axios retourne res.data directement
      // La réponse du backend est { success, data: { data: [...], total, ... } }
      const list = res?.data?.data ?? res?.data ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) { console.error('[BroadcastCenter] fetchUsers error:', e); }
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
        if (targetIds.length === 0) {
          alert('Aucun utilisateur chargé. Veuillez attendre le chargement de la liste.');
          setSending(false);
          return;
        }
      } else {
        targetIds = [selectedUser];
      }

      const limitedTargets = targetIds.slice(0, 20);

      const results = await Promise.allSettled(limitedTargets.map(id_user =>
        api.post('/notifications', { message, objet, type_notif: 'IN_APP', id_user })
      ));

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        const firstErr = failures[0]?.reason;
        const errMsg = firstErr?.error?.message ?? firstErr?.message ?? JSON.stringify(firstErr);
        console.error('[BroadcastCenter] Échecs:', failures.map(f => f.reason));
        alert(`${limitedTargets.length - failures.length} envoyées, ${failures.length} échec(s).\nDétail: ${errMsg}`);
      } else {
        alert(`${limitedTargets.length} notification(s) envoyée(s) avec succès !`);
      }
      setMessage('');
      setObjet('');
    } catch (error) {
      console.error('[BroadcastCenter] Broadcast Error:', error);
      alert(`Erreur: ${error?.error?.message ?? error?.message ?? 'Erreur inconnue'}`);
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
               <button type="button" className="template-btn" onClick={() => { setObjet('Mise à jour préventive'); setMessage('Une mise à jour préventive du système est planifiée. Merci de sauvegarder vos travaux en cours avant la fenêtre de maintenance.'); }}>Mise à jour préventive</button>
               <button type="button" className="template-btn" onClick={() => { setObjet('Interruption de service'); setMessage('Une interruption de service est actuellement en cours. Nos équipes techniques travaillent activement à la résolution. Nous vous tiendrons informés de l\'évolution.'); }}>Interruption de service</button>
               <button type="button" className="template-btn" onClick={() => { setObjet('Service restauré'); setMessage('Le service a été restauré avec succès. Vous pouvez reprendre votre activité normalement. Nous vous remercions de votre patience.'); }}>Restauration de service</button>
               <button type="button" className="template-btn" onClick={() => { setObjet('Changement d\'urgence en cours'); setMessage('Un changement d\'urgence est en cours d\'implémentation. Certains services peuvent être temporairement indisponibles. Durée estimée : 30 minutes.'); }}>Changement urgent</button>
               <button type="button" className="template-btn" onClick={() => { setObjet('Maintenance planifiée – ce soir'); setMessage('Rappel : une maintenance est planifiée ce soir de 20h00 à 23h00. Les systèmes seront indisponibles durant cette période. Merci de finaliser vos travaux en cours avant 19h45.'); }}>Rappel maintenance</button>
               <button type="button" className="template-btn" onClick={() => { setObjet('Nouvelle RFC soumise – action requise'); setMessage('Une nouvelle demande de changement (RFC) a été soumise et nécessite votre validation dans les meilleurs délais. Connectez-vous à l\'espace ITIL pour procéder à l\'évaluation.'); }}>Action requise – RFC</button>
            </div>
         </div>
      </div>
    </div>
  );
};

export default BroadcastCenter;
