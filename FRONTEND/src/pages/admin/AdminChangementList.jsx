import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import changeService from '../../services/changeService';
import dashboardService from '../../services/dashboardService';
import { 
    FiRefreshCw, FiTrendingUp, FiActivity, FiXCircle, 
    FiSearch, FiEye, FiClock, FiCheckCircle, FiFileText, FiX, FiInfo, FiEdit3, FiPlus, FiTrash2, FiEdit, FiUser, FiCalendar,
    FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import rfcService from '../../services/rfcService';
import { useSocket } from '../../context/SocketContext';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import { CHANGE_TRANSITIONS, TACHE_TRANSITIONS, CHANGE_STATUS_LABELS, TACHE_STATUS_LABELS } from '../../utils/constants';

// Extracted Components
import ChangementDetailModal from './components/ChangementDetailModal';
import TasksModal from './components/TasksModal';

import './AdminChangementList.css';
import './AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';
import EnvironmentBadge from '../../components/common/EnvironmentBadge';
import Avatar from '../../components/common/Avatar';

// ── Constantes ───────────────────────────────────────────────
const ITEMS_PER_PAGE = 10;



// ── Styles partagés ──────────────────────────────────────────
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



// ── Style bouton pagination ───────────────────────────────────
const pageBtnStyle = (disabled) => ({
    padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
    background: disabled ? '#f8fafc' : 'white',
    color: disabled ? '#cbd5e1' : '#475569',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.15s', fontWeight: '600', fontSize: '0.8rem',
});

// ============================================================
const AdminChangementList = () => {
    const { socket } = useSocket();
    const [changements,    setChangements]    = useState([]);
    const [kpi,            setKpi]            = useState(null);
    const [loading,        setLoading]        = useState(true);
    const [searchTerm,     setSearchTerm]     = useState('');
    const [filterStatut,   setFilterStatut]   = useState('');
    const [filterEnv,      setFilterEnv]      = useState('');
    const [filterType,     setFilterType]     = useState('');
    const [kpiStatutFilter,setKpiStatutFilter]= useState('');
    const [environments,   setEnvironments]   = useState([]);
    const [changeManagers, setChangeManagers] = useState([]);
    const [implementeurs,  setImplementeurs]  = useState([]);
    const [priorities,     setPriorities]     = useState([]);
    const [usersMap,       setUsersMap]       = useState({});
    const [directions,     setDirections]     = useState([]);
    const [filterDirection, setFilterDirection] = useState('');
    const [saving,         setSaving]         = useState(false);

    // ── Pagination ────────────────────────────────────────────
    const [currentPage, setCurrentPage] = useState(1);

    const [showCreateChange, setShowCreateChange] = useState(false);
    const [createForm, setCreateForm] = useState({
        titre: '', description: '', priorite: 'BASSE',
        date_debut_prevue: '', date_fin_prevue: '', id_env: '', id_manager: ''
    });

    const [selectedChangement, setSelectedChangement] = useState(null);
    const [showProcess,        setShowProcess]        = useState(false);
    const [showReportForm,     setShowReportForm]     = useState(false);
    const [reportForm, setReportForm] = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
    const [editMode,    setEditMode]    = useState(false);
    const [changeStatuses, setChangeStatuses] = useState([]);
    const [taskStatuses,   setTaskStatuses]   = useState([]);
    const [newStatutId,    setNewStatutId]    = useState('');
    const [editForm, setEditForm] = useState({
        titre: '', description: '', priorite: '', date_debut: '', date_fin: '', environnement: '', id_manager: ''
    });
    const [confirmDel, setConfirmDel] = useState(null);
    const [toast,      setToast]      = useState(null);
    const [showTasksModal,   setShowTasksModal]   = useState(false);
    const [tasksToShow,      setTasksToShow]      = useState([]);
    const [showNewTaskForm,  setShowNewTaskForm]  = useState(false);
    const [newTaskForm, setNewTaskForm] = useState({
        titre_tache: '', description: '', priorite: 'MOYENNE',
        id_user: '', id_statut: '', date_debut_prevue: '', date_fin_prevue: ''
    });

    // Initialization
    useEffect(() => {
        // Data is loaded in the dedicated useEffect below
    }, []);

    const location = useLocation();
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const kpi = params.get('kpi');
        if (kpi) {
            setKpiStatutFilter(kpi);
            if (kpi === 'URGENT') setFilterType('URGENT');
        }
    }, [location.search]);

    useEffect(() => { setCurrentPage(1); }, [searchTerm, filterStatut, filterEnv, filterType, kpiStatutFilter, filterDirection]);

    // ── Handlers modals ───────────────────────────────────────
    const handleOpenProcess = (c) => { setSelectedChangement(c); setNewStatutId(c.statut?.id_statut || ''); setShowProcess(true); };

    const closeModals = () => {
        setShowProcess(false); setSelectedChangement(null); setShowReportForm(false);
        setEditMode(false); setShowCreateChange(false); setShowTasksModal(false); setShowNewTaskForm(false);
    };

    const handleShowTasks = async (changement) => {
        try {
            setSelectedChangement(changement);
            const tasks = await changeService.getTasksByChange(changement.id_changement);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            
            // Pré-remplissage de la priorité en fonction du type de changement
            const chType = (changement.rfc?.typeRfc?.type || changement.type || '').toUpperCase();
            let p = 'MOYENNE';
            if (chType === 'URGENT') p = 'CRITIQUE';
            setNewTaskForm({ titre_tache: '', description: '', priorite: p, id_user: '', date_debut_prevue: '' });

            setShowTasksModal(true);
        } catch (err) {
            setToast({ msg: 'Erreur lors du chargement des tâches.', type: 'error' });
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!selectedChangement) return;
        setSaving(true);
        try {
            if (!newTaskForm.titre_tache) throw new Error('Le titre est obligatoire.');
            if (!newTaskForm.id_user)     throw new Error('Veuillez sélectionner un utilisateur.');
            await changeService.createTache(selectedChangement.id_changement, {
                titre_tache: newTaskForm.titre_tache.trim(),
                description: newTaskForm.description || '',
                id_user:     newTaskForm.id_user,
                ordre_tache: Number(tasksToShow.length + 1)
            });
            setToast({ msg: 'Tâche créée avec succès !', type: 'success' });
            const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            setShowNewTaskForm(false);
            setNewTaskForm({ titre_tache: '', description: '', priorite: 'MOYENNE', id_user: '', id_statut: '', date_debut_prevue: '', date_fin_prevue: '' });
            const data = await changeService.getAllChangements({ limit: 1000 });
            const changesWithTasks = await Promise.all(data.map(async (c) => {
                try {
                    const tasks = await changeService.getTasksByChange(c.id_changement);
                    return { ...c, taches: tasks };
                } catch { return c; }
            }));
            setChangements(changesWithTasks);
        } catch (err) {
            setToast({ msg: 'Erreur lors de la création de la tâche.', type: 'error' });
        } finally { setSaving(false); }
    };

    const handleDeleteTask = (idTache) => setConfirmDel({ title: 'Supprimer la tâche', message: 'Êtes-vous sûr de vouloir supprimer cette tâche ?', id: idTache, isTask: true });

    const handleUpdateTaskStatus = async (idTache, idStatut) => {
        try {
            await changeService.updateTacheStatut(idTache, idStatut);
            if (selectedChangement) {
                const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
                setTasksToShow(Array.isArray(tasks) ? tasks : []);
            }
            // Rafraîchir la liste globale pour mettre à jour le compteur "active"
            const data = await changeService.getAllChangements({ limit: 1000 });
            const changesWithTasks = await Promise.all(data.map(async (c) => {
                try {
                    const tasks = await changeService.getTasksByChange(c.id_changement);
                    return { ...c, taches: tasks };
                } catch { return c; }
            }));
            setChangements(changesWithTasks);
            setToast({ msg: 'Statut de la tâche mis à jour.', type: 'success' });
        } catch (err) {
            setToast({ msg: 'Erreur lors de la mise à jour du statut de la tâche.', type: 'error' });
        }
    };

    const handleDeleteChangement = (id) => setConfirmDel({ title: 'Supprimer le changement', message: 'Êtes-vous sûr de vouloir supprimer ce changement ?', id, isTask: false });

    const confirmDelete = async () => {
        if (!confirmDel) return;
        const { id, isTask } = confirmDel;
        setSaving(true);
        try {
            if (isTask) {
                await changeService.deleteTache(id);
                setToast({ msg: 'Tâche supprimée !', type: 'error' });
                setTasksToShow(prev => prev.filter(t => t.id_tache !== id));
            } else {
                await changeService.deleteChangement(id);
                setToast({ msg: 'Changement supprimé !', type: 'error' });
            }
            const data = await changeService.getAllChangements({ limit: 1000 });
            const changesWithTasks = await Promise.all(data.map(async (c) => {
                try {
                    const tasks = await changeService.getTasksByChange(c.id_changement);
                    return { ...c, taches: tasks };
                } catch { return c; }
            }));
            setChangements(changesWithTasks);
        } catch (err) {
            setToast({ msg: err?.response?.data?.message || err.message || 'Impossible de supprimer.', type: 'error' });
        } finally { setSaving(false); setConfirmDel(null); }
    };

    const handleOpenEditDirectly = (c) => {
        setSelectedChangement(c);
        setNewStatutId(c.statut?.id_statut || '');
        const fmt = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
        setEditForm({
            titre:        c.rfc?.titre_rfc || c.planChangement?.titre_plan || '',
            description:  c.planChangement?.etapes_plan || c.rfc?.description || '',
            priorite:     c.rfc?.urgence ? 'HAUTE' : (c.priorite || 'BASSE'),
            date_debut:   fmt(c.date_debut),
            date_fin:     fmt(c.date_fin_prevu),
            environnement:c.environnement?.id_env || c.id_env || '',
            id_manager:   c.implementeur?.id_user || c.id_user || ''
        });
        setEditMode(true);
        setShowProcess(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedChangement) return;
        setSaving(true);
        try {
            await changeService.updateChangement(selectedChangement.id_changement, {
                date_debut:      editForm.date_debut || null,
                date_fin_prevue: editForm.date_fin   || null,
                id_env:          editForm.environnement || undefined,
                id_user:         editForm.id_manager    || undefined,
                priorite:        editForm.priorite,
                plan_changement: { titre_plan: editForm.titre || 'Changement Standard', etapes_plan: editForm.description || '' }
            });
            if (newStatutId && String(newStatutId) !== String(selectedChangement.statut?.id_statut)) {
                await changeService.updateChangementStatus(selectedChangement.id_changement, newStatutId);
            }
            const updated = await changeService.getAllChangements();
            setChangements(updated);
            setEditMode(false); setShowProcess(false);
            setToast({ msg: 'Changement modifié avec succès !', type: 'success' });
        } catch (error) {
            setToast({ msg: error.message || 'Erreur lors de la sauvegarde.', type: 'error' });
        } finally { setSaving(false); }
    };

    const handleCreateChangement = async (e) => {
        e.preventDefault();
        if (!createForm.id_env) return setToast({ msg: 'Veuillez sélectionner un environnement.', type: 'error' });
        setSaving(true);
        try {
            const newC = await changeService.createChangement({ id_env: createForm.id_env, date_debut: createForm.date_debut_prevue || null, date_fin_prevu: createForm.date_fin_prevue || null });
            if (!newC?.id_changement) throw new Error('Impossible de mettre à jour le plan.');
            await changeService.updateChangement(newC.id_changement, { plan_changement: { titre_plan: createForm.titre || 'Changement Standard', etapes_plan: createForm.description || '' } });
            const updated = await changeService.getAllChangements();
            setChangements(updated);
            setToast({ msg: 'Changement créé avec succès !', type: 'success' });
            setShowCreateChange(false);
            setCreateForm({ titre: '', description: '', priorite: 'BASSE', date_debut_prevue: '', date_fin_prevue: '', id_env: '', id_manager: '' });
        } catch (err) {
            setToast({ msg: err.message || 'Erreur lors de la création.', type: 'error' });
        } finally { setSaving(false); }
    };

    const handleCreateReport = async () => {
        if (!reportForm.titre_rapport || !reportForm.contenu_rapport)
            return setToast({ msg: 'Le titre et le contenu sont obligatoires.', type: 'error' });
        try {
            await api.post(`/changements/${selectedChangement.id_changement}/rapports`, reportForm);
            setToast({ msg: 'Rapport enregistré avec succès !', type: 'success' });
            setShowReportForm(false);
            setReportForm({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
        } catch (e) {
            setToast({ msg: 'Erreur lors de la génération du rapport.', type: 'error' });
        }
    };

    // ── Load data ─────────────────────────────────────────────
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [kpiRes, changesData, statusesRes, envsRes, taskStatRes, prioritiesRes] = await Promise.all([
                    dashboardService.getKpiChangements().catch(() => null),
                    changeService.getAllChangements().catch(() => []),
                    api.get('/statuts?contexte=CHANGEMENT').catch(() => null),
                    api.get('/environnements').catch(() => null),
                    api.get('/statuts?contexte=TACHE').catch(() => null),
                    api.get('/priorites').catch(() => null)
                ]);
                const kpiData = kpiRes?.data || kpiRes || null;
                setKpi(kpiData || { total: 0, en_cours: 0, taux_reussite: '0%', echecs: 0 });

                // Robust extraction of changes
                const rawChanges = changesData?.changements || changesData?.data?.changements || changesData?.data || (Array.isArray(changesData) ? changesData : []);
                const changesArray = Array.isArray(rawChanges) ? rawChanges : [];
                
                // Charger les tâches pour chaque changement pour avoir le décompte actif cohérent
                const changesWithTasks = await Promise.all(changesArray.map(async (c) => {
                    try {
                        const tasks = await changeService.getTasksByChange(c.id_changement);
                        return { ...c, taches: tasks };
                    } catch { return c; }
                }));
                setChangements(changesWithTasks);

                const statusesData = statusesRes?.data?.statuts || statusesRes?.data || statusesRes || [];
                setChangeStatuses(Array.isArray(statusesData) ? statusesData : []);
                const envsData = envsRes?.data?.environnements || envsRes?.data || envsRes || [];
                setEnvironments(Array.isArray(envsData) ? envsData : []);
                setTaskStatuses(Array.isArray(taskStatRes?.data?.statuts || taskStatRes?.data || taskStatRes) ? (taskStatRes?.data?.statuts || taskStatRes?.data || taskStatRes) : []);
                setPriorities(Array.isArray(prioritiesRes?.data?.priorites || prioritiesRes?.data || prioritiesRes) ? (prioritiesRes?.data?.priorites || prioritiesRes?.data || prioritiesRes) : []);
                const cmRes  = await api.get('/users?nom_role=CHANGE_MANAGER').catch(() => null);
                const impRes = await api.get('/users?nom_role=IMPLEMENTEUR').catch(() => null);
                setChangeManagers(Array.isArray(cmRes?.data?.data  || cmRes?.data)  ? (cmRes?.data?.data  || cmRes?.data)  : []);
                setImplementeurs( Array.isArray(impRes?.data?.data || impRes?.data) ? (impRes?.data?.data || impRes?.data) : []);
                
                // Fetch all users to have a fallback for direction mapping
                const allUsersRes = await api.get('/users?limit=1000').catch(() => null);
                const allUsers = allUsersRes?.data?.data || allUsersRes?.data || [];
                const uMap = {};
                if (Array.isArray(allUsers)) {
                    allUsers.forEach(u => {
                        uMap[u.id_user] = u.direction?.nom_direction;
                    });
                }
                setUsersMap(uMap);
                
                const dirsRes = await api.get('/directions').catch(() => null);
                setDirections(Array.isArray(dirsRes?.data?.directions || dirsRes?.data) ? (dirsRes?.data?.directions || dirsRes?.data) : []);
            } catch (err) {
                console.warn('Mode secours activé');
            } finally { setLoading(false); }
        };
        loadData();
        if (!socket) return;
        const handleWs = () => loadData();
        socket.on('changement:update', handleWs);
        socket.on('rfc:update', handleWs);
        return () => { socket.off('changement:update', handleWs); socket.off('rfc:update', handleWs); };
    }, [socket]);

    // ── Helpers ───────────────────────────────────────────────
    const getStatusColor = (code) => {
        const s = (code || '').toUpperCase();
        if (s.includes('REUSSI') || s.includes('TERMINE') || s.includes('APPROUV') || s.includes('IMPLEMENTE') || s.includes('TESTE') || s === 'CLOTUREE') return 'success';
        if (s.includes('REJET')  || s.includes('ECHEC')   || s.includes('ANNULE'))  return 'danger';
        if (s.includes('PLANIF') || s.includes('COURS')   || s.includes('ATTENTE') || s.includes('SOUMIS')) return 'warning';
        if (s.includes('EVALU'))  return 'primary';
        return 'default';
    };

    const uniqueStatuts = Array.isArray(changeStatuses) ? [...changeStatuses].sort((a, b) => {
        const order = ['SOUMIS', 'PLANIFIE', 'EN_COURS', 'TERMINE', 'REUSSI', 'ECHEC', 'ANNULE'];
        return (order.indexOf(a?.code_statut) === -1 ? 99 : order.indexOf(a?.code_statut)) - (order.indexOf(b?.code_statut) === -1 ? 99 : order.indexOf(b?.code_statut));
    }) : [];

    const uniqueTypes = ['STANDARD', 'NORMAL', 'URGENT'];

    // ── Filtre ────────────────────────────────────────────────
    const filtered = Array.isArray(changements) ? changements.filter(c => {
        if (!c) return false;
        const q = (searchTerm || '').toLowerCase();
        const matchSearch = (c.code_changement?.toLowerCase() || '').includes(q) || (c.titre?.toLowerCase() || '').includes(q) || (c.rfc?.titre_rfc?.toLowerCase() || '').includes(q) || (c.environnement?.nom_env?.toLowerCase() || '').includes(q);
        const activeStatut = filterStatut || kpiStatutFilter;
        const typeStr = (c.rfc?.typeRfc?.type || c.type || '').toUpperCase();
        const isUrgent = typeStr.includes('URGENT') || 
                        c.rfc?.urgence === true || c.rfc?.urgence === 1 || String(c.rfc?.urgence) === 'true';

        let matchStatut = true;
        if (activeStatut === 'URGENT') {
            matchStatut = isUrgent;
        } else if (activeStatut) {
            matchStatut = c.statut?.code_statut === activeStatut;
        }

        const matchEnv     = filterEnv  ? c.environnement?.nom_env === filterEnv : true;
        const matchType    = filterType 
            ? (filterType.toUpperCase() === 'URGENT' ? isUrgent : (c.rfc?.typeRfc?.type || 'STANDARD').toUpperCase() === filterType.toUpperCase())
            : true;
        const matchDir = filterDirection 
            ? (c.rfc?.demandeur?.direction?.nom_direction === filterDirection || usersMap[c.rfc?.id_user] === filterDirection || usersMap[c.id_user] === filterDirection)
            : true;
        return matchSearch && matchStatut && matchEnv && matchType && matchDir && !['CLOTUREE', 'CLOTURE', 'IMPLEMENTE', 'TERMINEE', 'REUSSI', 'ECHEC', 'ANNULEE', 'REJETEE'].includes(c.statut?.code_statut);
    }) : [];

    // ── Pagination ────────────────────────────────────────────
    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const safePage   = Math.min(currentPage, totalPages);
    const paginated  = filtered.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

    const getPageNumbers = () => {
        const pages = [];
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) pages.push(i);
            else if (pages[pages.length - 1] !== '...') pages.push('...');
        }
        return pages;
    };

    // ── Render ────────────────────────────────────────────────
    return (
        <div className="rfc-mgr-page">
            <style>{`.page-btn:hover:not(:disabled){border-color:#7c3aed!important;color:#7c3aed!important;background:#f5f3ff!important}`}</style>

            {/* HEADER ─────────────────────────────────────── */}
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiRefreshCw /></div>
                    <div className="premium-header-text">
                        <h1>Gestion des Changements</h1>
                        <p>Configurez le flux des changements et supervisez l'état global du système ITIL</p>
                    </div>
                </div>
                <div className="premium-header-actions">
                    <button className="btn-create-premium" onClick={() => window.location.reload()} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
                        <FiRefreshCw /> Actualiser
                    </button>
                    <button onClick={() => setShowCreateChange(true)} className="btn-create-premium"><FiPlus /> Nouveau Changement</button>
                </div>
            </div>

            {/* KPI Row Removed as requested */}

            {/* TOOLBAR ────────────────────────────────────── */}
            <PremiumToolbar 
                searchProps={{
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    placeholder: "Rechercher par code, titre..."
                }}
                filters={[
                    {
                        value: filterStatut,
                        onChange: (e) => { setFilterStatut(e.target.value); setKpiStatutFilter(''); },
                        placeholder: "Tous les statuts",
                        options: uniqueStatuts.map(s => ({ value: s?.code_statut, label: s?.libelle || 'Inconnu' }))
                    },
                    {
                        value: filterType,
                        onChange: (e) => setFilterType(e.target.value),
                        placeholder: "Tous les types",
                        options: uniqueTypes.map(t => ({ value: t, label: t }))
                    },
                    {
                        value: filterEnv,
                        onChange: (e) => setFilterEnv(e.target.value),
                        placeholder: "Environnements",
                        options: environments.map(env => ({ value: env?.nom_env, label: env?.nom_env }))
                    },
                    {
                        value: filterDirection,
                        onChange: (e) => setFilterDirection(e.target.value),
                        placeholder: "Toutes les directions",
                        options: directions.map(d => ({ value: d.nom_direction, label: d.nom_direction }))
                    }
                ]}
                onReset={() => { setSearchTerm(''); setFilterStatut(''); setFilterType(''); setFilterEnv(''); setKpiStatutFilter(''); setFilterDirection(''); }}
                showReset={!!(searchTerm || filterStatut || filterType || filterEnv || kpiStatutFilter || filterDirection)}
            />

            {/* TABLE ──────────────────────────────────────── */}
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <th className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>Changement & Code</th>
                                <th style={thStyle}>RFC Liée & Code</th>
                                <th style={thStyle}>Demandeur</th>
                                <th style={thStyle}>Direction</th>
                                <th style={thStyle}>Responsable</th>
                                <th style={thStyle}>Type</th>
                                <th style={thStyle}>Priorité</th>
                                <th style={thStyle}>Score Risque</th>
                                <th style={thStyle}>Environnement</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                                <th style={{ ...thStyle, textAlign: 'center' }}>Tâches</th>
                                <th className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement...</td></tr>
                            ) : paginated.length === 0 ? (
                                <tr>
                                    <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                                        Aucun changement trouvé.
                                    </td>
                                </tr>
                            ) : paginated.map((c) => (
                                <tr key={c.id_changement} onClick={() => handleOpenProcess(c)}
                                    style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}>

                                    {/* 1. Titre + Code */}
                                    <td className="sticky-col-first" style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9' }}>
                                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }} title={c.planChangement?.titre_plan || 'Changement Standard'}>
                                            {c.planChangement?.titre_plan || 'Changement Standard'}
                                        </div>
                                        <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>#{c.code_changement}</div>
                                    </td>

                                    {/* RFC Liée */}
                                    <td style={tdStyle}>
                                        {c.rfc ? (
                                            <>
                                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }} title={c.rfc.titre_rfc}>
                                                    {c.rfc.titre_rfc}
                                                </div>
                                                <div style={{ fontSize: '0.72rem', color: '#6366f1', fontWeight: 600 }}>#{c.rfc.code_rfc}</div>
                                            </>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.8rem' }}>Aucune RFC liée</span>
                                        )}
                                    </td>

                                    {/* 2. Demandeur */}
                                    <td style={tdStyle}>
                                        {(() => {
                                            const prenom = c.rfc ? (c.rfc.demandeur?.prenom_user || '') : (c.changeManager?.prenom_user || '');
                                            const nom    = c.rfc ? (c.rfc.demandeur?.nom_user    || '') : (c.changeManager?.nom_user    || '');
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Avatar prenom={prenom} nom={nom} />
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{`${prenom || '—'} ${nom}`.trim()}</span>
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    {/* Direction (Changement) */}
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                                                {c.rfc?.demandeur?.direction?.nom_direction || usersMap[c.rfc?.id_user] || usersMap[c.id_user] || '—'}
                                            </span>
                                        </div>
                                    </td>

                                    {/* 3. Responsable */}
                                    <td style={tdStyle}>
                                        {(() => {
                                            const prenom = c.changeManager?.prenom_user || '';
                                            const nom    = c.changeManager?.nom_user    || '';
                                            return (
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                    <Avatar prenom={prenom} nom={nom} />
                                                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>{`${prenom || '—'} ${nom}`.trim() || 'Non assigné'}</span>
                                                </div>
                                            );
                                        })()}
                                    </td>

                                    {/* 4. Type */}
                                    <td style={tdStyle}>
                                        {(() => {
                                            const type = (c.rfc?.typeRfc?.type || c.type || 'STANDARD').toUpperCase();
                                            const colors = { URGENT: { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' }, NORMAL: { bg: '#eff6ff', color: '#3b82f6', border: '#dbeafe' }, STANDARD: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' } };
                                            const s = colors[type] || colors.STANDARD;
                                            return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{type}</span>;
                                        })()}
                                    </td>

                                    {/* 5. Priorité */}
                                    <td style={tdStyle}>
                                        {(() => {
                                            const prio = c.priorite || (c.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : c.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE');
                                            const colors = { CRITIQUE: { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' }, HAUTE: { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' }, MOYENNE: { bg: '#fefce8', color: '#ca8a04', border: '#fef9c3' }, BASSE: { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' } };
                                            const s = colors[prio] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                                            return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{prio}</span>;
                                        })()}
                                    </td>

                                    {/* 5. Score Risque */}
                                    <td style={tdStyle}>
                                        <Badge variant={c.rfc?.evaluationRisque?.score_risque > 15 ? 'danger' : c.rfc?.evaluationRisque?.score_risque > 8 ? 'warning' : 'success'}>
                                            {c.rfc?.evaluationRisque?.score_risque || '—'}
                                        </Badge>
                                    </td>

                                    {/* 6. Environnement */}
                                    <td style={tdStyle}>
                                        <EnvironmentBadge item={c.rfc || c} environments={environments} />
                                    </td>

                                    {/* 7. Statut */}
                                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                        <InlineEditableBadge
                                            currentValue={changeStatuses.find(s => s.code_statut === c.statut?.code_statut)?.id_statut || c.statut?.id_statut || ''}
                                            label={CHANGE_STATUS_LABELS[c.statut?.code_statut] || c.statut?.libelle || 'N/A'}
                                            currentCode={c.statut?.code_statut}
                                            options={uniqueStatuts.map(s => ({ value: s.id_statut, label: CHANGE_STATUS_LABELS[s.code_statut] || s.libelle, code: s.code_statut }))}
                                            allowedCodes={CHANGE_TRANSITIONS[c.statut?.code_statut] || []}
                                            getVariant={(val) => { const s = uniqueStatuts.find(st => st.id_statut == val); return s ? getStatusColor(s.code_statut) : 'default'; }}
                                            onUpdate={async (newId) => {
                                                try {
                                                    await changeService.updateChangementStatus(c.id_changement, newId, '');
                                                    const updated = await changeService.getAllChangements();
                                                    setChangements(updated);
                                                } catch (err) {
                                                    setToast({ msg: err?.response?.data?.message || err?.message || 'Erreur.', type: 'error' });
                                                }
                                            }}
                                            isEditable={!['CLOTUREE'].includes(c.statut?.code_statut)}
                                            dropdownPosition="down"
                                        />
                                    </td>

                                    <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => { e.stopPropagation(); handleShowTasks(c); }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', cursor: 'pointer', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6', whiteSpace: 'nowrap', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                                            {(c.taches || []).filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'REJETEE'].includes(t.statut?.code_statut || t.statut)).length} active{(c.taches || []).filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'REJETEE'].includes(t.statut?.code_statut || t.statut)).length !== 1 ? 's' : ''}
                                        </span>
                                    </td>

                                    {/* 9. Actions */}
                                    <td className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9' }} onClick={e => e.stopPropagation()}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                                            <button onClick={e => { e.stopPropagation(); handleOpenEditDirectly(c); }} title="Modifier"
                                                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'} onMouseLeave={e => e.currentTarget.style.background = '#f1f5f9'}>
                                                <FiEdit size={15} />
                                            </button>
                                            <button onClick={e => { e.stopPropagation(); handleDeleteChangement(c.id_changement); }} title="Supprimer"
                                                style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                                                onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'} onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}>
                                                <FiTrash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* ── Footer pagination ─────────────────── */}
                <div style={{ padding: '0.75rem 1.25rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {filtered.length === 0 ? '0 résultat' : (
                            <><strong style={{ color: '#475569' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, filtered.length)}</strong> sur <strong style={{ color: '#475569' }}>{filtered.length}</strong>{filtered.length !== changements.length && <span style={{ color: '#94a3b8' }}> (filtré · {changements.length} au total)</span>}</>
                        )}
                    </span>

                    {totalPages > 1 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <button className="page-btn" disabled={safePage === 1} onClick={() => setCurrentPage(1)} style={pageBtnStyle(safePage === 1)}><FiChevronsLeft size={14} /></button>
                            <button className="page-btn" disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)} style={pageBtnStyle(safePage === 1)}><FiChevronLeft size={14} /></button>
                            {getPageNumbers().map((p, idx) =>
                                p === '...'
                                    ? <span key={`d${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>…</span>
                                    : <button key={p} className="page-btn" onClick={() => setCurrentPage(p)} style={{ ...pageBtnStyle(false), border: `1.5px solid ${p === safePage ? '#7c3aed' : '#e2e8f0'}`, background: p === safePage ? '#7c3aed' : 'white', color: p === safePage ? 'white' : '#475569', fontWeight: p === safePage ? '700' : '500', minWidth: '34px' }}>{p}</button>
                            )}
                            <button className="page-btn" disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={pageBtnStyle(safePage === totalPages)}><FiChevronRight size={14} /></button>
                            <button className="page-btn" disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)} style={pageBtnStyle(safePage === totalPages)}><FiChevronsRight size={14} /></button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── MODALS REFACTORED ── */}
            <ChangementDetailModal
                show={showProcess}
                onClose={closeModals}
                selectedChangement={selectedChangement}
                editMode={editMode}
                setEditMode={setEditMode}
                editForm={editForm}
                setEditForm={setEditForm}
                newStatutId={newStatutId}
                setNewStatutId={setNewStatutId}
                handleSaveEdit={handleSaveEdit}
                handleCreateReport={handleCreateReport}
                showReportForm={showReportForm}
                setShowReportForm={setShowReportForm}
                reportForm={reportForm}
                setReportForm={setReportForm}
                changeManagers={changeManagers}
                environments={environments}
                uniqueStatuts={uniqueStatuts}
                saving={saving}
                getStatusColor={getStatusColor}
            />

            {/* ── MODAL CRÉATION ────────────────────────── */}
            {showCreateChange && (
                <div className="modal-backdrop" onClick={closeModals}>
                    <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-top" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem', borderTopLeftRadius: '24px', borderTopRightRadius: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <FiPlus style={{ color: '#ffffff', fontSize: '1.5rem' }} />
                                <h2 style={{ color: 'white', margin: 0, fontSize: '1.25rem' }}>Nouveau Changement</h2>
                            </div>
                            <button onClick={closeModals} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateChangement} className="acl-form-col">
                            <div className="modal-body acl-modal-body">
                                <div className="acl-stack-lg">
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Titre du changement <span style={{ color: '#ef4444' }}>*</span></label>
                                        <input type="text" value={createForm.titre} onChange={e => setCreateForm({ ...createForm, titre: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} placeholder="Ex: Déploiement de la mise à jour..." required />
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Priorité</label>
                                            <select value={createForm.priorite} onChange={e => setCreateForm({ ...createForm, priorite: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                                                <option value="BASSE">Basse</option><option value="MOYENNE">Moyenne</option><option value="HAUTE">Haute</option><option value="CRITIQUE">Critique</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Environnement <span style={{ color: '#ef4444' }}>*</span></label>
                                            <select value={createForm.id_env} onChange={e => setCreateForm({ ...createForm, id_env: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }} required>
                                                <option value="">Sélectionner...</option>
                                                {environments.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                        <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Date de début prévue</label><input type="datetime-local" value={createForm.date_debut_prevue} onChange={e => setCreateForm({ ...createForm, date_debut_prevue: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} /></div>
                                        <div><label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Date de fin prévue</label><input type="datetime-local" value={createForm.date_fin_prevue} onChange={e => setCreateForm({ ...createForm, date_fin_prevue: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none' }} /></div>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Description détaillée</label>
                                        <textarea value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '100px' }} placeholder="Description complète du changement..." />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.5rem' }}>Implémenteur</label>
                                        <select value={createForm.id_manager} onChange={e => setCreateForm({ ...createForm, id_manager: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}>
                                            <option value="">Sélectionner un implémenteur...</option>
                                            {changeManagers.map(m => <option key={m?.id_user} value={m?.id_user}>{m?.prenom_user} {m?.nom_user}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer-rfc-style">
                                <button type="button" className="btn-cancel-rfc-style" onClick={closeModals}>Annuler</button>
                                <button type="submit" className="btn-submit-rfc-style" disabled={saving}>{saving ? 'Création...' : 'Créer le changement'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <TasksModal
                show={showTasksModal}
                onClose={closeModals}
                selectedChangement={selectedChangement}
                tasksToShow={tasksToShow}
                handleUpdateTaskStatus={handleUpdateTaskStatus}
                handleDeleteTask={handleDeleteTask}
                handleCreateTask={handleCreateTask}
                newTaskForm={newTaskForm}
                setNewTaskForm={setNewTaskForm}
                implementeurs={implementeurs}
                taskStatuses={taskStatuses}
                TACHE_STATUS_LABELS={TACHE_STATUS_LABELS}
                TACHE_TRANSITIONS={TACHE_TRANSITIONS}
                showNewTaskForm={showNewTaskForm}
                setShowNewTaskForm={setShowNewTaskForm}
                saving={saving}
            />

            {confirmDel && <ConfirmModal title={confirmDel.title} message={confirmDel.message} danger loading={saving} onConfirm={confirmDelete} onCancel={() => setConfirmDel(null)} />}
            {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
        </div>
    );
};

export default AdminChangementList;