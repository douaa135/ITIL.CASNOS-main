import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  FiActivity, FiCheckCircle, FiClock, FiAlertCircle, 
  FiMaximize2, FiMinimize2, FiUser, FiList, FiMessageSquare,
  FiPlus, FiX, FiCheck, FiTrendingUp, FiUsers, FiCheckSquare, FiXCircle, FiRefreshCw, FiDownload, FiAlertTriangle, FiSearch
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import html2pdf from 'html2pdf.js';
import { CHANGE_TRANSITIONS, CHANGE_STATUS_LABELS, TACHE_TRANSITIONS, TACHE_STATUS_LABELS } from '../../utils/constants';
import './ImplementationTracker.css';

const ImplementationTracker = () => {
    const [changements, setChangements] = useState([]);
    const location = useLocation();
    const [kpiFilter, setKpiFilter] = useState('');
    const [loading, setLoading] = useState(true);
    const [expandedRows, setExpandedRows] = useState({});
    const [tasksData, setTasksData] = useState({});
    const [selectedImplementer, setSelectedImplementer] = useState(null);
    const [implementerTasks, setImplementerTasks] = useState([]);
    const [loadingImplementerTasks, setLoadingImplementerTasks] = useState(false);
    const [impTaskSearch, setImpTaskSearch] = useState('');
    const [impTaskStatusFilter, setImpTaskStatusFilter] = useState('');
    const [impTaskTypeFilter, setImpTaskTypeFilter] = useState('');
    const [implementerStats, setImplementerStats] = useState({});
    const [deletedChangementIds, setDeletedChangementIds] = useState(
        () => JSON.parse(localStorage.getItem('deleted_changements') || '[]')
    );
    const [showTasksModal, setShowTasksModal] = useState(false);
    
    // New states for Assignment & Team Tracking
    const [implementers, setImplementers] = useState([]);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [selectedChange, setSelectedChange] = useState(null);
    const [isAssigning, setIsAssigning] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);
    const [activeTab, setActiveTab] = useState('tracking'); // 'tracking' or 'team'
    const [filterType, setFilterType] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [taskStatuses, setTaskStatuses] = useState([]);
    const [changeStatuses, setChangeStatuses] = useState([]);
    const [newTask, setNewTask] = useState({
        titre_tache: '',
        description: '',
        id_user: '',
        ordre_tache: 1,
        priorite: 'MOYENNE',
        date_debut_prevue: '',
        date_fin_prevue: ''
    });
    const [resultModal, setResultModal] = useState({ show: false, type: '', title: '' });
    const [actionConfirm, setActionConfirm] = useState({ show: false, type: '', taskId: null, changeId: null });

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            try {
                // 1. Récupération des données (Méthode robuste)
                const changesRes = await api.get('/changements?limit=1000').catch(() => ({ success: false, changements: [] }));
                const usersRes = await api.get('/users?limit=1000').catch(() => ({ success: false, data: [] }));
                const taskStatusRes = await api.get('/statuts?contexte=TACHE').catch(() => ({ success: false, data: [] }));
                const changeStatusRes = await api.get('/statuts?contexte=CHANGEMENT').catch(() => ({ success: false, data: [] }));

                // Extraction robuste des changements
                const allChangesRaw = changesRes?.changements || changesRes?.data?.changements || changesRes?.data || (Array.isArray(changesRes) ? changesRes : []);
                const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
                const allChanges = Array.isArray(allChangesRaw) ? allChangesRaw.filter(c => !deletedIds.includes(c.id_changement)) : [];
                setChangements(allChanges);

                // 2. Traiter les utilisateurs
                const allUsersRaw = usersRes?.data?.users || usersRes?.data?.data || usersRes?.data || usersRes?.users || (Array.isArray(usersRes) ? usersRes : []);
                const allUsers = Array.isArray(allUsersRaw) ? allUsersRaw : [];
                
                // (hasRole logic remains as is)
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
                    if (Array.isArray(u.userRoles)) {
                        u.userRoles.forEach(ur => {
                            if (ur?.role?.nom_role) roleList.push(ur.role.nom_role.toUpperCase());
                        });
                    }
                    const search = name.toUpperCase();
                    return roleList.some(r => r.includes(search) || (search === 'IMPLEMENTEUR' && (r.includes('IMPLEMENT') || r.includes('IMPLÉMENT'))));
                };

                let implementersList = allUsers.filter(u => hasRole(u, 'IMPLEMENTEUR'));
                if (implementersList.length === 0 && allUsers.length > 0) {
                    implementersList = allUsers.filter(u => u.actif !== false);
                }
                setImplementers(implementersList);

                // Extraction statuts
                const rawStatuts = taskStatusRes?.data?.statuts || taskStatusRes?.data || (Array.isArray(taskStatusRes) ? taskStatusRes : []);
                setTaskStatuses(Array.isArray(rawStatuts) ? rawStatuts : []);

                const rawChangeStatuts = changeStatusRes?.data?.statuts || changeStatusRes?.data || (Array.isArray(changeStatusRes) ? changeStatusRes : []);
                setChangeStatuses(Array.isArray(rawChangeStatuts) ? rawChangeStatuts : []);

                // 3. Récupérer les tâches pour chaque changement pour les KPIs
                const tasksMap = {};
                await Promise.all(allChanges.map(async (change) => {
                    try {
                        const res = await api.get(`/changements/${change.id_changement}/taches`);
                        const tasks = res?.taches || res?.data?.taches || res?.data || (Array.isArray(res) ? res : []);
                        tasksMap[change.id_changement] = Array.isArray(tasks) ? tasks : [];
                    } catch (e) {
                        tasksMap[change.id_changement] = [];
                    }
                }));
                setTasksData(tasksMap);

                // Derive stats for Équipe Technique
                const statsMap = {};
                implementersList.forEach(imp => {
                    const impTasks = [];
                    Object.entries(tasksMap).forEach(([changeId, tasks]) => {
                        const changeObj = allChanges.find(c => String(c.id_changement) === String(changeId));
                        tasks.forEach(t => {
                            if (t.id_user === imp.id_user || t.implementeur?.id_user === imp.id_user) {
                                impTasks.push({
                                    ...t,
                                    changement: changeObj
                                });
                            }
                        });
                    });
                    
                    statsMap[imp.id_user] = {
                        totalAll: impTasks.length,
                        total: impTasks.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'EN_ECHEC', 'ECHEC'].includes(t.statut?.code_statut || t.statut)).length,
                        urgent: impTasks.filter(t => {
                            const isPending = ['EN_ATTENTE', 'EN_COURS'].includes(t.statut?.code_statut || t.statut);
                            const changeType = (t.changement?.type || t.changement?.rfc?.typeRfc?.type || '').toUpperCase();
                            const isUrgentChange = changeType.includes('URGENT') || 
                                                 t.changement?.rfc?.urgence === true || 
                                                 t.changement?.rfc?.urgence === 1 || 
                                                 String(t.changement?.rfc?.urgence) === 'true';
                            return isPending && isUrgentChange;
                        }).length,
                        realized: impTasks.filter(t => ['TERMINEE', 'CLOTUREE', 'SUCCES', 'EN_COURS'].includes(t.statut?.code_statut || t.statut)).length,
                        completed: impTasks.filter(t => ['TERMINEE', 'CLOTUREE', 'SUCCES'].includes(t.statut?.code_statut || t.statut)).length,
                        failed: impTasks.filter(t => ['EN_ECHEC', 'ANNULEE', 'ECHEC'].includes(t.statut?.code_statut || t.statut)).length,
                    };
                });
                setImplementerStats(statsMap);

            } catch (error) {
                console.error('Tracker Init Error:', error);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    // Handle KPI filter from URL
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const kpi = params.get('kpi');
        if (kpi) setKpiFilter(kpi);
    }, [location]);

    const fetchImplementerTasks = (imp) => {
        setSelectedImplementer(imp);
        setShowTasksModal(true);
        setImpTaskSearch('');
        setImpTaskStatusFilter('');
        setImpTaskTypeFilter('');
        // Pull from tasksData — single source of truth already loaded at init
        const allTasksForUser = [];
        Object.entries(tasksData).forEach(([changeId, tasks]) => {
            // Find the parent changement to enrich each task
            const parentChange = changements.find(c => String(c.id_changement) === String(changeId));
            tasks.forEach(t => {
                if (t.id_user === imp.id_user || t.implementeur?.id_user === imp.id_user) {
                    allTasksForUser.push({
                        ...t,
                        changement: {
                            ...t.changement,
                            id_changement: parentChange?.id_changement || t.changement?.id_changement,
                            code_changement: parentChange?.code_changement || t.changement?.code_changement,
                            titre_plan: parentChange?.planChangement?.titre_plan || parentChange?.rfc?.titre_rfc || t.changement?.titre_plan,
                            planChangement: parentChange?.planChangement || t.changement?.planChangement,
                            rfc: parentChange?.rfc || t.changement?.rfc,
                            priorite: parentChange?.priorite || t.changement?.priorite,
                            type: parentChange?.rfc?.typeRfc?.type || parentChange?.type || t.changement?.type || 'Standard',
                        }
                    });
                }
            });
        });
        setImplementerTasks(allTasksForUser);
    };

    const closeTasksModal = () => {
        setShowTasksModal(false);
        setImpTaskSearch('');
        setImpTaskStatusFilter('');
        setImpTaskTypeFilter('');
    };

    const impTypeOptions = useMemo(() => {
        return Array.from(new Set(implementerTasks.map(t => t.changement?.type || t.changement?.rfc?.typeRfc?.type || 'Standard').filter(Boolean)));
    }, [implementerTasks]);

    const impStatusOptions = useMemo(() => {
        return Array.from(new Set(implementerTasks.map(t => t.statut?.code_statut || t.statut).filter(Boolean)));
    }, [implementerTasks]);

    const filteredImplementerTasks = useMemo(() => {
        return implementerTasks.filter(task => {
            // General search
            const q = impTaskSearch.toLowerCase();
            const changeTitle = task.changement?.titre_plan || task.changement?.planChangement?.titre_plan || task.changement?.rfc?.titre_rfc || 'Changement Standard';
            const changeCode = task.changement?.code_changement || '';
            const taskTitle = task.titre_tache || '';
            const taskCode = task.code_tache || '';
            
            const matchesSearch = !impTaskSearch || 
                taskTitle.toLowerCase().includes(q) ||
                taskCode.toLowerCase().includes(q) ||
                changeTitle.toLowerCase().includes(q) ||
                changeCode.toLowerCase().includes(q);

            // Status filter
            const statusCode = task.statut?.code_statut || task.statut;
            const matchesStatus = !impTaskStatusFilter || statusCode === impTaskStatusFilter;

            // Type filter
            const typeName = task.changement?.type || task.changement?.rfc?.typeRfc?.type || 'Standard';
            const matchesType = !impTaskTypeFilter || typeName.toUpperCase() === impTaskTypeFilter.toUpperCase();

            return matchesSearch && matchesStatus && matchesType;
        });
    }, [implementerTasks, impTaskSearch, impTaskStatusFilter, impTaskTypeFilter]);

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
                // Refresh tasks for this change
                const tasksRes = await api.get(`/changements/${selectedChange.id_changement}/taches`);
                const tasksList = tasksRes.data?.taches || tasksRes.data?.data || tasksRes.data || (Array.isArray(tasksRes) ? tasksRes : []);
                setTasksData(prev => ({ ...prev, [selectedChange.id_changement]: tasksList }));
                
                // Update local changement count
                setChangements(prev => prev.map(c => 
                    c.id_changement === selectedChange.id_changement 
                    ? { ...c, _count: { ...c._count, taches: (c._count?.taches || 0) + 1 } }
                    : c
                ));

                setShowAssignModal(false);
                setNewTask({ 
                    titre_tache: '', 
                    description: '', 
                    id_user: '', 
                    ordre_tache: 1, 
                    priorite: 'MOYENNE',
                    date_debut_prevue: '',
                    date_fin_prevue: ''
                });
                
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }
        } catch (error) {
            console.error('Assign Task Error:', error);
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
            
            // Sync status back to implementerTasks state if the modal is currently open and has these tasks
            setImplementerTasks(prev => 
                prev.map(t => {
                    const updatedTask = tasks.find(ut => String(ut.id_tache) === String(t.id_tache));
                    if (updatedTask) {
                        return {
                            ...t,
                            ...updatedTask,
                            changement: t.changement
                        };
                    }
                    return t;
                })
            );

            setTasksData(prev => {
                const updated = { ...prev, [idChangement]: tasks };
                // Recalculate implementerStats from the updated map
                setImplementerStats(prevStats => {
                    const newStats = { ...prevStats };
                    Object.keys(newStats).forEach(userId => {
                        const impTasks = Object.values(updated).flat().filter(
                            t => t.id_user == userId || t.implementeur?.id_user == userId
                        );
                        newStats[userId] = {
                            total: impTasks.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(t.statut?.code_statut || t.statut)).length,
                            urgent: impTasks.filter(t => {
                                const isPending = ['EN_ATTENTE', 'EN_COURS'].includes(t.statut?.code_statut);
                                const rfcPrio = t.changement?.rfc?.priorite?.code_priorite || '';
                                const typeCh = (t.changement?.rfc?.typeRfc?.type || t.changement?.type || '').toUpperCase();
                                const isUrgent = rfcPrio === 'HAUTE' || rfcPrio === 'CRITIQUE' || t.priorite === 'HAUTE' || t.priorite === 'CRITIQUE' || typeCh === 'URGENT' || t.changement?.rfc?.urgence === true;
                                return isPending && isUrgent;
                            }).length,
                            completed: impTasks.filter(t => ['TERMINEE', 'CLOTUREE', 'SUCCES'].includes(t.statut?.code_statut || t.statut)).length,
                            failed: impTasks.filter(t => ['EN_ECHEC', 'ANNULEE', 'ECHEC'].includes(t.statut?.code_statut || t.statut)).length,
                        };
                    });
                    return newStats;
                });
                return updated;
            });
        } catch (error) {
            console.error('Fetch Tasks Error:', error);
        }
    };

    const handleTaskStatusUpdate = async (taskId, newStatusId, idChangement) => {
        try {
            await api.patch(`/taches/${taskId}/statut`, { id_statut: newStatusId });
            
            // Check if status is EN_COURS for success message
            const statusObj = taskStatuses.find(s => s.id_statut == newStatusId);
            if (statusObj && statusObj.code_statut === 'EN_COURS') {
                setShowSuccessToast(true);
                setTimeout(() => setShowSuccessToast(false), 3000);
            }

            await fetchTasks(idChangement);
        } catch (error) {
            console.error('Erreur statut tâche', error);
            alert('Erreur lors du changement de statut de la tâche.');
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
            percent = change.statut?.code_statut === 'CLOTUREE' || change.statut?.code_statut === 'IMPLEMENTE' ? 100 : 0;
        }

        return {
            percent,
            label: `${percent}%`
        };
    };

    const getProgressColor = (status, percent) => {
        if (percent === 100) return '#10b981'; // green
        switch(status) {
            case 'CLOTUREE': case 'IMPLEMENTE': return '#10b981';
            case 'EN_COURS': return '#3b82f6';
            case 'EN_ECHEC': return '#ef4444';
            default: return '#64748b';
        }
    };

    const typeOptions = Array.from(new Set(changements.map(change => change.rfc?.typeRfc?.type || change.type || 'Standard')));
    const statusOptions = Array.from(new Set(changements.map(change => change.statut?.code_statut))).filter(Boolean);
    
    const filteredChangements = useMemo(() => {
        return changements.filter((change) => {
            const typeName = (change.rfc?.typeRfc?.type || change.type || 'Standard').toUpperCase();
            const prioRfc = (change.rfc?.priorite?.code_priorite || change.rfc?.priorite?.libelle || '').toUpperCase();
            const prioChg = (change.priorite || '').toUpperCase();
            const isUrgent = typeName.includes('URGENT') || 
                             change.rfc?.urgence === true || change.rfc?.urgence === 1 || String(change.rfc?.urgence) === 'true';

            const tasks = tasksData[change.id_changement] || [];
            const hasUrgentTask = tasks.some(t => {
                const s = t.statut;
                const statusCodeTask = (typeof s === 'object' && s !== null) ? (s.code_statut || s.libelle) : s;
                const isPending = statusCodeTask === 'EN_ATTENTE';
                const rfcPrio = (change.rfc?.priorite?.code_priorite || change.rfc?.priorite?.libelle || '').toUpperCase();
                const rfcType = (change.rfc?.typeRfc?.type || change.rfc?.type || '').toUpperCase();
                const taskPrio = (t.priorite || '').toUpperCase();
                const chgPrio = (change.priorite || '').toUpperCase();
                
                const isUrgentRfc = ['URGENCE', 'URGENT'].includes(rfcType) || 
                                   change.rfc?.urgence === true || change.rfc?.urgence === 1 || change.rfc?.urgence === 'true';
                
                const isUrgentTask = false; // Priority doesn't make a change urgent in this filter
                
                return isPending && (isUrgentRfc || isUrgentTask);
            });

            // Search match
            const q = searchTerm.toLowerCase();
            const matchesSearch = !searchTerm || 
                (change.code_changement || '').toLowerCase().includes(q) ||
                (change.rfc?.titre_rfc || '').toLowerCase().includes(q);

            // Filter match
            const matchesType = !filterType || typeName.includes(filterType.toUpperCase());
            const statusCode = change.statut?.code_statut || change.statut;
            const matchesStatus = !filterStatus || statusCode === filterStatus;
            
            // KPI match
            if (kpiFilter === 'URGENT') {
                return (isUrgent || hasUrgentTask) && matchesSearch && matchesType && matchesStatus && !['CLOTUREE', 'CLOTURE', 'IMPLEMENTE', 'TERMINEE', 'REUSSI', 'ECHEC', 'ANNULEE', 'REJETEE'].includes(change.statut?.code_statut);
            }
            if (kpiFilter === 'EN_COURS') {
                return change.statut?.code_statut === 'EN_COURS' && matchesSearch && matchesType && matchesStatus;
            }
            if (kpiFilter === 'EN_ATTENTE') {
                return change.statut?.code_statut === 'EN_ATTENTE' && matchesSearch && matchesType && matchesStatus;
            }
            if (kpiFilter === 'TERMINEE') {
                return ['TERMINEE', 'CLOTUREE', 'IMPLEMENTE', 'REUSSI'].includes(change.statut?.code_statut) && matchesSearch && matchesType && matchesStatus;
            }
            if (kpiFilter === 'ROLLBACK') {
                const isRollback = ['ROLLBACK', 'EN_ECHEC', 'ANNULEE'].includes(statusCode) || 
                                   tasks.some(t => ['ANNULEE', 'EN_ECHEC'].includes(t.statut?.code_statut || t.statut));
                return isRollback && matchesSearch && matchesType && matchesStatus;
            }

            return matchesType && matchesStatus && matchesSearch;
        });
    }, [changements, filterType, filterStatus, searchTerm, kpiFilter]);

    const getReportHtml = (task, type, title) => {
        const isSuccess = type === 'SUCCESS';
        const themeColor = isSuccess ? '#059669' : '#dc2626';
        const statusLabel = isSuccess ? 'SUCCÈS' : 'INCIDENT';
        const description = task?.journaux?.map(j => `[${new Date(j.date_entree).toLocaleString()}] ${j.titre_journal || ''}\n${j.description}`).join('\n\n') || task?.description || "Aucun contenu disponible.";

        return `
          <div id="report-to-capture" style="font-family:'Segoe UI',Tahoma,sans-serif;padding:20mm;color:#1e293b;line-height:1.6;background:white;width:210mm;min-height:297mm;margin:auto;box-sizing:border-box;border:1px solid #eee;">
            <div style="border-bottom:3px solid ${themeColor};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end;">
              <div>
                <div style="display:flex;align-items:center;gap:15px;">
                  <h1 style="color:${themeColor};margin:0;font-size:28px;">${title || "Rapport d'exécution"}</h1>
                  <span style="background:${themeColor};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;">${statusLabel}</span>
                </div>
                <div style="font-size:14px;color:#64748b;margin-top:5px;">Document Officiel ITIL - CASNOS</div>
              </div>
              <div style="font-size:14px;color:#64748b;text-align:right;">Généré le: ${new Date().toLocaleString()}</div>
            </div>
            <div style="margin-bottom:25px;">
              <div style="font-weight:bold;color:${themeColor};text-transform:uppercase;font-size:12px;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:5px;">Informations Générales</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
                <div><strong style="color:#64748b;">Code Rapport:</strong> DOC-AUTO</div>
                <div><strong style="color:#64748b;">Type:</strong> Journal</div>
                <div><strong style="color:#64748b;">Référence:</strong> ${task?.code_tache || 'N/A'}</div>
                <div><strong style="color:#64748b;">Date d'Entrée:</strong> ${new Date().toLocaleDateString()}</div>
                <div style="margin-top:10px;"><strong style="color:#64748b;">Implémenteur Responsable:</strong> ${task?.implementeur?.nom_user || task?.changeManager?.nom_user || 'Non assigné'}</div>
                <div style="margin-top:10px;"><strong style="color:#64748b;">Statut Final:</strong> ${task?.statut?.libelle_statut || task?.statut?.code_statut || 'Non défini'}</div>
              </div>
            </div>
            <div style="margin-bottom:25px;">
              <div style="font-weight:bold;color:${themeColor};text-transform:uppercase;font-size:12px;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:5px;">Contenu du Rapport</div>
              <div style="white-space:pre-wrap;background:#ffffff;padding:25px;border-radius:8px;border:1px solid #e2e8f0;min-height:400px;color:#334155;font-size:15px;">
                ${description}
              </div>
            </div>
          </div>
        `;
    };

    const handleDownloadPDF = () => {
        const task = resultModal.task;
        if (!task) return;
        const htmlContent = getReportHtml(task, resultModal.type, resultModal.title);
        
        const s1 = document.createElement('script');
        s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        s1.onload = () => {
          const s2 = document.createElement('script');
          s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          s2.onload = () => {
            const container = document.createElement('div');
            container.style.cssText = 'position:absolute;top:0;left:-2000px;width:210mm;';
            container.innerHTML = htmlContent;
            document.body.appendChild(container);
            setTimeout(() => {
              window.html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF('p', 'mm', 'a4');
                const w = pdf.internal.pageSize.getWidth();
                const h = (canvas.height * w) / canvas.width;
                pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
                pdf.save(`Rapport_Implementation_${task?.code_tache || 'DOC'}.pdf`);
                document.body.removeChild(container);
              }).catch(err => { console.error(err); document.body.removeChild(container); });
            }, 1000);
          };
          document.head.appendChild(s2);
        };
        document.head.appendChild(s1);
    };

    // Removed early return for loading so the page renders immediately

    return (
        <div className="tracker-page">
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                        <FiActivity />
                    </div>
                    <div className="premium-header-text">
                        <h1>Suivi de l'Implémentation</h1>
                        <p>
                            Surveillez en temps réel l'avancement technique et les tâches des implémenteurs de change manager
                        </p>
                    </div>
                </div>
                <div className="premium-header-actions" style={{ display: 'flex', gap: '0.75rem' }}>
                    <button className="btn-create-premium" onClick={() => window.location.reload()} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <FiRefreshCw /> Actualiser
                    </button>
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

                {showSuccessToast && (
                    <div className="success-toast-message">
                        <FiCheckCircle /> Démarrer la tâche avec succès
                    </div>
                )}
            </div>

            {/* Task Statuses State (Local simulation or fetch if needed) */}
            {/* For simplicity in this view, we'll use a hardcoded or derived list if not fetched */}

            {activeTab === 'tracking' ? (
                <>
                    <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '0.5rem' }}>
                        <div className={`stat-card blue clickable ${kpiFilter === 'EN_COURS' ? 'active' : ''}`} 
                             onClick={() => setKpiFilter(kpiFilter === 'EN_COURS' ? '' : 'EN_COURS')}
                             style={{ borderLeft: '3px solid #3b82f6', cursor: 'pointer' }}>
                            <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb' }}><FiActivity size={24} /></div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: '#2563eb' }}>{changements.filter(c => (c.statut?.code_statut || c.statut) === 'EN_COURS').length}</div>
                                <div className="stat-label">En cours</div>
                            </div>
                        </div>
                        <div className={`stat-card amber clickable ${kpiFilter === 'EN_ATTENTE' ? 'active' : ''}`}
                             onClick={() => setKpiFilter(kpiFilter === 'EN_ATTENTE' ? '' : 'EN_ATTENTE')}
                             style={{ borderLeft: '3px solid #f59e0b', cursor: 'pointer' }}>
                            <div className="stat-icon-wrapper" style={{ background: '#fffbeb', color: '#d97706' }}><FiClock size={24} /></div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: '#d97706' }}>{changements.filter(c => (c.statut?.code_statut || c.statut) === 'EN_ATTENTE').length}</div>
                                <div className="stat-label">En Attente</div>
                            </div>
                        </div>
                        <div className={`stat-card red clickable ${kpiFilter === 'URGENT' ? 'active' : ''}`}
                             onClick={() => setKpiFilter(kpiFilter === 'URGENT' ? '' : 'URGENT')}
                             style={{ borderLeft: '3px solid #ef4444', cursor: 'pointer' }}>
                            <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiAlertTriangle size={24} /></div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: '#dc2626' }}>
                                    {changements.filter(change => {
                                        const typeName = (change.rfc?.typeRfc?.type || change.type || 'Standard').toUpperCase();
                                        const prioRfc = (change.rfc?.priorite?.code_priorite || change.rfc?.priorite?.libelle || '').toUpperCase();
                                        const prioChg = (change.priorite || '').toUpperCase();
                                        const isUrgent = typeName.includes('URGENT') || 
                                                         prioRfc.includes('URGENT') || prioRfc.includes('CRITIQUE') || prioRfc.includes('HAUTE') || prioRfc.includes('P0') || prioRfc.includes('P1') ||
                                                         prioChg.includes('URGENT') || prioChg.includes('CRITIQUE') || prioChg.includes('HAUTE') ||
                                                         change.rfc?.urgence === true || change.rfc?.urgence === 1 || change.rfc?.urgence === 'true';

                                        const tasks = tasksData[change.id_changement] || [];
                                        const hasUrgentTask = tasks.some(t => {
                                            const s = t.statut;
                                            const statusCodeTask = (typeof s === 'object' && s !== null) ? (s.code_statut || s.libelle) : s;
                                            const isPending = statusCodeTask === 'EN_ATTENTE';
                                            const rfc = t.changement?.rfc || change.rfc;
                                            const rfcPrioT = (rfc?.priorite?.code_priorite || rfc?.id_priorite || '').toUpperCase();
                                            const rfcTypeT = (rfc?.typeRfc?.type || rfc?.type || '').toUpperCase();
                                            const taskPrioT = (t.priorite || '').toUpperCase();
                                            const chgPrioT = (change.priorite || '').toUpperCase();
                                            
                                            const isUrgentRfcT = ['URGENCE', 'URGENT'].includes(rfcTypeT) || 
                                                               rfc?.urgence === true || rfc?.urgence === 1 || String(rfc?.urgence) === 'true';
                                            
                                            const isUrgentTaskT = false; // Priority doesn't make a change urgent here
                                            
                                            return isPending && (isUrgentRfcT || isUrgentTaskT);
                                        });

                                        return (isUrgent || hasUrgentTask) && !['CLOTUREE', 'CLOTURE', 'IMPLEMENTE', 'TERMINEE', 'REUSSI', 'ECHEC', 'ANNULEE', 'REJETEE'].includes(change.statut?.code_statut || change.statut);
                                    }).length}
                                </div>
                                <div className="stat-label">Urgent</div>
                            </div>
                        </div>
                        <div className={`stat-card green clickable ${kpiFilter === 'TERMINEE' ? 'active' : ''}`}
                             onClick={() => setKpiFilter(kpiFilter === 'TERMINEE' ? '' : 'TERMINEE')}
                             style={{ borderLeft: '3px solid #10b981', cursor: 'pointer' }}>
                            <div className="stat-icon-wrapper" style={{ background: '#ecfdf5', color: '#059669' }}><FiCheckCircle size={24} /></div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: '#059669' }}>{changements.filter(c => ['TERMINEE', 'CLOTUREE', 'IMPLEMENTE', 'REUSSI'].includes(c.statut?.code_statut || c.statut)).length}</div>
                                <div className="stat-label">Terminé</div>
                            </div>
                        </div>
                        <div className={`stat-card red clickable ${kpiFilter === 'ROLLBACK' ? 'active' : ''}`}
                             onClick={() => setKpiFilter(kpiFilter === 'ROLLBACK' ? '' : 'ROLLBACK')}
                             style={{ borderLeft: '3px solid #ef4444', cursor: 'pointer' }}>
                            <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiRefreshCw size={24} /></div>
                            <div className="stat-info">
                                <div className="stat-value" style={{ color: '#dc2626' }}>
                                    {changements.filter(c => {
                                        const cStatus = c.statut?.code_statut || c.statut;
                                        const hasRollbackTask = (tasksData[c.id_changement] || []).some(
                                            t => ['ANNULEE', 'EN_ECHEC'].includes(t.statut?.code_statut || t.statut)
                                        );
                                        return ['ROLLBACK', 'EN_ECHEC', 'ANNULEE'].includes(cStatus) || hasRollbackTask;
                                    }).length}
                                </div>
                                <div className="stat-label">Rollback</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
                            <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            <input 
                                type="text" 
                                placeholder="Rechercher par code changement ou titre RFC..." 
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', outline: 'none' }}
                            />
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem', minWidth: '160px' }}
                            >
                                <option value="">Tous les types</option>
                                {typeOptions.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem', minWidth: '160px' }}
                            >
                                <option value="">Tous les statuts</option>
                                {statusOptions.map((status) => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                            {kpiFilter === 'URGENT' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fef2f2', color: '#dc2626', borderRadius: '12px', border: '1px solid #fee2e2', fontWeight: 700, fontSize: '0.9rem' }}>
                                    <FiAlertTriangle /> Mode: Urgents
                                    <button onClick={() => setKpiFilter('')} className="reset-filters-btn-cab" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px', padding: '3px 8px', fontSize: '0.75rem' }}><FiRefreshCw size={10} /> Réinitialiser</button>
                                </div>
                            )}
                            {(searchTerm || filterType || filterStatus || kpiFilter) && (
                                <button 
                                    onClick={() => { setSearchTerm(''); setFilterType(''); setFilterStatus(''); setKpiFilter(''); }}
                                    className="reset-filters-btn-cab"
                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                                    title="Réinitialiser"
                                >
                                    <FiRefreshCw size={14} />
                                    Réinitialiser
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="tracker-layout-container">
                        <div className="tracker-main-content">
                            <div className="tracker-list">
                                {loading && filteredChangements.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        Chargement en cours...
                                    </div>
                                ) : filteredChangements.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        Aucun changement à suivre pour le moment.
                                    </div>
                                ) : filteredChangements.map(change => {
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
                                                    <div className="progress-header" style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span className="progress-label" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Progression des tâches</span>
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
                                                        <FiActivity /> {tasks.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(t.statut?.code_statut || t.statut)).length} tâches actives
                                                    </div>
                                                </div>

                                                <div className="tracker-status-col">
                                                    <span className={`status-badge ${change.statut?.code_statut?.toLowerCase() || 'default'}`}>
                                                         {CHANGE_STATUS_LABELS[change.statut?.code_statut] || change.statut?.libelle || 'N/A'}
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
                                                                        <th>Titre</th>
                                                                        <th>Code</th>
                                         <th style={{ width: '220px' }}>Statut & Actions</th>
                                                                        <th>Implémenteur</th>
                                                                        <th>Rapport / Historique</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {tasks.map(task => {
                                                                        const statusCode = task.statut?.code_statut || task.statut;
                                                                        const isSuccess = statusCode === 'TERMINEE' || statusCode === 'CLOTUREE';
                                                                        const isFailed = statusCode === 'ANNULEE' || statusCode === 'EN_ECHEC';
                                                                        
                                                                        return (
                                                                            <tr key={task.id_tache} className="task-row-premium">
                                                                                <td className="mini-title" style={{ fontWeight: 800, color: '#000000' }}>{task.titre_tache}</td>
                                                                                <td className="mini-code" style={{ color: '#3b82f6', fontWeight: 600 }}>{task.code_tache}</td>
                                                                                <td>
                                                                                    <div className="status-actions-combined">
                                                                                        <span className={`status-pill-solid ${statusCode?.toLowerCase()}`}>
                                                                                            {task.statut?.libelle || statusCode}
                                                                                        </span>
                                                                                        <div className="task-actions-group">
                                                                                            {statusCode === 'EN_ATTENTE' && (
                                                                                                <button className="btn-action-sm start" title="Démarrer" onClick={() => setActionConfirm({ show: true, type: 'START', taskId: task.id_tache, changeId: change.id_changement })}>
                                                                                                    <FiActivity />
                                                                                                </button>
                                                                                            )}
                                                                                            {statusCode === 'EN_COURS' && (
                                                                                                <>
                                                                                                    <button className="btn-action-sm confirm" title="Confirmer" onClick={() => setActionConfirm({ show: true, type: 'CONFIRM', taskId: task.id_tache, changeId: change.id_changement })}>
                                                                                                        <FiCheckCircle />
                                                                                                    </button>
                                                                                                    <button className="btn-action-sm reject" title="Rejeter" onClick={() => setActionConfirm({ show: true, type: 'REJECT', taskId: task.id_tache, changeId: change.id_changement })}>
                                                                                                        <FiXCircle />
                                                                                                    </button>
                                                                                                </>
                                                                                            )}
                                                                                        </div>
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    <div className="imp-info-cell">
                                                                                        {task.implementeur ? `${task.implementeur.prenom_user} ${task.implementeur.nom_user}` : 'Non assigné'}
                                                                                    </div>
                                                                                </td>
                                                                                <td>
                                                                                    {isSuccess ? (
                                                                                        <button className="result-btn success" onClick={() => setResultModal({ show: true, type: 'SUCCESS', title: 'Rapport de Succès de l\'Implémentation', task: task })}>
                                                                                            <FiCheck /> Rapport
                                                                                        </button>
                                                                                    ) : isFailed ? (
                                                                                        <button className="result-btn rollback" onClick={() => setResultModal({ show: true, type: 'ROLLBACK', title: 'Rapport d\'Incident / Échec (Rollback Déclenché)', task: task })}>
                                                                                            <FiRefreshCw /> Rollback
                                                                                        </button>
                                                                                    ) : (
                                                                                        <span className="no-result">—</span>
                                                                                    )}
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
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

                        <div className="tracker-sidebar-summary">
                            <div className="summary-card">
                                <div className="summary-card-header">
                                    <FiTrendingUp /> Tendances Impl.
                                </div>
                                <div className="summary-card-body">
                                     <div className="mini-stat">
                                         <label>Tâches actives au total</label>
                                         <span>{Object.values(tasksData).flat().filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(t.statut?.code_statut || t.statut)).length}</span>
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
                        <div className="team-panel-header" style={{ marginBottom: '1.5rem' }}>
                            <h2 style={{ margin: 0 }}>Équipe Technique</h2>
                        </div>
                        {implementers.length === 0 ? (
                            <div className="empty-team">Aucun implémenteur trouvé en base de données.</div>
                        ) : (
                            <table className="team-table">
                                <thead>
                                    <tr>
                                        <th>Nom</th>
                                        <th>Email</th>
                                        <th>Total Tâches</th>
                                        <th>Tâches Actives</th>
                                        <th>Tâches Urgentes</th>
                                        <th>Tâches Réalisées</th>
                                        <th>Tâches Succès</th>
                                        <th>Tâches Échec</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {implementers.map((imp) => {
                                        const stats = implementerStats[imp.id_user] || { totalAll: 0, total: 0, urgent: 0, completed: 0, failed: 0, realized: 0 };
                                        return (
                                            <tr key={imp.id_user}>
                                                <td><strong>{imp.prenom_user} {imp.nom_user}</strong></td>
                                                <td>{imp.email_user || '—'}</td>
                                                <td className="text-center"><span style={{background:'#f0f9ff', color:'#0369a1', padding:'4px 10px', borderRadius:'20px', fontWeight:700, fontSize:'0.85rem'}}>{stats.totalAll || 0}</span></td>
                                                <td className="text-center"><span className="badge-count">{stats.total}</span></td>
                                                <td className="text-center"><span className="badge-urgent">{stats.urgent}</span></td>
                                                <td className="text-center"><span style={{background:'#eff6ff', color:'#1d4ed8', padding:'4px 10px', borderRadius:'20px', fontWeight:700, fontSize:'0.85rem'}}>{stats.realized || 0}</span></td>
                                                <td className="text-center"><span className="badge-completed">{stats.completed}</span></td>
                                                <td className="text-center"><span style={{background:'#fef2f2', color:'#ef4444', padding:'4px 10px', borderRadius:'20px', fontWeight:700, fontSize:'0.85rem'}}>{stats.failed || 0}</span></td>
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
                        <div className="modal-backdrop-center" onClick={closeTasksModal}>
                            <div className="tasks-modal-content" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={(e) => e.stopPropagation()}>
                                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiUser /></div>
                                    <div className="rfc-style-header-text">
                                        <h2 style={{ color: '#ffffff' }}>{selectedImplementer.prenom_user} {selectedImplementer.nom_user}</h2>
                                        <p className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Tâches assignées - {implementerTasks.length} au total</p>
                                    </div>
                                    <button type="button" className="close-btn-rfc-style" onClick={closeTasksModal} style={{ color: '#ffffff' }}>
                                        <FiX size={24} />
                                    </button>
                                </div>
                                <div className="modal-body-tasks">
                                    {loadingImplementerTasks ? (
                                        <div className="loading-box">Chargement des tâches...</div>
                                    ) : implementerTasks.length === 0 ? (
                                        <div className="empty-team">Aucune tâche assignée pour cet implémenteur.</div>
                                    ) : (
                                        <>
                                            {/* Filters Bar */}
                                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                                                <div style={{ position: 'relative', flex: 1, minWidth: '250px' }}>
                                                    <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#bae6fd' }} />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Rechercher par tâche, code ou changement..." 
                                                        value={impTaskSearch}
                                                        onChange={e => setImpTaskSearch(e.target.value)}
                                                        style={{ 
                                                            width: '100%', 
                                                            padding: '0.65rem 1rem 0.65rem 2.5rem', 
                                                            borderRadius: '10px', 
                                                            border: '1.5px solid #bae6fd', 
                                                            background: '#fff', 
                                                            fontSize: '0.9rem', 
                                                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)', 
                                                            outline: 'none',
                                                            color: '#0f172a'
                                                        }}
                                                    />
                                                </div>
                                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                                    <select
                                                        value={impTaskTypeFilter}
                                                        onChange={(e) => setImpTaskTypeFilter(e.target.value)}
                                                        style={{ 
                                                            padding: '0.65rem 1rem', 
                                                            borderRadius: '10px', 
                                                            border: impTaskTypeFilter.toUpperCase() === 'URGENT' ? '1.5px solid #ef4444' : '1.5px solid #bae6fd', 
                                                            background: '#fff', 
                                                            color: impTaskTypeFilter.toUpperCase() === 'URGENT' ? '#ef4444' : '#1e293b', 
                                                            fontWeight: '600', 
                                                            fontSize: '0.85rem', 
                                                            minWidth: '150px',
                                                            outline: 'none'
                                                        }}
                                                    >
                                                        <option value="">Tous les types</option>
                                                        <option value="STANDARD">Standard</option>
                                                        <option value="NORMAL">Normal</option>
                                                        <option value="URGENT" style={{ color: '#ef4444', fontWeight: '700' }}>Urgent</option>
                                                    </select>
                                                    <select
                                                        value={impTaskStatusFilter}
                                                        onChange={(e) => setImpTaskStatusFilter(e.target.value)}
                                                        style={{ 
                                                            padding: '0.65rem 1rem', 
                                                            borderRadius: '10px', 
                                                            border: '1.5px solid #bae6fd', 
                                                            background: '#fff', 
                                                            color: '#1e293b', 
                                                            fontWeight: '600', 
                                                            fontSize: '0.85rem', 
                                                            minWidth: '150px' 
                                                        }}
                                                    >
                                                        <option value="">Tous les statuts</option>
                                                        {impStatusOptions.map((status) => (
                                                            <option key={status} value={status}>
                                                                {TACHE_STATUS_LABELS[status] || status}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {(impTaskSearch || impTaskStatusFilter || impTaskTypeFilter) && (
                                                        <button 
                                                            onClick={() => { setImpTaskSearch(''); setImpTaskStatusFilter(''); setImpTaskTypeFilter(''); }}
                                                            style={{ 
                                                                display: 'inline-flex', 
                                                                alignItems: 'center', 
                                                                gap: '6px', 
                                                                padding: '0.65rem 1rem', 
                                                                borderRadius: '10px', 
                                                                background: '#e0f2fe', 
                                                                border: '1px solid #bae6fd', 
                                                                color: '#0369a1', 
                                                                fontWeight: 600, 
                                                                fontSize: '0.85rem', 
                                                                cursor: 'pointer' 
                                                            }}
                                                            title="Réinitialiser"
                                                        >
                                                            <FiRefreshCw size={12} />
                                                            Réinitialiser
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {filteredImplementerTasks.length === 0 ? (
                                                <div className="empty-team" style={{ padding: '2rem 1rem' }}>
                                                    Aucune tâche ne correspond aux critères de recherche.
                                                </div>
                                            ) : (
                                                <table className="tasks-modal-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Titre</th>
                                                            <th>Code</th>
                                                            <th>Changement & Code</th>
                                                            <th>Type</th>
                                                            <th>Statut</th>
                                                            <th>Priorité</th>
                                                            <th>Réalisée</th>
                                                            <th>Rapport / Historique</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                         {filteredImplementerTasks.map((task) => {
                                                            const isCompleted = ['TERMINEE', 'CLOTUREE'].includes(task.statut?.code_statut || task.statut);
                                                            const statusCode = task.statut?.code_statut || task.statut;
                                                            const isSuccess = statusCode === 'TERMINEE' || statusCode === 'CLOTUREE';
                                                            const isFailed = statusCode === 'ANNULEE' || statusCode === 'EN_ECHEC';
                                                            return (
                                                                <tr key={task.id_tache} className="dynamic-row">
                                                                    <td><div className="task-title-cell" style={{ fontWeight: 800, color: '#000000' }}>{task.titre_tache}</div></td>
                                                                    <td><strong className="task-code-premium" style={{ color: '#3b82f6', border: '1px solid #bfdbfe', background: '#eff6ff' }}>{task.code_tache || '—'}</strong></td>
                                                                    <td>
                                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>
                                                                                {task.changement?.titre_plan || task.changement?.planChangement?.titre_plan || task.changement?.rfc?.titre_rfc || 'Changement Standard'}
                                                                            </span>
                                                                            <span className="change-ref-badge" style={{ alignSelf: 'flex-start', color: '#3b82f6' }}>
                                                                                {task.changement?.code_changement || '—'}
                                                                            </span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        {(() => {
                                                                            const typeText = task.changement?.type || task.changement?.rfc?.typeRfc?.type || 'Standard';
                                                                            const isUrgent = String(typeText).toUpperCase() === 'URGENT';
                                                                            return (
                                                                                <span className="type-badge-premium" style={{ 
                                                                                    fontWeight: 700, 
                                                                                    fontSize: '0.8rem', 
                                                                                    textTransform: 'uppercase', 
                                                                                    color: isUrgent ? '#ef4444' : '#0369a1', 
                                                                                    background: isUrgent ? '#fef2f2' : '#e0f2fe', 
                                                                                    padding: '4px 10px', 
                                                                                    borderRadius: '12px', 
                                                                                    border: isUrgent ? '1px solid #fecaca' : '1px solid #bae6fd',
                                                                                    display: 'inline-block'
                                                                                }}>
                                                                                    {typeText}
                                                                                </span>
                                                                            );
                                                                        })()}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`status-badge ${task.statut?.code_statut?.toLowerCase() || 'default'}`}>
                                                                            {TACHE_STATUS_LABELS[task.statut?.code_statut] || task.statut?.libelle || 'N/A'}
                                                                        </span>
                                                                    </td>
                                                                    <td>
                                                                        <span className={`prio-pill ${task.changement?.priorite?.toLowerCase() || 'p3'}`}>
                                                                            {task.changement?.priorite || task.priorite || 'P3'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="text-center">
                                                                        <div 
                                                                            className={`realisee-toggle ${isCompleted ? 'checked' : ''}`}
                                                                            onClick={() => {
                                                                                const termId = taskStatuses.find(s => s.code_statut === 'TERMINEE')?.id_statut;
                                                                                const attId = taskStatuses.find(s => s.code_statut === 'EN_ATTENTE')?.id_statut;
                                                                                if (termId && attId) {
                                                                                    handleTaskStatusUpdate(task.id_tache, isCompleted ? attId : termId, task.id_changement);
                                                                                }
                                                                            }}
                                                                        >
                                                                            {isCompleted ? <FiCheckCircle style={{color: '#10b981'}} /> : <FiClock style={{color: '#94a3b8'}} />}
                                                                            <span>{isCompleted ? 'Oui' : 'Non'}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td>
                                                                        {isSuccess ? (
                                                                            <button className="result-btn success" onClick={() => setResultModal({ show: true, type: 'SUCCESS', title: 'Rapport de Succès de l\'Implémentation', task: task })}>
                                                                                <FiCheck /> Rapport
                                                                            </button>
                                                                        ) : isFailed ? (
                                                                            <button className="result-btn rollback" onClick={() => setResultModal({ show: true, type: 'ROLLBACK', title: 'Rapport d\'Incident / Échec (Rollback Déclenché)', task: task })}>
                                                                                <FiRefreshCw /> Rollback
                                                                            </button>
                                                                        ) : (
                                                                            <span className="no-result">—</span>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {showAssignModal && (
                <div className="modal-overlay">
                    <div className="modal-box-cab glass-card-cab tm-modal-medium" style={{ maxWidth: '600px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                            <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                                <FiPlus size={24} />
                            </div>
                            <div className="rfc-style-header-text">
                                <h2 className="tm-title" style={{ color: '#ffffff' }}>Nouvelle Tâche Technique</h2>
                                <div className="rfc-style-subtitle tm-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>#{selectedChange?.code_changement} — Planification Technique</div>
                            </div>
                            <button className="close-btn-rfc-style" onClick={() => setShowAssignModal(false)} style={{ color: '#ffffff' }}><FiX size={24} /></button>
                        </div>

                        <div className="modal-body-rfc-style">
                            <form onSubmit={handleAssignTask}>
                                <div className="tm-form-grid">
                                    <div className="form-group-cab tm-col-span-2" style={{ marginBottom: '1rem' }}>
                                        <label>Titre de la Tâche <span className="tm-required">*</span></label>
                                        <input 
                                            required 
                                            className="premium-input-style"
                                            value={newTask.titre_tache} 
                                            onChange={e => setNewTask({...newTask, titre_tache: e.target.value})}
                                            placeholder="Ex: Migration de la DB..."
                                        />
                                    </div>

                                    <div className="form-group-cab tm-col-span-2" style={{ marginBottom: '1rem' }}>
                                        <label>Description & Instructions</label>
                                        <textarea 
                                            className="premium-input-style"
                                            style={{ minHeight: '80px' }}
                                            value={newTask.description} 
                                            onChange={e => setNewTask({...newTask, description: e.target.value})}
                                            placeholder="Détails techniques pour l'implémenteur..."
                                        />
                                    </div>

                                    <div className="form-group-cab">
                                        <label>Priorité <span className="tm-required">*</span></label>
                                        <select 
                                            required
                                            className="premium-input-style"
                                            value={newTask.priorite}
                                            onChange={e => setNewTask({...newTask, priorite: e.target.value})}
                                        >
                                            <option value="BASSE">Basse</option>
                                            <option value="MOYENNE">Moyenne</option>
                                            <option value="HAUTE">Haute</option>
                                            <option value="CRITIQUE">Critique</option>
                                        </select>
                                    </div>

                                    <div className="form-group-cab">
                                        <label>Implémenteur <span className="tm-required">*</span></label>
                                        <select 
                                            required
                                            className="premium-input-style"
                                            value={newTask.id_user}
                                            onChange={e => setNewTask({...newTask, id_user: e.target.value})}
                                        >
                                            <option value="">Sélectionner un profil...</option>
                                            {implementers.map(imp => (
                                                <option key={imp.id_user} value={imp.id_user}>
                                                     {imp.prenom_user} {imp.nom_user}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group-cab">
                                        <label>Début prévu</label>
                                        <input 
                                            type="datetime-local" 
                                            className="premium-input-style"
                                            value={newTask.date_debut_prevue}
                                            onChange={e => setNewTask({...newTask, date_debut_prevue: e.target.value})}
                                        />
                                    </div>

                                    <div className="form-group-cab">
                                        <label>Fin prévue</label>
                                        <input 
                                            type="datetime-local" 
                                            className="premium-input-style"
                                            value={newTask.date_fin_prevue}
                                            onChange={e => setNewTask({...newTask, date_fin_prevue: e.target.value})}
                                        />
                                    </div>

                                    <div className="form-group-cab">
                                        <label>Ordre d'exécution</label>
                                        <input 
                                            type="number" 
                                            min="1" 
                                            className="premium-input-style"
                                            value={newTask.ordre_tache}
                                            onChange={e => setNewTask({...newTask, ordre_tache: parseInt(e.target.value)})}
                                        />
                                    </div>
                                </div>

                                <div className="modal-footer-rfc-style">
                                    <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowAssignModal(false)}>Annuler</button>
                                    <button type="submit" className="btn-submit-rfc-style" disabled={isAssigning} style={{ gap: '0.5rem' }}>
                                        {isAssigning ? 'Création...' : <><FiPlus size={18} /> Créer la tâche</>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Action Confirmation Modal */}
            {actionConfirm.show && (
                <div className="modal-overlay" style={{ zIndex: 11000 }}>
                    <div className="assign-task-modal" style={{ maxWidth: '450px', textAlign: 'center' }}>
                        <div className="modal-header">
                            <h2>{actionConfirm.type === 'START' ? 'Démarrer la tâche' : actionConfirm.type === 'CONFIRM' ? 'Confirmer exécution' : 'Rejeter exécution'}</h2>
                            <button onClick={() => setActionConfirm({ show: false, type: '', taskId: null })}><FiX /></button>
                        </div>
                        <div style={{ margin: '1.5rem 0', color: '#64748b' }}>
                            {actionConfirm.type === 'START' ? 'Voulez-vous vraiment démarrer cette tâche technique ?' : 
                             actionConfirm.type === 'CONFIRM' ? 'Confirmez-vous que la tâche a été exécutée avec succès ?' : 
                             'Voulez-vous rejeter l\'exécution de cette tâche ? Cela pourrait déclencher un rollback.'}
                        </div>
                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setActionConfirm({ show: false, type: '', taskId: null })}>Annuler</button>
                            <button 
                                className={`confirm-btn ${actionConfirm.type === 'REJECT' ? 'red' : ''}`}
                                onClick={() => {
                                    const statusMap = {
                                        'START': 'EN_COURS',
                                        'CONFIRM': 'TERMINEE',
                                        'REJECT': 'ANNULEE'
                                    };
                                    const statusId = taskStatuses.find(s => s.code_statut === statusMap[actionConfirm.type])?.id_statut;
                                    if (statusId) {
                                        handleTaskStatusUpdate(actionConfirm.taskId, statusId, actionConfirm.changeId);
                                    }
                                    setActionConfirm({ show: false, type: '', taskId: null });
                                }}
                            >
                                Confirmer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Result Modal */}
            {resultModal.show && (
                <div className="modal-backdrop" onClick={() => setResultModal({ show: false, type: '', title: '' })} style={{ zIndex: 11000 }}>
                    <div className="modal-box" style={{ maxWidth: '700px', padding: 0 }} onClick={e => e.stopPropagation()}>
                        <div className="modal-top" style={{ background: resultModal.type === 'SUCCESS' ? 'linear-gradient(135deg, #16a34a, #15803d)' : 'linear-gradient(135deg, #dc2626, #b91c1c)', color: 'white', padding: '1rem 1.5rem', borderTopLeftRadius: '16px', borderTopRightRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                {resultModal.type === 'SUCCESS' ? <FiCheckCircle size={24} color="#bbf7d0" /> : <FiAlertCircle size={24} color="#fecaca" />}
                                <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>{resultModal.title}</h2>
                            </div>
                            <button onClick={() => setResultModal({ show: false, type: '', title: '' })} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={24} /></button>
                        </div>

                        <div className="modal-body" style={{ padding: '2rem', background: '#f8fafc', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }} id="report-content-to-print">
                            {/* Task info box */}
                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Informations de la Tâche</div>
                                <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.25rem' }}>{resultModal.task?.titre_tache}</div>
                                <div style={{ fontSize: '0.85rem', color: '#3b82f6', fontWeight: '600' }}>#{resultModal.task?.code_tache}</div>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#475569', display: 'flex', gap: '1rem' }}>
                                    <span><strong>Implémenteur :</strong> {resultModal.task?.implementeur?.prenom_user} {resultModal.task?.implementeur?.nom_user}</span>
                                    <span><strong>Statut :</strong> {resultModal.task?.statut?.libelle || resultModal.task?.statut}</span>
                                </div>
                            </div>

                            {/* Historique block */}
                            <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                    <FiClock /> Historique & Journaux d'Exécution
                                </div>
                                <div style={{ 
                                    background: '#f1f5f9', 
                                    borderRadius: '8px', 
                                    padding: '1rem', 
                                    fontSize: '0.9rem', 
                                    color: '#334155', 
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    border: '1px solid #e2e8f0',
                                    lineHeight: '1.5'
                                }}>
                                {resultModal.task?.journaux && resultModal.task.journaux.length > 0 ? (
                                    <div className="timeline-tracker">
                                        {resultModal.task.journaux.map((log, idx) => (
                                            <div key={idx} style={{ marginBottom: '1.25rem', borderLeft: '3px solid #3b82f6', paddingLeft: '1.25rem', position: 'relative' }}>
                                                <div style={{ position: 'absolute', left: '-6.5px', top: '0', width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%', border: '2px solid white' }}></div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem' }}>
                                                    <strong>{log.titre_journal || 'Mise à jour d\'implémentation'}</strong>
                                                    <span style={{ fontSize: '0.75rem', background: '#e2e8f0', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{new Date(log.date_entree).toLocaleString('fr-DZ')}</span>
                                                </div>
                                                <div style={{ fontSize: '0.95rem', color: '#1e293b', background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                                    {log.description}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: '#94a3b8' }}>
                                        <p style={{ fontStyle: 'italic', margin: 0 }}>Aucun journal d'exécution n'a été saisi par l'implémenteur pour cette tâche.</p>
                                    </div>
                                )}
                                </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' }}>
                                <button 
                                    onClick={() => setResultModal({ show: false, type: '', title: '' })}
                                    style={{ padding: '0.6rem 1.5rem', background: 'white', border: '1px solid #cbd5e1', borderRadius: '8px', color: '#475569', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    Fermer
                                </button>
                                <button onClick={handleDownloadPDF} style={{ padding: '0.6rem 1.5rem', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <FiDownload size={18} /> Télécharger le rapport (PDF)
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ImplementationTracker;