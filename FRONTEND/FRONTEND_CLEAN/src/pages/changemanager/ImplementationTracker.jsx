import React, { useState, useEffect } from 'react';
import { 
  FiActivity, FiCheckCircle, FiClock, FiAlertCircle, 
  FiMaximize2, FiMinimize2, FiUser, FiList, FiMessageSquare,
  FiPlus, FiX, FiCheck, FiCpu, FiTrendingUp, FiUsers, FiCheckSquare
} from 'react-icons/fi';
import api from '../../api/axiosClient';
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
    const [newTask, setNewTask] = useState({
        titre_tache: '',
        description: '',
        id_user: '',
        ordre_tache: 1,
        duree: 2
    });

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // Fetch changes and implementers in parallel
                const [changesRes, impsRes] = await Promise.all([
                    api.get('/changements'),
                    api.get('/users/by-role/IMPLEMENTEUR')
                ]);

                if (changesRes.data) {
                    const changesData = changesRes.data || changesRes;
                    setChangements((changesData.changements || []).filter(c => c.statut?.code_statut !== 'EN_PLANIFICATION'));
                }
                
                const implementersList = impsRes.data?.users || impsRes.users || [];
                if (implementersList && implementersList.length > 0) {
                    setImplementers(implementersList);
                    // Calculate stats for each implementer
                    const stats = {};
                    for (const imp of implementersList) {
                        try {
                            const tasksRes = await api.get(`/taches/implementeur/${imp.id_user}`);
                            const tasks = (tasksRes.data?.taches || tasksRes.taches || []);
                            stats[imp.id_user] = {
                                total: tasks.length,
                                urgent: tasks.filter(t => t.priorite === 'URGENT' || t.changement?.priorite === 'URGENT').length
                            };
                        } catch (e) {
                            console.error('Stats fetch error for implementer:', imp.id_user, e);
                            stats[imp.id_user] = { total: 0, urgent: 0 };
                        }
                    }
                    setImplementerStats(stats);
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
        if (!selectedChange) return;

        setIsAssigning(true);
        try {
            const res = await api.post(`/changements/${selectedChange.id_changement}/taches`, newTask);
            if (res.data || res.id_tache) {
                // Refresh tasks for this change if it's currently expanded
                const tasksRes = await api.get(`/changements/${selectedChange.id_changement}/taches`);
                const tasks = tasksRes.data?.taches || tasksRes.taches || [];
                setTasksData(prev => ({ ...prev, [selectedChange.id_changement]: tasks }));
                
                // Update local changement count if needed
                setChangements(prev => prev.map(c => 
                    c.id_changement === selectedChange.id_changement 
                    ? { ...c, _count: { ...c._count, taches: (c._count?.taches || 0) + 1 } }
                    : c
                ));

                setShowAssignModal(false);
                setNewTask({ titre_tache: '', description: '', id_user: implementers[0]?.id_user || '', ordre_tache: 1, duree: 2 });
            }
        } catch (error) {
            console.error('Assign Task Error:', error);
            alert('Erreur lors de l\'assignation de la tâche.');
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

    const fetchImplementerTasks = async (implementer) => {
        if (!implementer) return;
        setSelectedImplementer(implementer);
        setLoadingImplementerTasks(true);
        setShowTasksModal(true);
        try {
            const res = await api.get(`/taches/implementeur/${implementer.id_user}`);
            const tasks = res.data?.taches || res.taches || [];
            setImplementerTasks(tasks);
        } catch (error) {
            console.error('Fetch Implementer Tasks Error:', error);
            setImplementerTasks([]);
        } finally {
            setLoadingImplementerTasks(false);
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

    if (loading) return <div className="loading-spinner">Chargement du tracker d'implémentation...</div>;

    return (
        <div className="tracker-page">
            <div className="tracker-header-box">
                <div className="header-info">
                    <h1>Suivi de l'Implémentation</h1>
                    <p>Surveillez en temps réel l'avancement technique et les tâches des implémenteurs.</p>
                </div>
                <div className="tab-controls-premium">
                    <button 
                        className={`tab-btn ${activeTab === 'tracking' ? 'active' : ''}`}
                        onClick={() => setActiveTab('tracking')}
                    >
                        <FiActivity /> Suivi Flux
                    </button>
                    <button 
                        className={`tab-btn ${activeTab === 'team' ? 'active' : ''}`}
                        onClick={() => setActiveTab('team')}
                    >
                        <FiUsers /> Équipe Technique
                    </button>
                </div>
            </div>

            {activeTab === 'tracking' ? (
                <>
                    <div className="tracker-stats-row">
                        <div className="stat-card">
                            <span className="stat-label">En Cours</span>
                            <span className="stat-value">{changements.filter(c => c.statut?.code_statut === 'EN_COURS').length}</span>
                        </div>
                        <div className="stat-card">
                            <span className="stat-label">Terminés</span>
                            <span className="stat-value">{changements.filter(c => c.statut?.code_statut === 'CLOTURE' || c.statut?.code_statut === 'IMPLEMENTE').length}</span>
                        </div>
                        <div className="stat-card urgent">
                            <span className="stat-label">En Échec</span>
                            <span className="stat-value">{changements.filter(c => c.statut?.code_statut === 'EN_ECHEC').length}</span>
                        </div>
                    </div>

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
                                                    <h4 className="expanded-title"><FiList /> Tâches assignées</h4>
                                                    {tasks.length === 0 ? (
                                                        <p className="no-tasks-msg">Aucune tâche planifiée pour l'instant.</p>
                                                    ) : (
                                                        <div className="tasks-inner-list">
                                                            {tasks.map(task => (
                                                                <div key={task.id_tache} className="inner-task-item">
                                                                    <div className="task-basic-info">
                                                                        <div className="task-header-row">
                                                                            <span className="inner-task-code">{task.code_tache}</span>
                                                                            <span className={`inner-task-status ${task.statut?.code_statut?.toLowerCase()}`}>
                                                                                {task.statut?.libelle}
                                                                            </span>
                                                                        </div>
                                                                        <h5 className="inner-task-title">{task.titre_tache}</h5>
                                                                        <div className="inner-task-meta">
                                                                            <span className="imp-name"><FiUser /> {task.implementeur?.nom_user || 'Non assigné'}</span>
                                                                        </div>
                                                                    </div>
                                                                    
                                                                    <div className="task-logs-preview">
                                                                        <h6><FiMessageSquare /> Dernier rapport :</h6>
                                                                        {task.journaux?.length > 0 ? (
                                                                            <p className="log-text">"{task.journaux[0].description}" - <span className="log-date">{new Date(task.journaux[0].date_entree).toLocaleDateString()}</span></p>
                                                                        ) : (
                                                                            <p className="no-log-text">Aucun journal soumis.</p>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="tracker-sidebar-summary">
                            <div className="summary-card">
                                <div className="summary-card-header">
                                    <FiTrendingUp /> Tendances Impl.
                                </div>
                                <div className="summary-card-body">
                                     <div className="mini-stat">
                                         <label>Tâches au total</label>
                                         <span>{changements.reduce((acc, c) => acc + (c._count?.taches || 0), 0)}</span>
                                     </div>
                                     <div className="mini-stat">
                                         <label>Implémenteurs Actifs</label>
                                         <span>{implementers.length}</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <div className="team-table-container">
                        <div className="team-panel-header">
                            <div>
                                <h2>Équipe Technique</h2>
                            </div>
                            <div className="team-filters-row">
                                <div className="filter-field">
                                    <label>Type de changement</label>
                                    <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                        <option value="">Tous les types</option>
                                        {typeOptions.map((type) => (
                                            <option key={type} value={type}>{type}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="filter-field">
                                    <label>Statut</label>
                                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                        <option value="">Tous les statuts</option>
                                        {statusOptions.map((status) => (
                                            <option key={status} value={status}>{status}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        {implementers.length === 0 ? (
                            <div className="empty-team">Aucun implémenteur trouvé en base de données.</div>
                        ) : (
                            <table className="team-table">
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Email</th>
                                        <th>Nombre de tâches</th>
                                        <th>Tâches urgentes</th>
                                        <th>Tâches terminées</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {implementers.map((imp) => {
                                        const stats = implementerStats[imp.id_user] || { total: 0, urgent: 0 };
                                        const completed = implementerTasks.filter(t => t.implementeur?.id_user === imp.id_user && (t.statut?.code_statut === 'TERMINEE' || t.statut?.code_statut === 'CLOTURE')).length;
                                        return (
                                            <tr key={imp.id_user}>
                                                <td><strong>{imp.prenom_user} {imp.nom_user}</strong></td>
                                                <td>{imp.email_user || '—'}</td>
                                                <td className="text-center"><span className="badge-count">{stats.total}</span></td>
                                                <td className="text-center"><span className="badge-urgent">{stats.urgent}</span></td>
                                                <td className="text-center"><span className="badge-completed">{completed}</span></td>
                                                <td>
                                                    <button type="button" className="btn-link" onClick={(e) => { e.stopPropagation(); fetchImplementerTasks(imp); }}>
                                                        Voir tâches
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
                        <div className="modal-backdrop-center" onClick={() => setShowTasksModal(false)}>
                            <div className="tasks-modal-content" onClick={(e) => e.stopPropagation()}>
                                <div className="modal-header-tasks">
                                    <div>
                                        <h2>{selectedImplementer.prenom_user} {selectedImplementer.nom_user}</h2>
                                        <p className="modal-subtitle">Tâches assignées - {implementerTasks.length} au total</p>
                                    </div>
                                    <button type="button" className="modal-close-button" onClick={() => setShowTasksModal(false)}>
                                        <FiX />
                                    </button>
                                </div>
                                <div className="modal-body-tasks">
                                    {loadingImplementerTasks ? (
                                        <div className="loading-box">Chargement des tâches...</div>
                                    ) : implementerTasks.length === 0 ? (
                                        <div className="empty-team">Aucune tâche assignée pour cet implémenteur.</div>
                                    ) : (
                                        <table className="tasks-modal-table">
                                            <thead>
                                                <tr>
                                                    <th>Code</th>
                                                    <th>Titre</th>
                                                    <th>Changement</th>
                                                    <th>Statut</th>
                                                    <th>Priorité</th>
                                                    <th>Réalisée</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {implementerTasks.map((task) => {
                                                    const isCompleted = task.statut?.code_statut === 'TERMINEE' || task.statut?.code_statut === 'CLOTURE';
                                                    return (
                                                        <tr key={task.id_tache}>
                                                            <td><strong>{task.code_tache || '—'}</strong></td>
                                                            <td>{task.titre_tache}</td>
                                                            <td>{task.changement?.code_changement || task.id_changement || '—'}</td>
                                                            <td><span className={`status-badge ${task.statut?.code_statut?.toLowerCase()}`}>{task.statut?.libelle || '—'}</span></td>
                                                            <td>{task.changement?.priorite || task.priorite || '—'}</td>
                                                            <td className="text-center">
                                                                {isCompleted ? (
                                                                    <span className="completed-badge"><FiCheck /> Oui</span>
                                                                ) : (
                                                                    <span className="pending-badge"><FiClock /> Non</span>
                                                                )}
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
                <div className="modal-overlay">
                    <div className="assign-task-modal">
                        <div className="modal-header">
                            <h2><FiPlus /> Nouvelle Tâche Technique</h2>
                            <button onClick={() => setShowAssignModal(false)}><FiX /></button>
                        </div>
                        <form onSubmit={handleAssignTask}>
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
                            <div className="modal-actions">
                                <button type="button" className="cancel-btn" onClick={() => setShowAssignModal(false)}>Annuler</button>
                                <button type="submit" className="confirm-btn" disabled={isAssigning}>
                                    {isAssigning ? 'Création...' : <><FiCheck /> Assigner la tâche</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImplementationTracker;
