import React, { useState, useEffect } from 'react';
import changeService from '../../services/changeService';
import dashboardService from '../../services/dashboardService';
import { 
    FiRefreshCw, FiTrendingUp, FiActivity, FiXCircle, 
    FiSearch, FiFilter, FiEye, FiClock, FiCheckCircle, FiFileText, FiX, FiInfo, FiEdit3, FiShield, FiPlus, FiTrash2, FiEdit, FiUser, FiCalendar
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import rfcService from '../../services/rfcService';
// Machine à états synchronisée avec le backend
const CHANGE_TRANSITIONS = {
    EN_PLANIFICATION: ['EN_COURS', 'EN_ATTENTE', 'CLOTURE'],
    EN_ATTENTE:       ['EN_COURS', 'CLOTURE'],
    EN_COURS:         ['IMPLEMENTE', 'EN_ECHEC', 'CLOTURE'],
    IMPLEMENTE:       ['TESTE',      'EN_ECHEC'],
    TESTE:            ['CLOTURE'],
    EN_ECHEC:         ['EN_PLANIFICATION', 'CLOTURE'],
    CLOTURE:          [],
};

const TASK_TRANSITIONS = {
    EN_ATTENTE: ['EN_COURS', 'ANNULEE'],
    EN_COURS:   ['TERMINEE', 'ANNULEE'],
    TERMINEE:   [],
    ANNULEE:    [],
};
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import '../changemanager/RfcManagement.css';
import './AdminChangementList.css';

const AdminChangementList = () => {
    const [changements, setChangements] = useState([]);
    const [kpi, setKpi] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState('');
    const [filterEnv, setFilterEnv] = useState('');
    const [environments, setEnvironments] = useState([]);
    const [changeManagers, setChangeManagers] = useState([]);
    const [demandeurs, setDemandeurs] = useState([]);
    const [implementeurs, setImplementeurs] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [saving, setSaving] = useState(false);

    const [showCreateChange, setShowCreateChange] = useState(false);
    const [createForm, setCreateForm] = useState({
        titre: '',
        description: '',
        priorite: 'BASSE',
        date_debut_prevue: '',
        date_fin_prevue: '',
        id_env: '',
        id_manager: ''
    });

    const [selectedChangement, setSelectedChangement] = useState(null);
    const [showProcess, setShowProcess] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportForm, setReportForm] = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
    const [editMode, setEditMode] = useState(false);
    const [changeStatuses, setChangeStatuses] = useState([]);
    const [taskStatuses, setTaskStatuses] = useState([]);
    const [newStatutId, setNewStatutId] = useState('');
    const [editForm, setEditForm] = useState({
        titre: '',
        description: '',
        priorite: '',
        date_debut: '',
        date_fin: '',
        environnement: '',
        id_manager: ''
    });
    const [confirmDel, setConfirmDel] = useState(null);
    const [toast, setToast] = useState(null);
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [tasksToShow, setTasksToShow] = useState([]);
    const [showNewTaskForm, setShowNewTaskForm] = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({
        titre_tache: '',
        description: '',
        priorite: 'MOYENNE',
        id_user: '',
        id_statut: '',
        date_debut_prevue: '',
        date_fin_prevue: ''
    });

    const handleOpenProcess = (c) => {
        setSelectedChangement(c);
        setNewStatutId(c.statut?.id_statut || '');
        setShowProcess(true);
    };

    const closeModals = () => {
        setShowProcess(false);
        setSelectedChangement(null);
        setShowReportForm(false);
        setEditMode(false);
        setShowCreateChange(false);
        setShowTasksModal(false);
        setShowNewTaskForm(false);
    };

    const handleShowTasks = async (changement) => {
        try {
            setSelectedChangement(changement);
            const tasks = await changeService.getTasksByChange(changement.id_changement);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            setShowTasksModal(true);
        } catch (err) {
            setToast({ msg: 'Erreur lors du chargement des tâches.', type: 'error' });
            console.error(err);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!selectedChangement) return;
        setSaving(true);
        try {
            if (!newTaskForm.titre_tache) throw new Error("Le titre est obligatoire.");
            if (!newTaskForm.id_user) throw new Error("Veuillez sélectionner un utilisateur.");

            // Le backend Prisma initialise id_statut à EN_ATTENTE automatiquement via le service.
            // On envoie le strict minimum pour éviter les erreurs de validation middleware.
            const payload = {
                titre_tache: newTaskForm.titre_tache.trim(),
                description: newTaskForm.description || '',
                id_user: newTaskForm.id_user,
                ordre_tache: Number(tasksToShow.length + 1)
            };

            await changeService.createTache(selectedChangement.id_changement, payload);
            setToast({ msg: 'Tâche créée avec succès !', type: 'success' });
            const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            setShowNewTaskForm(false);
            setNewTaskForm({ titre_tache: '', description: '', priorite: 'MOYENNE', id_user: '', id_statut: '', date_debut_prevue: '', date_fin_prevue: '' });
            
            // Refresh changes list to update task count
            const updated = await changeService.getAllChangements();
            setChangements(updated);
        } catch (err) {
            console.error(err);
            setToast({ msg: 'Erreur lors de la création de la tâche.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTask = (idTache) => {
        setConfirmDel({
            title: 'Supprimer la tâche',
            message: 'Êtes-vous sûr de vouloir supprimer cette tâche ? Cette action est irréversible.',
            id: idTache,
            isTask: true
        });
    };

    const handleUpdateTaskStatus = async (idTache, idStatut) => {
        try {
            await changeService.updateTacheStatut(idTache, idStatut);
            if (selectedChangement) {
                const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
                setTasksToShow(Array.isArray(tasks) ? tasks : []);
            }
            setToast({ msg: 'Statut de la tâche mis à jour.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ msg: 'Erreur lors de la mise à jour du statut de la tâche.', type: 'error' });
        }
    };

    const handleDeleteChangement = (id) => {
        setConfirmDel({
            title: 'Supprimer le changement',
            message: 'Êtes-vous sûr de vouloir supprimer ce changement ? Cette action est irréversible.',
            id,
            isTask: false
        });
    };

    const confirmDelete = async () => {
        if (!confirmDel) return;
        const { id, isTask } = confirmDel;
        setSaving(true);
        try {
            if (isTask) {
                await changeService.deleteTache(id);
                setToast({ msg: 'Tâche supprimée avec succès !', type: 'error' });
                setTasksToShow(prev => prev.filter(t => t.id_tache !== id));
            } else {
                await changeService.deleteChangement(id);
                setChangements(prev => prev.filter(c => c.id_changement !== id));
                setToast({ msg: 'Changement supprimé avec succès !', type: 'error' });
            }
            // Update counts/list
            const updated = await changeService.getAllChangements();
            setChangements(updated);
        } catch (err) {
            console.error('Delete error:', err);
            setToast({ msg: err?.response?.data?.message || err.message || 'Impossible de supprimer.', type: 'error' });
        } finally {
            setSaving(false);
            setConfirmDel(null);
        }
    };

    const handleOpenEditDirectly = (c) => {
        console.log("Ouverture du mode édition pour:", c?.code_changement);
        setSelectedChangement(c);
        setNewStatutId(c.statut?.id_statut || '');
        
        const formatDateTimeLocal = (isoString) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

        setEditForm({
            titre: c.rfc?.titre_rfc || c.planChangement?.titre_plan || '',
            description: c.planChangement?.etapes_plan || c.rfc?.description || '',
            priorite: c.rfc?.urgence ? 'HAUTE' : (c.priorite || 'BASSE'),
            date_debut: formatDateTimeLocal(c.date_debut),
            date_fin: formatDateTimeLocal(c.date_fin_prevu),
            environnement: c.environnement?.id_env || c.id_env || '',
            id_manager: c.implementeur?.id_user || c.id_user || ''
        });
        
        setEditMode(true);
        setShowProcess(true);
    };

    const handleEditChangement = () => {
        if (!selectedChangement) return;
        handleOpenEditDirectly(selectedChangement);
    };

    const handleSaveEdit = async () => {
        if (!selectedChangement) return;
        setSaving(true);
        try {
            // Appel au backend obligatoire
            await changeService.updateChangement(selectedChangement.id_changement, {
                date_debut: editForm.date_debut || null,
                date_fin_prevue: editForm.date_fin || null,
                id_env: editForm.environnement || undefined,
                id_user: editForm.id_manager || undefined,
                priorite: editForm.priorite,
                plan_changement: {
                    titre_plan: editForm.titre || 'Changement Standard',
                    etapes_plan: editForm.description || ''
                }
            });

            if (newStatutId && String(newStatutId) !== String(selectedChangement.statut?.id_statut)) {
                await changeService.updateChangementStatus(selectedChangement.id_changement, newStatutId);
            }

            // Recharger les données pour être sûr d'avoir la version backend
            const updatedChangements = await changeService.getAllChangements();
            setChangements(updatedChangements);
            
            setEditMode(false);
            setShowProcess(false);
            setToast({ msg: 'Changement modifié avec succès !', type: 'success' });
        } catch (error) {
            console.error("Erreur critique modification:", error);
            setToast({ msg: error.message || "Erreur lors de la sauvegarde.", type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleCreateChangement = async (e) => {
        e.preventDefault();
        if (!createForm.id_env) {
            setToast({ msg: 'Veuillez sélectionner un environnement.', type: 'error' });
            return;
        }
        setSaving(true);
        try {
            // Créer le changement de base
            const newChangement = await changeService.createChangement({
                id_env: createForm.id_env,
                date_debut: createForm.date_debut_prevue || null,
                date_fin_prevu: createForm.date_fin_prevue || null,
            });

            if (!newChangement?.id_changement) {
                throw new Error('Changement créé mais impossible de mettre à jour le plan.');
            }

            // Créer le plan de changement avec le titre
            await changeService.updateChangement(newChangement.id_changement, {
                plan_changement: {
                    titre_plan: createForm.titre || 'Changement Standard',
                    etapes_plan: createForm.description || '',
                },
            });

            // Recharger tout et afficher immédiatement le nouveau changement
            const updated = await changeService.getAllChangements();
            setChangements(updated);
            
            setToast({ msg: 'Changement créé avec succès !', type: 'success' });
            setShowCreateChange(false);
            setCreateForm({ titre: '', description: '', priorite: 'BASSE', date_debut_prevue: '', date_fin_prevue: '', id_env: '', id_manager: '' });
        } catch (err) {
            console.error('Create error:', err);
            setToast({ msg: err.message || 'Erreur lors de la création du changement.', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const handleChangeStatut = async () => {
        if (!newStatutId || newStatutId === selectedChangement?.statut?.id_statut) return;
        try {
            await changeService.updateChangementStatus(selectedChangement.id_changement, newStatutId);
            setToast({ msg: 'Statut mis à jour avec succès !', type: 'success' });
            const updatedChangements = await changeService.getAllChangements();
            setChangements(updatedChangements);
            const updated = updatedChangements.find(c => c.id_changement === selectedChangement.id_changement);
            if (updated) setSelectedChangement(updated);
        } catch (err) {
            setToast({ msg: err?.response?.data?.message || 'Erreur lors du changement de statut.', type: 'error' });
        }
    };

    const handleCreateReport = async () => {
        if (!selectedChangement?.id_rfc) return setToast({ msg: "Ce changement n'est pas lié à une RFC, création de rapport impossible.", type: 'error' });
        if (!reportForm.titre_rapport || !reportForm.contenu_rapport) return setToast({ msg: "Le titre et le contenu sont obligatoires.", type: 'error' });
        try {
            await api.post(`/changement/${selectedChangement.id_changement}/rapports`, reportForm);
            setToast({ msg: 'Rapport généré et enregistré avec succès !', type: 'success' });
            setShowReportForm(false);
            setReportForm({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
        } catch (e) {
            setToast({ msg: 'Erreur lors de la génération du rapport.', type: 'error' });
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                // On utilise skipRedirect pour éviter que le 401 ne nous éjecte de la page
                const config = { skipRedirect: true };
                
                const [kpiRes, changesData, statusesRes, envsRes, taskStatRes, prioritiesRes] = await Promise.all([
                    dashboardService.getKpiChangements().catch(() => null),
                    changeService.getAllChangements().catch(() => []),
                    api.get('/statuts?contexte=CHANGEMENT').catch(() => null),
                    api.get('/environnements').catch(() => null),
                    api.get('/statuts?contexte=TACHE').catch(() => null),
                    api.get('/priorites').catch(() => null)
                ]);
                
                const kpiData = kpiRes?.data || kpiRes || null;
                if (kpiData) {
                    setKpi(kpiData);
                } else {
                    setKpi({ total: 0, en_cours: 0, taux_reussite: '0%', echecs: 0 });
                }

                setChangements(Array.isArray(changesData) ? changesData : []);

                const statusesData = statusesRes?.data?.statuts || statusesRes?.data || statusesRes || [];
                setChangeStatuses(Array.isArray(statusesData) ? statusesData : []);
                
                const envsData = envsRes?.data?.environnements || envsRes?.data || envsRes || [];
                setEnvironments(Array.isArray(envsData) ? envsData : []);

                const taskStatusesData = taskStatRes?.data?.statuts || taskStatRes?.data || taskStatRes || [];
                setTaskStatuses(Array.isArray(taskStatusesData) ? taskStatusesData : []);

                const prioritiesData = prioritiesRes?.data?.priorites || prioritiesRes?.data || prioritiesRes || [];
                setPriorities(Array.isArray(prioritiesData) ? prioritiesData : []);

                // Fetch Change Managers for Change Responsable
                const cmRes = await api.get('/users?nom_role=CHANGE_MANAGER').catch(() => null);
                const cmData = cmRes?.data?.data || cmRes?.data || [];
                setChangeManagers(Array.isArray(cmData) ? cmData : []);

                // Fetch Implementeurs for Tasks
                const [impRes, demRes] = await Promise.all([
                    api.get('/users?nom_role=IMPLEMENTEUR').catch(() => null),
                    api.get('/users?nom_role=DEMANDEUR').catch(() => null)
                ]);
                const impData = impRes?.data?.data || impRes?.data || [];
                setImplementeurs(Array.isArray(impData) ? impData : []);

                const demData = demRes?.data?.data || demRes?.data || [];
                setDemandeurs(Array.isArray(demData) ? demData : []);

            } catch (err) {
                console.warn("Utilisation du mode secours (Front-only) pour la Gestion de Changement");
                setChangements([
                    { id_changement: 1, code_changement: 'CHG-Mock', titre: 'Mode Simulation Actif', statut: { libelle: 'En cours', code_statut: 'EN_COURS' }, environnement: { nom_env: 'Local' }, date_debut: new Date().toISOString() }
                ]);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const getStatusColor = (code) => {
        const s = (code || '').toUpperCase();
        if (s.includes('REUSSI') || s.includes('TERMINE') || s.includes('APPROUV') || s.includes('IMPLEMENTE') || s.includes('TESTE') || s === 'CLOTURE') return 'success';
        if (s.includes('REJET') || s.includes('ECHEC') || s.includes('ANNULE') || s.includes('ECHEC')) return 'danger';
        if (s.includes('PLANIF') || s.includes('COURS') || s.includes('ATTENTE') || s.includes('SOUMIS')) return 'warning';
        if (s.includes('EVALU')) return 'primary';
        return 'default';
    };

    const getStatusIcon = (statut) => {
        const s = (statut || '').toUpperCase();
        if (s.includes('REUSSI') || s.includes('TERMINE')) return <FiCheckCircle />;
        if (s.includes('ECHEC') || s.includes('ANNULE')) return <FiXCircle />;
        if (s.includes('COURS') || s.includes('PLANIFI')) return <FiActivity />;
        return <FiClock />;
    };

    // Extract unique values for filters
    const uniqueStatuts = Array.isArray(changeStatuses) ? [...changeStatuses].sort((a, b) => {
        const order = ['SOUMIS', 'PLANIFIE', 'EN_COURS', 'TERMINE', 'REUSSI', 'ECHEC', 'ANNULE'];
        const idxA = order.indexOf(a?.code_statut);
        const idxB = order.indexOf(b?.code_statut);
        return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    }) : [];
    const uniqueTypes = ['STANDARD', 'NORMAL', 'URGENCE'];

    const [filterType, setFilterType] = useState('');
    const [kpiStatutFilter, setKpiStatutFilter] = useState('');

    const filteredChangements = Array.isArray(changements) ? changements.filter(c => {
        if (!c) return false;
        const matchesSearch = (c.code_changement?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '') ||
                              (c.titre?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '') ||
                              (c.rfc?.titre_rfc?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '') ||
                              (c.environnement?.nom_env?.toLowerCase() || '').includes(searchTerm?.toLowerCase() || '');
        const activeStatut = kpiStatutFilter || filterStatut;
        const matchesStatut = activeStatut ? c.statut?.code_statut === activeStatut : true;
        const matchesEnv = filterEnv ? c.environnement?.nom_env === filterEnv : true;
        const matchesType = filterType ? (c.rfc?.typeRfc?.type || 'STANDARD').toUpperCase() === filterType : true;
        
        return matchesSearch && matchesStatut && matchesEnv && matchesType;
    }) : [];
    const getKpiCardClass = (code) => {
        if (!code) return `acl-kpi-card${kpiStatutFilter === '' && !filterStatut ? ' is-selected is-total' : ''}`;
        return `acl-kpi-card${kpiStatutFilter === code ? ' is-selected is-' + code.toLowerCase().replace('_', '-') : ''}`;
    };
    const getRowClass = (index) => `acl-row hover-row ${index % 2 === 0 ? 'even' : 'odd'}`;

    return (
        <div className="rfc-mgr-page">
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiRefreshCw /></div>
                    <div className="premium-header-text">
                        <h1>Gestion des Changements</h1>
                        <p>Configurez le flux des changements et supervisez l'état global du système ITIL ·</p>
                    </div>
                </div>
                <div className="premium-header-actions">
                    <button 
                        onClick={() => setShowCreateChange(true)} 
                        className="btn-create-premium"
                    >
                        <FiPlus /> Nouveau Changement
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            {kpi && (
                <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
                    <div className={`stat-card blue ${kpiStatutFilter === '' ? 'selected-active' : ''}`} onClick={() => { setKpiStatutFilter(''); setFilterStatut(''); }} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon-wrapper"><FiRefreshCw size={24} /></div>
                        <div className="stat-info">
                            <div className="stat-value">{kpi.total}</div>
                            <div className="stat-label">Total Changements</div>
                        </div>
                    </div>
                    <div className={`stat-card purple ${kpiStatutFilter === 'EN_COURS' ? 'selected-active' : ''}`} onClick={() => setKpiStatutFilter(k => k === 'EN_COURS' ? '' : 'EN_COURS')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon-wrapper"><FiActivity size={24} /></div>
                        <div className="stat-info">
                            <div className="stat-value">{kpi.en_cours}</div>
                            <div className="stat-label">En cours</div>
                        </div>
                    </div>
                    <div className={`stat-card green ${kpiStatutFilter === 'IMPLEMENTE' ? 'selected-active' : ''}`} onClick={() => setKpiStatutFilter(k => k === 'IMPLEMENTE' ? '' : 'IMPLEMENTE')} style={{ cursor: 'pointer' }}>
                        <div className="stat-icon-wrapper"><FiTrendingUp size={24} /></div>
                        <div className="stat-info">
                            <div className="stat-value">{kpi.taux_reussite}</div>
                            <div className="stat-label">Taux de Réussite</div>
                        </div>
                    </div>
                    <div className={`stat-card red ${kpiStatutFilter === 'EN_ECHEC' ? 'selected-active' : ''}`} onClick={() => setKpiStatutFilter(k => k === 'EN_ECHEC' ? '' : 'EN_ECHEC')} style={{ cursor: 'pointer', borderLeft: '3px solid #ef4444' }}>
                        <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiXCircle size={24} /></div>
                        <div className="stat-info">
                            <div className="stat-value">{kpi.echecs}</div>
                            <div className="stat-label">Échecs</div>
                        </div>
                    </div>
                </div>
            )}

            {/* TOOLBAR FILTERS */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
                    <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                    <input 
                        type="text" 
                        placeholder="Rechercher par code, titre..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{
                            width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
                            borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            fontSize: '0.9rem', boxSizing: 'border-box',
                            transition: 'border-color 0.2s',
                        }}
                    />
                </div>
                <div className="acl-filter-row">
                    <select 
                        value={filterStatut} 
                        onChange={e => { setFilterStatut(e.target.value); setKpiStatutFilter(''); }}
                        style={{
                            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
                            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
                            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
                        }}
                    >
                        <option value="">Tous les statuts</option>
                        {uniqueStatuts?.map(s => (
                            <option key={s?.id_statut || Math.random()} value={s?.code_statut}>{s?.libelle || 'Inconnu'}</option>
                        ))}
                    </select>
                    <select 
                        value={filterType} 
                        onChange={e => setFilterType(e.target.value)}
                        style={{
                            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
                            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
                            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
                        }}
                    >
                        <option value="">Tous les types</option>
                        {uniqueTypes?.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                    <select 
                        value={filterEnv} 
                        onChange={e => setFilterEnv(e.target.value)}
                        style={{
                            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
                            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
                            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
                        }}
                    >
                        <option value="">Environnements</option>
                        {environments?.map(env => (
                            <option key={env?.id_env || Math.random()} value={env?.nom_env}>{env?.nom_env}</option>
                        ))}
                    </select>
                    {(searchTerm || filterStatut || filterType || filterEnv || kpiStatutFilter) && (
                        <button
                            onClick={() => { setSearchTerm(''); setFilterStatut(''); setFilterType(''); setFilterEnv(''); setKpiStatutFilter(''); }}
                            style={{
                            padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
                            fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', 
                            cursor: 'pointer', fontWeight: '600'
                        }}
                        >
                            Réinitialiser
                        </button>
                    )}
                </div>
            </div>

            {/* Table Section (Mirroring User Management Table) */}
            <Card style={{ padding: '0', overflow: 'hidden' }}>
                <div className="table-scroll-container" style={{ overflowX: 'auto', width: '100%' }}>
                    <table className="acl-table" style={{ minWidth: '1000px' }}>
                        <thead>
                            <tr className="acl-head-row">
                                <th className="acl-th">Changement & Code</th>
                                <th className="acl-th">Demandeur</th>
                                <th className="acl-th">Responsable</th>
                                <th className="acl-th">Priorité</th>
                                <th className="acl-th">Score de Changement</th>
                                <th className="acl-th">Environnement</th>
                                <th className="acl-th">Statut</th>
                                <th className="acl-th">Tâches</th>
                                <th className="acl-th acl-th-right" style={{ width: '80px', whiteSpace: 'nowrap' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="acl-empty-cell loading">Chargement...</td>
                                </tr>
                            ) : filteredChangements.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="acl-empty-cell">
                                        <FiFileText size={40} className="acl-empty-icon" />
                                        Aucun changement trouvé.
                                    </td>
                                </tr>
                            ) : filteredChangements.map((c, index) => (
                                <tr key={c.id_changement} onClick={() => handleOpenProcess(c)} className={`acl-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                                    <td className="acl-td">
                                        <div className="acl-title" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }} title={c.rfc?.titre_rfc || c.planChangement?.titre_plan || 'Changement Standard'}>
                                            {c.rfc?.titre_rfc || c.planChangement?.titre_plan || 'Changement Standard'}
                                        </div>
                                        <div className="acl-code">#{c.code_changement}</div>
                                    </td>
                                    <td className="acl-td">
                                        <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
                                            {c.rfc ? `${c.rfc.demandeur?.prenom_user || ''} ${c.rfc.demandeur?.nom_user || ''}` : `${c.changeManager?.prenom_user || '—'} ${c.changeManager?.nom_user || ''}`}
                                        </div>
                                    </td>
                                    <td className="acl-td">
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div className="acl-manager-avatar" style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>
                                                {(c.changeManager?.prenom_user?.[0] || '—').toUpperCase()}
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                                                {`${c.changeManager?.prenom_user || '—'} ${c.changeManager?.nom_user || ''}`.trim() || 'Non assigné'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="acl-td">
                                        {(() => {
                                            const prio = c.priorite || (c.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : (c.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE'));
                                            const colors = {
                                                'CRITIQUE': { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' },
                                                'HAUTE':    { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' },
                                                'MOYENNE':  { bg: '#fefce8', color: '#ca8a04', border: '#fef9c3' },
                                                'BASSE':    { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' },
                                            };
                                            const style = colors[prio] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                                            return (
                                                <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '700', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
                                                    {prio}
                                                </span>
                                            );
                                        })()}
                                    </td>
                                    <td className="acl-td">
                                        <Badge variant={c.rfc?.evaluationRisque?.score_risque > 15 ? 'danger' : c.rfc?.evaluationRisque?.score_risque > 8 ? 'warning' : 'success'}>
                                            {c.rfc?.evaluationRisque?.score_risque || '—'}
                                        </Badge>
                                    </td>
                                    <td className="acl-td">
                                        <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                                            {c.environnement?.nom_env || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="acl-td" onClick={(e) => e.stopPropagation()}>
                                        <InlineEditableBadge
                                            currentValue={changeStatuses.find(s => s.code_statut === c.statut?.code_statut)?.id_statut || c.statut?.id_statut || ''}
                                            label={c.statut?.libelle || 'N/A'}
                                            currentCode={c.statut?.code_statut}
                                            options={uniqueStatuts.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                                            allowedCodes={CHANGE_TRANSITIONS[c.statut?.code_statut] || []}
                                            getVariant={(val) => {
                                                const s = uniqueStatuts.find(st => st.id_statut == val);
                                                return s ? getStatusColor(s.code_statut) : 'default';
                                            }}
                                            onUpdate={async (newId) => {
                                                try {
                                                    await changeService.updateChangementStatus(c.id_changement, newId, '');
                                                    const updated = await changeService.getAllChangements();
                                                    setChangements(updated);
                                                } catch(err) {
                                                    const msg = err?.response?.data?.message || err?.message || 'Erreur lors du changement de statut.';
                                                    setToast({ msg: msg, type: 'error' });
                                                }
                                            }}
                                            isEditable={!['CLOTURE'].includes(c.statut?.code_statut)}
                                            dropdownPosition='down'
                                        />
                                    </td>
                                    <td className="acl-td" onClick={(e) => { e.stopPropagation(); handleShowTasks(c); }} style={{ cursor: 'pointer' }}>
                                        <Badge variant="default" style={{ textDecoration: 'underline', color: '#3b82f6' }}>
                                            {(c._count?.taches || c.taches?.length || 0)} tâche(s)
                                        </Badge>
                                    </td>
                                    <td className="acl-td">
                                        {c.date_debut ? new Date(c.date_debut).toLocaleDateString() : '—'}
                                    </td>
                                    <td className="acl-td" style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenEditDirectly(c); }} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Modifier">
                                                <FiEdit size={16} />
                                            </button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteChangement(c.id_changement); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Supprimer">
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

            {/* Confirm Delete Modal */}
            {confirmDel && (
                <ConfirmModal
                    title={confirmDel.title}
                    message={confirmDel.message}
                    danger={true}
                    loading={saving}
                    onConfirm={confirmDelete}
                    onCancel={() => setConfirmDel(null)}
                />
            )}

            {/* MODAL TRAITEMENT */}
            {showProcess && selectedChangement && (
                <div className="modal-backdrop" onClick={closeModals}>
                    <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-top-rfc-style">
                            <div className="rfc-style-icon-wrapper"><FiRefreshCw /></div>
                            <div className="rfc-style-header-text">
                                <h2>Détails du Changement</h2>
                                <div className="rfc-style-subtitle">#{selectedChangement.code_changement} — {selectedChangement.rfc?.titre_rfc || selectedChangement.planChangement?.titre_plan || 'Changement Standard'}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                <button 
                                    onClick={handleEditChangement}
                                    className="acl-modal-btn edit"
                                >
                                    <FiEdit3 /> Modifier
                                </button>
                                <button 
                                    onClick={() => setShowReportForm(!showReportForm)}
                                    className="acl-modal-btn report"
                                >
                                    <FiFileText /> Rapport
                                </button>
                                <button onClick={closeModals} className="close-btn-rfc-style">
                                    <FiX size={24} />
                                </button>
                            </div>
                        </div>


                        <div className="modal-body acl-modal-body">
                            <div className="acl-modal-grid">
                                <div>
                                    <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}><FiInfo /> Informations Générales</h3>
                                    
                                    {showReportForm && (
                                        <div className="acl-panel acl-panel-report">
                                            <h4 className="acl-panel-title report"><FiFileText /> Nouveau Rapport</h4>
                                            <div className="acl-stack">
                                                <div className="acl-grid-2-1">
                                                    <div>
                                                        <label className="acl-label-xs report">Titre du Rapport</label>
                                                        <input type="text" value={reportForm.titre_rapport} onChange={e => setReportForm({...reportForm, titre_rapport: e.target.value})} className="acl-input-report" placeholder="Ex: Rapport d'implémentation..." />
                                                    </div>
                                                    <div>
                                                        <label className="acl-label-xs report">Type</label>
                                                        <select value={reportForm.type_rapport} onChange={e => setReportForm({...reportForm, type_rapport: e.target.value})} className="acl-input-report acl-bg-white">
                                                            <option value="Audit">Audit</option>
                                                            <option value="Risque">Analyse de Risque</option>
                                                            <option value="Post-Incident">Post-Incident</option>
                                                            <option value="PIR">PIR</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="acl-label-xs report">Contenu</label>
                                                    <textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({...reportForm, contenu_rapport: e.target.value})} className="acl-input-report acl-textarea-report" placeholder="Rédigez le contenu du rapport..." />
                                                </div>
                                                <div className="acl-actions-end">
                                                    <button onClick={() => setShowReportForm(false)} className="acl-link-btn report">Annuler</button>
                                                    <button onClick={handleCreateReport} className="acl-solid-btn report">Enregistrer le Rapport</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editMode && (
                                        <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiEdit3 /> Modifier le Changement</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Titre</label>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.titre} 
                                                            onChange={e => setEditForm({...editForm, titre: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none' }} 
                                                            placeholder="Titre du changement..." 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Priorité</label>
                                                        <select 
                                                            value={editForm.priorite} 
                                                            onChange={e => setEditForm({...editForm, priorite: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                        >
                                                            <option value="">Sélectionner...</option>
                                                            <option value="BASSE">Basse</option>
                                                            <option value="MOYENNE">Moyenne</option>
                                                            <option value="HAUTE">Haute</option>
                                                            <option value="CRITIQUE">Critique</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Description</label>
                                                    <textarea 
                                                        value={editForm.description} 
                                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', minHeight: '80px' }} 
                                                        placeholder="Description du changement..." 
                                                    />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date début</label>
                                                        <input 
                                                            type="datetime-local" 
                                                            value={editForm.date_debut} 
                                                            onChange={e => setEditForm({...editForm, date_debut: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none' }} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date fin</label>
                                                        <input 
                                                            type="datetime-local" 
                                                            value={editForm.date_fin} 
                                                            onChange={e => setEditForm({...editForm, date_fin: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none' }} 
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Environnement</label>
                                                        <select 
                                                            value={editForm.environnement} 
                                                            onChange={e => setEditForm({...editForm, environnement: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                        >
                                                            <option value="">Sélectionner...</option>
                                                            {environments.map(env => (
                                                                <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Statut</label>
                                                        <select 
                                                            value={newStatutId} 
                                                            onChange={e => setNewStatutId(e.target.value)}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                        >
                                                            {uniqueStatuts?.map(s => (
                                                                <option key={s?.id_statut} value={s?.id_statut}>{s?.libelle}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                </div>
                                                <div style={{ marginBottom: '1.5rem' }}>
                                                    <label style={{ display: 'block', fontSize: '0.7rem', color: '#0369a1', fontWeight: '600', marginBottom: '0.4rem' }}>Change Manager (Implémenteur)</label>
                                                    <select 
                                                        value={editForm.id_manager} 
                                                        onChange={e => setEditForm({...editForm, id_manager: e.target.value})}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                    >
                                                        <option value="">Sélectionner un manager...</option>
                                                        {changeManagers?.map(m => (
                                                            <option key={m?.id_user} value={m?.id_user}>{m?.prenom_user} {m?.nom_user}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                                    <button onClick={() => setEditMode(false)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Annuler</button>
                                                    <button onClick={handleSaveEdit} style={{ background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Enregistrer</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement</label>
                                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.environnement?.nom_env || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut</label>
                                            <p style={{ margin: '0.25rem 0 0.5rem' }}>
                                                <span className={`status-badge status-${getStatusColor(selectedChangement.statut?.code_statut)}`}>
                                                    {selectedChangement.statut?.libelle || 'Inconnu'}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date de création</label>
                                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{new Date(selectedChangement.date_creation).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Change Manager</label>
                                            <p style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700', margin: '0.25rem 0' }}>
                                                {selectedChangement.changeManager
                                                    ? `${selectedChangement.changeManager.prenom_user || ''} ${selectedChangement.changeManager.nom_user || ''}`.trim()
                                                    : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: '400' }}>Non assigné</span>
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lié à la RFC</label>
                                            <p style={{ fontSize: '0.95rem', color: '#3b82f6', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.rfc ? `#${selectedChangement.rfc.code_rfc}` : 'Non lié'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiActivity /> Journal d'Audit</h3>
                                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Historique non disponible.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer-rfc-style">
                            <button className="btn-cancel-rfc-style" onClick={closeModals}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL CRÉATION CHANGEMENT */}
            {showCreateChange && (
                <div className="modal-backdrop" onClick={closeModals}>
                    <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                  <div className="modal-top" style={{ background: 'linear-gradient(135deg, #2563eb, #1e40af)', color: 'white', padding: '1rem 1.5rem', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <FiPlus className="modal-ico" style={{ color: '#93c5fd', fontSize: '1.5rem' }} />
                          <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>Nouveau Changement</h2>
                      </div>
                      <button onClick={closeModals} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                          <FiX size={24} />
                      </button>
                  </div>

                        <form onSubmit={handleCreateChangement} className="acl-form-col">
                            <div className="modal-body acl-modal-body">
                                <div className="acl-stack-lg">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Titre du changement <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input 
                                            type="text" 
                                            value={createForm.titre} 
                                            onChange={e => setCreateForm({...createForm, titre: e.target.value})}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                            placeholder="Ex: Déploiement de la mise à jour..." 
                                            required
                                        />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Priorité</label>
                                            <select 
                                                value={createForm.priorite} 
                                                onChange={e => setCreateForm({...createForm, priorite: e.target.value})}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                            >
                                                <option value="BASSE">Basse</option>
                                                <option value="MOYENNE">Moyenne</option>
                                                <option value="HAUTE">Haute</option>
                                                <option value="CRITIQUE">Critique</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Environnement <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select 
                                                value={createForm.id_env} 
                                                onChange={e => setCreateForm({...createForm, id_env: e.target.value})}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                                required
                                            >
                                                <option value="">Sélectionner un environnement...</option>
                                                {environments.map(env => (
                                                    <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Date de début prévue</label>
                                            <input 
                                                type="datetime-local" 
                                                value={createForm.date_debut_prevue} 
                                                onChange={e => setCreateForm({...createForm, date_debut_prevue: e.target.value})}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Date de fin prévue</label>
                                            <input 
                                                type="datetime-local" 
                                                value={createForm.date_fin_prevue} 
                                                onChange={e => setCreateForm({...createForm, date_fin_prevue: e.target.value})}
                                                style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Description détaillée</label>
                                        <textarea 
                                            value={createForm.description} 
                                            onChange={e => setCreateForm({...createForm, description: e.target.value})}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '100px' }} 
                                            placeholder="Description complète du changement à réaliser..." 
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Implémenteur</label>
                                        <select 
                                            value={createForm.id_manager} 
                                            onChange={e => setCreateForm({...createForm, id_manager: e.target.value})}
                                            style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                        >
                                            <option value="">Sélectionner un implémenteur...</option>
                                            {changeManagers?.map(m => (
                                                <option key={m?.id_user} value={m?.id_user}>{m?.prenom_user} {m?.nom_user}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer-rfc-style">
                                <button type="button" className="btn-cancel-rfc-style" onClick={closeModals}>Annuler</button>
                                <button type="submit" className="btn-submit-rfc-style">Créer le changement</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL AFFICHAGE TÂCHES */}
            {showTasksModal && (
                <div className="modal-backdrop" onClick={closeModals}>
                    <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-top-rfc-style">
                            <div className="rfc-style-icon-wrapper"><FiFileText /></div>
                            <div className="rfc-style-header-text">
                                <h2>Tâches du Changement</h2>
                                <div className="rfc-style-subtitle">Suivi opérationnel des interventions techniques</div>
                            </div>
                            <button onClick={closeModals} className="close-btn-rfc-style">
                                <FiX size={24} />
                            </button>
                        </div>

                        <div className="modal-body acl-modal-body" style={{ padding: '1.5rem' }}>
                            {showNewTaskForm && (
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><FiPlus /> Créer une nouvelle tâche</h4>
                                    <form onSubmit={handleCreateTask}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Titre de la tâche *</label>
                                                <input 
                                                    type="text" 
                                                    value={newTaskForm.titre_tache} 
                                                    onChange={e => setNewTaskForm({...newTaskForm, titre_tache: e.target.value})}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Priorité</label>
                                                <select 
                                                    value={newTaskForm.priorite} 
                                                    onChange={e => setNewTaskForm({...newTaskForm, priorite: e.target.value})}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                                >
                                                    <option value="BASSE">Basse</option>
                                                    <option value="MOYENNE">Moyenne</option>
                                                    <option value="HAUTE">Haute</option>
                                                    <option value="CRITIQUE">Critique</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ marginBottom: '1rem' }}>
                                            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Description</label>
                                            <textarea 
                                                value={newTaskForm.description} 
                                                onChange={e => setNewTaskForm({...newTaskForm, description: e.target.value})}
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '60px' }} 
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Assigné à</label>
                                                <select 
                                                    value={newTaskForm.id_user} 
                                                    onChange={e => setNewTaskForm({...newTaskForm, id_user: e.target.value})}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                                    required
                                                >
                                                    <option value="">Sélectionner...</option>
                                                    {implementeurs.map(m => (
                                                        <option key={m.id_user} value={m.id_user}>{m.prenom_user} {m.nom_user}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Début prévu (Optionnel)</label>
                                                <input 
                                                    type="datetime-local" 
                                                    value={newTaskForm.date_debut_prevue} 
                                                    onChange={e => setNewTaskForm({...newTaskForm, date_debut_prevue: e.target.value})}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none' }} 
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                            <button type="button" onClick={() => setShowNewTaskForm(false)} className="acl-link-btn" style={{ color: '#64748b' }}>Annuler</button>
                                            <button type="submit" disabled={saving} className="btn-create-premium" style={{ padding: '8px 20px', borderRadius: '10px' }}>
                                                {saving ? 'Création...' : 'Créer la tâche'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}
                            {tasksToShow.length > 0 ? (
                            <div className="table-scroll-container" style={{ overflowX: 'auto', marginBottom: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <table className="acl-table" style={{ width: '100%', minWidth: '900px' }}>
                                    <thead>
                                        <tr className="acl-head-row">
                                            <th className="acl-th" style={{ background: '#f8fafc' }}>Code Tâche</th>
                                            <th className="acl-th">Titre</th>
                                            <th className="acl-th">Statut</th>
                                            <th className="acl-th">Assigné à</th>
                                            <th className="acl-th" style={{ textAlign: 'right', background: '#f8fafc' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {tasksToShow.map((task, idx) => (
                                            <tr key={task.id_tache} className={idx % 2 === 0 ? 'even' : 'odd'}>
                                                <td className="acl-td" style={{ fontWeight: '700', color: '#3b82f6' }}>{task.code_tache || '—'}</td>
                                                <td className="acl-td" style={{ fontWeight: '600', color: '#1e293b' }}>{task.titre_tache || '—'}</td>
                                                <td className="acl-td">
                                                    <InlineEditableBadge
                                                        currentValue={task.id_statut || task.statut?.id_statut || ''}
                                                        label={task.statut?.libelle || 'N/A'}
                                                        options={taskStatuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                                                        allowedCodes={TASK_TRANSITIONS[task.statut?.code_statut] || []}
                                                        dropdownPosition='down'
                                                        onUpdate={(newId) => handleUpdateTaskStatus(task.id_tache, newId)}
                                                        getVariant={(val) => {
                                                            const s = taskStatuses.find(st => st.id_statut === val);
                                                            const code = s?.code_statut || '';
                                                            if (code === 'TERMINE' || code === 'REUSSI') return 'success';
                                                            if (code === 'EN_COURS') return 'warning';
                                                            if (code === 'ECHEC' || code === 'REJETE') return 'danger';
                                                            return 'default';
                                                        }}
                                                    />
                                                </td>
                                                <td className="acl-td">{task.implementeur?.prenom_user} {task.implementeur?.nom_user || '—'}</td>
                                                <td className="acl-td" style={{ textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id_tache); }}
                                                            style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                                                            title="Supprimer"
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            ) : (
                                <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Aucune tâche assignée à ce changement.</p>
                            )}
                        </div>

                        <div className="modal-footer" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
                            <button type="button" onClick={closeModals} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', fontWeight: '700' }}>Fermer</button>
                            <button 
                                onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                                style={{ 
                                    padding: '0.75rem 1.5rem', 
                                    fontSize: '0.85rem', 
                                    background: '#f59e0b', 
                                    color: 'white', 
                                    border: 'none', 
                                    cursor: 'pointer', 
                                    borderRadius: '10px',
                                    fontWeight: '700',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.2)'
                                }}
                            >
                                <FiPlus /> Nouvelle Tâche
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default AdminChangementList;