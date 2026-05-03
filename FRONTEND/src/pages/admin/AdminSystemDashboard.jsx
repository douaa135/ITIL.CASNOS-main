import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import userService from '../../services/userService';
import systemService from '../../services/systemService';
import Card from '../../components/common/Card';
import {
    FiUsers, FiClipboard, FiRefreshCw, FiCheckSquare,
    FiActivity, FiArrowRight, FiPieChart, FiTrendingUp,
    FiPlus, FiLayers, FiAlertCircle, FiUserPlus, FiShield, FiServer, FiCalendar
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './AdminSystemDashboard.css';

const AdminSystemDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);

    const [userStats, setUserStats] = useState({ totalUsers: 0, activeUsers: 0 });
    const [envCount, setEnvCount] = useState(0);
    const [kpi, setKpi] = useState({
        rfc:         { total: 0, par_statut: [] },
        changements: { total: 0, par_statut: [], taux_reussite: 'N/A' },
        taches:      { total: 0, par_statut: [] },
    });
    const [detailedKpi, setDetailedKpi] = useState({
        rfc:         { urgentes: 0, approuvees: 0, par_type: [], par_priorite: [] },
        changements: { en_cours: 0, reussis: 0, echecs: 0, par_environnement: [] },
        taches:      { en_cours: 0, terminees: 0, annulees: 0, taux_completion: '0%' },
    });
    const [systemHealth, setSystemHealth] = useState({
        db: 'Connectée',
        audit: 'Actif',
        workflow: 'Synchronisé',
        notifications: 'Opérationnel',
        lastCheck: null
    });

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const userRes = await userService.getAllUsers();
                if (userRes && userRes.users) {
                    const all = userRes.users;
                    setUserStats({ 
                        totalUsers: userRes.total || all.length, 
                        activeUsers: all.filter(u => u.actif).length 
                    });
                }

                const envRes = await systemService.getEnvironnements();
                if (envRes.success) {
                    const envs = envRes.data?.data || envRes.data?.environnements || envRes.data || [];
                    setEnvCount(envs.length);
                }

                const kpiRes = await dashboardService.getDashboardStats();
                if (kpiRes?.data) {
                    const kpiData = kpiRes.data.data || kpiRes.data;
                    setKpi({
                        rfc:         kpiData.rfc         || { total: 0, par_statut: [] },
                        changements: kpiData.changements || { total: 0, par_statut: [], taux_reussite: 'N/A' },
                        taches:      kpiData.taches      || { total: 0, par_statut: [] },
                    });
                }

                const [rfcRes, chgRes, tchRes] = await Promise.all([
                    dashboardService.getKpiRfc(),
                    dashboardService.getKpiChangements(),
                    dashboardService.getKpiTaches(),
                ]);
                setDetailedKpi({
                    rfc:         rfcRes?.data?.data || rfcRes?.data || { urgentes: 0, approuvees: 0, par_type: [], par_priorite: [] },
                    changements: chgRes?.data?.data || chgRes?.data || { en_cours: 0, reussis: 0, echecs: 0, par_environnement: [] },
                    taches:      tchRes?.data?.data || tchRes?.data || { en_cours: 0, terminees: 0, annulees: 0, taux_completion: '0%' },
                });

                // Fetch real system health
                const healthRes = await api.get('/health').catch(() => null);
                if (healthRes) {
                    setSystemHealth({
                        db: 'Connectée', // Prisma call success implies DB is OK
                        audit: healthRes.modules?.includes('audit-logs') ? 'Actif' : 'Indisponible',
                        workflow: healthRes.modules?.includes('workflow') ? 'Synchronisé' : 'En attente',
                        notifications: healthRes.modules?.includes('notifications') ? 'Opérationnel' : 'Service réduit',
                        lastCheck: healthRes.timestamp
                    });
                }
            } catch (error) {
                console.error('Erreur dashboard', error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (statut) => {
        const s = (statut || '').toUpperCase();
        const STATUS_COLORS = {
            'BROUILLON':        '#94a3b8',
            'SOUMIS':           '#3b82f6',
            'PRE_APPROUVEE':    '#f59e0b',
            'EN_EVALUATION':    '#8b5cf6',
            'EVALUEE':          '#a855f7',
            'EN_ATTENTE_CAB':   '#d97706',
            'APPROUVEE':        '#10b981',
            'CLOTUREE':         '#059669',
            'REJETEE':          '#ef4444',
            'ANNULEE':          '#dc2626',
            'EN_PLANIFICATION': '#6366f1',
            'EN_ATTENTE':       '#f97316',
            'EN_COURS':         '#0ea5e9',
            'IMPLEMENTE':       '#14b8a6',
            'TESTE':            '#22c55e',
            'EN_ECHEC':         '#e11d48',
            'CLOTURE':          '#059669',
            'TERMINEE':         '#10b981',
        };
        // Exact match first
        if (STATUS_COLORS[s]) return STATUS_COLORS[s];
        // Fallback fuzzy match
        if (s.includes('APPROUV') || s.includes('REUSSI') || s.includes('TERMINE') || s.includes('TESTE') || s.includes('IMPLEMENTE')) return '#10b981';
        if (s.includes('REJET') || s.includes('ECHEC') || s.includes('ANNULE')) return '#ef4444';
        if (s.includes('EVALU') || s.includes('PLANIFI') || s.includes('COURS')) return '#3b82f6';
        if (s.includes('SOUMIS') || s.includes('ATTENTE') || s.includes('PRE_APPROUV')) return '#f59e0b';
        return '#64748b';
    };

    const calcPercent = (part, total) => total > 0 ? Math.round((part / total) * 100) + '%' : '0%';
    const getSegmentStyle = (statut, count) => ({ flex: count, background: getStatusColor(statut), transition: 'flex 0.4s ease' });
    const getDotStyle = (statut) => ({ background: getStatusColor(statut) });
    const getProgressStyle = (statut, pct) => ({ width: `${pct}%`, background: getStatusColor(statut) });
    const getActionIconStyle = (item) => ({ background: item.iconBg, color: item.iconColor });

    if (loading && userStats.totalUsers === 0) {
        return (
            <div className="asd-loading">
                <FiRefreshCw className="spinning" /> Chargement des métriques ITIL…
            </div>
        );
    }

    return (
        <div className="asd-page">

            {/* ── Header ─────────────────────────────────────────────── */}
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
                        <FiActivity />
                    </div>
                    <div className="premium-header-text">
                        <h1>Cockpit ITIL</h1>
                        <p>Vue d'ensemble et métriques globales du système · Temps réel ·</p>
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
                    <div className="header-date-badge-cab">
                        <FiCalendar style={{ color: '#7c3aed' }} /> 
                        {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>
            </div>

            {/* ── KPI Cards ──────────────────────────────────────────── */}
            <div className="stats-grid asd-stats-grid">
                <div className="stat-card blue">
                    <div className="stat-icon-wrapper"><FiUsers size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{userStats.totalUsers}</div>
                        <div className="stat-label">Utilisateurs</div>
                        <div className="asd-kpi-sub asd-kpi-success">
                            {userStats.activeUsers} actifs ({calcPercent(userStats.activeUsers, userStats.totalUsers)})
                        </div>
                    </div>
                </div>

                <div className="stat-card amber">
                    <div className="stat-icon-wrapper"><FiClipboard size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{kpi.rfc.total}</div>
                        <div className="stat-label">Total RFC</div>
                        <div className="asd-kpi-sub asd-kpi-danger">
                            {detailedKpi.rfc.urgentes} urgentes
                        </div>
                    </div>
                </div>

                <div className="stat-card green">
                    <div className="stat-icon-wrapper"><FiRefreshCw size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{kpi.changements.total}</div>
                        <div className="stat-label">Changements</div>
                        <div className="asd-kpi-sub asd-kpi-info">
                            {detailedKpi.changements.en_cours} en cours
                        </div>
                    </div>
                </div>

                <div className="stat-card purple">
                    <div className="stat-icon-wrapper"><FiServer size={22} /></div>
                    <div className="stat-info">
                        <div className="stat-value">{envCount}</div>
                        <div className="stat-label">Environnements</div>
                        <div className="asd-kpi-sub asd-kpi-purple">
                            {kpi.taches.total} tâches au total
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Contenu principal ───────────────────────────────────── */}
            <div className="asd-main-grid">

                {/* Gauche : distributions */}
                <div className="asd-left-col">

                    {/* RFC */}
                    <div className="dash-section-card">
                        <div className="dash-section-header">
                            <div className="asd-chip asd-chip-blue">
                                <FiClipboard size={18} />
                            </div>
                            <h4 className="asd-section-title">
                                RFCs <span className="asd-section-subtitle">— répartition par statut</span>
                            </h4>
                        </div>
                        {kpi.rfc.par_statut.length === 0 ? (
                            <p className="asd-empty-text">Aucune donnée.</p>
                        ) : (
                            <>
                                {/* Barre visuelle */}
                                <div className="asd-bar-wrap">
                                    {kpi.rfc.par_statut.map((item, idx) => (
                                        <div
                                            key={idx}
                                            className="bar-segment"
                                            style={getSegmentStyle(item.statut, item.count)}
                                            title={`${item.libelle} : ${item.count}`}
                                        />
                                    ))}
                                </div>
                                {/* Légende */}
                                <div className="asd-legend-wrap">
                                    {kpi.rfc.par_statut.map((item, idx) => (
                                        <div key={idx} className="asd-legend-item">
                                            <div className="asd-legend-dot" style={getDotStyle(item.statut)} />
                                            <span>{item.libelle} <strong>({item.count})</strong></span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Changements + Tâches côte à côte */}
                    <div className="asd-split-grid">

                        {/* Changements */}
                        <div className="dash-section-card">
                            <div className="dash-section-header">
                                <div className="asd-chip asd-chip-green">
                                    <FiRefreshCw size={18} />
                                </div>
                                <h4 className="asd-section-title">Changements</h4>
                            </div>
                            {kpi.changements.par_statut.length === 0 ? (
                                <p className="asd-empty-text">Aucun changement.</p>
                            ) : (
                                <div className="asd-list-stack">
                                    {kpi.changements.par_statut.map((item, idx) => {
                                        const pct = kpi.changements.total > 0 ? Math.round((item.count / kpi.changements.total) * 100) : 0;
                                        return (
                                            <div key={idx}>
                                                <div className="asd-row-between">
                                                    <span className="asd-inline-dot-label">
                                                        <span className="asd-inline-dot" style={getDotStyle(item.statut)} />
                                                        {item.libelle}
                                                    </span>
                                                    <strong className="asd-strong">{item.count}</strong>
                                                </div>
                                                <div className="asd-progress-track">
                                                    <div className="asd-progress-fill" style={getProgressStyle(item.statut, pct)} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Tâches */}
                        <div className="dash-section-card">
                            <div className="dash-section-header">
                                <div className="asd-chip asd-chip-magenta">
                                    <FiCheckSquare size={18} />
                                </div>
                                <h4 className="asd-section-title">Tâches</h4>
                            </div>
                            <div className="asd-triplet">
                                <div className="asd-triplet-item">
                                    <div className="asd-triplet-value asd-triplet-blue">{detailedKpi.taches.en_cours || 0}</div>
                                    <div className="asd-triplet-label">En cours</div>
                                </div>
                                <div className="asd-triplet-item">
                                    <div className="asd-triplet-value asd-triplet-green">{detailedKpi.taches.terminees || 0}</div>
                                    <div className="asd-triplet-label">Terminées</div>
                                </div>
                                <div className="asd-triplet-item">
                                    <div className="asd-triplet-value asd-triplet-red">{detailedKpi.taches.annulees || 0}</div>
                                    <div className="asd-triplet-label">Annulées</div>
                                </div>
                            </div>
                            {kpi.taches.par_statut.length === 0 ? (
                                <p className="asd-empty-text">Aucune tâche.</p>
                            ) : (
                                <div className="asd-list-stack-sm">
                                    {kpi.taches.par_statut.map((item, idx) => (
                                        <div key={idx} className="asd-row-between asd-row-sm">
                                            <span className="asd-inline-dot-label">
                                                <span className="asd-inline-dot" style={getDotStyle(item.statut)} />
                                                {item.libelle}
                                            </span>
                                            <strong className="asd-strong">{item.count}</strong>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Droite : Actions rapides + état système */}
                <div className="asd-right-col">

                    {/* Actions rapides */}
                    <div className="dash-section-card">
                        <div className="dash-section-header asd-mb-1">
                            <div className="asd-chip asd-chip-violet">
                                <FiActivity size={18} />
                            </div>
                            <h4 className="asd-section-title">Actions rapides</h4>
                        </div>

                        <div className="asd-list-stack">
                            {[
                                { icon: <FiUsers size={16} />, label: 'Gestion Utilisateurs', path: '/admin/users',      iconBg: '#eff6ff', iconColor: '#3b82f6' },
                                { icon: <FiLayers size={16} />, label: 'Gestion CIs',          path: '/admin/cis',       iconBg: '#f0fdfa', iconColor: '#0d9488' },
                                { icon: <FiClipboard size={16} />, label: 'RFCs',              path: '/admin/rfcs',      iconBg: '#fef3c7', iconColor: '#b45309' },
                                { icon: <FiRefreshCw size={16} />, label: 'Changements',       path: '/admin/changes',   iconBg: '#f0fdf4', iconColor: '#10b981' },
                                { icon: <FiCheckSquare size={16} />, label: 'Tâches',          path: '/admin/tasks',     iconBg: '#fdf4ff', iconColor: '#d946ef' },
                            ].map((item) => (
                                <div
                                    key={item.path}
                                    className="action-nav-card"
                                    onClick={() => navigate(item.path)}
                                >
                                    <div className="asd-action-left">
                                        <div className="asd-action-icon" style={getActionIconStyle(item)}>
                                            {item.icon}
                                        </div>
                                        <span className="asd-action-label">{item.label}</span>
                                    </div>
                                    <FiArrowRight className="nav-arrow" size={16} />
                                </div>
                            ))}
                        </div>
                    </div>

                        <div className="asd-system-box">
                            <h4 className="asd-system-title">
                                <FiAlertCircle size={16} /> État du Système
                            </h4>
                            <div className="asd-system-line">
                                <span className="asd-system-check">✓</span>
                                <strong>Base de données</strong> : {systemHealth.db}
                            </div>
                            <div className="asd-system-line">
                                <span className="asd-system-check">✓</span>
                                <strong>Service d'Audit</strong> : {systemHealth.audit}
                            </div>
                            <div className="asd-system-line">
                                <span className="asd-system-check">✓</span>
                                <strong>Moteur Workflow</strong> : {systemHealth.workflow}
                            </div>
                            <div className="asd-system-line">
                                <span className="asd-system-check">✓</span>
                                <strong>Notifications</strong> : {systemHealth.notifications}
                            </div>
                            {systemHealth.lastCheck && (
                                <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.5rem', textAlign: 'right' }}>
                                    Dernière vérification : {new Date(systemHealth.lastCheck).toLocaleTimeString()}
                                </div>
                            )}
                        </div>
                </div>
            </div>
        </div>
    );
};

export default AdminSystemDashboard;