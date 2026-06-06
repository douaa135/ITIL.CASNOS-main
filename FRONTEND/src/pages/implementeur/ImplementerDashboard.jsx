import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiCheckCircle, FiClock, FiAlertCircle, 
  FiArrowRight, FiPlay, FiFileText, FiTrendingUp, FiCheckSquare, FiAlertTriangle, FiRefreshCw
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import changeService from '../../services/changeService';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Toast from '../../components/common/Toast';
import './Dashboard.css';
import '../admin/AdminUnified.css';

const ImplementerDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    failed: 0,
    urgent: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ msg: '', type: '' });

  const { user } = useAuth();

  useEffect(() => {
    const fetchDashboardData = async () => {
      const targetId = user?.id_user || user?.id;
      if (!targetId) return;
      
      setLoading(true);
      try {
        const userTasks = await changeService.getMyTasks(targetId);
        
        // 1. Tâches récentes (5 dernières)
        setRecentTasks(userTasks.slice(0, 5));
        
        // 2. Calcul des statistiques
        const counts = userTasks.reduce((acc, t) => {
          const code = t.statut?.code_statut;
          if (code === 'EN_ATTENTE') acc.pending++;
          else if (code === 'EN_COURS') acc.inProgress++;
          else if (code === 'TERMINEE') acc.completed++;
          else if (code === 'ANNULEE') acc.failed++;
          return acc;
        }, { pending: 0, inProgress: 0, completed: 0, failed: 0 });
        
        setStats({
          ...counts,
          urgent: userTasks.filter(t =>
            ['EN_ATTENTE', 'EN_COURS'].includes(t.statut?.code_statut) &&
            (t.priorite_code === 'HAUTE' || t.priorite_code === 'CRITIQUE' || t.is_change_urgent)
          ).length,
        });
      } catch (error) {
        console.error('Implementer Dashboard Error:', error);
        setToast({ msg: 'Erreur lors du chargement des données du cockpit.', type: 'error' });
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

  if (loading && recentTasks.length === 0) return (
    <div className="impl-loading">
      <FiRefreshCw className="spinning" /> Initialisation du cockpit technique...
    </div>
  );

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
           <button 
                className="btn-create-premium" 
                onClick={() => window.location.reload()}
                style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            >
                <FiRefreshCw /> Actualiser
            </button>
        </div>
      </div>

      {/* ── Alerte Tâches Urgentes ── */}
      {(stats.urgent > 0 || loading) && (
        <div
          onClick={() => { if (!loading) navigate('/implementer/tasks?kpi=URGENT') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            padding: '1rem 1.5rem',
            background: loading ? '#f3f4f6' : 'linear-gradient(135deg, #fef2f2, #fff1f1)',
            border: loading ? '1.5px solid #e5e7eb' : '1.5px solid #fecaca',
            borderLeft: loading ? '4px solid #9ca3af' : '4px solid #ef4444',
            borderRadius: '14px',
            cursor: loading ? 'default' : 'pointer',
            animation: loading ? 'none' : 'urgentPulse 2s ease-in-out infinite',
            transition: 'box-shadow 0.2s, transform 0.2s',
            boxShadow: loading ? 'none' : '0 4px 14px rgba(239,68,68,0.15)',
            marginBottom: '1rem',
          }}
          onMouseEnter={e => {
            if(!loading) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(239,68,68,0.25)';
            }
          }}
          onMouseLeave={e => {
            if(!loading) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(239,68,68,0.15)';
            }
          }}
        >
          <div style={{
            width: '42px', height: '42px', borderRadius: '12px',
            background: loading ? '#9ca3af' : '#ef4444', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, fontSize: '1.2rem',
          }}>
            <FiAlertTriangle size={20} className={loading && stats.urgent === 0 ? "spinning" : ""} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: '800', color: loading ? '#6b7280' : '#dc2626', fontSize: '0.95rem' }}>
              {loading && stats.urgent === 0 ? "Vérification des tâches urgentes..." : `⚠️ ${stats.urgent} tâche${stats.urgent > 1 ? 's' : ''} urgente${stats.urgent > 1 ? 's' : ''} en attente`}
            </div>
            <div style={{ fontSize: '0.8rem', color: loading ? '#9ca3af' : '#ef4444', fontWeight: '600', marginTop: '2px' }}>
              {loading ? "Veuillez patienter..." : "Cliquez pour voir les tâches prioritaires HAUTE / CRITIQUE"}
            </div>
          </div>
          <div style={{ color: loading ? '#9ca3af' : '#ef4444', display: 'flex', alignItems: 'center' }}>
            <FiArrowRight size={18} />
          </div>
        </div>
      )}

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
        <StatCard 
          title="Urgentes" 
          value={stats.urgent} 
          icon={<FiAlertTriangle />} 
          color="red" 
          onClick={() => navigate('/implementer/tasks?kpi=URGENT')}
          trend={{ value: 'Prioritaires', type: 'danger' }}
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
          
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
            {recentTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                Aucune tâche assignée pour le moment.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', minWidth: '700px', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>Titre & Code</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'center', whiteSpace: 'nowrap' }}>Statut</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Priorité</th>
                      <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>RFC</th>
                      <th style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentTasks.map(task => {
                      const statusCode = task.statut?.code_statut || '';
                      const statusLabel = task.statut?.libelle || statusCode || 'N/A';
                      let statusBg = 'rgba(100,116,139,0.1)', statusFg = '#64748b';
                      if (['TERMINEE', 'SUCCES'].includes(statusCode)) { statusBg = 'rgba(16,185,129,0.1)'; statusFg = '#10b981'; }
                      else if (statusCode === 'EN_COURS') { statusBg = 'rgba(245,158,11,0.1)'; statusFg = '#d97706'; }
                      else if (['ANNULEE', 'ECHEC'].includes(statusCode)) { statusBg = 'rgba(239,68,68,0.1)'; statusFg = '#ef4444'; }
                      else if (statusCode === 'EN_ATTENTE') { statusBg = 'rgba(59,130,246,0.1)'; statusFg = '#3b82f6'; }

                      const prio = (task.priorite_code || 'NORMALE').toUpperCase();
                      const prioColors = { CRITIQUE: { bg: '#fef2f2', color: '#ef4444', border: '#fee2e2' }, HAUTE: { bg: '#fff7ed', color: '#f97316', border: '#ffedd5' }, NORMALE: { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' }, BASSE: { bg: '#f0fdf4', color: '#22c55e', border: '#dcfce7' } };
                      const pc = prioColors[prio] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };

                      return (
                        <tr
                          key={task.id_tache}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: '#ffffff', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                          onClick={() => navigate('/implementer/tasks')}
                        >
                          <td style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: statusCode === 'TERMINEE' ? '#10b981' : statusCode === 'EN_COURS' ? '#f59e0b' : '#3b82f6' }} />
                              <div>
                                <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }} title={task.titre_tache}>{task.titre_tache}</div>
                                <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 600 }}>{task.code_tache}</div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, backgroundColor: statusBg, color: statusFg, whiteSpace: 'nowrap' }}>{statusLabel}</span>
                          </td>
                          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, background: pc.bg, color: pc.color, border: `1px solid ${pc.border}`, whiteSpace: 'nowrap' }}>{prio}</span>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600, verticalAlign: 'middle' }}>
                            {task.changement?.rfc?.code_rfc || '-'}
                          </td>
                          <td style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => navigate('/implementer/tasks')}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#eff6ff', color: '#3b82f6', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                              onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                            >
                              <FiArrowRight size={14} /> Ouvrir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
      
      {toast.msg && (
        <Toast 
          msg={toast.msg} 
          type={toast.type} 
          onClose={() => setToast({ msg: '', type: '' })} 
        />
      )}
    </div>
  );
};

export default ImplementerDashboard;
