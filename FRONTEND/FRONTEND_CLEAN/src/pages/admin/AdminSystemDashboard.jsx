import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import dashboardService from '../../services/dashboardService';
import userService from '../../services/userService';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { 
    FiUsers, FiClipboard, FiRefreshCw, FiCheckSquare, 
    FiActivity, FiArrowRight, FiPieChart, FiTrendingUp,
    FiPlus, FiLayers, FiAlertCircle
} from 'react-icons/fi';

const AdminSystemDashboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    
    // User Stats
    const [userStats, setUserStats] = useState({
        totalUsers: 0,
        activeUsers: 0
    });

    // KPI Stats from Backend
    const [kpi, setKpi] = useState({
        rfc: { total: 0, par_statut: [] },
        changements: { total: 0, par_statut: [], taux_reussite: 'N/A' },
        taches: { total: 0, par_statut: [] }
    });

    // Detailed KPIs
    const [detailedKpi, setDetailedKpi] = useState({
        rfc: { urgentes: 0, approuvees: 0, par_type: [], par_priorite: [] },
        changements: { en_cours: 0, reussis: 0, echecs: 0, par_environnement: [] },
        taches: { en_cours: 0, terminees: 0, annulees: 0, taux_completion: '0%' }
    });

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                // Fetch Users
                const userRes = await userService.getAllUsers();
                if (userRes.success && userRes.users) {
                    setUserStats({
                        totalUsers: userRes.users.length,
                        activeUsers: userRes.users.filter(u => u.actif).length
                    });
                }

                // Fetch real KPIs
                const kpiRes = await dashboardService.getDashboardStats();
                if (kpiRes && kpiRes.data) {
                    const kpiData = kpiRes.data.data || kpiRes.data;
                    setKpi({
                        rfc: kpiData.rfc || { total: 0, par_statut: [] },
                        changements: kpiData.changements || { total: 0, par_statut: [], taux_reussite: 'N/A' },
                        taches: kpiData.taches || { total: 0, par_statut: [] }
                    });
                }

                // Fetch Detailed KPIs
                const [rfcRes, chgRes, tchRes] = await Promise.all([
                    dashboardService.getKpiRfc(),
                    dashboardService.getKpiChangements(),
                    dashboardService.getKpiTaches()
                ]);

                setDetailedKpi({
                    rfc: rfcRes?.data?.data || rfcRes?.data || { urgentes: 0, approuvees: 0, par_type: [], par_priorite: [] },
                    changements: chgRes?.data?.data || chgRes?.data || { en_cours: 0, reussis: 0, echecs: 0, par_environnement: [] },
                    taches: tchRes?.data?.data || tchRes?.data || { en_cours: 0, terminees: 0, annulees: 0, taux_completion: '0%' }
                });
            } catch (error) {
                console.error("Erreur lors de la récupération des données du dashboard", error);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
        
        // Auto-refresh every 30 seconds to keep KPIs live
        const interval = setInterval(fetchAllData, 30000);
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (statut) => {
        const s = (statut || '').toUpperCase();
        if (s.includes('APPROUV') || s.includes('CLOTURE') || s.includes('REUSSI') || s.includes('TERMINE')) return '#10b981'; // Green
        if (s.includes('REJET') || s.includes('ECHEC') || s.includes('ANNULE')) return '#ef4444'; // Red
        if (s.includes('EVALU') || s.includes('PLANIFI') || s.includes('COURS')) return '#3b82f6'; // Blue
        if (s.includes('SOUMIS') || s.includes('ATTENTE') || s.includes('URGENCE')) return '#f59e0b'; // Orange
        return '#64748b'; // Gray for BROUILLON and others
    };

    const calcPercent = (part, total) => total > 0 ? Math.round((part / total) * 100) + '%' : '0%';

    if (loading && userStats.totalUsers === 0) {
        return <div className="loading"><FiRefreshCw className="spinning" style={{marginRight: '10px'}} /> Chargement des métriques ITIL...</div>;
    }

    return (
        <div className="admin-system-dashboard" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: '0 0 0.5rem 0' }}>Cockpit ITIL</h1>
                        <p style={{ color: '#64748b', margin: 0 }}>Vue d'ensemble et métriques globales du système (Temps réel).</p>
                    </div>
                    <button 
                        onClick={() => window.print()}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #cbd5e1',
                            background: 'white', color: '#475569', cursor: 'pointer', fontWeight: '600', fontSize: '0.9rem',
                            transition: 'all 0.2s',
                        }}
                        className="hover-card"
                    >
                        <FiClipboard /> Générer Rapport
                    </button>
                    <button 
                        onClick={() => navigate('/admin-system/users', { state: { openCreate: true } })}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '0.6rem',
                            padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
                            background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
                            color: 'white', cursor: 'pointer', fontWeight: '700', fontSize: '0.9rem',
                            boxShadow: '0 4px 14px rgba(124,58,237,0.4)',
                            transition: 'all 0.2s',
                        }}
                    >
                        <FiPlus /> Créer compte
                    </button>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <div style={{ background: 'white', padding: '0.5rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Système Nominal</span>
                    </div>
                </div>
            </div>

            {/* Top Cards - Global Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FiUsers /></div>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Utilisateurs</span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>{userStats.activeUsers} <span style={{fontSize: '0.9rem', color: '#94a3b8', fontWeight: '500'}}>/ {userStats.totalUsers}</span></h3>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>{calcPercent(userStats.activeUsers, userStats.totalUsers)} d&apos;actifs</div>
                </Card>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FiClipboard /></div>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>RFCs</span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>{kpi.rfc.total}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: '600', marginTop: '0.2rem' }}>{detailedKpi.rfc.urgentes} Urgentes ({calcPercent(detailedKpi.rfc.urgentes, kpi.rfc.total)})</div>
                </Card>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FiRefreshCw /></div>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Changements</span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>{kpi.changements.total}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: '600', marginTop: '0.2rem' }}>{detailedKpi.changements.en_cours} En cours ({calcPercent(detailedKpi.changements.en_cours, kpi.changements.total)})</div>
                </Card>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FiTrendingUp /></div>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Succès Changements</span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '800', color: '#10b981' }}>{kpi.changements.taux_reussite}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.2rem' }}>{detailedKpi.changements.reussis} Réussis / {detailedKpi.changements.echecs} Échecs</div>
                </Card>

                <Card style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#fdf4ff', color: '#d946ef', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}><FiCheckSquare /></div>
                        <span style={{ fontWeight: '600', color: '#64748b', fontSize: '0.85rem' }}>Tâches</span>
                    </div>
                    <h3 style={{ margin: '0.5rem 0 0 0', fontSize: '1.5rem', fontWeight: '800' }}>{kpi.taches.total}</h3>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: '600', marginTop: '0.2rem' }}>{detailedKpi.taches.taux_completion} Complétées</div>
                    <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: '600', marginTop: '0.1rem' }}>{detailedKpi.taches.en_cours} En cours ({calcPercent(detailedKpi.taches.en_cours, kpi.taches.total)})</div>
                </Card>
            </div>

            {/* Main Content - Distributions */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                        <FiPieChart /> Répartition par Statut
                    </h3>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        {/* RFC Distribution */}
                        <Card style={{ padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.5rem', borderRadius: '8px' }}>
                                    <FiClipboard size={20} />
                                </div>
                                <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>RFCs</h4>
                            </div>
                            
                            {kpi.rfc.par_statut.length === 0 ? (
                                <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Aucune donnée disponible.</p>
                            ) : (
                                <div>
                                    {/* Visual Bar */}
                                    <div style={{ display: 'flex', width: '100%', height: '12px', borderRadius: '6px', overflow: 'hidden', marginBottom: '1rem' }}>
                                        {kpi.rfc.par_statut.map((item, idx) => {
                                            const percent = (item.count / kpi.rfc.total) * 100;
                                            return (
                                                <div key={idx} style={{ width: `${percent}%`, height: '100%', backgroundColor: getStatusColor(item.statut) }} title={`${item.libelle} : ${item.count}`} />
                                            );
                                        })}
                                    </div>
                                    {/* Legend */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
                                        {kpi.rfc.par_statut.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                                <div style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: getStatusColor(item.statut) }} />
                                                <span>{item.libelle} <strong>({item.count})</strong></span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </Card>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            {/* Changements Distribution */}
                            <Card style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{ background: '#f0fdf4', color: '#10b981', padding: '0.5rem', borderRadius: '8px' }}>
                                        <FiRefreshCw size={20} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Changements</h4>
                                </div>
                                {kpi.changements.par_statut.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Aucun changement.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {kpi.changements.par_statut.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(item.statut) }} />
                                                    {item.libelle}
                                                </div>
                                                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>

                            {/* Taches Distribution */}
                            <Card style={{ padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                    <div style={{ background: '#fdf4ff', color: '#d946ef', padding: '0.5rem', borderRadius: '8px' }}>
                                        <FiCheckSquare size={20} />
                                    </div>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>Tâches</h4>
                                </div>
                                {kpi.taches.par_statut.length === 0 ? (
                                    <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>Aucune tâche.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {kpi.taches.par_statut.map((item, idx) => (
                                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: '#475569' }}>
                                                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: getStatusColor(item.statut) }} />
                                                    {item.libelle}
                                                </div>
                                                <span style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{item.count}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </Card>
                        </div>
                    </div>
                </div>

                {/* Right Sidebar */}
                <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#1e293b' }}>
                        <FiActivity /> Actions Rapides
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <Card 
                            onClick={() => navigate('/admin-system/users')}
                            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                            className="hover-card"
                        >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ background: '#eff6ff', color: '#3b82f6', padding: '0.5rem', borderRadius: '8px' }}>
                                    <FiUsers />
                                </div>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>Gestion Utilisateurs</span>
                            </div>
                            <FiArrowRight color="#94a3b8" />
                        </Card>

                        <Card 
                            onClick={() => navigate('/admin-system/cis')}
                            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'all 0.2s' }}
                            className="hover-card"
                        >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <div style={{ background: '#f0fdfa', color: '#0d9488', padding: '0.5rem', borderRadius: '8px' }}>
                                    <FiLayers />
                                </div>
                                <span style={{ fontWeight: '600', color: '#1e293b' }}>Gestion CIs</span>
                            </div>
                            <FiArrowRight color="#94a3b8" />
                        </Card>
                    </div>

                    <div style={{ marginTop: '2rem', padding: '1.5rem', background: 'rgba(241, 245, 249, 0.5)', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ margin: '0 0 1rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#475569', fontSize: '1rem' }}>
                            <FiAlertCircle /> État du Système
                        </h4>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: '1.6' }}>
                            <p style={{ margin: '0 0 0.5rem 0' }}>✓ <strong>Base de données :</strong> Connectée</p>
                            <p style={{ margin: '0 0 0.5rem 0' }}>✓ <strong>Service d'Audit :</strong> Actif</p>
                            <p style={{ margin: '0 0 0.5rem 0' }}>✓ <strong>Moteur Workflow :</strong> Synchronisé</p>
                            <p style={{ margin: 0 }}>✓ <strong>Notifications :</strong> Opérationnel</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .loading {
                    height: 80vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.2rem;
                    color: #64748b;
                    font-weight: 500;
                }
                .hover-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                    border-color: #cbd5e1;
                }
                .spinning { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                
                @media print {
                    /* Cacher le menu latéral et le header global de l'appli */
                    nav, aside, header, .sidebar, button {
                        display: none !important;
                    }
                    /* Ajuster le dashboard pour qu'il prenne toute la page */
                    .admin-system-dashboard {
                        padding: 0 !important;
                        margin: 0 !important;
                        max-width: 100% !important;
                    }
                    body {
                        background: white !important;
                    }
                    /* Empêcher les coupures au milieu des cartes */
                    div[style*="grid"] > div, .hover-card {
                        break-inside: avoid;
                        border: 1px solid #e2e8f0 !important;
                        box-shadow: none !important;
                    }
                    /* Forcer les couleurs de fond à s'imprimer */
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminSystemDashboard;
