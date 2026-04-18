import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import { 
    FiServer, FiActivity, FiShield, FiDatabase, 
    FiAlertTriangle, FiCheckCircle, FiClock, 
    FiArrowRight, FiHardDrive, FiCpu, FiZap,
    FiUsers, FiPlus
} from 'react-icons/fi';

const AdminSystemDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        systemHealth: 98.4,
        lastBackup: 'Il y a 2h'
    });
    const [loading, setLoading] = useState(true);

    // Simulated Infrastructure Nodes
    const [nodes, setNodes] = useState([
        { id: 1, name: 'SVR-APP-01', type: 'Application', status: 'online', cpu: '12%', ram: '4.2GB', env: 'PRD' },
        { id: 2, name: 'SVR-DB-POSTGRE', type: 'Database', status: 'online', cpu: '28%', ram: '16.5GB', env: 'PRD' },
        { id: 3, name: 'SVR-FS-01', type: 'Storage', status: 'online', cpu: '5%', ram: '2.1GB', env: 'PRD' },
        { id: 4, name: 'SVR-WEB-PROXY', type: 'Network', status: 'warning', cpu: '85%', ram: '7.8GB', env: 'PRD' },
        { id: 5, name: 'SVR-APP-RECETTE', type: 'Application', status: 'online', cpu: '2%', ram: '1.5GB', env: 'REC' },
        { id: 6, name: 'SVR-DB-TEST', type: 'Database', status: 'offline', cpu: '0%', ram: '0GB', env: 'TST' }
    ]);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await api.get('/users');
                if (res.success && res.data && res.data.data) {
                    const users = res.data.data;
                    setStats(prev => ({
                        ...prev,
                        totalUsers: users.length,
                        activeUsers: users.filter(u => u.actif).length
                    }));
                }
            } catch (error) {
                console.error("Error fetching user stats", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
        
        const interval = setInterval(() => {
            setNodes(prev => prev.map(n => {
                if (n.status === 'offline') return n;
                const base = parseInt(n.cpu);
                const variation = Math.floor(Math.random() * 5) - 2;
                return { ...n, cpu: `${Math.max(1, base + variation)}%` };
            }));
        }, 3000);

        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch(status) {
            case 'online': return '#10b981';
            case 'warning': return '#f59e0b';
            case 'offline': return '#ef4444';
            default: return '#64748b';
        }
    };

    if (loading) return <div className="loading">Initialisation du cockpit...</div>;

    return (
        <div className="admin-system-dashboard" style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
            {/* Header Area */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.5rem' }}>Cockpit Technique</h1>
                        <p style={{ color: '#64748b' }}>Surveillance de l'infrastructure et gestion des impacts technologiques.</p>
                    </div>
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
                        <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>Systèmes Nominaux</span>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#e0f2fe', color: '#0369a1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                        <FiUsers />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Utilisateurs</p>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{stats.totalUsers}</h3>
                    </div>
                </Card>
                <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                        <FiShield />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Actifs</p>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{stats.activeUsers}</h3>
                    </div>
                </Card>
                <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                        <FiActivity />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Santé</p>
                        <h3 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>99.8%</h3>
                    </div>
                </Card>
                <Card style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                        <FiDatabase />
                    </div>
                    <div>
                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600' }}>Backup</p>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800' }}>04:00 AM</h3>
                    </div>
                </Card>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <FiServer /> Infrastructure
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                        {nodes.map(node => (
                            <Card key={node.id} style={{ padding: '1.25rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                                        <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: getStatusColor(node.status) }}>
                                            <FiHardDrive />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{node.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{node.type} • {node.env}</div>
                                        </div>
                                    </div>
                                    <Badge status={node.status === 'online' ? 'success' : node.status === 'warning' ? 'warning' : 'danger'}>
                                        {node.status.toUpperCase()}
                                    </Badge>
                                </div>
                                <div style={{ marginBottom: '0.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.4rem' }}>
                                        <span>CPU</span>
                                        <span style={{ fontWeight: '700' }}>{node.cpu}</span>
                                    </div>
                                    <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: node.cpu, background: parseInt(node.cpu) > 80 ? '#ef4444' : '#3b82f6' }} />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                </div>

                <div>
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                        <FiClock /> Actions Rapides
                    </h3>
                    <div style={{ display: 'flex', flexKey: 'column', gap: '1rem' }}>
                        <Card 
                            onClick={() => navigate('/admin-system/users')}
                            style={{ padding: '1.25rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                        >
                            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <FiUsers style={{ color: '#3b82f6' }} />
                                <span style={{ fontWeight: '600' }}>Gestion Utilisateurs</span>
                            </div>
                            <FiArrowRight color="#94a3b8" />
                        </Card>
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
            `}</style>
        </div>
    );
};

export default AdminSystemDashboard;
