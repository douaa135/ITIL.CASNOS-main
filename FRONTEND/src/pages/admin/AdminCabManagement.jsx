import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiUsers, FiLayers, FiCalendar, FiSearch, FiPlus, 
  FiCheckCircle, FiClock, FiTrash2, FiEdit3, FiInfo, FiX, FiHash,
  FiUserPlus, FiUserMinus, FiAlertTriangle, FiRefreshCw, FiUser
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
    case 'NORMAL':   return 'type-blue';
    case 'URGENT':   return 'type-red';
    case 'STANDARD': return 'type-green';
    default:         return 'type-default';
  }
};

// ── Style partagés ───────────────────────────────────────────
const thStyle = {
  padding: '12px 16px',
  fontSize: '0.7rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em',
  color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: '0.875rem',
  color: '#334155',
  verticalAlign: 'middle',
};

// ── Avatar initiales ─────────────────────────────────────────
const AVATAR_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#d1fae5', color: '#065f46' },
  { bg: '#fef3c7', color: '#92400e' },
  { bg: '#ede9fe', color: '#5b21b6' },
  { bg: '#fce7f3', color: '#9d174d' },
  { bg: '#e0f2fe', color: '#0369a1' },
];

const Avatar = ({ prenom = '', nom = '', size = 34, radius = '10px' }) => {
  const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  const palette   = AVATAR_COLORS[(prenom.charCodeAt(0) || 0) % AVATAR_COLORS.length];
  return initiales ? (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: palette.bg, color: palette.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em',
    }}>
      {initiales}
    </div>
  ) : (
    <div style={{
      width: size, height: size, borderRadius: radius, flexShrink: 0,
      background: '#f1f5f9',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <FiUser size={14} color="#94a3b8" />
    </div>
  );
};

// ── Badge type CAB ───────────────────────────────────────────
const TYPE_COLORS = {
  'URGENT':   { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' },
  'NORMAL':   { bg: '#eff6ff', color: '#3b82f6', border: '#dbeafe' },
  'STANDARD': { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' },
};

const TypeBadge = ({ type }) => {
  const s = TYPE_COLORS[type] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '0.75rem', fontWeight: 700,
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      whiteSpace: 'nowrap', cursor: 'pointer',
    }}>
      {type}
    </span>
  );
};

// ============================================================
const AdminCabManagement = () => {
  const { user: currentUser } = useAuth();
  const [cabs,    setCabs]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search,      setSearch]      = useState('');
  const [filterType,  setFilterType]  = useState('ALL');
  const [showCreate,  setShowCreate]  = useState(false);
  const [editCab,     setEditCab]     = useState(null);
  const [showEdit,    setShowEdit]    = useState(false);
  const [detailCab,   setDetailCab]   = useState(null);
  const [showDetail,  setShowDetail]  = useState(false);
  const [showMembersList,       setShowMembersList]       = useState(false);
  const [selectedCabForMembers, setSelectedCabForMembers] = useState(null);

  const [createForm, setCreateForm] = useState({
    nom_cab: '', type_cab: 'NORMAL', id_president: '', member_ids: []
  });
  const [editForm, setEditForm] = useState({
    nom_cab: '', type_cab: 'NORMAL', id_president: '', member_ids: []
  });
  const [inlineEdit,    setInlineEdit]    = useState({ id_cab: null, field: null, value: '' });
  const [createLoading, setCreateLoading] = useState(false);
  const [confirmDel,    setConfirmDel]    = useState(null);
  const [toast,         setToast]         = useState(null);

  // ── Fetch ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [cabRes, userRes] = await Promise.all([
        api.get('/cab').catch(() => ({ cabs: [] })),
        api.get('/users?limit=1000').catch(() => ({ data: { data: [] } })),
      ]);
      const cabData  = cabRes?.data?.cabs  || cabRes?.cabs  || cabRes?.data  || [];
      const rawUsers = userRes?.data?.data  || userRes?.data?.users || userRes?.data || userRes?.users || [];
      setCabs(Array.isArray(cabData)  ? cabData  : []);
      setUsers(Array.isArray(rawUsers) ? rawUsers : []);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Create ───────────────────────────────────────────────
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.nom_cab)  return setToast({ msg: 'Nom du CAB requis.',  type: 'error' });
    if (!createForm.type_cab) return setToast({ msg: 'Type du CAB requis.', type: 'error' });
    setCreateLoading(true);
    try {
      const payload = {
        nom_cab:    createForm.nom_cab.trim() || `CAB ${createForm.type_cab} ${new Date().toLocaleDateString()}`,
        type_cab:   createForm.type_cab,
        member_ids: createForm.member_ids.filter(id => id && id.trim() !== ''),
      };
      if (createForm.id_president) payload.id_president = createForm.id_president;

      const res = await api.post('/cab', payload);
      const newCabId = res?.data?.cab?.id_cab || res?.cab?.id_cab || res?.id_cab;
      if (!newCabId) throw new Error('Aucun identifiant de CAB renvoyé par le backend.');

      await fetchData();
      setShowCreate(false);
      setCreateForm({ nom_cab: '', type_cab: 'NORMAL', id_president: '', member_ids: [] });
      setToast({ msg: 'CAB créé avec succès.', type: 'success' });
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de la création du CAB.', type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Edit ─────────────────────────────────────────────────
  const handleEditClick = (cab) => {
    setEditCab(cab);
    setEditForm({
      nom_cab:      cab.nom_cab    || '',
      type_cab:     cab.type_cab   || 'NORMAL',
      id_president: cab.id_president || '',
      member_ids:   cab.membres?.map(m => m.id_user || m.utilisateur?.id_user) || [],
    });
    setShowEdit(true);
    setShowDetail(false);
  };

  const handleDetailClick = (cab) => { setDetailCab(cab); setShowDetail(true); };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setCreateLoading(true);
    try {
      const currentMemberIds   = editCab.membres?.map(m => m.id_user || m.utilisateur?.id_user).filter(Boolean) || [];
      const currentPresidentId = editCab.membres?.find(m => m.role === 'PRESIDENT')?.utilisateur?.id_user;
      const membresOps = [];

      if (editForm.id_president && editForm.id_president !== currentPresidentId) {
        membresOps.push({ action: 'ADD', id_user: editForm.id_president, role: 'PRESIDENT' });
      }
      editForm.member_ids.forEach(id => {
        if (!currentMemberIds.includes(id) && id !== editForm.id_president)
          membresOps.push({ action: 'ADD', id_user: id, role: 'MEMBRE' });
      });
      currentMemberIds.forEach(id => {
        if (!editForm.member_ids.includes(id) && id !== editForm.id_president)
          membresOps.push({ action: 'REMOVE', id_user: id });
      });

      await api.put(`/cab/${editCab.id_cab}`, { type_cab: editForm.type_cab, membres: membresOps });
      setToast({ msg: 'CAB mis à jour avec succès.', type: 'success' });
      setShowEdit(false);
      fetchData();
    } catch (err) {
      setToast({ msg: err?.error?.message || err.response?.data?.message || err?.message || 'Erreur lors de la mise à jour', type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  const handleInlineSubmit = async (cab, field, value) => {
    try {
      await api.put(`/cab/${cab.id_cab}`, { [field]: value });
      setInlineEdit({ id_cab: null, field: null, value: '' });
      fetchData();
    } catch (err) { console.error('Inline edit error:', err); }
  };

  // ── Delete ───────────────────────────────────────────────
  const handleDeleteCab = (cab) => {
    setConfirmDel({
      title:   'Supprimer le CAB',
      message: `Voulez-vous vraiment supprimer définitivement le CAB "${cab.nom_cab || cab.code_metier}" ?`,
      cab,
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const { cab, onConfirm } = confirmDel;
    if (onConfirm) { await onConfirm(); return; }

    const originalCabs = [...cabs];
    setCabs(prev => prev.filter(c => c.id_cab !== cab.id_cab));
    setConfirmDel(null);
    setCreateLoading(true);
    try {
      await api.delete(`/cab/${cab.id_cab}`);
      setToast({ msg: 'CAB supprimé avec succès.', type: 'error' });
      if (detailCab?.id_cab === cab.id_cab) setDetailCab(null);
      if (editCab?.id_cab   === cab.id_cab) { setEditCab(null); setShowEdit(false); }
    } catch (err) {
      setCabs(originalCabs);
      setToast({ msg: err?.error?.message || err.response?.data?.message || err?.message || 'Erreur lors de la suppression', type: 'error' });
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Membres ──────────────────────────────────────────────
  const toggleMember = (id, isEdit = false) => {
    const form    = isEdit ? editForm    : createForm;
    const setForm = isEdit ? setEditForm : setCreateForm;
    const newIds  = form.member_ids.includes(id)
      ? form.member_ids.filter(m => m !== id)
      : [...form.member_ids, id];
    setForm({ ...form, member_ids: newIds });
  };

  const handleRemoveMemberDirect = (cab, id_user) => {
    const u        = users.find(u => u.id_user === id_user);
    const userName = u ? `${u.prenom_user} ${u.nom_user}` : 'ce membre';
    setConfirmDel({
      title:   'Retirer le membre',
      message: `Voulez-vous vraiment retirer ${userName} du comité "${cab.nom_cab}" ?`,
      onConfirm: async () => {
        try {
          await api.delete(`/cab/${cab.id_cab}/membres/${id_user}`);
          const updated = cabs.map(c => c.id_cab === cab.id_cab
            ? { ...c, membres: c.membres.filter(m => (m.id_user || m.utilisateur?.id_user) !== id_user) }
            : c
          );
          setCabs(updated);
          setSelectedCabForMembers(updated.find(c => c.id_cab === cab.id_cab));
          fetchData();
          setToast({ msg: 'Membre retiré avec succès.', type: 'success' });
        } catch (err) {
          setToast({ msg: err.response?.data?.message || 'Erreur lors du retrait du membre', type: 'error' });
        } finally { setConfirmDel(null); }
      },
    });
  };

  const handleAddMemberDirect = async (cab, id_user) => {
    if (!id_user) return;
    try {
      await api.post(`/cab/${cab.id_cab}/membres`, { id_user });
      fetchData();
      setShowMembersList(false);
      setToast({ msg: 'Membre ajouté avec succès.', type: 'success' });
    } catch (err) {
      setToast({ msg: err.response?.data?.message || "Erreur lors de l'ajout du membre", type: 'error' });
    }
  };

  const handleUpdatePresident = async (cabId, id_president) => {
    if (!id_president) return;
    try {
      await api.put(`/cab/${cabId}`, { membres: [{ action: 'ADD', id_user: id_president, role: 'PRESIDENT' }] });
      setToast({ msg: 'Président mis à jour avec succès.', type: 'success' });
      fetchData();
      setShowMembersList(false);
    } catch (err) {
      setToast({ msg: err.response?.data?.message || 'Erreur lors de la mise à jour du président', type: 'error' });
    }
  };

  // ── Filtre ───────────────────────────────────────────────
  const filtered = cabs.filter(c => {
    const q = search.toLowerCase();
    const matchesSearch = !search
      || c.code_metier?.toLowerCase().includes(q)
      || c.type_cab?.toLowerCase().includes(q)
      || (c.nom_cab && c.nom_cab.toLowerCase().includes(q));
    const matchesType = filterType === 'ALL' || c.type_cab === filterType;
    return matchesSearch && matchesType;
  });

  {/* Objets de style partagés — à mettre avant le return */}
const thStyle = {
  padding: '12px 16px',
  fontSize: '0.7rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em',
  color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '14px 16px',
  fontSize: '0.875rem',
  color: '#334155',
  verticalAlign: 'middle',
};
  // ============================================================
  return (
    <div className="cab-admin-page">

      {/* HEADER ─────────────────────────────────────────────── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
            <FiLayers />
          </div>
          <div className="premium-header-text">
            <h1>Gestion des CAB</h1>
            <p>Configurez les comités de changement et supervisez les membres et types de CAB</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button
            className="btn-create-premium"
            onClick={() => window.location.reload()}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
          >
            <FiRefreshCw /> Actualiser
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-create-premium">
            <FiPlus /> Nouveau CAB
          </button>
        </div>
      </div>

      {/* KPI ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div 
          className={`stat-card blue ${filterType === 'ALL' ? 'active-kpi' : ''}`} 
          style={{ cursor: 'pointer', transition: 'all 0.2s', outline: filterType === 'ALL' ? '2px solid #3b82f6' : 'none' }}
          onClick={() => setFilterType('ALL')}
        >
          <div className="stat-icon-wrapper"><FiLayers size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.length}</div>
            <div className="stat-label">Total CAB</div>
          </div>
        </div>
        <div 
          className={`stat-card green ${filterType === 'STANDARD' ? 'active-kpi' : ''}`}
          style={{ cursor: 'pointer', transition: 'all 0.2s', outline: filterType === 'STANDARD' ? '2px solid #22c55e' : 'none' }}
          onClick={() => setFilterType('STANDARD')}
        >
          <div className="stat-icon-wrapper"><FiCheckCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.filter(c => c.type_cab === 'STANDARD').length}</div>
            <div className="stat-label">Standard</div>
          </div>
        </div>
        <div 
          className={`stat-card amber ${filterType === 'NORMAL' ? 'active-kpi' : ''}`}
          style={{ cursor: 'pointer', transition: 'all 0.2s', outline: filterType === 'NORMAL' ? '2px solid #f59e0b' : 'none' }}
          onClick={() => setFilterType('NORMAL')}
        >
          <div className="stat-icon-wrapper"><FiCheckCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.filter(c => c.type_cab === 'NORMAL').length}</div>
            <div className="stat-label">Normal</div>
          </div>
        </div>
        <div 
          className={`stat-card purple ${filterType === 'URGENT' ? 'active-kpi' : ''}`}
          style={{ cursor: 'pointer', transition: 'all 0.2s', outline: filterType === 'URGENT' ? '2px solid #7c3aed' : 'none' }}
          onClick={() => setFilterType('URGENT')}
        >
          <div className="stat-icon-wrapper"><FiClock size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cabs.filter(c => c.type_cab === 'URGENT').length}</div>
            <div className="stat-label">Urgent</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            className="search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom..."
            style={{
              width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
              borderRadius: '10px', border: '1.5px solid #e2e8f0',
              fontSize: '0.9rem', boxSizing: 'border-box', transition: 'border-color 0.2s',
            }}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
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
        {(search || filterType !== 'ALL') && (
          <button
            onClick={() => { setSearch(''); setFilterType('ALL'); }}
            style={{
              padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
              fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', cursor: 'pointer', fontWeight: '600',
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* TABLE ──────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '16px',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>

            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                {/* Sticky gauche */}
                <th style={{
                  position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc',
                  padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b',
                  textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0',
                }}>CAB & Code</th>

                <th style={thStyle}>Président</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Score</th>
                <th style={thStyle}>Membres</th>

                {/* Sticky droite */}
                <th style={{
                  position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc',
                  padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b',
                  textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0',
                }}>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    Aucun CAB trouvé.
                  </td>
                </tr>
              ) : filtered.map((cab) => (
                <tr
                  key={cab.id_cab}
                  onClick={() => handleDetailClick(cab)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  {/* ── 1. Nom + Code — sticky gauche */}
                  <td style={{
                    position: 'sticky', left: 0, zIndex: 2, background: 'inherit',
                    padding: '14px 16px', borderRight: '1px solid #f1f5f9',
                  }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '220px' }}>
                      {cab.nom_cab || 'Comité de Changement'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>
                      #{cab.code_metier}
                    </div>
                  </td>

                  {/* ── 2. Président — avatar initiales */}
                  <td style={tdStyle}>
                    {(() => {
                      const p      = cab.membres?.find(m => m.role === 'PRESIDENT')?.utilisateur;
                      const prenom = p?.prenom_user || '';
                      const nom    = p?.nom_user    || '';
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar prenom={prenom} nom={nom} />
                          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                            {p ? `${prenom} ${nom}`.trim() : 'Non défini'}
                          </span>
                        </div>
                      );
                    })()}
                  </td>

                  {/* ── 3. Type — inline edit */}
                  <td style={tdStyle} onClick={e => { e.stopPropagation(); setInlineEdit({ id_cab: cab.id_cab, field: 'type_cab', value: cab.type_cab }); }}>
                    {inlineEdit.id_cab === cab.id_cab && inlineEdit.field === 'type_cab' ? (
                      <select
                        autoFocus
                        value={inlineEdit.value}
                        onChange={e => setInlineEdit({ ...inlineEdit, value: e.target.value })}
                        onBlur={() => handleInlineSubmit(cab, 'type_cab', inlineEdit.value)}
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize: '0.8rem', padding: '4px 8px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none', cursor: 'pointer' }}
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="URGENT">URGENT</option>
                        <option value="STANDARD">STANDARD</option>
                      </select>
                    ) : (
                      <TypeBadge type={cab.type_cab} />
                    )}
                  </td>

                  {/* ── 4. Score */}
                  <td style={tdStyle}>
                    <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>—</span>
                  </td>

                  {/* ── 5. Membres */}
                  <td style={tdStyle} onClick={e => { e.stopPropagation(); setSelectedCabForMembers(cab); setShowMembersList(true); }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                      background: '#eff6ff', border: '1px solid #bfdbfe',
                      fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap',
                    }}>
                      <FiUsers size={13} />
                      {cab.membres?.length || 0} membre{(cab.membres?.length || 0) !== 1 ? 's' : ''}
                    </span>
                  </td>

                  {/* ── 6. Actions — sticky droite */}
                  <td style={{
                    position: 'sticky', right: 0, zIndex: 2, background: 'inherit',
                    padding: '14px 16px', borderLeft: '1px solid #f1f5f9',
                  }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                      <button
                        onClick={e => { e.stopPropagation(); handleEditClick(cab); }}
                        title="Modifier"
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}
                      >
                        <FiEdit3 size={15} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); handleDeleteCab(cab); }}
                        title="Supprimer"
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                      >
                        <FiTrash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''} sur {cabs.length} CAB{cabs.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* ── MODAL : CRÉER ─────────────────────────────────── */}
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
                      <input type="text" placeholder="Ex: CAB Infrastructure"
                        value={createForm.nom_cab}
                        onChange={e => setCreateForm({ ...createForm, nom_cab: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="form-group-cab">
                    <label>Type de CAB</label>
                    <div className="input-with-icon-cab">
                      <FiHash className="input-icon-cab" />
                      <select value={createForm.type_cab} onChange={e => setCreateForm({ ...createForm, type_cab: e.target.value })}>
                        <option value="NORMAL">Normal</option>
                        <option value="URGENT">Urgent (ECAB)</option>
                        <option value="STANDARD">Standard</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Président */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Président du CAB</label>
                  {!createForm.id_president ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ background: '#f59e0b', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}><FiCheckCircle size={18} /></div>
                      <select value="" onChange={e => { if (e.target.value) setCreateForm({ ...createForm, id_president: e.target.value }); }} className="modal-select-cab" style={{ flex: 1, padding: '0.5rem', borderColor: '#fde68a' }}>
                        <option value="">Sélectionner un président...</option>
                        {users.filter(u => u.roles?.some(r => r === 'CHANGE_MANAGER' || r.nom_role === 'CHANGE_MANAGER')).map(u => (
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
                          <Avatar prenom={u.prenom_user} nom={u.nom_user} size={28} radius="50%" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>{u.prenom_user} {u.nom_user}</span>
                        </div>
                        <button type="button" onClick={() => setCreateForm({ ...createForm, id_president: '' })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><FiTrash2 size={14} /></button>
                      </div>
                    );
                  })()}
                </div>

                {/* Membres */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Membres du Comité</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}><FiUserPlus size={18} /></div>
                    <select className="modal-select-cab" style={{ flex: 1, padding: '0.5rem' }} value=""
                      onChange={e => { const id = e.target.value; if (id && !createForm.member_ids.includes(id)) setCreateForm(prev => ({ ...prev, member_ids: [...prev.member_ids, id] })); }}
                    >
                      <option value="">Ajouter un membre...</option>
                      {users.filter(u => u.roles?.some(r => r === 'MEMBRE_CAB' || r.nom_role === 'MEMBRE_CAB')).filter(u => !createForm.member_ids.includes(u.id_user)).map(u => (
                        <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {createForm.member_ids.map(id => {
                      const u = users.find(user => user.id_user === id);
                      if (!u) return null;
                      return (
                        <div key={id} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Avatar prenom={u.prenom_user} nom={u.nom_user} size={28} radius="50%" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.prenom_user} {u.nom_user}</span>
                          </div>
                          <button type="button" onClick={() => toggleMember(id, false)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><FiTrash2 size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowCreate(false)}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={createLoading}>{createLoading ? 'Création...' : 'Créer le CAB'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : DÉTAIL ────────────────────────────────── */}
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
                <button className="rfc-action-btn edit" onClick={() => handleEditClick(detailCab)}><FiEdit3 /> Modifier</button>
                <button className="rfc-action-btn delete" onClick={() => handleDeleteCab(detailCab)}><FiTrash2 /> Supprimer</button>
              </div>
              <button className="close-btn-rfc-style close-btn-offset" onClick={() => setShowDetail(false)}><FiX size={24} /></button>
            </div>

            <div className="modal-body-rfc-style">
              <div className="rfc-style-grid">
                <div className="detail-item-rfc-style">
                  <label>Type de Comité</label>
                  <div className="detail-value-box"><TypeBadge type={detailCab.type_cab} /></div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Date de Création</label>
                  <div className="detail-value-box"><FiCalendar className="detail-icon-muted" />{new Date(detailCab.date_creation).toLocaleDateString()}</div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Président du Comité</label>
                  <div className="detail-value-box">
                    {(() => {
                      const p = detailCab.membres?.find(m => m.role === 'PRESIDENT')?.utilisateur || detailCab.president;
                      return p
                        ? <><Avatar prenom={p.prenom_user} nom={p.nom_user} size={24} radius="6px" /> {p.prenom_user} {p.nom_user}</>
                        : 'Non assigné';
                    })()}
                  </div>
                </div>
                <div className="detail-item-rfc-style">
                  <label>Total Membres</label>
                  <div className="detail-value-box"><FiUsers className="detail-icon-muted" />{detailCab.membres?.length || 0} Membres actifs</div>
                </div>
              </div>

              <div className="rfc-style-section">
                <h3 className="rfc-section-title"><FiUsers /> Composition du Comité</h3>
                <div className="rfc-members-grid">
                  {detailCab.membres?.length > 0 ? detailCab.membres.map(m => {
                    const u = m.utilisateur || m;
                    return (
                      <div key={u.id_user} className="rfc-member-card">
                        <Avatar prenom={u.prenom_user} nom={u.nom_user} size={36} radius="10px" />
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

      {/* ── MODAL : ÉDITER ────────────────────────────────── */}
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
                      <input type="text" value={editForm.nom_cab} onChange={e => setEditForm({ ...editForm, nom_cab: e.target.value })} />
                    </div>
                  </div>
                  <div className="form-group-cab">
                    <label>Type de CAB</label>
                    <select value={editForm.type_cab} onChange={e => setEditForm({ ...editForm, type_cab: e.target.value })} className="modal-select-cab">
                      <option value="NORMAL">Normal</option>
                      <option value="URGENT">Urgent (ECAB)</option>
                      <option value="STANDARD">Standard</option>
                    </select>
                  </div>
                </div>

                {/* Président */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Président du CAB</label>
                  {!editForm.id_president ? (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ background: '#f59e0b', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}><FiCheckCircle size={18} /></div>
                      <select value="" onChange={e => { if (e.target.value) setEditForm({ ...editForm, id_president: e.target.value }); }} className="modal-select-cab" style={{ flex: 1, padding: '0.5rem', borderColor: '#fde68a' }}>
                        <option value="">Sélectionner un président...</option>
                        {users.filter(u => u.roles?.some(r => r === 'CHANGE_MANAGER' || r.nom_role === 'CHANGE_MANAGER')).map(u => (
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
                          <Avatar prenom={u.prenom_user} nom={u.nom_user} size={28} radius="50%" />
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>{u.prenom_user} {u.nom_user}</span>
                        </div>
                        <button type="button" onClick={() => setEditForm({ ...editForm, id_president: '' })} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><FiTrash2 size={14} /></button>
                      </div>
                    );
                  })()}
                </div>

                {/* Membres */}
                <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                  <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Membres du Comité</label>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}><FiUserPlus size={18} /></div>
                    <select className="modal-select-cab" style={{ flex: 1, padding: '0.5rem' }} value=""
                      onChange={e => { const id = e.target.value; if (id && !editForm.member_ids.includes(id)) setEditForm(prev => ({ ...prev, member_ids: [...prev.member_ids, id] })); }}
                    >
                      <option value="">Ajouter un membre...</option>
                      {users.filter(u => u.roles?.some(r => r === 'MEMBRE_CAB' || r.nom_role === 'MEMBRE_CAB')).filter(u => !editForm.member_ids.includes(u.id_user)).map(u => (
                        <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {editForm.member_ids.map(id => {
                      const u = users.find(user => user.id_user === id);
                      if (!u) return null;
                      return (
                        <div key={id} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Avatar prenom={u.prenom_user} nom={u.nom_user} size={28} radius="50%" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{u.prenom_user} {u.nom_user}</span>
                          </div>
                          <button type="button" onClick={() => toggleMember(id, true)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><FiTrash2 size={14} /></button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowEdit(false)}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={createLoading}>{createLoading ? 'Enregistrement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : MEMBRES ───────────────────────────────── */}
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
              {/* Président */}
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: '#fef3c7', borderRadius: '12px', border: '1px solid #fde68a' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#92400e', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Président du CAB</label>
                {!selectedCabForMembers.membres?.some(m => m.role === 'PRESIDENT') ? (
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{ background: '#f59e0b', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}><FiCheckCircle size={18} /></div>
                    <select className="modal-select-cab" style={{ flex: 1, padding: '0.5rem', borderColor: '#fde68a' }} value=""
                      onChange={e => handleUpdatePresident(selectedCabForMembers.id_cab, e.target.value)}
                    >
                      <option value="">Sélectionner un nouveau président...</option>
                      {users.filter(u => u.roles?.some(r => r === 'CHANGE_MANAGER' || r.nom_role === 'CHANGE_MANAGER')).map(u => (
                        <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                      ))}
                    </select>
                  </div>
                ) : (() => {
                  const p = selectedCabForMembers.membres.find(m => m.role === 'PRESIDENT');
                  const u = p.utilisateur || p;
                  return (
                    <div style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #fde68a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Avatar prenom={u.prenom_user} nom={u.nom_user} size={28} radius="50%" />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#92400e' }}>{u.prenom_user} {u.nom_user}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveMemberDirect(selectedCabForMembers, u.id_user)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><FiTrash2 size={14} /></button>
                    </div>
                  );
                })()}
              </div>

              {/* Membres */}
              <div style={{ padding: '1rem', background: '#f1f5f9', borderRadius: '12px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: 800, color: '#475569', marginBottom: '0.5rem', display: 'block', textTransform: 'uppercase' }}>Membres du Comité</label>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ background: '#3b82f6', color: 'white', padding: '0.6rem', borderRadius: '8px', display: 'flex' }}><FiUserPlus size={18} /></div>
                  <select className="modal-select-cab" style={{ flex: 1, padding: '0.5rem' }} value=""
                    onChange={e => handleAddMemberDirect(selectedCabForMembers, e.target.value)}
                  >
                    <option value="">Ajouter un membre...</option>
                    {users
                      .filter(u => u.roles?.some(r => r === 'MEMBRE_CAB' || r.nom_role === 'MEMBRE_CAB'))
                      .filter(u => !selectedCabForMembers.membres?.some(m => (m.id_user || m.utilisateur?.id_user) === u.id_user))
                      .map(u => <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>)
                    }
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {(() => {
                    const membres = selectedCabForMembers.membres?.filter(m => m.role !== 'PRESIDENT') || [];
                    if (membres.length === 0) return (
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontStyle: 'italic', padding: '0.5rem', textAlign: 'center' }}>
                        Aucun membre dans ce comité.
                      </div>
                    );
                    return membres.map(m => {
                      const u = m.utilisateur || m;
                      return (
                        <div key={u.id_user} style={{ background: 'white', padding: '0.5rem 0.75rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #e2e8f0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <Avatar prenom={u.prenom_user} nom={u.nom_user} size={28} radius="50%" />
                            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1e293b' }}>{u.prenom_user} {u.nom_user}</span>
                          </div>
                          <button onClick={() => handleRemoveMemberDirect(selectedCabForMembers, u.id_user)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '4px' }}><FiTrash2 size={14} /></button>
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

      {/* Confirm Delete */}
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