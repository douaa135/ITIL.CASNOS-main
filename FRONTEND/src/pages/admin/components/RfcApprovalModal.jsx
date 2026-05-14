import React from 'react';
import { FiX, FiCheckCircle, FiRefreshCw } from 'react-icons/fi';

const RfcApprovalModal = ({ 
    show, 
    onClose, 
    rfc, 
    approvalForm, 
    setApprovalForm, 
    changeManagers, 
    environments, 
    onSubmit, 
    loading 
}) => {
    if (!show || !rfc) return null;

    return (
        <div className="modal-backdrop-cab" onClick={onClose}>
            <div className="modal-box-cab glass-card-cab tm-modal-medium" style={{ background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper tm-icon-success"><FiCheckCircle /></div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>Approuver la RFC</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Un changement sera créé automatiquement</div>
                    </div>
                    <button className="close-btn-rfc-style" style={{ color: '#ffffff' }} onClick={onClose}><FiX size={24} /></button>
                </div>

                <div className="modal-body-rfc-style">
                    <div style={{ background: 'rgba(248,250,252,0.5)', borderRadius: '12px', padding: '1rem', marginBottom: '1.5rem', border: '1px dashed #e2e8f0' }}>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>RFC Sélectionnée</div>
                        <div style={{ fontWeight: '800', color: '#1e293b', fontSize: '1rem' }}>{rfc.titre_rfc}</div>
                        <div style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: '700' }}>#{rfc.code_rfc}</div>
                    </div>
                    <div className="tm-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                        <div className="form-group-cab">
                            <label>Change Manager <span className="tm-required">*</span></label>
                            <select value={approvalForm.id_change_manager} onChange={e => setApprovalForm(f => ({ ...f, id_change_manager: e.target.value }))} className="premium-input-style" required>
                                <option value="">Sélectionner un profil...</option>
                                {changeManagers.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                            </select>
                        </div>
                        <div className="form-group-cab">
                            <label>Environnement cible <span className="tm-required">*</span></label>
                            <select value={approvalForm.id_env} onChange={e => setApprovalForm(f => ({ ...f, id_env: e.target.value }))} className="premium-input-style" required>
                                <option value="">Sélectionner un environnement...</option>
                                {environments.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="modal-footer-rfc-style">
                    <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
                    <button type="button" className="btn-submit-rfc-style" disabled={loading} onClick={onSubmit}
                        style={{ background: 'linear-gradient(135deg, #10b981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.2)' }}>
                        {loading ? <FiRefreshCw className="spin" /> : <FiCheckCircle />}
                        {loading ? 'En cours...' : 'Confirmer l\'approbation'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RfcApprovalModal;
