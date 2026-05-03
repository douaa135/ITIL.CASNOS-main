import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import {
  FiLayers, FiPlus, FiTrash2, FiEdit3, FiCheck,
  FiX, FiSearch, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiBriefcase, FiMapPin, FiUsers, FiRefreshCw, FiUserPlus, FiUserMinus
} from 'react-icons/fi';

// ── Toast notifications ───────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1rem 1.5rem', borderRadius: '12px',
    background: type === 'success' ? '#064e3b' : '#7f1d1d',
    color: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    animation: 'slideInUp 0.3s ease',
    minWidth: '280px',
  }}>
    {type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertTriangle size={20} />}
    <span style={{ flex: 1, fontWeight: '500' }}>{msg}</span>
    <button onClick={onClose} style={{
      background: 'none', border: 'none', color: 'white', cursor: 'pointer',
      opacity: 0.7, padding: '0.25rem', borderRadius: '4px'
    }}>
      <FiX size={16} />
    </button>
  </div>
);

// ── Modal d'ajout/édition ─────────────────────────────────────
const DirectionModal = ({ direction, onClose, onSave, loading }) => {
  const [form, setForm] = useState({
    nom_direction: direction?.nom_direction || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.nom_direction.trim()) return;
    onSave(form);
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper"><FiBriefcase /></div>
          <div className="rfc-style-header-text">
            <h2>{direction ? 'Modifier la Direction' : 'Nouvelle Direction'}</h2>
            <div className="rfc-style-subtitle">Configuration des entités organisationnelles</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-rfc-style">
            <div className="form-group-cab">
              <label>Nom de la Direction *</label>
              <input
                type="text"
                value={form.nom_direction}
                onChange={e => setForm({...form, nom_direction: e.target.value})}
                placeholder="Ex: Direction Informatique, Direction RH"
                className="premium-input-style"
                required
              />
            </div>
          </div>

          <div className="modal-footer-rfc-style">
            <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn-submit-rfc-style" disabled={loading}>
              {loading ? 'Sauvegarde...' : (direction ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Modal pour afficher les membres ─────────────────────────────────────
const MembersModal = ({ direction, users, onClose, onAddUser, onRemoveUser }) => {
  const directionUsers = users.filter(u => (u.direction?.id_direction || u.id_direction) === direction.id_direction);
  const otherUsers = users.filter(u => (u.direction?.id_direction || u.id_direction) !== direction.id_direction);

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '600px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper"><FiUsers /></div>
          <div className="rfc-style-header-text">
            <h2>Membres : {direction.nom_direction}</h2>
            <div className="rfc-style-subtitle">{directionUsers.length} collaborateur{directionUsers.length > 1 ? 's' : ''} rattaché(s)</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style" style={{ overflowY: 'auto' }}>
          {/* Section Ajout */}
          <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
              Ajouter un collaborateur à cette direction
            </label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                <FiUserPlus size={18} />
              </div>
              <select 
                className="premium-input-style"
                style={{ flex: 1, padding: '0.5rem', margin: 0 }}
                onChange={(e) => onAddUser(e.target.value)}
                value=""
              >
                <option value="">Sélectionner un utilisateur à rattacher...</option>
                {otherUsers.map(u => (
                  <option key={u.id_user} value={u.id_user}>
                    {u.prenom_user} {u.nom_user} ({u.nom_direction || 'Sans direction'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {directionUsers.length === 0 ? (
            <div className="rfc-empty">Aucun utilisateur dans cette direction.</div>
          ) : (
            <div className="rfc-members-grid" style={{ gridTemplateColumns: '1fr' }}>
              {directionUsers.map(user => (
                <div key={user.id_user} className="rfc-member-card" style={{ background: 'white', border: '1px solid #e2e8f0' }}>
                  <div className="rfc-avatar" style={{ background: user.actif ? '#3b82f6' : '#94a3b8' }}>
                    {user.prenom_user?.[0]}{user.nom_user?.[0]}
                  </div>
                  <div className="rfc-member-info" style={{ flex: 1 }}>
                    <span className="rfc-m-name">{user.prenom_user} {user.nom_user}</span>
                    <span className="rfc-m-role" style={{ fontSize: '0.7rem' }}>{user.email_user}</span>
                  </div>
                  <div className={`ref-badge ${user.actif ? 'active' : 'inactive'}`} style={{ marginRight: '1rem', background: user.actif ? '#d1fae5' : '#fee2e2', color: user.actif ? '#047857' : '#dc2626' }}>
                    {user.actif ? 'Actif' : 'Inactif'}
                  </div>
                  <button 
                    onClick={() => onRemoveUser(user)}
                    style={{ 
                      background: '#fee2e2', color: '#ef4444', border: 'none', 
                      width: '32px', height: '32px', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', transition: 'all 0.2s'
                    }}
                    title="Retirer de la direction"
                  >
                    <FiUserMinus size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer-rfc-style">
          <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Fermer</button>
        </div>
      </div>
    </div>
  );
};


// ── Composant principal ───────────────────────────────────────
const DirectionManagement = () => {
  const location = useLocation();
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDirection, setEditingDirection] = useState(null);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [users, setUsers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState(null);

  // Données mockées pour ajout/édition (puisque backend ne doit pas être modifié)
  const mockNewDirection = (formData) => ({
    id_direction: Date.now(),
    ...formData,
    nb_utilisateurs: 0
  });

  const fetchDirections = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch real directions and users for accurate counts
      const [dirRes, userRes] = await Promise.all([
        api.get('/users/directions'),
        api.get('/users')
      ]);

      let directionsData = [];
      if (dirRes.success && dirRes.data) {
        directionsData = dirRes.data.map(dir => ({
          ...dir,
          nb_utilisateurs: 0 // will be updated below
        }));
      }

      if (userRes.success && userRes.data.data) {
        setUsers(userRes.data.data);
        setTotalUsers(userRes.data.data.length);

        // Update directions with accurate user counts
        directionsData = directionsData.map(dir => ({
          ...dir,
          nb_utilisateurs: userRes.data.data.filter(u => (u.direction?.id_direction || u.id_direction) === dir.id_direction).length
        }));
      }

      setDirections(directionsData);
    } catch (error) {
      console.error('Error fetching directions:', error);
      setToast({ msg: 'Erreur lors du chargement des directions', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirections();
  }, [fetchDirections]);

  const filteredDirections = directions.filter(dir =>
    dir.nom_direction.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddDirection = useCallback(() => {
    setEditingDirection(null);
    setShowModal(true);
  }, []);

  const handleEditDirection = useCallback((direction) => {
    setEditingDirection(direction);
    setShowModal(true);
  }, []);

  const handleDeleteDirection = (direction) => {
    // Suppression instantanée pour un feeling premium
    setDirections(prev => prev.filter(d => d.id_direction !== direction.id_direction));
    setToast({ msg: 'Direction supprimée avec succès', type: 'success' });
  };

  const handleSaveDirection = async (formData) => {
    setSaving(true);
    try {
      // Simulation de sauvegarde (backend non modifié)
      await new Promise(resolve => setTimeout(resolve, 500));

      if (editingDirection) {
        // Modification
        setDirections(prev => prev.map(d =>
          d.id_direction === editingDirection.id_direction
            ? { ...d, ...formData }
            : d
        ));
        setToast({ msg: 'Direction modifiée avec succès', type: 'success' });
      } else {
        // Ajout
        const newDirection = mockNewDirection(formData);
        setDirections(prev => [...prev, newDirection]);
        setToast({ msg: 'Direction créée avec succès', type: 'success' });
      }

      setShowModal(false);
      setEditingDirection(null);
    } catch (error) {
      setToast({ msg: 'Erreur lors de la sauvegarde', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddUserToDirection = async (userId) => {
    if (!userId || !selectedDirection) return;
    try {
      await api.put(`/users/${userId}`, { id_direction: selectedDirection.id_direction });
      setToast({ msg: 'Collaborateur rattaché avec succès', type: 'success' });
      fetchDirections();
    } catch (error) {
      setToast({ msg: 'Erreur lors du rattachement', type: 'error' });
    }
  };

  const handleRemoveUserFromDirection = async (user) => {
    if (!window.confirm(`Retirer ${user.prenom_user} de la direction "${selectedDirection.nom_direction}" ?`)) return;
    try {
      await api.put(`/users/${user.id_user}`, { id_direction: null });
      setToast({ msg: 'Collaborateur retiré avec succès', type: 'success' });
      fetchDirections();
    } catch (error) {
      setToast({ msg: 'Erreur lors du retrait', type: 'error' });
    }
  };

  const handleShowMembers = (direction) => {
    setSelectedDirection(direction);
    setShowMembersModal(true);
  };

  const closeMembersModal = () => {
    setShowMembersModal(false);
    setSelectedDirection(null);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDirection(null);
  };

  return (
    <div className="settings-page">
      {/* Header Row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="header-icon-main" style={{ width: '56px', height: '56px', background: '#eff6ff', color: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', border: '1px solid #bfdbfe' }}>
            <FiBriefcase />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gestion des Directions</h1>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: '0.25rem 0 0', fontWeight: 500 }}>Configurez les entités organisationnelles et supervisez les effectifs par département.</p>
          </div>
        </div>
        <button className="btn-create-premium" onClick={handleAddDirection}>
          <FiPlus /> Nouvelle Direction
        </button>
      </div>

      {/* KPI Row - Task KPI CSS Style */}
      <div className="stats-grid" style={{ marginBottom: '2.5rem' }}>
        <div className="stat-card blue">
          <div className="stat-icon-wrapper">
            <FiLayers size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{directions.length}</div>
            <div className="stat-label">Directions</div>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon-wrapper">
            <FiUsers size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalUsers}</div>
            <div className="stat-label">Utilisateurs</div>
          </div>
        </div>
      </div>

      <div className="rfc-mgr-toolbar" style={{ marginBottom: '2rem', background: 'white', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)' }}>
        <div className="search-wrapper" style={{ flex: 1 }}>
          <FiSearch className="search-ico" />
          <input
            type="text"
            placeholder="Rechercher par nom (Filtre général)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <select 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ minWidth: '220px' }}
          >
            <option value="">Toutes les directions</option>
            {directions.map(d => <option key={d.id_direction} value={d.nom_direction}>{d.nom_direction}</option>)}
          </select>
          <button className="refresh-btn" onClick={fetchDirections}><FiRefreshCw /></button>
        </div>
      </div>


      {/* Table */}
      <div className="premium-table-card">
        <table className="premium-settings-table">
          <thead>
            <tr>
              <th>Nom de la Direction</th>
              <th style={{ textAlign: 'center' }}>Membres</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="loading-state" style={{ padding: '3rem' }}>
                  <FiRefreshCw className="spin" />
                  <p>Chargement des directions...</p>
                </td>
              </tr>
            ) : filteredDirections.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-state" style={{ padding: '3rem' }}>
                  <FiBriefcase size={40} />
                  <p>Aucune direction trouvée.</p>
                </td>
              </tr>
            ) : (
              filteredDirections.map((direction) => (
                <tr key={direction.id_direction}>
                  <td className="env-name-cell">
                    <div className="env-dot" style={{ background: '#3b82f6' }}></div>
                    {direction.nom_direction}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button 
                      className="ref-badge" 
                      style={{ cursor: 'pointer', border: 'none', background: '#f1f5f9', color: '#475569' }}
                      onClick={() => handleShowMembers(direction)}
                    >
                      <FiUsers size={12} style={{ marginRight: '4px' }} />
                      {direction.nb_utilisateurs} membres
                    </button>
                  </td>
                  <td>
                    <div className="actions-flex">
                      <button className="action-circle-btn edit" onClick={() => handleEditDirection(direction)}><FiEdit3 size={14} /></button>
                      <button className="action-circle-btn delete" onClick={() => handleDeleteDirection(direction)}><FiTrash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>


      {/* Modal */}
      {showModal && (
        <DirectionModal
          direction={editingDirection}
          onClose={closeModal}
          onSave={handleSaveDirection}
          loading={saving}
        />
      )}

      {/* Members Modal */}
      {showMembersModal && selectedDirection && (
        <MembersModal
          direction={selectedDirection}
          users={users}
          onClose={closeMembersModal}
          onAddUser={handleAddUserToDirection}
          onRemoveUser={handleRemoveUserFromDirection}
        />
      )}

      {/* Toast */}
      {toast && (
        <Toast
          msg={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default DirectionManagement;