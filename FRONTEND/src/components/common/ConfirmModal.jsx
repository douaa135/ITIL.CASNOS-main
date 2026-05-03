import React from 'react';
import { FiAlertTriangle, FiX } from 'react-icons/fi';
import './ConfirmModal.css';

/**
 * ConfirmModal – Shared premium confirmation dialog
 * Uses its own CSS classes (not modal-backdrop-cab) so it always renders on top.
 */
const ConfirmModal = ({ title, message, onConfirm, onCancel, danger = true, loading = false }) => (
  <div className="confirm-modal-backdrop" onClick={onCancel}>
    <div className="confirm-modal-box" onClick={e => e.stopPropagation()}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        padding: '1.5rem 1.5rem 1rem',
        borderBottom: '1px solid #f1f5f9'
      }}>
        <div style={{
          width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: danger ? '#fee2e2' : '#dbeafe',
          color: danger ? '#dc2626' : '#2563eb',
          border: `1.5px solid ${danger ? '#fecaca' : '#bfdbfe'}`
        }}>
          <FiAlertTriangle size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{title}</h2>
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>Confirmation requise</div>
        </div>
        <button
          onClick={onCancel}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: '4px', borderRadius: '8px',
            display: 'flex', alignItems: 'center'
          }}
        >
          <FiX size={22} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        <p style={{ margin: 0, color: '#475569', lineHeight: 1.65, fontSize: '0.95rem' }}>
          {message}
        </p>
      </div>

      {/* Footer */}
      <div style={{
        display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
        padding: '1rem 1.5rem',
        borderTop: '1px solid #f1f5f9'
      }}>
        <button
          type="button"
          onClick={onCancel}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: '10px',
            border: '1.5px solid #e2e8f0', background: '#f8fafc',
            color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem'
          }}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={loading}
          style={{
            padding: '0.6rem 1.4rem', borderRadius: '10px',
            border: 'none',
            background: danger ? '#dc2626' : '#7c3aed',
            color: '#fff', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.9rem', opacity: loading ? 0.7 : 1,
            display: 'flex', alignItems: 'center', gap: '0.5rem'
          }}
        >
          {loading ? 'Traitement...' : 'Confirmer'}
        </button>
      </div>
    </div>
  </div>
);

export default ConfirmModal;
