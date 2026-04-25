import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCalendar, FiClock, FiFileText, FiTrendingUp,
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiBarChart2,
  FiChevronRight, FiRefreshCw, FiShield, FiTarget, FiActivity
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './dashboard.css';

const CabDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReunions: 0,
    rfcsEnAttente: 0,
    membresActifs: 0,
    decisionsRecentes: 0
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [pendingRfcs, setPendingRfcs] = useState([]);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger les statistiques générales
      const [cabsRes, rfcsRes, usersRes] = await Promise.all([
        api.get('/cab'),
        api.get('/rfc'),
        api.get('/users/by-role/MEMBRE_CAB')
      ]);

      if (cabsRes.success && cabsRes.cabs?.length > 0) {
        const cab = cabsRes.cabs[0];

        // Charger les réunions du CAB
        const reunionsRes = await api.get(`/cab/${cab.id_cab}/reunions`);
        if (reunionsRes.success) {
          const reunions = reunionsRes.reunions || [];
          setStats(prev => ({
            ...prev,
            totalReunions: reunions.length,
            membresActifs: usersRes.success ? usersRes.users?.length || 0 : 0
          }));

          // Réunions à venir (prochaines 30 jours)
          const now = new Date();
          const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          const upcoming = reunions
            .filter(r => new Date(r.date_reunion) >= now && new Date(r.date_reunion) <= thirtyDaysFromNow)
            .sort((a, b) => new Date(a.date_reunion) - new Date(b.date_reunion))
            .slice(0, 5);
          setUpcomingMeetings(upcoming);
        }
      }

      // RFCs approuvées en attente d'évaluation CAB
      if (rfcsRes.success) {
        const approvedRfcs = (rfcsRes.rfcs || []).filter(rfc =>
          rfc.statut?.code_statut === 'APPROUVEE'
        );
        setStats(prev => ({
          ...prev,
          rfcsEnAttente: approvedRfcs.length
        }));

        // RFCs récentes pour le tableau
        setPendingRfcs(approvedRfcs.slice(0, 5));
      }

      // Générer des alertes basées sur les données
      generateAlerts();

    } catch (error) {
      console.error('Erreur chargement dashboard CAB:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateAlerts = () => {
    const newAlerts = [];

    if (stats.rfcsEnAttente > 0) {
      newAlerts.push({
        type: 'warning',
        icon: FiAlertTriangle,
        title: 'RFCs en attente d\'évaluation',
        message: `${stats.rfcsEnAttente} RFC${stats.rfcsEnAttente > 1 ? 's' : ''} approuvée${stats.rfcsEnAttente > 1 ? 's' : ''} nécessite${stats.rfcsEnAttente > 1 ? 'nt' : ''} une évaluation CAB`,
        action: 'Évaluer maintenant',
        onClick: () => navigate('/cab/rfcs')
      });
    }

    if (upcomingMeetings.length === 0) {
      newAlerts.push({
        type: 'info',
        icon: FiCalendar,
        title: 'Aucune réunion planifiée',
        message: 'Consultez les réunions planifiées par le Change Manager',
        action: 'Voir les réunions',
        onClick: () => navigate('/cab/meetings')
      });
    }

    setAlerts(newAlerts);
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = '#6366f1' }) => (
    <div className="stat-card" style={{ '--card-color': color }}>
      <div className="stat-icon">
        <Icon />
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  const AlertCard = ({ alert }) => (
    <div className={`alert-card alert-${alert.type}`}>
      <div className="alert-icon">
        <alert.icon />
      </div>
      <div className="alert-content">
        <h4>{alert.title}</h4>
        <p>{alert.message}</p>
        {alert.action && (
          <button className="alert-action-btn" onClick={alert.onClick}>
            {alert.action} <FiChevronRight />
          </button>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="cab-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Chargement du tableau de bord CAB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cab-dashboard">

      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1><FiShield /> Tableau de Bord CAB</h1>
          <p>Vue d'ensemble des activités du Change Advisory Board</p>
        </div>
        <button className="refresh-btn" onClick={loadDashboardData}>
          <FiRefreshCw /> Actualiser
        </button>
      </div>

      {/* Alertes importantes */}
      {alerts.length > 0 && (
        <div className="alerts-section">
          <h2><FiAlertTriangle /> Alertes & Actions Requises</h2>
          <div className="alerts-grid">
            {alerts.map((alert, index) => (
              <AlertCard key={index} alert={alert} />
            ))}
          </div>
        </div>
      )}

      {/* Statistiques principales */}
      <div className="stats-section">
        <h2><FiBarChart2 /> Métriques Clés</h2>
        <div className="stats-grid">
          <StatCard
            icon={FiCalendar}
            title="Réunions CAB"
            value={stats.totalReunions}
            subtitle="Sessions planifiées"
            color="#6366f1"
          />
          <StatCard
            icon={FiFileText}
            title="RFCs en Attente"
            value={stats.rfcsEnAttente}
            subtitle="À évaluer"
            color="#f59e0b"
          />
          <StatCard
            icon={FiUsers}
            title="Membres Actifs"
            value={stats.membresActifs}
            subtitle="Comité CAB"
            color="#10b981"
          />
          <StatCard
            icon={FiCheckCircle}
            title="Décisions Récentes"
            value={stats.decisionsRecentes}
            subtitle="Ce mois"
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Contenu principal en grille */}
      <div className="dashboard-main-grid">

        {/* Réunions à venir */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FiCalendar /> Prochaines Réunions</h3>
            <span className="card-count">{upcomingMeetings.length}</span>
          </div>
          <div className="card-content">
            {upcomingMeetings.length === 0 ? (
              <div className="empty-state">
                <FiCalendar />
                <p>Aucune réunion planifiée dans les 30 prochains jours</p>
              </div>
            ) : (
              <div className="meetings-list">
                {upcomingMeetings.map(meeting => (
                  <div key={meeting.id_reunion} className="meeting-item">
                    <div className="meeting-date">
                      <div className="date-day">{new Date(meeting.date_reunion).getDate()}</div>
                      <div className="date-month">
                        {new Date(meeting.date_reunion).toLocaleDateString('fr-FR', { month: 'short' })}
                      </div>
                    </div>
                    <div className="meeting-info">
                      <h4>{meeting.ordre_jour || 'Session CAB'}</h4>
                      <div className="meeting-meta">
                        <span><FiClock /> {meeting.heure_debut?.substring(11, 16)} - {meeting.heure_fin?.substring(11, 16)}</span>
                      </div>
                    </div>
                    <FiChevronRight className="meeting-arrow" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RFCs en attente */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FiFileText /> RFCs à Évaluer</h3>
            <span className="card-count">{pendingRfcs.length}</span>
          </div>
          <div className="card-content">
            {pendingRfcs.length === 0 ? (
              <div className="empty-state">
                <FiFileText />
                <p>Aucune RFC en attente d'évaluation</p>
              </div>
            ) : (
              <div className="rfcs-list">
                {pendingRfcs.map(rfc => (
                  <div key={rfc.id_rfc} className="rfc-item">
                    <div className="rfc-code">#{rfc.code_rfc}</div>
                    <div className="rfc-info">
                      <h4>{rfc.titre_rfc}</h4>
                      <div className="rfc-meta">
                        <span className="rfc-demandeur">
                          {rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}
                        </span>
                        <span className={`rfc-priority priority-${rfc.priorite?.toLowerCase()}`}>
                          {rfc.priorite}
                        </span>
                      </div>
                    </div>
                    <div className="rfc-actions">
                      <button className="btn-evaluate" onClick={() => navigate(`/cab/rfcs/${rfc.id_rfc}/evaluate`)}>
                        <FiTarget /> Évaluer
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Activité récente */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FiActivity /> Activité Récente</h3>
            <span className="card-count">0</span>
          </div>
          <div className="card-content">
            <div className="empty-state">
              <FiActivity />
              <p>Aucune activité récente</p>
              <p className="empty-subtitle">Les évaluations et décisions apparaîtront ici</p>
            </div>
          </div>
        </div>

        {/* Indicateurs de performance */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FiTrendingUp /> Performance CAB</h3>
          </div>
          <div className="card-content">
            <div className="performance-indicators">
              <div className="indicator">
                <div className="indicator-label">Temps moyen d'évaluation</div>
                <div className="indicator-value">-- jours</div>
                <div className="indicator-trend neutral">À déterminer</div>
              </div>
              <div className="indicator">
                <div className="indicator-label">Taux d'approbation</div>
                <div className="indicator-value">-- %</div>
                <div className="indicator-trend neutral">À déterminer</div>
              </div>
              <div className="indicator">
                <div className="indicator-label">Participation moyenne</div>
                <div className="indicator-value">-- membres</div>
                <div className="indicator-trend neutral">À déterminer</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CabDashboard;