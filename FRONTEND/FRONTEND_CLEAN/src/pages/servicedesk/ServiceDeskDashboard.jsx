import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiActivity, FiAlertTriangle, FiCheckCircle, FiSearch, 
  FiClock, FiRadio, FiBookOpen, FiArrowRight, FiPlus
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './Dashboard.css';

const ServiceDeskDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    activeChanges: 0,
    upcomingToday: 0,
    pendingVerification: 0,
    totalRfcs: 0
  });
  const [runningChanges, setRunningChanges] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resChg, resRfc] = await Promise.all([
          api.get('/changements'),
          api.get('/rfc')
        ]);

        if (resChg.success && resRfc.success) {
          const active = (resChg?.data?.changements || []).filter(c => c.statut?.code_statut === 'EN_COURS');
          setRunningChanges(active);
          setStats({
            activeChanges: active.length,
            upcomingToday: resChg.data.changements.filter(c => {
               if (!c.date_debut) return false;
               const today = new Date().toISOString().split('T')[0];
               return c.date_debut.startsWith(today);
            }).length,
            pendingVerification: resRfc.data.rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length,
            totalRfcs: resRfc.data.rfcs.length
          });
        }
      } catch (error) {
        console.error('Service Desk Dashboard Error:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="sd-loading">Chargement du cockpit Service Desk...</div>;

  return (
    <div className="sd-dashboard">
      <div className="sd-welcome">
        <h1>Cockpit Service Desk</h1>
        <p>Surveillance en temps réel et support utilisateur première ligne.</p>
      </div>

      <div className="sd-stats-grid">
        <div className="premium-glass-card stat-card blue">
          <div className="stat-icon-wrapper"><FiActivity /></div>
          <div className="stat-info">
            <span className="stat-label">Changements en Cours</span>
            <span className="stat-value">{stats.activeChanges}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card amber">
          <div className="stat-icon-wrapper"><FiClock /></div>
          <div className="stat-info">
            <span className="stat-label">Prévus aujourd'hui</span>
            <span className="stat-value">{stats.upcomingToday}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card purple">
          <div className="stat-icon-wrapper"><FiSearch /></div>
          <div className="stat-info">
            <span className="stat-label">À vérifier</span>
            <span className="stat-value">{stats.pendingVerification}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card green">
          <div className="stat-icon-wrapper"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-label">Total RFC</span>
            <span className="stat-value">{stats.totalRfcs}</span>
          </div>
        </div>
      </div>

      <div className="sd-dashboard-content">
        <div className="sd-main-col">
          <div className="sd-section-header">
            <h3><FiAlertTriangle /> Surveillance Active</h3>
            <span className="live-badge">LIVE</span>
          </div>
          
          <div className="sd-active-monitor">
            {runningChanges.length === 0 ? (
              <div className="sd-empty-state">
                <FiCheckCircle size={40} />
                <p>Aucun changement critique en cours d'exécution.</p>
              </div>
            ) : (
              runningChanges.map(change => (
                <div key={change.id_changement} className="sd-monitor-item">
                   <div className="monitor-info">
                      <span className="change-id">#{change.code_changement}</span>
                      <h4>{change.rfc?.titre_rfc}</h4>
                      <p>Impact: PRODUCTION • {change.environnement?.nom_env}</p>
                   </div>
                   <div className="monitor-progress">
                      <div className="progress-bar"><div className="fill" style={{width: '60%'}}></div></div>
                      <span>En cours...</span>
                   </div>
                   <button className="sd-view-btn"><FiArrowRight /></button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="sd-actions-col">
           <div className="sd-quick-actions">
              <h3>Actions Support</h3>
              <button className="sd-action-link" onClick={() => navigate('/servicedesk/inquiry')}>
                <FiSearch /> 
                <div className="action-txt">
                  <strong>Triage des Requêtes</strong>
                  <span>Vérifier et trier les demandes RFC</span>
                </div>
              </button>
              <button className="sd-action-link success" onClick={() => navigate('/rfcs/new')}>
                <FiPlus /> 
                <div className="action-txt">
                  <strong>Nouvelle RFC</strong>
                  <span>Soumettre une demande</span>
                </div>
              </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ServiceDeskDashboard;
