import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCheckCircle, FiClock, FiAlertCircle, 
  FiArrowRight, FiPlay, FiFileText, FiTrendingUp
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './Dashboard.css';

const ImplementerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const res = await api.get('/me/taches');
        if (res.success) {
          const taches = res.taches || [];
          setRecentTasks(taches.slice(0, 5));
          
          const counts = taches.reduce((acc, t) => {
            const code = t.statut?.code_statut;
            if (code === 'EN_ATTENTE') acc.pending++;
            else if (code === 'EN_COURS') acc.inProgress++;
            else if (code === 'TERMINEE') acc.completed++;
            return acc;
          }, { pending: 0, inProgress: 0, completed: 0 });
          
          setStats(counts);
        }
      } catch (error) {
        console.error('Implementer Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  // Calculate rotation for productivity circle
  const totalActives = stats.pending + stats.inProgress + stats.completed;
  const progressRatio = totalActives > 0 ? (stats.completed / totalActives) : 0;
  const progressDeg = progressRatio * 360;

  if (loading) return <div className="loading-state-fullscreen">Initialisation de votre espace travail...</div>;

  return (
    <div className="impl-dashboard">
      <div className="impl-welcome-section">
        <h1>Bon retour !</h1>
        <p>Vous avez <strong>{stats.pending + stats.inProgress}</strong> tâches actives sur votre liste d'assignations.</p>
      </div>

      <div className="impl-stats-grid">
        <div className="premium-glass-card stat-card blue">
          <div className="stat-icon-wrapper"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.pending}</span>
            <span className="stat-label">À Faire</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card amber">
          <div className="stat-icon-wrapper"><FiPlay /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">En Cours</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card green">
          <div className="stat-icon-wrapper"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Terminées</span>
          </div>
        </div>
      </div>

      <div className="impl-dashboard-layout">
        <div className="impl-main-col">
          <div className="section-header">
            <h3><FiFileText /> Tâches Récentes</h3>
            <button className="btn-link" onClick={() => navigate('/implementer/tasks')}>
              Tout voir <FiArrowRight />
            </button>
          </div>
          
          <div className="impl-tasks-mini-list">
            {recentTasks.length === 0 ? (
              <div className="premium-glass-card empty-state-box">
                <FiFileText size={48} />
                <p>Aucune tâche assignée pour le moment.</p>
              </div>
            ) : (
              recentTasks.map(task => (
                <div key={task.id_tache} className="mini-task-card-premium" onClick={() => navigate('/implementer/tasks')}>
                  <div className={`status-indicator ${task.statut?.code_statut}`} />
                  <div className="task-content-wrapper">
                    <div className="task-meta">
                      <span className="task-id">#{task.code_tache}</span>
                      <span className={`task-badge ${task.statut?.code_statut?.toLowerCase()}`}>
                        {task.statut?.libelle}
                      </span>
                    </div>
                    <h4>{task.titre_tache}</h4>
                    <p>{task.description || 'Aucune description'}</p>
                  </div>
                  <button className="btn-view-task">
                    <FiArrowRight />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="impl-side-col">
          <div className="premium-glass-card productivity-card">
            <h3 className="card-title"><FiTrendingUp /> Votre Productivité</h3>
            <div 
              className="productivity-circle" 
              style={{ '--progress': `${progressDeg}deg` }}
            >
               <div className="circle-inner">
                 <span className="count">{stats.completed}</span>
                 <span className="unit">Tâches</span>
               </div>
            </div>
            <p className="productivity-desc">Tâches finalisées avec succès sur l'ensemble de vos assignations.</p>
            <div className="impl-tip-box">
              <FiAlertCircle /> 
              <p>Chaque journal d'exécution ajouté aide au suivi de la mise en production.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImplementerDashboard;
