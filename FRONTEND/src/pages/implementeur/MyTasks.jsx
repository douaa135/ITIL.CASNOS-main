import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiFilter, FiCheckCircle, FiPlay, 
  FiMoreVertical, FiPlus, FiMessageSquare, FiClock,
  FiX, FiSend, FiActivity, FiAlertCircle, FiFileText, FiCheckSquare
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import './MyTasks.css';
import '../changemanager/RfcManagement.css';

const getTaskStatusClass = (code) => {
  switch(code) {
    case 'PLANIFIEE': return 'status-blue';
    case 'EN_ATTENTE': return 'status-indigo';
    case 'EN_COURS':  return 'status-pink';
    case 'TERMINEE':  return 'status-green';
    case 'ANNULEE':   return 'status-red';
    default:          return 'status-default';
  }
};

const MyTasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [pirForm, setPirForm] = useState({ show: false, description: '' });
  const [newLog, setNewLog] = useState({ titre_journal: '', description: '' });
  const [statutsTache, setStatutsTache] = useState([]);

  const filteredTasks = tasks
    .filter((task) => {
      const searchTerm = search.trim().toLowerCase();
      if (!searchTerm) return true;
      return (
        String(task.code_tache).toLowerCase().includes(searchTerm) ||
        String(task.titre_tache).toLowerCase().includes(searchTerm) ||
        String(task.changement?.code_changement || '').toLowerCase().includes(searchTerm) ||
        String(task.changement?.rfc?.code_rfc || '').toLowerCase().includes(searchTerm)
      );
    })
    .filter((task) => {
      if (filter === 'ALL') return true;
      return task.statut?.code_statut === filter;
    });

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setShowModal(true);
  };

  useEffect(() => {
    fetchTasks();
    fetchStatuts();
  }, [user]);

  const fetchTasks = async () => {
    if (!user?.id_user) return;
    setLoading(true);
    try {
      // 1. Fetch all changes
      const changesRes = await api.get('/changements');
      const changesData = changesRes.data || changesRes;
      const allChanges = (changesData.changements || []);
      
      // 2. Fetch tasks for each change
      const userTasks = [];
      await Promise.all(allChanges.map(async (change) => {
        try {
          const res = await api.get(`/changements/${change.id_changement}/taches`);
          const tasksList = res.data?.taches || res.taches || [];
          // Filter by current implementer
          const myTasks = tasksList.filter(t => t.id_user === user.id_user || t.implementeur?.id_user === user.id_user);
          
          // Attach the change object to each task so the table can display RFC/Change info
          myTasks.forEach(t => {
            t.changement = change;
          });
          
          userTasks.push(...myTasks);
        } catch (e) {
          // Ignore individual change errors
        }
      }));
      setTasks(userTasks);
    } catch (error) {
      console.error('Fetch My Tasks Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuts = async () => {
    try {
      const res = await api.get('/statuts?contexte=TACHE');
      // L'intercepteur unwrappe 'data' de la réponse axios.
      // Le backend renvoie { success, data: { statuts: [...] } }
      // Donc res = { success, data: { statuts: [...] } } OU res = { statuts: [...] } selon l'unwrapping
      const list = res?.statuts || res?.data?.statuts || res?.data || (Array.isArray(res) ? res : []);
      setStatutsTache(Array.isArray(list) ? list : []);
    } catch (e) { 
      console.error('Fetch Statuts Error:', e); 
    }
  };

  const handleUpdateStatus = async (taskId, nextStatusCode) => {
    const nextStatut = statutsTache.find(s => s.code_statut === nextStatusCode);
    if (!nextStatut) {
      alert(`Erreur : Le statut "${nextStatusCode}" est introuvable.`);
      return;
    }
    try {
      // api.patch retourne déjà response.data
      const res = await api.patch(`/taches/${taskId}/statut`, { id_statut: nextStatut.id_statut });
      
      // On vérifie si la requête a réussi (l'intercepteur rejette si status >= 400)
      if (res) {
        await fetchTasks();
        if (selectedTask?.id_tache === taskId) {
           const response = await api.get(`/taches/${taskId}`);
           // R.success renvoie { success: true, data: { tache: ... } }
           // L'intercepteur unwrappe 'data' de la réponse axios, donc response = { success, data }
           const tacheObj = response?.data?.tache || response?.tache || response;
           
           if (tacheObj && typeof tacheObj === 'object') {
             tacheObj.changement = selectedTask.changement;
             setSelectedTask(tacheObj);
           }
        }
      }
    } catch (error) {
      console.error('Update Status Error:', error);
      alert(error?.message || error?.error || 'Erreur lors du changement de statut.');
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.description.trim()) return;

    try {
      const res = await api.post(`/taches/${selectedTask.id_tache}/journaux`, newLog);
      if (res) {
        const response = await api.get(`/taches/${selectedTask.id_tache}`);
        const tacheObj = response?.data?.tache || response?.tache || response;
        
        if (tacheObj && typeof tacheObj === 'object') {
          tacheObj.changement = selectedTask.changement;
          setSelectedTask(tacheObj);
        }
        setNewLog({ titre_journal: '', description: '' });
      }
    } catch (error) {
      console.error('Add Log Error:', error);
      alert(error?.message || 'Erreur lors de l\'ajout du journal.');
    }
  };

  const handleDeclarrerResultat = (estSucces) => {
    setShowModal(false);
    if (!estSucces) {
      setPirForm({
        show: true,
        isEchec: true,
        description: `RAPPORT D'INCIDENT / ÉCHEC (Rollback Déclenché)

Action tentée: ${selectedTask.titre_tache}

Détail de l'incident technique:
- 

Cause racine estimée:
- 

Plan de Rollback exécuté (Oui/Non):
- 

Impact actuel sur le service:
- `
      });
    } else {
      setPirForm({
        show: true,
        isEchec: false,
        description: `Rapport de Succès de l'Implémentation

Tâche: ${selectedTask.titre_tache}

Actions réalisées avec succès:
- 

Vérifications post-implémentation effectuées:
- `
      });
    }
  };

  const handleSubmitResult = async () => {
    try {
      // 1. Ajouter le journal d'exécution
      await api.post(`/taches/${selectedTask.id_tache}/journaux`, {
        titre_journal: pirForm.isEchec ? 'INCIDENT / ÉCHEC' : 'SUCCÈS D\'EXÉCUTION',
        description: pirForm.description
      });
      
      // 2. Changer le statut de la tâche
      const targetCode = pirForm.isEchec ? 'ANNULEE' : 'TERMINEE';
      const statusToSet = statutsTache.find(s => s.code_statut === targetCode);
      
      if (!statusToSet) {
        throw new Error(`Le statut cible "${targetCode}" est introuvable dans le référentiel.`);
      }

      await api.patch(`/taches/${selectedTask.id_tache}/statut`, { id_statut: statusToSet.id_statut });
      
      alert(pirForm.isEchec ? 'Incident signalé et transmis au Change Manager.' : 'Exécution terminée avec succès.');
      
      // 3. Nettoyage et rafraîchissement
      setPirForm({ show: false, description: '' });
      await fetchTasks();
      setShowModal(false);
    } catch (error) {
      console.error('Declaration Result Error:', error);
      // L'intercepteur retourne déjà l'objet d'erreur du backend ou le message d'erreur axios
      const errorMsg = error?.message || error?.error || 'Erreur lors de la déclaration du résultat.';
      alert(errorMsg);
    }
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.statut?.code_statut === 'EN_ATTENTE').length,
    inProgress: tasks.filter(t => t.statut?.code_statut === 'EN_COURS').length,
    completed: tasks.filter(t => t.statut?.code_statut === 'TERMINEE').length,
    failed: tasks.filter(t => t.statut?.code_statut === 'ANNULEE').length
  };

  return (
    <div className="my-tasks-container">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
            <FiCheckSquare />
          </div>
          <div className="premium-header-text">
            <h1>Mes Assignations</h1>
            <p>Consultez et exécutez vos tâches d'implémentation · Temps réel ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
           <button 
                className="btn-create-premium" 
                onClick={() => fetchTasks()}
                style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
            >
                <FiActivity /> Actualiser
            </button>
        </div>
      </div>

      {/* KPI Grid — Aligned with Dashboard CSS */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard 
          title="Total" 
          value={stats.total} 
          icon={<FiCheckSquare />} 
          color="blue" 
          onClick={() => setFilter('ALL')}
          active={filter === 'ALL'}
        />
        <StatCard 
          title="À faire" 
          value={stats.pending} 
          icon={<FiClock />} 
          color="amber" 
          onClick={() => setFilter('EN_ATTENTE')}
          active={filter === 'EN_ATTENTE'}
          trend={{ value: 'Priorité haute', type: 'warning' }}
        />
        <StatCard 
          title="En cours" 
          value={stats.inProgress} 
          icon={<FiPlay />} 
          color="purple" 
          onClick={() => setFilter('EN_COURS')}
          active={filter === 'EN_COURS'}
          trend={{ value: 'Exécution active', type: 'info' }}
        />
        <StatCard 
          title="Terminées" 
          value={stats.completed} 
          icon={<FiCheckCircle />} 
          color="green" 
          onClick={() => setFilter('TERMINEE')}
          active={filter === 'TERMINEE'}
          trend={{ value: 'Succès', type: 'success' }}
        />
      </div>
      
      <div className="tasks-list-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
           <div className="search-bar" style={{ flex: 1, maxWidth: '400px', marginBottom: 0 }}>
             <FiSearch />
             <input 
               type="text" 
               placeholder="Filtrer par code ou titre..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
        </div>

        <div className="tasks-table-container">
          {loading ? (
             <div className="loading-state">Initialisation...</div>
          ) : filteredTasks.length === 0 ? (
             <div className="empty-state">Aucune tâche assignée.</div>
          ) : (
             <table className="tasks-table">
               <thead>
                 <tr>
                   <th>Code</th>
                   <th>Titre</th>
                   <th>Changement</th>
                   <th>RFC</th>
                   <th>Statut</th>
                   <th>Priorité</th>
                   <th>Date</th>
                   <th>Durée</th>
                   <th>Actions</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredTasks.map(task => (
                   <tr
                     key={task.id_tache}
                     className={selectedTask?.id_tache === task.id_tache ? 'selected' : ''}
                     onClick={() => handleSelectTask(task)}
                   >
                     <td>{task.code_tache}</td>
                     <td>{task.titre_tache}</td>
                     <td>{task.changement?.code_changement || '-'}</td>
                     <td>{task.changement?.rfc?.code_rfc || '-'}</td>
                     <td>
                      <span className={`status-badge status-badge-sm ${getTaskStatusClass(task.statut?.code_statut)}`}>
                         {task.statut?.libelle}
                       </span>
                     </td>
                     <td>{task.ordre_tache || '-'}</td>
                     <td>{new Date(task.date_creation).toLocaleDateString()}</td>
                     <td>{task.duree ? `${task.duree}h` : '-'}</td>
                     <td>
                       <button className="btn-select" onClick={(e) => { e.stopPropagation(); handleSelectTask(task); }}>
                         Ouvrir
                       </button>
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
        </div>
      </div>

      {showModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>{selectedTask.titre_tache}</h2>
                <p className="modal-subtitle">{selectedTask.code_tache} • {selectedTask.changement?.code_changement || 'Pas de changement'} • {selectedTask.changement?.rfc?.code_rfc || 'Pas de RFC'}</p>
              </div>
              <button className="modal-close" onClick={() => setShowModal(false)}><FiX /></button>
            </div>
            <div className="modal-body">
              <div className="task-attribute-grid">
                <div><strong>Description</strong><p>{selectedTask.description || 'Aucune description disponible.'}</p></div>
                <div>
                  <strong>Statut</strong>
                  <p>
                    <span className={`status-badge status-badge-md ${getTaskStatusClass(selectedTask.statut?.code_statut)}`}>
                      {selectedTask.statut?.libelle || 'N/A'}
                    </span>
                  </p>
                </div>
                <div><strong>Priorité</strong><p>{selectedTask.ordre_tache || '-'}</p></div>
                <div><strong>Date création</strong><p>{new Date(selectedTask.date_creation).toLocaleDateString()}</p></div>
                <div><strong>Durée estimée</strong><p>{selectedTask.duree ? `${selectedTask.duree}h` : '-'}</p></div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%', gap: '1rem', marginTop: '1.5rem' }}>
                {selectedTask.statut?.code_statut === 'EN_ATTENTE' ? (
                  <button className="btn-select" style={{ flex: 1, padding: '0.85rem' }} onClick={() => handleUpdateStatus(selectedTask.id_tache, 'EN_COURS')}>
                    <FiPlay className="btn-icon-gap" /> Démarrer la tâche
                  </button>
                ) : selectedTask.statut?.code_statut === 'EN_COURS' ? (
                  <>
                    <button className="btn-probleme" onClick={() => handleDeclarrerResultat(false)} style={{ flex: 1 }}>
                      <FiAlertCircle /> Signaler un Échec (Rollback)
                    </button>
                    <button className="btn-cloturer" onClick={() => handleDeclarrerResultat(true)} style={{ flex: 1 }}>
                      <FiCheckCircle /> Terminer l'exécution (Succès)
                    </button>
                  </>
                ) : (
                  <div style={{ flex: 1, textAlign: 'center', color: '#64748b', fontWeight: 600, padding: '0.85rem', background: '#f1f5f9', borderRadius: '8px' }}>
                    Tâche {selectedTask.statut?.libelle || 'Clôturée'}
                  </div>
                )}
              </div>
              <div className="modal-note">
                <p><strong>Info:</strong> Vous devez d'abord démarrer la tâche. Si l’implémentation échoue, le Change Manager sera informé et la tâche sera marquée pour rollback.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {pirForm.show && (
        <div className="modal-overlay" onClick={() => setPirForm({ show: false })}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{pirForm.isEchec ? 'Déclaration d\'Échec' : 'Validation de Succès'}</h2>
              <button className="modal-close" onClick={() => setPirForm({ show: false })}><FiX /></button>
            </div>
            <div className="modal-body">
              <textarea
                placeholder="Détaillez votre compte-rendu d'exécution..."
                value={pirForm.description}
                onChange={e => setPirForm({...pirForm, description: e.target.value})}
                rows={12}
                className="pir-textarea"
              />
              <div className="modal-actions">
                <button 
                  className={pirForm.isEchec ? 'btn-probleme' : 'btn-submit'} 
                  onClick={handleSubmitResult} 
                  disabled={!pirForm.description.trim()}
                >
                  <FiSend className="btn-icon-gap" />
                  Confirmer le Résultat
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;
