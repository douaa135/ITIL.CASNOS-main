import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
    FiPlus, FiSearch, FiFilter, FiRefreshCw, FiMoreHorizontal,
    FiCalendar, FiClock, FiCheckCircle, FiAlertCircle, FiX,
    FiEdit2, FiTrash2, FiFileText, FiActivity, FiMapPin, FiUser, FiInfo, FiLayers, FiCheckSquare
} from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import changeService from '../../services/changeService';
import dashboardService from '../../services/dashboardService';
import api from '../../api/axiosClient';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import Avatar from '../../components/common/Avatar';
import ChangeProcessModal from './components/ChangeProcessModal';
import ChangeTasksModal from './components/ChangeTasksModal';
import { TACHE_TRANSITIONS, CHANGE_TRANSITIONS, CHANGE_STATUS_LABELS, TACHE_STATUS_LABELS } from '../../utils/constants';
import './ChangeManagement.css';
import '../admin/AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';



const ChangeManagement = () => {
    const [changements, setChangements] = useState([]);
    const [deletedChangementIds, setDeletedChangementIds] = useState(
        () => JSON.parse(localStorage.getItem('deleted_changements') || '[]')
    );
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState('');
    const [filterEnvironnement, setFilterEnvironnement] = useState('');
    const [filterPriorite, setFilterPriorite] = useState('');
    const [filterType, setFilterType] = useState('');
    const [kpiStatutFilter, setKpiStatutFilter] = useState('');
    const [kpi, setKpi] = useState(null);
    const [directions, setDirections] = useState([]);
    const [filterDirection, setFilterDirection] = useState('');
    const [usersMap, setUsersMap] = useState({});

    const [showCreateChange, setShowCreateChange] = useState(false);
    const [saving, setSaving] = useState(false);

    const [changeStatuses, setChangeStatuses] = useState([]);
    const [environments, setEnvironments] = useState([]);
    const [taskStatuses, setTaskStatuses] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [changeManagers, setChangeManagers] = useState([]);
    const [implementeurs, setImplementeurs] = useState([]);
    const [demandeurs, setDemandeurs] = useState([]);

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

    const location = useLocation();

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const kpiParam = params.get('kpi');
        if (kpiParam) {
            setKpiStatutFilter(kpiParam);
            if (kpiParam === 'URGENT') setFilterType('URGENT');
            else setFilterStatut('');
        }
    }, [location.search]);

    const handleOpenProcess = (c) => {
        setSelectedChangement(c);
        setNewStatutId(c.statut?.id_statut || '');
        setShowProcess(true);
    };

    const closeModals = () => {
        setShowProcess(false);
        setSelectedChangement(null);
        setShowCreateChange(false);
        setShowTasksModal(false);
        setShowReportForm(false);
        setEditMode(false);
        setCreateForm({
            titre: '',
            description: '',
            priorite: 'BASSE',
            date_debut_prevue: '',
            date_fin_prevue: '',
            id_env: '',
            id_manager: ''
        });
        setNewTaskForm({
            titre_tache: '',
            description: '',
            priorite: 'MOYENNE',
            id_user: '',
            id_statut: '',
            date_debut_prevue: '',
            date_fin_prevue: ''
        });
        setShowNewTaskForm(false);
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

            const payload = {
                titre_tache: newTaskForm.titre_tache.trim(),
                description: newTaskForm.description || '',
                id_user: newTaskForm.id_user,
                ordre_tache: Number(tasksToShow.length + 1)
            };

            await changeService.createTache(selectedChangement.id_changement, payload);
            setToast({ msg: 'Exécution terminée avec succès.', type: 'success' });
            const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            setShowNewTaskForm(false);
            setNewTaskForm({ titre_tache: '', description: '', priorite: 'MOYENNE', id_user: '', id_statut: '', date_debut_prevue: '', date_fin_prevue: '' });

            const data = await changeService.getAllChangements({ limit: 1000 });
            const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
            const changesArray = Array.isArray(data) ? data.filter(c => !deletedIds.includes(c.id_changement)) : [];
            const changesWithTasks = await Promise.all(changesArray.map(async (c) => {
                try {
                    const tasks = await changeService.getTasksByChange(c.id_changement);
                    return { ...c, taches: tasks };
                } catch { return c; }
            }));
            setChangements(changesWithTasks);
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
            // Rafraîchir la liste globale pour mettre à jour le compteur "active"
            const data = await changeService.getAllChangements({ limit: 1000 });
            const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
            const changesArray = Array.isArray(data) ? data.filter(c => !deletedIds.includes(c.id_changement)) : [];
            const changesWithTasks = await Promise.all(changesArray.map(async (c) => {
                try {
                    const tasks = await changeService.getTasksByChange(c.id_changement);
                    return { ...c, taches: tasks };
                } catch { return c; }
            }));
            setChangements(changesWithTasks);
            setToast({ msg: 'Statut de la tâche mis à jour.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ msg: 'Erreur lors de la mise à jour du statut de la tâche.', type: 'error' });
        }
    };

    const handleDeleteChangement = (c) => {
        const code = c.statut?.code_statut;
        if (code !== 'SOUMIS') {
            setToast({ msg: `Suppression impossible : le changement doit être au statut SOUMIS (statut actuel : ${c.statut?.libelle || code || 'inconnu'}).`, type: 'error' });
            return;
        }
        setConfirmDel({
            title: 'Supprimer le changement',
            message: `Êtes-vous sûr de vouloir supprimer le changement ${c.code_changement} ? Cette action est irréversible.`,
            id: c.id_changement,
            isTask: false
        });
    };

    const confirmDelete = async () => {
        if (!confirmDel) return;
        const { id, isTask } = confirmDel;
        setSaving(true);
        try {
            if (isTask) {
                // Tâche : suppression physique via API
                await changeService.deleteTache(id);
                setToast({ msg: 'Tâche supprimée avec succès', type: 'error' });
                setTasksToShow(prev => prev.filter(t => t.id_tache !== id));
                const data = await changeService.getAllChangements({ limit: 1000 });
                const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
                const changesArray = Array.isArray(data) ? data.filter(c => !deletedIds.includes(c.id_changement)) : [];
                const changesWithTasks = await Promise.all(changesArray.map(async (c) => {
                    try {
                        const tasks = await changeService.getTasksByChange(c.id_changement);
                        return { ...c, taches: tasks };
                    } catch { return c; }
                }));
                setChangements(changesWithTasks);
            } else {
                // Suppression logique persistante via localStorage
                const updatedDeleted = [...deletedChangementIds, id];
                setDeletedChangementIds(updatedDeleted);
                localStorage.setItem('deleted_changements', JSON.stringify(updatedDeleted));
                setChangements(prev => prev.filter(c => c.id_changement !== id));
                setToast({ msg: 'Changement supprimé avec succès.', type: 'success' });
            }
        } catch (err) {
            console.error('Delete error:', err);
            setToast({ msg: err?.response?.data?.message || err.message || 'Impossible de supprimer.', type: 'error' });
        } finally {
            setSaving(false);
            setConfirmDel(null);
        }
    };

    const handleOpenEditDirectly = (c) => {
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
        if (selectedChangement) handleOpenEditDirectly(selectedChangement);
    };

    const handleSaveEdit = async () => {
        if (!selectedChangement) return;
        setSaving(true);
        try {
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
        if (!createForm.id_env) return setToast({ msg: 'Veuillez sélectionner un environnement.', type: 'error' });
        setSaving(true);
        try {
            await changeService.createChangement({
                date_debut: createForm.date_debut_prevue || null,
                date_fin_prevue: createForm.date_fin_prevue || null,
                id_env: createForm.id_env,
                id_user: createForm.id_manager || undefined,
                priorite: createForm.priorite,
                plan_changement: {
                    titre_plan: createForm.titre || 'Changement Standard',
                    etapes_plan: createForm.description || ''
                }
            });
            setToast({ msg: 'Changement créé avec succès !', type: 'success' });
            const updated = await changeService.getAllChangements();
            setChangements(updated);
            setShowCreateChange(false);
        } catch (error) {
            setToast({ msg: error.message || "Erreur lors de la création.", type: 'error' });
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

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const config = { skipRedirect: true };
            const [kpiRes, changesData, statusesRes, envsRes, taskStatRes, prioritiesRes] = await Promise.all([
                dashboardService.getKpiChangements().catch(() => null),
                changeService.getAllChangements().catch(() => []),
                api.get('/statuts?contexte=CHANGEMENT').catch(() => null),
                api.get('/environnements').catch(() => null),
                api.get('/statuts?contexte=TACHE').catch(() => null),
                api.get('/priorites').catch(() => null)
            ]);

            const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');

            // Robust extraction of changes from different possible response formats
            const rawChanges = changesData?.changements || changesData?.data?.changements || changesData?.data || (Array.isArray(changesData) ? changesData : []);
            let baseList = Array.isArray(rawChanges) ? rawChanges.filter(c => !deletedIds.includes(c.id_changement)) : [];

            // Charger les tâches pour chaque changement pour avoir le décompte actif cohérent
            const filteredList = await Promise.all(baseList.map(async (c) => {
                try {
                    const tasks = await changeService.getTasksByChange(c.id_changement);
                    return { ...c, taches: tasks };
                } catch { return c; }
            }));

            // Injection du changement demandé par l'utilisateur
            const sampleChange = {
                id_changement: 'SEED-388',
                code_changement: 'CHG-38816F2D',
                statut: { code_statut: 'EN_COURS', libelle: 'En cours' },
                priorite: 'HAUTE',
                environnement: { nom_env: 'PRODUCTION' },
                planChangement: {
                    titre_plan: 'Restauration complète du service [Service]',
                    etapes_plan: '1. Identification du service impacté\n2. Vérification des backups\n3. Restauration des données\n4. Validation de l\'intégrité'
                },
                rfc: {
                    titre_rfc: 'Mise à jour LDAP — OpenLDAP 2.6 vers 2.7',
                    code_rfc: 'RFC-SEED-012',
                    evaluationRisque: { score_risque: 12 },
                    demandeur: { prenom_user: 'Admin', nom_user: 'Système', direction: { nom_direction: 'Direction Technique' } }
                },
                changeManager: { prenom_user: 'Manager', nom_user: 'ITIL' }
            };

            if (!filteredList.some(c => c.code_changement === 'CHG-38816F2D')) {
                filteredList.unshift(sampleChange);
            }

            setChangements(filteredList);

            if (kpiRes) setKpi(kpiRes);

            const statusesData = statusesRes?.data?.statuts || statusesRes?.data || statusesRes || [];
            setChangeStatuses(Array.isArray(statusesData) ? statusesData : []);
            const envsData = envsRes?.data?.environnements || envsRes?.data || envsRes || [];
            setEnvironments(Array.isArray(envsData) ? envsData : []);
            const taskStatusesData = taskStatRes?.data?.statuts || taskStatRes?.data || taskStatRes || [];
            setTaskStatuses(Array.isArray(taskStatusesData) ? taskStatusesData : []);
            const prioritiesData = prioritiesRes?.data?.priorites || prioritiesRes?.data || prioritiesRes || [];
            setPriorities(Array.isArray(prioritiesData) ? prioritiesData : []);

            // Fetch users by role directly from the backend for better reliability
            // Fetch all users and filter locally for maximum robustness
            const response = await api.get('/users?limit=1000').catch(() => null);
            const allUsers = response?.data?.data || response?.data?.users || response?.data || (Array.isArray(response) ? response : []);

            if (Array.isArray(allUsers)) {
                const hasRole = (u, name) => {
                    if (!u) return false;
                    const roleList = [];
                    if (Array.isArray(u.roles)) {
                        u.roles.forEach(r => {
                            if (typeof r === 'string') roleList.push(r);
                            else if (r && r.nom_role) roleList.push(r.nom_role);
                        });
                    }
                    if (Array.isArray(u.userRoles)) {
                        u.userRoles.forEach(ur => {
                            if (ur && ur.role && ur.role.nom_role) roleList.push(ur.role.nom_role);
                        });
                    }
                    if (u.role && u.role.nom_role) roleList.push(u.role.nom_role);
                    if (u.nom_role) roleList.push(u.nom_role);

                    const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                    return roleList.some(r => {
                        if (!r) return false;
                        const normalizedRole = String(r).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                        // Checks for direct match, "IMPLEMENTEUR", "IMPLEMENT", or "TECHNICIEN" which are common synonyms in this app
                        return normalizedRole.includes(normalizedName) ||
                            (normalizedName === 'IMPLEMENTEUR' && (normalizedRole.includes('IMPLEMENT') || normalizedRole.includes('TECH')));
                    });
                };
                setChangeManagers(allUsers.filter(u => hasRole(u, 'CHANGE_MANAGER')));
                setImplementeurs(allUsers.filter(u => hasRole(u, 'IMPLEMENTEUR')));
                setDemandeurs(allUsers.filter(u => hasRole(u, 'DEMANDEUR')));
                
                const map = {};
                allUsers.forEach(u => {
                    const dirName = u.direction?.nom_direction || u.direction_name;
                    if (dirName) map[u.id_user] = dirName;
                });
                setUsersMap(map);
            }

            const dirs = await api.get('/directions').then(res => res.data.directions || res.data || []).catch(() => []);
            setDirections(dirs);
        } catch (err) {
            console.warn("Simulation Mode Actif");
        } finally {
            setLoading(false);
        }
    }, []);

useEffect(() => {
    loadData();
}, [loadData]);

const { socket } = useSocket();
useEffect(() => {
    if (!socket) return;
    const handleWs = () => loadData();
    socket.on('changement:update', handleWs);
    return () => socket.off('changement:update', handleWs);
}, [socket, loadData]);

const uniqueTypes = ['STANDARD', 'NORMAL', 'URGENT'];

const getStatusColor = (code) => {
    const s = (code || '').toUpperCase();
    if (s.includes('REUSSI') || s.includes('TERMINE') || s.includes('APPROUV') || s.includes('IMPLEMENTE') || s.includes('TESTE') || s === 'CLOTUREE') return 'success';
    if (s.includes('REJET') || s.includes('ECHEC') || s.includes('ANNULE')) return 'danger';
    if (s.includes('PLANIF') || s.includes('COURS') || s.includes('ATTENTE') || s.includes('SOUMIS')) return 'warning';
    if (s.includes('EVALU')) return 'primary';
    return 'default';
};

const thStyle = { padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' };
const tdStyle = { padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' };

const filteredChangements = changements.filter(c => {
    const matchesSearch = (c.code_changement || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.rfc?.titre_rfc || '').toLowerCase().includes(searchTerm.toLowerCase());

    const activeStatut = filterStatut || kpiStatutFilter;
    const typeStr = (c.rfc?.typeRfc?.type || c.type || '').toUpperCase();
    const isUrgent = typeStr.includes('URGENT') || 
                    c.rfc?.urgence === true || c.rfc?.urgence === 1 || String(c.rfc?.urgence) === 'true';

    let matchesStatut = true;
    if (activeStatut === 'URGENT') {
        matchesStatut = isUrgent;
    } else if (activeStatut) {
        matchesStatut = c.statut?.id_statut === activeStatut || c.id_statut === activeStatut || c.statut?.code_statut === activeStatut;
    }

    const matchesEnv = !filterEnvironnement || c.environnement?.id_env === filterEnvironnement || c.id_env === filterEnvironnement;
    const matchesPrio = !filterPriorite || c.priorite === filterPriorite;
    const matchesType = !filterType || 
        (filterType.toUpperCase() === 'URGENT' ? isUrgent : (c.rfc?.typeRfc?.type || 'STANDARD').toUpperCase() === filterType.toUpperCase());

    const matchesDirection = !filterDirection || (c.rfc?.demandeur?.direction?.nom_direction === filterDirection);

    return matchesSearch && matchesStatut && matchesEnv && matchesPrio && matchesType && matchesDirection && !['CLOTUREE', 'CLOTURE', 'IMPLEMENTE', 'TERMINEE', 'REUSSI', 'ECHEC', 'ANNULEE', 'REJETEE'].includes(c.statut?.code_statut);
});

return (
    <div className="acl-container" style={{ padding: '2rem' }}>
        <div className="premium-header-card">
            <div className="premium-header-left">
                <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiRefreshCw /></div>
                <div className="premium-header-text">
                    <h1>Gestion des Changements</h1>
                    <p>Suivi et déploiement des interventions techniques</p>
                </div>
            </div>
            <div className="premium-header-actions">
                <button onClick={() => setShowCreateChange(true)} className="btn-create-premium">
                    <FiPlus /> Nouveau Changement
                </button>
            </div>
        </div>

        {/* KPI Row Removed as requested */}

        <PremiumToolbar
          searchProps={{
            value: searchTerm,
            onChange: (e) => setSearchTerm(e.target.value),
            placeholder: "Rechercher un changement..."
          }}
          filters={[
            {
              value: filterStatut,
              onChange: (e) => setFilterStatut(e.target.value),
              placeholder: "Tous les Statuts",
              options: changeStatuses.map(s => ({ value: s.id_statut, label: s.libelle }))
            },
            {
              value: filterType,
              onChange: (e) => setFilterType(e.target.value),
              placeholder: "Tous les Types",
              options: uniqueTypes.map(t => ({ value: t, label: t }))
            },
            {
              value: filterEnvironnement,
              onChange: (e) => setFilterEnvironnement(e.target.value),
              placeholder: "Tous les Envs",
              options: environments.map(e => ({ value: e.id_env, label: e.nom_env }))
            },
            {
              value: filterDirection,
              onChange: (e) => setFilterDirection(e.target.value),
              placeholder: "Toutes les directions",
              options: directions.map(d => ({ value: d.nom_direction, label: d.nom_direction }))
            }
          ]}
          onReset={() => { setSearchTerm(''); setFilterStatut(''); setFilterEnvironnement(''); setFilterPriorite(''); setFilterType(''); setFilterDirection(''); setKpiStatutFilter(''); }}
          showReset={!!(searchTerm || filterStatut || filterEnvironnement || filterPriorite || filterType || filterDirection || kpiStatutFilter)}
        />

        <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
        }}>
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '1100px', borderCollapse: 'collapse' }}>

                    <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>

                            {/* Sticky gauche */}
                            <th style={{
                                position: 'sticky', left: 0, zIndex: 3,
                                background: '#f8fafc',
                                padding: '12px 16px',
                                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.07em', color: '#64748b',
                                textAlign: 'left', whiteSpace: 'nowrap',
                                borderRight: '1px solid #e2e8f0',
                            }}>Changement & Code</th>

                            <th style={thStyle}>RFC Liée & Code</th>
                            <th style={thStyle}>Demandeur</th>
                            <th style={{ ...thStyle, width: '180px' }}>Direction</th>
                            <th style={thStyle}>Responsable</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Priorité</th>
                            <th style={thStyle}>Score Risque</th>
                            <th style={thStyle}>Environnement</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Tâches</th>

                            {/* Sticky droite */}
                            <th style={{
                                position: 'sticky', right: 0, zIndex: 3,
                                background: '#f8fafc',
                                padding: '12px 16px',
                                fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                                letterSpacing: '0.07em', color: '#64748b',
                                textAlign: 'right', whiteSpace: 'nowrap',
                                borderLeft: '1px solid #e2e8f0',
                            }}>Actions</th>

                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    Chargement...
                                </td>
                            </tr>
                        ) : filteredChangements.length === 0 ? (
                            <tr>
                                <td colSpan={11} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                                    Aucun changement trouvé.
                                </td>
                            </tr>
                        ) : filteredChangements.map((c) => (
                            <tr
                                key={c.id_changement}
                                onClick={() => handleOpenProcess(c)}
                                style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                            >

                                {/* ── 1. Changement titre + code — sticky gauche */}
                                <td style={{
                                    position: 'sticky', left: 0, zIndex: 2,
                                    background: 'inherit',
                                    padding: '14px 16px',
                                    borderRight: '1px solid #f1f5f9',
                                }}>
                                    <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '3px' }}
                                        title={c.planChangement?.titre_plan || 'Changement Standard'}>
                                        {c.planChangement?.titre_plan || 'Changement Standard'}
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>
                                        #{c.code_changement}
                                    </div>
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

                                {/* ── 2. Demandeur */}
                                <td style={tdStyle}>
                                    {(() => {
                                        const prenom = c.rfc ? (c.rfc.demandeur?.prenom_user || '') : (c.changeManager?.prenom_user || '');
                                        const nom = c.rfc ? (c.rfc.demandeur?.nom_user || '') : (c.changeManager?.nom_user || '');
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Avatar prenom={prenom} nom={nom} />
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                                    {`${prenom || '—'} ${nom}`.trim()}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </td>

                                {/* Direction */}
                                <td style={tdStyle}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}>
                                            {c.rfc?.demandeur?.direction?.nom_direction || usersMap[c.rfc?.id_user] || usersMap[c.id_user] || '—'}
                                        </span>
                                    </div>
                                </td>

                                {/* ── 3. Responsable (Change Manager) — avatar initiales */}
                                <td style={tdStyle}>
                                    {(() => {
                                        const prenom = c.changeManager?.prenom_user || '';
                                        const nom = c.changeManager?.nom_user || '';
                                        return (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                <Avatar prenom={prenom} nom={nom} />
                                                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                                                    {`${prenom || '—'} ${nom}`.trim() || 'Non assigné'}
                                                </span>
                                            </div>
                                        );
                                    })()}
                                </td>

                                {/* ── 4. Type */}
                                <td style={tdStyle}>
                                    <span className={`type-badge type-${(c.rfc?.typeRfc?.type || 'STANDARD').toLowerCase()}`}>
                                        {c.rfc?.typeRfc?.type || 'STANDARD'}
                                    </span>
                                </td>

                                {/* ── 5. Priorité */}
                                <td style={tdStyle}>
                                    {(() => {
                                        const prio = c.priorite || (c.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : c.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE');
                                        const colors = {
                                            'CRITIQUE': { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' },
                                            'HAUTE': { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' },
                                            'MOYENNE': { bg: '#fefce8', color: '#ca8a04', border: '#fef9c3' },
                                            'BASSE': { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' },
                                        };
                                        const s = colors[prio] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                                        return (
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>
                                                {prio}
                                            </span>
                                        );
                                    })()}
                                </td>

                                {/* ── 5. Score Risque */}
                                <td style={tdStyle}>
                                    <Badge variant={c.rfc?.evaluationRisque?.score_risque > 15 ? 'danger' : c.rfc?.evaluationRisque?.score_risque > 8 ? 'warning' : 'success'}>
                                        {c.rfc?.evaluationRisque?.score_risque || '—'}
                                    </Badge>
                                </td>

                                {/* ── 6. Environnement */}
                                <td style={tdStyle}>
                                    <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '20px', background: '#f0f9ff', border: '1px solid #bae6fd', fontSize: '0.72rem', color: '#0369a1', fontWeight: 600 }}>
                                        {(() => {
                                            const getEnvName = (obj, id) => {
                                                if (typeof obj === 'string' && obj.length > 1) return obj;
                                                if (obj?.nom_env) return obj.nom_env;
                                                if (obj?.libelle) return obj.libelle;
                                                
                                                const targetId = id || obj?.id_env || obj?.id_environnement || obj?.id;
                                                if (targetId) {
                                                    const found = environments.find(e => 
                                                        String(e.id_env) === String(targetId) || 
                                                        String(e.id) === String(targetId) ||
                                                        String(e.nom_env).toLowerCase() === String(targetId).toLowerCase()
                                                    );
                                                    if (found) return found.nom_env;
                                                }
                                                return null;
                                            };
                                            let name = getEnvName(c.rfc?.environnement, c.rfc?.id_env || c.rfc?.id_environnement) || 
                                                       getEnvName(c.environnement, c.id_env || c.id_environnement) ||
                                                       getEnvName(c.rfc?.impacte_estimee);

                                            if (name && name.includes('Environnement ciblé:')) {
                                                name = name.replace('Environnement ciblé:', '').trim();
                                            }
                                            return name || 'N/A';
                                        })()}
                                    </span>
                                </td>

                                {/* ── 7. Statut */}
                                <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    <InlineEditableBadge
                                        currentValue={c.statut?.id_statut || c.id_statut || ''}
                                        label={CHANGE_STATUS_LABELS[c.statut?.code_statut] || c.statut?.libelle || 'N/A'}
                                        options={changeStatuses.map(s => ({ value: s.id_statut, label: CHANGE_STATUS_LABELS[s.code_statut] || s.libelle, code: s.code_statut }))}
                                        allowedCodes={CHANGE_TRANSITIONS[c.statut?.code_statut] || []}
                                        getVariant={(val) => {
                                            const s = changeStatuses.find(st => st.id_statut == val);
                                            return s ? getStatusColor(s.code_statut) : 'default';
                                        }}
                                        onUpdate={async (newId) => {
                                            try {
                                                await changeService.updateChangementStatus(c.id_changement, newId, '');
                                                const updated = await changeService.getAllChangements();
                                                setChangements(updated);
                                            } catch (err) {
                                                const msg = err?.response?.data?.message || err?.message || 'Erreur lors du changement de statut.';
                                                setToast({ msg, type: 'error' });
                                            }
                                        }}
                                    />
                                </td>

                                {/* ── 8. Tâches */}
                                <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => { e.stopPropagation(); handleShowTasks(c); }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                                        background: '#eff6ff', border: '1px solid #bfdbfe',
                                        fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6',
                                        whiteSpace: 'nowrap',
                                        textDecoration: 'underline', textUnderlineOffset: '2px',
                                    }}>
                                        {(c.taches || []).filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'REJETEE'].includes(t.statut?.code_statut || t.statut)).length} active{(c.taches || []).filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'REJETEE'].includes(t.statut?.code_statut || t.statut)).length !== 1 ? 's' : ''}
                                    </span>
                                </td>

                                {/* ── 9. Actions — sticky droite */}
                                <td style={{
                                    position: 'sticky', right: 0, zIndex: 2,
                                    background: 'inherit',
                                    padding: '14px 16px',
                                    borderLeft: '1px solid #f1f5f9',
                                }} onClick={e => e.stopPropagation()}>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '6px' }}>
                                        {(() => {
                                            const canDelete = c.statut?.code_statut === 'SOUMIS';
                                            return (
                                                <button
                                                    onClick={e => { e.stopPropagation(); handleDeleteChangement(c); }}
                                                    title={canDelete ? 'Supprimer' : `Suppression impossible (statut : ${c.statut?.libelle || c.statut?.code_statut})`}
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
            {/* Footer */}
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa' }}>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    {filteredChangements.length} résultat{filteredChangements.length !== 1 ? 's' : ''} affiché{filteredChangements.length !== 1 ? 's' : ''} sur {changements.length} changement{changements.length !== 1 ? 's' : ''}
                </span>
            </div>
        </div>

        {/* MODAL TRAITEMENT */}
        {showProcess && (
            <ChangeProcessModal
                selectedChangement={selectedChangement}
                closeModals={closeModals}
                handleEditChangement={handleEditChangement}
                showReportForm={showReportForm}
                setShowReportForm={setShowReportForm}
                reportForm={reportForm}
                setReportForm={setReportForm}
                handleCreateReport={handleCreateReport}
                editMode={editMode}
                setEditMode={setEditMode}
                editForm={editForm}
                setEditForm={setEditForm}
                handleSaveEdit={handleSaveEdit}
                environments={environments}
                changeManagers={changeManagers}
                getStatusColor={getStatusColor}
            />
        )}

        {/* MODAL AFFICHAGE TÂCHES */}
        {showTasksModal && (
            <ChangeTasksModal
                selectedChangement={selectedChangement}
                closeModals={closeModals}
                showNewTaskForm={showNewTaskForm}
                setShowNewTaskForm={setShowNewTaskForm}
                handleCreateTask={handleCreateTask}
                newTaskForm={newTaskForm}
                setNewTaskForm={setNewTaskForm}
                implementeurs={implementeurs}
                saving={saving}
                tasksToShow={tasksToShow}
                taskStatuses={taskStatuses}
                TACHE_STATUS_LABELS={TACHE_STATUS_LABELS}
                TACHE_TRANSITIONS={TACHE_TRANSITIONS}
                handleUpdateTaskStatus={handleUpdateTaskStatus}
                handleDeleteTask={handleDeleteTask}
            />
        )}

        {/* MODAL CRÉATION CHANGEMENT */}
        {showCreateChange && (
            <div className="modal-backdrop" onClick={closeModals}>
                <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%', background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
                    <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                        <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiPlus /></div>
                        <div className="rfc-style-header-text" style={{ flexGrow: 1 }}>
                            <h2 style={{ color: '#ffffff' }}>Nouveau Changement</h2>
                            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Création d'un plan d'intervention</div>
                        </div>
                        <button onClick={closeModals} className="close-btn-rfc-style" style={{ color: '#ffffff' }}><FiX size={24} /></button>
                    </div>
                    <form onSubmit={handleCreateChangement}>
                        <div className="modal-body-rfc-style" style={{ padding: '2rem' }}>
                            <div className="acl-stack-lg">
                                <div className="form-group">
                                    <label className="acl-label-xs">Titre du Changement</label>
                                    <input className="acl-search-input" value={createForm.titre} onChange={e => setCreateForm({ ...createForm, titre: e.target.value })} required />
                                </div>
                                <div className="acl-grid-2-1">
                                    <div className="form-group">
                                        <label className="acl-label-xs">Environnement</label>
                                        <select className="acl-select" value={createForm.id_env} onChange={e => setCreateForm({ ...createForm, id_env: e.target.value })} required>
                                            <option value="">Sélectionner...</option>
                                            {environments.map(ev => <option key={ev.id_env} value={ev.id_env}>{ev.nom_env}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="acl-label-xs">Priorité</label>
                                        <select className="acl-select" value={createForm.priorite} onChange={e => setCreateForm({ ...createForm, priorite: e.target.value })}>
                                            <option value="BASSE">Basse</option>
                                            <option value="MOYENNE">Moyenne</option>
                                            <option value="HAUTE">Haute</option>
                                            <option value="CRITIQUE">Critique</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="acl-label-xs">Description</label>
                                    <textarea className="acl-search-input" style={{ minHeight: '100px' }} value={createForm.description} onChange={e => setCreateForm({ ...createForm, description: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button type="button" onClick={closeModals} className="acl-link-btn">Annuler</button>
                            <button type="submit" className="btn-create-premium">Créer le Changement</button>
                        </div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL RAPPORT AUDIT */}
        {showReportForm && (
            <div className="modal-backdrop" onClick={closeModals}>
                <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                    <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                        <h3 style={{ margin: 0, color: '#0f172a' }}>Générer le Rapport d'Audit</h3>
                    </div>
                    <div className="acl-modal-body">
                        <div className="acl-stack">
                            <input className="acl-search-input" placeholder="Titre du rapport" value={reportForm.titre_rapport} onChange={e => setReportForm({ ...reportForm, titre_rapport: e.target.value })} />
                            <textarea className="acl-search-input" style={{ minHeight: '150px' }} placeholder="Contenu du rapport..." value={reportForm.contenu_rapport} onChange={e => setReportForm({ ...reportForm, contenu_rapport: e.target.value })} />
                        </div>
                    </div>
                    <div className="modal-footer" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                        <button onClick={() => setShowReportForm(false)} className="acl-link-btn">Annuler</button>
                        <button onClick={handleCreateReport} className="btn-create-premium">Enregistrer le Rapport</button>
                    </div>
                </div>
            </div>
        )}

        {/* MODALS DE CONFIRMATION */}

        {confirmDel && (
            <ConfirmModal
                onCancel={() => setConfirmDel(null)}
                onConfirm={confirmDelete}
                title={confirmDel.title}
                message={confirmDel.message}
                loading={saving}
                danger={true}
            />
        )}

        {toast && (
            <Toast
                msg={toast.msg}
                type={toast.type}
                onClose={() => setToast(null)}
            />
        )}
    </div>
);
};

export default ChangeManagement;
