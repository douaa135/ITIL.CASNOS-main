import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import {
  FiLayers, FiPlus, FiTrash2, FiEdit3, FiCheck,
  FiX, FiSearch, FiAlertTriangle, FiCheckCircle, FiLoader,
  FiBriefcase, FiMapPin, FiUsers, FiRefreshCw, FiUserPlus, FiUserMinus, FiCalendar, FiInfo
} from 'react-icons/fi';
import Avatar from '../../components/common/Avatar';
import './DirectionManagement.css';
import './AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';

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
      <div className="modal-box-cab glass-card-cab dir-modal-small" style={{ border: '1px solid #003366', background: '#f0f9ff' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiBriefcase /></div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>{direction ? 'Modifier la Direction' : 'Nouvelle Direction'}</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Configuration des entités organisationnelles</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
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

// ── Modal de Détail (Nouveau) ──────────────────────────────────
const DirectionDetailModal = ({ direction, users, onClose, onEdit, onDelete }) => {
  const directionUsers = users.filter(u => (u.direction?.id_direction || u.id_direction) === direction.id_direction);
  
  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '600px', width: '100%', border: '1px solid #003366', background: '#f0f9ff' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiInfo /></div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>Détails de la Direction</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{direction.nom_direction}</div>
          </div>
          <div className="rfc-style-actions">
            <button className="rfc-action-btn edit" onClick={() => onEdit(direction)} style={{ border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.1)', color: 'white' }}><FiEdit3 /> Modifier</button>
            <button className="rfc-action-btn delete" onClick={() => onDelete(direction)} style={{ border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.1)', color: '#fecaca' }}><FiTrash2 /> Supprimer</button>
          </div>
          <button className="close-btn-rfc-style close-btn-offset" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          <div className="rfc-style-grid">
            <div className="detail-item-rfc-style">
              <label>Nom de la Direction</label>
              <div className="detail-value-box">{direction.nom_direction}</div>
            </div>
            <div className="detail-item-rfc-style">
              <label>Total Membres</label>
              <div className="detail-value-box"><FiUsers className="detail-icon-muted" />{directionUsers.length} Collaborateurs</div>
            </div>
            <div className="detail-item-rfc-style">
              <label>Statut</label>
              <div className="detail-value-box">
                <span style={{ padding: '0.25rem 0.75rem', borderRadius: '20px', background: '#dcfce7', color: '#166534', fontSize: '0.8rem', fontWeight: 700 }}>Actif</span>
              </div>
            </div>
          </div>

          <div className="rfc-style-section">
            <h3 className="rfc-section-title"><FiUsers /> Liste des Membres</h3>
            <div className="rfc-members-grid">
              {directionUsers.length > 0 ? directionUsers.map(u => (
                <div key={u.id_user} className="rfc-member-card">
                  <Avatar prenom={u.prenom_user} nom={u.nom_user} size={36} radius="10px" />
                  <div className="rfc-member-info">
                    <span className="rfc-m-name">{u.prenom_user} {u.nom_user}</span>
                    <span className="rfc-m-role">{u.email_user}</span>
                  </div>
                </div>
              )) : <div className="rfc-empty">Aucun utilisateur rattaché à cette direction.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const MembersModal = ({ direction, users, onClose, onAddUser, onRemoveUser }) => {
  const directionUsers = users.filter(u => (u.direction?.id_direction || u.id_direction) === direction.id_direction);
  const otherUsers = users.filter(u => (u.direction?.id_direction || u.id_direction) !== direction.id_direction);

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab dir-modal-members" style={{ border: '1px solid #003366', background: '#f0f9ff' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiUsers /></div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>Membres : {direction.nom_direction}</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{directionUsers.length} collaborateur{directionUsers.length > 1 ? 's' : ''} rattaché(s)</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
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
                <div key={user.id_user} className="rfc-member-card">
                  <Avatar prenom={user.prenom_user} nom={user.nom_user} size={42} radius="12px" />
                  <div className="rfc-member-info" style={{ flex: 1 }}>
                    <span className="rfc-m-name">{user.prenom_user} {user.nom_user}</span>
                    <span className="rfc-m-role" style={{ fontSize: '0.75rem', color: '#64748b' }}>{user.email_user}</span>
                  </div>
                  <div className={`ref-badge dir-user-status ${user.actif ? 'active' : 'inactive'}`} style={{ marginRight: '1rem' }}>
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

      </div>
    </div>
  );
};


// ── Composant principal ───────────────────────────────────────
const DirectionManagement = () => {
  const { user } = useAuth();
  const isAdmin = user?.roles?.includes('ADMIN');

  const location = useLocation();
  const [directions, setDirections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDirection, setEditingDirection] = useState(null);
  const [detailDirection, setDetailDirection] = useState(null);
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
      // ✅ Directions fetch with improved pathing
      const directionsRes = await api.get('/directions');
      const dirs = directionsRes?.data?.directions || directionsRes?.directions || (Array.isArray(directionsRes?.data) ? directionsRes.data : []);
      
      // ✅ Users fetch with fallback to empty list
      const usersRes = await api.get('/users?limit=1000').catch(() => ({ data: { users: [] } }));
      const rawUsers = usersRes?.data?.users || usersRes?.data?.data || usersRes?.data || [];

      const directionsData = Array.isArray(dirs) ? dirs.map(dir => ({
        ...dir,
        nb_utilisateurs: Array.isArray(rawUsers) ? rawUsers.filter(
          u => (u.direction?.id_direction || u.id_direction) === dir.id_direction
        ).length : 0
      })) : [];

      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      setTotalUsers(Array.isArray(rawUsers) ? rawUsers.length : 0);
      setDirections(directionsData);
    } catch (error) {
      console.error('Error fetching directions:', error);
      const msg = error?.error?.message || error?.message || 'Erreur lors du chargement';
      showToast(msg, 'error');
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
        // Robust extraction of the new direction — body is { success, message, data: { direction } }
        const newDir = res?.data?.direction || res?.direction?.data || res?.data || res;
        
        showToast('Direction créée avec succès', 'success');
        // On attend que les données soient bien rafraîchies
        await fetchDirections();
      }

      setShowModal(false);
      setEditingDirection(null);
    } catch (error) {
      console.error('[DIR_SAVE_ERROR]', error);
      const errMsg = error?.error?.message || error?.message || 'Erreur lors de la sauvegarde (Vérifiez si le nom existe déjà)';
      showToast(errMsg, 'error');
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

      <PremiumToolbar 
        searchProps={{
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Rechercher par nom..."
        }}
        filters={[
          {
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Toutes les directions",
            options: directions.map(d => ({ value: d.nom_direction, label: d.nom_direction }))
          }
        ]}
        onReset={() => setSearch('')}
        showReset={!!search}
      />

      <div style={{
        background: '#ffffff', borderRadius: '16px',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>Nom de la Direction</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>Membres</th>
                <th className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>Actions</th>
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
                <tr key={direction.id_direction} onClick={() => setDetailDirection(direction)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  <td className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.95rem' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', marginRight: '10px' }}></span>
                      {direction.nom_direction}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'center', verticalAlign: 'middle' }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleShowMembers(direction); }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
                        background: '#eff6ff', border: '1px solid #bfdbfe',
                        fontSize: '0.85rem', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap',
                      }}
                    >
                      <FiUsers size={13} />
                      {direction.nb_utilisateurs} membres
                    </button>
                  </td>
                  <td className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditDirection(direction); }} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }} title="Modifier">
                        <FiEdit3 size={15} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDeleteDirection(direction); }} style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }} title="Supprimer">
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
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

      {detailDirection && (
        <DirectionDetailModal
          direction={detailDirection}
          users={users}
          onClose={() => setDetailDirection(null)}
          onEdit={(d) => {
            setDetailDirection(null);
            handleEditDirection(d);
          }}
          onDelete={(d) => {
            setDetailDirection(null);
            handleDeleteDirection(d);
          }}
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