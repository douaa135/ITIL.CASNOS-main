import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiFileText, FiClock, FiCheckCircle, FiXCircle, 
  FiAlertCircle, FiArrowRight, FiUsers, FiCalendar, FiActivity 
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import StatCard from '../../components/common/StatCard';
import './Dashboard.css';

const Dashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        urgent: 0
    });
    const [recentRfcs, setRecentRfcs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch stats and recent RFCs from backend
                const res = await api.get('/rfc');
                if (res.success) {
                    const rfcs = res.data.rfcs || [];
                    setStats({
                        total: rfcs.length,
                        pending: rfcs.filter(r => r.statut?.code_statut === 'SOUMIS' || r.statut?.code_statut === 'EVALUEE').length,
                        approved: rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length,
                        rejected: rfcs.filter(r => r.statut?.code_statut === 'REJETEE').length,
                        urgent: rfcs.filter(r => r.typeRfc?.type === 'URGENT').length
                    });
                    setRecentRfcs(rfcs.slice(0, 5));
                }
            } catch (error) {
                console.error('Dashboard Load Error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    if (loading) return <div className="loading-spinner">Chargement des données...</div>;

    return (
        <div className="manager-dashboard">
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiActivity /></div>
                    <div className="premium-header-text">
                        <h1>Vue d'ensemble de l'activité</h1>
                        <p>Suivi en temps réel du cycle de vie des changements.</p>
                    </div>
                </div>
                <div className="premium-header-actions">
                    <div className="header-date">
                        <FiCalendar style={{ marginRight: '8px' }} />
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            {/* Support Grid for Stats — Coherent with Global System */}
            <div className="stats-grid">
                <StatCard title="Total RFC" value={stats.total} icon={<FiFileText />} color="blue" onClick={() => navigate('/manager/rfcs')} />
                <StatCard title="En attente" value={stats.pending} icon={<FiClock />} color="amber" trend={{ value: 'Evaluation', type: 'warning' }} />
                <StatCard title="RFC Urgentes" value={stats.urgent} icon={<FiAlertCircle />} color="red" trend={{ value: 'Priorité Haute', type: 'danger' }} />
                <StatCard title="Approuvées" value={stats.approved} icon={<FiCheckCircle />} color="green" trend={{ value: 'Prêt FSC', type: 'success' }} />
            </div>


            <div className="manager-dashboard-grid">
                {/* Recent RFCs Section */}
                <div className="premium-glass-card main-list-card">
                    <div className="card-header-main">
                        <h3 className="card-title"><FiFileText /> Dernières demandes</h3>
                        <button className="btn-view-all" onClick={() => navigate('/manager/rfcs')}>
                            Tout voir <FiArrowRight />
                        </button>
                    </div>
                    <div className="rfc-mini-list-premium">
                        {recentRfcs.map(rfc => (
                            <div key={rfc.id_rfc} className="rfc-item-premium" onClick={() => navigate(`/rfcs/${rfc.id_rfc}`)}>
                                <div className="rfc-item-left">
                                    <div className={`status-dot-indicator ${rfc.statut?.code_statut?.toLowerCase()}`} />
                                    <div className="rfc-text-box">
                                        <span className="rfc-id">#{rfc.code_rfc || rfc.id_rfc?.slice(0,8)}</span>
                                        <h4 className="rfc-title">{rfc.titre_rfc}</h4>
                                        <span className="rfc-subtext">Par {rfc.demandeur?.nom_user} • {new Date(rfc.date_creation).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className={`rfc-status-pill ${rfc.statut?.code_statut?.toLowerCase()}`}>
                                    {rfc.statut?.libelle}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Side Panels */}
                <div className="manager-side-panels">
                    <div className="premium-glass-card cab-panel">
                        <h3 className="card-title">Comité CAB</h3>
                        <div className="cab-preview-premium">
                            <FiUsers className="cab-illustration-icon" />
                            <p>Aucune session CAB planifiée aujourd'hui.</p>
                            <button className="btn-action-primary" onClick={() => navigate('/manager/cab')}>
                                Planifier un comité
                            </button>
                        </div>
                    </div>
                    
                    <div className="premium-glass-card calendar-panel">
                         <div className="panel-header">
                             <h4 className="panel-title">Calendrier FSC</h4>
                             <FiCalendar />
                         </div>
                         <div className="mini-calendar-strip">
                             <div className="calendar-day-item selected">
                                 <span className="day-name">LUN</span>
                                 <span className="day-num">12</span>
                             </div>
                             <div className="calendar-day-item">
                                 <span className="day-name">MAR</span>
                                 <span className="day-num">13</span>
                             </div>
                             <div className="calendar-day-item">
                                 <span className="day-name">MER</span>
                                 <span className="day-num">14</span>
                             </div>
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
