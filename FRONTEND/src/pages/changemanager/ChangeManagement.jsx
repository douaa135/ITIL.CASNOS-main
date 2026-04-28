import React, { useState, useEffect } from 'react';
import { FiSearch, FiEdit3, FiTrash2, FiUser, FiInfo, FiSave, FiX, FiArrowRight, FiCalendar, FiList } from 'react-icons/fi';
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
      const [changesRes, implRes, statusRes] = await Promise.all([
        api.get('/changements', config).catch(() => null),
        api.get('/users?nom_role=IMPLEMENTEUR', config).catch(() => null),
        api.get('/statuts?contexte=CHANGEMENT', config).catch(() => null),
      ]);

      const extract = (res, key) => res?.data?.[key] || res?.data || null;

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

  const handleTaskAssign = async (taskId) => {
    const newUserId = taskEdits[taskId];
    if (!newUserId) return alert('Sélectionnez un implémenteur pour cette tâche.');
    setTaskAssigning(taskId);
    try {
      const res = await updateTache(taskId, { id_user: newUserId });
      if (res) {
        setTasks((prev) => prev.map((task) => task.id_tache === taskId ? { ...task, implementeur: implementers.find((imp) => imp.id_user === newUserId) || task.implementeur } : task));
        alert('Implémenteur de tâche mis à jour.');
      } else {
        alert(res.message || 'Impossible de mettre à jour l implémenteur de la tâche.');
      }
    } catch (error) {
      console.error('Erreur mise à jour tâche', error);
      alert('Erreur lors de la mise à jour de la tâche.');
    } finally {
      setTaskAssigning(null);
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
        <div className="changes-header">
          <div>
            <h1>Gestion des changements</h1>
          </div>
          <div className="search-wrapper">
            <FiSearch />
            <input
              type="text"
              placeholder="Rechercher par code, titre, implémenteur..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="kpi-row">
          <div className="kpi-card">
            <span className="kpi-label">Total changements</span>
            <strong>{kpi.total}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Assignés</span>
            <strong>{kpi.assigned}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">Non assignés</span>
            <strong>{kpi.unassigned}</strong>
          </div>
          <div className="kpi-card">
            <span className="kpi-label">En planification</span>
            <strong>{kpi.inPlanning}</strong>
          </div>
        </div>

        <div className="filters-row">
          <div className="filter-field">
            <label>Filtrer par statut</label>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
              <option value="">Tous les statuts</option>
              {statusOptions.map((status) => (
                <option key={status.code} value={status.code}>{status.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label>Filtrer par type</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value)}>
              <option value="">Tous les types</option>
              {typeOptions.map((type) => (
                <option key={type.type} value={type.type}>{type.type}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="changes-table-wrapper">
          <table className="changes-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Titre</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Implémenteur</th>
                <th>Début</th>
                <th>Fin</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredChanges.length === 0 ? (
                <tr>
                  <td colSpan="7" className="empty-row">Aucun changement trouvé.</td>
                </tr>
              ) : (
                filteredChanges.map((change) => (
                  <tr
                    key={change.id_changement}
                    className={selectedChange?.id_changement === change.id_changement ? 'selected-row' : ''}
                    onClick={() => handleSelectChange(change)}
                  >
                    <td>{change.code_changement || '—'}</td>
                    <td>{getChangeTitle(change)}</td>
                    <td>{change.rfc?.typeRfc?.type || change.type || '—'}</td>
                    <td>{change.statut?.libelle || '—'}</td>
                    <td>{change.implementeur ? `${change.implementeur.prenom_user} ${change.implementeur.nom_user}` : 'Non assigné'}</td>
                    <td>{formatDate(change.date_debut)}</td>
                    <td>{formatDate(change.date_fin)}</td>
                    <td className="actions-cell">
                      <button className="btn-secondary" onClick={(e) => { e.stopPropagation(); handleSelectChange(change); }}>
                        <FiInfo /> Détails
                      </button>
                      <button className="btn-primary" onClick={(e) => { e.stopPropagation(); handleSelectChange(change, true); }}>
                        <FiEdit3 /> Modifier
                      </button>
                      <button className="btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(change); }}>
                        <FiTrash2 />
                      </button>
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
                    <span className="detail-meta-chip">Priorité : {selectedChange.priorite || 'NORMALE'}</span>
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
                      tasks.map((task) => (
                        <div key={task.id_tache} className="task-item">
                          <div className="task-item-top">
                            <span className="task-code">{task.code_tache}</span>
                            <span className={`task-status ${task.statut?.code_statut?.toLowerCase()}`}>
                              {task.statut?.libelle || 'Statut non défini'}
                            </span>
                          </div>
                          <h4 className="task-title">{task.titre_tache}</h4>
                          <p className="task-description">{task.description || 'Aucune description.'}</p>
                          <div className="task-action-row">
                            <div className="task-assign-select">
                              <label>Implémenteur</label>
                              <select
                                value={taskEdits[task.id_tache] || ''}
                                onChange={(e) => setTaskEdits((prev) => ({ ...prev, [task.id_tache]: e.target.value }))}
                              >
                                <option value="">Non assigné</option>
                                {implementers.map((imp) => (
                                  <option key={imp.id_user} value={imp.id_user}>
                                    {imp.prenom_user} {imp.nom_user}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={() => handleTaskAssign(task.id_tache)}
                              disabled={taskAssigning === task.id_tache}
                            >
                              {taskAssigning === task.id_tache ? 'Enregistrement...' : 'Mettre à jour'}
                            </button>
                          </div>
                        </div>
                      ))
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
