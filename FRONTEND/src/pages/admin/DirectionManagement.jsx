import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import {
  FiLayers, FiPlus, FiTrash2, FiEdit3, FiCheck,
  FiX, FiSearch, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiBriefcase, FiMapPin, FiUsers, FiRefreshCw, FiUserPlus, FiUserMinus, FiCalendar
} from 'react-icons/fi';
import './DirectionManagement.css';

// ── Toast component removed (using shared one) ─────────────

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
      <div className="modal-box-cab glass-card-cab dir-modal-small" onClick={e => e.stopPropagation()}>
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
      <div className="modal-box-cab glass-card-cab dir-modal-members" onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper"><FiUsers /></div>
          <div className="rfc-style-header-text">
            <h2>Membres : {direction.nom_direction}</h2>
            <div className="rfc-style-subtitle">{directionUsers.length} collaborateur{directionUsers.length > 1 ? 's' : ''} rattaché(s)</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style dir-modal-body-scroll">
          {/* Section Ajout */}
          <div className="dir-panel-add">
            <label className="dir-panel-label">
              Ajouter un collaborateur à cette direction
            </label>
            <div className="dir-panel-row">
              <div className="dir-panel-icon">
                <FiUserPlus size={18} />
              </div>
              <select 
                className="premium-input-style dir-panel-select"
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
            <div className="rfc-members-grid dir-members-grid-single">
              {directionUsers.map(user => (
                <div key={user.id_user} className="rfc-member-card dir-member-card">
                  <div className={`rfc-avatar dir-member-avatar ${user.actif ? 'active' : 'inactive'}`}>
                    {user.prenom_user?.[0]}{user.nom_user?.[0]}
                  </div>
                  <div className="rfc-member-info dir-member-info-grow">
                    <span className="rfc-m-name">{user.prenom_user} {user.nom_user}</span>
                    <span className="rfc-m-role dir-member-email">{user.email_user}</span>
                  </div>
                  <div className={`ref-badge dir-user-status ${user.actif ? 'active' : 'inactive'}`}>
                    {user.actif ? 'Actif' : 'Inactif'}
                  </div>
                  <button 
                    onClick={() => onRemoveUser(user)}
                    className="dir-member-remove-btn"
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
  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
  };
  const [totalUsers, setTotalUsers] = useState(0);
  const [users, setUsers] = useState([]);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [selectedDirection, setSelectedDirection] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchDirections = useCallback(async () => {
    setLoading(true);
    try {
      const [dirRes, userRes] = await Promise.all([
        api.get('/directions'),
        api.get('/users')
      ]);

      const rawDirs = dirRes?.data?.directions || dirRes?.directions || (Array.isArray(dirRes?.data) ? dirRes.data : []) || (Array.isArray(dirRes) ? dirRes : []);
      const rawUsers = userRes?.data?.users || userRes?.users || userRes?.data?.data || userRes?.data || [];

      const directionsData = rawDirs.map(dir => ({
        ...dir,
        nb_utilisateurs: rawUsers.filter(
          u => (u.direction?.id_direction || u.id_direction) === dir.id_direction
        ).length
      }));

      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      setTotalUsers(rawUsers.length);
      setDirections(directionsData);
    } catch (error) {
      console.error('Error fetching directions:', error);
      showToast('Erreur lors du chargement des directions', 'error');
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
    setConfirmDel({
      title: 'Supprimer la direction',
      message: `Êtes-vous sûr de vouloir supprimer la direction "${direction.nom_direction}" ? Cette action est irréversible.`,
      direction
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const { direction } = confirmDel;
    setSaving(true);
    try {
      await api.delete(`/directions/${direction.id_direction}`);
      setDirections(prev => prev.filter(d => d.id_direction !== direction.id_direction));
      showToast('Direction supprimée avec succès', 'error');
    } catch (error) {
      console.error('Delete error:', error);
      showToast('Impossible de supprimer cette direction (elle peut être liée à des utilisateurs).', 'error');
    } finally {
      setSaving(false);
      setConfirmDel(null);
    }
  };

  const handleSaveDirection = async (formData) => {
    setSaving(true);
    try {
      if (editingDirection) {
        await api.put(`/directions/${editingDirection.id_direction}`, formData);
        setDirections(prev => prev.map(d =>
          d.id_direction === editingDirection.id_direction
            ? { ...d, ...formData }
            : d
        ));
        showToast('Direction modifiée avec succès', 'success');
      } else {
        const res = await api.post('/directions', formData);
        const newDir = res.data || res;
        setDirections(prev => [...prev, newDir]);
        showToast('Direction créée avec succès', 'success');
        fetchDirections();
      }

      setShowModal(false);
      setEditingDirection(null);
    } catch (error) {
      console.error('Save error:', error);
      showToast(error.message || 'Erreur lors de la sauvegarde', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddUserToDirection = async (userId) => {
    if (!userId || !selectedDirection) return;
    try {
      await api.put(`/users/${userId}`, { id_direction: selectedDirection.id_direction });
      showToast('Collaborateur rattaché avec succès', 'success');
      fetchDirections();
    } catch (error) {
      showToast('Erreur lors du rattachement', 'error');
    }
  };

  const handleRemoveUserFromDirection = async (user) => {
    if (!window.confirm(`Retirer ${user.prenom_user} de la direction "${selectedDirection.nom_direction}" ?`)) return;
    try {
      await api.put(`/users/${user.id_user}`, { id_direction: null });
      showToast('Collaborateur retiré avec succès', 'success');
      fetchDirections();
    } catch (error) {
      showToast('Erreur lors du retrait', 'error');
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
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiBriefcase /></div>
          <div className="premium-header-text">
            <h1>Gestion des Directions</h1>
            <p>Configurez les entités organisationnelles et supervisez les effectifs par département</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button onClick={handleAddDirection} className="btn-create-premium">
            <FiPlus /> Nouvelle Direction
          </button>
        </div>
      </div>

      <div className="stats-grid dir-kpi-spacing">
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

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          <input
            type="text"
            placeholder="Rechercher par nom (Filtre général)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
              borderRadius: '10px', border: '1.5px solid #e2e8f0',
              fontSize: '0.9rem', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <div className="toolbar-filters">
          <select 
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
          }}
          >
            <option value="">Toutes les directions</option>
            {directions.map(d => <option key={d.id_direction} value={d.nom_direction}>{d.nom_direction}</option>)}
          </select>
          </div>

          {(search) && (
          <button 
            onClick={() => { setSearch(''); }}
            style={{
              padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
              fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', 
              cursor: 'pointer', fontWeight: '600'
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      <div className="premium-table-card table-scroll-container">
        <table className="premium-settings-table" style={{ minWidth: '800px' }}>
          <thead>
            <tr>
              <th>Nom de la Direction</th>
              <th className="text-center">Membres</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={3} className="loading-state dir-cell-padded">
                  <FiRefreshCw className="spin" />
                  <p>Chargement des directions...</p>
                </td>
              </tr>
            ) : filteredDirections.length === 0 ? (
              <tr>
                <td colSpan={3} className="empty-state dir-cell-padded">
                  <FiBriefcase size={40} />
                  <p>Aucune direction trouvée.</p>
                </td>
              </tr>
            ) : (
              filteredDirections.map((direction) => (
                <tr key={direction.id_direction}>
                  <td className="env-name-cell">
                    <div className="env-dot dir-env-dot"></div>
                    {direction.nom_direction}
                  </td>
                  <td className="text-center">
                    <button 
                      className="ref-badge dir-members-btn"
                      onClick={() => handleShowMembers(direction)}
                    >
                      <FiUsers size={12} className="dir-members-btn-icon" />
                      {direction.nb_utilisateurs} membres
                    </button>
                  </td>
                  <td>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditDirection(direction); }} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Modifier">
                        <FiEdit3 size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteDirection(direction); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Supprimer">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <DirectionModal
          direction={editingDirection}
          onClose={closeModal}
          onSave={handleSaveDirection}
          loading={saving}
        />
      )}

      {showMembersModal && selectedDirection && (
        <MembersModal
          direction={selectedDirection}
          users={users}
          onClose={closeMembersModal}
          onAddUser={handleAddUserToDirection}
          onRemoveUser={handleRemoveUserFromDirection}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          title={confirmDel.title}
          message={confirmDel.message}
          danger={true}
          loading={saving}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default DirectionManagement;