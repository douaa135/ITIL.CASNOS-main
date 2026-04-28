import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiCheckSquare, FiPlus, FiTrash2, FiEdit3, FiCheck, 
  FiX, FiSearch, FiAlertTriangle, FiCheckCircle, FiLoader, 
  FiClock, FiPlay, FiPause, FiUser, FiCalendar, FiInfo, FiRefreshCw, FiLayers
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './SystemSettings.css'; 
import '../changemanager/RfcManagement.css'; 

const getTaskStatusClass = (status) => {
  switch(status) {
    case 'PLANIFIEE': return 'status-blue';
    case 'EN_COURS':  return 'status-pink';
    case 'EN_PAUSE':  return 'status-amber';
    case 'TERMINEE':  return 'status-green';
    case 'ANNULEE':   return 'status-red';
    default:          return 'status-default';
  }
};

// ── Toast notifications ───────────────────────────────────────
const Toast = ({ msg, type, onClose }) => (
  <div className={`premium-toast ${type}`} style={{
    position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 10000,
    display: 'flex', alignItems: 'center', gap: '0.75rem',
    padding: '1rem 1.5rem', borderRadius: '12px',
    background: type === 'success' ? '#064e3b' : '#7f1d1d',
    color: 'white', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
    animation: 'slideInUp 0.3s ease',
    minWidth: '280px',
  }}>
    {type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertTriangle size={20} />}
    <span style={{ flex: 1, fontWeight: '500' }}>{msg}</span>
    <button onClick={onClose} style={{
      background: 'none', border: 'none', color: 'white', cursor: 'pointer',
      opacity: 0.7, padding: '0.25rem', borderRadius: '4px'
    }}>
      <FiX size={16} />
    </button>
  </div>
);

// ── Modal de Détail ─────────────────────────────────────
const TaskDetailModal = ({ task, onClose, onEdit, onDelete }) => {
  if (!task) return null;

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '600px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper" style={{ background: '#ecfdf5', color: '#10b981' }}><FiCheckSquare /></div>
          <div className="rfc-style-header-text">
            <h2>Détails de la Tâche</h2>
            <div className="rfc-style-subtitle">Référence : {task.code_tache}</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div className="form-group-cab" style={{ gridColumn: 'span 2' }}>
              <label>Titre de la Tâche</label>
              <div className="detail-value-display" style={{ fontSize: '1.05rem', fontWeight: '800', color: '#1e40af', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                {task.titre_tache}
              </div>
            </div>
            <div className="form-group-cab" style={{ gridColumn: 'span 2' }}>
              <label>Description</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '80px', lineHeight: '1.5' }}>
                {task.description || 'Aucune description fournie.'}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Statut</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span className={`status-badge ${getTaskStatusClass(task.statut)}`} style={{ fontSize: '0.75rem' }}>
                  {task.statut}
                </span>
              </div>
            </div>
            <div className="form-group-cab">
              <label>Priorité</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <span className={`ref-badge`} style={{
                  background: task.priorite === 'CRITIQUE' ? '#fee2e2' : task.priorite === 'HAUTE' ? '#fef3c7' : '#f0f9ff',
                  color: task.priorite === 'CRITIQUE' ? '#991b1b' : task.priorite === 'HAUTE' ? '#92400e' : '#0369a1',
                  fontSize: '0.75rem', padding: '0.4rem 0.8rem', borderRadius: '6px'
                }}>
                  {task.priorite}
                </span>
              </div>
            </div>
            <div className="form-group-cab">
              <label>Assigné à</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                <FiUser style={{ marginRight: '8px', color: '#64748b' }}/>
                {task.implementeur?.prenom} {task.implementeur?.nom}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Changement associé</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#2563eb', fontWeight: '800' }}>
                {task.changement?.code_changement}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Début prévu</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                <FiCalendar style={{ marginRight: '8px', color: '#64748b' }}/>
                {task.date_debut_prevue ? new Date(task.date_debut_prevue).toLocaleString() : 'Non définie'}
              </div>
            </div>
            <div className="form-group-cab">
              <label>Fin prévue</label>
              <div className="detail-value-display" style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center' }}>
                <FiClock style={{ marginRight: '8px', color: '#64748b' }}/>
                {task.date_fin_prevue ? new Date(task.date_fin_prevue).toLocaleString() : 'Non définie'}
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer-rfc-style">
          <button type="button" className="btn-cancel-rfc-style" onClick={() => { onClose(); onDelete(task); }}>
            <FiTrash2 size={16} /> Supprimer
          </button>
          <button type="button" className="btn-submit-rfc-style" onClick={() => { onClose(); onEdit(task); }}>
            <FiEdit3 size={16} /> Modifier
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Modal d'ajout/édition ─────────────────────────────────────
const TaskModal = ({ task, onClose, onSave, loading, implementers }) => {
  const [form, setForm] = useState({
    titre_tache: task?.titre_tache || '',
    description: task?.description || '',
    priorite: task?.priorite || 'MOYENNE',
    date_debut_prevue: task?.date_debut_prevue || '',
    date_fin_prevue: task?.date_fin_prevue || '',
    id_implementeur: task?.id_implementeur || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper"><FiCheckSquare /></div>
          <div className="rfc-style-header-text">
            <h2>{task ? 'Modifier la Tâche' : 'Nouvelle Tâche'}</h2>
            <div className="rfc-style-subtitle">Configuration des étapes d'implémentation</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body-rfc-style">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group-cab" style={{ gridColumn: 'span 2' }}>
                <label>Titre de la Tâche *</label>
                <input
                  type="text"
                  value={form.titre_tache}
                  onChange={e => setForm({...form, titre_tache: e.target.value})}
                  className="premium-input-style"
                  placeholder="Titre descriptif"
                  required
                />
              </div>
              <div className="form-group-cab" style={{ gridColumn: 'span 2' }}>
                <label>Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm({...form, description: e.target.value})}
                  className="premium-input-style"
                  rows={3}
                />
              </div>
              <div className="form-group-cab">
                <label>Priorité</label>
                <select
                  value={form.priorite}
                  onChange={e => setForm({...form, priorite: e.target.value})}
                  className="premium-input-style"
                >
                  <option value="BASSE">Basse</option>
                  <option value="MOYENNE">Moyenne</option>
                  <option value="HAUTE">Haute</option>
                  <option value="CRITIQUE">Critique</option>
                </select>
              </div>
              <div className="form-group-cab">
                <label>Implémenteur</label>
                <select
                  value={form.id_implementeur}
                  onChange={e => setForm({...form, id_implementeur: e.target.value})}
                  className="premium-input-style"
                  required
                >
                  <option value="">Choisir un implémenteur</option>
                  {implementers.map(imp => (
                    <option key={imp.id_user} value={imp.id_user}>
                      {imp.prenom_user} {imp.nom_user}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group-cab">
                <label>Date début prévue</label>
                <input
                  type="datetime-local"
                  value={form.date_debut_prevue}
                  onChange={e => setForm({...form, date_debut_prevue: e.target.value})}
                  className="premium-input-style"
                />
              </div>
              <div className="form-group-cab">
                <label>Date fin prévue</label>
                <input
                  type="datetime-local"
                  value={form.date_fin_prevue}
                  onChange={e => setForm({...form, date_fin_prevue: e.target.value})}
                  className="premium-input-style"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer-rfc-style">
            <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={loading} className="btn-submit-rfc-style">
              {loading ? 'Sauvegarde...' : (task ? 'Modifier' : 'Créer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Composant principal ───────────────────────────────────────
const TaskManagement = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [implementers, setImplementers] = useState([]);
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchImplementers = useCallback(async () => {
    try {
      const res = await api.get('/users?nom_role=IMPLEMENTEUR&limit=100');
      // L'intercepteur axios retourne response.data directement
      // res = { success, data: { data: [...users], total, page } }
      const list = res.data?.data || res.data || [];
      setImplementers(list);
    } catch (error) {
      console.error('Erreur chargement implémenteurs', error);
    }
  }, []);

  useEffect(() => {
    fetchImplementers();
  }, [fetchImplementers]);

  // Mock data as before
  const mockTasks = [
    { id_tache: 1, code_tache: 'TASK-001', titre_tache: 'Mise à jour serveur de production', description: 'Mettre à jour les serveurs de production vers la version 2.1.4', statut: 'EN_COURS', priorite: 'HAUTE', date_debut_prevue: '2024-04-25T09:00', date_fin_prevue: '2024-04-25T17:00', id_implementeur: 5, implementeur: { nom: 'Dupont', prenom: 'Jean' }, changement: { code_changement: 'CHG-2024-001' } },
    { id_tache: 2, code_tache: 'TASK-002', titre_tache: 'Sauvegarde base de données', description: 'Effectuer la sauvegarde complète de la base de données avant migration', statut: 'TERMINEE', priorite: 'CRITIQUE', date_debut_prevue: '2024-04-24T20:00', date_fin_prevue: '2024-04-24T22:00', id_implementeur: 3, implementeur: { nom: 'Martin', prenom: 'Marie' }, changement: { code_changement: 'CHG-2024-002' } },
    { id_tache: 3, code_tache: 'TASK-003', titre_tache: 'Configuration firewall', description: 'Configurer les nouvelles règles firewall pour le réseau sécurisé', statut: 'PLANIFIEE', priorite: 'MOYENNE', date_debut_prevue: '2024-04-26T10:00', date_fin_prevue: '2024-04-26T14:00', id_implementeur: 7, implementeur: { nom: 'Dubois', prenom: 'Pierre' }, changement: { code_changement: 'CHG-2024-003' } },
  ];

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      setTasks(mockTasks);
    } catch (error) {
      setToast({ msg: 'Erreur chargement', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const filteredTasks = tasks.filter(task => {
    const term = search.toLowerCase();
    return (
      (task.code_tache?.toLowerCase() || '').includes(term) ||
      (task.titre_tache?.toLowerCase() || '').includes(term)
    );
  }).filter(t => filter === 'ALL' || t.statut === filter);

  const handleAddTask = () => { setEditingTask(null); setShowModal(true); };
  const handleEditTask = (task) => { setEditingTask(task); setShowModal(true); setShowDetailModal(false); };
  const handleDetailTask = (task) => { setSelectedTask(task); setShowDetailModal(true); };

  const handleDeleteTask = async (task) => {
    if (!window.confirm("Supprimer cette tâche ?")) return;
    setTasks(prev => prev.filter(t => t.id_tache !== task.id_tache));
    setToast({ msg: 'Supprimée', type: 'success' });
    setShowDetailModal(false);
  };

  const handleSaveTask = async (formData) => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 300));
      if (editingTask) {
        // Mise à jour
        const imp = implementers.find(i => i.id_user === formData.id_implementeur);
        setTasks(prev => prev.map(t =>
          t.id_tache === editingTask.id_tache
            ? { ...t, ...formData, implementeur: imp || t.implementeur }
            : t
        ));
        setToast({ msg: 'Tâche modifiée avec succès.', type: 'success' });
      } else {
        // Nouvelle tâche
        const imp = implementers.find(i => i.id_user === formData.id_implementeur);
        const newTask = {
          id_tache: Date.now(),
          code_tache: `TASK-${String(Date.now()).slice(-4)}`,
          statut: 'PLANIFIEE',
          ...formData,
          implementeur: imp
            ? { nom: imp.nom_user, prenom: imp.prenom_user, nom_user: imp.nom_user, prenom_user: imp.prenom_user }
            : { nom: 'Inconnu', prenom: '' },
          changement: { code_changement: '—' },
        };
        setTasks(prev => [...prev, newTask]);
        setToast({ msg: 'Tâche créée avec succès.', type: 'success' });
      }
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="header-icon-main" style={{ margin: 0 }}><FiCheckSquare /></div>
          <div>
            <h1 style={{ margin: 0, marginBottom: '0.25rem' }}>Gestion des Tâches</h1>
            <p style={{ margin: 0 }}>Supervisez l'exécution des plans de changement et les interventions techniques.</p>
          </div>
        </div>
        <button className="btn-create-premium" onClick={handleAddTask}><FiPlus /> Nouvelle Tâche</button>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ '--card-color': '#10b981', '--card-color-rgb': '16, 185, 129' }}>
          <div className="stat-icon"><FiCheckSquare /></div>
          <div className="stat-content">
            <div className="stat-value">{tasks.length}</div>
            <div className="stat-title">Total Tâches</div>
          </div>
        </div>
        <div className="stat-card" style={{ '--card-color': '#3b82f6', '--card-color-rgb': '59, 130, 246' }}>
          <div className="stat-icon"><FiPlay /></div>
          <div className="stat-content">
            <div className="stat-value">{tasks.filter(t => t.statut === 'EN_COURS').length}</div>
            <div className="stat-title">En Cours</div>
          </div>
        </div>
      </div>

      <div className="section-header-premium" style={{ background: 'white', padding: '1.5rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
        <div className="title-group" style={{ flex: 1 }}>
          <FiSearch style={{ color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Rechercher une tâche..." 
            className="premium-input-style" 
            style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select value={filter} onChange={e => setFilter(e.target.value)} className="premium-input-style" style={{ width: '200px' }}>
            <option value="ALL">Tous les statuts</option>
            <option value="PLANIFIEE">Planifiées</option>
            <option value="EN_COURS">En Cours</option>
            <option value="TERMINEE">Terminées</option>
          </select>
        </div>
      </div>

      <div className="premium-table-card">
        <table className="premium-settings-table">
          <thead>
            <tr>
              <th>Code & Titre</th>
              <th>Changement</th>
              <th>Implémenteur</th>
              <th style={{ textAlign: 'center' }}>Statut</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="loading-state"><FiRefreshCw className="spin" /></td></tr>
            ) : filteredTasks.map(task => (
              <tr key={task.id_tache} onClick={() => handleDetailTask(task)} style={{ cursor: 'pointer' }}>
                <td>
                  <div className="env-name-cell">
                    <div className="env-dot" style={{ background: task.statut === 'TERMINEE' ? '#10b981' : '#3b82f6' }}></div>
                    <span style={{ fontWeight: 800, color: '#2563eb', marginRight: '8px' }}>{task.code_tache}</span>
                    {task.titre_tache}
                  </div>
                </td>
                <td><span className="ref-badge">{task.changement?.code_changement}</span></td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiUser size={14} color="#64748b" />
                    {task.implementeur?.prenom_user || task.implementeur?.prenom} {task.implementeur?.nom_user || task.implementeur?.nom}
                  </div>
                </td>
                <td style={{ textAlign: 'center' }}>
                  <span className={`status-badge ${getTaskStatusClass(task.statut)}`} style={{ fontSize: '0.65rem' }}>
                    {task.statut}
                  </span>
                </td>
                <td>
                  <div className="actions-flex">
                    <button className="action-circle-btn edit" onClick={(e) => { e.stopPropagation(); handleEditTask(task); }}><FiEdit3 size={14} /></button>
                    <button className="action-circle-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteTask(task); }}><FiTrash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && <TaskModal task={editingTask} onClose={() => setShowModal(false)} onSave={handleSaveTask} loading={saving} implementers={implementers} />}
      {showDetailModal && <TaskDetailModal task={selectedTask} onClose={() => setShowDetailModal(false)} onEdit={handleEditTask} onDelete={handleDeleteTask} />}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default TaskManagement;