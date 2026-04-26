import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiUsers, FiLayers, FiCalendar, FiSearch, FiRefreshCw, FiPlus, 
  FiCheckCircle, FiClock, FiTrash2, FiEdit3, FiInfo, FiX, FiHash
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import { useAuth } from '../../context/AuthContext';
import './AdminCabManagement.css';


// ── Helpers ──────────────────────────────────────────────────
const getCabTypeClass = (type) => {
  switch(type) {
    case 'NORMAL': return 'type-blue';
    case 'URGENT': return 'type-red';
    case 'STANDARD': return 'type-green';
    default: return 'type-default';
  }
};

const KpiCard = ({ label, value, icon, color }) => (
  <div className={`kpi-card kpi-${color}`}>
    <div className="kpi-icon">{icon}</div>
    <div className="kpi-body">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  </div>
);

const AdminCabManagement = () => {
  const { user: currentUser } = useAuth();
  const [cabs, setCabs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editCab, setEditCab] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [detailCab, setDetailCab] = useState(null);
  const [showDetail, setShowDetail] = useState(false);

  const [createForm, setCreateForm] = useState({ 
    nom_cab: '', 
    type_cab: 'NORMAL',
    id_president: '',
    member_ids: []
  });
  const [editForm, setEditForm] = useState({ 
    nom_cab: '', 
    type_cab: 'NORMAL',
    id_president: '',
    member_ids: []
  });


  const [createLoading, setCreateLoading] = useState(false);


  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cabRes, userRes] = await Promise.all([
        api.get('/cab'),
        api.get('/users')
      ]);
      
      const cabData = cabRes.data?.cabs || cabRes.cabs || cabRes.data || [];
      const userData = userRes.data?.data || userRes.data || [];
      
      setCabs(cabData);
      setUsers(userData);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.nom_cab) return alert('Nom du CAB requis.');
    setCreateLoading(true);
    try {
      await api.post('/cab', createForm);
      setShowCreate(false);
      setCreateForm({ 
        nom_cab: '', 
        type_cab: 'NORMAL',
        id_president: '',
        member_ids: []
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setCreateLoading(false);
    }
  };


  const handleEditClick = (cab) => {
    setEditCab(cab);
    setEditForm({
      nom_cab: cab.nom_cab || '',
      type_cab: cab.type_cab || 'NORMAL',
      id_president: cab.id_president || '',
      member_ids: cab.membres?.map(m => m.id_user) || []
    });
    setShowEdit(true);
    setShowDetail(false); // Close detail if editing
  };

  const handleDetailClick = (cab) => {
    console.log('Opening detail for CAB:', cab);
    setDetailCab(cab);
    setShowDetail(true);
  };


  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      await api.put(`/cab/${editCab.id_cab}`, editForm);
      setShowEdit(false);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Erreur lors de la modification');
    } finally {
      setCreateLoading(false);
    }
  };

  const toggleMember = (id, isEdit = false) => {
    const form = isEdit ? editForm : createForm;
    const setForm = isEdit ? setEditForm : setCreateForm;
    
    const exists = form.member_ids.includes(id);
    const newIds = exists 
      ? form.member_ids.filter(m => m !== id)
      : [...form.member_ids, id];
    
    setForm({ ...form, member_ids: newIds });
  };



  const filtered = cabs.filter(c => {
    const q = search.toLowerCase();
    return !search || 
      c.code_metier?.toLowerCase().includes(q) || 
      c.type_cab?.toLowerCase().includes(q) ||
      (c.nom_cab && c.nom_cab.toLowerCase().includes(q));
  });

  return (
    <div className="cab-admin-page">
      {/* HEADER */}
      <div className="cab-admin-header">
        <div>
          <h1><FiLayers /> Gestion des CAB</h1>
          <p>Administration et supervision des comités consultatifs de changement.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setShowCreate(true)} className="btn-primary-cab">
            <FiPlus /> Nouveau CAB
          </button>
          <div className="header-date-badge-cab">
            <FiCalendar /> {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="kpi-row-cab">
        <KpiCard label="Total CAB" value={cabs.length} icon={<FiLayers />} color="blue" />
        <KpiCard label="Normal" value={cabs.filter(c => c.type_cab === 'NORMAL').length} icon={<FiCheckCircle />} color="orange" />
        <KpiCard label="Urgent" value={cabs.filter(c => c.type_cab === 'URGENT').length} icon={<FiClock />} color="danger" />
        <KpiCard label="Membres" value={cabs.reduce((acc, c) => acc + (c._count?.membres || 0), 0)} icon={<FiUsers />} color="green" />
      </div>

      {/* TOOLBAR */}
      <div className="cab-admin-toolbar">
        <div className="search-wrapper-cab">
          <FiSearch className="search-ico-cab" />
          <input type="text" placeholder="Rechercher un CAB..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="refresh-btn-cab" onClick={fetchData}><FiRefreshCw /></button>

      </div>

      {/* TABLE */}
      <Card className="table-card-cab">
        <div className="table-container-cab">
          <table>
            <thead>
              <tr>
                <th>CAB & Code</th>
                <th>Type</th>
                <th>Membres</th>
                <th>Date Création</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="loading-cell-cab">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="empty-cell-cab">Aucun CAB trouvé.</td></tr>
              ) : filtered.map((cab, index) => (
                <tr 
                  key={cab.id_cab} 
                  className="hover-row-cab" 
                  onClick={() => handleDetailClick(cab)}
                  style={{ cursor: 'pointer' }}
                >
                  <td>
                    <div className="cab-name-cell">{cab.nom_cab || 'Comité de Changement'}</div>
                    <div className="cab-code-cell">#{cab.code_metier}</div>
                  </td>
                  <td>
                    <span className={`type-badge ${getCabTypeClass(cab.type_cab)}`}>
                      {cab.type_cab}
                    </span>
                  </td>
                  <td>
                    <div className="members-count">
                      <FiUsers /> {cab._count?.membres || 0} membres
                    </div>
                  </td>
                  <td className="date-cell">
                    {new Date(cab.date_creation).toLocaleDateString()}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button 
                      className="action-btn-cab info" 
                      title="Détails" 
                      onClick={(e) => { e.stopPropagation(); handleDetailClick(cab); }}
                    >
                      <FiInfo size={16} />
                    </button>
                    <button 
                      className="action-btn-cab edit" 
                      title="Modifier" 
                      onClick={(e) => { e.stopPropagation(); handleEditClick(cab); }}
                    >
                      <FiEdit3 size={16} />
                    </button>
                    <button 
                      className="action-btn-cab delete" 
                      title="Supprimer"
                      onClick={(e) => { e.stopPropagation(); console.log('Delete click'); }}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </td>



                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="modal-backdrop-cab" onClick={() => setShowCreate(false)}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>

            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper"><FiPlus /></div>
              <div className="rfc-style-header-text">
                <h2>Créer un nouveau CAB</h2>
                <div className="rfc-style-subtitle">Définition d'un nouveau comité consultatif de changement</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowCreate(false)}><FiX size={24} /></button>
            </div>

            <form onSubmit={handleCreateSubmit}>
              <div className="modal-body-rfc-style">
                <div className="rfc-style-grid">
                  <div className="form-group-cab">
                    <label>Nom du CAB</label>
                    <div className="input-with-icon-cab">
                      <FiLayers className="input-icon-cab" />
                      <input 
                        type="text" 
                        placeholder="Ex: CAB Infrastructure" 
                        value={createForm.nom_cab}
                        onChange={e => setCreateForm({...createForm, nom_cab: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-group-cab">
                    <label>Type de CAB</label>
                    <div className="input-with-icon-cab">
                      <FiHash className="input-icon-cab" />
                      <select 
                        value={createForm.type_cab}
                        onChange={e => setCreateForm({...createForm, type_cab: e.target.value})}
                      >
                        <option value="NORMAL">Normal</option>
                        <option value="URGENT">Urgent (ECAB)</option>
                        <option value="STANDARD">Standard</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group-cab" style={{ marginTop: '1.5rem' }}>
                  <label>Président du CAB</label>
                  <select 
                    value={createForm.id_president}
                    onChange={e => setCreateForm({...createForm, id_president: e.target.value})}
                    className="modal-select-cab"
                  >
                    <option value="">Sélectionner un président...</option>
                    {users.filter(u => u.roles?.includes('CHANGE_MANAGER')).map(u => (
                      <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-cab" style={{ marginTop: '1.5rem' }}>
                  <label>Membres du Comité (Profil CAB)</label>
                  <div className="members-checkbox-list-cab">
                    {users.filter(u => u.roles?.includes('MEMBRE_CAB')).map(u => (
                      <label key={u.id_user} className="member-checkbox-item-cab">
                        <input 
                          type="checkbox" 
                          checked={createForm.member_ids.includes(u.id_user)}
                          onChange={() => toggleMember(u.id_user, false)}
                        />
                        <div className="member-cb-info">
                          <span className="member-cb-name">{u.prenom_user} {u.nom_user}</span>
                          <span className="member-cb-email">{u.email_user}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={createLoading}>
                  {createLoading ? 'Création...' : 'Créer le CAB'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* DETAIL MODAL */}
      {showDetail && detailCab && (
        <div className="modal-backdrop-cab" onClick={() => setShowDetail(false)}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>

            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper"><FiInfo /></div>
              <div className="rfc-style-header-text">
                <h2>Détails du CAB</h2>
                <div className="rfc-style-subtitle">#{detailCab.code_metier} — {detailCab.nom_cab}</div>
              </div>
              <div className="rfc-style-actions">
                <button className="rfc-action-btn edit" onClick={() => handleEditClick(detailCab)}>
                  <FiEdit3 /> Modifier
                </button>
                <button className="rfc-action-btn delete" onClick={() => { if(window.confirm('Supprimer ce CAB ?')) console.log('Delete'); }}>
                  <FiTrash2 /> Supprimer
                </button>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowDetail(false)} style={{ marginLeft: '1rem' }}><FiX size={24} /></button>
            </div>

            <div className="modal-body-rfc-style">
              <div className="rfc-style-grid">
                <div className="detail-item-rfc-style">
                  <label>Type de Comité</label>
                  <div className={`type-badge-rfc ${getCabTypeClass(detailCab.type_cab)}`}>{detailCab.type_cab}</div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Date de Création</label>
                  <div className="value-rfc-style">{new Date(detailCab.date_creation).toLocaleDateString()}</div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Président du Comité</label>
                  <div className="value-rfc-style">
                    {detailCab.president ? `${detailCab.president.prenom_user} ${detailCab.president.nom_user}` : 'Non assigné'}
                  </div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Total Membres</label>
                  <div className="value-rfc-style">{detailCab.membres?.length || 0} Membres actifs</div>
                </div>
              </div>

              <div className="rfc-style-section">
                <h3 className="rfc-section-title"><FiUsers /> Composition du Comité</h3>
                <div className="rfc-members-grid">
                  {detailCab.membres?.length > 0 ? detailCab.membres.map(m => (
                    <div key={m.id_user} className="rfc-member-card">
                      <div className="rfc-avatar">{m.prenom_user[0]}{m.nom_user[0]}</div>
                      <div className="rfc-member-info">
                        <span className="rfc-m-name">{m.prenom_user} {m.nom_user}</span>
                        <span className="rfc-m-role">Membre du Comité</span>
                      </div>
                    </div>
                  )) : <div className="rfc-empty">Aucun membre assigné à ce comité.</div>}
                </div>
              </div>
            </div>

            <div className="modal-footer-rfc-style">
              <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowDetail(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}


      {/* EDIT MODAL */}
      {showEdit && (
        <div className="modal-backdrop-cab" onClick={() => setShowEdit(false)}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>

            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper edit"><FiEdit3 /></div>
              <div className="rfc-style-header-text">
                <h2>Modifier le CAB</h2>
                <div className="rfc-style-subtitle">Mise à jour des paramètres du comité</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowEdit(false)}><FiX size={24} /></button>
            </div>

            <form onSubmit={handleEditSubmit}>
              <div className="modal-body-rfc-style">
                <div className="rfc-style-grid">
                  <div className="form-group-cab">
                    <label>Nom du CAB</label>
                    <div className="input-with-icon-cab">
                      <FiLayers className="input-icon-cab" />
                      <input 
                        type="text" 
                        value={editForm.nom_cab}
                        onChange={e => setEditForm({...editForm, nom_cab: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="form-group-cab">
                    <label>Type de CAB</label>
                    <select 
                      value={editForm.type_cab}
                      onChange={e => setEditForm({...editForm, type_cab: e.target.value})}
                      className="modal-select-cab"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent (ECAB)</option>
                      <option value="STANDARD">Standard</option>
                    </select>
                  </div>
                </div>

                <div className="form-group-cab" style={{ marginTop: '1.5rem' }}>
                  <label>Président du CAB</label>
                  <select 
                    value={editForm.id_president}
                    onChange={e => setEditForm({...editForm, id_president: e.target.value})}
                    className="modal-select-cab"
                  >
                    <option value="">Sélectionner un président...</option>
                    {users.filter(u => u.roles?.includes('CHANGE_MANAGER')).map(u => (
                      <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group-cab" style={{ marginTop: '1.5rem' }}>
                  <label>Membres du CAB</label>
                  <div className="members-checkbox-list-cab">
                    {users.filter(u => u.roles?.includes('MEMBRE_CAB')).map(u => (
                      <label key={u.id_user} className="member-checkbox-item-cab">
                        <input 
                          type="checkbox" 
                          checked={editForm.member_ids.includes(u.id_user)}
                          onChange={() => toggleMember(u.id_user, true)}
                        />
                        <div className="member-cb-info">
                          <span className="member-cb-name">{u.prenom_user} {u.nom_user}</span>
                          <span className="member-cb-email">{u.email_user}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowEdit(false)}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={createLoading}>
                  {createLoading ? 'Enregistrement...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}




    </div>
  );
};

export default AdminCabManagement;
