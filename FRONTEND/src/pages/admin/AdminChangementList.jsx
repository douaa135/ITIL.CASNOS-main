import React, { useState, useEffect } from 'react';
import { 
    FiPlus, FiSearch, FiFilter, FiRefreshCw, FiMoreHorizontal, 
    FiCalendar, FiClock, FiCheckCircle, FiAlertCircle, FiX, 
    FiEdit2, FiTrash2, FiFileText, FiActivity, FiMapPin, FiUser, FiInfo, FiLayers
} from 'react-icons/fi';
import changeService from '../../services/changeService';
import dashboardService from '../../services/dashboardService';
import api from '../../api/axiosClient';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import ConfirmModal from '../../components/common/ConfirmModal';
import Badge from '../../components/common/Badge';
import './AdminChangementList.css';

const TASK_TRANSITIONS = {
    'EN_ATTENTE': ['EN_COURS', 'ANNULE'],
    'EN_COURS': ['TERMINE', 'ECHEC', 'EN_ATTENTE'],
    'TERMINE': [],
    'ECHEC': ['EN_COURS'],
    'ANNULE': ['EN_ATTENTE']
};

const CHANGE_TRANSITIONS = {
    'SOUMIS': ['EVALUATION', 'ANNULE'],
    'EVALUATION': ['PLANIFIE', 'REJETE', 'SOUMIS'],
    'PLANIFIE': ['EN_COURS', 'ANNULE'],
    'EN_COURS': ['IMPLEMENTE', 'ECHEC'],
    'IMPLEMENTE': ['TESTE', 'ECHEC'],
    'TESTE': ['CLOTURE', 'ECHEC'],
    'CLOTURE': [],
    'REJETE': ['EVALUATION'],
    'ANNULE': ['SOUMIS'],
    'ECHEC': ['PLANIFIE']
};

const AdminChangementList = () => {
    const [changements, setChangements] = useState([]);
    const [deletedChangementIds, setDeletedChangementIds] = useState(
        () => JSON.parse(localStorage.getItem('deleted_changements') || '[]')
    );
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState('');
    const [filterEnvironnement, setFilterEnvironnement] = useState('');
    const [filterPriorite, setFilterPriorite] = useState('');
    
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
            setToast({ msg: 'Tâche créée avec succès !', type: 'success' });
            const tasks = await changeService.getTasksByChange(selectedChangement.id_changement);
            setTasksToShow(Array.isArray(tasks) ? tasks : []);
            setShowNewTaskForm(false);
            setNewTaskForm({ titre_tache: '', description: '', priorite: 'MOYENNE', id_user: '', id_statut: '', date_debut_prevue: '', date_fin_prevue: '' });
            
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
                setToast({ msg: 'Tâche supprimée avec succès !', type: 'success' });
                setTasksToShow(prev => prev.filter(t => t.id_tache !== id));
                // Rafraichir le compteur de tâches dans la liste
                const updated = await changeService.getAllChangements();
                setChangements(updated);
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

    useEffect(() => {
        const loadData = async () => {
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
                const rawChanges = Array.isArray(changesData) ? changesData : [];
                setChangements(rawChanges.filter(c => !deletedIds.includes(c.id_changement)));
                const statusesData = statusesRes?.data?.statuts || statusesRes?.data || statusesRes || [];
                setChangeStatuses(Array.isArray(statusesData) ? statusesData : []);
                const envsData = envsRes?.data?.environnements || envsRes?.data || envsRes || [];
                setEnvironments(Array.isArray(envsData) ? envsData : []);
                const taskStatusesData = taskStatRes?.data?.statuts || taskStatRes?.data || taskStatRes || [];
                setTaskStatuses(Array.isArray(taskStatusesData) ? taskStatusesData : []);
                const prioritiesData = prioritiesRes?.data?.priorites || prioritiesRes?.data || prioritiesRes || [];
                setPriorities(Array.isArray(prioritiesData) ? prioritiesData : []);

                const cmRes = await api.get('/users?nom_role=CHANGE_MANAGER&limit=1000').catch(() => null);
                setChangeManagers(Array.isArray(cmRes?.data?.data) ? cmRes.data.data : []);

                const [impRes, demRes] = await Promise.all([
                    api.get('/users?nom_role=IMPLEMENTEUR&limit=1000').catch(() => null),
                    api.get('/users?nom_role=DEMANDEUR&limit=1000').catch(() => null)
                ]);
                setImplementeurs(Array.isArray(impRes?.data?.data) ? impRes.data.data : []);
                setDemandeurs(Array.isArray(demRes?.data?.data) ? demRes.data.data : []);
            } catch (err) {
                console.warn("Simulation Mode Actif");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const getStatusColor = (code) => {
        const s = (code || '').toUpperCase();
        if (s.includes('REUSSI') || s.includes('TERMINE') || s.includes('APPROUV') || s.includes('IMPLEMENTE') || s.includes('TESTE') || s === 'CLOTURE') return 'success';
        if (s.includes('REJET') || s.includes('ECHEC') || s.includes('ANNULE')) return 'danger';
        if (s.includes('PLANIF') || s.includes('COURS') || s.includes('ATTENTE') || s.includes('SOUMIS')) return 'warning';
        if (s.includes('EVALU')) return 'primary';
        return 'default';
    };

    const thStyle = { padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' };
    const tdStyle = { padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' };

    const filteredChangements = changements.filter(c => {
        const matchesSearch = (c.code_changement || '').toLowerCase().includes(searchTerm.toLowerCase()) || (c.rfc?.titre_rfc || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatut = !filterStatut || c.statut?.id_statut === Number(filterStatut);
        const matchesEnv = !filterEnvironnement || c.environnement?.id_env === Number(filterEnvironnement);
        const matchesPrio = !filterPriorite || c.priorite === filterPriorite;
        return matchesSearch && matchesStatut && matchesEnv && matchesPrio;
    });

    return (
        <div className="acl-container" style={{ padding: '2rem' }}>
            <div className="acl-header" style={{ marginBottom: '2rem' }}>
                <div className="acl-header-left">
                    <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>Gestion des Changements</h1>
                    <p style={{ margin: '0.2rem 0 0', color: '#64748b', fontWeight: 500 }}>Suivi et déploiement des interventions techniques</p>
                </div>
                <div className="acl-header-actions">
                    <button onClick={() => setShowCreateChange(true)} className="btn-create-premium">
                        <FiPlus /> Nouveau Changement
                    </button>
                </div>
            </div>

            <div className="acl-toolbar">
                <div className="acl-search-wrap">
                    <FiSearch className="acl-search-icon" />
                    <input 
                        type="text" placeholder="Rechercher un code ou titre..." 
                        value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="acl-search-input" 
                    />
                </div>
                <div className="acl-filter-row">
                    <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} className="acl-select">
                        <option value="">Tous les Statuts</option>
                        {changeStatuses.map(s => <option key={s.id_statut} value={s.id_statut}>{s.libelle}</option>)}
                    </select>
                    <select value={filterEnvironnement} onChange={e => setFilterEnvironnement(e.target.value)} className="acl-select">
                        <option value="">Tous les Envs</option>
                        {environments.map(e => <option key={e.id_env} value={e.id_env}>{e.nom_env}</option>)}
                    </select>
                    <button onClick={() => { setSearchTerm(''); setFilterStatut(''); setFilterEnvironnement(''); setFilterPriorite(''); }} className="acl-reset-btn">Réinitialiser</button>
                </div>
            </div>

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

          <th style={thStyle}>Demandeur</th>
          <th style={thStyle}>Responsable</th>
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
            <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              Chargement...
            </td>
          </tr>
        ) : filteredChangements.length === 0 ? (
          <tr>
            <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
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
                title={c.rfc?.titre_rfc || c.planChangement?.titre_plan || 'Changement Standard'}>
                {c.rfc?.titre_rfc || c.planChangement?.titre_plan || 'Changement Standard'}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>
                #{c.code_changement}
              </div>
            </td>

            {/* ── 2. Demandeur — avatar initiales */}
            <td style={tdStyle}>
              {(() => {
                const prenom = c.rfc ? (c.rfc.demandeur?.prenom_user || '') : (c.changeManager?.prenom_user || '');
                const nom    = c.rfc ? (c.rfc.demandeur?.nom_user    || '') : (c.changeManager?.nom_user    || '');
                const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
                const avatarColors = [
                  { bg: '#dbeafe', color: '#1d4ed8' },
                  { bg: '#d1fae5', color: '#065f46' },
                  { bg: '#fef3c7', color: '#92400e' },
                  { bg: '#ede9fe', color: '#5b21b6' },
                  { bg: '#fce7f3', color: '#9d174d' },
                  { bg: '#e0f2fe', color: '#0369a1' },
                ];
                const palette = avatarColors[(prenom.charCodeAt(0) || 0) % avatarColors.length];
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {initiales ? (
                      <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                        {initiales}
                      </div>
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiUser size={14} color="#94a3b8" />
                      </div>
                    )}
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {`${prenom || '—'} ${nom}`.trim()}
                    </span>
                  </div>
                );
              })()}
            </td>

            {/* ── 3. Responsable (Change Manager) — avatar initiales */}
            <td style={tdStyle}>
              {(() => {
                const prenom = c.changeManager?.prenom_user || '';
                const nom    = c.changeManager?.nom_user    || '';
                const initiales = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
                const avatarColors = [
                  { bg: '#dbeafe', color: '#1d4ed8' },
                  { bg: '#d1fae5', color: '#065f46' },
                  { bg: '#fef3c7', color: '#92400e' },
                  { bg: '#ede9fe', color: '#5b21b6' },
                  { bg: '#fce7f3', color: '#9d174d' },
                  { bg: '#e0f2fe', color: '#0369a1' },
                ];
                const palette = avatarColors[(prenom.charCodeAt(0) || 0) % avatarColors.length];
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {initiales ? (
                      <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.03em' }}>
                        {initiales}
                      </div>
                    ) : (
                      <div style={{ width: 34, height: 34, borderRadius: '10px', flexShrink: 0, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiUser size={14} color="#94a3b8" />
                      </div>
                    )}
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1e293b' }}>
                      {`${prenom || '—'} ${nom}`.trim() || 'Non assigné'}
                    </span>
                  </div>
                );
              })()}
            </td>

            {/* ── 4. Priorité */}
            <td style={tdStyle}>
              {(() => {
                const prio = c.priorite || (c.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : c.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE');
                const colors = {
                  'CRITIQUE': { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' },
                  'HAUTE':    { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' },
                  'MOYENNE':  { bg: '#fefce8', color: '#ca8a04', border: '#fef9c3' },
                  'BASSE':    { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' },
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
                {c.environnement?.nom_env || 'N/A'}
              </span>
            </td>

            {/* ── 7. Statut */}
            <td style={{ ...tdStyle, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
              <InlineEditableBadge
                currentValue={c.statut?.id_statut || c.id_statut || ''}
                label={c.statut?.libelle || 'N/A'}
                options={changeStatuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
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
                {c._count?.taches || c.taches?.length || 0} tâche{(c._count?.taches || c.taches?.length || 0) !== 1 ? 's' : ''}
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
                                    <FiEdit2 /> Modifier
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
                            <div className="acl-modal-grid" style={{ display: 'block' }}>
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
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiEdit2 /> Modifier le Changement</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Titre</label>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.titre} 
                                                            onChange={e => setEditForm({...editForm, titre: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }} 
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
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', minHeight: '80px', background: 'white' }} 
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
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date fin</label>
                                                        <input 
                                                            type="datetime-local" 
                                                            value={editForm.date_fin} 
                                                            onChange={e => setEditForm({...editForm, date_fin: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }} 
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
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Change Manager</label>
                                                        <select 
                                                            value={editForm.id_manager} 
                                                            onChange={e => setEditForm({...editForm, id_manager: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                        >
                                                            <option value="">Sélectionner...</option>
                                                            {changeManagers?.map(m => (
                                                                <option key={m?.id_user} value={m?.id_user}>{m?.prenom_user} {m?.nom_user}</option>
                                                            ))}
                                                        </select>
                                                    </div>
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
                    <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="acl-create-top">
                            <div className="acl-create-head-left">
                                <FiPlus className="acl-create-icon" />
                                <h2 className="acl-create-title">Nouveau Changement</h2>
                            </div>
                            <button onClick={closeModals} className="acl-close-btn-white"><FiX size={24} /></button>
                        </div>
                        <form onSubmit={handleCreateChangement}>
                            <div className="acl-modal-body">
                                <div className="acl-stack-lg">
                                    <div className="form-group">
                                        <label className="acl-label-xs">Titre du Changement</label>
                                        <input className="acl-search-input" value={createForm.titre} onChange={e => setCreateForm({...createForm, titre: e.target.value})} required />
                                    </div>
                                    <div className="acl-grid-2-1">
                                        <div className="form-group">
                                            <label className="acl-label-xs">Environnement</label>
                                            <select className="acl-select" value={createForm.id_env} onChange={e => setCreateForm({...createForm, id_env: e.target.value})} required>
                                                <option value="">Sélectionner...</option>
                                                {environments.map(ev => <option key={ev.id_env} value={ev.id_env}>{ev.nom_env}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label className="acl-label-xs">Priorité</label>
                                            <select className="acl-select" value={createForm.priorite} onChange={e => setCreateForm({...createForm, priorite: e.target.value})}>
                                                <option value="BASSE">Basse</option>
                                                <option value="MOYENNE">Moyenne</option>
                                                <option value="HAUTE">Haute</option>
                                                <option value="CRITIQUE">Critique</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="acl-label-xs">Description</label>
                                        <textarea className="acl-search-input" style={{ minHeight: '100px' }} value={createForm.description} onChange={e => setCreateForm({...createForm, description: e.target.value})} />
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

            {/* MODAL AFFICHAGE TÂCHES */}
            {showTasksModal && (
                <div className="modal-backdrop" onClick={closeModals}>
                    <div className="modal-box glass-card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                        <div className="acl-modal-top">
                            <div className="acl-modal-icon-wrap"><FiLayers /></div>
                            <div className="acl-grow">
                                <h2 className="acl-modal-title">Suivi Opérationnel des Tâches</h2>
                                <div className="acl-modal-subtitle">Interventions pour {selectedChangement?.code_changement}</div>
                            </div>
                            <button onClick={closeModals} className="acl-close-btn"><FiX size={24} /></button>
                        </div>

                        <div className="acl-modal-body">
                            {showNewTaskForm && (
                                <div style={{ background: 'transparent', padding: '1rem 0', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><FiPlus /> Créer une nouvelle tâche</h4>
                                    <form onSubmit={handleCreateTask}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                            <div>
                                                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Titre de la tâche *</label>
                                                <input 
                                                    type="text" 
                                                    value={newTaskForm.titre_tache} 
                                                    onChange={e => setNewTaskForm({...newTaskForm, titre_tache: e.target.value})}
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }} 
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
                                                style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '60px', background: 'white' }} 
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
                                                    style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }} 
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

            {/* MODAL RAPPORT AUDIT */}
            {showReportForm && (
                <div className="modal-backdrop" onClick={closeModals}>
                    <div className="modal-box glass-card" style={{ maxWidth: '600px', width: '100%' }} onClick={e => e.stopPropagation()}>
                        <div className="modal-header" style={{ padding: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
                            <h3 style={{ margin: 0, color: '#0f172a' }}>Générer le Rapport d'Audit</h3>
                        </div>
                        <div className="acl-modal-body">
                            <div className="acl-stack">
                                <input className="acl-search-input" placeholder="Titre du rapport" value={reportForm.titre_rapport} onChange={e => setReportForm({...reportForm, titre_rapport: e.target.value})} />
                                <textarea className="acl-search-input" style={{ minHeight: '150px' }} placeholder="Contenu du rapport..." value={reportForm.contenu_rapport} onChange={e => setReportForm({...reportForm, contenu_rapport: e.target.value})} />
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
        </div>
    );
};

export default AdminChangementList;
