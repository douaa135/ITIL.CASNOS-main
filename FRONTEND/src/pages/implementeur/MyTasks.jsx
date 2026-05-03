import React, { useState, useEffect } from 'react';
import { 
  FiSearch, FiFilter, FiCheckCircle, FiPlay, 
  FiMoreVertical, FiPlus, FiMessageSquare, FiClock,
  FiX, FiSend, FiActivity, FiAlertCircle, FiFileText, FiCheckSquare
} from 'react-icons/fi';
import api from '../../api/axiosClient';
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
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/me/taches');
      if (res.success) setTasks(res.data?.taches || []);
    } catch (error) {
      console.error('Fetch My Tasks Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatuts = async () => {
    try {
      const res = await api.get('/statuts?contexte=TACHE');
      if (res.success) setStatutsTache(res.data?.statuts || []);
    } catch (e) { console.error(e); }
  };

  const handleUpdateStatus = async (taskId, nextStatusCode) => {
    const nextStatut = statutsTache.find(s => s.code_statut === nextStatusCode);
    if (!nextStatut) return;

    try {
      const res = await api.patch(`/taches/${taskId}/statut`, { id_statut: nextStatut.id_statut });
      if (res.success) {
        await fetchTasks();
        // Update selection
        if (selectedTask?.id_tache === taskId) {
           const updatedRes = await api.get(`/taches/${taskId}`);
           if (updatedRes.success) setSelectedTask(updatedRes.data?.tache || selectedTask);
        }
      }
    } catch (error) {
      alert(error?.response?.data?.message || 'Erreur lors du changement de statut.');
    }
  };

  const handleAddLog = async (e) => {
    e.preventDefault();
    if (!newLog.description.trim()) return;

    try {
      const res = await api.post(`/taches/${selectedTask.id_tache}/journaux`, newLog);
      if (res.success) {
        const updated = await api.get(`/taches/${selectedTask.id_tache}`);
        if (updated.success) setSelectedTask(updated.data?.tache || selectedTask);
        setNewLog({ titre_journal: '', description: '' });
      }
    } catch (error) {
      console.error('Add Log Error:', error);
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
      // Add journal
      await api.post(`/taches/${selectedTask.id_tache}/journaux`, {
        titre_journal: pirForm.isEchec ? 'INCIDENT / ÉCHEC' : 'SUCCÈS D\'EXÉCUTION',
        description: pirForm.description
      });
      
      const targetCode = pirForm.isEchec ? 'ANNULEE' : 'TERMINEE';
      const statusToSet = statutsTache.find(s => s.code_statut === targetCode);
      
      if (statusToSet) {
        await api.patch(`/taches/${selectedTask.id_tache}/statut`, { id_statut: statusToSet.id_statut });
        
        // Si c'est un échec, on pourrait aussi vouloir patcher le Changement à EN_ECHEC
        // Mais le backend peut s'en charger si la logique est centralisée.
        
        alert(pirForm.isEchec ? 'Incident signalé et transmis au Change Manager.' : 'Exécution terminée avec succès.');
        setPirForm({ show: false, description: '' });
        fetchTasks();
      }
    } catch (error) {
      alert('Erreur lors de la déclaration du résultat.');
    }
  };

  return (
    <div className="my-tasks-container">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiCheckSquare /></div>
          <div className="premium-header-text">
            <h1>Mes Assignations</h1>
            <p>Consultez et exécutez vos tâches d'implémentation.</p>
          </div>
        </div>
        <div className="premium-header-actions">
        </div>
      </div>
      
      <div className="tasks-list-panel">
        <div className="panel-header">
           <div className="search-bar">
             <FiSearch />
             <input 
               type="text" 
               placeholder="Filtrer par code ou titre..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
           <div className="filter-tabs">
             <button className={filter === 'ALL' ? 'active' : ''} onClick={() => setFilter('ALL')}>Toutes</button>
             <button className={filter === 'EN_ATTENTE' ? 'active' : ''} onClick={() => setFilter('EN_ATTENTE')}>À Faire</button>
             <button className={filter === 'EN_COURS' ? 'active' : ''} onClick={() => setFilter('EN_COURS')}>En Cours</button>
             <button className={filter === 'TERMINEE' ? 'active' : ''} onClick={() => setFilter('TERMINEE')}>Terminées</button>
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
              <div className="modal-actions modal-actions-fullwidth">
                <button className="btn-cloturer" onClick={() => handleDeclarrerResultat(true)}>
                  <FiCheckCircle /> Terminer l'exécution (Succès)
                </button>
                <button className="btn-probleme" onClick={() => handleDeclarrerResultat(false)}>
                  <FiAlertCircle /> Signaler un Échec (Rollback)
                </button>
              </div>
              <div className="modal-note">
                <p><strong>Info:</strong> Si l’implémentation échoue, le Change Manager sera informé et la tâche sera marquée pour rollback.</p>
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
