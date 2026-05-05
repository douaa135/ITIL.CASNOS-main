import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiLayers, FiClock, FiInfo, FiActivity, FiX, FiFileText, FiCheckCircle, FiEdit2, FiXCircle, 
  FiExternalLink, FiArrowRight, FiRefreshCw, FiSend, FiFilter, FiUser, FiZap, FiTrash2, FiAlertTriangle, 
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiClipboard, FiCalendar, FiFlag
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import Toast from '../../components/common/Toast';
import Badge from '../../components/common/Badge';
import Avatar from '../../components/common/Avatar';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import './InquiryHub.css';
import '../changemanager/RfcManagement.css'; // On importe le CSS de l'admin pour avoir les mêmes classes

const InquiryHub = () => {
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const [statuses, setStatuses] = useState([]);
  const [environnements, setEnvironnements] = useState([]);
  const [rfcTypes, setRfcTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);

  // États du formulaire de triage
  const [selectedType, setSelectedType] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [analysis, setAnalysis] = useState('');

  const [kpiFilter, setKpiFilter] = useState('SOUMIS');
  const [filterType, setFilterType] = useState('');
  const [filterDemandeur, setFilterDemandeur] = useState('');
  const [filterEnv, setFilterEnv] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rfcService.getAllRfcs();
      setRfcs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Inquiry Hub Fetch Error:', error);
      showToast('Erreur lors de la récupération des données.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const fetchReferenceData = async () => {
      try {
        const [stats, envs, types, prios] = await Promise.all([
          rfcService.getStatuts('RFC'),
          rfcService.getEnvironnements(),
          rfcService.getTypesRfc(),
          rfcService.getPriorites()
        ]);
        setStatuses(stats);
        setEnvironnements(envs);
        setRfcTypes(types);
        setPriorities(prios);
      } catch (e) { console.error('Ref data error:', e); }
    };
    fetchReferenceData();
  }, [fetchData]);

  const handleOpenTriage = (item) => {
    setSelectedItem(item);
    setSelectedType(item.id_type || item.typeRfc?.id_type || '');
    setSelectedEnv(item.id_env || item.environnement?.id_env || '');
    setSelectedPriority(item.id_priorite || item.priorite?.id_priorite || '');
    setAnalysis('');
  };

  const handlePreevaluer = async () => {
    if (!selectedItem) return;
    const preApprouvedStatus = statuses.find(s => s.code_statut === 'PRE_APPROUVEE');
    if (!preApprouvedStatus) { showToast('Statut PRE_APPROUVEE introuvable.', 'error'); return; }

    setSubmitting(true);
    try {
      await api.put(`/rfc/${selectedItem.id_rfc}`, {
        id_type: selectedType || undefined,
        id_env: selectedEnv || undefined,
        id_priorite: selectedPriority || undefined,
      });

      await api.patch(`/rfc/${selectedItem.id_rfc}/status`, {
        id_statut: preApprouvedStatus.id_statut,
        commentaire: analysis.trim() || 'Pré-évaluation Service Desk — Transfert au Change Manager.'
      });

      showToast('✅ RFC pré-évaluée et transférée au Change Manager avec succès !', 'success');
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      showToast('Erreur lors de la pré-évaluation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTriageDecision = async (statusCode) => {
    if (!selectedItem) return;
    const targetStatus = statuses.find(s => s.code_statut === statusCode);
    if (!targetStatus) { showToast('Statut introuvable.', 'error'); return; }

    setSubmitting(true);
    try {
      await api.patch(`/rfc/${selectedItem.id_rfc}/status`, {
        id_statut: targetStatus.id_statut,
        commentaire: analysis.trim() || undefined
      });
      showToast(`RFC mise à jour vers le statut ${statusCode} avec succès.`, 'success');
      setSelectedItem(null);
      fetchData();
    } catch (error) {
      showToast('Erreur lors du traitement du triage.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const isLate = (rfc) => {
    if (!rfc.date_souhaitee) return false;
    if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
    return new Date(rfc.date_souhaitee) < new Date();
  };

  const filteredData = rfcs.filter(r => {
    const q = searchTerm.toLowerCase();
    const matchSearch = !searchTerm ||
      r.titre_rfc?.toLowerCase().includes(q) ||
      r.code_rfc?.toLowerCase().includes(q) ||
      `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}`.toLowerCase().includes(q);

    const matchStatus = r.statut?.code_statut === 'SOUMIS';
    const matchType = !filterType || r.typeRfc?.id_type === filterType || r.id_type === filterType;
    const matchEnv = !filterEnv || r.environnement?.id_env === filterEnv || r.id_env === filterEnv;
    const matchDemandeur = !filterDemandeur ||
      `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}`.toLowerCase().includes(filterDemandeur.toLowerCase());

    return matchSearch && matchStatus && matchType && matchEnv && matchDemandeur;
  });

  const demandeurs = useMemo(() => {
    const seen = new Set();
    return rfcs
      .filter(r => r.statut?.code_statut === 'SOUMIS')
      .filter(r => {
        const key = `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .map(r => ({ label: `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}`, value: `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}` }));
  }, [rfcs]);

  const kpiBacklog  = rfcs.filter(r => !['CLOTUREE', 'ANNULEE'].includes(r.statut?.code_statut)).length;
  const kpiSoumis   = rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length;
  const kpiLate     = rfcs.filter(r => isLate(r)).length;
  const kpiApprouve = rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length;

  // Styles identiques à l'admin
  const thStyle = {
    padding: '12px 16px', 
    fontSize: '0.7rem', 
    fontWeight: 700, 
    textTransform: 'uppercase', 
    letterSpacing: '0.07em', 
    color: '#64748b', 
    textAlign: 'left', 
    whiteSpace: 'nowrap'
  };

  const tdStyle = {
    padding: '14px 16px', 
    fontSize: '0.875rem', 
    color: '#334155', 
    verticalAlign: 'middle'
  };

  return (
    <div className="rfc-mgr-page" style={{ padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      
      {/* ── HEADER IDENTIQUE ADMIN ─────────────────────────────────────────── */}
      <div className="rfc-mgr-header">
        <div>
          <h1><FiClipboard /> Service Desk Hub</h1>
          <p>Supervision globale et triage des demandes de changement ITIL</p>
        </div>
        <div className="header-date-badge">
          <FiCalendar /> {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>



      {/* ── TOOLBAR ────────────────────────── */}
      <div className="rfc-mgr-toolbar">
        <div className="search-wrapper">
          <FiSearch className="search-ico" />
          <input type="text" placeholder="Rechercher par titre, code ou demandeur..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="toolbar-filters">
          <select value={filterType} onChange={e => setFilterType(e.target.value)} className="premium-select">
            <option value="">Tous les types</option>
            {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
          </select>
          <select value={filterDemandeur} onChange={e => setFilterDemandeur(e.target.value)} className="premium-select">
            <option value="">Tous les demandeurs</option>
            {demandeurs.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
          <select value={filterEnv} onChange={e => setFilterEnv(e.target.value)} className="premium-select">
            <option value="">Tous les environnements</option>
            {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
          </select>
          <button className="refresh-btn" onClick={fetchData} title="Actualiser"><FiRefreshCw /></button>
        </div>
      </div>


      {/* ── TABLE ────────────────────────────────── */}
      <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>
                  RFC & Code
                </th>
                <th style={thStyle}>Demandeur</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Priorité</th>
                <th style={thStyle}>Env</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                <th style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement des RFCs...</td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucune RFC trouvée.
                  </td>
                </tr>
              ) : filteredData.map((rfc) => (
                <tr key={rfc.id_rfc} onClick={() => handleOpenTriage(rfc)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  {/* 1. RFC titre + code */}
                  <td style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }} title={rfc.titre_rfc}>
                      {rfc.titre_rfc}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>#{rfc.code_rfc}</div>
                  </td>

                  {/* 2. Demandeur */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <Avatar 
                        prenom={rfc.demandeur?.prenom_user} 
                        nom={rfc.demandeur?.nom_user} 
                        size={34} 
                        radius="10px" 
                      />
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {`${rfc.demandeur?.prenom_user || '—'} ${rfc.demandeur?.nom_user || ''}`.trim()}
                      </span>
                    </div>
                  </td>

                  {/* 3. Type */}
                  <td style={tdStyle}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#f1f5f9', color: '#475569', fontSize: '0.75rem', fontWeight: 600 }}>
                      {rfc.typeRfc?.type || '—'}
                    </span>
                  </td>

                  {/* 4. Priorité */}
                  <td style={tdStyle}>
                    {(() => {
                        const pId = rfc.id_priorite || rfc.priorite?.id_priorite;
                        const p = priorities.find(pr => String(pr.id_priorite) === String(pId));
                        const label = p?.libelle?.toUpperCase() || '—';
                        
                        const colors = {
                          'FAIBLE':   { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7' },
                          'BASSE':    { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
                          'MOYENNE':  { bg: '#fefce8', color: '#a16207', border: '#fef9c3' },
                          'NORMAL':   { bg: '#fefce8', color: '#a16207', border: '#fef9c3' },
                          'HAUTE':    { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' },
                          'URGENT':   { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                          'CRITIQUE': { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                          'P0':       { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                          'P1':       { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                        };
                        const style = colors[label] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                        return (
                          <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                            {p?.libelle || '—'}
                          </span>
                        );
                      })()}
                  </td>

                  {/* 5. Env */}
                  <td style={tdStyle}>
                    <span style={{ padding: '4px 10px', borderRadius: '6px', background: '#f8fafc', color: '#475569', fontSize: '0.75rem', fontWeight: 600, border: '1px solid #e2e8f0' }}>
                      {rfc.environnement?.nom_env || environnements.find(e => String(e.id_env) === String(rfc.id_env))?.nom_env || '—'}
                    </span>
                  </td>

                  {/* 6. Statut */}
                  <td style={{ ...tdStyle, textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <Badge variant={
                        rfc.statut?.code_statut === 'APPROUVEE' || rfc.statut?.code_statut === 'CLOTUREE' ? 'success' :
                        rfc.statut?.code_statut === 'REJETEE' ? 'danger' :
                        ['PLANIFIEE', 'EN_COURS'].includes(rfc.statut?.code_statut) ? 'primary' : 'warning'
                      }>
                        {rfc.statut?.libelle || '—'}
                      </Badge>
                    </div>
                  </td>

                  {/* 7. Actions */}
                  <td style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleOpenTriage(rfc); }}
                        style={{ padding: '6px 12px', borderRadius: '6px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 600, fontSize: '0.75rem', cursor: 'pointer', transition: 'all 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                        title="Qualifier la demande"
                      >
                        <FiZap /> Qualifier
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      {/* ── MODAL DE TRIAGE (Transparent & Scrollable) ───────────────────────── */}
      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '750px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="modal-top modal-top-approve">
              <div className="modal-ico"><FiZap /></div>
              <div style={{ flex: 1 }}>
                <h2>Qualification Service Desk</h2>
                <p>Analyse et préparation de la RFC avant transfert au Change Manager</p>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}><FiX size={24} /></button>
            </div>
            
            <div className="modal-body" style={{ overflowY: 'auto' }}>
              <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.5)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                <label>Détails de la demande</label>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: '8px' }}>{selectedItem.titre_rfc}</div>
                <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>{selectedItem.description}</div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label>Type de Changement</label>
                  <select value={selectedType} onChange={e => setSelectedType(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label>Priorité Assignée</label>
                  <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)}>
                    <option value="">Sélectionner...</option>
                    {priorities.map(p => <option key={p.id_priorite} value={p.id_priorite}>{p.libelle}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label>Environnement Impacté</label>
                <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)}>
                  <option value="">Sélectionner...</option>
                  {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                <label>Analyse & Commentaires de triage</label>
                <textarea 
                  value={analysis} 
                  onChange={e => setAnalysis(e.target.value)} 
                  placeholder="Notes pour le Change Manager..."
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={() => handleTriageDecision('REJETEE')} disabled={submitting} className="modal-btn modal-btn-reject">
                <FiXCircle /> Rejeter
              </button>
              <button onClick={handlePreevaluer} disabled={submitting} className="modal-btn" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white' }}>
                <FiSend /> Pré-évaluer & Transférer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryHub;
