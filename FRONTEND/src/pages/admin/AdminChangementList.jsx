import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiSearch, FiEdit3, FiTrash2, FiUser, FiInfo, FiSave, FiX, 
  FiArrowRight, FiCalendar, FiList, FiRefreshCw, FiFileText, 
  FiUsers, FiAlertCircle, FiCheckCircle, FiClock, FiLayers,
  FiChevronLeft, FiChevronRight, FiChevronsLeft, FiChevronsRight, FiActivity,
  FiPlus, FiCheck
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import changeService from '../../services/changeService';
import dashboardService from '../../services/dashboardService';
import ConfirmModal from '../../components/common/ConfirmModal';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import Badge from '../../components/common/Badge';
import Toast from '../../components/common/Toast';
import { CHANGE_TRANSITIONS } from '../../utils/constants';
import rfcService from '../../services/rfcService';
import './AdminChangementList.css';
import '../demandeur/RfcDetail.css';

const ITEMS_PER_PAGE = 100;

const AdminChangementList = () => {
  const [changements, setChangements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [kpiFilter, setKpiFilter] = useState('');
  const [selectedChange, setSelectedChange] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [changeStatuses, setChangeStatuses] = useState([]);
  const [taskStatuses, setTaskStatuses] = useState([]);
  const [implementers, setImplementers] = useState([]);
  const [statusComment, setStatusComment] = useState('');
  const [tasks, setTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [priorities, setPriorities] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskForm, setTaskForm] = useState({
    id_tache: null,
    titre_tache: '',
    description: '',
    id_user: '',
    ordre_tache: 1
  });
  const [savingTask, setSavingTask] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [changes, statuses, taskStatusRes, users, priosRes, envsRes] = await Promise.all([
        changeService.getAllChangements({ limit: 1000 }),
        changeService.getChangeStatuses(),
        api.get('/statuts?contexte=TACHE'),
        api.get('/users?nom_role=IMPLEMENTEUR&limit=1000'),
        rfcService.getPriorites(),
        rfcService.getEnvironnements()
      ]);
      setChangements(Array.isArray(changes) ? changes : []);
      setChangeStatuses(statuses || []);
      setTaskStatuses(taskStatusRes?.data?.statuts || taskStatusRes?.statuts || []);
      setImplementers(users?.data?.data || users?.data?.users || users || []);
      setPriorities(priosRes || []);
      setEnvironments(envsRes || []);
    } catch (error) {
      console.error('Erreur chargement admin changements:', error);
      setToast({ msg: 'Erreur lors du chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const fetchTasks = async (idChangement) => {
    setTasksLoading(true);
    try {
      const res = await changeService.getTasksByChange(idChangement);
      setTasks(res || []);
    } catch (error) {
      console.error('Erreur tâches:', error);
    } finally {
      setTasksLoading(false);
    }
  };

  const handleShowTasks = (change) => {
    setSelectedChange(change);
    setShowModal(true);
    fetchTasks(change.id_changement);
  };

  const handleDelete = (change) => {
    setConfirmDel({
      title: 'Supprimer le changement',
      message: `Voulez-vous vraiment supprimer le changement ${change.code_changement} ?`,
      change
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    setSaving(true);
    try {
      if (confirmDel.idTache) {
        await api.delete(`/taches/${confirmDel.idTache}`);
        fetchTasks(selectedChange.id_changement);
        setToast({ msg: 'Tâche supprimée', type: 'success' });
      } else if (confirmDel.change) {
        await changeService.deleteChangement(confirmDel.change.id_changement);
        setChangements(prev => prev.filter(c => c.id_changement !== confirmDel.change.id_changement));
        setToast({ msg: 'Changement supprimé', type: 'success' });
      }
      setConfirmDel(null);
    } catch (error) {
      setToast({ msg: 'Erreur suppression', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateTask = async (taskId, payload) => {
    try {
      await changeService.updateTache(taskId, payload);
      fetchTasks(selectedChange.id_changement);
    } catch (error) {
      setToast({ msg: 'Erreur mise à jour tâche', type: 'error' });
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    setSavingTask(true);
    try {
      if (taskForm.id_tache) {
        await api.put(`/taches/${taskForm.id_tache}`, taskForm);
        setToast({ msg: 'Tâche mise à jour', type: 'success' });
      } else {
        await api.post(`/changements/${selectedChange.id_changement}/taches`, taskForm);
        setToast({ msg: 'Tâche ajoutée', type: 'success' });
      }
      setShowTaskForm(false);
      setTaskForm({ id_tache: null, titre_tache: '', description: '', id_user: '', ordre_tache: 1 });
      fetchTasks(selectedChange.id_changement);
    } catch (error) {
      console.error('Task error:', error);
      setToast({ msg: 'Erreur lors de l\'opération sur la tâche', type: 'error' });
    } finally {
      setSavingTask(false);
    }
  };

  const handleDeleteTask = (task) => {
    setConfirmDel({
      idTache: task.id_tache,
      title: 'Supprimer la tâche',
      message: `Êtes-vous sûr de vouloir supprimer la tâche "${task.titre_tache}" ? Cette action est irréversible.`
    });
  };

  const filteredChanges = changements.filter(c => {
    const term = search.toLowerCase();
    const matchesSearch = (
      (c.code_changement?.toLowerCase() || '').includes(term) ||
      (c.rfc?.titre_rfc?.toLowerCase() || '').includes(term) ||
      (c.changeManager?.nom_user?.toLowerCase() || '').includes(term)
    );
    const matchesStatus = !filterStatus || c.statut?.code_statut === filterStatus;
    const matchesKpi = !kpiFilter || (
      kpiFilter === 'EN_COURS' ? c.statut?.code_statut === 'EN_COURS' :
      kpiFilter === 'IMPLEMENTE' ? ['IMPLEMENTE', 'CLOTURE'].includes(c.statut?.code_statut) :
      kpiFilter === 'EN_ECHEC' ? c.statut?.code_statut === 'EN_ECHEC' : true
    );
    return matchesSearch && matchesStatus && matchesKpi;
  });

  const totalPages = Math.ceil(filteredChanges.length / ITEMS_PER_PAGE) || 1;
  const paginatedChanges = filteredChanges.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const kpis = {
    total: changements.length,
    enCours: changements.filter(c => c.statut?.code_statut === 'EN_COURS').length,
    implementes: changements.filter(c => ['IMPLEMENTE', 'CLOTURE'].includes(c.statut?.code_statut)).length,
    echecs: changements.filter(c => c.statut?.code_statut === 'EN_ECHEC').length
  };

  const getPriorityStyle = (priorityId) => {
    const p = priorities.find(pr => String(pr.id_priorite) === String(priorityId));
    const label = p?.libelle?.toUpperCase() || 'BASSE';
    const colors = {
      'FAIBLE': { bg: '#f0fdf4', color: '#16a34a', border: '#dcfce7' },
      'BASSE': { bg: '#dcfce7', color: '#15803d', border: '#bbf7d0' },
      'MOYENNE': { bg: '#fefce8', color: '#a16207', border: '#fef9c3' },
      'HAUTE': { bg: '#fff7ed', color: '#ea580c', border: '#ffedd5' },
      'CRITIQUE': { bg: '#fef2f2', color: '#dc2626', border: '#fee2e2' },
    };
    return colors[label] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
  };

  const thStyle = { padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '.05em' };
  const tdStyle = { padding: '1rem 0.75rem', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' };

  return (
    <div className="acl-page">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiLayers /></div>
          <div className="premium-header-text">
            <h1>Gestion des Changements</h1>
            <p>Suivi et déploiement des interventions techniques</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={loadData} style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
            <FiRefreshCw className={loading ? 'spinning' : ''} /> Actualiser
          </button>
        </div>
      </div>

      <div className="acl-kpi-grid">
        <div className={`acl-kpi-card is-total ${kpiFilter === '' ? 'is-selected' : ''}`} onClick={() => setKpiFilter('')}>
          <div className="acl-kpi-icon total"><FiFileText /></div>
          <div className="acl-grow">
            <p className="acl-kpi-label">Total Changements</p>
            <h3 className="acl-kpi-value">{kpis.total}</h3>
          </div>
        </div>
        <div className={`acl-kpi-card is-en-cours ${kpiFilter === 'EN_COURS' ? 'is-selected' : ''}`} onClick={() => setKpiFilter('EN_COURS')}>
          <div className="acl-kpi-icon encours"><FiClock /></div>
          <div className="acl-grow">
            <p className="acl-kpi-label">En Cours</p>
            <h3 className="acl-kpi-value">{kpis.enCours}</h3>
          </div>
        </div>
        <div className={`acl-kpi-card is-implemente ${kpiFilter === 'IMPLEMENTE' ? 'is-selected' : ''}`} onClick={() => setKpiFilter('IMPLEMENTE')}>
          <div className="acl-kpi-icon implemente"><FiCheckCircle /></div>
          <div className="acl-grow">
            <p className="acl-kpi-label">Implémentés</p>
            <h3 className="acl-kpi-value success">{kpis.implementes}</h3>
          </div>
        </div>
        <div className={`acl-kpi-card is-en-echec ${kpiFilter === 'EN_ECHEC' ? 'is-selected' : ''}`} onClick={() => setKpiFilter('EN_ECHEC')}>
          <div className="acl-kpi-icon echec"><FiAlertCircle /></div>
          <div className="acl-grow">
            <p className="acl-kpi-label">Échecs</p>
            <h3 className="acl-kpi-value" style={{color:'#ef4444'}}>{kpis.echecs}</h3>
          </div>
        </div>
      </div>

      <div className="acl-toolbar">
        <div className="acl-search-wrap">
          <FiSearch className="acl-search-icon" />
          <input className="acl-search-input" placeholder="Rechercher par code, titre ou responsable..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="acl-filter-row">
          <select className="acl-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="">Tous les statuts</option>
            {changeStatuses.map(s => <option key={s.id_statut} value={s.code_statut}>{s.libelle}</option>)}
          </select>
          <button className="acl-reset-btn" onClick={() => { setSearch(''); setFilterStatus(''); setKpiFilter(''); }}>Réinitialiser</button>
        </div>
      </div>

      <div className="rfc-table-card acl-card">
        <div className="acl-table-wrap">
          <table className="acl-table">
            <thead>
              <tr className="acl-head-row">
                <th style={{ ...thStyle, width: '220px' }}>Changement & Code</th>
                <th style={thStyle}>Responsable</th>
                <th style={thStyle}>Priorité</th>
                <th style={thStyle}>Environnement</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                <th style={{ ...thStyle, textAlign: 'center' }}>Tâches</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="7" className="acl-empty-cell loading"><FiRefreshCw className="spinning" /> Chargement...</td></tr>
              ) : paginatedChanges.length === 0 ? (
                <tr><td colSpan="7" className="acl-empty-cell"><FiLayers className="acl-empty-icon" size={48} /> Aucun changement trouvé</td></tr>
              ) : paginatedChanges.map((c, i) => (
                <tr key={c.id_changement} className={`acl-row ${i % 2 === 0 ? 'even' : 'odd'}`} onClick={() => handleShowTasks(c)}>
                  <td className="acl-td">
                    <div className="acl-title">{c.rfc?.titre_rfc || c.planChangement?.titre_plan || 'Changement'}</div>
                    <div className="acl-code">#{c.code_changement}</div>
                  </td>
                  <td className="acl-td">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: '800' }}>
                        {(c.changeManager?.prenom_user?.[0] || '—').toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600' }}>{c.changeManager?.prenom_user} {c.changeManager?.nom_user}</span>
                    </div>
                  </td>
                  <td className="acl-td">
                    {(() => {
                      const style = getPriorityStyle(c.id_priorite || c.rfc?.id_priorite);
                      const p = priorities.find(pr => String(pr.id_priorite) === String(c.id_priorite || c.rfc?.id_priorite));
                      return <span style={{ padding: '0.25rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>{p?.libelle || 'BASSE'}</span>;
                    })()}
                  </td>
                  <td className="acl-td">
                    <span className="acl-env-pill">{c.environnement?.nom_env || environments.find(e => e.id_env === c.id_env)?.nom_env || 'N/A'}</span>
                  </td>
                  <td className="acl-td" style={{ textAlign: 'center' }}>
                    {(() => {
                        const code = c.statut?.code_statut;
                        let variant = 'primary';
                        if (['IMPLEMENTE', 'CLOTURE', 'TERMINEE'].includes(code)) variant = 'success';
                        else if (['EN_ECHEC', 'ANNULEE', 'REJETEE'].includes(code)) variant = 'danger';
                        else if (['EN_COURS', 'PLANIFIEE'].includes(code)) variant = 'info';
                        else if (['EN_ATTENTE', 'PRE_APPROUVEE'].includes(code)) variant = 'warning';
                        
                        return <Badge variant={variant}>{c.statut?.libelle || code}</Badge>;
                    })()}
                  </td>
                  <td className="acl-td" style={{ textAlign: 'center' }} onClick={e => { e.stopPropagation(); handleShowTasks(c); }}>
                    <Badge variant="default" style={{ cursor: 'pointer', textDecoration: 'underline' }}>{c._count?.taches || 0} tâches</Badge>
                  </td>
                  <td className="acl-td acl-actions-cell">
                    <div className="acl-actions">
                      <button className="acl-icon-btn edit" onClick={e => { e.stopPropagation(); handleShowTasks(c); }}><FiInfo /></button>
                      <button className="acl-icon-btn delete" onClick={e => { e.stopPropagation(); handleDelete(c); }}><FiTrash2 /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination UI */}
        {totalPages > 1 && (
          <div className="acl-pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <div className="pagination-info" style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Affichage de {((currentPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(currentPage * ITEMS_PER_PAGE, filteredChanges.length)} sur {filteredChanges.length} changements
            </div>
            <div className="pagination-btns" style={{ display: 'flex', gap: '8px' }}>
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === 1 ? '#f1f5f9' : '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
              >
                <FiChevronLeft /> Précédent
              </button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                style={{ padding: '6px 12px', borderRadius: '6px', border: '1px solid #e2e8f0', background: currentPage === totalPages ? '#f1f5f9' : '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
              >
                Suivant <FiChevronRight />
              </button>
            </div>
          </div>
        )}
      </div>

      {showModal && selectedChange && (
        <div className="modal-backdrop-cab" onClick={() => setShowModal(false)}>
          <div className="modal-box-cab glass-card-cab" onClick={e => e.stopPropagation()} style={{ maxWidth: '1100px' }}>
            <div className="modal-top-rfc-style" style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: 'white', border: 'none' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', color: 'white', borderColor: 'rgba(255,255,255,0.2)' }}>
                <FiLayers />
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: 'white' }}>Détails du Changement</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255,255,255,0.8)' }}>
                  Référence : {selectedChange.code_changement} — {selectedChange.rfc?.titre_rfc || selectedChange.planChangement?.titre_plan}
                </div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowModal(false)} style={{ color: 'white' }}>
                <FiX size={24} />
              </button>
            </div>

            <div className="modal-body-rfc-style">

            <div className="detail-layout" style={{ gridTemplateColumns: '1fr 300px' }}>
              <div className="detail-main">
                <div className="section-card">
                  <div className="section-card-header">
                    <div className="section-card-title"><FiList /> Planification & Tâches</div>
                    <button 
                      className="btn-submit-rfc-style" 
                      style={{ padding: '6px 12px', fontSize: '0.75rem', marginLeft: 'auto' }}
                      onClick={() => {
                        setTaskForm({ id_tache: null, titre_tache: '', description: '', id_user: implementers[0]?.id_user || '', ordre_tache: tasks.length + 1 });
                        setShowTaskForm(true);
                      }}
                    >
                      <FiPlus /> Nouvelle Tâche
                    </button>
                  </div>
                  <div className="section-card-body">
                    {tasksLoading ? <p>Chargement des tâches...</p> : tasks.length === 0 ? <p>Aucune tâche planifiée.</p> : (
                      <table className="tasks-table-v2" style={{width:'100%', borderCollapse:'collapse'}}>
                        <thead>
                          <tr style={{borderBottom:'1.5px solid #e2e8f0', background:'#f8fafc'}}>
                            <th style={{padding:'12px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b'}}>Code</th>
                            <th style={{padding:'12px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b', textAlign:'left'}}>Titre & Description</th>
                            <th style={{padding:'12px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b'}}>Statut</th>
                            <th style={{padding:'12px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b'}}>Implémenteur</th>
                            <th style={{padding:'12px', fontSize:'0.7rem', textTransform:'uppercase', color:'#64748b', textAlign:'right'}}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tasks.map(t => (
                            <tr key={t.id_tache} style={{borderBottom:'1px solid #f1f5f9'}}>
                              <td className="task-code-cell" style={{padding:'12px', fontWeight:700, fontSize:'0.75rem', color:'#3b82f6'}}>#{t.code_tache}</td>
                              <td style={{padding:'12px'}}>
                                <div style={{fontWeight:600, fontSize:'0.85rem'}}>{t.titre_tache}</div>
                                <div style={{fontSize:'0.7rem', color:'#94a3b8', maxWidth:'300px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{t.description || 'Pas de description'}</div>
                              </td>
                              <td style={{padding:'12px', textAlign:'center'}}>
                                <span className="status-badge" style={{ padding: '4px 10px', borderRadius: '6px', fontWeight: '700', fontSize: '0.75rem', background: '#f1f5f9', color: '#64748b', display: 'inline-block' }}>
                                  {t.statut?.libelle || 'En attente'}
                                </span>
                              </td>
                              <td style={{padding:'12px', textAlign:'center'}}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: '800' }}>
                                    {t.implementeur?.prenom_user?.[0] || 'U'}
                                  </div>
                                  <span style={{ fontSize: '0.8rem', fontWeight: '600' }}>{t.implementeur ? `${t.implementeur.prenom_user} ${t.implementeur.nom_user}` : 'Non assigné'}</span>
                                </div>
                              </td>
                              <td style={{padding:'12px', textAlign:'right'}}>
                                <div style={{display:'flex', justifyContent:'flex-end', gap:'12px'}}>
                                    <button 
                                      onClick={() => {
                                        setTaskForm({
                                          id_tache: t.id_tache,
                                          titre_tache: t.titre_tache,
                                          description: t.description || '',
                                          id_user: t.id_user,
                                          ordre_tache: t.ordre_tache
                                        });
                                        setShowTaskForm(true);
                                      }}
                                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                                      title="Modifier"
                                    >
                                      <FiEdit3 size={15} />
                                    </button>
                                    <button 
                                      onClick={() => handleDeleteTask(t)}
                                      style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                                      title="Supprimer"
                                    >
                                      <FiTrash2 size={15} />
                                    </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
              <div className="detail-sidebar">
                <div className="sidebar-widget">
                  <div className="sidebar-widget-header"><FiInfo size={14} /> Informations</div>
                  <div className="sidebar-widget-body">
                    <div className="info-row"><span className="info-key">Créé le</span><span className="info-val">{new Date(selectedChange.date_creation).toLocaleDateString()}</span></div>
                    <div className="info-row"><span className="info-key">Manager</span><span className="info-val">{selectedChange.changeManager?.nom_user}</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}

      {/* Task Creation/Edition Modal */}
      {showTaskForm && (
        <div className="modal-backdrop-cab" onClick={() => setShowTaskForm(false)}>
          <div className="modal-box-cab glass-card-cab" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}>
                <FiPlus />
              </div>
              <div className="rfc-style-header-text">
                <h2>{taskForm.id_tache ? 'Modifier la Tâche' : 'Nouvelle Tâche Technique'}</h2>
                <div className="rfc-style-subtitle">Assignation d'une opération technique au changement</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowTaskForm(false)}><FiX size={24} /></button>
            </div>
            <form onSubmit={handleAssignTask}>
              <div className="modal-body-rfc-style">
                <div className="form-group">
                  <label>Titre de la tâche</label>
                  <input 
                    required 
                    value={taskForm.titre_tache} 
                    onChange={e => setTaskForm({...taskForm, titre_tache: e.target.value})}
                    placeholder="ex: Configurer les ports pare-feu..."
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optionnel)</label>
                  <textarea 
                    value={taskForm.description} 
                    onChange={e => setTaskForm({...taskForm, description: e.target.value})}
                    placeholder="Détails techniques..."
                    style={{ minHeight: '100px' }}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group half">
                    <label>Assigner à</label>
                    <select 
                      required
                      value={taskForm.id_user}
                      onChange={e => setTaskForm({...taskForm, id_user: e.target.value})}
                    >
                      {implementers.map(imp => (
                        <option key={imp.id_user} value={imp.id_user}>
                          {imp.prenom_user} {imp.nom_user}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group half">
                    <label>Ordre</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={taskForm.ordre_tache}
                      onChange={e => setTaskForm({...taskForm, ordre_tache: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowTaskForm(false)}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={savingTask}>
                  {savingTask ? 'Enregistrement...' : <><FiCheck /> Enregistrer</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDel && (
        <ConfirmModal title={confirmDel.title} message={confirmDel.message} danger={true} loading={saving} onConfirm={confirmDelete} onCancel={() => setConfirmDel(null)} />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default AdminChangementList;
