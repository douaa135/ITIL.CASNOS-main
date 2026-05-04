import React, { useState, useEffect } from 'react';
import {
  FiRadio, FiSend, FiUsers, FiClock,
  FiInfo, FiTrash2, FiCalendar
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './BroadcastCenter.css';

const ROLE_LABELS = {
  ADMIN:          'Admin',
  CHANGE_MANAGER: 'Change Manager',
  SERVICE_DESK:   'Service Desk',
  IMPLEMENTEUR:   'Implémenteur',
  DEMANDEUR:      'Demandeur',
  MEMBRE_CAB:     'Membre CAB',
  ADMIN_SYSTEME:  'Admin Système',
};

const BroadcastCenter = () => {
  const [users, setUsers]               = useState([]);
  const [message, setMessage]           = useState('');
  const [objet, setObjet]               = useState('');
  const [selectedUser, setSelectedUser]     = useState('TOUS');
  const [sending, setSending]           = useState(false);
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
    } catch (e) { console.error('[BroadcastCenter] fetchUsers error:', e); }
  };

  const fetchRecentNotifs = async () => {
    try {
      const res = await api.get('/notifications', { params: { page: 1, limit: 20 } });
      // On gère plusieurs structures possibles (standard R.success, ou déballage auto)
      let list = [];
      if (res?.data?.notifications) list = res.data.notifications;
      else if (res?.notifications) list = res.notifications;
      else if (Array.isArray(res?.data)) list = res.data;
      else if (Array.isArray(res)) list = res;

      setRecentNotifs(Array.isArray(list) ? list : []);
    } catch (e) {
      console.error('[BroadcastCenter] fetchRecentNotifs error:', e);
      setRecentNotifs([]);
    }
  };

  /** Résoud les IDs à partir de la sélection */
  const resolveTargetIds = () => {
    if (selectedUser === 'TOUS') return users.map(u => u.id_user);
    return [parseInt(selectedUser, 10)];
  };

  const targetCount = resolveTargetIds().length;

  const handleDeleteRecent = async (id) => {
    if (!window.confirm('Supprimer cette diffusion récente ?')) return;
    try {
      await api.delete(`/notifications/${id}`);
      setRecentNotifs(prev => prev.filter(item => item.id !== id && item.id_notif !== id));
    } catch (e) {
      console.error('[BroadcastCenter] delete notification error:', e);
      alert('Impossible de supprimer cette notification.');
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim() || !objet.trim()) return;

    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) {
      alert('Aucun utilisateur trouvé pour ce profil.');
      return;
    }

    setSending(true);
    try {
      const results = await Promise.allSettled(
        targetIds.map(id_user =>
          api.post('/notifications', { message, objet, type_notif: 'IN_APP', id_user })
        )
      );

      const failures = results.filter(r => r.status === 'rejected');
      if (failures.length > 0) {
        const errMsg = failures[0]?.reason?.message ?? 'Erreur inconnue';
        alert(`${targetIds.length - failures.length} envoyées, ${failures.length} échec(s).\nDétail: ${errMsg}`);
      } else {
        alert(`✅ ${targetIds.length} notification(s) envoyée(s) avec succès !`);
        fetchRecentNotifs(); // Rafraîchir la liste après envoi
      }
      setMessage('');
      setObjet('');
      setSelectedUser('TOUS');
    } catch (error) {
      alert(`Erreur: ${error?.message ?? 'Erreur inconnue'}`);
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
            <p>Configurez les messages de diffusion et supervisez les alertes envoyées aux utilisateurs ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={handleSendBroadcast} disabled={sending}>
            <FiSend /> {sending ? 'Envoi...' : 'Diffuser le message'}
          </button>
        </div>
      </div>

      <div className="broadcast-grid">
        {/* ── Formulaire ── */}
        <div className="broadcast-form-card">
          <div className="card-header">
            <h3><FiSend /> Nouvelle Diffusion</h3>
            <p>Rédigez votre message pour les utilisateurs impactés.</p>
          </div>

          <form onSubmit={handleSendBroadcast}>

            {/* ─ Sélection du destinataire ─ */}
            <div className="form-group">
              <label className="dest-label">
                <FiUsers className="dest-label-icon" />
                Destinataire
              </label>
              <select
                value={selectedUser}
                onChange={e => setSelectedUser(e.target.value)}
                className="sd-input sd-select"
              >
                <option value="TOUS">Tous les utilisateurs</option>
                {users.map(u => (
                  <option key={u.id_user} value={u.id_user}>
                    {u.prenom_user} {u.nom_user}{u.roles?.[0] ? ` — ${ROLE_LABELS[u.roles[0]] ?? u.roles[0]}` : ''}
                  </option>
                ))}
              </select>
              {/* Compteur dynamique */}
              <div className={`target-count-pill ${targetCount > 0 ? 'is-active' : 'is-empty'}`}>
                <FiUsers size={12} />
                {targetCount} utilisateur{targetCount !== 1 ? 's' : ''} ciblé{targetCount !== 1 ? 's' : ''}
              </div>
            </div>

            {/* ─ Objet ─ */}
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

            {/* ─ Message ─ */}
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

            <button type="submit" className="btn-create-premium btn-broadcast-submit" disabled={sending || targetCount === 0}>
              {sending ? 'Diffusion en cours...' : <><FiSend /> Diffuser maintenant</>}
            </button>
          </form>
        </div>

        {/* ── Historique & Modèles ── */}
        <div className="broadcast-history-card">
          <div className="card-header">
            <h3><FiClock /> Diffusions Récentes</h3>
          </div>
          <div className="history-list">
            {recentNotifs.map(n => (
              <div key={n.id_notif || n.id} className="history-item">
                <div className="history-icon"><FiRadio /></div>
                <div className="history-card">
                  <div className="history-info">
                    <strong>{n.objet}</strong>
                    <span>
                  Dest: {n.utilisateur ? `${n.utilisateur.prenom_user || ''} ${n.utilisateur.nom_user || ''}` : 'Utilisateur inconnu'} • {new Date(n.date_envoi || n.date || n.date_action).toLocaleString()}
                </span>
                  </div>
                  <button className="del-btn" onClick={() => handleDeleteRecent(n.id_notif || n.id)}><FiTrash2 /></button>
                </div>
              </div>
            ))}
          </div>

          <div className="templates-section">
            <h4>Modèles de Message</h4>
            {[
              { objet: 'Mise à jour préventive',              msg: 'Une mise à jour préventive du système est planifiée. Merci de sauvegarder vos travaux en cours avant la fenêtre de maintenance.' },
              { objet: 'Interruption de service',             msg: "Une interruption de service est actuellement en cours. Nos équipes techniques travaillent activement à la résolution. Nous vous tiendrons informés de l'évolution." },
              { objet: 'Service restauré',                    msg: 'Le service a été restauré avec succès. Vous pouvez reprendre votre activité normalement. Nous vous remercions de votre patience.' },
              { objet: "Changement d'urgence en cours",       msg: "Un changement d'urgence est en cours d'implémentation. Certains services peuvent être temporairement indisponibles. Durée estimée : 30 minutes." },
              { objet: 'Maintenance planifiée – ce soir',     msg: 'Rappel : une maintenance est planifiée ce soir de 20h00 à 23h00. Les systèmes seront indisponibles durant cette période. Merci de finaliser vos travaux en cours avant 19h45.' },
              { objet: 'Nouvelle RFC soumise – action requise', msg: "Une nouvelle demande de changement (RFC) a été soumise et nécessite votre validation dans les meilleurs délais. Connectez-vous à l'espace ITIL pour procéder à l'évaluation." },
            ].map((t, i) => (
              <button
                key={i}
                type="button"
                className="template-btn"
                onClick={() => { setObjet(t.objet); setMessage(t.msg); }}
              >
                {t.objet}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BroadcastCenter;
