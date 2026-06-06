import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FiCheckSquare, FiPlus, FiTrash2, FiEdit3, FiCheck, 
  FiX, FiSearch, FiAlertTriangle, FiCheckCircle, FiLoader, 
  FiClock, FiPlay, FiPause, FiUser, FiCalendar, FiInfo, FiRefreshCw, FiLayers,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axiosClient';
import changeService from '../../services/changeService';
import ConfirmModal from '../../components/common/ConfirmModal';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import Toast from '../../components/common/Toast';
import { TACHE_TRANSITIONS } from '../../utils/constants';
import './TaskManagement.css';
import './AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';

const ITEMS_PER_PAGE = 10;

const getTaskStatusClass = (status) => {
  switch(status) {
    case 'EN_ATTENTE': return 'status-warning';
    case 'PLANIFIEE':  return 'status-warning';
    case 'EN_COURS':   return 'status-warning';
    case 'EN_PAUSE':   return 'status-warning';
    case 'TERMINEE':   return 'status-success';
    case 'ANNULEE':    return 'status-danger';
    default:           return 'status-default';
  }
};

// ── Modal de Détail ───────────────────────────────────────────
export const TaskDetailModal = ({ task, onClose, onEdit, onDelete }) => {
  if (!task) return null;
  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab tm-modal-large" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiCheckSquare /></div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>Détails de la Tâche</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Référence : {task.code_tache}</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
        </div>
        <div className="modal-body-rfc-style">
          <div className="tm-detail-grid">
            <div className="form-group-cab tm-col-span-2">
              <label>Titre de la Tâche</label>
              <div className="detail-value-display tm-detail-box tm-title-box">{task.titre_tache}</div>
            </div>
            <div className="form-group-cab tm-col-span-2">
              <label>Description</label>
              <div className="detail-value-display tm-detail-box tm-description-box">
                {task.description || 'Aucune description fournie.'}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Statut</label>
              <div className="detail-value-display tm-detail-box">
                <span className={`status-badge tm-status-badge ${getTaskStatusClass(typeof task.statut === 'string' ? task.statut : (task.statut?.code_statut || ''))}`}>
                  {typeof task.statut === 'string' ? task.statut : (task.statut?.libelle || task.statut?.code_statut || 'Non défini')}
                </span>
              </div>
            </div>
            <div className="form-group-cab">
              <label>Priorité</label>
              <div className="detail-value-display tm-detail-box">
                {(() => {
                  const prio = (task.priorite || task.changement?.priorite?.code_priorite || task.changement?.rfc?.priorite?.code_priorite || task.changement?.priorite || (task.changement?.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : task.changement?.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE')).toUpperCase();
                  return <span className={`ref-badge tm-priority-badge priority-${prio.toLowerCase()}`}>{prio}</span>;
                })()}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Assigné à</label>
              <div className="detail-value-display tm-detail-box tm-detail-with-icon">
                <FiUser className="tm-muted-icon"/>
                {task.implementeur ? (
                  `${task.implementeur.prenom_user || task.implementeur.prenom || ''} ${task.implementeur.nom_user || task.implementeur.nom || ''}`
                ) : 'Non assigné'}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Changement associé</label>
              <div className="detail-value-display tm-detail-box tm-change-code">{task.changement?.code_changement || task.code_changement || 'Non associé'}</div>
            </div>
            <div className="form-group-cab">
              <label>Début prévu</label>
              <div className="detail-value-display tm-detail-box tm-detail-with-icon">
                <FiCalendar className="tm-muted-icon"/>
                {task.date_debut_prevue ? new Date(task.date_debut_prevue).toLocaleString() : 'Non définie'}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Fin prévue</label>
              <div className="detail-value-display tm-detail-box tm-detail-with-icon">
                <FiClock className="tm-muted-icon"/>
                {task.date_fin_prevue ? new Date(task.date_fin_prevue).toLocaleString() : 'Non définie'}
              </div>
            </div>
          </div>
        </div>
        <div className="modal-footer-rfc-style" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button type="button" className="btn-cancel-rfc-style" onClick={onClose} style={{ background: '#e2e8f0', color: '#475569', border: 'none' }}>
            Fermer
          </button>
          {onDelete && (
            <button type="button" className="btn-cancel-rfc-style" onClick={() => { onClose(); onDelete(task); }}>
              <FiTrash2 size={16} /> Supprimer
            </button>
          )}
          {onEdit && (
            <button type="button" className="btn-submit-rfc-style" onClick={() => { onClose(); onEdit(task); }}>
              <FiEdit3 size={16} /> Modifier
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Modal d'ajout/édition ─────────────────────────────────────
const TaskModal = ({ task, onClose, onSave, loading, implementers = [], changements = [] }) => {
  const [form, setForm] = useState({
    titre_tache: task?.titre_tache || '',
    description: task?.description || '',
    priorite: task?.priorite || 'MOYENNE',
    date_debut_prevue: task?.date_debut_prevue ? new Date(task.date_debut_prevue).toISOString().slice(0, 16) : '',
    date_fin_prevue: task?.date_fin_prevue ? new Date(task.date_fin_prevue).toISOString().slice(0, 16) : '',
    id_implementeur: task?.id_implementeur ? String(task.id_implementeur) : '',
    id_changement: task?.id_changement || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({ ...form, id_user: form.id_implementeur || null, ordre_tache: 1 });
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab tm-modal-medium" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiCheckSquare /></div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>{task ? 'Modifier la Tâche' : 'Nouvelle Tâche'}</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>#{task?.code_tache || 'Nouveau'} — Planification</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body-rfc-style">
            <div className="tm-form-grid">
              <div className="form-group-cab tm-col-span-2">
                <label>Titre de la Tâche <span className="tm-required">*</span></label>
                <input type="text" value={form.titre_tache} onChange={e => setForm({...form, titre_tache: e.target.value})}
                  className="premium-input-style" placeholder="Ex: Migration de la DB..." required />
              </div>
              <div className="form-group-cab tm-col-span-2">
                <label>Description & Instructions</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="premium-input-style" rows={3} placeholder="Détails techniques..." />
              </div>
              <div className="form-group-cab">
                <label>Priorité <span className="tm-required">*</span></label>
                <select value={form.priorite} onChange={e => setForm({...form, priorite: e.target.value})}
                  className="premium-input-style" required>
                  <option value="BASSE">Basse</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="HAUTE">Haute</option>
                  <option value="CRITIQUE">Critique</option>
                </select>
              </div>
              <div className="form-group-cab">
                <label>Implémenteur (Profil) <span className="tm-required">*</span></label>
                <select value={form.id_implementeur} onChange={e => setForm({...form, id_implementeur: e.target.value})}
                  className="premium-input-style" required>
                  <option value="">Sélectionner un profil...</option>
                  {implementers.map(imp => (
                    <option key={imp.id_user} value={String(imp.id_user)}>
                      {imp.prenom_user} {imp.nom_user}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group-cab">
                <label>Début prévu</label>
                <input type="datetime-local" value={form.date_debut_prevue}
                  onChange={e => setForm({...form, date_debut_prevue: e.target.value})} className="premium-input-style" />
              </div>
              <div className="form-group-cab">
                <label>Fin prévue</label>
                <input type="datetime-local" value={form.date_fin_prevue}
                  onChange={e => setForm({...form, date_fin_prevue: e.target.value})} className="premium-input-style" />
              </div>
              {!task && (
                <div className="form-group-cab tm-col-span-2">
                  <label>Associer à un Changement <span className="tm-required">*</span></label>
                  <select value={form.id_changement} onChange={e => setForm({...form, id_changement: e.target.value})}
                    className="premium-input-style" required>
                    <option value="">Sélectionner un changement...</option>
                    {changements.map(chg => (
                      <option key={chg.id_changement} value={chg.id_changement}>
                        {chg.code_changement} - {chg.titre_plan || chg.planChangement?.titre_plan || 'Sans titre'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer-rfc-style">
            <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={loading} className="btn-submit-rfc-style">
              {loading ? 'Sauvegarde...' : (task ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────
const TaskManagement = () => {
  const { socket } = useSocket();
  const [tasks,            setTasks]            = useState([]);
  const [loading,          setLoading]          = useState(true);
  const [search,           setSearch]           = useState('');
  const [filter,           setFilter]           = useState('ALL');
  const [kpiFilter,        setKpiFilter]        = useState('');
  const [filterType,       setFilterType]       = useState('');
  const [showModal,        setShowModal]        = useState(false);
  const [showDetailModal,  setShowDetailModal]  = useState(false);
  const [editingTask,      setEditingTask]      = useState(null);
  const [selectedTask,     setSelectedTask]     = useState(null);
  const [implementers,     setImplementers]     = useState([]);
  const [toast,            setToast]            = useState(null);
  const [saving,           setSaving]           = useState(false);
  const [confirmDel,       setConfirmDel]       = useState(null);
  const [allChangements,   setAllChangements]   = useState([]);
  const [taskStatuses,     setTaskStatuses]     = useState([]);

  // ── Pagination ────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page quand les filtres changent
  useEffect(() => { setCurrentPage(1); }, [search, filter, kpiFilter, filterType]);

  const location = useLocation();
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const kpiParam = params.get('kpi');
    if (kpiParam) {
      setKpiFilter(kpiParam);
      if (kpiParam === 'URGENT') setFilterType('URGENT');
      else setFilterType('');
    }
  }, [location.search]);

  const fetchImplementers = useCallback(async () => {
    try {
      const res = await api.get('/users?limit=1000').catch(() => null);
      const allUsers = res?.data?.data || res?.data?.users || res?.data || (Array.isArray(res) ? res : []);
      
      const hasRole = (u, name) => {
          if (!u) return false;
          const roleList = [];
          if (Array.isArray(u.roles)) {
              u.roles.forEach(r => {
                  if (typeof r === 'string') roleList.push(r.toUpperCase());
                  else if (r && r.nom_role) roleList.push(r.nom_role.toUpperCase());
              });
          }
          if (u.role && u.role.nom_role) roleList.push(u.role.nom_role.toUpperCase());
          if (u.nom_role) roleList.push(u.nom_role.toUpperCase());
          return roleList.includes(name.toUpperCase());
      };

      if (Array.isArray(allUsers)) {
        setImplementers(allUsers.filter(u => hasRole(u, 'IMPLEMENTEUR')));
      } else {
        setImplementers([]);
      }
    } catch (error) {
      console.error('Erreur chargement implémenteurs:', error);
      setImplementers([]);
    }
  }, []);

  useEffect(() => {
    fetchImplementers();
    changeService.getAllChangements().then(setAllChangements).catch(console.error);
    changeService.getTaskStatuses().then(setTaskStatuses).catch(error => {
      console.error('Erreur chargement statuts tâches :', error);
      setTaskStatuses([]);
    });
  }, [fetchImplementers]);

  const normalizeTask = (task, change) => {
    const statutObject = typeof task.statut === 'object' && task.statut !== null ? task.statut : null;
    const statutCode   = statutObject ? (statutObject.code_statut || statutObject.libelle || 'PLANIFIEE') : (task.statut || 'PLANIFIEE');
    const statutId     = statutObject?.id_statut || task.id_statut || null;
    return {
      ...task,
      statut: statutCode,
      id_statut: statutId,
      changement: { 
        ...change,
        id_changement: change.id_changement, 
        code_changement: change.code_changement 
      }
    };
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const allChanges = await changeService.getAllChangements({ limit: 1000 });
      const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
      const activeChanges = allChanges.filter(c => !deletedIds.includes(c.id_changement));

      const tasksByChange = await Promise.all(activeChanges.map(async (change) => {
        const taches = await changeService.getTasksByChange(change.id_changement);
        return (Array.isArray(taches) ? taches : []).map(task => normalizeTask(task, change));
      }));
      setTasks(tasksByChange.flat());
    } catch (error) {
      console.error('Erreur chargement tâches:', error);
      setToast({ msg: 'Impossible de charger les tâches depuis le backend.', type: 'error' });
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);
  useEffect(() => {
    if (!socket) return;
    const handleWs = () => fetchTasks();
    socket.on('tache:update', handleWs);
    return () => socket.off('tache:update', handleWs);
  }, [fetchTasks, socket]);

  // ── Filtrage (sur la TOTALITÉ des tâches) ─────────────────
  const filteredTasks = tasks.filter(task => {
    // Si on est sur "Tous les statuts" (ALL), on cache les tâches terminées/annulées
    // car elles sont maintenant dans l'Historique.
    if (filter === 'ALL' && !kpiFilter) {
      if (['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(task.statut)) return false;
    }

    const term = search.toLowerCase();
    const matchSearch = (
      (task.code_tache?.toLowerCase() || '').includes(term) ||
      (task.titre_tache?.toLowerCase() || '').includes(term)
    );
    const rfc = task.changement?.rfc;
    const rfcPrio = (rfc?.priorite?.code_priorite || rfc?.id_priorite || '').toUpperCase();
    const rfcType = (rfc?.typeRfc?.type || rfc?.type || '').toUpperCase();
    const taskPrio = (task.priorite || '').toUpperCase();
    const chgPrio = (task.changement?.priorite || '').toUpperCase();

    const isUrgentRfc = ['URGENCE', 'URGENT', 'HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5'].includes(rfcType) || 
                       ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5'].includes(rfcPrio) || 
                       rfc?.urgence === true || rfc?.urgence === 1 || rfc?.urgence === 'true';

    const isUrgentTask = ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5', 'URGENT'].includes(taskPrio) || 
                        ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5', 'URGENT'].includes(chgPrio);
    
    const isUrgent = isUrgentRfc || isUrgentTask;

    let matchFilter = true;
    if (kpiFilter === 'EN_ATTENTE') matchFilter = task.statut === 'EN_ATTENTE' || task.statut === 'PLANIFIEE';
    else if (kpiFilter === 'URGENT') matchFilter = isUrgent && task.statut === 'EN_ATTENTE';
    else if (kpiFilter)             matchFilter = task.statut === kpiFilter;
    else if (filter !== 'ALL')      matchFilter = task.statut === filter;

    const matchType = !filterType || 
      (filterType.toUpperCase() === 'URGENT' ? isUrgent : (rfc?.typeRfc?.type || '').toUpperCase() === filterType.toUpperCase());

    return matchSearch && matchFilter && matchType;
  });

  // ── KPI — toujours sur tasks complet (BDD) ────────────────
  const kpiTotal     = tasks.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(t.statut)).length;
  const kpiAttente   = tasks.filter(t => t.statut === 'EN_ATTENTE' || t.statut === 'PLANIFIEE').length;
  const kpiEnCours   = tasks.filter(t => t.statut === 'EN_COURS').length;
  const kpiUrgent    = tasks.filter(t => {
      if (t.statut !== 'EN_ATTENTE') return false;
      const rfc = t.changement?.rfc;
      const rfcPrio = (rfc?.priorite?.code_priorite || rfc?.id_priorite || '').toUpperCase();
      const rfcType = (rfc?.typeRfc?.type || rfc?.type || '').toUpperCase();
      const taskPrio = (t.priorite || '').toUpperCase();
      const chgPrio = (t.changement?.priorite || '').toUpperCase();
      const isUrgentRfc = ['URGENCE', 'URGENT', 'HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5'].includes(rfcType) || 
                         ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5'].includes(rfcPrio) || 
                         rfc?.urgence === true || rfc?.urgence === 1 || String(rfc?.urgence) === 'true';
      const isUrgentTask = ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5', 'URGENT'].includes(taskPrio) || 
                          ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5', 'URGENT'].includes(chgPrio);
      return isUrgentRfc || isUrgentTask;
  }).length;
  const kpiAnnulees  = tasks.filter(t => t.statut === 'ANNULEE').length;

  // ── Pagination (sur filteredTasks) ───────────────────────
  const totalPages  = Math.max(1, Math.ceil(filteredTasks.length / ITEMS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const paginated   = filteredTasks.slice(
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

  // ── Handlers ──────────────────────────────────────────────
  const handleAddTask    = () => { setEditingTask(null); setShowModal(true); };
  const handleEditTask   = (task) => { setEditingTask(task); setShowModal(true); setShowDetailModal(false); };
  const handleDetailTask = (task) => { setSelectedTask(task); setShowDetailModal(true); };
  const handleDeleteTask = (task) => {
    setConfirmDel({
      title: 'Supprimer la tâche',
      message: `Êtes-vous sûr de vouloir supprimer la tâche "${task.titre_tache}" ? Cette action est irréversible.`,
      task
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const { task } = confirmDel;
    setSaving(true);
    try {
      await api.delete(`/taches/${task.id_tache}`);
      setTasks(prev => prev.filter(t => t.id_tache !== task.id_tache));
      setToast({ msg: 'Tâche supprimée avec succès', type: 'error' });
      setShowDetailModal(false);
    } catch (error) {
      console.error('Erreur suppression tâche:', error);
      setToast({ msg: 'Impossible de supprimer la tâche.', type: 'error' });
    } finally {
      setSaving(false);
      setConfirmDel(null);
    }
  };

  const handleSaveTask = async (formData) => {
    setSaving(true);
    try {
      const payload = { ...formData, id_user: formData.id_user || null, ordre_tache: formData.ordre_tache || 1 };
      if (editingTask) {
        await changeService.updateTache(editingTask.id_tache, payload);
        setToast({ msg: 'Tâche mise à jour !', type: 'success' });
      } else {
        if (!payload.id_changement) throw new Error("Un changement doit être associé à la tâche.");
        await changeService.createTache(payload.id_changement, payload);
        setToast({ msg: 'Tâche créée !', type: 'success' });
      }
      fetchTasks();
      setShowModal(false);
    } catch (error) {
      console.error('Erreur sauvegarde tâche:', error);
      setToast({ msg: error.message || 'Impossible d\'enregistrer la tâche.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

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

  const btnPage = (disabled) => ({
    padding: '5px 10px',
    borderRadius: '8px',
    border: '1.5px solid #e2e8f0',
    background: disabled ? '#f8fafc' : 'white',
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', fontWeight: '600', fontSize: '0.8rem',
  });

  return (
    <div className="settings-page">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiCheckSquare /></div>
          <div className="premium-header-text">
            <h1>Gestion des Tâches</h1>
            <p>Configurez les tâches techniques et supervisez l'exécution des plans de changement</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={fetchTasks}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <FiRefreshCw /> Actualiser
          </button>
          <button className="btn-create-premium" onClick={handleAddTask}><FiPlus /> Nouvelle Tâche</button>
        </div>
      </div>

      {/* ── KPI CARDs — toujours sur la totalité de la BDD ── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '0.5rem' }}>
        <div
          className={`stat-card blue ${kpiFilter === '' ? 'selected-active' : ''}`}
          onClick={() => setKpiFilter('')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper"><FiLayers size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiTotal}</div>
            <div className="stat-label">Tâches Actives</div>
          </div>
        </div>

        <div
          className={`stat-card purple ${kpiFilter === 'EN_ATTENTE' ? 'selected-active' : ''}`}
          onClick={() => setKpiFilter(k => k === 'EN_ATTENTE' ? '' : 'EN_ATTENTE')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper"><FiClock size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiAttente}</div>
            <div className="stat-label">En Attente</div>
          </div>
        </div>

        <div
          className={`stat-card amber ${kpiFilter === 'EN_COURS' ? 'selected-active' : ''}`}
          onClick={() => setKpiFilter(k => k === 'EN_COURS' ? '' : 'EN_COURS')}
          style={{ cursor: 'pointer' }}
        >
          <div className="stat-icon-wrapper"><FiPlay size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiEnCours}</div>
            <div className="stat-label">En Cours</div>
          </div>
        </div>

        <div
          className={`stat-card red-urgent ${kpiFilter === 'URGENT' ? 'selected-active' : ''}`}
          onClick={() => setKpiFilter(k => k === 'URGENT' ? '' : 'URGENT')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #ef4444' }}
        >
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiAlertTriangle size={24} /></div>
          <div className="stat-info">
            <div className="stat-value" style={{ color: '#dc2626' }}>{kpiUrgent}</div>
            <div className="stat-label">Urgentes</div>
          </div>
        </div>

        <div
          className={`stat-card red ${kpiFilter === 'ANNULEE' ? 'selected-active' : ''}`}
          onClick={() => setKpiFilter(k => k === 'ANNULEE' ? '' : 'ANNULEE')}
          style={{ cursor: 'pointer', borderLeft: '3px solid #64748b' }}
        >
          <div className="stat-icon-wrapper" style={{ background: '#f1f5f9', color: '#64748b' }}><FiX size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{kpiAnnulees}</div>
            <div className="stat-label">Annulées</div>
          </div>
        </div>
      </div>

      {/* ── Filters Bar ───────────────────────────────────── */}
      <PremiumToolbar 
        searchProps={{
          value: search,
          onChange: (e) => setSearch(e.target.value),
          placeholder: "Rechercher par code, titre ou demandeur…"
        }}
        filters={[
          {
            value: filter,
            onChange: (e) => { setFilter(e.target.value); setKpiFilter(''); },
            placeholder: "Tous les statuts",
            options: [
              { value: "PLANIFIEE", label: "Planifiées" },
              { value: "EN_COURS", label: "En Cours" },
              { value: "TERMINEE", label: "Terminées" },
              { value: "ANNULEE", label: "Annulées" }
            ]
          },
          {
            value: filterType,
            onChange: (e) => setFilterType(e.target.value),
            placeholder: "Tous les types RFC",
            options: [
              { value: "URGENT", label: "Urgents uniquement" },
              { value: "NORMAL", label: "Normal" },
              { value: "STANDARD", label: "Standard" },
              { value: "MINEUR", label: "Mineur" }
            ]
          }
        ]}
        onReset={() => { setSearch(''); setFilter('ALL'); setKpiFilter(''); setFilterType(''); }}
        showReset={!!(search || filter !== 'ALL' || kpiFilter || filterType)}
      />

      {/* ── Table ─────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff', borderRadius: '16px',
        border: '1px solid #e2e8f0', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '900px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>
                  Titre & Code
                </th>
                <th style={thStyle}>Changement & Code</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Priorité</th>
                <th style={thStyle}>Implémenteur</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                <th className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiRefreshCw className="spin" />
                  </td>
                </tr>
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiCheckSquare size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucune tâche trouvée.
                  </td>
                </tr>
              ) : paginated.map((task) => (
                <tr
                  key={task.id_tache}
                  onClick={() => handleDetailTask(task)}
                  style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                >
                  {/* 1. Code + Titre */}
                  <td className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: task.statut === 'TERMINEE' ? '#10b981' : '#3b82f6' }} />
                      <div>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }} title={task.titre_tache}>{task.titre_tache}</div>
                        <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>{task.code_tache}</div>
                      </div>
                    </div>
                  </td>

                  {/* 2. Changement */}
                  <td style={tdStyle}>
                    <div>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b', marginBottom: '3px' }}>{task.changement?.titre_plan || task.changement?.planChangement?.titre_plan || task.changement?.rfc?.titre_rfc || 'Changement Standard'}</div>
                      <div style={{ fontSize: '0.78rem', color: '#3b82f6', fontWeight: 500 }}>#{task.changement?.code_changement}</div>
                    </div>
                  </td>

                  {/* 2.5 Type */}
                  <td style={tdStyle}>
                    {(() => {
                      const type = (task.changement?.rfc?.typeRfc?.type || task.changement?.type || 'STANDARD').toUpperCase();
                      const colors = { URGENT: { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' }, NORMAL: { bg: '#eff6ff', color: '#3b82f6', border: '#dbeafe' }, STANDARD: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' } };
                      const s = colors[type] || colors.STANDARD;
                      return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{type}</span>;
                    })()}
                  </td>

                  {/* 2.6 Priorité */}
                  <td style={tdStyle}>
                    {(() => {
                      const prio = (task.changement?.priorite?.code_priorite || task.changement?.rfc?.priorite?.code_priorite || task.changement?.priorite || (task.changement?.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : task.changement?.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE')).toUpperCase();
                      const colors = { CRITIQUE: { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' }, P5: { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' }, HAUTE: { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' }, P4: { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' }, MOYENNE: { bg: '#fefce8', color: '#ca8a04', border: '#fef9c3' }, BASSE: { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' } };
                      const s = colors[prio] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                      return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{prio}</span>;
                    })()}
                  </td>

                  {/* 3. Implémenteur */}
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {(() => {
                        const prenom   = task.implementeur?.prenom_user || task.implementeur?.prenom || '';
                        const nom      = task.implementeur?.nom_user    || task.implementeur?.nom    || '';
                        const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
                        const colors   = [
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
                            <FiUser size={14} color="#94a3b8" />
                          </div>
                        );
                      })()}
                      <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                        {task.implementeur ? `${task.implementeur.prenom_user || task.implementeur.prenom || ''} ${task.implementeur.nom_user || task.implementeur.nom || ''}`.trim() : 'Non assigné'}
                      </span>
                    </div>
                  </td>

                  {/* 4. Statut */}
                  <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                    {(() => {
                      const code = task.statut || '';
                      const label = task.statut || 'N/A';
                      let bg = 'rgba(100, 116, 139, 0.1)';
                      let fg = '#64748b';
                      if (code === 'TERMINEE' || code === 'TERMINE' || code === 'REUSSI' || code === 'SUCCES') {
                        bg = 'rgba(16, 185, 129, 0.1)';
                        fg = '#10b981';
                      } else if (code === 'EN_COURS') {
                        bg = 'rgba(245, 158, 11, 0.1)';
                        fg = '#d97706';
                      } else if (code === 'ECHEC' || code === 'REJETE' || code === 'ANNULEE') {
                        bg = 'rgba(239, 68, 68, 0.1)';
                        fg = '#ef4444';
                      } else if (code === 'EN_ATTENTE' || code === 'PLANIFIEE') {
                        bg = 'rgba(59, 130, 246, 0.1)';
                        fg = '#3b82f6';
                      }
                      return (
                        <span style={{ 
                          display: 'inline-block',
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: '700',
                          backgroundColor: bg,
                          color: fg,
                          whiteSpace: 'nowrap'
                        }}>
                          {label}
                        </span>
                      );
                    })()}
                  </td>

                  {/* 5. Actions */}
                  <td className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                      {(task.statut === 'EN_ATTENTE' || task.statut?.code_statut === 'EN_ATTENTE') ? (
                        <>
                          <button onClick={e => { e.stopPropagation(); handleEditTask(task); }} title="Modifier"
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                            <FiEdit3 size={15} />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleDeleteTask(task); }} title="Supprimer"
                            style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
                            <FiTrash2 size={15} />
                          </button>
                        </>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', paddingRight: '8px' }}>—</span>
                      )}
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
          {/* Info */}
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {filteredTasks.length === 0
              ? '0 résultat'
              : <>
                  <strong style={{ color: '#64748b' }}>
                    {(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filteredTasks.length)}
                  </strong>
                  {' '}sur{' '}
                  <strong style={{ color: '#64748b' }}>{filteredTasks.length}</strong>
                  {filteredTasks.length !== kpiTotal && (
                    <span style={{ color: '#cbd5e1' }}> (filtré · {kpiTotal} au total)</span>
                  )}
                </>
            }
          </span>

          {/* Boutons pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button disabled={safePage === 1} onClick={() => setCurrentPage(1)}
                style={btnPage(safePage === 1)} title="Première page">
                <FiChevronsLeft size={14} />
              </button>
              <button disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)}
                style={btnPage(safePage === 1)} title="Page précédente">
                <FiChevronLeft size={14} />
              </button>

              {getPageNumbers().map((p, idx) =>
                p === '...'
                  ? <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>…</span>
                  : (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      style={{
                        ...btnPage(false),
                        border: `1.5px solid ${p === safePage ? '#7c3aed' : '#e2e8f0'}`,
                        background: p === safePage ? '#7c3aed' : 'white',
                        color: p === safePage ? 'white' : '#475569',
                        fontWeight: p === safePage ? '700' : '500',
                        minWidth: '34px',
                      }}>
                      {p}
                    </button>
                  )
              )}

              <button disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)}
                style={btnPage(safePage === totalPages)} title="Page suivante">
                <FiChevronRight size={14} />
              </button>
              <button disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)}
                style={btnPage(safePage === totalPages)} title="Dernière page">
                <FiChevronsRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────── */}
      {showModal && (
        <TaskModal task={editingTask} onClose={() => setShowModal(false)}
          onSave={handleSaveTask} loading={saving}
          implementers={implementers} changements={allChangements} />
      )}
      {showDetailModal && (
        <TaskDetailModal task={selectedTask} onClose={() => setShowDetailModal(false)}
          onEdit={handleEditTask} onDelete={handleDeleteTask} />
      )}
      {confirmDel && (
        <ConfirmModal
          isOpen={!!confirmDel}
          title={confirmDel.title} message={confirmDel.message}
          danger={true} loading={saving}
          onConfirm={confirmDelete} onCancel={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default TaskManagement;