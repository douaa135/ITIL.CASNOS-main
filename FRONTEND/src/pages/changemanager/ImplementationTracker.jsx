import React, { useState, useEffect } from 'react';
import { 
  FiActivity, FiCheckCircle, FiClock, FiAlertCircle, 
  FiMaximize2, FiMinimize2, FiUser, FiList, FiMessageSquare,
  FiPlus, FiX, FiCheck, FiCpu, FiTrendingUp, FiUsers, FiCheckSquare, FiCalendar,
  FiTrash2, FiEdit3
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import './ImplementationTracker.css';

const ImplementationTracker = () => {
    const [changements, setChangements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [tasksData, setTasksData] = useState({});
    const [selectedImplementer, setSelectedImplementer] = useState(null);
    const [implementerTasks, setImplementerTasks] = useState([]);
    const [loadingImplementerTasks, setLoadingImplementerTasks] = useState(false);
    const [implementerStats, setImplementerStats] = useState({});
    const [showTasksModal, setShowTasksModal] = useState(false);
    
    // New states for Assignment & Team Tracking
    const [implementers, setImplementers] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedChange, setSelectedChange] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' or 'team'
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [taskStatuses, setTaskStatuses] = useState([]);
    const [savingTask, setSavingTask] = useState(false);
    const [confirmDel, setConfirmDel] = useState(null);
    const [newTask, setNewTask] = useState({
        id_tache: null,
        titre_tache: '',
        description: '',
        id_user: '',
        ordre_tache: 1,
        id_changement: ''
    });

    // Filtres spécifiques pour l'équipe technique
    const [teamSearch, setTeamSearch] = useState('');
    const [teamImplementerFilter, setTeamImplementerFilter] = useState('ALL');

    const fetchImplementerTasks = (imp) => {
        setSelectedImplementer(imp);
        setShowTasksModal(true);
        // We already have all tasks in tasksData, we just need to collect them for this user
        const allTasksForUser = Object.values(tasksData).flat().filter(t => t.id_user === imp.id_user || t.implementeur?.id_user === imp.id_user);
        setImplementerTasks(allTasksForUser);
    };

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                const [changesRes, impsRes, taskStatusRes] = await Promise.all([
                    api.get('/changements'),
                    api.get('/users?nom_role=IMPLEMENTEUR&limit=1000'),
                    api.get('/statuts?contexte=TACHE')
                ]);

                let allChanges = [];
                if (changesRes.data) {
                    const changesData = changesRes.data || changesRes;
                    allChanges = (changesData.changements || []).filter(c => c.statut?.code_statut !== 'EN_PLANIFICATION');
                    setChangements(allChanges);
                }
                
                const implementersList = impsRes.data?.data || impsRes.data?.users || [];
                setImplementers(implementersList);

                // Fetch ALL tasks for ALL relevant changes to have coherent stats
                const tasksMap = {};
                const statsMap = {};
                
                // Initialize stats for each implementer
                implementersList.forEach(imp => {
                    statsMap[imp.id_user] = { total: 0, urgent: 0, completed: 0 };
                });

                await Promise.all(allChanges.map(async (change) => {
                    try {
                        const res = await api.get(`/changements/${change.id_changement}/taches`);
                        const tasks = res.data?.taches || res.taches || [];
                        tasksMap[change.id_changement] = tasks;

                        // Update stats
                        tasks.forEach(task => {
                            const impId = task.id_user || task.implementeur?.id_user;
                            if (impId && statsMap[impId]) {
                                statsMap[impId].total += 1;
                                if (task.priorite?.toUpperCase() === 'URGENT' || change.priorite?.toUpperCase() === 'URGENT') {
                                    statsMap[impId].urgent += 1;
                                }
                                if (['TERMINEE', 'CLOTURE'].includes(task.statut?.code_statut?.toUpperCase())) {
                                    statsMap[impId].completed += 1;
                                }
                            }
                        });
                    } catch (e) {
                        console.error(`Error fetching tasks for change ${change.id_changement}`, e);
                    }
                }));

                setTasksData(tasksMap);
                setImplementerStats(statsMap);

                if (taskStatusRes?.data?.statuts) {
                    setTaskStatuses(taskStatusRes.data.statuts);
                } else if (taskStatusRes?.statuts) {
                    setTaskStatuses(taskStatusRes.statuts);
                }
            } catch (error) {
                console.error('Tracker Init Error:', error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    const handleOpenAssignModal = (change) => {
        setSelectedChange(change);
        setNewTask(prev => ({ ...prev, id_user: implementers[0]?.id_user || '' }));
        setShowAssignModal(true);
    };

    const handleAssignTask = async (e) => {
        e.preventDefault();
        setIsAssigning(true);
        const targetChangeId = selectedChange?.id_changement || newTask.id_changement;
        
        if (!targetChangeId) {
            alert('Veuillez sélectionner un changement.');
            setIsAssigning(false);
            return;
        }

        try {
            if (newTask.id_tache) {
                // Update mode
                await api.put(`/taches/${newTask.id_tache}`, newTask);
            } else {
                // Create mode
                await api.post(`/changements/${targetChangeId}/taches`, newTask);
            }
            
            setShowAssignModal(false);
            setNewTask({ id_tache: null, titre_tache: '', description: '', id_user: '', ordre_tache: 1, id_changement: '' });
            
            if (selectedChange) {
                fetchTasks(selectedChange.id_changement);
            } else if (selectedImplementer) {
                fetchImplementerTasks(selectedImplementer);
            }
        } catch (error) {
            console.error('Erreur assignation/update tâche:', error);
            alert('Erreur lors de l\'opération sur la tâche.');
        } finally {
            setIsAssigning(false);
        }
    };

    const toggleRow = async (id_changement) => {
        const isExpanded = !!expandedRows[id_changement];
        
        // Toggle UI immediately
        setExpandedRows(prev => ({ ...prev, [id_changement]: !isExpanded }));

        // If expanding and tasks not yet fetched, fetch them
        if (!isExpanded && !tasksData[id_changement]) {
            try {
                const res = await api.get(`/changements/${id_changement}/taches`);
                const tasks = res.data?.taches || res.taches || [];
                setTasksData(prev => ({ ...prev, [id_changement]: tasks }));
            } catch (error) {
                console.error('Fetch Tasks Error:', error);
            }
        }
    };

    const fetchTasks = async (idChangement) => {
        try {
            const res = await api.get(`/changements/${idChangement}/taches`);
            const tasks = res.data?.taches || res.taches || [];
            setTasksData(prev => ({ ...prev, [idChangement]: tasks }));
        } catch (error) {
            console.error('Fetch Tasks Error:', error);
        }
    };

    const handleTaskStatusUpdate = async (idTache, idStatut, idChangement) => {
        try {
            await api.put(`/taches/${idTache}/statut`, { id_statut: idStatut });
            // Refresh logic...
            if (selectedImplementer) {
                fetchImplementerTasks(selectedImplementer);
            }
            fetchTasks(idChangement);
        } catch (error) {
            console.error('Erreur update statut tâche:', error);
            alert('Erreur lors du changement de statut de la tâche.');
        }
    };

    const handleDeleteTask = (task, idChangement) => {
        setConfirmDel({
            idTache: task.id_tache,
            idChangement,
            title: 'Supprimer la tâche',
            message: `Êtes-vous sûr de vouloir supprimer la tâche "${task.titre_tache}" ? Cette action est irréversible.`
        });
    };

    const confirmDeleteTask = async () => {
        if (!confirmDel) return;
        try {
            await api.delete(`/taches/${confirmDel.idTache}`);
            if (selectedImplementer) {
                fetchImplementerTasks(selectedImplementer);
            }
            fetchTasks(confirmDel.idChangement);
            setConfirmDel(null);
        } catch (error) {
            console.error('Erreur suppression tâche:', error);
            alert('Erreur lors de la suppression de la tâche.');
        }
    };

    const handleTaskUpdate = async (taskId, payload, idChangement) => {
        try {
            await api.put(`/taches/${taskId}`, payload);
            await fetchTasks(idChangement);
        } catch (error) {
            console.error('Erreur mise à jour tâche', error);
            alert('Erreur lors de la mise à jour de la tâche.');
        }
    };

    const calculateProgressInfo = (change) => {
        // If tasks are fetched for this change, calculate exact progress
        const tasks = tasksData[change.id_changement];
        let percent = 0;
        
        if (tasks && tasks.length > 0) {
            const completed = tasks.filter(t => t.statut?.code_statut === 'TERMINEE').length;
            percent = Math.round((completed / tasks.length) * 100);
        } else if (change._count?.taches > 0) {
            // Fallback estimation if not yet expanded
            percent = change.statut?.code_statut === 'CLOTURE' || change.statut?.code_statut === 'IMPLEMENTE' ? 100 : 0;
        }

        return {
            percent,
            label: `${percent}%`
        };
    };

    const getProgressColor = (status, percent) => {
        if (percent === 100) return '#10b981'; // green
        switch(status) {
            case 'CLOTURE': case 'IMPLEMENTE': return '#10b981';
            case 'EN_COURS': return '#3b82f6';
            case 'EN_ECHEC': return '#ef4444';
            default: return '#64748b';
        }
    };

    const typeOptions = Array.from(new Set(changements.map(change => change.rfc?.typeRfc?.type || change.type || 'Standard')));
    const statusOptions = Array.from(new Set(changements.map(change => change.statut?.code_statut))).filter(Boolean);
    
    const filteredChangements = changements.filter((change) => {
        const typeName = change.rfc?.typeRfc?.type || change.type || 'Standard';
        const statusCode = change.statut?.code_statut || '';
        const matchesType = !filterType || typeName === filterType;
        const matchesStatus = !filterStatus || statusCode === filterStatus;
        return matchesType && matchesStatus;
    });

    const filteredImplementers = implementers.filter(imp => {
        // Filtre de recherche général (nom, prénom, email)
        const term = teamSearch.toLowerCase();
        const matchesSearch = !teamSearch || 
            (imp.prenom_user + ' ' + imp.nom_user).toLowerCase().includes(term) ||
            (imp.email_user || '').toLowerCase().includes(term);

        if (!matchesSearch) return false;

        // Filtre par implémenteur spécifique
        const matchesImpFilter = teamImplementerFilter === 'ALL' || imp.id_user === teamImplementerFilter;
        if (!matchesImpFilter) return false;
        
        // Filtres globaux (Type/Statut) hérités du tracker si présents
        if (!filterType && !filterStatus) return true;
        
        const impTasks = Object.values(tasksData).flat().filter(t => t.id_user === imp.id_user || t.implementeur?.id_user === imp.id_user);
        
        return impTasks.some(task => {
            const change = changements.find(c => c.id_changement === task.id_changement);
            if (!change) return false;
            
            const typeName = change.rfc?.typeRfc?.type || change.type || 'Standard';
            const statusCode = change.statut?.code_statut || '';
            
            const matchesType = !filterType || typeName === filterType;
            const matchesStatus = !filterStatus || statusCode === filterStatus;
            
            return matchesType && matchesStatus;
        });
    });

    if (loading) return <div className="loading-spinner">Chargement du tracker d'implémentation...</div>;

    return (
        <div className="tracker-page">
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                        <FiActivity />
                    </div>
                    <div className="premium-header-text">
                        <h1>Suivi de l'Implémentation</h1>
                        <p>Surveillez en temps réel l'avancement technique et les tâches des implémenteurs</p>
                    </div>
                </div>
                <div className="premium-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <button 
                        className={`btn-secondary-cab ${activeTab === 'tracking' ? 'active-tab' : ''}`}
                        onClick={() => setActiveTab('tracking')}
                        style={{ border: activeTab === 'tracking' ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0', color: activeTab === 'tracking' ? '#6366f1' : '#475569', background: activeTab === 'tracking' ? '#f5f3ff' : 'white' }}
                    >
                        <FiActivity /> Suivi Flux
                    </button>
                    <button 
                        className={`btn-secondary-cab ${activeTab === 'team' ? 'active-tab' : ''}`}
                        onClick={() => setActiveTab('team')}
                        style={{ border: activeTab === 'team' ? '1.5px solid #6366f1' : '1.5px solid #e2e8f0', color: activeTab === 'team' ? '#6366f1' : '#475569', background: activeTab === 'team' ? '#f5f3ff' : 'white' }}
                    >
                        <FiUsers /> Équipe Technique
                    </button>
                </div>
            </div>

            {/* ── SECTION STATISTIQUES GLOBALES (Tendances Implementation) ── */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                <div className="stat-card blue">
                    <div className="stat-icon-wrapper"><FiActivity size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{changements.filter(c => c.statut?.code_statut === 'EN_COURS').length}</div>
                        <div className="stat-label">Changements en Cours</div>
                    </div>
                </div>
                <div className="stat-card green">
                    <div className="stat-icon-wrapper"><FiCheckCircle size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{changements.filter(c => c.statut?.code_statut === 'CLOTURE' || c.statut?.code_statut === 'IMPLEMENTE').length}</div>
                        <div className="stat-label">Changements Terminés</div>
                    </div>
                </div>
                <div className="stat-card purple">
                    <div className="stat-icon-wrapper" style={{ background: '#f5f3ff', color: '#7c3aed' }}><FiCheckSquare size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{changements.reduce((acc, c) => acc + (c._count?.taches || 0), 0)}</div>
                        <div className="stat-label">Tâches au Total</div>
                    </div>
                </div>
                <div className="stat-card amber">
                    <div className="stat-icon-wrapper" style={{ background: '#fffbeb', color: '#d97706' }}><FiUsers size={24} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{implementers.length}</div>
                        <div className="stat-label">Équipe Technique</div>
                    </div>
                </div>
            </div>

            {activeTab === 'tracking' ? (
                <>
                    <div className="tracker-layout-container">
                        <div className="tracker-main-content">
                            <div className="tracker-list">
                                {filteredChangements.map(change => {
                                    const isExpanded = !!expandedRows[change.id_changement];
                                    const progress = calculateProgressInfo(change);
                                    const tasks = tasksData[change.id_changement] || [];

                                    return (
                                        <div key={change.id_changement} className={`tracker-item-card ${isExpanded ? 'expanded' : ''}`}>
                                            <div className="tracker-main-info" onClick={() => toggleRow(change.id_changement)}>
                                                <div className="tracker-title-col">
                                                    <span className="change-id">#{change.code_changement}</span>
                                                    <h3>{change.rfc?.titre_rfc || 'Changement Standard'}</h3>
                                                    <div className="tracker-meta">
                                                        <span className="meta-item"><FiUser /> Demandeur: {change.rfc ? `${change.rfc.demandeur?.prenom_user || ''} ${change.rfc.demandeur?.nom_user || ''}` : `${change.changeManager?.prenom_user || ''} ${change.changeManager?.nom_user || ''}`}</span>
                                                        <span className="meta-item"><FiUser /> Resp: {change.changeManager?.nom_user}</span>
                                                        <span className="meta-item"><FiClock /> Début: {change.date_debut ? new Date(change.date_debut).toLocaleDateString() : '—'}</span>
                                                        <span className="meta-item">Type: {change.rfc?.typeRfc?.type || change.type || 'Standard'}</span>
                                                    </div>
                                                </div>

                                                <div className="tracker-progress-col">
                                                    <div className="progress-header">
                                                        <span className="progress-label">Progression des tâches</span>
                                                        <span className="progress-percentage">{progress.label}</span>
                                                    </div>
                                                    <div className="progress-bar-container">
                                                        <div 
                                                            className="progress-bar-fill" 
                                                            style={{ 
                                                                width: `${progress.percent}%`,
                                                                backgroundColor: getProgressColor(change.statut?.code_statut, progress.percent)
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <div className="tasks-summary">
                                                        <FiActivity /> {change._count?.taches || tasks.length} tâches techniques
                                                    </div>
                                                </div>

                                                <div className="tracker-status-col">
                                                    <span className={`status-badge ${change.statut?.code_statut?.toLowerCase()}`}>
                                                        {change.statut?.libelle}
                                                    </span>
                                                    <div className="action-btns-group">
                                                        <button 
                                                            className="action-assign-btn" 
                                                            title="Assigner une tâche"
                                                            onClick={(e) => { e.stopPropagation(); handleOpenAssignModal(change); }}
                                                        >
                                                            <FiPlus />
                                                        </button>
                                                        <button className="action-toggle-btn">
                                                            {isExpanded ? <FiMinimize2 /> : <FiMaximize2 />}
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {isExpanded && (
                                                <div className="tracker-expanded-area">
                                                    <h4 className="expanded-title"><FiList /> Tâches techniques</h4>
                                                    {tasks.length === 0 ? (
                                                        <p className="no-tasks-msg">Aucune tâche planifiée pour l'instant.</p>
                                                    ) : (
                                                        <div className="tasks-table-mini-wrapper">
                                                            <table className="tasks-table-mini">
                                                                <thead>
                                                                    <tr>
                                                                        <th>Code</th>
                                                                        <th>Titre</th>
                                                                        <th>Statut</th>
                                                                        <th>Implémenteur</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {tasks.map(task => (
                                                                        <tr key={task.id_tache}>
                                                                            <td className="mini-code">{task.code_tache}</td>
                                                                            <td className="mini-title">{task.titre_tache}</td>
                                                                            <td>
                                                                                <InlineEditableBadge 
                                                                                    currentValue={task.id_statut || task.statut?.id_statut} 
                                                                                    currentCode={task.statut?.code_statut}
                                                                                    options={taskStatuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                                                                                    getVariant={(val) => {
                                                                                        const s = taskStatuses.find(st => st.id_statut == val);
                                                                                        return s?.code_statut?.toLowerCase() || 'default';
                                                                                    }}
                                                                                    onUpdate={(newId) => handleTaskStatusUpdate(task.id_tache, newId, change.id_changement)}
                                                                                    isEditable={true}
                                                                                    dropdownPosition="up"
                                                                                />
                                                                            </td>
                                                                            <td>
                                                                                <InlineEditableBadge
                                                                                    currentValue={task.id_user || task.implementeur?.id_user}
                                                                                    options={implementers.map(imp => ({ value: imp.id_user, label: `${imp.prenom_user} ${imp.nom_user}` }))}
                                                                                    getVariant={() => 'info'}
                                                                                    onUpdate={(newId) => handleTaskUpdate(task.id_tache, { id_user: newId }, change.id_changement)}
                                                                                    isEditable={task.statut?.code_statut === 'EN_ATTENTE'}
                                                                                    dropdownPosition="up"
                                                                                    label={task.implementeur ? `${task.implementeur.prenom_user} ${task.implementeur.nom_user}` : 'Non assigné'}
                                                                                />
                                                                            </td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="team-table-container">
                        <div className="team-panel-header" style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                            <div>
                                <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Équipe Technique</h2>
                                <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px' }}>Liste détaillée des intervenants et charge de travail</p>
                            </div>
                            <div className="team-filters" style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <div className="search-box-premium" style={{ position: 'relative' }}>
                                    <FiActivity style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                                    <input 
                                        type="text" 
                                        placeholder="Filtre général (Nom, Email...)" 
                                        style={{ padding: '10px 12px 10px 38px', borderRadius: '10px', border: '1px solid #e2e8f0', minWidth: '250px', fontSize: '0.85rem' }}
                                        value={teamSearch}
                                        onChange={(e) => setTeamSearch(e.target.value)}
                                    />
                                </div>
                                <select 
                                    style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', fontSize: '0.85rem', color: '#475569', minWidth: '180px' }}
                                    value={teamImplementerFilter}
                                    onChange={(e) => setTeamImplementerFilter(e.target.value)}
                                >
                                    <option value="ALL">Tous les implémenteurs</option>
                                    {implementers.map(imp => (
                                        <option key={imp.id_user} value={imp.id_user}>
                                            {imp.prenom_user} {imp.nom_user}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {implementers.length === 0 ? (
                            <div className="empty-team">Aucun implémenteur trouvé en base de données.</div>
                        ) : (
                            <table className="team-table">
                                <thead>
                                    <tr>
                                        <th>Nom & Prénom</th>
                                        <th>Email</th>
                                        <th className="text-center">Tâches</th>
                                        <th className="text-center">Urgentes</th>
                                        <th className="text-center">Terminées</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredImplementers.map((imp) => {
                                        const stats = implementerStats[imp.id_user] || { total: 0, urgent: 0, completed: 0 };
                                        return (
                                            <tr key={imp.id_user}>
                                                <td>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                        <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '0.8rem' }}>
                                                            {imp.prenom_user[0]}{imp.nom_user[0]}
                                                        </div>
                                                        <strong>{imp.prenom_user} {imp.nom_user}</strong>
                                                    </div>
                                                </td>
                                                <td>{imp.email_user || '—'}</td>
                                                <td className="text-center"><span className="badge-count" style={{ background: '#eff6ff', color: '#2563eb', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem' }}>{stats.total}</span></td>
                                                <td className="text-center"><span className="badge-urgent" style={{ background: '#fef2f2', color: '#dc2626', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem' }}>{stats.urgent}</span></td>
                                                <td className="text-center"><span className="badge-completed" style={{ background: '#f0fdf4', color: '#16a34a', padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.8rem' }}>{stats.completed}</span></td>
                                                <td className="text-right">
                                                    <button type="button" className="btn-link-premium" onClick={(e) => { e.stopPropagation(); fetchImplementerTasks(imp); }} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                                                        Détails
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {showTasksModal && selectedImplementer && (
                        <div className="modal-backdrop-cab" onClick={() => setShowTasksModal(false)}>
                            <div className="modal-box-cab glass-card-cab" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px' }}>
                                <div className="modal-top-rfc-style">
                                    <div className="rfc-style-icon-wrapper" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                                        <FiList />
                                    </div>
                                    <div className="rfc-style-header-text">
                                        <h2>{selectedImplementer.prenom_user} {selectedImplementer.nom_user}</h2>
                                        <div className="rfc-style-subtitle">Tâches assignées — {implementerTasks.length} au total</div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginRight: '40px' }}>
                                        <button 
                                            type="button" 
                                            className="btn-submit-rfc-style" 
                                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                                            onClick={() => {
                                                setSelectedChange(null);
                                                setNewTask({ id_tache: null, titre_tache: '', description: '', id_user: selectedImplementer.id_user, ordre_tache: 1, id_changement: '' });
                                                setShowAssignModal(true);
                                            }}
                                        >
                                            <FiPlus /> Nouvelle Tâche
                                        </button>
                                    </div>
                                    <button type="button" className="close-btn-rfc-style" onClick={() => setShowTasksModal(false)}>
                                        <FiX size={24} />
                                    </button>
                                </div>
                                <div className="modal-body-rfc-style">
                                    {loadingImplementerTasks ? (
                                        <div className="loading-box">Chargement des tâches...</div>
                                    ) : implementerTasks.length === 0 ? (
                                        <div className="empty-team">Aucune tâche assignée pour cet implémenteur.</div>
                                    ) : (
                                        <table className="tasks-table-mini">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Titre & Description</th>
                                                    <th>Statut</th>
                                                    <th>Implémenteur</th>
                                                    <th className="text-right">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {implementerTasks.map((task) => {
                                                    const isCompleted = ['TERMINEE', 'CLOTURE'].includes(task.statut?.code_statut?.toUpperCase());
                                                    const change = changements.find(c => c.id_changement === task.id_changement);
                                                    return (
                                                        <tr key={task.id_tache}>
                                                            <td className="mini-code"><strong>#{task.code_tache || '—'}</strong></td>
                                                            <td>
                                                                <div className="mini-title" style={{ fontWeight: '700', color: '#0f172a' }}>{task.titre_tache}</div>
                                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>{task.description || 'Pas de description'}</div>
                                                                <div style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: '700', marginTop: '4px' }}>
                                                                    Réf Chg: #{change?.code_changement || '—'}
                                                                </div>
                                                            </td>
                                                            <td>
                                                                <span className={`status-badge en_attente`} style={{ padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b' }}>
                                                                    {task.statut?.libelle || 'En attente'}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800' }}>
                                                                        {task.implementeur?.prenom_user?.[0] || 'U'}
                                                                    </div>
                                                                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{task.implementeur?.prenom_user} {task.implementeur?.nom_user}</span>
                                                                </div>
                                                            </td>
                                                            <td className="text-right">
                                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
                                                                    <button 
                                                                        onClick={() => {
                                                                            setNewTask({
                                                                                id_tache: task.id_tache,
                                                                                titre_tache: task.titre_tache,
                                                                                description: task.description || '',
                                                                                id_user: task.id_user,
                                                                                ordre_tache: task.ordre_tache,
                                                                                id_changement: task.id_changement
                                                                            });
                                                                            setSelectedChange(change);
                                                                            setShowAssignModal(true);
                                                                        }}
                                                                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                                                                        title="Modifier"
                                                                    >
                                                                        <FiEdit3 size={15} />
                                                                    </button>
                                                                    <button 
                                                                        onClick={() => handleDeleteTask(task, change.id_changement)}
                                                                        style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                                                                        title="Supprimer"
                                                                    >
                                                                        <FiTrash2 size={15} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Modal Assigner Tâche */}
            {showAssignModal && (
                <div className="modal-backdrop-cab" onClick={() => setShowAssignModal(false)}>
                    <div className="modal-box-cab glass-card-cab" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
                        <div className="modal-top-rfc-style">
                            <div className="rfc-style-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                                <FiPlus />
                            </div>
                            <div className="rfc-style-header-text">
                                <h2>Nouvelle Tâche Technique</h2>
                                <div className="rfc-style-subtitle">Assignation d'une opération technique au changement</div>
                            </div>
                            <button className="close-btn-rfc-style" onClick={() => setShowAssignModal(false)}><FiX size={24} /></button>
                        </div>
                        <form onSubmit={handleAssignTask}>
                            <div className="modal-body-rfc-style">
                                {!selectedChange && (
                                    <div className="form-group">
                                        <label>Sélectionner le Changement</label>
                                        <select 
                                            required 
                                            value={newTask.id_changement}
                                            onChange={e => setNewTask({...newTask, id_changement: e.target.value})}
                                        >
                                            <option value="">-- Choisir un changement --</option>
                                            {changements.map(c => (
                                                <option key={c.id_changement} value={c.id_changement}>
                                                    {c.code_changement} - {c.rfc?.titre_rfc || c.planChangement?.titre_plan}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                <div className="form-group">
                                    <label>Titre de la tâche</label>
                                    <input 
                                        required 
                                        value={newTask.titre_tache} 
                                        onChange={e => setNewTask({...newTask, titre_tache: e.target.value})}
                                        placeholder="ex: Configurer les ports pare-feu..."
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description (Optionnel)</label>
                                    <textarea 
                                        value={newTask.description} 
                                        onChange={e => setNewTask({...newTask, description: e.target.value})}
                                        placeholder="Détails techniques pour l'implémenteur..."
                                        style={{ minHeight: '100px' }}
                                    />
                                </div>
                                <div className="form-row">
                                    <div className="form-group half">
                                        <label>Assigner à l'implémenteur</label>
                                        <select 
                                            required
                                            value={newTask.id_user}
                                            onChange={e => setNewTask({...newTask, id_user: e.target.value})}
                                        >
                                            {implementers.map(imp => (
                                                <option key={imp.id_user} value={imp.id_user}>
                                                    {imp.prenom_user} {imp.nom_user}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group half">
                                        <label>Ordre d'exécution</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            value={newTask.ordre_tache}
                                            onChange={e => setNewTask({...newTask, ordre_tache: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer-rfc-style">
                                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowAssignModal(false)}>Annuler</button>
                                <button type="submit" className="btn-submit-rfc-style" disabled={isAssigning}>
                                    {isAssigning ? 'Création...' : <><FiCheck /> Assigner la tâche</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {confirmDel && (
                <ConfirmModal 
                    title={confirmDel.title} 
                    message={confirmDel.message} 
                    danger={true} 
                    onConfirm={confirmDeleteTask} 
                    onCancel={() => setConfirmDel(null)} 
                />
            )}
        </div>
    );
};

export default ImplementationTracker;