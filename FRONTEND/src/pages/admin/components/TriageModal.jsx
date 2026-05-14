import React from 'react';
import { FiX, FiZap, FiSend, FiXCircle } from 'react-icons/fi';

const TriageModal = ({ 
    show, 
    onClose, 
    selectedRfc, 
    selectedType, 
    setSelectedType, 
    selectedPriority, 
    setSelectedPriority, 
    selectedEnv, 
    setSelectedEnv, 
    triageAnalysis, 
    setTriageAnalysis, 
    rfcTypes, 
    priorities, 
    environments, 
    changeManagers,
    selectedChangeManager,
    setSelectedChangeManager,
    onRejet, 
    onPreApprouver, 
    submittingTriage 
}) => {
    if (!show || !selectedRfc) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box" onClick={e => e.stopPropagation()} style={{ width: '750px', maxWidth: '90vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column', background: '#f0f9ff', border: '1px solid #003366' }}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiZap /></div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>Qualification Service Desk</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Analyse et préparation de la RFC avant transfert</div>
                    </div>
                    <button onClick={onClose} className="close-btn-rfc-style" style={{ color: '#ffffff' }}><FiX size={24} /></button>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto' }}>
                    <div style={{ marginBottom: '1.5rem', background: 'rgba(255,255,255,0.5)', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>Détails de la demande</label>
                        <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: '8px' }}>{selectedRfc.titre_rfc}</div>
                        <div style={{ fontSize: '0.9rem', color: '#475569', lineHeight: '1.5' }}>{selectedRfc.description}</div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Type de Changement</label>
                            <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                <option value="">Sélectionner...</option>
                                {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Priorité Assignée</label>
                            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                <option value="">Sélectionner...</option>
                                {priorities?.map(p => <option key={p.id_priorite} value={p.id_priorite}>{p.libelle}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Change Manager</label>
                            <select value={selectedChangeManager} onChange={e => setSelectedChangeManager(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                <option value="">Sélectionner un gestionnaire...</option>
                                {changeManagers?.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Environnement Impacté</label>
                            <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                                <option value="">Sélectionner...</option>
                                {environments?.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700' }}>Analyse & Commentaires de triage</label>
                        <textarea
                            value={triageAnalysis}
                            onChange={e => setTriageAnalysis(e.target.value)}
                            placeholder="Notes pour le Change Manager..."
                            rows={4}
                            style={{ padding: '0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical' }}
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button onClick={onRejet} disabled={submittingTriage} className="modal-btn modal-btn-reject" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: '700', cursor: 'pointer' }}>
                        <FiXCircle /> Rejeter
                    </button>
                    <button onClick={onPreApprouver} disabled={submittingTriage} className="modal-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', background: 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer' }}>
                        <FiSend /> {submittingTriage ? 'Traitement...' : 'Pré-évaluer & Transférer'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TriageModal;
