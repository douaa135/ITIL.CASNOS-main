import React from 'react';
import { FiX, FiCheckCircle } from 'react-icons/fi';

const PirModal = ({ 
    show, 
    onClose, 
    rfc, 
    pirChecklist, 
    setPirChecklist, 
    onConfirm, 
    pirAllChecked 
}) => {
    if (!show) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box modal-box-pir" style={{ background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <FiCheckCircle size={24} />
                    </div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>Validation Post-Implémentation (PIR)</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>RFC #{rfc?.code_rfc}</div>
                    </div>
                    <button onClick={onClose} className="close-btn-rfc-style" style={{ color: '#ffffff' }}><FiX size={24} /></button>
                </div>

                <div className="modal-body">
                    <div className="pir-checklist">
                        {['objectives', 'incidents', 'rollback', 'stakeholders'].map(k => (
                            <label key={k} className={`pir-item ${pirChecklist[k] ? 'checked' : ''}`}>
                                <input type="checkbox" checked={pirChecklist[k]} onChange={() => setPirChecklist(p => ({ ...p, [k]: !p[k] }))} />
                                <div className="pir-check-icon"><FiCheckCircle /></div>
                                <span>
                                    {k === 'objectives' ? 'Objectifs atteints' : 
                                     k === 'incidents' ? 'Aucun incident lié' : 
                                     k === 'rollback' ? 'Plan de repli validé' : 
                                     'Parties prenantes informées'}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
                <div className="modal-footer">
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Annuler</button>
                    <button className="modal-btn modal-btn-approve" disabled={!pirAllChecked} onClick={onConfirm}>Clôturer la RFC</button>
                </div>
            </div>
        </div>
    );
};

export default PirModal;
