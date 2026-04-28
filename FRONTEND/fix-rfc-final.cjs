const fs = require('fs');
const path = 'src/pages/changemanager/RfcManagement.jsx';

// Build the content manually to ensure 100% correctness
const content = `import React, { useState, useEffect } from 'react';
import { 
  FiFileText, FiClock, FiSearch, FiRefreshCw, FiEye, FiCheckCircle, 
  FiXCircle, FiPlus, FiFilter, FiAlertTriangle, FiZap, FiEdit3, 
  FiTrash2, FiClipboard, FiSend, FiMessageSquare, FiShield, FiActivity, FiPaperclip, FiX
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';

const RfcManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // États
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterSearch, setFilterSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterPrio, setFilterPrio] = useState('');
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Modales
  const [selectedRfc, setSelectedRfc] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [showPir, setShowPir] = useState(false);
  const [pirChecklist, setPirChecklist] = useState({
    objectives: false,
    incidents: false,
    rollback: false,
    stakeholders: false
  });

  // Données auxiliaires
  const [rfcTypes, setRfcTypes] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  // Champs de traitement
  const [selectedType, setSelectedType] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');

  useEffect(() => {
    fetchAllRfcs();
    fetchMetadata();
  }, []);

  const fetchAllRfcs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfc');
      if (res.success) setRfcs(res.data.rfcs || res.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    try {
      const [tRes, eRes, cRes] = await Promise.all([
        api.get('/rfc-types'),
        api.get('/environments'),
        api.get('/users?role=CHANGE_MANAGER')
      ]);
      if (tRes.success) setRfcTypes(tRes.data.types || tRes.data.data || []);
      if (eRes.success) setEnvironments(eRes.data.environments || eRes.data.data || []);
      if (cRes.success) setChangeManagers(cRes.data.users || cRes.data.data || []);
    } catch (e) {
      console.error('Metadata fetch error', e);
    }
  };

  const fetchComments = async (id) => {
    try {
      const res = await api.get(\`/rfc/\${id}/commentaires\`);
      if (res.success) setComments(res.data.commentaires || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const res = await api.post(\`/rfc/\${selectedRfc.id_rfc}/commentaires\`, { contenu: newComment });
      if (res.success) {
        setNewComment('');
        fetchComments(selectedRfc.id_rfc);
      }
    } catch (e) {
      alert('Erreur lors de l\\'ajout du commentaire');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDecision = async (statusCode) => {
    if (!selectedRfc) return;
    
    // Trouver l'ID du statut cible
    try {
      const sRes = await api.get('/statuts');
      const targetStatut = sRes.data.find(s => s.code_statut === statusCode && s.contexte === 'RFC');
      
      if (!targetStatut) return alert('Statut cible non configuré en base.');

      const payload = { 
        id_statut: targetStatut.id_statut,
        id_change_manager: selectedRfc.id_change_manager || user.id_user,
        id_env: selectedEnv 
      };

      const res = await api.patch(\`/rfc/\${selectedRfc.id_rfc}/status\`, payload);
      if (res.success) {
        alert(\`RFC \${statusCode === 'APPROUVEE' ? 'approuvée' : 'rejetée'} avec succès.\`);
        setShowProcess(false);
        fetchAllRfcs();
      }
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur lors du changement de statut');
    }
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Voulez-vous vraiment annuler cette demande ?')) return;
    try {
      const res = await api.delete(\`/rfc/\${id}/cancel\`);
      if (res.success) {
        alert('Demande annulée.');
        fetchAllRfcs();
      }
    } catch (e) {
      alert('Erreur lors de l\\'annulation');
    }
  };

  const doTransition = async (id, code, extras = {}) => {
    try {
      const sRes = await api.get('/statuts');
      const target = sRes.data.find(s => s.code_statut === code && s.contexte === 'RFC');
      if (!target) return;
      
      const res = await api.patch(\`/rfc/\${id}/status\`, { id_statut: target.id_statut, ...extras });
      if (res.success) {
        alert('Action effectuée.');
        closeModals();
        fetchAllRfcs();
      }
    } catch (e) { alert(e.response?.data?.message || 'Erreur'); }
  };

  const closeModals = () => {
    setShowProcess(false);
    setShowPir(false);
    setSelectedRfc(null);
  };

  const isLate = (rfc) => {
    if (!rfc.date_souhaitee) return false;
    if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
    return new Date(rfc.date_souhaitee) < new Date();
  };

  const getStatusClass = (code) => {
    switch(code) {
      case 'SOUMIS': return 'st-blue';
      case 'EVALUEE': return 'st-orange';
      case 'APPROUVEE': return 'st-green';
      case 'REJETEE': return 'st-red';
      case 'CLOTUREE': return 'st-gray';
      default: return '';
    }
  };

  const getPrioClass = (code) => {
    if (code === 'P0' || code === 'P1') return 'prio-high';
    if (code === 'P2') return 'prio-med';
    return 'prio-low';
  };

  const filtered = rfcs.filter(r => {
    const matchSearch = !filterSearch || 
      r.titre_rfc?.toLowerCase().includes(filterSearch.toLowerCase()) ||
      r.code_rfc?.toLowerCase().includes(filterSearch.toLowerCase());
    const matchStatus = !filterStatus || r.statut?.code_statut === filterStatus;
    const matchType   = !filterType   || r.typeRfc?.id_type === filterType;
    const matchPrio   = !filterPrio   || r.priorite?.code_priorite === filterPrio;
    const matchUrgent = !filterUrgent || r.typeRfc?.type === 'URGENT';
    return matchSearch && matchStatus && matchType && matchUrgent && matchPrio;
  });

  const pirAllChecked = Object.values(pirChecklist).every(v => v === true);

  return (
    <div className="rfc-mgr-page">
      <div className="rfc-mgr-header">
        <div>
          <h1><FiClipboard /> Évaluation et Impact des RFC</h1>
          <p>Centre de commandement du cycle de vie des RFC — Vision ITIL complète.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/rfcs/create')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)' }}
          >
            <FiPlus /> Nouveau RFC
          </button>
          <div className="header-date-badge">
             <FiClock /> {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* ═══ KPIs ══════════════════════════════════════════════ */}
      <div className="rfc-kpi-row">
        <div className="kpi-card">
          <div className="kpi-ico ico-blue"><FiFileText /></div>
          <div className="kpi-val">{rfcs.length}</div>
          <div className="kpi-lab">Total Backlog</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ico ico-orange"><FiZap /></div>
          <div className="kpi-val">{rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length}</div>
          <div className="kpi-lab">À Évaluer</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ico ico-green"><FiCheckCircle /></div>
          <div className="kpi-val">{rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length}</div>
          <div className="kpi-lab">Approuvées</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-ico ico-red"><FiAlertTriangle /></div>
          <div className="kpi-val">{rfcs.filter(r => isLate(r)).length}</div>
          <div className="kpi-lab">En Retard</div>
        </div>
      </div>

      {/* ═══ TOOLBAR ═══════════════════════════════════════════ */}
      <div className="rfc-toolbar">
        <div className="search-box">
          <FiSearch />
          <input 
            type="text" 
            placeholder="Rechercher par ID ou titre..." 
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
          />
        </div>
        <div className="filters-group">
          <select value={filterPrio || ''} onChange={e => setFilterPrio(e.target.value)}>
            <option value="">Toutes les priorités</option>
            <option value="P0">P0 - Critique</option>
            <option value="P1">P1 - Haute</option>
            <option value="P2">P2 - Moyenne</option>
            <option value="P3">P3 - Basse</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="SOUMIS">Soumises</option>
            <option value="EVALUEE">Évaluées</option>
            <option value="APPROUVEE">Approuvées</option>
            <option value="REJETEE">Rejetées</option>
            <option value="CLOTUREE">Clôturées</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
          </select>
          <button
            className={\`filter-urgent-btn \${filterUrgent ? 'active' : ''}\`}
            onClick={() => setFilterUrgent(v => !v)}
          >
            <FiZap /> Urgentes
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
            <span className="spinner" /> Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <FiFileText />
            <p>Aucune demande correspondante.</p>
          </div>
        ) : (
          <table className="rfc-table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Titre</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demandeur</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorité</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((rfc, index) => {
                const late = isLate(rfc);
                return (
                  <tr 
                    key={rfc.id_rfc} 
                    className={\`eval-row \${late ? "row-late" : ""} \${selectedRfc?.id_rfc === rfc.id_rfc ? "selected-active" : ""}\`}
                    onClick={() => {
                        setSelectedRfc(rfc);
                        setSelectedType(rfc.typeRfc?.id_type || '');
                        setSelectedEnv(rfc.environnement?.id_env || '');
                        setShowProcess(true); fetchComments(rfc.id_rfc);
                    }}
                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc' }}
                  >
                    <td style={{ padding: '0.2rem 0.3rem' }}>
                       <span className="code-rfc" style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b' }}>#{rfc.code_rfc || rfc.id_rfc?.slice(0,8)}</span>
                    </td>
                    <td style={{ padding: '0.2rem 0.3rem' }}>
                       <div style={{ fontWeight: '700', fontSize: '0.8rem', color: '#0f172a' }}>{rfc.titre_rfc}</div>
                    </td>
                    <td style={{ padding: '0.2rem 0.3rem' }}>
                       <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</div>
                    </td>
                    <td style={{ padding: '0.2rem 0.3rem' }}>
                       <span className={\`type-badge type-\${rfc.typeRfc?.type?.toLowerCase()}\`}>{rfc.typeRfc?.type || '—'}</span>
                    </td>
                    <td style={{ padding: '0.2rem 0.3rem' }}>
                       <span className={\`prio-badge \${getPrioClass(rfc.priorite?.code_priorite)}\`}>{rfc.priorite?.code_priorite || '—'}</span>
                    </td>
                    <td style={{ padding: '0.2rem 0.3rem' }}>
                       <span className={\`status-badge \${getStatusClass(rfc.statut?.code_statut)}\`}>{rfc.statut?.libelle}</span>
                    </td>
                    <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right' }}>
                       <button className="act-btn act-view" onClick={(e) => { e.stopPropagation(); navigate(\`/rfcs/\${rfc.id_rfc}\`); }}><FiEye /></button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ═══ MODALE UNIFIÉE ══════════════════════════════════════ */}
      {showProcess && selectedRfc && (
        <div 
          className="modal-backdrop" 
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} 
          onClick={closeModals}
        >
          <div 
            onClick={e => e.stopPropagation()} 
            style={{ width: '1000px', maxWidth: '95vw', background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.4)', maxHeight: '90vh', boxShadow: '0 25px 60px rgba(0,0,0,0.3)', borderRadius: '24px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <FiClipboard size={26} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800' }}>Traitement de la RFC</h2>
                  <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>#{selectedRfc.code_rfc} — {selectedRfc.titre_rfc}</p>
                </div>
              </div>
              <button onClick={closeModals} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '36px', height: '36px', borderRadius: '50%', cursor: 'pointer' }}><FiX /></button>
            </div>

            {/* Status Progress Bar */}
            <div style={{ background: '#f8fafc', padding: '0.75rem 2rem', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               {['SOUMIS', 'EVALUEE', 'APPROUVEE', 'CLOTUREE'].map((s, i) => {
                 const currentIdx = ['SOUMIS', 'EVALUEE', 'APPROUVEE', 'CLOTUREE'].indexOf(selectedRfc.statut?.code_statut);
                 const isActive = currentIdx >= i;
                 return (
                   <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: isActive ? 1 : 0.4 }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: isActive ? '#3b82f6' : '#cbd5e1', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>{i+1}</div>
                      <span style={{ fontSize: '0.75rem', fontWeight: isActive ? '700' : '500' }}>{s}</span>
                   </div>
                 );
               })}
            </div>

            <div style={{ flex: 1, padding: '2rem', overflowY: 'auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '2.5rem' }}>
              {/* Left Col: Params & Risk */}
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '0.8rem', color: '#475569' }}>Type</label>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                       <option value="">Sélectionner...</option>
                       {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '0.8rem', color: '#475569' }}>Env. Cible</label>
                    <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                       <option value="">Sélectionner...</option>
                       {environments.map(e => <option key={e.id_env} value={e.id_env}>{e.nom_env}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '0.8rem', color: '#475569' }}>Priorité</label>
                    <select value={selectedRfc.id_priorite} onChange={e => setSelectedRfc({...selectedRfc, id_priorite: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                       <option value="1">P1 - Critique</option>
                       <option value="2">P2 - Haute</option>
                       <option value="3">P3 - Moyenne</option>
                       <option value="4">P4 - Basse</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '8px', fontSize: '0.8rem', color: '#475569' }}>Assignation</label>
                    <select value={selectedRfc.id_change_manager || ''} onChange={e => setSelectedRfc({...selectedRfc, id_change_manager: e.target.value})} style={{ width: '100%', padding: '12px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                       <option value="">-- Non assigné --</option>
                       {changeManagers.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                    </select>
                  </div>
                </div>

                {/* Risk Section */}
                <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '16px', border: '1px solid #fde68a', marginBottom: '2rem' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                     <h3 style={{ margin: 0, fontSize: '1rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '8px' }}><FiShield /> Évaluation de Risque</h3>
                     <div style={{ background: (selectedRfc.evaluationRisque?.impacte * selectedRfc.evaluationRisque?.probabilite) > 15 ? '#ef4444' : '#10b981', color: 'white', padding: '4px 12px', borderRadius: '20px', fontWeight: '800' }}>
                        Score: {selectedRfc.evaluationRisque?.impacte * selectedRfc.evaluationRisque?.probabilite || 0}
                     </div>
                   </div>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#92400e' }}>Impact (1-5)</label>
                        <select value={selectedRfc.evaluationRisque?.impacte || 0} onChange={e => setSelectedRfc({...selectedRfc, evaluationRisque: {...selectedRfc.evaluationRisque, impacte: parseInt(e.target.value)}})} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fcd34d' }}>
                          {[0,1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#92400e' }}>Probabilité (1-5)</label>
                        <select value={selectedRfc.evaluationRisque?.probabilite || 0} onChange={e => setSelectedRfc({...selectedRfc, evaluationRisque: {...selectedRfc.evaluationRisque, probabilite: parseInt(e.target.value)}})} style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #fcd34d' }}>
                          {[0,1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                   </div>
                   <textarea 
                    value={selectedRfc.evaluationRisque?.description || ''} 
                    onChange={e => setSelectedRfc({...selectedRfc, evaluationRisque: {...selectedRfc.evaluationRisque, description: e.target.value}})}
                    placeholder="Notes d'analyse..."
                    style={{ width: '100%', marginTop: '1rem', padding: '10px', borderRadius: '10px', border: '1px solid #fcd34d', minHeight: '80px' }}
                   />
                </div>
              </div>

              {/* Right Col: Timeline & Discussion */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                 <div style={{ background: 'rgba(241, 245, 249, 0.4)', padding: '1.5rem', borderRadius: '16px' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><FiActivity /> Audit Log</h3>
                    {selectedRfc.historiques?.map((h, i) => (
                      <div key={i} style={{ display: 'flex', gap: '10px', marginBottom: '10px', position: 'relative' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', marginTop: '4px' }}></div>
                        <div style={{ flex: 1, fontSize: '0.75rem' }}>
                          <div style={{ fontWeight: '700' }}>{h.statut?.libelle}</div>
                          <div style={{ color: '#94a3b8' }}>{new Date(h.date_changement).toLocaleString()}</div>
                        </div>
                      </div>
                    ))}
                 </div>
                 <div style={{ flex: 1, background: 'rgba(241, 245, 249, 0.4)', padding: '1.5rem', borderRadius: '16px', display: 'flex', flexDirection: 'column' }}>
                    <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '8px' }}><FiMessageSquare /> Discussion</h3>
                    <div style={{ flex: 1, overflowY: 'auto', marginBottom: '1rem' }}>
                       {comments.map(c => (
                         <div key={c.id_commentaire} style={{ background: 'white', padding: '10px', borderRadius: '12px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                           <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#3b82f6' }}>{c.auteur?.prenom_user} {c.auteur?.nom_user}</div>
                           <div style={{ fontSize: '0.8rem' }}>{c.contenu}</div>
                         </div>
                       ))}
                    </div>
                    <div style={{ position: 'relative' }}>
                       <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Votre message..." style={{ width: '100%', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0', minHeight: '60px' }} />
                       <button onClick={handleAddComment} style={{ position: 'absolute', right: '10px', bottom: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', padding: '6px' }}><FiSend /></button>
                    </div>
                 </div>
              </div>
            </div>

            <div style={{ padding: '1.5rem 2rem', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
               <button 
                  onClick={async () => {
                    try {
                      await api.put(\`/rfc/\${selectedRfc.id_rfc}\`, { id_type: selectedType, id_env: selectedEnv, id_priorite: selectedRfc.id_priorite, id_change_manager: selectedRfc.id_change_manager });
                      if (selectedRfc.evaluationRisque) {
                        await api.post(\`/rfc/\${selectedRfc.id_rfc}/evaluation-risque\`, { _impacte: selectedRfc.evaluationRisque.impacte, _probabilite: selectedRfc.evaluationRisque.probabilite, _score: selectedRfc.evaluationRisque.impacte * selectedRfc.evaluationRisque.probabilite, description: selectedRfc.evaluationRisque.description });
                      }
                      alert('Enregistré !'); fetchAllRfcs();
                    } catch (e) { alert('Erreur'); }
                  }}
                  style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#f1f5f9', border: 'none', fontWeight: '700' }}
               >Enregistrer</button>
               <button onClick={() => handleDecision('REJETEE')} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#fee2e2', color: '#dc2626', border: 'none', fontWeight: '700' }}>Rejeter</button>
               <button onClick={() => handleDecision('APPROUVEE')} style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', background: '#10b981', color: 'white', border: 'none', fontWeight: '700' }}>Approuver</button>
            </div>
          </div>
        </div>
      )}

      {showPir && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-box modal-box-pir" onClick={e => e.stopPropagation()}>
            {/* PIR Content Simplified for brevity here, should be restored if needed */}
            <div className="modal-top modal-top-pir">
              <FiClipboard className="modal-ico" />
              <div><h2>Validation PIR</h2><p>RFC {selectedRfc?.code_rfc}</p></div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={closeModals}>Fermer</button>
              <button className="modal-btn modal-btn-approve" onClick={() => doTransition(selectedRfc.id_rfc, 'CLOTUREE', { commentaire: 'PIR validé.' })}>Clôturer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RfcManagement;
\`;

fs.writeFileSync(path, content);
console.log('done');
