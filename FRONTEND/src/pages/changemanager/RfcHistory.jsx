import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import { 
  FiFileText, FiClock, FiSearch, FiRefreshCw, FiEye, FiCheckCircle, 
  FiXCircle, FiPlus, FiFilter, FiAlertTriangle, FiZap, FiEdit3, 
  FiTrash2, FiClipboard, FiSend, FiMessageSquare, FiShield, FiActivity, FiPaperclip, FiX, FiCalendar, FiGlobe, FiInfo,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiLayers, FiAlertCircle, FiCheckSquare, FiCheck, FiDownload
} from 'react-icons/fi';
import { RFC_TRANSITIONS, RFC_STATUS_VARIANT } from '../../utils/constants';
import rfcService from '../../services/rfcService';
import changeService from '../../services/changeService';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import Avatar from '../../components/common/Avatar';
import RfcCreate from '../demandeur/RfcCreate';
import RfcDetailModal from '../admin/components/RfcDetailModal';
import ChangementDetailModal from '../admin/components/ChangementDetailModal';
import { TaskDetailModal } from '../admin/TaskManagement';
import './RfcManagement.css';
import '../admin/AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';

const ITEMS_PER_PAGE = 10;

// ── Helpers ──────────────────────────────────────────────────
const getStatusClass = (code) => {
  switch(code) {
    case 'BROUILLON':     return 'status-orange';
    case 'SOUMIS':        return 'status-blue';
    case 'EN_EVALUATION': return 'status-purple';
    case 'EVALUEE':       return 'status-indigo';
    case 'PRE_APPROUVEE': return 'status-yellow';
    case 'APPROUVEE':     return 'status-green';
    case 'PLANIFIEE':     return 'status-teal';
    case 'EN_COURS':      return 'status-pink';
    case 'REJETEE':       return 'status-red';
    case 'CLOTUREE':      return 'status-slate';
    case 'ANNULEE':       return 'status-red';
    default:              return 'status-default';
  }
};

// ── Main Component ───────────────────────────────────────────
const RfcHistory = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // État des données
  const [rfcs,           setRfcs]           = useState([]);
  const [allChanges,     setAllChanges]     = useState([]);
  const [allTasks,       setAllTasks]       = useState([]);
  const [activeTab,      setActiveTab]      = useState('rfcs'); // 'rfcs' | 'changes' | 'tasks'
  const [deletedRfcIds,  setDeletedRfcIds]  = useState(
    () => JSON.parse(localStorage.getItem('deleted_rfcs') || '[]')
  );
  const [loading,        setLoading]        = useState(true);
  const [rfcTypes,       setRfcTypes]       = useState([]);
  const [statuses,       setStatuses]       = useState([]);
  const [environments,   setEnvironments]   = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [comments,       setComments]       = useState([]);
  const [newComment,     setNewComment]     = useState('');
  const [priorities,     setPriorities]     = useState([]);
  const [directions,     setDirections]     = useState([]);
  const [filterDirection, setFilterDirection] = useState('');
  const [usersMap, setUsersMap] = useState({});

  // État UI
  const [search,       setSearch]       = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [kpiFilter,    setKpiFilter]    = useState('');
  const [selectedRfc,  setSelectedRfc]  = useState(null);
  const [showProcess,  setShowProcess]  = useState(false);
  const [showPir,      setShowPir]      = useState(false);

  // Nouvelles modales de détails historiques
  const [selectedRfcDetails, setSelectedRfcDetails] = useState(null);
  const [selectedChangeDetails, setSelectedChangeDetails] = useState(null);
  const [selectedTaskDetails, setSelectedTaskDetails] = useState(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page quand les filtres changent
  useEffect(() => { setCurrentPage(1); }, [search, filterStatus, filterType, kpiFilter]);

  // Popup approbation
  const [approvalModal,   setApprovalModal]   = useState({ open: false, rfc: null, pendingId: null });
  const [approvalForm,    setApprovalForm]    = useState({ id_change_manager: '', id_env: '' });
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [showReportForm,  setShowReportForm]  = useState(false);
  const [reportForm,      setReportForm]      = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });

  // Formulaire de traitement
  const [selectedType, setSelectedType] = useState('');
  const [selectedEnv,  setSelectedEnv]  = useState('');
  const [pirChecklist, setPirChecklist] = useState({ objectives: false, incidents: false, rollback: false, stakeholders: false });

  // État Création RFC
  const [showCreate,    setShowCreate]    = useState(false);
  const [cis,           setCis]           = useState([]);
  const [createForm,    setCreateForm]    = useState({ titre_rfc: '', description: '', justification: '', date_souhaitee: '', urgence: false, impacte_estimee: '', ci_ids: [] });
  const [createLoading, setCreateLoading] = useState(false);

  // État Édition
  const [editDetail,  setEditDetail]  = useState(false);
  const [detailForm,  setDetailForm]  = useState({ titre_rfc: '', description: '', justification: '', date_souhaitee: '', impacte_estimee: '', ci_ids: [], id_statut: '' });

  // Risque & Histoire
  const [risk,              setRisk]              = useState({ impact: 1, probabilite: 1, score: 1, notes: '' });
  const [history,           setHistory]           = useState([]);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [toast,             setToast]             = useState(null);
  const [rfcToDelete,       setRfcToDelete]       = useState(null);

  // Modal Résultat Tâche
  const [resultModal, setResultModal] = useState({ show: false, type: '', title: '', task: null });

  // Changement & Tâches liés
  const [relatedChange, setRelatedChange] = useState(null);
  const [changeTasks, setChangeTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);

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
      const filteredRfcs = Array.isArray(rfcData) ? rfcData.filter(r => !deletedIds.includes(r.id_rfc)) : [];
      
      // On enrichit les RFC avec l'environnement du changement lié si disponible
      const enrichedRfcs = filteredRfcs.map(rfc => {
        const rel = Array.isArray(changeData) ? changeData.find(c => c.id_rfc === rfc.id_rfc) : null;
        
        // On cherche l'environnement partout où il pourrait se cacher
        const envObj = rfc.environnement || rel?.environnement || rfc.demande?.environnement || rel?.demande?.environnement;
        const envId = rfc.id_env || rfc.id_environnement || rel?.id_env || rel?.id_environnement || envObj?.id_env;
        
        return {
          ...rfc,
          environnement: envObj,
          id_env: envId
        };
      });

      setRfcs(enrichedRfcs);

      // Fetch all tasks for all changes for the Task History tab
      const tasksPromises = changeData.map(async (c) => {
        try {
          const res = await api.get(`/changements/${c.id_changement}/taches`);
          return (res.data?.taches || res.taches || res.data || []).map(t => ({
            ...t,
            changement: c,
            rfc: enrichedRfcs.find(r => r.id_rfc === c.id_rfc)
          }));
        } catch (e) { return []; }
      });
      const nestedTasks = await Promise.all(tasksPromises);
      const flattenedTasks = nestedTasks.flat().filter(t => ['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(t.statut?.code_statut || t.statut));
      setAllTasks(flattenedTasks);

      // Fetch changes for history tab
      const archivedChanges = changeData
        .filter(c => ['CLOTUREE', 'ANNULEE', 'TERMINEE', 'SUCCES'].includes(c.statut?.code_statut || c.statut))
        .map(c => ({
          ...c,
          rfc: enrichedRfcs.find(r => r.id_rfc === c.id_rfc)
        }));
      setAllChanges(archivedChanges);
    } catch (e) {
      console.error('Fetch error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchMetadata = useCallback(async () => {
    try {
      const [t, s, e, cm, ciList, p, dirsRes] = await Promise.all([
        rfcService.getTypesRfc().catch(() => []),
        rfcService.getStatuts('RFC').catch(() => []),
        rfcService.getEnvironnements().catch(() => []),
        rfcService.getChangeManagers().catch(() => []),
        rfcService.getConfigurationItems().catch(() => []),
        rfcService.getPriorites().catch(() => []),
        api.get('/directions').catch(() => [])
      ]);
      setRfcTypes(t);
      setStatuses(s);
      setEnvironments(e);
      let managers = Array.isArray(cm) ? cm : (cm?.data || cm?.users || []);
      // Fallback: Si la liste est vide (ex: 403 Forbidden pour non-admin), on ajoute au moins l'utilisateur actuel
      if (managers.length === 0 && user) {
        managers = [{ id_user: user.id_user, nom_user: user.nom_user, prenom_user: user.prenom_user }];
      } else if (user && !managers.find(m => m.id_user === user.id_user)) {
        // Optionnel: s'assurer que l'utilisateur actuel est toujours dans la liste
        managers.push({ id_user: user.id_user, nom_user: user.nom_user, prenom_user: user.prenom_user });
      }
      setChangeManagers(managers);
      setCis(ciList);
      setPriorities(p);
      const dirs = dirsRes?.data?.directions || dirsRes?.directions || (Array.isArray(dirsRes?.data) ? dirsRes.data : []);
      setDirections(dirs);
      
      const allUsers = await api.get('/users?limit=1000').then(res => res.data.data || res.data.users || res.data || []).catch(() => []);
      const map = {};
      if (Array.isArray(allUsers)) {
        allUsers.forEach(u => {
          const dirName = u.direction?.nom_direction || u.direction_name;
          if (dirName) map[u.id_user] = dirName;
        });
      }
      setUsersMap(map);
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
      if (kpi === 'URGENT') setFilterType('URGENT');
    }
    
    // Support pour la navigation depuis le Dashboard via l'état (state)
    if (location.state?.filterType === 'URGENT') {
      setKpiFilter('URGENT');
      setFilterType('URGENT');
    } else if (location.state?.filterStatus) {
      setFilterStatus(location.state.filterStatus);
      if (location.state.filterStatus === 'APPROUVEE') setKpiFilter('APPROUVEE');
      if (location.state.filterStatus === 'PRE_APPROUVEE') setKpiFilter('PRE_APPROUVEE');
    }
  }, [location]);

  useEffect(() => { fetchData(); fetchMetadata(); }, [fetchData, fetchMetadata]);

  const { socket } = useSocket();
  useEffect(() => {
    if (!socket) return;
    const handleWs = () => fetchData();
    socket.on('rfc:update', handleWs);
    return () => socket.off('rfc:update', handleWs);
  }, [socket, fetchData]);

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
          id_env: selectedEnv || selectedRfc.id_env || selectedRfc.environnement?.id_env
        });
      }

      // Alignement avec les clés attendues par le backend (_impacte, _probabilite, _score)
      const sanitizedRisk = {
        _impacte: risk.impact,
        _probabilite: risk.probabilite,
        _score: risk.score,
        description: risk.notes || ""
      };
      
      try { await rfcService.upsertEvaluationRisque(selectedRfc.id_rfc, sanitizedRisk); } catch(_) {}
      
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
    setRfcs(prev => prev.filter(r => r.id_rfc !== rfcToDelete.id_rfc));
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

  const handleApproveRfc = (rfc, pendingId) => {
    setApprovalModal({ open: true, rfc, pendingId });
    setApprovalForm({ 
      id_change_manager: user?.id_user || '', 
      id_env: rfc.id_env || rfc.environnement?.id_env || '' 
    });
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
    const allowed = ['REJETEE', 'CLOTUREE', 'ANNULEE'];
    return statuses.filter(s => allowed.includes(s.code_statut));
  }, [statuses]);

  // ── Filtrage (sur la totalité des RFCs) ───────────────────
  // ── Filtrage Historique — Uniquement les états terminaux ──
  const TERMINAL_STATUSES = ['REJETEE', 'CLOTUREE', 'ANNULEE'];

  const filtered = rfcs.filter(r => {
    // ── Filtre dur : Uniquement les dossiers terminaux (pas de redondance avec la gestion active) ──
    if (!TERMINAL_STATUSES.includes(r.statut?.code_statut)) return false;

    const q = search.toLowerCase();
    const matchSearch = !search ||
      (r.titre_rfc || '').toLowerCase().includes(q) ||
      (r.code_rfc || '').toLowerCase().includes(q) ||
      `${r.demandeur?.prenom_user || ''} ${r.demandeur?.nom_user || ''}`.toLowerCase().includes(q);

    let matchStatus;
    // Filter by KPI if kpiFilter is set
    if (kpiFilter) {
      if (kpiFilter === 'REJETEE') matchStatus = r.statut?.code_statut === 'REJETEE';
      else if (kpiFilter === 'CLOTUREE') matchStatus = r.statut?.code_statut === 'CLOTUREE';
      else if (kpiFilter === 'ANNULEE') matchStatus = r.statut?.code_statut === 'ANNULEE';
      else matchStatus = r.statut?.code_statut === kpiFilter;
    } else {
      matchStatus = filterStatus ? r.statut?.code_statut === filterStatus : true;
    }

    const matchType = !filterType || 
      (filterType.toUpperCase() === 'URGENT'
        ? ((r.typeRfc?.type || '').toUpperCase() === 'URGENT' || r.urgence === true || ['P0', 'P1', 'HAUTE', 'CRITIQUE'].includes(String(r.priorite?.code_priorite || r.id_priorite || '').toUpperCase()))
        : (r.typeRfc?.type || '').toUpperCase() === filterType.toUpperCase()
      );
    const matchDirection = !filterDirection || r.demandeur?.direction?.nom_direction === filterDirection;
    return matchSearch && matchStatus && matchType && matchDirection;
  });

  const filteredTasks = useMemo(() => {
    const q = search.toLowerCase();
    return allTasks.filter(t => {
      const matchSearch = (t.titre_tache || '').toLowerCase().includes(q) ||
        (t.code_tache || '').toLowerCase().includes(q) ||
        (t.implementeur?.prenom_user || '').toLowerCase().includes(q) ||
        (t.implementeur?.nom_user || '').toLowerCase().includes(q) ||
        (t.rfc?.code_rfc || '').toLowerCase().includes(q) ||
        (t.changement?.code_changement || '').toLowerCase().includes(q);

      let matchStatus = true;
      if (filterStatus) {
        const tStat = t.statut?.code_statut || t.statut;
        if (filterStatus === 'CLOTUREE') {
          matchStatus = ['TERMINEE', 'CLOTUREE', 'SUCCES'].includes(tStat);
        } else if (filterStatus === 'ANNULEE') {
          matchStatus = ['ANNULEE', 'EN_ECHEC'].includes(tStat);
        }
      }
      return matchSearch && matchStatus;
    });
  }, [allTasks, search, filterStatus]);

  const filteredChanges = useMemo(() => {
    const q = search.toLowerCase();
    return allChanges.filter(c => {
      const matchSearch = (c.code_changement || '').toLowerCase().includes(q) ||
        (c.rfc?.titre_rfc || '').toLowerCase().includes(q) ||
        (c.rfc?.code_rfc || '').toLowerCase().includes(q) ||
        (c.changeManager?.prenom_user || '').toLowerCase().includes(q) ||
        (c.changeManager?.nom_user || '').toLowerCase().includes(q);
      
      let matchStatus = true;
      if (filterStatus) {
        const cStat = c.statut?.code_statut || c.statut;
        if (filterStatus === 'CLOTUREE') {
          matchStatus = ['CLOTUREE', 'TERMINEE', 'SUCCES'].includes(cStat);
        } else {
          matchStatus = cStat === filterStatus;
        }
      }
      return matchSearch && matchStatus;
    });
  }, [allChanges, search, filterStatus]);

  const kpiTotal        = rfcs.filter(r => ['REJETEE', 'CLOTUREE', 'ANNULEE'].includes(r.statut?.code_statut)).length;
  const kpiApprouve     = rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length;
  const kpiRejetee      = rfcs.filter(r => r.statut?.code_statut === 'REJETEE').length;
  const kpiCloturee     = rfcs.filter(r => r.statut?.code_statut === 'CLOTUREE').length;

  // ── Pagination — Tab Aware ─────────────────────────────
  const currentData = activeTab === 'rfcs' ? filtered : (activeTab === 'changes' ? filteredChanges : filteredTasks);
  const totalPages = Math.max(1, Math.ceil(currentData.length / ITEMS_PER_PAGE));
  const safePage   = Math.min(currentPage, totalPages);
  const paginated  = currentData.slice(
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
            <h1>Historique Centralisé</h1>
            <p>Archive complète des dossiers RFC, Changements et Interventions Techniques ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={fetchData}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <FiRefreshCw /> Actualiser
          </button>
        </div>
      </div>

      <div className="settings-tabs-premium" style={{ display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '16px', width: 'fit-content' }}>
        <button className={`premium-tab ${activeTab === 'rfcs' ? 'active' : ''}`} onClick={() => { setActiveTab('rfcs'); setFilterStatus(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '12px', background: activeTab === 'rfcs' ? 'white' : 'transparent', color: activeTab === 'rfcs' ? '#2563eb' : '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: activeTab === 'rfcs' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
          <FiFileText /> Historique RFC
        </button>
        <button className={`premium-tab ${activeTab === 'changes' ? 'active' : ''}`} onClick={() => { setActiveTab('changes'); setFilterStatus(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '12px', background: activeTab === 'changes' ? 'white' : 'transparent', color: activeTab === 'changes' ? '#2563eb' : '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: activeTab === 'changes' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
          <FiRefreshCw /> Changements
        </button>
        <button className={`premium-tab ${activeTab === 'tasks' ? 'active' : ''}`} onClick={() => { setActiveTab('tasks'); setFilterStatus(''); }}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '12px', background: activeTab === 'tasks' ? 'white' : 'transparent', color: activeTab === 'tasks' ? '#2563eb' : '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: activeTab === 'tasks' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none' }}>
          <FiCheckSquare /> Tâches Terminées
        </button>
      </div>
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: activeTab === 'changes' ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)', gap: '1rem' }}>
        {activeTab === 'rfcs' ? (
          <>
            {/* Total */}
            <div className={`stat-card blue ${kpiFilter === '' && filterStatus === '' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setKpiFilter(''); setFilterStatus(''); }}>
              <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiLayers size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiTotal}</div>
                <div className="stat-label">Total RFC Archivées</div>
              </div>
            </div>

            {/* Rejetées */}
            <div className={`stat-card red ${kpiFilter === 'REJETEE' || filterStatus === 'REJETEE' ? 'selected-active' : ''}`} style={{ borderLeft: '3px solid #ef4444', cursor: 'pointer' }} onClick={() => { setKpiFilter(''); setFilterStatus('REJETEE'); }}>
              <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiXCircle size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiRejetee}</div>
                <div className="stat-label">RFC Rejetées</div>
              </div>
            </div>

            {/* Clôturées */}
            <div className={`stat-card green ${kpiFilter === 'CLOTUREE' || filterStatus === 'CLOTUREE' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => { setKpiFilter(''); setFilterStatus('CLOTUREE'); }}>
              <div className="stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}><FiCheckCircle size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiCloturee}</div>
                <div className="stat-label">RFC Clôturées</div>
              </div>
            </div>
          </>
        ) : activeTab === 'changes' ? (
          <>
            <div className={`stat-card blue ${filterStatus === '' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('')}>
              <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiRefreshCw size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{allChanges.length}</div>
                <div className="stat-label">Total Changement</div>
              </div>
            </div>
            <div className={`stat-card green ${filterStatus === 'CLOTUREE' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilterStatus(prev => prev === 'CLOTUREE' ? '' : 'CLOTUREE')}>
              <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}><FiCheckCircle size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{allChanges.filter(c => ['CLOTUREE', 'TERMINEE', 'SUCCES'].includes(c.statut?.code_statut || c.statut)).length}</div>
                <div className="stat-label">Clôturés</div>
              </div>
            </div>

          </>
        ) : (
          <>
            <div className={`stat-card blue ${filterStatus === '' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilterStatus('')}>
              <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiCheckSquare size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{allTasks.length}</div>
                <div className="stat-label">Total Tâches Archivées</div>
              </div>
            </div>
            <div className={`stat-card green ${filterStatus === 'CLOTUREE' ? 'selected-active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setFilterStatus(prev => prev === 'CLOTUREE' ? '' : 'CLOTUREE')}>
              <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}><FiCheckCircle size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{allTasks.filter(t => ['TERMINEE', 'CLOTUREE', 'SUCCES'].includes(t.statut?.code_statut || t.statut)).length}</div>
                <div className="stat-label">Tâches Terminées</div>
              </div>
            </div>
            <div className={`stat-card red ${filterStatus === 'ANNULEE' ? 'selected-active' : ''}`} style={{ borderLeft: '3px solid #ef4444', cursor: 'pointer' }} onClick={() => setFilterStatus(prev => prev === 'ANNULEE' ? '' : 'ANNULEE')}>
              <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiRefreshCw size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{allTasks.filter(t => ['ANNULEE', 'EN_ECHEC'].includes(t.statut?.code_statut || t.statut)).length}</div>
                <div className="stat-label">Tâches Annulées (Rollback)</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <PremiumToolbar
        searchProps={{
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: activeTab === 'rfcs' ? "Rechercher une RFC..." : activeTab === 'changes' ? "Rechercher un changement..." : "Rechercher une tâche..."
        }}
        filters={activeTab === 'rfcs' ? [
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
        ] : []}
        onReset={() => { setSearch(''); setFilterStatus(''); setFilterType(''); setFilterDirection(''); setKpiFilter(''); }}
        showReset={!!(search || filterStatus || filterType || filterDirection || kpiFilter)}
      />

      {/* ── TABLE ──────────────────────────────────────────── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          {activeTab === 'rfcs' ? (
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>
                    RFC & Code
                  </th>
                  <th style={thStyle}>Demandeur</th>
                  <th style={{ ...thStyle, width: '180px' }}>Direction</th>
                  <th style={thStyle}>Type</th>
                  <th style={thStyle}>Priorité</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement des RFCs...</td>
                  </tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <FiSearch size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                      Aucune RFC trouvée dans l'historique.
                    </td>
                  </tr>
                ) : paginated.map((rfc) => (
                  <tr key={rfc.id_rfc} onClick={() => handleOpenProcess(rfc)}
                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    {/* 1. RFC Info — Sticky Left */}
                    <td style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '280px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={rfc.titre_rfc}>
                        {rfc.titre_rfc}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600, marginTop: '2px' }}>#{rfc.code_rfc}</div>
                    </td>

                    {/* 2. Demandeur */}
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar prenom={rfc.demandeur?.prenom_user} nom={rfc.demandeur?.nom_user} size={28} />
                        <span style={{ fontWeight: 600, color: '#334155' }}>{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</span>
                      </div>
                    </td>

                    {/* 3. Direction */}
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', background: '#f5f3ff', color: '#7c3aed', fontSize: '0.72rem', fontWeight: 700, border: '1px solid #ddd6fe' }}>
                        {rfc.demandeur?.direction?.nom_direction || usersMap[rfc.id_user] || '—'}
                      </span>
                    </td>

                    {/* 4. Type & Priorité */}
                    <td style={tdStyle}>
                      <Badge variant={(rfc.typeRfc?.type || rfc.id_type) === 'URGENT' ? 'danger' : 'blue'}>
                        {rfc.typeRfc?.type || 'STANDARD'}
                      </Badge>
                    </td>

                    <td style={tdStyle}>
                        {(() => {
                          const label = (rfc.priorite?.libelle || rfc.id_priorite || 'MOYENNE').toUpperCase();
                          const p = priorities.find(p => String(p.id_priorite) === String(rfc.id_priorite)) || rfc.priorite;
                          const colors = {
                            'BASSE':    { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
                            'MOYENNE':  { bg: '#fefce8', color: '#a16207', border: '#fef9c3' },
                            'NORMAL':   { bg: '#fefce8', color: '#a16207', border: '#fef9c3' },
                            'HAUTE':    { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' },
                            'URGENT':   { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                            'CRITIQUE': { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                            'P0':       { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
                          };
                          const style = colors[label] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                          return (
                            <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                              {p?.libelle || '—'}
                            </span>
                          );
                        })()}
                    </td>



                    {/* 6. Statut */}
                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                      <Badge variant={
                        ['APPROUVEE', 'CLOTUREE', 'REUSSI'].includes(rfc.statut?.code_statut) ? 'success' :
                        ['REJETEE', 'ANNULEE'].includes(rfc.statut?.code_statut) ? 'danger' :
                        ['EN_COURS', 'PLANIFIEE'].includes(rfc.statut?.code_statut) ? 'info' :
                        ['EN_EVALUATION', 'EVALUEE'].includes(rfc.statut?.code_statut) ? 'purple' :
                        ['SOUMIS', 'PRE_APPROUVEE'].includes(rfc.statut?.code_statut) ? 'warning' : 'primary'
                      }>
                        {rfc.statut?.libelle || '—'}
                      </Badge>
                    </td>


                  </tr>
                ))}
              </tbody>
            </table>
          ) : activeTab === 'changes' ? (
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Changement & Code</th>
                  <th style={thStyle}>RFC Liée</th>
                  <th style={thStyle}>Responsable</th>
                  <th style={thStyle}>Type / Priorité</th>
                  <th style={thStyle}>Environnement</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                   <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement des changements...</td></tr>
                ) : paginated.length === 0 ? (
                   <tr>
                     <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                       <FiRefreshCw size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                       Aucun changement archivé trouvé.
                     </td>
                   </tr>
                ) : paginated.map(c => (
                  <tr key={c.id_changement} onClick={() => setSelectedChangeDetails(c)} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <td style={tdStyle}>
                       <div style={{ fontWeight: 700, color: '#0f172a' }}>Changement</div>
                       <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>#{c.code_changement}</div>
                    </td>
                    <td style={tdStyle}>
                       <div style={{ fontWeight: 600, color: '#334155', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.rfc?.titre_rfc}>
                         {c.rfc?.titre_rfc}
                       </div>
                       <div style={{ fontSize: '0.7rem', color: '#64748b' }}>#{c.rfc?.code_rfc}</div>
                    </td>
                    <td style={tdStyle}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <Avatar prenom={c.changeManager?.prenom_user} nom={c.changeManager?.nom_user} size={28} />
                         <span style={{ fontWeight: 600 }}>{c.changeManager?.prenom_user} {c.changeManager?.nom_user}</span>
                       </div>
                    </td>
                    <td style={tdStyle}>
                       <Badge variant="blue">{c.rfc?.typeRfc?.type || 'STANDARD'}</Badge>
                       <div style={{ fontSize: '0.7rem', marginTop: '4px', fontWeight: 600, color: '#64748b' }}>Prio: {c.priorite || 'MOYENNE'}</div>
                    </td>
                    <td style={tdStyle}>
                       <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>
                         {c.environnement?.nom_env || 'N/A'}
                       </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                       <Badge variant={['CLOTUREE', 'TERMINEE', 'SUCCES'].includes(c.statut?.code_statut || c.statut) ? 'success' : 'danger'}>
                         {c.statut?.libelle || c.statut}
                       </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Tâche & Code</th>
                  <th style={thStyle}>Changement / RFC</th>
                  <th style={thStyle}>Implémenteur</th>
                  <th style={thStyle}>Date Clôture</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement des tâches...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <FiCheckSquare size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                      Aucune tâche terminée trouvée.
                    </td>
                  </tr>
                ) : paginated.map((task) => (
                  <tr key={task.id_tache} onClick={() => setSelectedTaskDetails(task)} style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem' }}>{task.titre_tache}</div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>#{task.code_tache}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{task.changement?.code_changement}</div>
                      <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{task.rfc?.titre_rfc}</div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar prenom={task.implementeur?.prenom_user} nom={task.implementeur?.nom_user} size={28} />
                        <span>{task.implementeur?.prenom_user} {task.implementeur?.nom_user}</span>
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {task.date_cloture ? new Date(task.date_cloture).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <Badge variant="success">{task.statut?.libelle || 'TERMINEE'}</Badge>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                       {(() => {
                          const isFailed = ['ANNULEE', 'EN_ECHEC'].includes(task.statut?.code_statut || task.statut);
                          return (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setResultModal({ 
                                  show: true, 
                                  type: isFailed ? 'ROLLBACK' : 'SUCCESS', 
                                  title: isFailed ? 'Rapport d\'Incident / Rollback' : 'Rapport de Succès d\'Implémentation', 
                                  task: task 
                                });
                              }}
                              style={{ 
                                padding: '4px 12px', 
                                borderRadius: '6px', 
                                border: 'none', 
                                background: isFailed ? '#fee2e2' : '#dcfce7', 
                                color: isFailed ? '#ef4444' : '#16a34a', 
                                fontSize: '0.72rem', 
                                fontWeight: '700', 
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              {isFailed ? <><FiRefreshCw size={12} /> Rollback</> : <><FiCheck size={12} /> Rapport Succès</>}
                            </button>
                          );
                       })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer pagination ──────────────────────────── */}
        <div style={{
          padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: '0.5rem',
        }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {currentData.length === 0
              ? '0 résultat'
              : <>
                  <strong style={{ color: '#64748b' }}>
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, currentData.length)}
                  </strong>
                  {' '}sur{' '}
                  <strong style={{ color: '#64748b' }}>{currentData.length}</strong>
                  {currentData.length !== (activeTab === 'rfcs' ? rfcs.length : activeTab === 'changes' ? allChanges.length : allTasks.length) && (
                    <span style={{ color: '#cbd5e1' }}> (filtré)</span>
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
                  ? <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>…</span>
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

      {/* ── MODAL TRAITEMENT DEVENUE MODALE DÉTAIL PROPRE ────────────────────────── */}
      {showProcess && selectedRfc && (
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
          isReadOnly={true}
          onTaskClick={(t) => setSelectedTaskDetails(t)}
        />
      )}

      {/* ── MODAL PIR ──────────────────────────────────────── */}
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

      {/* ── MODAL CRÉATION ─────────────────────────────────── */}
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
              <RfcCreate isModal={true} onSuccess={() => { closeModals(); fetchData(); showToast('RFC créée avec succès !', 'success'); }} onCancel={closeModals} />
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL APPROBATION ──────────────────────────────── */}
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
              <div style={{ background: 'rgba(248,250,252,0.5)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', border: '1px dashed #e2e8f0' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>RFC Sélectionnée</div>
                <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>{approvalModal.rfc?.titre_rfc}</div>
                <div style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: '700' }}>#{approvalModal.rfc?.code_rfc}</div>
              </div>
              <div className="tm-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="form-group-cab">
                  <label>Change Manager <span className="tm-required">*</span></label>
                  <select value={approvalForm.id_change_manager} onChange={e => setApprovalForm(f => ({ ...f, id_change_manager: e.target.value }))} className="premium-input-style" required>
                    <option value="">Sélectionner un profil...</option>
                    {changeManagers.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                  </select>
                </div>
                <div className="form-group-cab">
                  <label>Environnement cible <span className="tm-required">*</span></label>
                  <select value={approvalForm.id_env} onChange={e => setApprovalForm(f => ({ ...f, id_env: e.target.value }))} className="premium-input-style" required>
                    <option value="">Sélectionner un environnement...</option>
                    {environments.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                  </select>
                </div>
              </div>
            </div>
            <div className="modal-footer-rfc-style">
              <button type="button" className="btn-cancel-rfc-style" onClick={() => setApprovalModal({ open: false, rfc: null, pendingId: null })}>Annuler</button>
              <button type="button" className="btn-submit-rfc-style" disabled={approvalLoading} onClick={submitApproval}
                style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                {approvalLoading ? <FiRefreshCw className="spin" /> : <FiCheckCircle />}
                {approvalLoading ? 'En cours...' : 'Confirmer l\'approbation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ─────────────────────────────────── */}
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
      {/* ── MODAL RÉSULTAT T CHE ────────────────────────────── */}
      {resultModal.show && (
          <div className="modal-backdrop" onClick={() => setResultModal({ show: false, type: '', title: '', task: null })}>
              <div className="modal-box glass-card" style={{ maxWidth: '700px', background: '#f8fafc', overflow: 'hidden' }} onClick={e => e.stopPropagation()}>
                  <div className="modal-top-rfc-style" style={{ background: resultModal.type === 'SUCCESS' ? '#059669' : '#dc2626' }}>
                      <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                          {resultModal.type === 'SUCCESS' ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                      </div>
                      <div className="rfc-style-header-text">
                          <h2 style={{ color: 'white' }}>{resultModal.title}</h2>
                          <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>Tâche: {resultModal.task?.titre_tache} (#{resultModal.task?.code_tache})</div>
                      </div>
                      <button className="close-btn-rfc-style" onClick={() => setResultModal({ show: false, type: '', title: '', task: null })} style={{ color: 'white' }}><FiX size={24} /></button>
                  </div>

                  <div className="modal-body acl-modal-body" style={{ padding: '2rem' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                          <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Implémenteur</div>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{resultModal.task?.implementeur?.prenom_user} {resultModal.task?.implementeur?.nom_user}</div>
                          </div>
                          <div style={{ padding: '1rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                              <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Statut Final</div>
                              <div style={{ fontWeight: '600', color: '#1e293b' }}>{resultModal.task?.statut?.libelle || 'TERMINEE'}</div>
                          </div>
                      </div>

                      <h4 style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FiClock /> Historique & Journaux d'Exécution
                      </h4>

                      <div style={{ padding: '1.25rem', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '150px', maxHeight: '350px', overflowY: 'auto' }}>
                          {resultModal.task?.journaux && resultModal.task.journaux.length > 0 ? (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                  {resultModal.task.journaux.map((log, idx) => (
                                      <div key={idx} style={{ borderLeft: '3px solid #3b82f6', paddingLeft: '1rem', position: 'relative' }}>
                                          <div style={{ position: 'absolute', left: '-5px', top: '0', width: '8px', height: '8px', background: '#3b82f6', borderRadius: '50%' }}></div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                              <strong style={{ color: '#3b82f6' }}>{log.titre_journal || 'Mise à jour'}</strong>
                                              <span>{new Date(log.date_entree).toLocaleString()}</span>
                                          </div>
                                          <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.4' }}>{log.description}</div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8', fontSize: '0.85rem', fontStyle: 'italic' }}>
                                  Aucun journal d'exécution disponible pour cette tâche.
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="modal-footer-rfc-style" style={{ padding: '1.5rem 2rem', background: 'white' }}>
                      <button className="btn-cancel-rfc-style" onClick={() => setResultModal({ show: false, type: '', title: '', task: null })}>Fermer</button>
                      <button 
                        className="btn-submit-rfc-style" 
                        onClick={() => {
                            // Logic for PDF download can be added here if needed, 
                            // mirroring ImplementationTracker.jsx
                            window.print();
                        }}
                        style={{ background: '#3b82f6' }}
                      >
                          <FiDownload /> Imprimer le Rapport
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* ── NOUVELLES MODALES DÉTAILS HISTORIQUES ────────────────────────────── */}

      {selectedChangeDetails && (
        <ChangementDetailModal 
          show={!!selectedChangeDetails} 
          onClose={() => setSelectedChangeDetails(null)} 
          selectedChangement={selectedChangeDetails}
          showReportForm={showReportForm}
          setShowReportForm={setShowReportForm}
          reportForm={reportForm}
          setReportForm={setReportForm}
          handleCreateReport={handleCreateReport}
          getStatusColor={(code) => getStatusClass(code)}
          rfcsMap={rfcs.reduce((acc, r) => ({ ...acc, [r.id_rfc]: r }), {})}
        />
      )}
      {selectedTaskDetails && (
        <TaskDetailModal 
          task={selectedTaskDetails} 
          onClose={() => setSelectedTaskDetails(null)} 
          onEdit={null} 
          onDelete={null} 
        />
      )}

    </div>
  );
};

export default RfcHistory;
