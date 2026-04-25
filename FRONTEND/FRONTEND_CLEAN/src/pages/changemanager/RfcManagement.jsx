import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiFileText, FiClock, FiSearch, FiRefreshCw, FiEye, FiCheckCircle, 
  FiXCircle, FiPlus, FiFilter, FiAlertTriangle, FiZap, FiEdit3, 
  FiTrash2, FiClipboard, FiSend, FiMessageSquare, FiShield, FiActivity, FiPaperclip, FiX, FiCalendar, FiGlobe, FiInfo
} from 'react-icons/fi';
import rfcService from '../../services/rfcService';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import './RfcManagement.css';

// ── Helpers ──────────────────────────────────────────────────
const getStatusClass = (code) => {
  switch(code) {
    case 'SOUMIS':    return 'status-blue';
    case 'EVALUEE':   return 'status-orange';
    case 'APPROUVEE': return 'status-green';
    case 'REJETEE':   return 'status-red';
    case 'CLOTUREE':  return 'status-slate';
    default:          return 'status-default';
  }
};

const getPrioClass = (code) => {
  if (code === 'P0' || code === 'P1') return 'prio-critical';
  if (code === 'P2') return 'prio-high';
  return 'prio-normal';
};

const isLate = (rfc) => {
  if (!rfc.date_souhaitee) return false;
  if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
  return new Date(rfc.date_souhaitee) < new Date();
};

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

// ── Main Component ───────────────────────────────────────────
const RfcManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // État des données
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rfcTypes, setRfcTypes] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  
  // État UI
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRfc, setSelectedRfc] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [showPir, setShowPir] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
  
  // Formulaire de traitement
  const [selectedType, setSelectedType] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [pirChecklist, setPirChecklist] = useState({
    objectives: false,
    incidents: false,
    rollback: false,
    stakeholders: false
  });

  // État Création RFC
  const [showCreate, setShowCreate] = useState(false);
  const [cis, setCis] = useState([]);
  const [createForm, setCreateForm] = useState({
    titre_rfc: '',
    description: '',
    justification: '',
    date_souhaitee: '',
    urgence: false,
    impacte_estimee: '',
    ci_ids: []
  });
  const [createLoading, setCreateLoading] = useState(false);

  // État Édition RFC existante
  const [editDetail, setEditDetail] = useState(false);
  const [detailForm, setDetailForm] = useState({
    titre_rfc: '',
    description: '',
    justification: '',
    date_souhaitee: '',
    impacte_estimee: '',
    ci_ids: []
  });

  // État Risque & Histoire
  const [risk, setRisk] = useState({ impact: 1, probabilite: 1, score: 1, notes: '' });
  const [history, setHistory] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await rfcService.getAllRfcs();
      setRfcs(data);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const [t, e, cm, ciList] = await Promise.all([
        rfcService.getTypesRfc(),
        rfcService.getEnvironnements(),
        rfcService.getChangeManagers(),
        rfcService.getConfigurationItems()
      ]);
      setRfcTypes(t);
      setEnvironments(e);
      setChangeManagers(cm);
      setCis(ciList);
    } catch (e) {
      console.error('Metadata error', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchMetadata();
  }, [fetchData, fetchMetadata]);

  const fetchComments = async (id) => {
    try {
      const [c, r, h] = await Promise.all([
        rfcService.getCommentaires(id),
        rfcService.getEvaluationRisque(id),
        api.get(`/rfc/${id}/historique`).then(res => res.data.historique || []).catch(() => [])
      ]);
      setComments(c);
      setRisk(r || { impact: 1, probabilite: 1, score: 1, notes: '' });
      setHistory(h);
    } catch (e) { console.error(e); }
  };

  const handleOpenProcess = (rfc) => {
    if (!rfc) return;
    setShowProcess(true);
    setSelectedRfc(rfc);
    
    // Prefill safely
    const typeId = rfc.typeRfc?.id_type || rfc.id_type || '';
    const envId = rfc.environnement?.id_env || rfc.id_env || '';
    
    setSelectedType(typeId);
    setSelectedEnv(envId);
    
    setDetailForm({
        titre_rfc: rfc.titre_rfc || '',
        description: rfc.description || '',
        justification: rfc.justification || '',
        date_souhaitee: rfc.date_souhaitee ? rfc.date_souhaitee.split('T')[0] : '',
        impacte_estimee: rfc.impacte_estimee || '',
        ci_ids: rfc.impactedCIs?.map(ci => ci.id_ci) || []
    });
    
    if (rfc.id_rfc) {
      fetchComments(rfc.id_rfc);
    }
  };

  const closeModals = () => {
    setShowProcess(false);
    setShowPir(false);
    setShowCreate(false);
    setSelectedRfc(null);
    setComments([]);
    setNewComment('');
    setEditDetail(false);
    setCreateForm({
        titre_rfc: '',
        description: '',
        justification: '',
        date_souhaitee: '',
        urgence: false,
        impacte_estimee: '',
        ci_ids: []
    });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.titre_rfc || !createForm.description) return alert('Titre et Description requis.');
    setCreateLoading(true);
    try {
        await rfcService.createAndSubmitRfc(createForm);
        alert('RFC créée et soumise avec succès !');
        closeModals();
        fetchData();
    } catch (err) {
        alert(err.response?.data?.message || 'Erreur lors de la création');
    } finally {
        setCreateLoading(false);
    }
  };

  const handleUpdateDetail = async () => {
    try {
        await rfcService.updateRfc(selectedRfc.id_rfc, detailForm);
        // Sauvegarder aussi le risque
        await rfcService.upsertEvaluationRisque(selectedRfc.id_rfc, risk);
        alert('RFC mise à jour avec succès.');
        setEditDetail(false);
        fetchData();
        setSelectedRfc(prev => ({ ...prev, ...detailForm }));
    } catch (err) {
        alert('Erreur lors de la mise à jour.');
    }
  };

  const handleCreateReport = async () => {
    if (!reportForm.titre_rapport || !reportForm.contenu_rapport) return alert("Le titre et le contenu sont obligatoires.");
    try {
        await api.post(`/rfc/${selectedRfc.id_rfc}/rapports`, reportForm);
        alert('Rapport généré et enregistré avec succès !');
        setShowReportForm(false);
        setReportForm({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
    } catch (e) {
        alert('Erreur lors de la génération du rapport.');
    }
  };

  const handleDeleteRfc = async () => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette RFC ?')) return;
    try {
        await rfcService.cancelRfc(selectedRfc.id_rfc);
        alert('RFC supprimée.');
        closeModals();
        fetchData();
    } catch (err) {
        alert('Erreur lors de la suppression.');
    }
  };

  const handleDecision = async (statusCode) => {
    try {
      const statut = await rfcService.getStatutByCode(statusCode, 'RFC');
      if (!statut) return alert('Statut non configuré.');

      const extra = {
        id_env: selectedEnv,
        id_change_manager: selectedRfc.id_change_manager || user.id_user,
        id_type: selectedType
      };

      await rfcService.updateRfcStatus(selectedRfc.id_rfc, statut.id_statut, extra);
      alert('Action effectuée avec succès.');
      closeModals();
      fetchData();
    } catch (e) {
      alert(e.response?.data?.message || 'Erreur lors du traitement.');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await rfcService.addCommentaire(selectedRfc.id_rfc, newComment);
      setNewComment('');
      fetchComments(selectedRfc.id_rfc);
    } catch (e) { alert('Erreur lors du commentaire'); }
  };

  const filtered = rfcs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || 
      r.titre_rfc?.toLowerCase().includes(q) || 
      r.code_rfc?.toLowerCase().includes(q) ||
      `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}`.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.statut?.code_statut === filterStatus;
    const matchType = !filterType || r.typeRfc?.id_type === parseInt(filterType);
    return matchSearch && matchStatus && matchType;
  });

  const pirAllChecked = Object.values(pirChecklist).every(v => v);

  return (
    <div className="rfc-mgr-page">
      {/* HEADER */}
      <div className="rfc-mgr-header">
        <div>
          <h1><FiClipboard /> Gestion des RFC</h1>
          <p>Centre administratif pour l'évaluation et l'approbation des demandes de changement.</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button onClick={() => setShowCreate(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.75rem 1.25rem', borderRadius: '12px', background: '#3b82f6', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
            <FiPlus /> Nouvelle RFC
          </button>
          <div className="header-date-badge">
            <FiCalendar /> {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="kpi-row">
        <KpiCard label="Total Backlog" value={rfcs.length} icon={<FiFileText />} color="blue" />
        <KpiCard label="En attente" value={rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length} icon={<FiClock />} color="orange" />
        <KpiCard label="En Retard" value={rfcs.filter(r => isLate(r)).length} icon={<FiAlertTriangle />} color="danger" />
        <KpiCard label="Approuvées" value={rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length} icon={<FiCheckCircle />} color="green" />
      </div>

      {/* TOOLBAR */}
      <div className="rfc-mgr-toolbar">
        <div className="search-wrapper">
          <FiSearch className="search-ico" />
          <input type="text" placeholder="Rechercher une RFC..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="toolbar-filters">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            <option value="SOUMIS">Soumises</option>
            <option value="EVALUEE">Évaluées</option>
            <option value="APPROUVEE">Approuvées</option>
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Tous les types</option>
            {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
          </select>
          <button className="refresh-btn" onClick={fetchData}><FiRefreshCw /></button>
        </div>
      </div>

      {/* Table Section (Mirroring CI Management) */}
      <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>RFC & Code</th>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Demandeur</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chargement des RFCs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucune RFC trouvée.
                  </td>
                </tr>
              ) : filtered.map((rfc, index) => (
                <tr key={rfc.id_rfc} onClick={() => handleOpenProcess(rfc)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.2s' }} className="hover-row">
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.8rem' }}>{rfc.titre_rfc}</div>
                    <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: '600' }}>#{rfc.code_rfc}</div>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.65rem', color: '#475569', fontWeight: '600' }}>
                      {rfc.typeRfc?.type || 'Standard'}
                    </span>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <span className={`status-badge ${getStatusClass(rfc.statut?.code_statut)}`} style={{ fontSize: '0.65rem' }}>
                      {rfc.statut?.libelle}
                    </span>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: '800' }}>
                        {rfc.demandeur?.prenom_user?.[0]}{rfc.demandeur?.nom_user?.[0]}
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#475569' }}>
                        {rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleOpenProcess(rfc); }} style={{ background: '#f1f5f9', color: '#10b981', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Détails">
                        <FiInfo size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL TRAITEMENT */}
      {showProcess && selectedRfc && (
        <div className="modal-backdrop" onClick={closeModals} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <button onClick={closeModals} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}>
              <FiX size={24} />
            </button>

            <div className="modal-top" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
              <div style={{
                width: '70px', height: '70px', borderRadius: '18px',
                background: '#eff6ff', color: '#3b82f6',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.8rem', border: '1px solid #bfdbfe'
              }}>
                <FiFileText />
              </div>
              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Détails & Traitement de la RFC</h2>
                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>#{selectedRfc.code_rfc} — {selectedRfc.titre_rfc}</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <button 
                    onClick={() => setShowReportForm(!showReportForm)}
                    style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    <FiFileText /> Rapport
                  </button>
                  <button 
                    onClick={() => {
                        setDetailForm({
                            titre_rfc: selectedRfc.titre_rfc,
                            description: selectedRfc.description,
                            justification: selectedRfc.justification,
                            date_souhaitee: selectedRfc.date_souhaitee ? selectedRfc.date_souhaitee.split('T')[0] : '',
                            impacte_estimee: selectedRfc.impacte_estimee
                        });
                        setEditDetail(!editDetail);
                    }}
                    style={{ background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#475569', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    <FiEdit3 /> {editDetail ? 'Annuler' : 'Modifier'}
                  </button>
                  <button 
                    onClick={handleDeleteRfc}
                    style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}
                  >
                    <FiTrash2 /> Supprimer
                  </button>
              </div>
            </div>

            <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                {/* Détails */}
                <div>
                  <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}><FiInfo /> Analyse de la demande</h3>
                  {showReportForm && (
                      <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                          <h4 style={{ margin: '0 0 1rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText /> Nouveau Rapport</h4>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                  <div>
                                      <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Titre du Rapport</label>
                                      <input type="text" value={reportForm.titre_rapport} onChange={e => setReportForm({...reportForm, titre_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none' }} placeholder="Ex: Rapport d'impact technique..." />
                                  </div>
                                  <div>
                                      <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Type</label>
                                      <select value={reportForm.type_rapport} onChange={e => setReportForm({...reportForm, type_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', background: 'white' }}>
                                          <option value="Audit">Audit</option>
                                          <option value="Risque">Analyse de Risque</option>
                                          <option value="Post-Incident">Post-Incident</option>
                                          <option value="PIR">PIR</option>
                                      </select>
                                  </div>
                              </div>
                              <div>
                                  <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Contenu</label>
                                  <textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({...reportForm, contenu_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', minHeight: '100px' }} placeholder="Rédigez le contenu du rapport..." />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                  <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Annuler</button>
                                  <button onClick={handleCreateReport} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Enregistrer le Rapport</button>
                              </div>
                          </div>
                      </div>
                  )}
                  <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                    {editDetail ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Titre</label>
                                <input 
                                    type="text" 
                                    value={detailForm.titre_rfc} 
                                    onChange={e => setDetailForm({...detailForm, titre_rfc: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Description</label>
                                <textarea 
                                    value={detailForm.description} 
                                    onChange={e => setDetailForm({...detailForm, description: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }}
                                />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Date Souhaitée</label>
                                    <input 
                                        type="date" 
                                        value={detailForm.date_souhaitee} 
                                        onChange={e => setDetailForm({...detailForm, date_souhaitee: e.target.value})}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Impact Estimé</label>
                                    <input 
                                        type="text" 
                                        value={detailForm.impacte_estimee} 
                                        onChange={e => setDetailForm({...detailForm, impacte_estimee: e.target.value})}
                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                    />
                                </div>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#64748b' }}>Justification</label>
                                <textarea 
                                    value={detailForm.justification} 
                                    onChange={e => setDetailForm({...detailForm, justification: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                                />
                            </div>
                            <button onClick={handleUpdateDetail} className="btn-primary" style={{ alignSelf: 'flex-end', background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Enregistrer les modifications</button>
                        </div>
                    ) : (
                        <>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description</label>
                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0 1rem' }}>{selectedRfc.description}</p>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Justification Business</label>
                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedRfc.justification || 'Aucune justification fournie.'}</p>
                        </>
                    )}
                  </div>

                  <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}><FiShield /> Paramètres ITIL</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Type de Workflow</label>
                      <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                        <option value="">Sélectionner...</option>
                        {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement Cible</label>
                      <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                        <option value="">Sélectionner...</option>
                        {environments.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Priorité</label>
                      <select value={selectedRfc.id_priorite} onChange={e => setSelectedRfc({...selectedRfc, id_priorite: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                        <option value="1">P1 - Critique</option>
                        <option value="2">P2 - Haute</option>
                        <option value="3">P3 - Moyenne</option>
                        <option value="4">P4 - Basse</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Change Manager</label>
                      <select value={selectedRfc.id_change_manager || ''} onChange={e => setSelectedRfc({...selectedRfc, id_change_manager: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                        <option value="">Non assigné</option>
                        {changeManagers.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Timeline & Discussion */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                   {/* Évaluation du Risque */}
                   <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiAlertTriangle /> Évaluation des Risques</h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                          <div>
                              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Impact (1-5)</label>
                              <select 
                                value={risk.impact} 
                                onChange={e => setRisk({...risk, impact: parseInt(e.target.value), score: parseInt(e.target.value) * risk.probabilite})}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                              >
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                          </div>
                          <div>
                              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Probabilité (1-5)</label>
                              <select 
                                value={risk.probabilite} 
                                onChange={e => setRisk({...risk, probabilite: parseInt(e.target.value), score: parseInt(e.target.value) * risk.impact})}
                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}
                              >
                                {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                              </select>
                          </div>
                      </div>
                      <div style={{ background: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Score de Risque</div>
                          <div style={{ fontSize: '1.5rem', fontWeight: '900', color: risk.score > 12 ? '#dc2626' : risk.score > 6 ? '#f59e0b' : '#10b981' }}>{risk.score} / 25</div>
                      </div>
                   </div>

                   {/* Discussion */}
                   <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem' }}><FiMessageSquare /> Discussion Interne</h3>
                    <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {comments.length === 0 && <p style={{ fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>Aucun commentaire.</p>}
                        {comments.map(c => (
                        <div key={c.id_commentaire} style={{ background: 'white', padding: '0.75rem', borderRadius: '10px', fontSize: '0.8rem', border: '1px solid #e2e8f0' }}>
                            <div style={{ fontWeight: '700', color: '#3b82f6', fontSize: '0.7rem', display: 'flex', justifyContent: 'space-between' }}>
                                <span>{c.auteur?.prenom_user} {c.auteur?.nom_user}</span>
                                <span style={{ fontWeight: '400', color: '#94a3b8' }}>{new Date(c.date_commentaire).toLocaleDateString()}</span>
                            </div>
                            <div style={{ marginTop: '0.2rem', color: '#334155', fontWeight: '500' }}>{c.contenu}</div>
                        </div>
                        ))}
                    </div>
                    <div style={{ position: 'relative' }}>
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Ajouter une note..." style={{ width: '100%', minHeight: '60px', padding: '0.5rem', fontSize: '0.85rem', borderRadius: '8px', border: '1.5px solid #e2e8f0', fontWeight: '500' }} />
                        <button onClick={handleAddComment} style={{ position: 'absolute', right: '10px', bottom: '10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><FiSend /></button>
                    </div>
                   </div>

                   {/* Historique */}
                   <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiActivity /> Journal d'Audit</h3>
                      <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {history.length === 0 && <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Historique non disponible.</p>}
                          {history.map((h, i) => (
                              <div key={i} style={{ display: 'flex', gap: '10px', paddingLeft: '10px', borderLeft: '2px solid #e2e8f0' }}>
                                  <div style={{ color: '#64748b', whiteSpace: 'nowrap', fontWeight: '600', fontSize: '0.75rem' }}>{new Date(h.date_changement).toLocaleDateString()}</div>
                                  <div style={{ color: '#334155', fontWeight: '500' }}>
                                      <span style={{ fontWeight: '700' }}>{h.utilisateur?.nom_user}</span> a changé le statut vers <span style={{ color: '#3b82f6', fontWeight: '700' }}>{h.nouveau_statut?.libelle}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                   </div>
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button className="modal-btn modal-btn-cancel" style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: '700' }} onClick={closeModals}>Fermer</button>
              <button className="modal-btn modal-btn-reject" style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#dc2626', cursor: 'pointer', fontWeight: '700' }} onClick={() => handleDecision('REJETEE')}>Rejeter</button>
              <button className="modal-btn modal-btn-approve" style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: '#3b82f6', border: 'none', color: 'white', cursor: 'pointer', fontWeight: '700' }} onClick={() => handleDecision('APPROUVEE')}>Approuver & Planifier</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PIR */}
      {showPir && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-box modal-box-pir" onClick={e => e.stopPropagation()}>
            <div className="modal-top modal-top-pir">
              <FiCheckCircle className="modal-ico" />
              <div><h2>Validation Post-Implémentation (PIR)</h2><p>RFC #{selectedRfc?.code_rfc}</p></div>
            </div>
            <div className="modal-body">
              <div className="pir-checklist">
                {['objectives', 'incidents', 'rollback', 'stakeholders'].map(k => (
                  <label key={k} className={`pir-item ${pirChecklist[k] ? 'checked' : ''}`}>
                    <input type="checkbox" checked={pirChecklist[k]} onChange={() => setPirChecklist(p => ({...p, [k]: !p[k]}))} />
                    <div className="pir-check-icon"><FiCheckCircle /></div>
                    <span>{k === 'objectives' ? 'Objectifs atteints' : k === 'incidents' ? 'Aucun incident lié' : k === 'rollback' ? 'Plan de repli validé' : 'Parties prenantes informées'}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn modal-btn-cancel" onClick={closeModals}>Annuler</button>
              <button className="modal-btn modal-btn-approve" disabled={!pirAllChecked} onClick={() => handleDecision('CLOTUREE')}>Clôturer la RFC</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CRÉATION */}
      {showCreate && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-box" style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top" style={{ background: 'linear-gradient(135deg, #0f172a, #334155)', color: 'white' }}>
              <FiPlus className="modal-ico" style={{ color: '#3b82f6' }} />
              <div>
                <h2 style={{ color: 'white' }}>Nouvelle Demande de Changement (RFC)</h2>
                <p style={{ color: 'rgba(255,255,255,0.7)' }}>Formulaire standard ITIL v4</p>
              </div>
              <button onClick={closeModals} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={24} /></button>
            </div>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                <div className="modal-body" style={{ overflowY: 'auto', padding: '2rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Titre de la RFC <span style={{ color: '#ef4444' }}>*</span></label>
                            <input 
                                type="text"
                                value={createForm.titre_rfc}
                                onChange={e => setCreateForm({...createForm, titre_rfc: e.target.value})}
                                placeholder="ex: Mise à jour du noyau SAP v2.4"
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '0.5rem' }}
                                required
                            />
                        </div>

                        <div>
                            <label>Date souhaitée d'implémentation</label>
                            <input 
                                type="date"
                                value={createForm.date_souhaitee}
                                onChange={e => setCreateForm({...createForm, date_souhaitee: e.target.value})}
                                style={{ width: '100%', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '0.5rem' }}
                            />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                             <input 
                                type="checkbox" 
                                id="is_urgent"
                                checked={createForm.urgence}
                                onChange={e => setCreateForm({...createForm, urgence: e.target.checked})}
                             />
                             <label htmlFor="is_urgent" style={{ marginBottom: 0 }}>Changement Urgent (Emergency RFC)</label>
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label>Description détaillée</label>
                            <textarea 
                                value={createForm.description}
                                onChange={e => setCreateForm({...createForm, description: e.target.value})}
                                placeholder="Décrivez les changements techniques prévus..."
                                style={{ width: '100%', minHeight: '100px', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '0.5rem' }}
                                required
                            />
                        </div>

                        <div>
                            <label>Justification Business</label>
                            <textarea 
                                value={createForm.justification}
                                onChange={e => setCreateForm({...createForm, justification: e.target.value})}
                                placeholder="Pourquoi ce changement est-il nécessaire ?"
                                style={{ width: '100%', minHeight: '80px', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '0.5rem' }}
                            />
                        </div>

                        <div>
                            <label>Impact estimé</label>
                            <textarea 
                                value={createForm.impacte_estimee}
                                onChange={e => setCreateForm({...createForm, impacte_estimee: e.target.value})}
                                placeholder="Utilisateurs impactés, durée d'indisponibilité..."
                                style={{ width: '100%', minHeight: '80px', padding: '0.8rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '0.5rem' }}
                            />
                        </div>

                        <div style={{ gridColumn: 'span 2' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FiGlobe /> Éléments de Configuration (CIs) impactés</label>
                            <select 
                                multiple
                                value={createForm.ci_ids}
                                onChange={e => setCreateForm({...createForm, ci_ids: Array.from(e.target.selectedOptions, option => option.value)})}
                                style={{ width: '100%', height: '120px', padding: '0.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', marginTop: '0.5rem' }}
                            >
                                {cis.map(ci => (
                                    <option key={ci.id_ci} value={ci.id_ci}>
                                        [{ci.typeCi?.nom_type || 'CI'}] {ci.nom_ci} - {ci.code_ci}
                                    </option>
                                ))}
                            </select>
                            <small style={{ color: '#64748b', marginTop: '5px', display: 'block' }}>Maintenez Ctrl (ou Cmd) pour sélectionner plusieurs éléments.</small>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="modal-btn modal-btn-cancel" onClick={closeModals}>Annuler</button>
                    <button type="submit" className="modal-btn modal-btn-approve" disabled={createLoading}>
                        {createLoading ? 'Création...' : 'Soumettre la demande'}
                    </button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RfcManagement;
