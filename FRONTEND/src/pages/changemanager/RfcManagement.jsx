import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiFileText, FiClock, FiSearch, FiRefreshCw, FiEye, FiCheckCircle, 
  FiXCircle, FiPlus, FiFilter, FiAlertTriangle, FiZap, FiEdit3, 
  FiTrash2, FiClipboard, FiSend, FiMessageSquare, FiShield, FiActivity, FiPaperclip, FiX, FiCalendar, FiGlobe, FiInfo
} from 'react-icons/fi';
import { RFC_TRANSITIONS } from '../../utils/constants';
import rfcService from '../../services/rfcService';
import changeService from '../../services/changeService';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import RfcCreate from '../demandeur/RfcCreate';
import './RfcManagement.css';

// ── Helpers ──────────────────────────────────────────────────
const getStatusClass = (code) => {
  switch(code) {
    case 'BROUILLON':    return 'status-orange';
    case 'SOUMIS':       return 'status-blue';
    case 'EN_EVALUATION': return 'status-purple';
    case 'EVALUEE':      return 'status-indigo';
    case 'PRE_APPROUVEE': return 'status-yellow';
    case 'APPROUVEE':    return 'status-green';
    case 'PLANIFIEE':    return 'status-teal';
    case 'EN_COURS':     return 'status-pink';
    case 'REJETEE':      return 'status-red';
    case 'CLOTUREE':     return 'status-slate';
    case 'ANNULEE':      return 'status-red';
    default:             return 'status-default';
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
  const [statuses, setStatuses] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [priorities, setPriorities] = useState([]);
  
  // État UI
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [kpiFilter, setKpiFilter] = useState('');
  const [selectedRfc, setSelectedRfc] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [showPir, setShowPir] = useState(false);
  // Popup approbation RFC → création auto changement
  const [approvalModal, setApprovalModal] = useState({ open: false, rfc: null, pendingId: null });
  const [approvalForm, setApprovalForm] = useState({ id_change_manager: '', id_env: '' });
  const [approvalLoading, setApprovalLoading] = useState(false);
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
    ci_ids: [],
    id_statut: ''
  });

  // État Risque & Histoire
  const [risk, setRisk] = useState({ impact: 1, probabilite: 1, score: 1, notes: '' });
  const [history, setHistory] = useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'success') => setToast({ msg, type });
  const [rfcToDelete, setRfcToDelete] = useState(null);

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
      const [t, s, e, cm, ciList, p] = await Promise.all([
        rfcService.getTypesRfc(),
        rfcService.getStatuts('RFC'),
        rfcService.getEnvironnements(),
        rfcService.getChangeManagers(),
        rfcService.getConfigurationItems(),
        rfcService.getPriorites()
      ]);
      setRfcTypes(t);
      setStatuses(s);
      setEnvironments(e);
      // cm structure is { success, data: { data: [users] } } or [users]
      setChangeManagers(Array.isArray(cm) ? cm : (cm?.data || cm?.users || []));
      setCis(ciList);
      setPriorities(p);
    } catch (e) {
      console.error('Metadata fetch error', e);
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
        ci_ids: rfc.impactedCIs?.map(ci => ci.id_ci) || [],
        id_statut: rfc.id_statut || rfc.statut?.id_statut || '',
        id_priorite: rfc.id_priorite || '',
        id_type: rfc.id_type || ''
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
    if (!createForm.titre_rfc || !createForm.description) return setToast({ msg: 'Titre et Description requis.', type: 'error' });
    setCreateLoading(true);
    try {
        await rfcService.createAndSubmitRfc(createForm);
        setToast({ msg: 'RFC créée et soumise avec succès !', type: 'success' });
        closeModals();
        fetchData();
    } catch (err) {
        setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de la création', type: 'error' });
    } finally {
        setCreateLoading(false);
    }
  };

  const handleUpdateDetail = async () => {
    try {
        // Mettre à jour les champs texte
        await rfcService.updateRfc(selectedRfc.id_rfc, detailForm);

        // Changer le statut si modifié
        const currentStatutId = selectedRfc.id_statut || selectedRfc.statut?.id_statut;
        if (detailForm.id_statut && detailForm.id_statut !== currentStatutId) {
            await rfcService.updateRfcStatus(selectedRfc.id_rfc, detailForm.id_statut, {
                id_change_manager: selectedRfc.id_change_manager || user?.id_user,
                id_env: selectedEnv || selectedRfc.id_env || selectedRfc.environnement?.id_env
            });
        }

        // Sauvegarder aussi le risque (silencieux si erreur)
        try { await rfcService.upsertEvaluationRisque(selectedRfc.id_rfc, risk); } catch(_) {}

        setToast({ msg: 'RFC mise à jour avec succès.', type: 'success' });
        setEditDetail(false);
        fetchData();
    } catch (err) {
        const msg = err?.error?.message || err?.message || 'Erreur lors de la mise à jour.';
        setToast({ msg: msg, type: 'error' });
    }
  };

  const handleCreateReport = async () => {
    if (!reportForm.titre_rapport || !reportForm.contenu_rapport) return alert("Le titre et le contenu sont obligatoires.");
    try {
        await api.post(`/rfc/${selectedRfc.id_rfc}/rapports`, reportForm);
        setToast({ msg: 'Rapport généré et enregistré avec succès !', type: 'success' });
        setShowReportForm(false);
        setReportForm({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
    } catch (e) {
        setToast({ msg: 'Erreur lors de la génération du rapport.', type: 'error' });
    }
  };

  const handleDeleteRfc = async () => {
    if (!rfcToDelete) return;
    try {
      // Pas de masquage local, on appelle le service réel
      await rfcService.deleteRfc(rfcToDelete.id_rfc);
      setRfcs(prev => prev.filter(r => r.id_rfc !== rfcToDelete.id_rfc));
      setShowConfirmDelete(false);
      setRfcToDelete(null);
      closeModals();
      setToast({ msg: 'RFC supprimée avec succès.', type: 'error' });
    } catch (err) {
      console.error("Deletion failed:", err);
      // On affiche l'erreur réelle du backend
      const msg = err?.error?.message || err?.message || 'Erreur lors de la suppression.';
      showToast(`Erreur : ${msg}`, 'error');
      setShowConfirmDelete(false);
      setRfcToDelete(null);
    }
  };

  const handleDecision = async (newStatusCode) => {
    try {
      const targetStatut = statuses.find(s => s.code_statut === newStatusCode);
      if (!targetStatut) return alert('Statut non configuré.');

      if (newStatusCode === 'APPROUVEE') {
        handleApproveRfc(selectedRfc, targetStatut.id_statut);
        return;
      }

      setApprovalLoading(true);
      try {
        const res = await rfcService.updateRfcStatus(selectedRfc.id_rfc, targetStatut.id_statut, {
          id_env: selectedEnv || selectedRfc.id_env || null,
          id_change_manager: user?.id_user, 
        });

        fetchData();
        setToast({ msg: `Décision "${newStatusCode}" enregistrée.`, type: 'success' });
      } catch (err) {
        console.error('Decision failed:', err);
        const msg = err?.error?.message || err?.message || 'Erreur lors du changement de statut.';
        showToast(msg, 'error');
      } finally {
        setApprovalLoading(false);
      }
    } catch (e) {
      alert('Erreur lors du traitement de la décision.');
    }
  };

  const handleApproveRfc = async (rfc, newStatusId) => {
    const targetStatut = statuses.find(s => String(s.id_statut) === String(newStatusId));
    if (targetStatut?.code_statut === 'APPROUVEE') {
      setApprovalModal({ open: true, rfc, pendingId: newStatusId });
      setApprovalForm({ id_change_manager: '', id_env: '' });
      return;
    }
    try {
      await rfcService.updateRfcStatus(rfc.id_rfc, newStatusId, {});
      fetchData();
      setToast({ msg: 'Statut mis à jour.', type: 'success' });
    } catch (err) {
      const msg = err?.error?.message || err?.message || 'Erreur lors du changement de statut.';
      showToast(msg, 'error');
    }
  };

  const submitApproval = async () => {
    if (!approvalForm.id_change_manager || !approvalForm.id_env) {
      showToast("Veuillez sélectionner un Change Manager et un Environnement.", 'error');
      return;
    }

    setApprovalLoading(true);
    try {
      // 1. Mettre à jour le statut via le backend
      // Le backend crée automatiquement le changement si statut = APPROUVEE
      const res = await rfcService.updateRfcStatus(approvalModal.rfc.id_rfc, approvalModal.pendingId, {
        id_env: approvalForm.id_env,
        id_change_manager: approvalForm.id_change_manager,
        date_debut: approvalModal.rfc.date_souhaitee || new Date().toISOString()
      });

      console.log("Status update result:", res);

      // 2. Si par hasard le backend n'a pas créé le changement (ancienne version ou autre), on force
      if (!res?.changement && !res?.data?.changement) {
        console.warn("Backend didn't return a change, triggering manual creation...");
        try {
          await changeService.createChangement({
            id_rfc: approvalModal.rfc.id_rfc,
            id_env: approvalForm.id_env,
            id_change_manager: approvalForm.id_change_manager,
            date_debut: approvalModal.rfc.date_souhaitee || new Date().toISOString()
          });
        } catch (manualErr) {
          console.error("Manual change creation failed:", manualErr);
        }
      }

      setApprovalModal({ open: false, rfc: null, pendingId: null });
      fetchData();
      showToast('RFC approuvée et Changement créé avec succès !', 'success');
    } catch (err) {
      console.error('Approval failed:', err);
      const msg = err?.error?.message || err?.message || 'Erreur lors de l\'approbation.';
      showToast(`Erreur : ${msg}`, 'error');
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await rfcService.addCommentaire(selectedRfc.id_rfc, newComment);
      setNewComment('');
      fetchComments(selectedRfc.id_rfc);
      setToast({ msg: 'Commentaire ajouté.', type: 'success' });
    } catch (e) { setToast({ msg: 'Erreur lors du commentaire', type: 'error' }); }
  };

  const sortedStatuses = useMemo(() => {
    const order = ['BROUILLON', 'SOUMIS', 'EN_EVALUATION', 'EVALUEE', 'PRE_APPROUVEE', 'APPROUVEE', 'PLANIFIEE', 'EN_COURS', 'REUSSI', 'TERMINEE', 'CLOTUREE', 'REJETEE', 'ANNULEE'];
    return [...statuses].sort((a, b) => order.indexOf(a.code_statut) - order.indexOf(b.code_statut));
  }, [statuses]);

  const filtered = rfcs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !search || 
      r.titre_rfc?.toLowerCase().includes(q) || 
      r.code_rfc?.toLowerCase().includes(q) ||
      `${r.demandeur?.prenom_user} ${r.demandeur?.nom_user}`.toLowerCase().includes(q);
      
    // KPI filter overrides status filter when active
    let matchStatus;
    if (kpiFilter) {
      if (kpiFilter === 'BACKLOG') matchStatus = !['CLOTUREE', 'ANNULEE'].includes(r.statut?.code_statut);
      else if (kpiFilter === 'LATE') matchStatus = isLate(r);
      else matchStatus = r.statut?.code_statut === kpiFilter;
    } else {
      matchStatus = filterStatus 
        ? r.statut?.code_statut === filterStatus 
        : !['CLOTUREE', 'ANNULEE'].includes(r.statut?.code_statut);
    }
        
    const matchType = !filterType || r.typeRfc?.type === filterType;
    return matchSearch && matchStatus && matchType;
  });

  const pirAllChecked = Object.values(pirChecklist).every(v => v);

  return (
    <div className="rfc-mgr-page">
      {/* HEADER */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiClipboard /></div>
          <div className="premium-header-text">
            <h1>Gestion des RFC</h1>
            <p>Configurez les demandes de changement et supervisez l'évaluation et l'approbation du système ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button onClick={() => fetchData()} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '999px', padding: '0.55rem 0.85rem', fontWeight: '700' }}>
            <FiRefreshCw /> Actualiser
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-create-premium">
            <FiPlus /> Nouvelle RFC
          </button>
        </div>
      </div>

      {/* KPI ROW */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className={`stat-card blue ${kpiFilter === 'BACKLOG' ? 'selected-active' : ''}`} onClick={() => setKpiFilter(k => k === 'BACKLOG' ? '' : 'BACKLOG')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper"><FiFileText size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{rfcs.filter(r => !['CLOTUREE', 'ANNULEE'].includes(r.statut?.code_statut)).length}</div>
            <div className="stat-label">Total RFC</div>
          </div>
        </div>
        <div className={`stat-card amber ${kpiFilter === 'SOUMIS' ? 'selected-active' : ''}`} onClick={() => setKpiFilter(k => k === 'SOUMIS' ? '' : 'SOUMIS')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper"><FiClock size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length}</div>
            <div className="stat-label">En attente</div>
          </div>
        </div>
        <div className={`stat-card red ${kpiFilter === 'LATE' ? 'selected-active' : ''}`} onClick={() => setKpiFilter(k => k === 'LATE' ? '' : 'LATE')} style={{ cursor: 'pointer', borderLeft: '3px solid #ef4444' }}>
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiAlertTriangle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{rfcs.filter(r => isLate(r)).length}</div>
            <div className="stat-label">En Retard</div>
          </div>
        </div>
        <div className={`stat-card green ${kpiFilter === 'APPROUVEE' ? 'selected-active' : ''}`} onClick={() => setKpiFilter(k => k === 'APPROUVEE' ? '' : 'APPROUVEE')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper"><FiCheckCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length}</div>
            <div className="stat-label">Approuvées</div>
          </div>
        </div>
      </div>

      {/* TOOLBAR */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          <input 
          type="text" 
          placeholder="Rechercher une RFC..." 
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
          value={filterStatus} 
          onChange={e => { setFilterStatus(e.target.value); setKpiFilter('');}}
          style={{
            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
          }}
          >
            <option value="">Tous les statuts</option>
            {sortedStatuses.map(s => <option key={s.code_statut} value={s.code_statut}>{s.libelle}</option>)}
          </select>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}
            style={{
            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
          }}
          >
            <option value="">Tous les types</option>
            {rfcTypes.map(t => <option key={t.id_type} value={t.type}>{t.type}</option>)}
          </select>
          {(search || filterStatus || filterType || kpiFilter) && (
            <button
              onClick={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setKpiFilter(''); }}
              style={{
              padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
              fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', 
              cursor: 'pointer', fontWeight: '600'
            }}>
              Réinitialiser
            </button>
          )}
          </div>
      </div>

      {/* Table Section */}
      <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div className="table-scroll-container">
          <table className="acl-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr className="acl-head-row">
                <th className="acl-th">RFC & Code</th>
                <th className="acl-th">Demandeur</th>
                <th className="acl-th">Type</th>
                <th className="acl-th">Priorité</th>
                <th className="acl-th">Env</th>
                <th className="acl-th">Statut</th>
                <th className="acl-th acl-th-right" style={{ width: '80px', whiteSpace: 'nowrap' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="acl-empty-cell loading">Chargement des RFCs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="acl-empty-cell">
                    <FiFileText size={40} className="acl-empty-icon" />
                    Aucune RFC trouvée.
                  </td>
                </tr>
              ) : filtered.map((rfc, index) => (
                <tr key={rfc.id_rfc} onClick={() => handleOpenProcess(rfc)} className={`acl-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                  <td className="acl-td">
                    <div className="acl-title" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }} title={rfc.titre_rfc}>
                      {rfc.titre_rfc}
                    </div>
                    <div className="acl-code">#{rfc.code_rfc}</div>
                  </td>
                  <td className="acl-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div className="acl-manager-avatar" style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>
                        {(rfc.demandeur?.prenom_user?.[0] || '—').toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                        {`${rfc.demandeur?.prenom_user || '—'} ${rfc.demandeur?.nom_user || ''}`.trim()}
                      </span>
                    </div>
                  </td>
                  <td className="acl-td">
                    <InlineEditableBadge
                      currentValue={rfc.id_type || rfc.typeRfc?.id_type}
                      options={rfcTypes.map(t => ({ value: t.id_type, label: t.type, code: t.type }))}
                      getVariant={(val) => {
                        const t = rfcTypes.find(tp => tp.id_type === val);
                        if (!t) return 'default';
                        if (t.type === 'URGENT') return 'danger';
                        if (t.type === 'NORMAL') return 'primary';
                        return 'info';
                      }}
                      onUpdate={async (newId) => {
                        try {
                          await rfcService.updateRfc(rfc.id_rfc, { id_type: newId });
                          fetchData();
                        } catch (err) {
                          alert('Erreur lors de la mise à jour du type');
                        }
                      }}
                      isEditable={true}
                    />
                  </td>
                  <td className="acl-td">
                    <InlineEditableBadge
                      currentValue={rfc.id_priorite}
                      options={priorities.map(p => ({ value: p.id_priorite, label: p.libelle, code: p.code_priorite }))}
                      getVariant={(val) => {
                        const p = priorities.find(pr => pr.id_priorite === val);
                        if (p?.code_priorite === 'P0' || p?.code_priorite === 'P1') return 'danger';
                        if (p?.code_priorite === 'P2') return 'warning';
                        return 'success';
                      }}
                      onUpdate={async (newId) => {
                        try {
                          await rfcService.updateRfc(rfc.id_rfc, { id_priorite: newId });
                          fetchData();
                        } catch (err) {
                          alert('Erreur lors de la mise à jour de la priorité');
                        }
                      }}
                      isEditable={true}
                    />
                  </td>
                  <td className="acl-td">
                    <span className="acl-env-pill">
                      {rfc.environnement?.nom_env || 'N/A'}
                    </span>
                  </td>
                  <td className="acl-td" onClick={(e) => e.stopPropagation()}>
                    <InlineEditableBadge
                      currentValue={rfc.statut?.id_statut}
                      options={statuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                      allowedCodes={RFC_TRANSITIONS[rfc.statut?.code_statut] || []}
                      getVariant={(val) => {
                        const s = statuses.find(st => st.id_statut === val);
                        if (!s) return 'default';
                        const c = s.code_statut;
                        if (['APPROUVEE', 'PLANIFIEE', 'CLOTUREE'].includes(c)) return 'success';
                        if (['REJETEE', 'ANNULEE'].includes(c)) return 'danger';
                        if (['SOUMIS', 'EN_EVALUATION', 'EVALUEE'].includes(c)) return 'warning';
                        return 'primary';
                      }}
                      onUpdate={(newId) => handleApproveRfc(rfc, newId)}
                      isEditable={true}
                      dropdownPosition="up"
                    />
                  </td>
                  <td className="acl-td" style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); handleOpenProcess(rfc); }} title="Détails" style={{ padding: '0.4rem' }}>
                        <FiEye size={16} />
                      </button>
                      <button className="btn-danger" onClick={(e) => { e.stopPropagation(); setRfcToDelete(rfc); setShowConfirmDelete(true); }} title="Supprimer" style={{ padding: '0.4rem' }}>
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

      {/* MODAL TRAITEMENT */}
      {showProcess && selectedRfc && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <button className="close-btn-rfc-style" onClick={closeModals} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', zIndex: 10 }}>
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
                    onClick={() => { setRfcToDelete(selectedRfc); setShowConfirmDelete(true); }}
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
                            <div>
                                <label style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FiShield size={12} /> Statut RFC
                                </label>
                                <select
                                    value={detailForm.id_statut}
                                    onChange={e => setDetailForm({...detailForm, id_statut: e.target.value})}
                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '2px solid #a78bfa', outline: 'none', fontWeight: '700', background: '#faf5ff', color: '#6d28d9', cursor: 'pointer' }}
                                >
                                    <option value="">— Statut actuel —</option>
                                    {statuses.map(s => (
                                        <option key={s.id_statut} value={s.id_statut}>{s.libelle}</option>
                                    ))}
                                </select>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.65rem', color: '#94a3b8' }}>⚠ Modifier le statut peut déclencher des transitions de workflow.</p>
                            </div>
                            <button onClick={handleUpdateDetail} className="btn-primary" style={{ alignSelf: 'flex-end', background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Enregistrer les modifications</button>
                        </div>
                    ) : (
                        <>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description</label>
                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0 1rem' }}>{selectedRfc.description}</p>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Justification Business</label>
                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedRfc.justification || 'Aucune justification fournie.'}</p>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut Actuel</label>
                            <p style={{ margin: '0.25rem 0' }}>
                                <span className={`status-badge ${getStatusClass(selectedRfc.statut?.code_statut)}`}>
                                    {selectedRfc.statut?.libelle || 'Inconnu'}
                                </span>
                            </p>
                        </>
                    )}
                  </div>

                  <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span><FiShield /> Paramètres ITIL</span>
                        <button onClick={handleUpdateDetail} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.65rem', fontWeight: '700', cursor: 'pointer' }}>Enregistrer</button>
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Type de Workflow</label>
                        <select value={detailForm.id_type} onChange={e => setDetailForm({...detailForm, id_type: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
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
                        <select value={detailForm.id_priorite} onChange={e => setDetailForm({...detailForm, id_priorite: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                            <option value="">Sélectionner...</option>
                            {priorities.map(p => <option key={p.id_priorite} value={p.id_priorite}>{p.libelle}</option>)}
                        </select>
                        </div>
                    </div>
                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                        <button onClick={handleUpdateDetail} className="btn-primary" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2)' }}>Enregistrer les modifications ITIL</button>
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
                              <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Proba (1-5)</label>
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
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Score de Changement</div>
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
          <div className="modal-box" style={{ maxWidth: '900px', width: '95%', display: 'flex', flexDirection: 'column', maxHeight: '95vh', padding: 0 }} onClick={e => e.stopPropagation()}>
            <div className="modal-top" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: 'white', padding: '1rem 1.5rem', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <FiPlus className="modal-ico" style={{ color: '#93c5fd', fontSize: '1.5rem' }} />
                <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>Créer une Nouvelle Demande de Changement (RFC)</h2>
              </div>
              <button onClick={closeModals} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={24} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', padding: '0', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                <RfcCreate 
                  isModal={true} 
                  onSuccess={() => { 
                    closeModals(); 
                    fetchData(); 
                    showToast('RFC créée avec succès !', 'success'); 
                  }} 
                  onCancel={closeModals} 
                />
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Approbation RFC ───────────────────────────────── */}
      {approvalModal.open && (
        <div className="modal-backdrop-cab" onClick={() => setApprovalModal({ open: false, rfc: null, pendingId: null })}>
          <div className="modal-box-cab glass-card-cab tm-modal-medium" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper tm-icon-success"><FiCheckCircle /></div>
              <div className="rfc-style-header-text">
                <h2>Approuver la RFC</h2>
                <div className="rfc-style-subtitle">Un changement sera créé automatiquement</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setApprovalModal({ open: false, rfc: null, pendingId: null })}><FiX size={24} /></button>
            </div>

            <div className="modal-body-rfc-style">
              {/* RFC info */}
              <div style={{ background: 'rgba(248, 250, 252, 0.5)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', border: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>RFC Sélectionnée</div>
                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>{approvalModal.rfc?.titre_rfc}</div>
                <div style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: '700' }}>#{approvalModal.rfc?.code_rfc}</div>
              </div>

              <div className="tm-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Change Manager */}
                <div className="form-group-cab">
                  <label>Change Manager <span className="tm-required">*</span></label>
                  <select
                    value={approvalForm.id_change_manager}
                    onChange={e => setApprovalForm(f => ({ ...f, id_change_manager: e.target.value }))}
                    className="premium-input-style"
                    required
                  >
                    <option value="">Sélectionner un profil...</option>
                    {changeManagers.map(cm => (
                      <option key={cm.id_user} value={cm.id_user}>
                        👤 {cm.prenom_user} {cm.nom_user}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Environnement */}
                <div className="form-group-cab">
                  <label>Environnement cible <span className="tm-required">*</span></label>
                  <select
                    value={approvalForm.id_env}
                    onChange={e => setApprovalForm(f => ({ ...f, id_env: e.target.value }))}
                    className="premium-input-style"
                    required
                  >
                    <option value="">Sélectionner un environnement...</option>
                    {environments.map(env => (
                      <option key={env.id_env} value={env.id_env}>🌐 {env.nom_env}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="modal-footer-rfc-style">
              <button type="button" className="btn-cancel-rfc-style" onClick={() => setApprovalModal({ open: false, rfc: null, pendingId: null })}>
                Annuler
              </button>
              <button 
                type="button" 
                className="btn-submit-rfc-style" 
                disabled={approvalLoading} 
                onClick={submitApproval}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)' }}
              >
                {approvalLoading ? <FiRefreshCw className="spin" /> : <FiCheckCircle />}
                {approvalLoading ? 'En cours...' : 'Confirmer l\'approbation'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal Deletion Confirmation */}
      {showConfirmDelete && (
        <ConfirmModal
          isOpen={showConfirmDelete}
          title="Supprimer la RFC"
          message={`Voulez-vous vraiment supprimer définitivement la RFC #${rfcToDelete?.code_rfc} ? Cette action est irréversible.`}
          onConfirm={handleDeleteRfc}
          onCancel={() => { setShowConfirmDelete(false); setRfcToDelete(null); }}
          danger={true}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default RfcManagement;