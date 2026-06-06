import React from 'react';
import { FiX, FiRefreshCw, FiEdit3, FiFileText, FiCheckCircle } from 'react-icons/fi';
import Badge from '../../../components/common/Badge';

const ChangementDetailModal = ({
    show,
    onClose,
    selectedChangement,
    showReportForm,
    setShowReportForm,
    reportForm,
    setReportForm,
    handleCreateReport,
    getStatusColor,
    rfcsMap
}) => {
    if (!show || !selectedChangement) return null;

    const formatDate = (dateStr) => {
        if (!dateStr) return 'Non définie';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return 'Non définie';
        return d.toLocaleString('fr-FR', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <div className="modal-backdrop-cab" onClick={onClose}>
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(10px); }
                    to { opacity: 1; transform: scale(1) translateY(0); }
                }
                .premium-modal-box {
                    animation: modalIn 0.3s ease-out;
                    border-radius: 24px !important;
                    position: relative;
                    background: white;
                }
            `}</style>
            <div className="modal-box-cab glass-card-cab premium-modal-box" style={{ maxWidth: '650px', width: '100%', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="premium-modal-blue-header" style={{ paddingRight: '3.5rem' }}>
                    <div className="premium-modal-blue-icon"><FiRefreshCw /></div>
                    <div style={{ flex: 1 }}>
                        <h2>Détails du Changement</h2>
                        <div className="premium-modal-blue-header-subtitle">#{selectedChangement.code_changement} — {selectedChangement.rfc?.titre_rfc || selectedChangement.planChangement?.titre_plan || 'Changement Standard'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => setShowReportForm(!showReportForm)} className="acl-modal-btn report" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FiFileText /> Rapport
                        </button>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="close-btn-rfc-style" 
                        style={{ 
                            color: '#ffffff', 
                            background: 'none', 
                            border: 'none', 
                            cursor: 'pointer',
                            position: 'absolute',
                            top: '12px',
                            right: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            padding: '6px',
                            transition: 'transform 0.18s, opacity 0.15s'
                        }}
                        onMouseEnter={e => {
                            e.currentTarget.style.transform = 'scale(1.15)';
                            e.currentTarget.style.opacity = '0.85';
                        }}
                        onMouseLeave={e => {
                            e.currentTarget.style.transform = 'scale(1)';
                            e.currentTarget.style.opacity = '1';
                        }}
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="modal-body acl-modal-body" style={{ padding: '2rem' }}>
                    {showReportForm && (
                        <div className="acl-panel acl-panel-report" style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                            <h4 className="acl-panel-title report" style={{ margin: '0 0 1rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText /> Nouveau Rapport</h4>
                            <div className="acl-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="acl-grid-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Titre</label><input type="text" value={reportForm.titre_rapport} onChange={e => setReportForm({ ...reportForm, titre_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d' }} /></div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Type</label><select value={reportForm.type_rapport} onChange={e => setReportForm({ ...reportForm, type_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d' }}><option value="Audit">Audit</option><option value="Risque">Analyse de Risque</option><option value="Post-Incident">Post-Incident</option><option value="PIR">PIR</option></select></div>
                                </div>
                                <div><label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Contenu</label><textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({ ...reportForm, contenu_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', minHeight: '80px' }} /></div>
                                <div className="acl-actions-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: 'none', color: '#b45309', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                                    <button onClick={handleCreateReport} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700 }}>Enregistrer</button>
                                </div>
                            </div>
                        </div>
                    )}

                    <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement</label>
                            <p style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.environnement?.nom_env || 'N/A'}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Change Manager</label>
                            <p style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.changeManager ? `${selectedChangement.changeManager.prenom_user || ''} ${selectedChangement.changeManager.nom_user || ''}`.trim() : 'Non assigné'}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Priorité</label>
                            <p style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.priorite || 'BASSE'}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Score de Risque RFC</label>
                            <p style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: '600', margin: '0.25rem 0' }}>
                                {(() => {
                                    const score = rfcsMap?.[selectedChangement.rfc?.id_rfc]?.evaluationRisque?.score_risque ?? selectedChangement.rfc?.evaluationRisque?.score_risque ?? '—';
                                    return score;
                                })()}
                            </p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lié à la RFC</label>
                            <p style={{ fontSize: '0.95rem', color: '#2563eb', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.rfc ? `#${selectedChangement.rfc.code_rfc}` : 'Non lié'}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date et Heure d'implémentation *</label>
                            <p style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: '700', margin: '0.25rem 0' }}>{formatDate(selectedChangement.date_debut)}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date et Heure de Fin d'implémentation</label>
                            <p style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: '700', margin: '0.25rem 0' }}>{formatDate(selectedChangement.date_fin_prevu)}</p>
                        </div>
                        <div>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut</label>
                            <p style={{ margin: '0.25rem 0' }}>
                                <span className={`status-badge status-${getStatusColor(selectedChangement.statut?.code_statut)}`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                    {selectedChangement.statut?.libelle || 'Inconnu'}
                                </span>
                            </p>
                        </div>
                    </div>
                </div>
                
                <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>Fermer</button>
                </div>
            </div>
        </div>
    );
};

export default ChangementDetailModal;
