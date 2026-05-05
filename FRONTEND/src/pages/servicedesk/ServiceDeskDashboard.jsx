import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiActivity, FiAlertTriangle, FiCheckCircle, FiSearch, 
  FiClock, FiBookOpen, FiArrowRight, FiPlus, FiAlertCircle
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './Dashboard.css';

const ServiceDeskDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    pending: 0,
    urgent: 0,
    preevaluee: 0,
    late: 0
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
          const isLate = (rfc) => {
            if (!rfc.date_souhaitee) return false;
            if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
            return new Date(rfc.date_souhaitee) < new Date();
          };
          setStats({
            pending: resRfc.data.rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length,
            urgent: resRfc.data.rfcs.filter(r => r.typeRfc?.type === 'URGENT').length,
            preevaluee: resRfc.data.rfcs.filter(r => r.statut?.code_statut === 'PRE_APPROUVEE').length,
            late: resRfc.data.rfcs.filter(r => isLate(r)).length,
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
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiActivity /></div>
          <div className="premium-header-text">
            <h1>Cockpit Service Desk</h1>
            <p>Surveillance en temps réel et support utilisateur première ligne.</p>
          </div>
        </div>
        <div className="premium-header-actions">
           <button 
             className="btn-create-premium" 
             onClick={() => window.location.reload()}
             style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)' }}
           >
              <FiActivity /> Actualiser
           </button>
        </div>
      </div>

      <div className="sd-stats-grid">
        <div className="premium-glass-card stat-card purple">
          <div className="stat-icon-wrapper"><FiSearch /></div>
          <div className="stat-info">
            <span className="stat-label">En Attente</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card amber">
          <div className="stat-icon-wrapper"><FiAlertTriangle /></div>
          <div className="stat-info">
            <span className="stat-label">Urgentes</span>
            <span className="stat-value">{stats.urgent}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card green">
          <div className="stat-icon-wrapper"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-label">Pré-évaluées</span>
            <span className="stat-value">{stats.preevaluee}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card red" style={{ borderLeft: '3px solid #ef4444' }}>
          <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiAlertCircle /></div>
          <div className="stat-info">
            <span className="stat-label">En Retard</span>
            <span className="stat-value">{stats.late}</span>
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
                      <div className="progress-bar"><div className="fill fill-60"></div></div>
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
