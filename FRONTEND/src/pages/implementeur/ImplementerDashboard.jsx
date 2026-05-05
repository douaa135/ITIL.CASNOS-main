import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCheckCircle, FiClock, FiAlertCircle, 
  FiArrowRight, FiPlay, FiFileText, FiTrendingUp, FiCheckSquare
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
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

  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        if (!user?.id_user) return;
        
        // 1. Fetch all changes
        const changesRes = await api.get('/changements');
        const changesData = changesRes.data || changesRes;
        const allChanges = (changesData.changements || []);
        
        // 2. Fetch tasks for each change
        const userTasks = [];
        await Promise.all(allChanges.map(async (change) => {
          try {
            const res = await api.get(`/changements/${change.id_changement}/taches`);
            const tasks = res.data?.taches || res.taches || [];
            // Filter by current implementer
            const myTasks = tasks.filter(t => t.id_user === user.id_user || t.implementeur?.id_user === user.id_user);
            userTasks.push(...myTasks);
          } catch (e) {
            // Ignore individual change errors
          }
        }));
        
        setRecentTasks(userTasks.slice(0, 5));
        
        const counts = userTasks.reduce((acc, t) => {
          const code = t.statut?.code_statut;
          if (code === 'EN_ATTENTE') acc.pending++;
          else if (code === 'EN_COURS') acc.inProgress++;
          else if (code === 'TERMINEE') acc.completed++;
          else if (code === 'ANNULEE') acc.failed++;
          return acc;
        }, { pending: 0, inProgress: 0, completed: 0, failed: 0 });
        
        setStats(counts);
      } catch (error) {
        console.error('Implementer Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, [user]);

  // Calculate rotation for productivity circle
  const totalActives = stats.pending + stats.inProgress + stats.completed;
  const progressRatio = totalActives > 0 ? (stats.completed / totalActives) : 0;
  const progressDeg = progressRatio * 360;

  if (loading) return <div className="loading-state-fullscreen">Initialisation de votre espace travail...</div>;

  return (
    <div className="impl-dashboard">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiCheckSquare /></div>
          <div className="premium-header-text">
            <h1>Bon retour !</h1>
            <p>Vous avez <strong>{stats.pending + stats.inProgress}</strong> tâches actives sur votre liste d'assignations.</p>
          </div>
        </div>
        <div className="premium-header-actions">
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <StatCard 
          title="À Faire" 
          value={stats.pending} 
          icon={<FiClock />} 
          color="blue" 
          onClick={() => navigate('/implementer/tasks')}
        />
        <StatCard 
          title="En Cours" 
          value={stats.inProgress} 
          icon={<FiPlay />} 
          color="amber" 
          onClick={() => navigate('/implementer/tasks')}
        />
        <StatCard 
          title="Succès" 
          value={stats.completed} 
          icon={<FiCheckCircle />} 
          color="green" 
          onClick={() => navigate('/implementer/tasks')}
        />
        <StatCard 
          title="Échec" 
          value={stats.failed} 
          icon={<FiAlertCircle />} 
          color="red" 
          onClick={() => navigate('/implementer/tasks')}
        />
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
