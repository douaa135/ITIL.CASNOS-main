import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { FiSearch, FiFilter, FiEye, FiDownload, FiCheckCircle, FiClock, FiXCircle, FiEdit2, FiTrash2 } from 'react-icons/fi';
import api from '../../api/axios';
import Badge from '../../components/common/Badge';

const HistoriqueRfc = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [rfcs, setRfcs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                setLoading(true);
                const response = await api.get('/rfc', { params: { id_user: user?.id_user } });
                if (response.success) {
                    // Show ALL rfcs for this user, ordered by most recent
                    setRfcs(response.data?.rfcs || []);
                }
            } catch (err) {
                console.error('Fetch history error:', err);
            } finally {
                setLoading(false);
            }
        };
        if (user?.id_user) fetchHistory();
    }, [user?.id_user]);

    const filtered = rfcs.filter(r => 
        r.titre_rfc.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.code_rfc || r.id_rfc).toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusIcon = (code) => {
        if (code === 'APPROUVEE') return <FiCheckCircle color="#10b981" />;
        if (code === 'CLOTUREE') return <FiCheckCircle color="#64748b" />;
        if (code === 'REJETEE') return <FiXCircle color="#ef4444" />;
        if (code === 'EVALUEE') return <FiClock color="#f59e0b" />;
        return <FiClock color="#3b82f6" />;
    };

    const getStatusColor = (code) => {
        if (code === 'APPROUVEE') return '#10b981';
        if (code === 'REJETEE') return '#ef4444';
        if (code === 'CLOTUREE') return '#64748b';
        if (code === 'EVALUEE') return '#f59e0b';
        return '#3b82f6';
    };

    if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>Chargement de vos demandes...</div>;

    return (
        <div style={{ padding: '1rem' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Historique de mes Demandes</h1>
                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>{rfcs.length} demande{rfcs.length > 1 ? 's' : ''} au total</span>
            </div>

            <div style={{ background:'white', borderRadius:'1rem', padding:'1.5rem', border:'1px solid #e2e8f0' }}>
                <div style={{ display:'flex', gap:'1rem', marginBottom:'1.5rem' }}>
                    <div style={{ flex:1, position:'relative' }}>
                        <FiSearch style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', color:'#94a3b8' }} />
                        <input 
                            type="text" 
                            placeholder="Rechercher par code ou titre..."
                            style={{ width:'100%', padding:'0.75rem 0.75rem 0.75rem 2.5rem', borderRadius:'0.5rem', border:'1px solid #e2e8f0', outline:'none' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse' }}>
                        <thead>
                            <tr style={{ background:'#f8fafc', borderBottom:'1px solid #e2e8f0' }}>
                                <th style={{ textAlign:'left', padding:'1rem', color:'#64748b', fontSize:'0.85rem' }}>CODE</th>
                                <th style={{ textAlign:'left', padding:'1rem', color:'#64748b', fontSize:'0.85rem' }}>TITRE</th>
                                <th style={{ textAlign:'left', padding:'1rem', color:'#64748b', fontSize:'0.85rem' }}>ETAT</th>
                                <th style={{ textAlign:'left', padding:'1rem', color:'#64748b', fontSize:'0.85rem' }}>DATE</th>
                                <th style={{ textAlign:'center', padding:'1rem', color:'#64748b', fontSize:'0.85rem' }}>ACTIONS</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 ? (
                                <tr>
                                    <td colSpan="5" style={{ padding:'3rem', textAlign:'center', color:'#94a3b8' }}>
                                        Aucune demande trouvée. Créez votre première RFC !
                                    </td>
                                </tr>
                            ) : (
                                filtered.map(r => (
                                    <tr 
                                        key={r.id_rfc} 
                                        onClick={() => navigate(`/rfcs/${r.id_rfc}`)}
                                        style={{ borderBottom:'1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.2s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                                    >
                                        <td style={{ padding:'1rem', fontWeight:600, color:'#1e293b' }}>{r.code_rfc || r.id_rfc?.slice(0,8)}</td>
                                        <td style={{ padding:'1rem' }}>{r.titre_rfc}</td>
                                        <td style={{ padding:'1rem' }}>
                                            <div style={{ display:'flex', alignItems:'center', gap:'0.5rem' }}>
                                                {getStatusIcon(r.statut?.code_statut)}
                                                <span style={{ fontSize:'0.9rem', color: getStatusColor(r.statut?.code_statut), fontWeight: 600 }}>
                                                    {r.statut?.libelle || r.statut?.code_statut}
                                                </span>
                                            </div>
                                        </td>
                                        <td style={{ padding:'1rem', color:'#64748b', fontSize:'0.9rem' }}>
                                            {new Date(r.date_creation).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td style={{ padding:'1rem', textAlign:'center' }}>
                                            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                                                <button 
                                                    onClick={() => navigate(`/rfcs/${r.id_rfc}`)}
                                                    style={{ border:'none', background:'none', color:'#3b82f6', cursor:'pointer', display: 'flex', alignItems: 'center' }}
                                                    title="Voir Détails"
                                                >
                                                    <FiEye size={18} />
                                                </button>
                                                {r.statut?.code_statut === 'BROUILLON' && (
                                                    <button 
                                                        onClick={() => navigate('/rfcs/new', { state: { edit: true, rfcData: r } })}
                                                        style={{ border:'none', background:'none', color:'#f59e0b', cursor:'pointer', display: 'flex', alignItems: 'center' }}
                                                        title="Modifier"
                                                    >
                                                        <FiEdit2 size={16} />
                                                    </button>
                                                )}
                                                {r.statut?.code_statut === 'BROUILLON' && (
                                                    <button 
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            if (window.confirm('Voulez-vous vraiment supprimer ce brouillon ?')) {
                                                                try {
                                                                    const res = await api.delete(`/rfc/${r.id_rfc || r.db_id}`);
                                                                    if (res.success) {
                                                                        setRfcs(prev => prev.filter(item => (item.id_rfc !== r.id_rfc)));
                                                                    }
                                                                } catch (err) {
                                                                    console.error('Delete error:', err);
                                                                }
                                                            }
                                                        }}
                                                        style={{ border:'none', background:'none', color:'#ef4444', cursor:'pointer', display: 'flex', alignItems: 'center' }}
                                                        title="Supprimer"
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoriqueRfc;
