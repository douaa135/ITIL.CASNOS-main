import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import './ConfirmModal.css';

/**
 * ConfirmModal – Shared premium confirmation dialog
 * Uses its own CSS classes (not modal-backdrop-cab) so it always renders on top.
 */
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = true, loading = false }) => (
  <div className="modal-backdrop-cab" style={{ zIndex: 9999 }} onClick={onCancel}>
    <div className="modal-box-cab glass-card-cab" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
      
      <div className="modal-top-rfc-style" style={{ padding: '1.25rem 1.5rem' }}>
        <div className="rfc-style-icon-wrapper" style={{ 
          background: danger ? '#fee2e2' : '#eff6ff', 
          color: danger ? '#dc2626' : '#2563eb',
          borderColor: danger ? '#fecaca' : '#bfdbfe'
        }}>
          <FiAlertTriangle size={24} />
        </div>
        <div className="rfc-style-header-text">
          <h2>{title}</h2>
          <div className="rfc-style-subtitle">Confirmation de l'opération</div>
        </div>
        <button className="close-btn-rfc-style" onClick={onCancel}><FiX size={24} /></button>
      </div>

      <div className="modal-body-rfc-style" style={{ padding: '1.5rem' }}>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.6, fontSize: '0.95rem', fontWeight: '500' }}>
          {message}
        </p>
      </div>

      <div className="modal-footer-rfc-style" style={{ background: '#f8fafc', padding: '1rem 1.5rem' }}>
        <button
          type="button"
          onClick={onCancel}
          className="btn-cancel-rfc-style"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          className={`btn-submit-rfc-style`}
          style={{ 
            background: danger ? '#dc2626' : '#7c3aed',
            borderColor: danger ? '#b91c1c' : '#6d28d9',
            minWidth: '120px'
          }}
        >
          {loading ? 'Traitement...' : 'Confirmer'}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
