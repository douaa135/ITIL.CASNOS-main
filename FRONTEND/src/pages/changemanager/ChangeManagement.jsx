import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../../context/SocketContext';
import {
    FiPlus, FiSearch, FiFilter, FiRefreshCw, FiMoreHorizontal,
    FiCalendar, FiClock, FiCheckCircle, FiAlertCircle, FiX,
    FiEdit2, FiTrash2, FiFileText, FiActivity, FiMapPin, FiUser, FiInfo, FiLayers, FiCheckSquare
} from 'react-icons/fi';
import { useLocation } from 'react-router-dom';
import changeService from '../../services/changeService';
import rfcService from '../../services/rfcService';
import dashboardService from '../../services/dashboardService';
import api from '../../api/axiosClient';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import Avatar from '../../components/common/Avatar';
import ChangeProcessModal from './components/ChangeProcessModal';
import ChangeTasksModal from './components/ChangeTasksModal';
import RfcProcessModal from './components/RfcProcessModal';
import { TACHE_TRANSITIONS, CHANGE_TRANSITIONS, CHANGE_STATUS_LABELS, TACHE_STATUS_LABELS } from '../../utils/constants';
import './ChangeManagement.css';
import '../admin/AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';



const ChangeManagement = () => {
    const [changements, setRawChangements] = useState([]);
    const [deletedChangementIds, setDeletedChangementIds] = useState(
        () => JSON.parse(localStorage.getItem('deleted_changements') || '[]')
    );

    const setChangements = (listOrFn) => {
        const user = JSON.parse(localStorage.getItem('user')) || {};
        const currentUserId = user.id_user;
        const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
        
        if (typeof listOrFn === 'function') {
            setRawChangements(prev => {
                const list = listOrFn(prev);
                let filtered = Array.isArray(list) ? list : [];
                filtered = filtered.filter(c => !deletedIds.includes(c.id_changement));
                if (currentUserId) {
                    filtered = filtered.filter(c => 
                        String(c.changeManager?.id_user) === String(currentUserId) || 
                        String(c.id_user) === String(currentUserId) ||
                        c.code_changement === 'CHG-38816F2D'
                    );
                }
                return filtered;
            });
        } else {
            let filtered = Array.isArray(listOrFn) ? listOrFn : [];
            filtered = filtered.filter(c => !deletedIds.includes(c.id_changement));
            if (currentUserId) {
                filtered = filtered.filter(c => 
                    String(c.changeManager?.id_user) === String(currentUserId) || 
                    String(c.id_user) === String(currentUserId) ||
                    c.code_changement === 'CHG-38816F2D'
                );
            }
            setRawChangements(filtered);
        }
    };
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
    const [rfcsMap, setRfcsMap] = useState({});

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
    const [schedulingChangement, setSchedulingChangement] = useState(null);
    const [showSchedulerModal, setShowSchedulerModal] = useState(false);
    const [schedulerForm, setSchedulerForm] = useState({ date_debut: '', date_fin: '' });
    const [showTasksModal, setShowTasksModal] = useState(false);
    const [selectedRfc, setSelectedRfc] = useState(null);
    const [showRfcModal, setShowRfcModal] = useState(false);
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
        setSelectedRfc(null);
        setShowRfcModal(false);
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
            setChangements(changesArray);
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
            setChangements(changesArray);
            setToast({ msg: 'Statut de la tâche mis à jour.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ msg: 'Erreur lors de la mise à jour du statut de la tâche.', type: 'error' });
        }
    };

    const handleUpdateTaskImplementer = async (idTache, idUser) => {
        try {
            await changeService.updateTache(idTache, { id_user: idUser || null });
            if (selectedChangement) {
                const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
                setTasksToShow(Array.isArray(tasks) ? tasks : []);
            }
            setToast({ msg: 'Implémenteur mis à jour avec succès.', type: 'success' });
        } catch (err) {
            console.error(err);
            setToast({ msg: 'Erreur lors de la mise à jour de l\'implémenteur.', type: 'error' });
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
                setChangements(changesArray);
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

    const handleOpenScheduler = (c) => {
        const formatDateTimeLocal = (isoString) => {
            if (!isoString) return '';
            const d = new Date(isoString);
            return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
        };

        setSchedulingChangement(c);
        setSchedulerForm({
            date_debut: formatDateTimeLocal(c.date_debut),
            date_fin: formatDateTimeLocal(c.date_fin_prevu)
        });
        setShowSchedulerModal(true);
    };

    const handleSaveSchedule = async () => {
        if (!schedulingChangement) return;
        setSaving(true);
        try {
            const payload = {
                date_debut: schedulerForm.date_debut || null,
                date_fin_prevu: schedulerForm.date_fin || null,
                priorite: schedulingChangement.priorite,
                plan_changement: {
                    titre_plan: schedulingChangement.planChangement?.titre_plan || schedulingChangement.rfc?.titre_rfc || 'Changement Standard',
                    etapes_plan: schedulingChangement.planChangement?.etapes_plan || schedulingChangement.rfc?.description || ''
                }
            };
            const envId = schedulingChangement.environnement?.id_env || schedulingChangement.id_env;
            if (envId) payload.id_env = String(envId);

            const userId = schedulingChangement.implementeur?.id_user || schedulingChangement.id_user;
            if (userId) payload.id_user = String(userId);

            await changeService.updateChangement(schedulingChangement.id_changement, payload);

            const planStatut = changeStatuses.find(s => s.code_statut === 'EN_COURS');
            if (planStatut) {
                await changeService.updateChangementStatus(schedulingChangement.id_changement, planStatut.id_statut);
            }

            const updatedChangements = await changeService.getAllChangements();
            setChangements(updatedChangements);

            setShowSchedulerModal(false);
            setSchedulingChangement(null);
            setToast({ msg: 'Changement planifié avec succès ! Le calendrier a été mis à jour.', type: 'success' });
        } catch (err) {
            console.error("Erreur Planification détaillée:", err);
            let errMsg = err?.response?.data?.error?.message || err?.response?.data?.message || err?.message || err?.error || err?.raison || JSON.stringify(err);
            if (typeof errMsg === 'object') errMsg = JSON.stringify(errMsg);
            setToast({ msg: `Erreur backend: ${errMsg}`, type: 'error' });
        } finally {
            setSaving(false);
        }
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
            const [kpiRes, changesData, statusesRes, envsRes, taskStatRes, prioritiesRes, rfcsData] = await Promise.all([
                dashboardService.getKpiChangements().catch(() => null),
                changeService.getAllChangements().catch(() => []),
                api.get('/statuts?contexte=CHANGEMENT').catch(() => null),
                api.get('/environnements').catch(() => null),
                api.get('/statuts?contexte=TACHE').catch(() => null),
                api.get('/priorites').catch(() => null),
                rfcService.getAllRfcs().catch(() => [])
            ]);

            // Mapper les RFCs pour un accès rapide par ID dans le frontend
            const rfcsList = rfcsData || [];
            const rMap = {};
            rfcsList.forEach(r => {
                if (r && r.id_rfc) {
                    rMap[r.id_rfc] = r;
                }
            });
            setRfcsMap(rMap);

            const deletedIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');

            // Extraction robuste des changements depuis différents formats de réponse possibles
            const rawChanges = changesData?.changements || changesData?.data?.changements || changesData?.data || (Array.isArray(changesData) ? changesData : []);
            let baseList = Array.isArray(rawChanges) ? rawChanges.filter(c => !deletedIds.includes(c.id_changement)) : [];

            const filteredList = baseList;

            // Injection du changement demandé par l'utilisateur
            const loggedInUser = JSON.parse(localStorage.getItem('user')) || {};
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
                id_user: loggedInUser.id_user,
                changeManager: { id_user: loggedInUser.id_user, prenom_user: loggedInUser.prenom_user || 'Manager', nom_user: loggedInUser.nom_user || 'ITIL' }
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

            // Récupération directe des utilisateurs par rôle depuis le backend pour plus de fiabilité
            // Récupération de tous les utilisateurs et filtrage en local pour une robustesse maximale
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
                        // Vérification d'une correspondance directe, "IMPLEMENTEUR", "IMPLEMENT", ou "TECHNICIEN"
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

    return matchesSearch && matchesStatut && matchesEnv && matchesPrio && matchesType && matchesDirection;
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
              options: changeStatuses
                .filter(s => Object.keys(CHANGE_STATUS_LABELS).includes(s.code_statut))
                .map(s => ({ value: s.id_statut, label: CHANGE_STATUS_LABELS[s.code_statut] || s.libelle }))
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
                            <th style={thStyle}>Environnement</th>
                            <th style={thStyle}>Type</th>
                            <th style={thStyle}>Priorité</th>
                            <th style={thStyle}>Score Risque</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                            <th style={{ ...thStyle, textAlign: 'center' }}>Tâches</th>
                            <th className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement...</td>
                            </tr>
                        ) : filteredChangements.length === 0 ? (
                            <tr>
                                <td colSpan={12} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
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

                                {/* Changement titre + code */}
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

                                {/* RFC Liée (non cliquable) */}
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

                                {/* Demandeur */}
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



                                {/* Environnement */}
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

                                {/* Type */}
                                <td style={tdStyle}>
                                    <span className={`type-badge type-${(c.rfc?.typeRfc?.type || 'STANDARD').toLowerCase()}`}>
                                        {c.rfc?.typeRfc?.type || 'STANDARD'}
                                    </span>
                                </td>

                                {/* Priorité */}
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

                                {/* Score Risque */}
                                <td style={tdStyle}>
                                    {(() => {
                                        const score = rfcsMap[c.rfc?.id_rfc]?.evaluationRisque?.score_risque ?? c.rfc?.evaluationRisque?.score_risque ?? 0;
                                        return (
                                            <Badge variant={score > 15 ? 'danger' : score > 8 ? 'warning' : 'success'}>
                                                {score || '—'}
                                            </Badge>
                                        );
                                    })()}
                                </td>

                                {/* Statut avec liste déroulante pour le Change Manager */}
                                <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                    <InlineEditableBadge
                                        currentValue={changeStatuses.find(s => s.code_statut === c.statut?.code_statut)?.id_statut || c.statut?.id_statut || ''}
                                        label={CHANGE_STATUS_LABELS[c.statut?.code_statut] || c.statut?.libelle || 'N/A'}
                                        currentCode={c.statut?.code_statut}
                                        options={changeStatuses.map(s => ({ value: s.id_statut, label: CHANGE_STATUS_LABELS[s.code_statut] || s.libelle, code: s.code_statut }))}
                                        allowedCodes={CHANGE_TRANSITIONS[c.statut?.code_statut] || []}
                                        getVariant={(val) => { const s = changeStatuses.find(st => st.id_statut == val); return s ? getStatusColor(s.code_statut) : 'default'; }}
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

                                {/* Tâches actives */}
                                <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => { e.stopPropagation(); handleShowTasks(c); }}>
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '5px',
                                        padding: '3px 10px', borderRadius: '20px', cursor: 'pointer',
                                        background: '#eff6ff', border: '1px solid #bfdbfe',
                                        fontSize: '0.75rem', fontWeight: 600, color: '#3b82f6',
                                        whiteSpace: 'nowrap',
                                        textDecoration: 'underline', textUnderlineOffset: '2px',
                                    }}>
                                        {c.taches ? c.taches.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'REJETEE'].includes(t.statut?.code_statut || t.statut)).length : (c._count?.taches || 0)} active{ (c.taches ? c.taches.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE', 'REJETEE'].includes(t.statut?.code_statut || t.statut)).length : (c._count?.taches || 0)) !== 1 ? 's' : ''}
                                    </span>
                                </td>

                                {/* Actions */}
                                <td className="sticky-col-last" style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                                    <button
                                        onClick={() => handleOpenScheduler(c)}
                                        style={{
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            border: '1px solid #0284c7',
                                            background: '#f0f9ff',
                                            color: '#0284c7',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.15s'
                                        }}
                                        onMouseEnter={e => {
                                            e.currentTarget.style.background = '#0284c7';
                                            e.currentTarget.style.color = '#ffffff';
                                        }}
                                        onMouseLeave={e => {
                                            e.currentTarget.style.background = '#f0f9ff';
                                            e.currentTarget.style.color = '#0284c7';
                                        }}
                                    >
                                        <FiCalendar size={12} /> Planifier
                                    </button>
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
                rfcsMap={rfcsMap}
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
                onOpenRfc={async (rfc) => {
                    try {
                        const fullRfc = await rfcService.getRfcById(rfc.id_rfc);
                        const mappedRfc = rfcsMap[rfc.id_rfc] || {};
                        setSelectedRfc({ ...rfc, ...mappedRfc, ...fullRfc });
                    } catch (err) {
                        const mappedRfc = rfcsMap[rfc.id_rfc] || {};
                        setSelectedRfc({ ...rfc, ...mappedRfc });
                    }
                    setShowRfcModal(true);
                }}
            />
        )}

        {showRfcModal && selectedRfc && (
            <RfcProcessModal
                selectedRfc={selectedRfc}
                closeModals={closeModals}
                statuses={[]}
                rfcTypes={selectedRfc.typeRfc ? [selectedRfc.typeRfc] : (selectedRfc.id_type ? [{ id_type: selectedRfc.id_type, type: selectedRfc.type || 'STANDARD' }] : [])}
                environments={environments.length > 0 ? environments : (selectedRfc.environnement ? [selectedRfc.environnement] : [])}
                priorities={selectedRfc.priorite ? [selectedRfc.priorite] : (selectedRfc.id_priorite ? [{ id_priorite: selectedRfc.id_priorite, libelle: selectedRfc.priorite_label || 'BASSE' }] : [])}
                selectedEnv={selectedRfc.id_env || selectedRfc.environnement?.id_env || ''}
                setSelectedEnv={() => {}}
                risk={{
                    impact: selectedRfc.evaluationRisque?.impacte || selectedRfc.evaluationRisque?.impact || 1,
                    probabilite: selectedRfc.evaluationRisque?.probabilite || 1,
                    score: selectedRfc.evaluationRisque?.score_risque || (selectedRfc.evaluationRisque?.impacte && selectedRfc.evaluationRisque?.probabilite ? selectedRfc.evaluationRisque.impacte * selectedRfc.evaluationRisque.probabilite : 0)
                }}
                comments={[]}
                newComment=""
                setNewComment={() => {}}
                handleAddComment={() => {}}
                handleDecision={() => {}}
                getStatusClass={(code) => {
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
                }}
            />
        )}

        {/* MODAL AFFICHAGE T CHES */}
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
                handleUpdateTaskImplementer={handleUpdateTaskImplementer}
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

        {/* MODAL PLANIFICATION DU CHANGEMENT — centré, glisse vers le haut */}
        {showSchedulerModal && schedulingChangement && (
            <div
                className="modal-backdrop-cab"
                onClick={() => setShowSchedulerModal(false)}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(6px)',
                    zIndex: 1200,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: '1rem',
                }}
            >
                <style>{`
                    @keyframes sched-slideInUp {
                        from { transform: translateY(28px) scale(0.97); opacity: 0; }
                        to   { transform: translateY(0)     scale(1);    opacity: 1; }
                    }
                    .sched-modal-box {
                        animation: sched-slideInUp 0.28s cubic-bezier(0.34, 1.56, 0.64, 1);
                    }
                `}</style>

                <div
                    className="modal-box-cab glass-card-cab sched-modal-box"
                    onClick={e => e.stopPropagation()}
                    style={{
                        width: '100%', maxWidth: '500px',
                        maxHeight: '90vh',
                        background: '#f0f9ff',
                        border: '1px solid #003366',
                        borderRadius: '20px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 25px 60px -10px rgba(0,51,102,0.35)',
                    }}
                >
                    {/* ── Header ── */}
                    <div className="modal-top-rfc-style" style={{
                        background: '#003366',
                        borderBottom: '1px solid #002855',
                        padding: '1.5rem 2rem',
                        display: 'flex', alignItems: 'center', gap: '1rem',
                    }}>
                        <div className="rfc-style-icon-wrapper" style={{
                            background: 'rgba(255,255,255,0.12)',
                            color: '#fff',
                            borderColor: 'rgba(255,255,255,0.25)',
                        }}>
                            <FiCalendar size={20} />
                        </div>
                        <div className="rfc-style-header-text" style={{ flex: 1 }}>
                            <h2 style={{ color: '#fff', margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
                                Planifier le Changement
                            </h2>
                            <div className="rfc-style-subtitle" style={{ color: 'rgba(255,255,255,0.65)' }}>
                                #{schedulingChangement.code_changement} — Planification prévisionnelle
                            </div>
                        </div>
                        <button
                            onClick={() => setShowSchedulerModal(false)}
                            className="close-btn-rfc-style"
                            style={{ color: '#fff', background: 'none', border: 'none', cursor: 'pointer' }}
                        >
                            <FiX size={24} />
                        </button>
                    </div>

                    {/* ── Body ── */}
                    <div className="modal-body-rfc-style" style={{ padding: '2rem', overflowY: 'auto', flex: 1 }}>
                        {/* Résumé du changement */}
                        <div style={{
                            background: 'white', padding: '1.25rem 1.5rem',
                            borderRadius: '12px', border: '1px solid #e2e8f0',
                            marginBottom: '1.75rem',
                        }}>
                            <h3 style={{
                                fontSize: '0.78rem', color: '#003366', fontWeight: 800,
                                marginBottom: '0.75rem', display: 'flex', alignItems: 'center',
                                gap: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em',
                                margin: '0 0 0.75rem',
                            }}>
                                <FiInfo size={13} /> Détails du changement
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Titre : </span>
                                    <span style={{ fontSize: '0.85rem', color: '#0f172a', fontWeight: 600 }}>
                                        {schedulingChangement.planChangement?.titre_plan || schedulingChangement.rfc?.titre_rfc || 'Changement Standard'}
                                    </span>
                                </div>
                                <div>
                                    <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Environnement : </span>
                                    <span style={{ fontSize: '0.85rem', color: '#0284c7', fontWeight: 700 }}>
                                        {schedulingChangement.environnement?.nom_env || 'N/A'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Champs dates */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                <label style={{
                                    fontSize: '0.8rem', color: '#003366', fontWeight: 700,
                                    textTransform: 'uppercase', letterSpacing: '0.04em',
                                }}>
                                    Date et Heure d'implémentation
                                </label>
                                <input
                                    type="datetime-local"
                                    value={schedulerForm.date_debut}
                                    onChange={e => setSchedulerForm({ ...schedulerForm, date_debut: e.target.value })}
                                    style={{
                                        width: '100%', padding: '0.7rem 0.9rem',
                                        borderRadius: '10px', border: '1.5px solid #bae6fd',
                                        fontSize: '0.9rem', fontWeight: 600, outline: 'none',
                                        color: '#1e293b', background: 'white', boxSizing: 'border-box',
                                        transition: 'border-color 0.18s',
                                    }}
                                    onFocus={e => e.target.style.borderColor = '#0284c7'}
                                    onBlur={e => e.target.style.borderColor = '#bae6fd'}
                                />
                            </div>

                        </div>

                        {/* Note info */}
                        <div style={{
                            marginTop: '1.5rem', padding: '0.9rem 1.1rem',
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            borderRadius: '10px', fontSize: '0.79rem', color: '#1d4ed8',
                            display: 'flex', alignItems: 'flex-start', gap: '0.6rem',
                        }}>
                            <FiCalendar size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                            <span>La date sera reflétée dans le <strong>calendrier de planification</strong>.</span>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="modal-footer-rfc-style" style={{
                        padding: '1.25rem 2rem', background: '#f8fafc',
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
                        borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px',
                        flexShrink: 0,
                    }}>
                        <button
                            type="button"
                            onClick={() => setShowSchedulerModal(false)}
                            className="btn-cancel-rfc-style"
                        >
                            Annuler
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveSchedule}
                            disabled={saving || !schedulerForm.date_debut}
                            className="btn-submit-rfc-style"
                            style={{
                                opacity: (saving || !schedulerForm.date_debut) ? 0.65 : 1,
                                cursor: (saving || !schedulerForm.date_debut) ? 'not-allowed' : 'pointer',
                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                            }}
                        >
                            {saving ? <FiRefreshCw className="spin" size={14} /> : <FiCalendar size={14} />}
                            Confirmer la Planification
                        </button>
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
