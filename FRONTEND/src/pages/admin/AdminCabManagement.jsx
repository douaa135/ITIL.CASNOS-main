import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiUsers, FiLayers, FiCalendar, FiSearch, FiPlus, 
  FiCheckCircle, FiClock, FiTrash2, FiEdit3, FiInfo, FiX, FiHash,
  FiUserPlus, FiUserMinus, FiAlertTriangle
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
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
  const [filterType, setFilterType] = useState('ALL');
  const [showCreate, setShowCreate] = useState(false);
  const [editCab, setEditCab] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [detailCab, setDetailCab] = useState(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showMembersList, setShowMembersList] = useState(false);
  const [selectedCabForMembers, setSelectedCabForMembers] = useState(null);

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

  const [inlineEdit, setInlineEdit] = useState({ id_cab: null, field: null, value: '' });


  const [createLoading, setCreateLoading] = useState(false);
  const [confirmDel, setConfirmDel] = useState(null);
  const [toast, setToast] = useState(null);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // axios interceptor returns response.data directly
      const [cabRes, userRes] = await Promise.all([
        api.get('/cab').catch(() => ({ cabs: [] })),
        api.get('/users').catch(() => ({ data: { data: [] } }))
      ]);

      // cabRes format: { success: true, data: { cabs: [...], total: 5 } }
      const cabData = cabRes?.data?.cabs || cabRes?.cabs || cabRes?.data || [];
      
      // userRes format: { success: true, data: { data: [...], total: ... } }
      const rawUsers = userRes?.data?.data || userRes?.data?.users || userRes?.data || userRes?.users || [];

      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
      setCabs(Array.isArray(cabData) ? cabData : []);
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
    if (!createForm.nom_cab) return setToast({ msg: 'Nom du CAB requis.', type: 'error' });
    if (!createForm.type_cab) return setToast({ msg: 'Type du CAB requis.', type: 'error' });
    setCreateLoading(true);
    try {
      // On prépare le payload
      const payload = {
        nom_cab: createForm.nom_cab.trim() || `CAB ${createForm.type_cab} ${new Date().toLocaleDateString()}`,
        type_cab: createForm.type_cab,
        member_ids: createForm.member_ids.filter(id => id && id.trim() !== '')
      };
      
      if (createForm.id_president) {
        payload.id_president = createForm.id_president;
      }

      const res = await api.post('/cab', payload);
      
      // Extraction sécurisée de l'ID
      const newCabId = res?.data?.cab?.id_cab || res?.cab?.id_cab || res?.id_cab;
      if (!newCabId) {
        console.error('Unexpected response structure:', res);
        throw new Error('Aucun identifiant de CAB renvoyé par le backend.');
      }

      await fetchData();
      setShowCreate(false);
      setCreateForm({ 
        nom_cab: '', 
        type_cab: 'NORMAL',
        id_president: '',
        member_ids: []
      });
      setToast({ msg: 'CAB créé avec succès.', type: 'success' });
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Erreur lors de la création du CAB.';
      setToast({ msg: msg, type: 'error' });
      console.error('CAB create error:', err);
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
      member_ids: cab.membres?.map(m => m.id_user || m.utilisateur?.id_user) || []
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
      // 1. Calculer les changements de membres
      const currentMemberIds = editCab.membres?.map(m => m.id_user || m.utilisateur?.id_user).filter(Boolean) || [];
      const currentPresidentId = editCab.membres?.find(m => m.role === 'PRESIDENT')?.utilisateur?.id_user;
      
      const membresOps = [];
      
      // Gestion du Président
      if (editForm.id_president && editForm.id_president !== currentPresidentId) {
        membresOps.push({ action: 'ADD', id_user: editForm.id_president, role: 'PRESIDENT' });
      }

      // Membres à ajouter
      editForm.member_ids.forEach(id => {
        if (!currentMemberIds.includes(id) && id !== editForm.id_president) {
          membresOps.push({ action: 'ADD', id_user: id, role: 'MEMBRE' });
        }
      });
      
      // Membres à retirer
      currentMemberIds.forEach(id => {
        if (!editForm.member_ids.includes(id) && id !== editForm.id_president) {
          membresOps.push({ action: 'REMOVE', id_user: id });
        }
      });

      // 2. Appel au backend
      await api.put(`/cab/${editCab.id_cab}`, {
        type_cab: editForm.type_cab,
        membres: membresOps
      });

      setToast({ msg: 'CAB mis à jour avec succès.', type: 'success' });
      setShowEdit(false);
      fetchData();
    } catch (err) {
      const msg = err?.error?.message || err.response?.data?.message || err?.message || 'Erreur lors de la mise à jour';
      setToast({ msg: msg, type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInlineSubmit = async (cab, field, value) => {
    try {
      await api.put(`/cab/${cab.id_cab}`, {
        [field]: value
      });
      setInlineEdit({ id_cab: null, field: null, value: '' });
      fetchData();
    } catch (err) {
      console.error('Inline edit error:', err);
    }
  };

  const handleDeleteCab = (cab) => {
    setConfirmDel({
      title: 'Supprimer le CAB',
      message: `Voulez-vous vraiment supprimer définitivement le CAB "${cab.nom_cab || cab.code_metier}" ? Toutes les réunions associées devront être supprimées au préalable.`,
      cab
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const { cab, onConfirm } = confirmDel;
    
    if (onConfirm) {
      await onConfirm();
      return;
    }

    // Default CAB deletion logic
    // Sauvegarde pour rollback en cas d'échec
    const originalCabs = [...cabs];
    
    // Mise à jour optimiste : on retire immédiatement du tableau
    setCabs(prev => prev.filter(c => c.id_cab !== cab.id_cab));
    setConfirmDel(null);
    setCreateLoading(true);

    try {
      await api.delete(`/cab/${cab.id_cab}`);
      setToast({ msg: 'CAB supprimé avec succès.', type: 'error' });
      // Fermer les modals ouverts sur ce CAB
      if (detailCab?.id_cab === cab.id_cab) setDetailCab(null);
      if (editCab?.id_cab  === cab.id_cab) { setEditCab(null); setShowEdit(false); }
      
      // On ne rappelle pas forcément fetchData ici car l'UI est déjà à jour
      // Mais on peut le faire en arrière-plan si on veut être sûr
      // await fetchData(); 
    } catch (err) {
      // Rollback si erreur (ex: CAB_IN_USE)
      setCabs(originalCabs);
      const msg = err?.error?.message || err.response?.data?.message || err?.message || 'Erreur lors de la suppression';
      setToast({ msg: msg, type: 'error' });
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



  const handleRemoveMemberDirect = (cab, id_user) => {
    const user = users.find(u => u.id_user === id_user);
    const userName = user ? `${user.prenom_user} ${user.nom_user}` : 'ce membre';
    
    setConfirmDel({
      title: 'Retirer le membre',
      message: `Voulez-vous vraiment retirer ${userName} du comité "${cab.nom_cab}" ?`,
      onConfirm: async () => {
        try {
          await api.delete(`/cab/${cab.id_cab}/membres/${id_user}`);
          // Mettre à jour l'état local pour rafraîchir la modale
          const updatedCabs = cabs.map(c => {
            if (c.id_cab === cab.id_cab) {
              return { ...c, membres: c.membres.filter(m => (m.id_user || m.utilisateur?.id_user) !== id_user) };
            }
            return c;
          });
          setCabs(updatedCabs);
          setSelectedCabForMembers(updatedCabs.find(c => c.id_cab === cab.id_cab));
          fetchData(); // Sync complète
          setToast({ msg: 'Membre retiré avec succès.', type: 'success' });
        } catch (err) {
          setToast({ msg: err.response?.data?.message || 'Erreur lors du retrait du membre', type: 'error' });
        } finally {
          setConfirmDel(null);
        }
      }
    });
  };

  const handleAddMemberDirect = async (cab, id_user) => {
    if (!id_user) return;
    try {
      await api.post(`/cab/${cab.id_cab}/membres`, { id_user });
      fetchData(); // On recharge tout pour avoir les infos complètes de l'utilisateur ajouté
      setShowMembersList(false); // On ferme pour forcer le rafraîchissement propre au prochain clic
      setToast({ msg: 'Membre ajouté avec succès.', type: 'success' });
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Erreur lors de l\'ajout du membre', type: 'error' });
    }
  };

  const handleUpdatePresident = async (cabId, id_president) => {
    if (!id_president) return;
    try {
      // Le backend attend un tableau d'opérations sur les membres pour changer le président
      await api.put(`/cab/${cabId}`, { 
        membres: [{ action: 'ADD', id_user: id_president, role: 'PRESIDENT' }]
      });
      setToast({ msg: 'Président du CAB mis à jour avec succès.', type: 'success' });
      fetchData();
      setShowMembersList(false);
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Erreur lors de la mise à jour du président', type: 'error' });
    }
  };

  const filtered = cabs.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !search || 
      c.code_metier?.toLowerCase().includes(q) || 
      c.type_cab?.toLowerCase().includes(q) ||
      (c.nom_cab && c.nom_cab.toLowerCase().includes(q));
    const matchesType = filterType === 'ALL' || c.type_cab === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="cab-admin-page">
      {/* HEADER */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiLayers /></div>
          <div className="premium-header-text">
            <h1>Gestion des CAB</h1>
            <p>Configurez les comités de changement et supervisez les membres et types de CAB ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button onClick={() => setShowCreate(true)} className="btn-create-premium">
            <FiPlus /> Nouveau CAB
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card blue">
          <div className="stat-icon-wrapper"><FiLayers size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.length}</div>
            <div className="stat-label">Total CAB</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon-wrapper"><FiCheckCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.filter(c => c.type_cab === 'STANDARD').length}</div>
            <div className="stat-label">Standard</div>
          </div>
        </div>
        <div className="stat-card amber">
          <div className="stat-icon-wrapper"><FiCheckCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.filter(c => c.type_cab === 'NORMAL').length}</div>
            <div className="stat-label">Normal</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon-wrapper"><FiClock size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.filter(c => c.type_cab === 'URGENT').length}</div>
            <div className="stat-label">Urgent</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom "
            style={{
              width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
              borderRadius: '10px', border: '1.5px solid #e2e8f0',
              fontSize: '0.9rem', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <div className="filter-wrapper-cab">
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
          style={{
            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
          }}
          >
            <option value="ALL">Tous les types</option>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
            <option value="STANDARD">Standard</option>
          </select>
        </div>
          
        {(search || filterType !== 'ALL' ) && (
          <button 
            onClick={() => { setSearch(''); setFilterType('ALL');}}
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

      {/* TABLE */}
      <Card className="table-card-cab">
        <div className="table-container-cab table-scroll-container">
          <table style={{ minWidth: '1000px' }}>
            <thead>
              <tr>
                <th>Code CAB</th>
                <th>Nom CAB</th>
                <th>Président</th>
                <th>Type</th>
                <th>Score</th>
                <th>Membres</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="loading-cell-cab">Chargement...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="empty-cell-cab">Aucun CAB trouvé.</td></tr>
              ) : filtered.map((cab, index) => (
                <tr 
                  key={cab.id_cab} 
                  onClick={() => handleDetailClick(cab)}
                  className="hover-row-cab clickable-row-cab"
                >
                  <td>
                    <div className="cab-code-cell">#{cab.code_metier}</div>
                  </td>
                  <td>
                    <div className="cab-name-cell">{cab.nom_cab || 'Comité de Changement'}</div>
                  </td>
                  <td>
                    <div className="cab-president-cell">
                      {(() => {
                        const p = cab.membres?.find(m => m.role === 'PRESIDENT')?.utilisateur;
                        return p ? `${p.prenom_user} ${p.nom_user}` : 'Non défini';
                      })()}
                    </div>
                  </td>
                  <td onClick={(e) => {
                    e.stopPropagation();
                    setInlineEdit({ id_cab: cab.id_cab, field: 'type_cab', value: cab.type_cab });
                  }}>
                    {inlineEdit.id_cab === cab.id_cab && inlineEdit.field === 'type_cab' ? (
                      <select 
                        className="inline-edit-select"
                        autoFocus
                        value={inlineEdit.value}
                        onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        onBlur={() => handleInlineSubmit(cab, 'type_cab', inlineEdit.value)}
                        onClick={e => e.stopPropagation()}
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="URGENT">URGENT</option>
                        <option value="STANDARD">STANDARD</option>
                      </select>
                    ) : (
                      <span className={`type-badge ${getCabTypeClass(cab.type_cab)}`}>
                        {cab.type_cab}
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="cab-score-cell">—</div>
                  </td>
                  <td onClick={(e) => { 
                    e.stopPropagation(); 
                    setSelectedCabForMembers(cab);
                    setShowMembersList(true);
                  }}>
                    <div className="members-count members-count-pill">
                      <FiUsers /> {cab.membres?.length || 0} membres
                    </div>
                  </td>
                  <td onClick={(e) => { e.stopPropagation(); }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(cab); }} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Modifier">
                        <FiEdit3 size={16} />
                      </button>
                      <button onClick={(e) => { 
                        e.stopPropagation(); 
                        handleDeleteCab(cab);
                      }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Supprimer">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* CREATE MODAL */}
      {showCreate && (
        <div className="modal-backdrop" onClick={() => setShowCreate(false)}>
          <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

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

                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#92400e', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
                    Président du CAB
                  </label>
                  {!createForm.id_president ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ background: '#f59e0b', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                        <FiCheckCircle size={18} />
                      </div>
                      <select 
                        value=""
                        onChange={e => {
                          if (e.target.value) setCreateForm({...createForm, id_president: e.target.value});
                        }}
                        className="modal-select-cab"
                        style={{ flex: 1, padding: '0.5rem', borderColor: '#fde68a' }}
                      >
                        <option value="">Sélectionner un président...</option>
                        {users.filter(u => u.roles?.some(r => r === 'CHANGE_MANAGER' || r.nom_role === 'CHANGE_MANAGER')).filter(u => u.id_user !== createForm.id_president).map(u => (
                          <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                        ))}
                      </select>
                    </div>
                  ) : (() => {
                    const u = users.find(user => user.id_user === createForm.id_president);
                    if (!u) return null;
                    return (
                      <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '28px', height: '28px', background: '#f59e0b', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {u.prenom_user[0]}{u.nom_user[0]}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e' }}>{u.prenom_user} {u.nom_user}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setCreateForm({...createForm, id_president: ''})}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Retirer ce président"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* SECTION MEMBRES (Style Bleu) */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
                    Membres du Comité
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                      <FiUserPlus size={18} />
                    </div>
                    <select 
                      className="modal-select-cab"
                      style={{ flex: 1, padding: '0.5rem' }}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id && !createForm.member_ids.includes(id)) {
                          setCreateForm(prev => ({ ...prev, member_ids: [...prev.member_ids, id] }));
                        }
                      }}
                      value=""
                    >
                      <option value="">Ajouter un membre...</option>
                      {users
                        .filter(u => u.roles?.some(r => r === 'MEMBRE_CAB' || r.nom_role === 'MEMBRE_CAB'))
                        .filter(u => !createForm.member_ids.includes(u.id_user))
                        .map(u => (
                          <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Liste des membres ajoutés */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {createForm.member_ids.map(id => {
                      const u = users.find(user => user.id_user === id);
                      if (!u) return null;
                      return (
                        <div key={id} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '28px', height: '28px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              {u.prenom_user[0]}{u.nom_user[0]}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{u.prenom_user} {u.nom_user}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => toggleMember(id, false)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
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
        <div className="modal-backdrop" onClick={() => setShowDetail(false)}>
          <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

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
                <button className="rfc-action-btn delete" onClick={() => handleDeleteCab(detailCab)}>
                  <FiTrash2 /> Supprimer
                </button>
              </div>
              <button className="close-btn-rfc-style close-btn-offset" onClick={() => setShowDetail(false)}><FiX size={24} /></button>
            </div>

            <div className="modal-body-rfc-style">
              <div className="rfc-style-grid">
                <div className="detail-item-rfc-style">
                  <label>Type de Comité</label>
                  <div className="detail-value-box">
                    <span className={`type-badge type-badge-compact ${getCabTypeClass(detailCab.type_cab)}`}>
                      {detailCab.type_cab}
                    </span>
                  </div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Date de Création</label>
                  <div className="detail-value-box">
                    <FiCalendar className="detail-icon-muted" />
                    {new Date(detailCab.date_creation).toLocaleDateString()}
                  </div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Président du Comité</label>
                  <div className="detail-value-box">
                    <div className="rfc-avatar rfc-avatar-small-inline">
                      {detailCab.president?.prenom_user?.[0]}{detailCab.president?.nom_user?.[0]}
                    </div>
                    {detailCab.president ? `${detailCab.president.prenom_user} ${detailCab.president.nom_user}` : 'Non assigné'}
                  </div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Total Membres</label>
                  <div className="detail-value-box">
                    <FiUsers className="detail-icon-muted" />
                    {detailCab.membres?.length || 0} Membres actifs
                  </div>
                </div>
              </div>

              <div className="rfc-style-section">
                <h3 className="rfc-section-title"><FiUsers /> Composition du Comité</h3>
                <div className="rfc-members-grid">
                  {detailCab.membres?.length > 0 ? detailCab.membres.map(m => {
                    const u = m.utilisateur || m;
                    return (
                      <div key={u.id_user} className="rfc-member-card">
                        <div className="rfc-avatar">{u.prenom_user?.[0]}{u.nom_user?.[0]}</div>
                        <div className="rfc-member-info">
                          <span className="rfc-m-name">{u.prenom_user} {u.nom_user}</span>
                          <span className="rfc-m-role">{m.role === 'PRESIDENT' ? 'Président' : 'Membre du Comité'}</span>
                        </div>
                      </div>
                    );
                  }) : <div className="rfc-empty">Aucun membre assigné à ce comité.</div>}
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
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>

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

                {/* SECTION PRÉSIDENT (Style Jaune) */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#92400e', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
                    Président du CAB
                  </label>
                  {!editForm.id_president ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ background: '#f59e0b', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                        <FiCheckCircle size={18} />
                      </div>
                      <select 
                        value=""
                        onChange={e => {
                          if (e.target.value) setEditForm({...editForm, id_president: e.target.value});
                        }}
                        className="modal-select-cab"
                        style={{ flex: 1, padding: '0.5rem', borderColor: '#fde68a' }}
                      >
                        <option value="">Sélectionner un président...</option>
                        {users.filter(u => u.roles?.some(r => r === 'CHANGE_MANAGER' || r.nom_role === 'CHANGE_MANAGER')).filter(u => u.id_user !== editForm.id_president).map(u => (
                          <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                        ))}
                      </select>
                    </div>
                  ) : (() => {
                    const u = users.find(user => user.id_user === editForm.id_president);
                    if (!u) return null;
                    return (
                      <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fde68a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '28px', height: '28px', background: '#f59e0b', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                            {u.prenom_user[0]}{u.nom_user[0]}
                          </div>
                          <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e' }}>{u.prenom_user} {u.nom_user}</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setEditForm({...editForm, id_president: ''})}
                          style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          title="Retirer ce président"
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </div>
                    );
                  })()}
                </div>

                {/* SECTION MEMBRES (Style Bleu) */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
                    Membres du Comité
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                      <FiUserPlus size={18} />
                    </div>
                    <select 
                      className="modal-select-cab"
                      style={{ flex: 1, padding: '0.5rem' }}
                      onChange={(e) => {
                        const id = e.target.value;
                        if (id && !editForm.member_ids.includes(id)) {
                          setEditForm(prev => ({ ...prev, member_ids: [...prev.member_ids, id] }));
                        }
                      }}
                      value=""
                    >
                      <option value="">Ajouter un membre...</option>
                      {users
                        .filter(u => u.roles?.some(r => r === 'MEMBRE_CAB' || r.nom_role === 'MEMBRE_CAB'))
                        .filter(u => !editForm.member_ids.includes(u.id_user))
                        .map(u => (
                          <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                        ))
                      }
                    </select>
                  </div>

                  {/* Liste des membres ajoutés */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {editForm.member_ids.map(id => {
                      const u = users.find(user => user.id_user === id);
                      if (!u) return null;
                      return (
                        <div key={id} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '28px', height: '28px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              {u.prenom_user[0]}{u.nom_user[0]}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{u.prenom_user} {u.nom_user}</span>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => toggleMember(id, true)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      );
                    })}
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
      
      {/* MEMBERS LIST MODAL */}
      {showMembersList && selectedCabForMembers && (
        <div className="modal-backdrop" onClick={() => setShowMembersList(false)}>
          <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper"><FiUsers /></div>
              <div className="rfc-style-header-text">
                <h2>Membres du Comité</h2>
                <div className="rfc-style-subtitle">{selectedCabForMembers.nom_cab || 'Comité de Changement'}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowMembersList(false)}><FiX size={24} /></button>
            </div>
            
            <div className="modal-body-rfc-style modal-body-scrollable">
              {/* Changement de président */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#92400e', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
                  Président du CAB
                </label>
                {!selectedCabForMembers.membres?.some(m => m.role === 'PRESIDENT') ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ background: '#f59e0b', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                      <FiCheckCircle size={18} />
                    </div>
                    <select 
                      className="modal-select-cab"
                      style={{ flex: 1, padding: '0.5rem', borderColor: '#fde68a' }}
                      onChange={(e) => handleUpdatePresident(selectedCabForMembers.id_cab, e.target.value)}
                      value=""
                    >
                      <option value="">Sélectionner un nouveau président...</option>
                      {users
                        .filter(u => u.roles?.some(r => r === 'CHANGE_MANAGER' || r.nom_role === 'CHANGE_MANAGER'))
                        .map(u => (
                          <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                        ))
                      }
                    </select>
                  </div>
                ) : (() => {
                  const p = selectedCabForMembers.membres.find(m => m.role === 'PRESIDENT');
                  const u = p.utilisateur || p;
                  return (
                    <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '28px', height: '28px', background: '#f59e0b', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                          {u.prenom_user?.[0]}{u.nom_user?.[0]}
                        </div>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#92400e' }}>{u.prenom_user} {u.nom_user}</span>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveMemberDirect(selectedCabForMembers, u.id_user)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                        title="Retirer ce président"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Formulaire d'ajout rapide et liste des membres */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '800', color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>
                  Membres du Comité
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}>
                    <FiUserPlus size={18} />
                  </div>
                  <select 
                    className="modal-select-cab"
                    style={{ flex: 1, padding: '0.5rem' }}
                    onChange={(e) => handleAddMemberDirect(selectedCabForMembers, e.target.value)}
                    value=""
                  >
                    <option value="">Ajouter un membre...</option>
                    {users
                      .filter(u => u.roles?.includes('MEMBRE_CAB'))
                      .filter(u => !selectedCabForMembers.membres?.some(m => (m.id_user || m.utilisateur?.id_user) === u.id_user))
                      .map(u => (
                        <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                      ))
                    }
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(() => {
                    const membres = selectedCabForMembers.membres?.filter(m => m.role !== 'PRESIDENT') || [];
                    if (membres.length === 0) {
                      return (
                        <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem', textAlign: 'center' }}>
                          Aucun membre dans ce comité.
                        </div>
                      );
                    }
                    return membres.map(m => {
                      const u = m.utilisateur || m;
                      return (
                        <div key={u.id_user} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '28px', height: '28px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 'bold' }}>
                              {u.prenom_user?.[0]}{u.nom_user?.[0]}
                            </div>
                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#1e293b' }}>
                              {u.prenom_user} {u.nom_user}
                            </span>
                          </div>
                          <button 
                            onClick={() => handleRemoveMemberDirect(selectedCabForMembers, u.id_user)}
                            style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}
                            title="Retirer ce membre"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            </div>
            
            <div className="modal-footer-rfc-style">
              <button className="btn-cancel-rfc-style" onClick={() => setShowMembersList(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDel && (
        <ConfirmModal
          title={confirmDel.title}
          message={confirmDel.message}
          danger={true}
          loading={createLoading}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminCabManagement;