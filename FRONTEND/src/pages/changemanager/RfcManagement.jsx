import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiSearch, FiRefreshCw, FiFilter,
  FiEye, FiActivity, FiCheckCircle, FiXCircle, FiTrash2, FiEdit3,
  FiAlertTriangle, FiAlertCircle, FiClock, FiFileText,
  FiZap, FiArrowRight, FiClipboard, FiUser, FiCalendar, FiInfo, FiEdit2, FiX
} from 'react-icons/fi';
import api from '../../api/axios';
import './RfcManagement.css';

/* ─── KPI Card ── */
const KpiCard = ({ label, value, icon, color, sub }) => (
  <div className={`kpi-card kpi-${color}`}>
    <div className="kpi-icon">{icon}</div>
    <div className="kpi-body">
      <span className="kpi-value">{value}</span>
      <span className="kpi-label">{label}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  </div>
);

/* ─── Status helpers ── */
const getStatusClass = (code) => {
  switch (code) {
    case 'SOUMIS':    return 'status-working';
    case 'EVALUEE':   return 'status-working';
    case 'APPROUVEE': return 'status-success';
    case 'REJETEE':   return 'status-danger';
    case 'CLOTUREE':  return 'status-neutral';
    default:          return 'status-neutral';
  }
};

const IMPACT_TEMPLATES = {
  COMPLET: `**[ÉVALUATION D'IMPACT COMPLET]**
- IMPACT TECHNIQUE : (Ressources serveurs, BD, Réseau)
- IMPACT UTILISATEUR : (Nombre d'utilisateurs, temps d'interruption)
- IMPACT MÉTIER : (Processus critiques impactés)`,
  MINEUR: `**[IMPACT FAIBLE]**
Changement standard à faible risque.
Aucune interruption de service prévue.`
};

const getPrioClass = (code) => {
  if (!code) return '';
  if (code === 'P0' || code === 'P1') return 'prio-critical';
  if (code === 'P2' || code === 'P3') return 'prio-high';
  return 'prio-normal';
};

const isLate = (rfc) => {
  if (!rfc.date_souhaitee) return false;
  const deadline = new Date(rfc.date_souhaitee);
  const now = new Date();
  const isOpen = ['SOUMIS', 'EVALUEE'].includes(rfc.statut?.code_statut);
  return isOpen && deadline < now;
};

/* ─── Main Component ── */
const RfcManagement = () => {
  const navigate = useNavigate();

  // Data
  const [rfcs,     setRfcs]     = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [envs,     setEnvs]     = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Decision modals
  const [selectedRfc,    setSelectedRfc]    = useState(null);
  const [showProcess,    setShowProcess]    = useState(false);
  const [selectedType,   setSelectedType]   = useState('');
  const [rfcTypes,       setRfcTypes]       = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [submitting,     setSubmitting]     = useState(false);
  
  const [showReject,     setShowReject]     = useState(false);
  const [showApprove,    setShowApprove]    = useState(false);
  const [showPir,        setShowPir]        = useState(false);
  const [rejectReason,   setRejectReason]   = useState('');
  const [approveComment, setApproveComment] = useState('');
  const [selectedEnv,    setSelectedEnv]    = useState('');
  const [pirChecklist,   setPirChecklist]   = useState({
    objectives: false, incidents: false, rollback: false, stakeholders: false,
  });

  /* ── Fetch ── */
  const fetchAllRfcs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfc');
      if (res.success) setRfcs(res.data.rfcs || []);
    } catch (e) {
      console.error('RFC Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllRfcs();
    (async () => {
      try {
        const results = await Promise.allSettled([
          api.get('/admin/statuts?contexte=RFC'),
          api.get('/admin/environnements'),
          api.get('/users/by-role/CHANGE_MANAGER'),
          api.get('/admin/types-rfc')
        ]);
        
        const sRes = results[0].status === 'fulfilled' ? results[0].value : null;
        const eRes = results[1].status === 'fulfilled' ? results[1].value : null;
        const cRes = results[2].status === 'fulfilled' ? results[2].value : null;
        const tRes = results[3].status === 'fulfilled' ? results[3].value : null;

        if (sRes?.success) setStatuses(sRes.data.statuts || []);
        if (eRes?.success) setEnvs(eRes.data.environnements || []);
        if (cRes?.success) setChangeManagers(cRes.data.users || cRes.data.data || []);
        if (tRes?.success) setRfcTypes(tRes.data.types || []);
      } catch (e) { console.error('Ref data catch:', e); }
    })();
  }, []);

  /* ── KPIs ── */
  const visibleRfcs = rfcs.filter(r => !['SOUMIS', 'A_COMPLETER', 'REFUSEE_SD'].includes(r.statut?.code_statut));

  const kpi = {
    total:    visibleRfcs.length,
    pending:  visibleRfcs.filter(r => r.statut?.code_statut === 'ACCEPTEE_SD').length,
    evalued:  visibleRfcs.filter(r => r.statut?.code_statut === 'EVALUEE').length,
    approved: visibleRfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length,
    rejected: visibleRfcs.filter(r => r.statut?.code_statut === 'REJETEE').length,
    late:     visibleRfcs.filter(r => isLate(r)).length,
    urgent:   visibleRfcs.filter(r => r.typeRfc?.type === 'URGENT').length,
  };

  /* ── Filter ── */
  const filtered = visibleRfcs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.titre_rfc?.toLowerCase().includes(q) ||
      r.code_rfc?.toLowerCase().includes(q) ||
      `${r.demandeur?.nom_user} ${r.demandeur?.prenom_user}`.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.statut?.code_statut === filterStatus;
    const matchType   = !filterType   || r.typeRfc?.type === filterType;
    const matchUrgent = !filterUrgent || r.typeRfc?.type === 'URGENT';
    return matchSearch && matchStatus && matchType && matchUrgent;
  });

  /* ── Status transition ── */
  const closeModals = () => {
    setShowReject(false); setShowApprove(false); setShowPir(false); setShowProcess(false);
    setSelectedRfc(null); setRejectReason(''); setApproveComment(''); setSelectedEnv('');
    setSelectedType(''); setAnalysis('');
    setPirChecklist({ objectives: false, incidents: false, rollback: false, stakeholders: false });
  };

  const doTransition = async (rfcId, statusCode, extras = {}) => {
    const target = statuses.find(s => s.code_statut === statusCode);
    if (!target) return alert(`Statut "${statusCode}" introuvable dans la base.`);
    try {
      const res = await api.patch(`/rfc/${rfcId}/status`, { id_statut: target.id_statut, ...extras });
      if (res.success) { fetchAllRfcs(); closeModals(); }
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleDecision = async (statusCode) => {
    if (!selectedRfc || !selectedType) {
      alert('Veuillez sélectionner le type de la demande.');
      return;
    }
    
    const targetStatus = statuses.find(s => s.code_statut === statusCode);
    if (!targetStatus) return alert(`Statut ${statusCode} introuvable.`);

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const extras = {
        id_type: selectedType
    };

    if (statusCode === 'APPROUVEE') {
      if (!selectedEnv) return alert('Sélectionnez un Environnement cible pour approuver.');
      extras.id_change_manager = user.id_user;
      extras.id_env = selectedEnv;
    }

    setSubmitting(true);
    try {
      const res = await api.patch(`/rfc/${selectedRfc.id_rfc}/status`, {
        id_statut: targetStatus.id_statut,
        ...extras
      });

      if (res.success) {
        fetchAllRfcs();
        closeModals();
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors du changement de statut.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    doTransition(selectedRfc.id_rfc, 'APPROUVEE', {
      id_env: selectedEnv,
      id_change_manager: user.id_user,
      commentaire: approveComment
    });
  };

  const handleReject = () => {
    doTransition(selectedRfc.id_rfc, 'REJETEE', { commentaire: rejectReason });
  };

  const handleCancel = (rfcId) => {
    if (window.confirm('Annuler cette demande ?')) doTransition(rfcId, 'CLOTUREE');
  };

  const pirAllChecked = Object.values(pirChecklist).every(Boolean);

  /* ── Render ── */
  return (
    <div className="rfc-mgr-page">

      {/* ═══ HEADER ════════════════════════════════════════════ */}
      <div className="rfc-mgr-header">
        <div>
          <h1><FiClipboard /> Évaluation et Impact des RFC</h1>
          <p>Centre de commandement du cycle de vie des RFC — Vision ITIL complète.</p>
        </div>
        <div className="header-date-badge">
          <FiCalendar />
          {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      {/* ═══ KPI ROW ═══════════════════════════════════════════ */}
      <div className="kpi-row">
        <KpiCard label="Total RFC"       value={kpi.total}    icon={<FiFileText />}      color="blue"   />
        <KpiCard label="Soumises"        value={kpi.pending}  icon={<FiClock />}         color="purple" sub="En attente d'évaluation" />
        <KpiCard label="Évaluées"        value={kpi.evalued}  icon={<FiActivity />}      color="orange" sub="Décision requise" />
        <KpiCard label="Approuvées"      value={kpi.approved} icon={<FiCheckCircle />}   color="green"  />
        <KpiCard label="Rejetées"        value={kpi.rejected} icon={<FiXCircle />}       color="red"    />
        <KpiCard label="Urgentes"        value={kpi.urgent}   icon={<FiZap />}           color="amber"  />
        <KpiCard label="En Retard"       value={kpi.late}     icon={<FiAlertTriangle />} color="danger" sub="Délai dépassé" />
      </div>

      {/* ═══ TOOLBAR ════════════════════════════════════════════ */}
      <div className="rfc-mgr-toolbar">
        <div className="search-wrapper">
          <FiSearch className="search-ico" />
          <input
            type="text"
            placeholder="Rechercher par titre, ID ou demandeur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="ACCEPTEE_SD">Acceptées (Triage)</option>
            <option value="EVALUEE">Évaluées</option>
            <option value="APPROUVEE">Approuvées</option>
            <option value="REJETEE">Rejetées</option>
            <option value="CLOTUREE">Clôturées</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            <option value="STANDARD">Standard</option>
            <option value="NORMAL">Normal</option>
            <option value="URGENT">Urgent</option>
          </select>
          <button
            className={`filter-urgent-btn ${filterUrgent ? 'active' : ''}`}
            onClick={() => setFilterUrgent(v => !v)}
          >
            <FiZap /> Urgentes seulement
          </button>
          <button className="refresh-btn" onClick={fetchAllRfcs} title="Actualiser">
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* ═══ TABLE ══════════════════════════════════════════════ */}
      <div className="rfc-table-card">
        {loading ? (
          <div className="table-loading">
            <span className="spinner" /> Chargement du backlog...
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <FiFileText />
            <p>Aucune demande ne correspond aux filtres sélectionnés.</p>
          </div>
        ) : (
          <table className="rfc-table">
            <thead>
              <tr>
                <th>ID / RFC</th>
                <th>Demande</th>
                <th>Demandeur</th>
                <th>Type</th>
                <th>Priorité</th>
                <th>Délai Souhaité</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rfc => {
                const late = isLate(rfc);
                return (
                  <tr 
                    key={rfc.id_rfc} 
                    className={`eval-row ${late ? 'row-late' : ''} ${selectedRfc?.id_rfc === rfc.id_rfc ? 'selected-active' : ''}`}
                    onClick={() => {
                        setSelectedRfc(rfc);
                        setSelectedType(rfc.typeRfc?.id_type || '');
                        setShowProcess(true);
                    }}
                  >
                    {/* ID */}
                    <td>
                      <div className="td-id">
                        <span className="code-rfc">#{rfc.code_rfc || rfc.id_rfc?.slice(0,8)}</span>
                        {late && (
                          <span className="late-badge" title="Délai dépassé">
                            <FiAlertTriangle /> Retard
                          </span>
                        )}
                        {rfc.typeRfc?.type === 'URGENT' && (
                          <span className="urgent-badge"><FiZap /> Urgent</span>
                        )}
                      </div>
                    </td>

                    {/* Title */}
                    <td className="td-main">
                      <div className="rfc-title-main">{rfc.titre_rfc}</div>
                      <div className="rfc-desc-preview">
                        {rfc.description?.slice(0, 70)}{rfc.description?.length > 70 ? '…' : ''}
                      </div>
                    </td>

                    {/* Demandeur */}
                    <td>
                      <div className="demandeur-info">
                        <div className="avatar-mini">{rfc.demandeur?.prenom_user?.[0]}{rfc.demandeur?.nom_user?.[0]}</div>
                        <div>
                          <div className="dem-name">{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</div>
                          <div className="dem-dir">{rfc.demandeur?.direction?.nom_direction || 'Service Interne'}</div>
                        </div>
                      </div>
                    </td>

                    {/* Type */}
                    <td>
                      <span className={`type-badge type-${rfc.typeRfc?.type?.toLowerCase()}`}>
                        {rfc.typeRfc?.type || '—'}
                      </span>
                    </td>

                    {/* Priorité */}
                    <td>
                      <span className={`prio-badge ${getPrioClass(rfc.priorite?.code_priorite)}`}>
                        {rfc.priorite?.code_priorite || '—'}
                      </span>
                    </td>

                    {/* Deadline */}
                    <td className="td-deadline">
                      {rfc.date_souhaitee ? (
                        <div className={`deadline-cell ${late ? 'deadline-late' : ''}`}>
                          <FiClock />
                          {new Date(rfc.date_souhaitee).toLocaleDateString('fr-FR')}
                        </div>
                      ) : <span className="no-deadline">—</span>}
                    </td>

                    {/* Statut */}
                    <td>
                      <span className={`status-badge ${getStatusClass(rfc.statut?.code_statut)}`}>
                        {rfc.statut?.libelle}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="td-actions">
                      <div className="actions-cell">
                        {/* Toujours : Consulter */}
                        <button
                          className="act-btn act-view"
                          title="Consulter le détail"
                          onClick={() => navigate(`/rfcs/${rfc.id_rfc}`)}
                        >
                          <FiEye />
                        </button>

                        {/* ACCEPTEE_SD → Modifier */}
                        {rfc.statut?.code_statut === 'ACCEPTEE_SD' && (
                          <button className="act-btn act-edit" title="Modifier" onClick={(e) => { e.stopPropagation(); navigate(`/rfcs/${rfc.id_rfc}/edit`); }}>
                            <FiEdit3 />
                          </button>
                        )}

                        {/* APPROUVEE → PIR */}
                        {rfc.statut?.code_statut === 'APPROUVEE' && (
                          <button className="act-btn act-pir" title="Validation PIR"
                            onClick={(e) => { e.stopPropagation(); setSelectedRfc(rfc); setShowPir(true); }}>
                            <FiClipboard />
                          </button>
                        )}

                        {/* ACCEPTEE_SD / EVALUEE → Annuler */}
                        {['ACCEPTEE_SD', 'EVALUEE'].includes(rfc.statut?.code_statut) && (
                          <button className="act-btn act-cancel" title="Annuler"
                            onClick={(e) => { e.stopPropagation(); handleCancel(rfc.id_rfc); }}>
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {!loading && (
          <div className="table-footer">
            <span>{filtered.length} demande{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''}</span>
            <span>Total backlog : {rfcs.length}</span>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — REJETER                                        */}
      {/* ═══════════════════════════════════════════════════════ */}
      {/* Les anciennes modales Reject/Approve ont été remplacées par la modale unifiée showProcess */}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — ÉVALUATION & TRAITEMENT (UNIFIÉ)                */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showProcess && selectedRfc && (
        <div 
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 8999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} 
          onClick={closeModals}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ 
              width: '800px', maxWidth: '95vw', background: 'white', maxHeight: '90vh', 
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', 
              borderRadius: '12px',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
              animation: 'fadeIn 0.3s ease-out'
            }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiActivity size={24} opacity={0.9} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Évaluation & Décision Manager</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>RFC #{selectedRfc.code_rfc || selectedRfc.id_rfc?.slice(0,8)} — {selectedRfc.titre_rfc}</p>
                </div>
              </div>
              <button 
                onClick={closeModals} 
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="rfc-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              {/* Détails Demande */}
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                 <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiInfo /> Détails de la Demande
                 </h3>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Titre</label>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{selectedRfc.titre_rfc}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Demandeur</label>
                        <div style={{ fontSize: '0.9rem' }}>{selectedRfc.demandeur?.prenom_user} {selectedRfc.demandeur?.nom_user}</div>
                    </div>
                 </div>
                 <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description</label>
                    <div style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{selectedRfc.description}</div>
                 </div>
              </div>

              {/* Analyse Impact */}
              <div className="decision-form">
                 <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiActivity /> Analyse et Décision
                 </h3>
                 
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.8rem', color: '#475569' }}>Cibler l'Environnement <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                        <option value="">-- Sélectionner l'environnement --</option>
                        {envs.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.8rem', color: '#475569' }}>Type RFC / Workflow <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                        <option value="">-- Sélectionner le type --</option>
                        {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                      </select>
                    </div>
                 </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button 
                  onClick={() => navigate(`/rfcs/${selectedRfc.id_rfc}/edit`)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#64748b', background: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FiEdit3 size={16} /> Modifier
                </button>
                <button 
                  onClick={() => handleDecision('REJETEE')}
                  disabled={submitting}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', filter: submitting ? 'opacity(0.7)' : 'none' }}
                >
                  <FiXCircle size={18} /> {submitting ? 'En cours...' : 'Rejeter RFC'}
                </button>
                <button 
                  onClick={() => handleDecision('APPROUVEE')}
                  disabled={submitting || !selectedType || !selectedEnv}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', filter: (submitting || !selectedEnv) ? 'opacity(0.7)' : 'none' }}
                >
                  <FiCheckCircle size={18} /> {submitting ? 'En cours...' : 'Approuver (Transmettre AU CAB)'}
                </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* MODAL — POST-IMPLEMENTATION REVIEW (PIR)               */}
      {/* ═══════════════════════════════════════════════════════ */}
      {showPir && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-box modal-box-pir" onClick={e => e.stopPropagation()}>
            <div className="modal-top modal-top-pir">
              <FiClipboard className="modal-ico" />
              <div>
                <h2>Validation Post-Implémentation (PIR)</h2>
                <p>RFC <strong>{selectedRfc?.code_rfc}</strong> — {selectedRfc?.titre_rfc}</p>
              </div>
            </div>
            <div className="modal-body">
              <p className="pir-intro">
                Utilisez cette checklist pour valider que l'implémentation s'est déroulée conformément aux exigences ITIL.
              </p>
              <div className="pir-checklist">
                {[
                  { key: 'objectives',   label: 'Les objectifs du changement ont été atteints.' },
                  { key: 'incidents',    label: 'Aucun incident critique lié au changement n\'a été détecté.' },
                  { key: 'rollback',     label: 'Le plan de rollback a été validé ou n\'est plus nécessaire.' },
                  { key: 'stakeholders',label: 'Les parties prenantes ont été informées du résultat.' },
                ].map(item => (
                  <label key={item.key} className={`pir-item ${pirChecklist[item.key] ? 'checked' : ''}`}>
                    <input
                      type="checkbox"
                      checked={pirChecklist[item.key]}
                      onChange={() => setPirChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }))}
                    />
                    <div className="pir-check-icon"><FiCheckCircle /></div>
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
              {!pirAllChecked && (
                <p className="pir-warning"><FiAlertTriangle /> Tous les points doivent être validés avant de clôturer.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={closeModals}>Fermer</button>
              <button
                className="modal-btn modal-btn-approve"
                disabled={!pirAllChecked}
                onClick={() => doTransition(selectedRfc.id_rfc, 'CLOTUREE', { commentaire: 'PIR validé par le Change Manager.' })}
              >
                <FiCheckCircle /> Clôturer le Changement
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default RfcManagement;
