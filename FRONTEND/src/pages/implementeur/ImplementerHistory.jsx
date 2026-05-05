import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiSearch, FiFileText } from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './MyTasks.css'; 

const ImplementerHistory = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        if (!user?.id_user) return;
        
        const changesRes = await api.get('/changements');
        const allChanges = changesRes.data?.changements || [];
        
        let allJournals = [];
        
        await Promise.all(allChanges.map(async (change) => {
          try {
            const res = await api.get(`/changements/${change.id_changement}/taches`);
            const tasksList = res.data?.taches || res.taches || [];
            
            // Tâches de l'utilisateur
            const myTasks = tasksList.filter(t => t.id_user === user.id_user || t.implementeur?.id_user === user.id_user);
            
            myTasks.forEach(task => {
              if (task.journaux && task.journaux.length > 0) {
                task.journaux.forEach(j => {
                  allJournals.push({
                    ...j,
                    tache: task,
                    changement: change
                  });
                });
              }
            });
          } catch (e) {
            // Ignorer les erreurs pour un changement spécifique
          }
        }));
        
        // Trier par date la plus récente
        allJournals.sort((a, b) => new Date(b.date_entree) - new Date(a.date_entree));
        
        setJournals(allJournals);
      } catch (error) {
        console.error('Fetch History Error:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchHistory();
  }, [user]);

  const filteredJournals = journals.filter(j => 
    j.titre_journal?.toLowerCase().includes(search.toLowerCase()) ||
    j.description?.toLowerCase().includes(search.toLowerCase()) ||
    j.tache?.code_tache?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="my-tasks-container">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}><FiClock /></div>
          <div className="premium-header-text">
            <h1>Historique d'exécution</h1>
            <p>Retrouvez l'historique complet de vos journaux d'exécution et rapports d'incidents.</p>
          </div>
        </div>
      </div>
      
      <div className="tasks-list-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'flex-end' }}>
           <div className="search-bar" style={{ marginBottom: 0, width: '400px' }}>
             <FiSearch />
             <input 
               type="text" 
               placeholder="Rechercher dans l'historique..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
        </div>

        <div className="tasks-table-container">
          {loading ? (
             <div className="loading-state">Chargement de l'historique...</div>
          ) : filteredJournals.length === 0 ? (
             <div className="empty-state">
               <FiFileText size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
               <br />
               Aucun historique trouvé.
             </div>
          ) : (
             <table className="tasks-table">
               <thead>
                 <tr>
                   <th style={{ width: '15%' }}>Date</th>
                   <th style={{ width: '25%' }}>Titre du Journal</th>
                   <th style={{ width: '15%' }}>Tâche Associée</th>
                   <th style={{ width: '45%' }}>Description</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredJournals.map(journal => (
                   <tr key={journal.id_journal}>
                     <td>{new Date(journal.date_entree).toLocaleString()}</td>
                     <td>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                         {journal.titre_journal?.toLowerCase().includes('échec') || journal.titre_journal?.toLowerCase().includes('incident') 
                           ? <FiAlertCircle color="#dc2626" size={16} style={{ flexShrink: 0 }} /> 
                           : <FiCheckCircle color="#059669" size={16} style={{ flexShrink: 0 }} />}
                         <strong>{journal.titre_journal || 'Journal'}</strong>
                       </div>
                     </td>
                     <td>
                        <span className="task-id" style={{ fontSize: '0.8rem' }}>{journal.tache?.code_tache}</span>
                     </td>
                     <td style={{ whiteSpace: 'pre-wrap', color: '#475569', fontSize: '0.85rem' }}>
                       {journal.description}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImplementerHistory;
