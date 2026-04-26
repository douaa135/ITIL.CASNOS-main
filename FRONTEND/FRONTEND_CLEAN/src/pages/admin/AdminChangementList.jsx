import React, { useState, useEffect } from 'react';
import changeService from '../../services/changeService';
import dashboardService from '../../services/dashboardService';
import { 
    FiRefreshCw, FiTrendingUp, FiActivity, FiXCircle, 
    FiSearch, FiFilter, FiEye, FiClock, FiCheckCircle, FiFileText, FiX, FiInfo, FiEdit3
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import '../changemanager/RfcManagement.css';

const AdminChangementList = () => {
    const [changements, setChangements] = useState([]);
    const [kpi, setKpi] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatut, setFilterStatut] = useState('');
    const [filterEnv, setFilterEnv] = useState('');

    const [selectedChangement, setSelectedChangement] = useState(null);
    const [showProcess, setShowProcess] = useState(false);
    const [showReportForm, setShowReportForm] = useState(false);
    const [reportForm, setReportForm] = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
    const [editMode, setEditMode] = useState(false);
    const [editForm, setEditForm] = useState({
        titre: '',
        description: '',
        priorite: '',
        date_debut: '',
        date_fin: '',
        environnement: ''
    });

    const handleOpenProcess = (c) => {
        setSelectedChangement(c);
        setShowProcess(true);
    };

    const closeModals = () => {
        setShowProcess(false);
        setSelectedChangement(null);
        setShowReportForm(false);
        setEditMode(false);
    };

    const handleEditChangement = () => {
        if (!selectedChangement) return;
        setEditForm({
            titre: selectedChangement.titre || '',
            description: selectedChangement.description || '',
            priorite: selectedChangement.priorite || '',
            date_debut: selectedChangement.date_debut || '',
            date_fin: selectedChangement.date_fin || '',
            environnement: selectedChangement.environnement?.id_env || ''
        });
        setEditMode(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedChangement) return;
        try {
            await changeService.updateChangement(selectedChangement.id_changement, editForm);
            alert('Changement modifié avec succès !');
            setEditMode(false);
            // Recharger la liste
            const updatedChangements = await changeService.getAllChangements();
            setChangements(updatedChangements);
        } catch (error) {
            alert('Erreur lors de la modification du changement.');
        }
    };

    const handleCreateReport = async () => {
        if (!selectedChangement?.id_rfc) return alert("Ce changement n'est pas lié à une RFC, création de rapport impossible.");
        if (!reportForm.titre_rapport || !reportForm.contenu_rapport) return alert("Le titre et le contenu sont obligatoires.");
        try {
            await api.post(`/rfc/${selectedChangement.id_rfc}/rapports`, reportForm);
            alert('Rapport généré et enregistré avec succès !');
            setShowReportForm(false);
            setReportForm({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
        } catch (e) {
            alert('Erreur lors de la génération du rapport.');
        }
    };

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const [kpiRes, changesRes] = await Promise.all([
                    dashboardService.getKpiChangements(),
                    changeService.getAllChangements()
                ]);
                
                if (kpiRes && (kpiRes.data?.data || kpiRes.data)) {
                    setKpi(kpiRes.data?.data || kpiRes.data);
                }
                setChangements(changesRes || []);
            } catch (err) {
                console.error("Erreur chargement changements:", err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const getStatusColor = (statut) => {
        const s = (statut || '').toUpperCase();
        if (s.includes('APPROUV') || s.includes('REUSSI') || s.includes('TERMINE')) return 'success';
        if (s.includes('REJET') || s.includes('ECHEC') || s.includes('ANNULE')) return 'danger';
        if (s.includes('EVALU') || s.includes('PLANIFI') || s.includes('COURS')) return 'info';
        if (s.includes('ATTENTE') || s.includes('URGENCE')) return 'warning';
        return 'default';
    };

    const getStatusIcon = (statut) => {
        const s = (statut || '').toUpperCase();
        if (s.includes('REUSSI') || s.includes('TERMINE')) return <FiCheckCircle />;
        if (s.includes('ECHEC') || s.includes('ANNULE')) return <FiXCircle />;
        if (s.includes('COURS') || s.includes('PLANIFI')) return <FiActivity />;
        return <FiClock />;
    };

    // Extract unique values for filters
    const uniqueStatuts = [...new Set(changements.map(c => c.statut?.libelle).filter(Boolean))];
    const uniqueEnvs = [...new Set(changements.map(c => c.environnement?.nom_env).filter(Boolean))];

    const filteredChangements = changements.filter(c => {
        const matchesSearch = (c.code_changement?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                              (c.titre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                              (c.environnement?.nom_env?.toLowerCase() || '').includes(searchTerm.toLowerCase());
        const matchesStatut = filterStatut ? c.statut?.libelle === filterStatut : true;
        const matchesEnv = filterEnv ? c.environnement?.nom_env === filterEnv : true;
        
        return matchesSearch && matchesStatut && matchesEnv;
    });

    return (
        <div className="rfc-mgr-page">
            <div className="rfc-mgr-header">
                <div>
                    <h1><FiRefreshCw /> Gestion des Changements</h1>
                    <p>Supervision globale de tous les changements du système ITIL.</p>
                </div>
            </div>

            {/* KPI Section */}
            {kpi && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
                    <div style={kpiCardStyle}>
                        <div style={{...iconBoxStyle, background: '#e0f2fe', color: '#0369a1'}}><FiRefreshCw /></div>
                        <div>
                            <p style={kpiLabelStyle}>Total Changements</p>
                            <h3 style={kpiValueStyle}>{kpi.total}</h3>
                        </div>
                    </div>
                    <div style={kpiCardStyle}>
                        <div style={{...iconBoxStyle, background: '#fef3c7', color: '#b45309'}}><FiActivity /></div>
                        <div>
                            <p style={kpiLabelStyle}>En cours</p>
                            <h3 style={kpiValueStyle}>{kpi.en_cours}</h3>
                        </div>
                    </div>
                    <div style={kpiCardStyle}>
                        <div style={{...iconBoxStyle, background: '#dcfce7', color: '#15803d'}}><FiTrendingUp /></div>
                        <div>
                            <p style={kpiLabelStyle}>Taux de Réussite</p>
                            <h3 style={{...kpiValueStyle, color: '#10b981'}}>{kpi.taux_reussite}</h3>
                        </div>
                    </div>
                    <div style={kpiCardStyle}>
                        <div style={{...iconBoxStyle, background: '#fee2e2', color: '#b91c1c'}}><FiXCircle /></div>
                        <div>
                            <p style={kpiLabelStyle}>Échecs</p>
                            <h3 style={kpiValueStyle}>{kpi.echecs}</h3>
                        </div>
                    </div>
                </div>
            )}

            {/* Table Section (Mirroring CI Management) */}
            <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Changement & Code</th>
                                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Environnement</th>
                                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Date Planifiée</th>
                                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chargement...</td>
                                </tr>
                            ) : filteredChangements.length === 0 ? (
                                <tr>
                                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                        <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                                        Aucun changement trouvé.
                                    </td>
                                </tr>
                            ) : filteredChangements.map((c, index) => (
                                <tr key={c.id_changement} onClick={() => handleOpenProcess(c)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.2s' }} className="hover-row">
                                    <td style={{ padding: '0.2rem 0.3rem' }}>
                                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.8rem' }}>{c.titre}</div>
                                        <div style={{ fontSize: '0.65rem', color: '#3b82f6', fontWeight: '600' }}>#{c.code_changement}</div>
                                    </td>
                                    <td style={{ padding: '0.2rem 0.3rem' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.65rem', color: '#475569', fontWeight: '600' }}>
                                            {c.environnement?.nom_env || 'N/A'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.2rem 0.3rem' }}>
                                        <span className={`status-badge status-${getStatusColor(c.statut?.code_statut)}`} style={{ fontSize: '0.65rem' }}>
                                            {c.statut?.libelle || 'Inconnu'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.2rem 0.3rem', color: '#334155', fontSize: '0.75rem' }}>
                                        {c.date_debut_prevue ? new Date(c.date_debut_prevue).toLocaleDateString() : '—'}
                                    </td>
                                    <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                                            <button onClick={(e) => { e.stopPropagation(); handleOpenProcess(c); }} style={{ background: '#f1f5f9', color: '#10b981', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Détails">
                                                <FiEye size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* MODAL TRAITEMENT */}
            {showProcess && selectedChangement && (
                <div className="modal-backdrop" onClick={closeModals} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                        <button onClick={closeModals} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', zIndex: 10 }}>
                            <FiX size={24} />
                        </button>

                        <div className="modal-top" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '2rem', borderBottom: '1px solid #e2e8f0' }}>
                            <div style={{ width: '70px', height: '70px', borderRadius: '18px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', border: '1px solid #bfdbfe' }}>
                                <FiRefreshCw />
                            </div>
                            <div style={{ flex: 1 }}>
                                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', color: '#0f172a' }}>Détails du Changement</h2>
                                <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>#{selectedChangement.code_changement} — {selectedChangement.titre}</div>
                            </div>
                            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                <button 
                                    onClick={handleEditChangement}
                                    style={{ background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}
                                >
                                    <FiEdit3 /> Modifier
                                </button>
                                <button 
                                    onClick={() => setShowReportForm(!showReportForm)}
                                    style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#b45309', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}
                                >
                                    <FiFileText /> Rapport
                                </button>
                            </div>
                        </div>

                        <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '2rem' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                                <div>
                                    <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}><FiInfo /> Informations Générales</h3>
                                    
                                    {showReportForm && (
                                        <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText /> Nouveau Rapport</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Titre du Rapport</label>
                                                        <input type="text" value={reportForm.titre_rapport} onChange={e => setReportForm({...reportForm, titre_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none' }} placeholder="Ex: Rapport d'implémentation..." />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Type</label>
                                                        <select value={reportForm.type_rapport} onChange={e => setReportForm({...reportForm, type_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', background: 'white' }}>
                                                            <option value="Audit">Audit</option>
                                                            <option value="Risque">Analyse de Risque</option>
                                                            <option value="Post-Incident">Post-Incident</option>
                                                            <option value="PIR">PIR</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Contenu</label>
                                                    <textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({...reportForm, contenu_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', minHeight: '100px' }} placeholder="Rédigez le contenu du rapport..." />
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                                    <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Annuler</button>
                                                    <button onClick={handleCreateReport} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Enregistrer le Rapport</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {editMode && (
                                        <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
                                            <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiEdit3 /> Modifier le Changement</h4>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Titre</label>
                                                        <input 
                                                            type="text" 
                                                            value={editForm.titre} 
                                                            onChange={e => setEditForm({...editForm, titre: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none' }} 
                                                            placeholder="Titre du changement..." 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Priorité</label>
                                                        <select 
                                                            value={editForm.priorite} 
                                                            onChange={e => setEditForm({...editForm, priorite: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                        >
                                                            <option value="">Sélectionner...</option>
                                                            <option value="BASSE">Basse</option>
                                                            <option value="MOYENNE">Moyenne</option>
                                                            <option value="HAUTE">Haute</option>
                                                            <option value="CRITIQUE">Critique</option>
                                                        </select>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Description</label>
                                                    <textarea 
                                                        value={editForm.description} 
                                                        onChange={e => setEditForm({...editForm, description: e.target.value})}
                                                        style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', minHeight: '80px' }} 
                                                        placeholder="Description du changement..." 
                                                    />
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date début</label>
                                                        <input 
                                                            type="datetime-local" 
                                                            value={editForm.date_debut} 
                                                            onChange={e => setEditForm({...editForm, date_debut: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none' }} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date fin</label>
                                                        <input 
                                                            type="datetime-local" 
                                                            value={editForm.date_fin} 
                                                            onChange={e => setEditForm({...editForm, date_fin: e.target.value})}
                                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none' }} 
                                                        />
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                                    <button onClick={() => setEditMode(false)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Annuler</button>
                                                    <button onClick={handleSaveEdit} style={{ background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Enregistrer</button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement</label>
                                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.environnement?.nom_env || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut Actuel</label>
                                            <p style={{ margin: '0.25rem 0' }}>
                                                <span className={`status-badge status-${getStatusColor(selectedChangement.statut?.code_statut)}`}>
                                                    {selectedChangement.statut?.libelle || 'Inconnu'}
                                                </span>
                                            </p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date de création</label>
                                            <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{new Date(selectedChangement.date_creation).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lié à la RFC</label>
                                            <p style={{ fontSize: '0.95rem', color: '#3b82f6', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.rfc ? `#${selectedChangement.rfc.code_rfc}` : 'Non lié'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                    <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                        <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiActivity /> Journal d'Audit</h3>
                                        <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                            <p style={{ color: '#94a3b8', fontStyle: 'italic' }}>Historique non disponible.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                            <button className="modal-btn modal-btn-cancel" style={{ padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'white', border: '1px solid #e2e8f0', color: '#64748b', cursor: 'pointer', fontWeight: '700' }} onClick={closeModals}>Fermer</button>
                        </div>
                    </div>
                </div>
            )}
            
            <style>{`
                .spinning { animation: spin 1s linear infinite; }
                @keyframes spin { to { transform: rotate(360deg); } }
                .table-row-hover:hover { background-color: #f8fafc; }
            `}</style>
        </div>
    );
};

// Styles extraits
const kpiCardStyle = {
    background: 'white',
    padding: '1.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
    border: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    gap: '1.25rem',
    transition: 'transform 0.2s',
};

const iconBoxStyle = {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '1.5rem'
};

const kpiLabelStyle = { margin: 0, color: '#64748b', fontSize: '0.9rem', fontWeight: '600' };
const kpiValueStyle = { margin: '0.2rem 0 0 0', fontSize: '1.6rem', fontWeight: '800', color: '#0f172a' };

export default AdminChangementList;
