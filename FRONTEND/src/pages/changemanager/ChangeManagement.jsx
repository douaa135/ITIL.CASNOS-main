import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiEdit3, FiTrash2, FiUser, FiInfo, FiSave, FiX, 
  FiArrowRight, FiCalendar, FiList, FiRefreshCw, FiFileText, 
  FiUsers, FiAlertCircle 
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import {
  assignImplementer,
  createTache,
  deleteChangement,
  getAllChangements,
  getChangeStatuses,
  getImplementers,
  getTasksByChange,
  updateChangement,
  updateChangementStatus,
  updateTache,
} from '../../services/changeService';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import Badge from '../../components/common/Badge';
import { CHANGE_TRANSITIONS } from '../../utils/constants';
import './ChangeManagement.css';
import '../demandeur/RfcDetail.css';

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return isNaN(date.getTime()) ? value : date.toLocaleDateString('fr-FR');
};

const getChangeTitle = (change) => change.rfc?.titre_rfc || change.planChangement?.titre_plan || 'Changement';

const ChangeManagement = () => {
  const [changements, setChangements] = useState([]);
  const [implementers, setImplementers] = useState([]);
  const [selectedChange, setSelectedChange] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [formValues, setFormValues] = useState({
    titre: '',
    description: '',
    priorite: '',
    date_debut: '',
    date_fin: '',
    id_implementeur: '',
  });
  const [assignId, setAssignId] = useState('');
  const [saving, setSaving] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [taskEdits, setTaskEdits] = useState({});
  const [taskAssigning, setTaskAssigning] = useState(null);
  const [changeStatuses, setChangeStatuses] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [statusComment, setStatusComment] = useState('');
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [newTask, setNewTask] = useState({
    titre_tache: '',
    description: '',
    id_user: '',
    ordre_tache: 1,
    duree: 2,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const config = { skipRedirect: true };
      const [changesRes, implRes, statusRes, taskStatusRes] = await Promise.all([
        api.get('/changements', config).catch(() => null),
        api.get('/users?nom_role=IMPLEMENTEUR', config).catch(() => null),
        api.get('/statuts?contexte=CHANGEMENT', config).catch(() => null),
        api.get('/statuts?contexte=TACHE', config).catch(() => null),
      ]);

      const extract = (res, key) => {
        if (!res) return null;
        // The backend R.success wraps everything in a 'data' property.
        if (res.data && res.data[key]) return res.data[key];
        if (res[key]) return res[key];
        if (res.data && Array.isArray(res.data)) return res.data;
        return null;
      };

      const changesData = extract(changesRes, 'changements') || extract(changesRes, 'data');
      if (changesData && Array.isArray(changesData)) {
        setChangements(changesData);
      } else {
        // Mock Changes fallback
        setChangements([
          { id_changement: 1, code_changement: 'CHG-MOCK-01', description: 'Maintenance préventive', statut: { libelle: 'En planification', code_statut: 'EN_PLANIFICATION' }, date_debut: new Date().toISOString() },
          { id_changement: 2, code_changement: 'CHG-MOCK-02', description: 'Mise à jour sécurité', statut: { libelle: 'En cours', code_statut: 'EN_COURS' }, date_debut: new Date().toISOString() }
        ]);
      }

      const implData = extract(implRes, 'data') || extract(implRes, 'users');
      if (implData && Array.isArray(implData)) {
        setImplementers(implData);
      } else {
        setImplementers([
          { id_user: 1, nom_user: 'Système', prenom_user: 'Admin' },
          { id_user: 2, nom_user: 'Dupont', prenom_user: 'Jean' }
        ]);
      }

      const statusData = extract(statusRes, 'statuts');
      if (statusData) {
        setChangeStatuses(statusData);
      }
      const taskStatusData = extract(taskStatusRes, 'statuts');
      if (taskStatusData) {
        setTaskStatuses(taskStatusData);
      }
    } catch (error) {
      console.warn('Utilisation du mode secours pour le gestionnaire de changements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (implementers.length && !newTask.id_user) {
      setNewTask((prev) => ({ ...prev, id_user: implementers[0]?.id_user || '' }));
    }
  }, [implementers, newTask.id_user]);

  const fetchTasks = async (idChangement) => {
    if (!idChangement) return;
    setTasksLoading(true);
    try {
      const res = await getTasksByChange(idChangement);
      if (res) {
        const taches = res || [];
        setTasks(taches);
        setTaskEdits(taches.reduce((acc, t) => ({ ...acc, [t.id_tache]: t.implementeur?.id_user || '' }), {}));
      }
    } catch (error) {
      console.error('Erreur de chargement des tâches :', error);
      setTasks([]);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleSelectChange = (change, makeEdit = false) => {
    setSelectedChange(change);
    setShowModal(true);
    setAssignId(change.implementeur?.id_user || '');
    setFormValues({
      titre: change.planChangement?.titre_plan || change.rfc?.titre_rfc || '',
      description: change.planChangement?.etapes_plan || change.description || change.rfc?.description || '',
      priorite: change.rfc?.urgence ? 'HAUTE' : 'BASSE',
      date_debut: change.date_debut ? change.date_debut.slice(0, 10) : '',
      date_fin: change.date_fin_prevu ? change.date_fin_prevu.slice(0, 10) : '',
      id_implementeur: change.implementeur?.id_user || '',
    });
    setEditMode(makeEdit);
    setStatusComment('');
    fetchTasks(change.id_changement);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
  };

  const handleAssign = async () => {
    if (!selectedChange) return;
    if (!assignId) return alert('Sélectionnez un implémenteur avant d’assigner.');
    setSaving(true);
    try {
      const res = await assignImplementer(selectedChange.id_changement, assignId);
      if (res) {
        const updated = res;
        setSelectedChange(updated);
        setChangements((prev) => prev.map((change) => (change.id_changement === updated.id_changement ? updated : change)));
        alert('Implémenteur assigné avec succès.');
      } else {
        alert(res.message || 'Impossible d’assigner cet implémenteur.');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de l assignment de l implémenteur.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (event) => {
    event.preventDefault();
    if (!selectedChange) return;
    setSaving(true);
    try {
      const payload = {
        date_debut: formValues.date_debut || undefined,
        date_fin_prevu: formValues.date_fin || undefined,
        id_user: formValues.id_implementeur || undefined,
        plan_changement: {
          titre_plan: formValues.titre,
          etapes_plan: formValues.description
        }
      };
      const res = await updateChangement(selectedChange.id_changement, payload);
      if (res) {
        const updated = res;
        setSelectedChange(updated);
        setChangements((prev) => prev.map((change) => (change.id_changement === updated.id_changement ? updated : change)));
        setEditMode(false);
        alert('Changement mis à jour avec succès.');
      } else {
        alert(res.message || 'Impossible de modifier le changement.');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la mise à jour du changement.');
    } finally {
      setSaving(false);
    }
  };

  const handleChangeStatus = async (targetCode) => {
    if (!selectedChange) return;
    const targetStatus = changeStatuses.find((status) => status.code_statut === targetCode);
    if (!targetStatus) {
      return alert(`Statut introuvable : ${targetCode}`);
    }

    const confirmMessage = targetCode === 'EN_ECHEC'
      ? 'Rejeter ce changement et marquer en échec ?'
      : 'Valider ce changement ?';
    if (!window.confirm(confirmMessage)) return;

    setSaving(true);
    try {
      const res = await updateChangementStatus(selectedChange.id_changement, targetStatus.id_statut, statusComment);
      if (res) {
        const updated = res;
        setSelectedChange(updated);
        setChangements((prev) => prev.map((change) => (change.id_changement === updated.id_changement ? updated : change)));
        setStatusComment('');
        alert(`Statut changé : ${targetStatus.libelle}`);
      } else {
        alert(res.message || 'Impossible de changer le statut.');
      }
    } catch (error) {
      console.error('Erreur de mise à jour du statut', error);
      alert('Erreur lors de la modification du statut.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (change) => {
    if (!window.confirm(`Supprimer le changement ${change.code_changement || ''} ?`)) return;
    setSaving(true);
    try {
      const res = await deleteChangement(change.id_changement);
      if (res) {
        setChangements((prev) => prev.filter((item) => item.id_changement !== change.id_changement));
        if (selectedChange?.id_changement === change.id_changement) {
          setSelectedChange(null);
          setEditMode(false);
          setTasks([]);
          setTaskEdits({});
        }
        alert('Changement supprimé.');
      } else {
        alert(res.message || 'Impossible de supprimer le changement.');
      }
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la suppression du changement.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTask = async (event) => {
    event.preventDefault();
    if (!selectedChange) return;
    setTasksLoading(true);
    try {
      const res = await createTache(selectedChange.id_changement, newTask);
      if (res) {
        await fetchTasks(selectedChange.id_changement);
        setNewTask((prev) => ({ ...prev, titre_tache: '', description: '', ordre_tache: 1, duree: 2 }));
        alert('Tâche ajoutée au plan de changement.');
      } else {
        alert(res.message || 'Impossible de créer la tâche.');
      }
    } catch (error) {
      console.error('Erreur création tâche', error);
      alert('Erreur lors de la création de la tâche.');
    } finally {
      setTasksLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId, payload) => {
    setTaskAssigning(taskId);
    try {
      const res = await updateTache(taskId, payload);
      if (res) {
        setTasks((prev) => prev.map((task) => task.id_tache === taskId ? { ...task, ...res } : task));
        // alert('Tâche mise à jour.');
      }
    } catch (error) {
      console.error('Erreur mise à jour tâche', error);
      alert('Erreur lors de la mise à jour de la tâche.');
    } finally {
      setTaskAssigning(null);
    }
  };

  const handleTaskStatusUpdate = async (taskId, newStatusId) => {
    setTaskAssigning(taskId);
    try {
      const res = await api.patch(`/taches/${taskId}/statut`, { id_statut: newStatusId });
      if (res.data) {
        await fetchTasks(selectedChange.id_changement);
      }
    } catch (error) {
      console.error('Erreur statut tâche', error);
      alert('Erreur lors du changement de statut de la tâche.');
    } finally {
      setTaskAssigning(null);
    }
  };

  const handleUpdateImplementer = async (changeId, newUserId) => {
    try {
      await api.patch(`/changements/${changeId}`, { id_user_implementeur: newUserId });
      loadData();
    } catch (error) {
      console.error('Erreur update implementeur', error);
      alert('Erreur lors de la mise à jour de l\'implémenteur.');
    }
  };

  const statusOptions = [...changeStatuses]
    .sort((a, b) => {
      const order = ['SOUMIS', 'PLANIFIE', 'EN_COURS', 'TERMINE', 'REUSSI', 'ECHEC', 'ANNULE'];
      const idxA = order.indexOf(a.code_statut);
      const idxB = order.indexOf(b.code_statut);
      return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
    })
    .map((status) => ({
      code: status.code_statut,
      label: status.libelle,
    }))
    .filter((status) => status.code);

  const typeOptions = Array.from(
    new Map(
      changements
        .map((change) => {
          const type = change.rfc?.typeRfc?.type || change.type || '';
          return [type, { type }];
        })
        .filter(([type]) => type)
    ).values()
  );

  const filteredChanges = Array.isArray(changements) ? changements.filter((change) => {
    if (!change) return false;
    const query = search?.trim().toLowerCase() || '';
    const typeName = change.rfc?.typeRfc?.type || change.type || '';
    const statusCode = change.statut?.code_statut || '';

    const matchesType = !filterType || typeName === filterType;
    const matchesStatus = !filterStatus || statusCode === filterStatus;

    const items = [
      change.code_changement,
      change.titre_changement,
      change.rfc?.titre_rfc,
      change.description,
      change.implementeur?.prenom_user,
      change.implementeur?.nom_user,
      change.statut?.libelle,
      typeName,
    ];

    const matchesSearch = !query || items.some((item) => item?.toString().toLowerCase().includes(query));
    return matchesSearch && matchesType && matchesStatus;
  }) : [];

  const kpi = {
    total: changements.length,
    assigned: changements.filter((change) => !!change.implementeur).length,
    unassigned: changements.filter((change) => !change.implementeur).length,
    inPlanning: changements.filter((change) => change.statut?.code_statut === 'EN_PLANIFICATION').length,
  };

  if (loading) {
    return <div className="change-management-page"><div className="loading-box">Chargement des changements...</div></div>;
  }

  return (
    <div className="change-management-page">
      <section className="changes-list-section">
        <div className="premium-header-card">
          <div className="premium-header-left">
            <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiList /></div>
            <div className="premium-header-text">
              <h1>Gestion des changements</h1>
              <p>Pilotez l'ensemble des changements et leur avancement ·</p>
            </div>
          </div>
          <div className="premium-header-actions">
            <button className="btn-create-premium" onClick={() => loadData()} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
              <FiRefreshCw /> Actualiser
            </button>
          </div>
        </div>

        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          <div className="stat-card blue">
            <div className="stat-icon-wrapper"><FiFileText size={24} /></div>
            <div className="stat-info">
              <div className="stat-value">{kpi.total}</div>
              <div className="stat-label">Total changements</div>
            </div>
          </div>
          <div className="stat-card green">
            <div className="stat-icon-wrapper"><FiUsers size={24} /></div>
            <div className="stat-info">
              <div className="stat-value">{kpi.assigned}</div>
              <div className="stat-label">Assignés</div>
            </div>
          </div>
          <div className="stat-card amber">
            <div className="stat-icon-wrapper"><FiAlertCircle size={24} /></div>
            <div className="stat-info">
              <div className="stat-value">{kpi.unassigned}</div>
              <div className="stat-label">Non assignés</div>
            </div>
          </div>
          <div className="stat-card purple">
            <div className="stat-icon-wrapper"><FiCalendar size={24} /></div>
            <div className="stat-info">
              <div className="stat-value">{kpi.inPlanning}</div>
              <div className="stat-label">En planification</div>
            </div>
          </div>
        </div>

        <div className="filters-row" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="filter-field" style={{ flex: 1, minWidth: '300px' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Rechercher</label>
            <div style={{ position: 'relative' }}>
              <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
              <input
                type="text"
                placeholder="Rechercher par code, titre, implémenteur..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.4rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', outline: 'none' }}
              />
            </div>
          </div>
          <div className="filter-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Filtrer par statut</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: '600', minWidth: '180px' }}>
              <option value="">Tous les statuts</option>
              {statusOptions.map((status) => (
                <option key={status.code} value={status.code}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.82rem', fontWeight: '700', color: '#475569' }}>Filtrer par type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: 'white', fontWeight: '600', minWidth: '180px' }}>
              <option value="">Tous les types</option>
              {typeOptions.map((type) => (
                <option key={type.type} value={type.type}>{type.type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="changes-table-wrapper">
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
              {filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan="9" className="acl-empty-cell">Aucun changement trouvé.</td>
                </tr>
              ) : (
                filteredChanges.map((change, index) => (
                  <tr
                    key={change.id_changement}
                    className={`acl-row ${index % 2 === 0 ? 'even' : 'odd'} ${selectedChange?.id_changement === change.id_changement ? 'selected-row' : ''}`}
                    onClick={() => handleSelectChange(change)}
                  >
                    <td className="acl-td">
                      <div className="acl-title" style={{ maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '0.2rem' }} title={getChangeTitle(change)}>
                        {getChangeTitle(change)}
                      </div>
                      <div className="acl-code">#{change.code_changement}</div>
                    </td>
                    <td className="acl-td">
                      <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#475569' }}>
                        {change.rfc ? `${change.rfc.demandeur?.prenom_user || ''} ${change.rfc.demandeur?.nom_user || ''}` : `${change.changeManager?.prenom_user || '—'} ${change.changeManager?.nom_user || ''}`}
                      </div>
                    </td>
                    <td className="acl-td">
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div className="acl-manager-avatar" style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>
                          {(change.changeManager?.prenom_user?.[0] || '—').toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#1e293b' }}>
                          {`${change.changeManager?.prenom_user || '—'} ${change.changeManager?.nom_user || ''}`.trim() || 'Non assigné'}
                        </span>
                      </div>
                    </td>
                    <td className="acl-td">
                      {(() => {
                        const prio = change.priorite || (change.rfc?.typeRfc?.type === 'URGENT' ? 'HAUTE' : (change.rfc?.typeRfc?.type === 'NORMAL' ? 'MOYENNE' : 'BASSE'));
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
                      <Badge variant={change.rfc?.evaluationRisque?.score_risque > 15 ? 'danger' : change.rfc?.evaluationRisque?.score_risque > 8 ? 'warning' : 'success'}>
                        {change.rfc?.evaluationRisque?.score_risque || '—'}
                      </Badge>
                    </td>
                    <td className="acl-td">
                      <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.78rem', fontWeight: '600', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}>
                        {change.environnement?.nom_env || 'N/A'}
                      </span>
                    </td>
                    <td className="acl-td" onClick={(e) => e.stopPropagation()}>
                        <InlineEditableBadge
                            currentValue={change.statut?.id_statut}
                            currentCode={change.statut?.code_statut}
                            label={change.statut?.libelle}
                            options={changeStatuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                            allowedCodes={CHANGE_TRANSITIONS[change.statut?.code_statut] || []}
                            getVariant={(val) => {
                                const s = changeStatuses.find(st => st.id_statut == val);
                                if (!s) return 'default';
                                const c = s.code_statut;
                                if (c.includes('REUSSI') || c.includes('TERMINE') || c.includes('IMPLEMENTE') || c.includes('TESTE') || c === 'CLOTURE') return 'success';
                                if (c.includes('ECHEC') || c.includes('REJET')) return 'danger';
                                if (c.includes('COURS') || c.includes('PLANIFI') || c.includes('ATTENTE') || c === 'SOUMIS') return 'warning';
                                return 'primary';
                            }}
                            onUpdate={async (newId) => {
                                try {
                                    await updateChangementStatus(change.id_changement, newId, '');
                                    loadData();
                                } catch (err) {
                                    const msg = err?.response?.data?.message || err?.message || 'Erreur lors du changement de statut.';
                                    alert(`⚠ ${msg}`);
                                }
                            }}
                            isEditable={true}
                            dropdownPosition="up"
                        />
                    </td>
                    <td className="acl-td" onClick={(e) => { e.stopPropagation(); handleSelectChange(change); }} style={{ cursor: 'pointer' }}>
                        <Badge variant="default" style={{ textDecoration: 'underline', color: '#3b82f6' }}>
                            {(change._count?.taches || change.taches?.length || 0)} tâche(s)
                        </Badge>
                    </td>
                    <td className="acl-td" style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                        <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); handleSelectChange(change); }} title="Détails" style={{ padding: '0.4rem' }}>
                          <FiInfo size={16} />
                        </button>
                        <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleSelectChange(change, true); }} title="Modifier" style={{ padding: '0.4rem' }}>
                          <FiEdit3 size={16} />
                        </button>
                        <button className="btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(change); }} title="Supprimer" style={{ padding: '0.4rem' }}>
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selectedChange && showModal && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="change-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="detail-hero-card">
              <div className="detail-hero-top">
                <div className="detail-hero-left">
                  <div className="detail-rfc-id"><FiInfo size={12} />{selectedChange.code_changement || 'Changement'}</div>
                  <div className="detail-title">{getChangeTitle(selectedChange)}</div>
                  <div className="detail-meta-tags">
                    <span className={`detail-meta-chip priority-${(selectedChange.priorite || 'BASSE').toLowerCase()}`}>
                      Priorité : {selectedChange.priorite || 'BASSE'}
                    </span>
                    <span className="detail-meta-chip">Status : {selectedChange.statut?.libelle || 'Non défini'}</span>
                  </div>
                </div>
                <div className="detail-hero-right">
                  <span className="status-big-badge">{selectedChange.statut?.libelle || 'Statut inconnu'}</span>
                  <button className="modal-close-button" type="button" onClick={closeModal}>
                    <FiX />
                  </button>
                </div>
              </div>
              <div className="detail-hero-bottom" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                <div className="detail-info-item">
                  <span className="detail-info-label"><FiCalendar size={12} />Date de début</span>
                  <span className="detail-info-value">{formatDate(selectedChange.date_debut)}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-info-label"><FiCalendar size={12} />Date de fin</span>
                  <span className="detail-info-value">{formatDate(selectedChange.date_fin)}</span>
                </div>
                <div className="detail-info-item">
                  <span className="detail-info-label"><FiUser size={12} />Implémenteur</span>
                  <span className="detail-info-value">{selectedChange.implementeur ? `${selectedChange.implementeur.prenom_user} ${selectedChange.implementeur.nom_user}` : 'Non assigné'}</span>
                </div>
              </div>
            </div>

            <div className="detail-layout" style={{ gridTemplateColumns: '1fr 340px' }}>
              <div className="detail-main">
                <div className="section-card">
                  <div className="section-card-header">
                    <div className="section-card-title"><FiInfo /> Détails du changement</div>
                  </div>
                  <div className="section-card-body">
                    <div className="desc-block">
                      <span className="desc-label">Description</span>
                      <p className="desc-text">{selectedChange.description || selectedChange.rfc?.description || 'Aucune description disponible.'}</p>
                    </div>
                    <div className="desc-block">
                      <span className="desc-label">Type de changement</span>
                      <p className="desc-text">{selectedChange.rfc?.typeRfc?.type || selectedChange.type || '—'}</p>
                    </div>
                    <div className="desc-block">
                      <span className="desc-label">Demandeur</span>
                      <p className="desc-text">{selectedChange.demandeur ? `${selectedChange.demandeur.prenom_user} ${selectedChange.demandeur.nom_user}` : '—'}</p>
                    </div>
                    <div className="desc-block">
                      <span className="desc-label">Commentaires internes</span>
                      <p className="desc-text">{selectedChange.commentaire || 'Pas de commentaire enregistré.'}</p>
                    </div>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-card-header">
                    <div className="section-card-title"><FiList /> Planification des tâches</div>
                  </div>
                  <div className="section-card-body">
                    {tasksLoading ? (
                      <p className="loading-text">Chargement des tâches...</p>
                    ) : tasks.length === 0 ? (
                      <p className="loading-text">Aucune tâche planifiée pour ce changement.</p>
                    ) : (
                      <div className="tasks-table-container">
                        <table className="tasks-table-v2">
                          <thead>
                            <tr>
                              <th>Code</th>
                              <th>Titre</th>
                              <th>Description</th>
                              <th>Statut</th>
                              <th>Implémenteur</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {tasks.map((task) => (
                              <tr key={task.id_tache}>
                                <td className="task-code-cell">{task.code_tache}</td>
                                <td className="task-title-cell">{task.titre_tache}</td>
                                <td className="task-desc-cell">{task.description || '—'}</td>
                                <td className="task-status-cell">
                                  <InlineEditableBadge
                                    currentValue={task.id_statut || task.statut?.id_statut}
                                    currentCode={task.statut?.code_statut}
                                    options={taskStatuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                                    getVariant={(val) => {
                                      const s = taskStatuses.find(st => st.id_statut == val);
                                      return s?.code_statut?.toLowerCase() || 'default';
                                    }}
                                    onUpdate={(newId) => handleTaskStatusUpdate(task.id_tache, newId)}
                                    isEditable={true}
                                    dropdownPosition="up"
                                  />
                                </td>
                                <td className="task-imp-cell">
                                  <InlineEditableBadge
                                    currentValue={task.id_user || task.implementeur?.id_user}
                                    options={implementers.map(imp => ({ value: imp.id_user, label: `${imp.prenom_user} ${imp.nom_user}` }))}
                                    getVariant={() => 'info'}
                                    onUpdate={(newId) => handleTaskUpdate(task.id_tache, { id_user: newId })}
                                    isEditable={true}
                                    dropdownPosition="up"
                                    label={task.implementeur ? `${task.implementeur.prenom_user} ${task.implementeur.nom_user}` : 'Non assigné'}
                                  />
                                </td>
                                <td className="task-actions-cell">
                                   {taskAssigning === task.id_tache ? (
                                      <span className="task-loading-spin">...</span>
                                   ) : (
                                      <button className="btn-icon-danger" onClick={async () => {
                                        if(window.confirm('Supprimer cette tâche ?')) {
                                          await api.delete(`/taches/${task.id_tache}`);
                                          fetchTasks(selectedChange.id_changement);
                                        }
                                      }}><FiTrash2 size={14}/></button>
                                   )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <form className="new-task-form" onSubmit={handleCreateTask}>
                      <div className="form-title-row">
                        <h4>Nouvelle tâche</h4>
                      </div>
                      <div className="task-input-row">
                        <div className="task-input-group">
                          <label>Titre de la tâche</label>
                          <input
                            value={newTask.titre_tache}
                            onChange={(e) => setNewTask((prev) => ({ ...prev, titre_tache: e.target.value }))}
                            placeholder="Titre de la tâche"
                          />
                        </div>
                        <div className="task-input-group">
                          <label>Implémenteur</label>
                          <select
                            value={newTask.id_user}
                            onChange={(e) => setNewTask((prev) => ({ ...prev, id_user: e.target.value }))}
                          >
                            <option value="">Choisir un implémenteur</option>
                            {implementers.map((imp) => (
                              <option key={imp.id_user} value={imp.id_user}>
                                {imp.prenom_user} {imp.nom_user}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="task-input-row">
                        <div className="task-input-group">
                          <label>Ordre</label>
                          <input
                            type="number"
                            min="1"
                            value={newTask.ordre_tache}
                            onChange={(e) => setNewTask((prev) => ({ ...prev, ordre_tache: Number(e.target.value) }))}
                          />
                        </div>
                        <div className="task-input-group">
                          <label>Durée (h)</label>
                          <input
                            type="number"
                            min="1"
                            value={newTask.duree}
                            onChange={(e) => setNewTask((prev) => ({ ...prev, duree: Number(e.target.value) }))}
                          />
                        </div>
                      </div>
                      <button type="submit" className="btn-primary" disabled={tasksLoading}>
                        Ajouter la tâche
                      </button>
                    </form>
                  </div>
                </div>

                <div className="section-card">
                  <div className="section-card-header">
                    <div className="section-card-title"><FiUser /> Assignation</div>
                  </div>
                  <div className="section-card-body">
                    <form className="details-form" onSubmit={handleSaveEdit}>
                      <div className="detail-row">
                        <strong>Code</strong>
                        <span>{selectedChange.code_changement || '—'}</span>
                      </div>
                      <div className="detail-row">
                        <strong>Titre</strong>
                        {editMode ? (
                          <input
                            value={formValues.titre}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, titre: e.target.value }))}
                          />
                        ) : (
                          <span>{getChangeTitle(selectedChange)}</span>
                        )}
                      </div>
                      <div className="detail-row split-row">
                        <div>
                          <strong>Date de début</strong>
                          {editMode ? (
                            <input
                              type="date"
                              value={formValues.date_debut}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, date_debut: e.target.value }))}
                            />
                          ) : (
                            <span>{formatDate(selectedChange.date_debut)}</span>
                          )}
                        </div>
                        <div>
                          <strong>Date de fin</strong>
                          {editMode ? (
                            <input
                              type="date"
                              value={formValues.date_fin}
                              onChange={(e) => setFormValues((prev) => ({ ...prev, date_fin: e.target.value }))}
                            />
                          ) : (
                            <span>{formatDate(selectedChange.date_fin)}</span>
                          )}
                        </div>
                      </div>
                      <div className="detail-row">
                        <strong>Implémenteur</strong>
                        {editMode ? (
                          <select
                            value={formValues.id_implementeur}
                            onChange={(e) => setFormValues((prev) => ({ ...prev, id_implementeur: e.target.value }))}
                          >
                            <option value="">Non défini</option>
                            {implementers.map((imp) => (
                              <option key={imp.id_user} value={imp.id_user}>
                                {imp.prenom_user} {imp.nom_user}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span>{selectedChange.implementeur ? `${selectedChange.implementeur.prenom_user} ${selectedChange.implementeur.nom_user}` : 'Non assigné'}</span>
                        )}
                      </div>
                      <div className="detail-buttons-row">
                        {editMode ? (
                          <>
                            <button type="submit" className="btn-primary" disabled={saving}>
                              <FiSave /> Enregistrer
                            </button>
                            <button type="button" className="btn-secondary" onClick={() => setEditMode(false)} disabled={saving}>
                              <FiX /> Annuler
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn-primary" onClick={() => setEditMode(true)}>
                            <FiEdit3 /> Modifier
                          </button>
                        )}
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="detail-sidebar">
                <div className="sidebar-widget">
                  <div className="sidebar-widget-header"><FiInfo size={14} /> Détails de l'état</div>
                  <div className="sidebar-widget-body">
                    <div className="info-row">
                      <span className="info-key">Statut</span>
                      <span className="info-val">{selectedChange.statut?.libelle || '—'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">Priorité</span>
                      <span className="info-val">{selectedChange.priorite || '—'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">Demandeur</span>
                      <span className="info-val">{selectedChange.demandeur ? `${selectedChange.demandeur.prenom_user} ${selectedChange.demandeur.nom_user}` : '—'}</span>
                    </div>
                    <div className="info-row">
                      <span className="info-key">Implémenteur</span>
                      <span className="info-val">{selectedChange.implementeur ? `${selectedChange.implementeur.prenom_user} ${selectedChange.implementeur.nom_user}` : 'Non assigné'}</span>
                    </div>
                  </div>
                </div>

                <div className="sidebar-widget">
                  <div className="sidebar-widget-header"><FiInfo size={14} /> Actions rapides</div>
                  <div className="sidebar-widget-body">
                    <button className="btn-primary" type="button" onClick={() => setEditMode(true)} style={{ width: '100%', marginBottom: '0.75rem' }}>
                      <FiEdit3 /> Modifier
                    </button>
                    <button className="btn-secondary" type="button" onClick={handleAssign} style={{ width: '100%', marginBottom: '0.75rem' }} disabled={!assignId || saving}>
                      <FiArrowRight /> Assigner
                    </button>
                    <div className="status-action-block">
                      <label>Commentaire de décision</label>
                      <textarea
                        value={statusComment}
                        onChange={(e) => setStatusComment(e.target.value)}
                        placeholder="Motif de validation/rejet"
                      />
                      <button
                        className="btn-primary"
                        type="button"
                        onClick={() => handleChangeStatus('TERMINE')}
                        disabled={saving}
                      >
                        Valider
                      </button>
                      <button
                        className="btn-danger"
                        type="button"
                        onClick={() => handleChangeStatus('EN_ECHEC')}
                        disabled={saving}
                      >
                        Rejeter
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChangeManagement;