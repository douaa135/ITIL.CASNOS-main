import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  FiFileText, FiClock, FiSearch, FiRefreshCw, FiEye, FiCheckCircle,
  FiXCircle, FiPlus, FiFilter, FiAlertTriangle, FiZap, FiEdit3,
  FiTrash2, FiClipboard, FiSend, FiMessageSquare, FiShield, FiActivity, FiPaperclip, FiX, FiCalendar, FiGlobe, FiInfo,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiLayers, FiAlertCircle
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import changeService from '../../services/changeService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import ConfirmModal from '../../components/common/ConfirmModal';
import PremiumToolbar from '../../components/common/PremiumToolbar';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import EnvironmentBadge from '../../components/common/EnvironmentBadge';
import { getEnvName } from '../../utils/rfcUtils';
import RfcCreate from '../demandeur/RfcCreate';
import { RFC_TRANSITIONS, RFC_STATUS_VARIANT } from '../../utils/constants';

// Extracted Components
import RfcDetailModal from './components/RfcDetailModal';
import PirModal from './components/PirModal';
import RfcApprovalModal from './components/RfcApprovalModal';
import TriageModal from './components/TriageModal';

import '../changemanager/RfcManagement.css';
import '../admin/AdminUnified.css';

const ITEMS_PER_PAGE = 10;

// ── Helpers ──────────────────────────────────────────────────
const getStatusClass = (code) => {
  switch (code) {
    case 'BROUILLON': return 'status-orange';
    case 'SOUMIS': return 'status-blue';
    case 'EVALUEE': return 'status-indigo';
    case 'PRE_APPROUVEE': return 'status-yellow';
    case 'APPROUVEE': return 'status-green';
    case 'PLANIFIEE': return 'status-teal';
    case 'EN_COURS': return 'status-pink';
    case 'REJETEE': return 'status-red';
    case 'CLOTUREE': return 'status-slate';
    case 'ANNULEE': return 'status-red';
    default: return 'status-default';
  }
};

const isLate = (rfc) => {
  if (!rfc.date_souhaitee) return false;
  if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
  return new Date(rfc.date_souhaitee) < new Date();
};

// ── Main Component ───────────────────────────────────────────
const AdminRfcManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  // État des données
  const [rfcs, setRfcs] = useState([]);
  const [deletedRfcIds, setDeletedRfcIds] = useState(
    () => JSON.parse(localStorage.getItem('deleted_rfcs') || '[]')
  );
  const [loading, setLoading] = useState(true);
  const [rfcTypes, setRfcTypes] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [priorities, setPriorities] = useState([]);
  const [directions, setDirections] = useState([]);
  const [filterDirection, setFilterDirection] = useState('');

  // État UI
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [kpiFilter, setKpiFilter] = useState('');
  const [selectedRfc, setSelectedRfc] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [showPir, setShowPir] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page quand les filtres changent
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus, filterType, kpiFilter]);

  // Popup approbation
  const [approvalModal, setApprovalModal] = useState({ open: false, rfc: null, pendingId: null });
  const [approvalForm, setApprovalForm] = useState({ id_change_manager: '', id_env: '' });
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });

  // Formulaire de traitement
  const [selectedType, setSelectedType] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [pirChecklist, setPirChecklist] = useState({ objectives: false, incidents: false, rollback: false, stakeholders: false });

  // État Création RFC
  const [showCreate, setShowCreate] = useState(false);
  const [cis, setCis] = useState([]);
  const [createForm, setCreateForm] = useState({ titre_rfc: '', description: '', justification: '', date_souhaitee: '', urgence: false, impacte_estimee: '', ci_ids: [] });
  const [createLoading, setCreateLoading] = useState(false);

  // ├ëtat ├ëdition
  const [editDetail, setEditDetail] = useState(false);
  const [detailForm, setDetailForm] = useState({ titre_rfc: '', description: '', justification: '', date_souhaitee: '', impacte_estimee: '', ci_ids: [], id_statut: '' });

  // Risque & Histoire
  const [risk, setRisk] = useState({ impact: 1, probabilite: 1, score: 1, notes: '' });
  const [history, setHistory] = useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toast, setToast] = useState(null);
  const [rfcToDelete, setRfcToDelete] = useState(null);

  // Changement & Tâches liés
  const [relatedChange, setRelatedChange] = useState(null);
  const [changeTasks, setChangeTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

  // Service Desk Triage variables
  const [showTriageModal, setShowTriageModal] = useState(false);
  const [triageAnalysis, setTriageAnalysis] = useState('');
  const [selectedPriority, setSelectedPriority] = useState('');
  const [selectedChangeManager, setSelectedChangeManager] = useState('');
  const [submittingTriage, setSubmittingTriage] = useState(false);

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rfcDataRes, changeDataRes] = await Promise.all([
        rfcService.getAllRfcs(),
        changeService.getAllChangements().catch(() => [])
      ]);

      const rfcData = rfcDataRes?.rfcs || rfcDataRes?.data?.rfcs || rfcDataRes?.data || (Array.isArray(rfcDataRes) ? rfcDataRes : []);
      const changeData = changeDataRes?.changements || changeDataRes?.data?.changements || changeDataRes?.data || (Array.isArray(changeDataRes) ? changeDataRes : []);

      const deletedIds = JSON.parse(localStorage.getItem('deleted_rfcs') || '[]');
      const filteredRfcs = Array.isArray(rfcData) ? rfcData : [];

        // On enrichit les RFC avec l'environnement du changement lié si disponible
        const enrichedRfcs = filteredRfcs.map(rfc => {
          const rel = Array.isArray(changeData) ? changeData.find(c => c.id_rfc === rfc.id_rfc) : null;
          
          // Détection exhaustive de l'ID d'environnement
          const envId = rfc.id_env || rfc.id_environnement || rfc.environnement_id || rfc.id_site || rfc.site_id ||
                      rfc.evaluationRisque?.id_env || rfc.evaluationRisque?.id_environnement || 
                      rel?.id_env || rel?.id_environnement || 
                      rfc.demande?.id_env || rfc.demande?.id_environnement || rfc.demande?.id_site ||
                      (typeof rfc.environnement === 'number' ? rfc.environnement : null);
          
          return {
            ...rfc,
            id_env: envId
          };
        });

      setRfcs(enrichedRfcs);
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
      setChangeManagers(Array.isArray(cm) ? cm : (cm?.data || cm?.users || []));
      setCis(ciList);
      setPriorities(p);
      const dirs = await api.get('/directions').then(res => res.data.directions || res.data || []).catch(() => []);
      setDirections(dirs);
    } catch (e) {
      console.error('Metadata fetch error', e);
    }
  }, []);

  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const kpi = params.get('kpi');
    if (kpi) {
      setKpiFilter(kpi);
    }
  }, [location.search]);

  useEffect(() => { fetchData(); fetchMetadata(); }, [fetchData, fetchMetadata]);

  // WebSocket auto-refresh
  useEffect(() => {
    if (!socket) return;
    const handleWs = () => { if (typeof fetchData === 'function') fetchData(); };
    socket.on('rfc:update', handleWs);
    return () => { socket.off('rfc:update', handleWs); };
  }, [fetchData, socket]);


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

  const handleOpenProcess = async (rfc) => {
    if (!rfc) return;

    if (rfc.statut?.code_statut === 'SOUMIS') {
      setSelectedRfc(rfc);
      setSelectedType(rfc.typeRfc?.id_type || rfc.id_type || '');
      setSelectedEnv(rfc.environnement?.id_env || rfc.id_env || '');
      setSelectedPriority(rfc.id_priorite || '');
      setSelectedChangeManager(rfc.id_user || '');
      setTriageAnalysis('');
      setShowTriageModal(true);
      return;
    }

    setShowProcess(true);
    setSelectedRfc(rfc);
    setSelectedType(rfc.typeRfc?.id_type || rfc.id_type || '');
    setSelectedEnv(rfc.environnement?.id_env || rfc.id_env || '');
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

    if (rfc.id_rfc) fetchComments(rfc.id_rfc);

    // Récupération du changement et des tâches liés depuis la BDD
    setTasksLoading(true);
    try {
      const change = await changeService.getChangeByRfc(rfc.id_rfc);
      setRelatedChange(change || null);
      if (change) {
        const tasks = await changeService.getTasksByChange(change.id_changement);
        setChangeTasks(tasks || []);
      } else {
        setChangeTasks([]);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération du changement/tâches:", err);
      setRelatedChange(null);
      setChangeTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handlePreevaluer = async () => {
    if (!selectedRfc) return;
    const preApprouvedStatus = statuses.find(s => s.code_statut === 'PRE_APPROUVEE');
    if (!preApprouvedStatus) { showToast('Statut PRE_APPROUVEE introuvable.', 'error'); return; }

    setSubmittingTriage(true);
    try {
      await api.put(`/rfc/${selectedRfc.id_rfc}`, {
        id_type: selectedType || undefined,
        id_env: selectedEnv || undefined,
        id_priorite: selectedPriority || undefined,
        id_user: selectedChangeManager || undefined,
      });

      await api.patch(`/rfc/${selectedRfc.id_rfc}/status`, {
        id_statut: preApprouvedStatus.id_statut,
        commentaire: triageAnalysis.trim() || 'Pré-évaluation (Admin) — Transfert au Change Manager.'
      });

      showToast('RFC pré-évaluée et transférée avec succès !', 'success');
      setShowTriageModal(false);
      setSelectedRfc(null);
      fetchData();
    } catch (error) {
      showToast('Erreur lors de la pré-évaluation.', 'error');
    } finally {
      setSubmittingTriage(false);
    }
  };

  const handleTriageDecision = async (statusCode) => {
    if (!selectedRfc) return;
    const targetStatus = statuses.find(s => s.code_statut === statusCode);
    if (!targetStatus) { showToast('Statut introuvable.', 'error'); return; }

    setSubmittingTriage(true);
    try {
      await api.patch(`/rfc/${selectedRfc.id_rfc}/status`, {
        id_statut: targetStatus.id_statut,
        commentaire: triageAnalysis.trim() || undefined
      });
      showToast(`RFC mise à jour vers le statut ${statusCode} avec succès.`, 'success');
      setShowTriageModal(false);
      setSelectedRfc(null);
      fetchData();
    } catch (error) {
      showToast('Erreur lors du traitement du triage.', 'error');
    } finally {
      setSubmittingTriage(false);
    }
  };

  const closeModals = () => {
    setShowProcess(false); setShowPir(false); setShowCreate(false);
    setSelectedRfc(null); setComments([]); setNewComment('');
    setEditDetail(false);
    setCreateForm({ titre_rfc: '', description: '', justification: '', date_souhaitee: '', urgence: false, impacte_estimee: '', ci_ids: [] });
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.titre_rfc || !createForm.description) return setToast({ msg: 'Titre et Description requis.', type: 'error' });
    setCreateLoading(true);
    try {
      await rfcService.createAndSubmitRfc(createForm);
      setToast({ msg: 'RFC créée et soumise avec succès !', type: 'success' });
      closeModals(); fetchData();
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de la création', type: 'error' });
    } finally { setCreateLoading(false); }
  };

  const handleUpdateDetail = async () => {
    try {
      // Nettoyage des données avant envoi
      const sanitizedData = { ...detailForm };
      if (!sanitizedData.date_souhaitee) delete sanitizedData.date_souhaitee;

      await rfcService.updateRfc(selectedRfc.id_rfc, sanitizedData);

      const currentStatutId = selectedRfc.id_statut || selectedRfc.statut?.id_statut;
      if (detailForm.id_statut && detailForm.id_statut !== currentStatutId) {
        await rfcService.updateRfcStatus(selectedRfc.id_rfc, detailForm.id_statut, {
          id_change_manager: selectedRfc.id_change_manager || user?.id_user,
          id_env: selectedEnv || getEnvName(selectedRfc, environments) || selectedRfc.id_env || selectedRfc.environnement?.id_env
        });
      }

      // Alignement avec les clés attendues par le backend (_impacte, _probabilite, _score)
      const sanitizedRisk = {
        _impacte: risk.impact,
        _probabilite: risk.probabilite,
        _score: risk.score,
        description: risk.notes || ""
      };

      try { await rfcService.upsertEvaluationRisque(selectedRfc.id_rfc, sanitizedRisk); } catch (_) { }

      setToast({ msg: 'RFC mise à jour avec succès.', type: 'success' });
      setEditDetail(false); fetchData();
    } catch (err) {
      console.error('Update error:', err);
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de la mise à jour.', type: 'error' });
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

  const handleDeleteRfc = () => {
    if (!rfcToDelete) return;
    const code = rfcToDelete.statut?.code_statut;
    if (code !== 'SOUMIS') {
      setToast({ msg: 'Suppression impossible : La RFC doit etre au statut SOUMIS pour pouvoir etre supprimee.', type: 'error' });
      setShowConfirmDelete(false); setRfcToDelete(null);
      return;
    }
    // Suppression logique persistante via localStorage
    const updatedDeleted = [...deletedRfcIds, rfcToDelete.id_rfc];
    setDeletedRfcIds(updatedDeleted);
    localStorage.setItem('deleted_rfcs', JSON.stringify(updatedDeleted));
    // On ne filtre plus l'état local car on veut garder les records pour le KPI "Deleted"
    setShowConfirmDelete(false); setRfcToDelete(null);
    closeModals();
    setToast({ msg: 'RFC supprimée avec succès.', type: 'success' });
  };

  const handleDecision = async (newStatusCode) => {
    try {
      const targetStatut = statuses.find(s => s.code_statut === newStatusCode);
      if (!targetStatut) return alert('Statut non configuré.');
      if (newStatusCode === 'APPROUVEE') { handleApproveRfc(selectedRfc, targetStatut.id_statut); return; }
      setApprovalLoading(true);
      try {
        await rfcService.updateRfcStatus(selectedRfc.id_rfc, targetStatut.id_statut, {
          id_env: selectedEnv || selectedRfc.id_env || null,
          id_change_manager: user?.id_user,
        });
        fetchData();
        setToast({ msg: `Décision "${newStatusCode}" enregistrée.`, type: 'success' });
      } catch (err) {
        showToast(err?.error?.message || err?.message || 'Erreur lors du changement de statut.', 'error');
      } finally { setApprovalLoading(false); }
    } catch (e) { alert('Erreur lors du traitement de la décision.'); }
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
      showToast(err?.error?.message || err?.message || 'Erreur lors du changement de statut.', 'error');
    }
  };

  const submitApproval = async () => {
    if (!approvalForm.id_change_manager || !approvalForm.id_env) {
      showToast("Veuillez sélectionner un Change Manager et un Environnement.", 'error');
      return;
    }
    setApprovalLoading(true);
    try {
      const res = await rfcService.updateRfcStatus(approvalModal.rfc.id_rfc, approvalModal.pendingId, {
        id_env: approvalForm.id_env,
        id_change_manager: approvalForm.id_change_manager,
        date_debut: approvalModal.rfc.date_souhaitee || new Date().toISOString()
      });
      if (!res?.changement && !res?.data?.changement) {
        try {
          await changeService.createChangement({
            id_rfc: approvalModal.rfc.id_rfc,
            id_env: approvalForm.id_env,
            id_change_manager: approvalForm.id_change_manager,
            date_debut: approvalModal.rfc.date_souhaitee || new Date().toISOString()
          });
        } catch (manualErr) { console.error("Manual change creation failed:", manualErr); }
      }
      setApprovalModal({ open: false, rfc: null, pendingId: null });
      fetchData();
      showToast('RFC approuvée et Changement créé avec succès !', 'success');
    } catch (err) {
      showToast(`Erreur : ${err?.error?.message || err?.message || 'Erreur lors de l\'approbation.'}`, 'error');
    } finally { setApprovalLoading(false); }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    try {
      await rfcService.addCommentaire(selectedRfc.id_rfc, newComment);
      setNewComment(''); fetchComments(selectedRfc.id_rfc);
      setToast({ msg: 'Commentaire ajouté.', type: 'success' });
    } catch (e) { setToast({ msg: 'Erreur lors du commentaire', type: 'error' }); }
  };

  const sortedStatuses = useMemo(() => {
    const allowed = ['SOUMIS', 'PRE_APPROUVEE', 'EVALUEE'];
    return statuses.filter(s => allowed.includes(s.code_statut));
  }, [statuses]);

  // ── Filtrage — UNIQUEMENT les statuts SOUMIS, PRE_APPROUVEE, EVALUEE ──
  const ALLOWED_STATUSES = ['SOUMIS', 'PRE_APPROUVEE', 'EVALUEE'];

  const filtered = rfcs.filter(r => {
    // On cache les supprimés localement (localStorage)
    if (deletedRfcIds.includes(r.id_rfc)) return false;

    // ── Filtre dur : seuls les 3 statuts de traitement sont autorisés ──
    if (!ALLOWED_STATUSES.includes(r.statut?.code_statut)) return false;

    const q = search.toLowerCase();
    const matchSearch = !search ||
      (r.titre_rfc || '').toLowerCase().includes(q) ||
      (r.code_rfc || '').toLowerCase().includes(q) ||
      `${r.demandeur?.prenom_user || ''} ${r.demandeur?.nom_user || ''}`.toLowerCase().includes(q);

    let matchStatus = true;
    if (kpiFilter) {
      if (kpiFilter === 'URGENT') {
        const typeStr = (r.typeRfc?.type || r.type || r.typeRfc?.code_type || '').toUpperCase();
        const prioStr = String(r.priorite?.libelle || r.priorite?.code_priorite || r.id_priorite || '').toUpperCase();
        const isUrgent = typeStr.includes('URGENT') || prioStr.includes('URGENT') || prioStr.includes('CRITIQUE') || prioStr.includes('HAUTE') || prioStr.includes('P0') || prioStr.includes('P1') || r.urgence === true || r.urgence === 1 || r.urgence === 'true';
        matchStatus = isUrgent && ['SOUMIS', 'PRE_APPROUVEE', 'EVALUEE'].includes(r.statut?.code_statut);
      } else if (kpiFilter === 'LATE') {
        matchStatus = isLate(r);
      } else {
        matchStatus = r.statut?.code_statut === kpiFilter;
      }
    } else if (filterStatus) {
      matchStatus = r.statut?.code_statut === filterStatus;
    }

    const matchType = !filterType ||
      (filterType.toUpperCase() === 'URGENT'
        ? ((r.typeRfc?.type || '').toUpperCase() === 'URGENT' || r.urgence === true || r.urgence === 1 || r.urgence === 'true' || ['P0', 'P1', 'HAUTE', 'CRITIQUE'].includes(String(r.priorite?.code_priorite || r.id_priorite || '').toUpperCase()))
        : (r.typeRfc?.type || '').toUpperCase() === filterType.toUpperCase()
      );
    const matchDirection = !filterDirection || r.demandeur?.direction?.nom_direction === filterDirection;
    return matchSearch && matchStatus && matchType && matchDirection;
  });

  // ── KPI — toujours sur rfcs complet (BDD) ─────────────────
  const activeRfcs      = rfcs.filter(r => !deletedRfcIds.includes(r.id_rfc));
  const kpiSoumis       = activeRfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length;
  const kpiPreApprouvee = activeRfcs.filter(r => r.statut?.code_statut === 'PRE_APPROUVEE').length;
  const kpiEvaluee      = activeRfcs.filter(r => r.statut?.code_statut === 'EVALUEE').length;
  const kpiUrgent = activeRfcs.filter(r => {
    const typeStr = (r.typeRfc?.type || r.type || r.typeRfc?.code_type || '').toUpperCase();
    const prioStr = String(r.priorite?.libelle || r.priorite?.code_priorite || r.id_priorite || '').toUpperCase();
    const isUrgent = typeStr.includes('URGENT') || prioStr.includes('URGENT') || prioStr.includes('CRITIQUE') || prioStr.includes('HAUTE') || prioStr.includes('P0') || prioStr.includes('P1') || r.urgence === true || r.urgence === 1 || r.urgence === 'true';
    return isUrgent && ['SOUMIS', 'PRE_APPROUVEE', 'EVALUEE'].includes(r.statut?.code_statut);
  }).length;

  // ── Pagination (sur filtered) ─────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) pages.push(i);
      else if (pages[pages.length - 1] !== '...') pages.push('...');
    }
    return pages;
  };

  const pirAllChecked = Object.values(pirChecklist).every(v => v);

  const thStyle = {
    padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.07em',
    color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap',
  };
  const tdStyle = {
    padding: '14px 16px', fontSize: '0.875rem',
    color: '#334155', verticalAlign: 'middle',
  };
  const btnPage = (disabled) => ({
    padding: '5px 10px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    background: disabled ? '#f8fafc' : 'white',
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', fontWeight: '600', fontSize: '0.8rem',
  });

  return (
    <div className="rfc-mgr-page">

      {/* ── HEADER ─────────────────────────────────────────── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiClipboard /></div>
          <div className="premium-header-text">
            <h1>Gestion des RFC</h1>
            <p>Configurez les demandes de changement et supervisez l'évaluation et l'approbation du système</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={fetchData} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <FiRefreshCw /> Actualiser
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-create-premium">
            <FiPlus /> Nouvelle RFC
          </button>
        </div>
      </div>

      {/* ── KPI ROW ── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {/* Soumises */}
        <div className={`stat-card blue ${!kpiFilter && filterStatus === 'SOUMIS' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setKpiFilter(''); setFilterStatus('SOUMIS'); }}>
          <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiSend size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiSoumis}</div>
            <div className="stat-label">Soumises</div>
          </div>
        </div>

        {/* Pré-approuvées */}
        <div className={`stat-card amber ${!kpiFilter && filterStatus === 'PRE_APPROUVEE' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setKpiFilter(''); setFilterStatus('PRE_APPROUVEE'); }}>
          <div className="stat-icon-wrapper"><FiClock size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiPreApprouvee}</div>
            <div className="stat-label">Pré-approuvées</div>
          </div>
        </div>

        {/* Évaluées */}
        <div className={`stat-card purple ${!kpiFilter && filterStatus === 'EVALUEE' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setKpiFilter(''); setFilterStatus('EVALUEE'); }}>
          <div className="stat-icon-wrapper" style={{ background: '#f5f3ff', color: '#7c3aed' }}><FiActivity size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiEvaluee}</div>
            <div className="stat-label">Évaluées</div>
          </div>
        </div>

        {/* Urgentes */}
        <div className={`stat-card red ${kpiFilter === 'URGENT' ? 'selected-active' : ''}`} style={{ cursor: 'pointer', borderLeft: '3px solid #ef4444' }} onClick={() => { setKpiFilter('URGENT'); setFilterStatus(''); }}>
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiAlertCircle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiUrgent}</div>
            <div className="stat-label">Urgentes</div>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <PremiumToolbar
        searchProps={{
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Rechercher une RFC..."
        }}
        filters={[
          {
            value: filterStatus,
            onChange: (e) => { setFilterStatus(e.target.value); setKpiFilter(''); },
            placeholder: "Tous les statuts",
            options: sortedStatuses.map(s => ({ value: s.code_statut, label: s.libelle }))
          },
          {
            value: filterType,
            onChange: (e) => setFilterType(e.target.value),
            placeholder: "Tous les types",
            options: rfcTypes.map(t => ({ value: t.type, label: t.type }))
          },
          {
            value: filterDirection,
            onChange: (e) => setFilterDirection(e.target.value),
            placeholder: "Toutes les directions",
            options: directions.map(d => ({ value: d.nom_direction, label: d.nom_direction }))
          }
        ]}
        onReset={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterDirection(''); setKpiFilter(''); }}
        showReset={!!(search || filterStatus || filterType || filterDirection || kpiFilter)}
      />

      {/* ── TABLE ──────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>
                  RFC & Code
                </th>
                <th style={thStyle}>Demandeur</th>
                <th style={{ ...thStyle, width: '180px' }}>Direction</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Priorité</th>
                <th style={thStyle}>Environnement</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                <th className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement des RFCs...</td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucune RFC trouvée.
                  </td>
                </tr>
              ) : paginated.map((rfc) => (
                <tr key={rfc.id_rfc} onClick={() => handleOpenProcess(rfc)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  {/* 1. RFC titre + code */}
                  <td className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9' }}>
                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }} title={rfc.titre_rfc}>
                      {rfc.titre_rfc}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>#{rfc.code_rfc}</div>
                  </td>

                  {/* 2. Demandeur */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {(() => {
                        const prenom = rfc.demandeur?.prenom_user || '';
                        const nom = rfc.demandeur?.nom_user || '';
                        const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
                        const colors = [
                          { bg: '#dbeafe', color: '#1d4ed8' }, { bg: '#d1fae5', color: '#065f46' },
                          { bg: '#fef3c7', color: '#92400e' }, { bg: '#ede9fe', color: '#5b21b6' },
                          { bg: '#fce7f3', color: '#9d174d' }, { bg: '#e0f2fe', color: '#0369a1' },
                        ];
                        const palette = colors[(prenom.charCodeAt(0) || 0) % colors.length];
                        return initiales ? (
                          <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                            {initiales}
                          </div>
                        ) : (
                          <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <FiFileText size={14} color="#94a3b8" />
                          </div>
                        );
                      })()}
                      <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                        {`${rfc.demandeur?.prenom_user || '—'} ${rfc.demandeur?.nom_user || ''}`.trim()}
                      </span>
                    </div>
                  </td>

                  {/* Direction */}
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                        {rfc.demandeur?.direction?.nom_direction || '—'}
                      </span>
                    </div>
                  </td>

                  {/* 3. Type */}
                  <td style={tdStyle}>
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
                        try { await rfcService.updateRfc(rfc.id_rfc, { id_type: newId }); fetchData(); }
                        catch (err) { alert('Erreur lors de la mise à jour du type'); }
                      }}
                      isEditable={true}
                    />
                  </td>

                  {/* 4. Priorité */}
                  <td style={tdStyle}>
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
                        try { await rfcService.updateRfc(rfc.id_rfc, { id_priorite: newId }); fetchData(); }
                        catch (err) { alert('Erreur lors de la mise à jour de la priorité'); }
                      }}
                      isEditable={true}
                    />
                  </td>

                  {/* 5. Environnement */}
                  <td style={tdStyle}>
                    <EnvironmentBadge item={rfc} environments={environments} />
                  </td>

                  {/* 6. Statut */}
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    <InlineEditableBadge
                      currentValue={rfc.statut?.id_statut}
                      label={rfc.statut?.libelle || 'N/A'}
                      currentCode={rfc.statut?.code_statut}
                      options={statuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                      allowedCodes={RFC_TRANSITIONS[rfc.statut?.code_statut] || []}
                      getVariantByCode={(code) => RFC_STATUS_VARIANT[code] || 'default'}
                      onUpdate={(newId) => handleApproveRfc(rfc, newId)}
                      isEditable={true}
                      dropdownPosition="up"
                    />
                  </td>

                  {/* 7. Actions */}
                  <td className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                      <button onClick={e => { e.stopPropagation(); handleOpenProcess(rfc); }} title="Consulter"
                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                        onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                        <FiEye size={15} />
                      </button>
                      {/* Bouton Supprimer - visible seulement si SOUMIS */}
                      {(() => {
                        const canDelete = rfc.statut?.code_statut === 'SOUMIS';
                        return (
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              if (!canDelete) {
                                setToast({ msg: `Suppression impossible : la RFC doit ├¬tre au statut SOUMIS (statut actuel┬á: ${rfc.statut?.libelle || rfc.statut?.code_statut}).`, type: 'error' });
                                return;
                              }
                              setRfcToDelete(rfc); setShowConfirmDelete(true);
                            }}
                            title={canDelete ? 'Supprimer' : `Suppression impossible (statut┬á: ${rfc.statut?.libelle || rfc.statut?.code_statut})`}
                            disabled={!canDelete}
                            style={{
                              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                              background: canDelete ? '#fef2f2' : '#f8fafc',
                              color: canDelete ? '#ef4444' : '#cbd5e1',
                              border: 'none', borderRadius: '8px',
                              cursor: canDelete ? 'pointer' : 'not-allowed',
                              transition: 'background 0.15s',
                              opacity: canDelete ? 1 : 0.5
                            }}
                            onMouseEnter={e => { if (canDelete) e.currentTarget.style.background = '#fee2e2'; }}
                            onMouseLeave={e => { if (canDelete) e.currentTarget.style.background = '#fef2f2'; }}
                          >
                            <FiTrash2 size={15} />
                          </button>
                        );
                      })()}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Footer pagination ──────────────────────────── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {filtered.length === 0
              ? '0 résultat'
              : <>
                <strong style={{ color: '#64748b' }}>
                  {(safePage - 1) * ITEMS_PER_PAGE + 1} - {Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}
                </strong>
                {' '}sur{' '}
                <strong style={{ color: '#64748b' }}>{filtered.length}</strong>
                {filtered.length !== rfcs.length && (
                  <span style={{ color: '#cbd5e1' }}> (filtré · {rfcs.length} au total)</span>
                )}
              </>
            }
          </span>

          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button disabled={safePage === 1} onClick={() => setCurrentPage(1)} style={btnPage(safePage === 1)} title="Première page">
                <FiChevronsLeft size={14} />
              </button>
              <button disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)} style={btnPage(safePage === 1)} title="Page précédente">
                <FiChevronLeft size={14} />
              </button>

              {getPageNumbers().map((p, idx) =>
                p === '...'
                  ? <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>ÔÇª</span>
                  : (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      style={{ ...btnPage(false), border: `1.5px solid ${p === safePage ? '#7c3aed' : '#e2e8f0'}`, background: p === safePage ? '#7c3aed' : 'white', color: p === safePage ? 'white' : '#475569', fontWeight: p === safePage ? '700' : '500', minWidth: '34px' }}>
                      {p}
                    </button>
                  )
              )}

              <button disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={btnPage(safePage === totalPages)} title="Page suivante">
                <FiChevronRight size={14} />
              </button>
              <button disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)} style={btnPage(safePage === totalPages)} title="Dernière page">
                <FiChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS REFACTORED ── */}
      <RfcDetailModal
        show={showProcess}
        onClose={closeModals}
        selectedRfc={selectedRfc}
        editDetail={editDetail}
        setEditDetail={setEditDetail}
        detailForm={detailForm}
        setDetailForm={setDetailForm}
        statuses={statuses}
        handleUpdateDetail={handleUpdateDetail}
        rfcTypes={rfcTypes}
        environments={environments}
        priorities={priorities}
        selectedEnv={selectedEnv}
        setSelectedEnv={setSelectedEnv}
        relatedChange={relatedChange}
        changeTasks={changeTasks}
        tasksLoading={tasksLoading}
        risk={risk}
        setRisk={setRisk}
        comments={comments}
        newComment={newComment}
        setNewComment={setNewComment}
        handleAddComment={handleAddComment}
        history={history}
        handleDecision={handleDecision}
        showReportForm={showReportForm}
        setShowReportForm={setShowReportForm}
        getStatusClass={getStatusClass}
      />

      <PirModal
        show={showPir}
        onClose={closeModals}
        rfc={selectedRfc}
        pirChecklist={pirChecklist}
        setPirChecklist={setPirChecklist}
        onConfirm={() => handleDecision('CLOTUREE')}
        pirAllChecked={pirAllChecked}
      />

      {showCreate && (
        <div className="modal-backdrop" onClick={closeModals}>
          <div className="modal-box" style={{ maxWidth: '900px', width: '95%', display: 'flex', flexDirection: 'column', maxHeight: '95vh', padding: 0, background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiPlus /></div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Nouvelle Demande de Changement (RFC)</h2>
                <p className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Création d'une nouvelle demande administrative</p>
              </div>
              <button onClick={closeModals} className="close-btn-rfc-style" style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>
            <div className="modal-body" style={{ overflowY: 'auto', padding: '0', background: '#f8fafc' }}>
              <RfcCreate isModal={true} onSuccess={() => { showToast('RFC créée avec succès !', 'success'); closeModals(); fetchData(); }} onCancel={closeModals} />
            </div>
          </div>
        </div>
      )}

      <RfcApprovalModal
        show={approvalModal.open}
        onClose={() => setApprovalModal({ open: false, rfc: null, pendingId: null })}
        rfc={approvalModal.rfc}
        approvalForm={approvalForm}
        setApprovalForm={setApprovalForm}
        changeManagers={changeManagers}
        environments={environments}
        onSubmit={submitApproval}
        loading={approvalLoading}
      />

      <TriageModal
        show={showTriageModal}
        onClose={() => setShowTriageModal(false)}
        selectedRfc={selectedRfc}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        selectedPriority={selectedPriority}
        setSelectedPriority={setSelectedPriority}
        selectedEnv={selectedEnv}
        setSelectedEnv={setSelectedEnv}
        changeManagers={changeManagers}
        selectedChangeManager={selectedChangeManager}
        setSelectedChangeManager={setSelectedChangeManager}
        triageAnalysis={triageAnalysis}
        setTriageAnalysis={setTriageAnalysis}
        rfcTypes={rfcTypes}
        priorities={priorities}
        environments={environments}
        onRejet={() => handleTriageDecision('REJETEE')}
        onPreApprouver={handlePreevaluer}
        submittingTriage={submittingTriage}
      />

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

export default AdminRfcManagement;
