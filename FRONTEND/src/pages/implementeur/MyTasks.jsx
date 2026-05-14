import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FiSearch, FiFilter, FiCheckCircle, FiPlay, 
  FiMoreVertical, FiPlus, FiMessageSquare, FiClock,
  FiX, FiSend, FiActivity, FiAlertCircle, FiFileText, FiCheckSquare, FiAlertTriangle, FiArrowRight, FiRefreshCw,
  FiUser, FiCalendar
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import changeService from '../../services/changeService';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Toast from '../../components/common/Toast';
import './MyTasks.css';
import '../changemanager/RfcManagement.css';
import '../admin/AdminUnified.css';

const getTaskStatusClass = (code) => {
  switch(code) {
    case 'PLANIFIEE': return 'status-blue';
    case 'EN_ATTENTE': return 'status-indigo';
    case 'EN_COURS':  return 'status-pink';
    case 'TERMINEE':  return 'status-green';
    case 'ANNULEE':   return 'status-red';
    default:          return 'status-default';
  }
};

const MyTasks = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pirForm, setPirForm] = useState({ show: false, description: '' });
  const [newLog, setNewLog] = useState({ titre_journal: '', description: '' });
  const [statutsTache, setStatutsTache] = useState([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [kpiFilter, setKpiFilter] = useState('');
  const [toast, setToast] = useState({ msg: '', type: '' });

  const filteredTasks = tasks
    .filter((task) => {
      const searchTerm = search.trim().toLowerCase();
      if (!searchTerm) return true;
      return (
        String(task.code_tache).toLowerCase().includes(searchTerm) ||
        String(task.titre_tache).toLowerCase().includes(searchTerm) ||
        String(task.changement?.code_changement || '').toLowerCase().includes(searchTerm) ||
        String(task.changement?.rfc?.code_rfc || '').toLowerCase().includes(searchTerm)
      );
    })
    .filter((task) => {
      if (statusFilter) return task.statut?.code_statut === statusFilter;
      if (filter === 'ALL') {
        return !['TERMINEE', 'ANNULEE', 'CLOTUREE', 'SUCCES'].includes(task.statut?.code_statut);
      }
      return task.statut?.code_statut === filter;
    })
    .filter((task) => {
      if (!typeFilter) return true;
      const rfcType = (task.changement?.rfc?.typeRfc?.type || '').toUpperCase();
      return rfcType === typeFilter.toUpperCase();
    })
    .filter((task) => {
      if (!kpiFilter || kpiFilter !== 'URGENT') return true;
      const typeStr = (task.changement?.rfc?.typeRfc?.type || task.changement?.type || '').toUpperCase();
      const isUrgent = typeStr.includes('URGENT') || task.is_change_urgent || task.priorite_code === 'HAUTE' || task.priorite_code === 'CRITIQUE' || task.priorite_code === 'P4' || task.priorite_code === 'P5';
      return ['EN_ATTENTE', 'EN_COURS'].includes(task.statut?.code_statut) && isUrgent;
    });

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  const fetchTasks = async () => {
    if (!user?.id_user) return;
    setLoading(true);
    try {
      const userTasks = await changeService.getMyTasks(user.id_user);
      setTasks(userTasks);
    } catch (error) {
      console.error('Fetch My Tasks Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuts = async () => {
    try {
      const list = await changeService.getTaskStatuses();
      setStatutsTache(list);
    } catch (e) { 
      console.error('Fetch Statuts Error:', e); 
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchStatuts();
  }, [user]);

  // Lecture du paramètre kpi depuis l'URL (pour les alertes)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const kpi = params.get('kpi');
    if (kpi) {
      setFilter('ALL');
      setKpiFilter(kpi);
    }
  }, [location.search]);

  const handleUpdateStatus = async (taskId, nextStatusCode) => {
    const nextStatut = statutsTache.find(s => s.code_statut === nextStatusCode);
    if (!nextStatut) {
      setToast({ msg: `Erreur : Le statut "${nextStatusCode}" est introuvable.`, type: 'error' });
      return;
    }
    try {
      const res = await changeService.updateTacheStatut(taskId, nextStatut.id_statut);
      
      if (res) {
        if (nextStatusCode === 'EN_COURS') {
          setToast({ msg: 'Tâche démarrée avec succès.', type: 'success' });
        }
        
        // Rafraîchir la liste
        await fetchTasks();

        if (selectedTask?.id_tache === taskId) {
           const updatedTache = await changeService.getTacheById(taskId);
           if (updatedTache) {
             updatedTache.changement = selectedTask.changement;
             updatedTache.priorite_code = selectedTask.priorite_code;
             updatedTache.is_change_urgent = selectedTask.is_change_urgent;
             setSelectedTask(updatedTache);
           }
        }
      }
    } catch (error) {
      console.error('Update Status Error:', error);
      setToast({ msg: error?.message || 'Erreur lors du changement de statut.', type: 'error' });
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.description.trim()) return;

    try {
      const res = await api.post(`/taches/${selectedTask.id_tache}/journaux`, newLog);
      if (res) {
        const response = await api.get(`/taches/${selectedTask.id_tache}`);
        const tacheObj = response?.data?.tache || response?.tache || response;
        
        if (tacheObj && typeof tacheObj === 'object') {
          tacheObj.changement = selectedTask.changement;
          setSelectedTask(tacheObj);
        }
        setNewLog({ titre_journal: '', description: '' });
      }
    } catch (error) {
      console.error('Add Log Error:', error);
      alert(error?.message || 'Erreur lors de l\'ajout du journal.');
    }
  };

  const handleDeclarrerResultat = (estSucces) => {
    setShowModal(false);
    if (!estSucces) {
      setPirForm({
        show: true,
        isEchec: true,
        description: `RAPPORT D'INCIDENT / ÉCHEC (Rollback Déclenché)

Action tentée: ${selectedTask.titre_tache}

Détail de l'incident technique:
- 

Cause racine estimée:
- 

Plan de Rollback exécuté (Oui/Non):
- 

Impact actuel sur le service:
- `
      });
    } else {
      setPirForm({
        show: true,
        isEchec: false,
        description: `Rapport de Succès de l'Implémentation

Tâche: ${selectedTask.titre_tache}

Actions réalisées avec succès:
- 

Vérifications post-implémentation effectuées:
- `
      });
    }
  };

  const handleSubmitResult = async () => {
    if (!selectedTask) return;
    try {
      // 1. Ajouter le journal d'exécution via le service
      await changeService.addJournal(selectedTask.id_tache, {
        titre_journal: pirForm.isEchec ? 'INCIDENT / ÉCHEC' : 'SUCCÈS D\'EXÉCUTION',
        description: pirForm.description
      });
      
      // 2. Changer le statut de la tâche
      const targetCode = pirForm.isEchec ? 'ANNULEE' : 'TERMINEE';
      const statusToSet = statutsTache.find(s => s.code_statut === targetCode);
      
      if (!statusToSet) {
        throw new Error(`Le statut cible "${targetCode}" est introuvable.`);
      }

      await changeService.updateTacheStatut(selectedTask.id_tache, statusToSet.id_statut);
      
      setToast({ 
        msg: pirForm.isEchec ? 'Incident signalé et transmis au Change Manager.' : 'Exécution terminée avec succès.', 
        type: pirForm.isEchec ? 'error' : 'success' 
      });
      
      // 3. Nettoyage et rafraîchissement
      setPirForm({ show: false, description: '' });
      await fetchTasks();
      setSelectedTask(null); // On ferme le modal proprement
      setShowModal(false);
    } catch (error) {
      console.error('Declaration Result Error:', error);
      setToast({ msg: error?.message || 'Erreur lors de la déclaration du résultat.', type: 'error' });
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.statut?.code_statut === 'EN_ATTENTE').length,
    inProgress: tasks.filter(t => t.statut?.code_statut === 'EN_COURS').length,
    completed: tasks.filter(t => t.statut?.code_statut === 'TERMINEE').length,
    failed: tasks.filter(t => t.statut?.code_statut === 'ANNULEE').length,
    urgent: tasks.filter(t => {
      const typeStr = (t.changement?.rfc?.typeRfc?.type || t.changement?.type || '').toUpperCase();
      const isUrgent = typeStr.includes('URGENT') || t.is_change_urgent || t.priorite_code === 'HAUTE' || t.priorite_code === 'CRITIQUE' || t.priorite_code === 'P4' || t.priorite_code === 'P5';
      return ['EN_ATTENTE', 'EN_COURS'].includes(t.statut?.code_statut) && isUrgent;
    }).length
  };

  return (
    <div className="my-tasks-container">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
            <FiCheckSquare />
          </div>
          <div className="premium-header-text">
            <h1>Mes Assignations</h1>
            <p>Consultez et exécutez vos tâches d'implémentation · Temps réel ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
           <button 
                className="btn-create-premium" 
                onClick={() => fetchTasks()}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
                <FiRefreshCw className={loading ? 'spinning' : ''} /> Actualiser
            </button>
        </div>
      </div>

      {/* KPI Grid — Aligned with Dashboard CSS */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard 
          title="À faire" 
          value={stats.pending} 
          icon={<FiClock />} 
          color="amber" 
          onClick={() => setFilter('EN_ATTENTE')}
          active={filter === 'EN_ATTENTE'}
          trend={{ value: 'Priorité haute', type: 'warning' }}
        />
        <StatCard 
          title="En cours" 
          value={stats.inProgress} 
          icon={<FiPlay />} 
          color="purple" 
          onClick={() => setFilter('EN_COURS')}
          active={filter === 'EN_COURS'}
          trend={{ value: 'Exécution active', type: 'info' }}
        />
        <StatCard 
          title="Succès" 
          value={stats.completed} 
          icon={<FiCheckCircle />} 
          color="green" 
          onClick={() => { setFilter('TERMINEE'); setKpiFilter(''); }}
          active={filter === 'TERMINEE'}
          trend={{ value: 'Exécution OK', type: 'success' }}
        />
        <StatCard 
          title="Échecs" 
          value={stats.failed} 
          icon={<FiAlertCircle />} 
          color="red" 
          onClick={() => { setFilter('ANNULEE'); setKpiFilter(''); }}
          active={filter === 'ANNULEE'}
          trend={{ value: 'Rollback', type: 'danger' }}
        />
        <StatCard 
          title="Urgentes" 
          value={stats.urgent} 
          icon={<FiAlertTriangle />} 
          color="red" 
          onClick={() => { setFilter('ALL'); setKpiFilter('URGENT'); }}
          active={kpiFilter === 'URGENT'}
          trend={{ value: 'Prioritaires', type: 'danger' }}
        />
      </div>
      
      <div className="tasks-list-panel">
        <div className="panel-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
           <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
             <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
             <input
               type="text"
               placeholder="Rechercher par code tâche, titre ou changement..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', outline: 'none' }}
             />
           </div>
           <div style={{ display: 'flex', gap: '0.75rem' }}>
             <select
               value={statusFilter}
               onChange={e => { setStatusFilter(e.target.value); setFilter('ALL'); setKpiFilter(''); }}
               style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem', minWidth: '160px' }}
             >
               <option value="">Tous les statuts</option>
               <option value="EN_ATTENTE">En attente</option>
               <option value="EN_COURS">En cours</option>
               <option value="TERMINEE">Terminée</option>
               <option value="ANNULEE">Annulée</option>
             </select>
             <select
               value={typeFilter}
               onChange={e => setTypeFilter(e.target.value)}
               style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem', minWidth: '160px' }}
             >
               <option value="">Tous les types</option>
               <option value="NORMAL">Normal</option>
               <option value="URGENT">Urgent</option>
               <option value="STANDARD">Standard</option>
             </select>
             {(search || statusFilter || typeFilter || kpiFilter) && (
               <button
                 onClick={() => { setSearch(''); setStatusFilter(''); setTypeFilter(''); setFilter('ALL'); setKpiFilter(''); }}
                 style={{ padding: '0.75rem 1.25rem', borderRadius: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 700, cursor: 'pointer' }}
                 title="Réinitialiser les filtres"
               >
                 <FiX />
               </button>
             )}
           </div>
        </div>

        <div className="tasks-table-container">
          {loading ? (
             <div className="loading-state">Initialisation...</div>
          ) : filteredTasks.length === 0 ? (
             <div className="empty-state">Aucune tâche assignée.</div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
             <table className="tasks-table">
               <thead>
                 <tr>
                   <th>Titre</th>
                   <th>Code</th>
                   <th>Changement</th>
                   <th>RFC</th>
                   <th>Statut</th>
                   <th>Priorité</th>
                   <th>Date</th>
                   <th>Durée</th>
                   <th>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredTasks.map(task => (
                   <tr
                     key={task.id_tache}
                     className={selectedTask?.id_tache === task.id_tache ? 'selected' : ''}
                     onClick={() => handleSelectTask(task)}
                   >
                     <td style={{ fontWeight: 800, color: '#000000' }}>{task.titre_tache}</td>
                     <td style={{ color: '#3b82f6', fontWeight: 600 }}>{task.code_tache}</td>
                     <td>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                         <span>{task.changement?.code_changement || '-'}</span>
                         {task.changement?.rfc?.typeRfc?.type && (
                           <span style={{ 
                             fontSize: '0.65rem', 
                             padding: '2px 6px', 
                             borderRadius: '8px', 
                             background: task.changement.rfc.typeRfc.type === 'URGENT' ? '#fef2f2' : '#eff6ff',
                             color: task.changement.rfc.typeRfc.type === 'URGENT' ? '#ef4444' : '#3b82f6',
                             border: `1px solid ${task.changement.rfc.typeRfc.type === 'URGENT' ? '#fecaca' : '#bfdbfe'}`,
                             width: 'fit-content',
                             fontWeight: 700
                           }}>
                             {task.changement.rfc.typeRfc.type}
                           </span>
                         )}
                       </div>
                     </td>
                     <td>{task.changement?.rfc?.code_rfc || '-'}</td>
                     <td>
                      <span className={`status-badge status-badge-sm ${getTaskStatusClass(task.statut?.code_statut)}`}>
                         {task.statut?.libelle}
                       </span>
                     </td>
                                           <td>
                        <span style={{ 
                          padding: '2px 8px', 
                          borderRadius: '10px', 
                          fontSize: '0.7rem', 
                          fontWeight: '700',
                          background: (task.priorite_code === 'CRITIQUE' || task.priorite_code === 'P5') ? '#fef2f2' : (task.priorite_code === 'HAUTE' || task.priorite_code === 'P4') ? '#fff7ed' : '#f0fdf4',
                          color: (task.priorite_code === 'CRITIQUE' || task.priorite_code === 'P5') ? '#ef4444' : (task.priorite_code === 'HAUTE' || task.priorite_code === 'P4') ? '#f97316' : '#22c55e',
                          border: `1px solid ${(task.priorite_code === 'CRITIQUE' || task.priorite_code === 'P5') ? '#fecaca' : (task.priorite_code === 'HAUTE' || task.priorite_code === 'P4') ? '#ffedd5' : '#dcfce7'}`
                        }}>
                          {task.priorite_code || 'NORMALE'}
                        </span>
                      </td>
                     <td>{new Date(task.date_creation).toLocaleDateString()}</td>
                     <td>{task.duree ? `${task.duree}h` : '-'}</td>
                     <td>
                       <button className="btn-select" onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}>
                         Ouvrir
                       </button>
                     </td>
                   </tr>
                  ))}
               </tbody>
             </table>
            </div>
          )}
        </div>
      </div>

      {showModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box-cab glass-card-cab tm-modal-large" style={{ maxWidth: '680px', background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>

            {/* ── Header bleu foncé ── */}
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
                <FiFileText />
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Détails de la Tâche</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {selectedTask.code_tache} &bull; {selectedTask.changement?.code_changement || '—'}
                  {selectedTask.changement?.rfc?.typeRfc?.type && (
                    <span style={{ marginLeft: '8px', background: selectedTask.changement.rfc.typeRfc.type === 'URGENT' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.15)', padding: '1px 8px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700 }}>
                      {selectedTask.changement.rfc.typeRfc.type}
                    </span>
                  )}
                  {selectedTask.changement?.rfc?.code_rfc && <span style={{ marginLeft: '8px' }}>&bull; {selectedTask.changement.rfc.code_rfc}</span>}
                </div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowModal(false)} style={{ color: '#ffffff' }}><FiX size={22} /></button>
            </div>

            {/* ── Corps ── */}
            <div className="modal-body" style={{ background: 'transparent' }}>
              <div className="tm-detail-grid">
                <div className="form-group-cab tm-col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Titre de la Tâche</label>
                  <div className="tm-detail-box tm-title-box">{selectedTask.titre_tache}</div>
                </div>
                <div className="form-group-cab tm-col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Description</label>
                  <div className="tm-detail-box tm-description-box">
                    {selectedTask.description || 'Aucune description fournie.'}
                  </div>
                </div>
                <div className="form-group-cab" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Statut</label>
                  <div className="tm-detail-box">
                    <span className={`status-badge status-badge-md ${getTaskStatusClass(selectedTask.statut?.code_statut)}`}>
                      {selectedTask.statut?.libelle || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="form-group-cab" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Priorité</label>
                  <div className="tm-detail-box">
                    <span style={{
                      padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '700',
                      background: (selectedTask.priorite_code === 'CRITIQUE' || selectedTask.priorite_code === 'P5') ? '#fef2f2' : (selectedTask.priorite_code === 'HAUTE' || selectedTask.priorite_code === 'P4') ? '#fff7ed' : '#f0fdf4',
                      color: (selectedTask.priorite_code === 'CRITIQUE' || selectedTask.priorite_code === 'P5') ? '#ef4444' : (selectedTask.priorite_code === 'HAUTE' || selectedTask.priorite_code === 'P4') ? '#f97316' : '#22c55e'
                    }}>
                      {selectedTask.priorite_code || 'NORMALE'}
                    </span>
                  </div>
                </div>
                <div className="form-group-cab" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Référence / Changement</label>
                  <div className="tm-detail-box" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ color: '#2563eb', fontWeight: 800 }}>{selectedTask.code_tache}</span>
                    {selectedTask.changement?.code_changement && (
                      <span style={{ fontSize: '0.8rem', background: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569', fontWeight: 600 }}>{selectedTask.changement.code_changement}</span>
                    )}
                  </div>
                </div>
                <div className="form-group-cab" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Assigné à</label>
                  <div className="tm-detail-box tm-detail-with-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <FiUser className="tm-muted-icon"/>
                    {user?.prenom_user} {user?.nom_user}
                  </div>
                </div>
                <div className="form-group-cab" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Début prévu</label>
                  <div className="tm-detail-box tm-detail-with-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <FiCalendar className="tm-muted-icon"/>
                    {selectedTask.date_debut_prevue ? new Date(selectedTask.date_debut_prevue).toLocaleString() : new Date(selectedTask.date_creation).toLocaleDateString()}
                  </div>
                </div>
                <div className="form-group-cab" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 700, margin: 0 }}>Fin prévue</label>
                  <div className="tm-detail-box tm-detail-with-icon" style={{ display: 'flex', alignItems: 'center' }}>
                    <FiClock className="tm-muted-icon"/>
                    {selectedTask.date_fin_prevue ? new Date(selectedTask.date_fin_prevue).toLocaleString() : selectedTask.duree ? `${selectedTask.duree}h estimées` : 'Non définie'}
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: '1rem', marginTop: '1.5rem' }}>
                {selectedTask.statut?.code_statut === 'EN_ATTENTE' ? (
                  <button className="btn-select" style={{ flex: 1, padding: '0.85rem' }} onClick={() => handleUpdateStatus(selectedTask.id_tache, 'EN_COURS')}>
                    <FiPlay className="btn-icon-gap" /> Démarrer la tâche
                  </button>
                ) : selectedTask.statut?.code_statut === 'EN_COURS' ? (
                  <>
                    <button className="btn-probleme" onClick={() => handleDeclarrerResultat(false)} style={{ flex: 1 }}>
                      <FiAlertCircle /> Signaler un Échec (Rollback)
                    </button>
                    <button className="btn-cloturer" onClick={() => handleDeclarrerResultat(true)} style={{ flex: 1 }}>
                      <FiCheckCircle /> Terminer l'exécution (Succès)
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, textAlign: 'center', color: '#64748b', fontWeight: 600, padding: '0.85rem', background: '#f1f5f9', borderRadius: '8px' }}>
                    Tâche {selectedTask.statut?.libelle || 'Clôturée'}
                  </div>
                )}
              </div>
              <div className="modal-note">
                <p><strong>Info:</strong> Vous devez d'abord démarrer la tâche. Si l'implémentation échoue, le Change Manager sera informé et la tâche sera marquée pour rollback.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {pirForm.show && (
        <div className="modal-overlay" onClick={() => setPirForm({ show: false })}>
          <div className="modal-content" style={{ borderRadius: '20px', overflow: 'hidden', maxWidth: '640px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
                {pirForm.isEchec ? <FiAlertCircle /> : <FiCheckCircle />}
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>{pirForm.isEchec ? "Déclaration d'Échec" : 'Validation de Succès'}</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255,255,255,0.75)' }}>
                  {pirForm.isEchec ? 'Signalez le problème et le rollback' : "Confirmez la réussite de l'implémentation"}
                </div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setPirForm({ show: false })} style={{ color: '#ffffff' }}><FiX size={22} /></button>
            </div>
            <div className="modal-body" style={{ background: '#f0f9ff' }}>
              <textarea
                placeholder="Détaillez votre compte-rendu d'exécution..."
                value={pirForm.description}
                onChange={e => setPirForm({...pirForm, description: e.target.value})}
                rows={12}
                className="pir-textarea"
              />
              <div className="modal-actions">
                <button 
                  className={pirForm.isEchec ? 'btn-probleme' : 'btn-submit'} 
                  onClick={handleSubmitResult} 
                  disabled={!pirForm.description.trim()}
                >
                  <FiSend className="btn-icon-gap" />
                  Confirmer le Résultat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {toast.msg && (
        <Toast 
          msg={toast.msg} 
          type={toast.type} 
          onClose={() => setToast({ msg: '', type: '' })} 
        />
      )}
    </div>
  );
};

export default MyTasks;

