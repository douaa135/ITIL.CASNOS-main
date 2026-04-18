import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { 
  FiCalendar, FiCheckCircle, FiActivity, FiArrowUpRight, 
  FiPieChart, FiXCircle, FiTrendingUp, FiAlertCircle 
} from 'react-icons/fi';
import DemandeurDashboard from './DemandeurDashboard';
import api from '../../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [timeFilter, setTimeFilter] = useState('MOIS');

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [rfcRes, statsRes] = await Promise.all([
          api.get('/rfc'),
          api.get('/dashboard/stats')
        ]);
        
        if (rfcRes.success) {
          setRfcs(rfcRes.rfcs.map(r => ({
            ...r,
            statut: { code: r.statut?.code_statut || 'NOUVEAU' },
            type: r.typeRfc?.type || 'NORMAL'
          })));
        }
        if (statsRes.success) setStats(statsRes.stats);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  const userRole = user?.roles?.[0] || user?.role;
  if (userRole !== 'CHANGE_MANAGER' && userRole !== 'ADMIN') {
    return <DemandeurDashboard />;
  }

  if (loading) return <div className="loading-state">Chargement des données analytiques...</div>;

  // --- Aggregate Stats ---
  const total = stats?.totalRfc || rfcs.length;
  const countSuccess = stats?.byStatus?.find(s => ['APPROUVEE', 'CLOTUREE'].includes(s.statut))?.count || 0;
  const countFailed = stats?.byStatus?.find(s => s.statut === 'REJETEE')?.count || 0;
  const countUrgent = stats?.byType?.find(t => t.type === 'URGENT')?.count || 0;

  const approvalRate = total > 0 ? Math.round((countSuccess / total) * 100) : 0;
  const failureRate = total > 0 ? Math.round((countFailed / total) * 100) : 0;
  
  const barData = [
    { name: 'Standard', volume: stats?.byType?.find(t => t.type === 'STANDARD')?.count || 0, color: '#10b981' },
    { name: 'Normal', volume: stats?.byType?.find(t => t.type === 'NORMAL')?.count || 0, color: '#3b82f6' },
    { name: 'Urgent', volume: countUrgent, color: '#ef4444' }
  ];

  const trendData = [
    { name: 'Lun', value: 4 }, { name: 'Mar', value: 7 }, { name: 'Mer', value: 5 },
    { name: 'Jeu', value: 9 }, { name: 'Ven', value: 12 }, { name: 'Sam', value: 3 }, { name: 'Dim', value: 2 }
  ];

  const KpiCard = ({ title, value, icon, color, trend, subtitle }) => (
    <Card className="premium-kpi-card" style={{ borderLeft: `5px solid ${color}` }}>
      <div className="kpi-header">
        <div className="kpi-icon" style={{ backgroundColor: `${color}15`, color }}>{icon}</div>
        {trend && <span className={`kpi-trend ${trend > 0 ? 'up' : 'down'}`}><FiTrendingUp /> {trend}%</span>}
      </div>
      <div className="kpi-body">
        <h3>{value}</h3>
        <p className="kpi-title">{title}</p>
        <p className="kpi-subtitle">{subtitle}</p>
      </div>
    </Card>
  );

  return (
    <div className="dashboard-container premium-ui-root">
      {/* Header Section */}
      <header className="dashboard-header glass-card">
        <div className="header-left">
          <h1>Cockpit Gouvernance ITIL</h1>
          <p>Analyse en temps réel du flux de changements • <span>CASNOS / DMSI</span></p>
        </div>
        <div className="header-right">
          <div className="filter-group">
            {['JOUR', 'SEMAINE', 'MOIS'].map(t => (
              <button 
                key={t}
                className={timeFilter === t ? 'active' : ''}
                onClick={() => setTimeFilter(t)}
              >
                {t === 'JOUR' ? "Aujourd'hui" : t === 'SEMAINE' ? '7 Jours' : '30 Jours'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* KPI Grid */}
      <div className="kpi-grid">
        <KpiCard 
          title="RFC Totales" 
          value={total} 
          icon={<FiCalendar />} 
          color="#3b82f6" 
          trend={+12}
          subtitle="Volume global sur la période"
        />
        <KpiCard 
          title="Taux d'Approbation" 
          value={`${approvalRate}%`} 
          icon={<FiCheckCircle />} 
          color="#10b981" 
          subtitle="Décisions favorables du CAB"
        />
        <KpiCard 
          title="Demandes Urgentes" 
          value={countUrgent} 
          icon={<FiAlertCircle />} 
          color="#ef4444" 
          trend={-5}
          subtitle="Flux de changements critiques"
        />
        <KpiCard 
          title="Taux de Rejet" 
          value={`${failureRate}%`} 
          icon={<FiXCircle />} 
          color="#f59e0b" 
          subtitle="RFC rejetées vs soumises"
        />
      </div>

      {/* Analytics Main Grid */}
      <div className="analytics-grid">
        {/* Chart 1: Distribution */}
        <Card className="chart-card glass-card">
          <div className="chart-header">
            <h3><FiPieChart /> Répartition par Type</h3>
            <p>Volume des changements par catégorie ITIL</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={barData} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }}
                  contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="volume" radius={[0, 4, 4, 0]} barSize={20}>
                  {barData.map((entry, index) => (
                    <cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Chart 2: Trends */}
        <Card className="chart-card glass-card">
          <div className="chart-header">
            <h3><FiActivity /> Tendance Hebdomadaire</h3>
            <p>Évolution quotidienne du dépôt de RFC</p>
          </div>
          <div className="chart-wrapper">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }} />
                <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Live Feed Row (Simulated) */}
      <div className="live-feed-row">
        <Card className="glass-card">
          <div className="chart-header">
            <h3><FiTrendingUp /> Dernières Activités</h3>
          </div>
          <div className="feed-items">
            <div className="feed-item">
              <span className="dot pulse success"></span>
              <p>RFC-2024-0428 approuvée par le CAB</p>
              <span className="time">Il y a 12 min</span>
            </div>
            <div className="feed-item">
              <span className="dot pulse warning"></span>
              <p>Réunion CAB hebdomadaire planifiée pour demain 10:00</p>
              <span className="time">Il y a 45 min</span>
            </div>
            <div className="feed-item">
              <span className="dot pulse info"></span>
              <p>Nouveau rapport PIR généré pour "Migration Oracle"</p>
              <span className="time">Il y a 2h</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
