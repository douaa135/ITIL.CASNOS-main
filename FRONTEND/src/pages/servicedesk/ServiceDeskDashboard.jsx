import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../context/SocketContext';
import {
  FiActivity, FiAlertTriangle, FiCheckCircle, FiSearch,
  FiClock, FiBookOpen, FiArrowRight, FiPlus, FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import rfcService from '../../services/rfcService';
import changeService from '../../services/changeService';
import './Dashboard.css';
import '../admin/AdminUnified.css';

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

  const { socket } = useSocket();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Récupération parallèle avec les services centralisés
      const [chgData, rfcData] = await Promise.all([
        changeService.getAllChangements({ limit: 1000 }),
        rfcService.getServiceDeskStats()
      ]);

      // 1. Changements actifs
      const active = (chgData || []).filter(c => c.statut?.code_statut === 'EN_COURS');
      setRunningChanges(active);

      // 2. Statistiques RFC via le service centralisé
      setStats({
        pending: rfcData.stats.pending,
        urgent: rfcData.stats.urgentPending,
        preevaluee: rfcData.stats.preevaluee,
        late: rfcData.stats.late,
      });
    } catch (error) {
      console.error('Service Desk Dashboard Error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!socket) return;
    const handleWs = () => fetchData();
    socket.on('rfc:update', handleWs);
    socket.on('changement:update', handleWs);
    return () => {
      socket.off('rfc:update', handleWs);
      socket.off('changement:update', handleWs);
    };
  }, [socket, fetchData]);

  if (loading) return (
    <div className="sd-loading">
      <FiRefreshCw className="spinning" /> Chargement du cockpit Service Desk...
    </div>
  );

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
          <button className="btn-create-premium" onClick={() => window.location.reload()} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
            <FiRefreshCw /> Actualiser
          </button>
          <button
            className="btn-create-premium"
            onClick={() => navigate('/servicedesk/rfcs/new')}
            style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', marginLeft: '12px' }}
          >
            <FiPlus /> Nouvelle RFC
          </button>
        </div>
      </div>

      <div className="sd-stats-grid">
        <div className="premium-glass-card stat-card purple" onClick={() => navigate('/servicedesk/inquiry')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper"><FiSearch /></div>
          <div className="stat-info">
            <span className="stat-label">En Attente</span>
            <span className="stat-value">{stats.pending}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card amber" onClick={() => navigate('/servicedesk/inquiry', { state: { filterUrgent: true } })} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper"><FiAlertTriangle /></div>
          <div className="stat-info">
            <span className="stat-label">Urgentes</span>
            <span className="stat-value">{stats.urgent}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card green" onClick={() => navigate('/servicedesk/inquiry')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon-wrapper"><FiCheckCircle /></div>
          <div className="stat-info">
            <span className="stat-label">Pré-aprouver</span>
            <span className="stat-value">{stats.preevaluee}</span>
          </div>
        </div>
        <div className="premium-glass-card stat-card red" onClick={() => navigate('/servicedesk/inquiry')} style={{ borderLeft: '3px solid #ef4444', cursor: 'pointer' }}>
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
            <button className="sd-action-link success" onClick={() => navigate('/servicedesk/rfcs/new')}>
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
