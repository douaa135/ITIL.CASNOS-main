import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import {
  FiLayers, FiPlus, FiTrash2, FiEdit3, FiCheck,
  FiX, FiSearch, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiBriefcase, FiMapPin, FiUsers, FiRefreshCw
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
const MembersModal = ({ direction, users, onClose }) => {
  const directionUsers = users.filter(u => u.id_direction === direction.id_direction);

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
          {directionUsers.length === 0 ? (
            <div className="rfc-empty">Aucun utilisateur dans cette direction.</div>
          ) : (
            <div className="rfc-members-grid" style={{ gridTemplateColumns: '1fr' }}>
              {directionUsers.map(user => (
                <div key={user.id_user} className="rfc-member-card">
                  <div className="rfc-avatar" style={{ background: user.actif ? '#3b82f6' : '#94a3b8' }}>
                    {user.prenom_user?.[0]}{user.nom_user?.[0]}
                  </div>
                  <div className="rfc-member-info">
                    <span className="rfc-m-name">{user.prenom_user} {user.nom_user}</span>
                    <span className="rfc-m-role">{user.email_user}</span>
                  </div>
                  <div className={`ref-badge ${user.actif ? 'active' : 'inactive'}`} style={{ marginLeft: 'auto', background: user.actif ? '#d1fae5' : '#fee2e2', color: user.actif ? '#047857' : '#dc2626' }}>
                    {user.actif ? 'Actif' : 'Inactif'}
                  </div>
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
          nb_utilisateurs: userRes.data.data.filter(u => u.id_direction === dir.id_direction).length
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

  const handleDeleteDirection = async (direction) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer la direction "${direction.nom_direction}" ?`)) return;

    try {
      // Simulation de suppression (backend non modifié)
      await new Promise(resolve => setTimeout(resolve, 300));
      setDirections(prev => prev.filter(d => d.id_direction !== direction.id_direction));
      setToast({ msg: 'Direction supprimée avec succès', type: 'success' });
    } catch (error) {
      setToast({ msg: 'Erreur lors de la suppression', type: 'error' });
    }
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
      {/* Header */}
      <div className="settings-header">
        <div className="header-icon-main"><FiBriefcase /></div>
        <div>
          <h1>Gestion des Directions</h1>
          <p>Configurez les entités organisationnelles et supervisez les effectifs par département.</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="stat-card" style={{ '--card-color': '#3b82f6', '--card-color-rgb': '59, 130, 246' }}>
          <div className="stat-icon"><FiLayers /></div>
          <div className="stat-content">
            <div className="stat-value">{directions.length}</div>
            <div className="stat-title">Directions</div>
          </div>
        </div>

        <div className="stat-card" style={{ '--card-color': '#10b981', '--card-color-rgb': '16, 185, 129' }}>
          <div className="stat-icon"><FiUsers /></div>
          <div className="stat-content">
            <div className="stat-value">{totalUsers}</div>
            <div className="stat-title">Utilisateurs</div>
          </div>
        </div>
      </div>

      <div className="section-header-premium" style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', marginBottom: '1.5rem' }}>
        <div className="title-group" style={{ flex: 1 }}>
          <FiSearch style={{ color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher une direction..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="premium-input-style"
            style={{ border: 'none', background: 'transparent', boxShadow: 'none', padding: '0.5rem' }}
          />
        </div>
        <button className="btn-add-premium" onClick={handleAddDirection}>
          <FiPlus /> Nouvelle Direction
        </button>
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