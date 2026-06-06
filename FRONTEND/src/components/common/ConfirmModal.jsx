import React from 'react';
import { FiAlertTriangle, FiInfo, FiCheckCircle } from 'react-icons/fi';
import './ConfirmModal.css';

/**
 * ConfirmModal – Version originale simplifiée (centrée)
 */
const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, variant = 'danger', loading = false, danger }) => {
  if (!isOpen) return null;

  // Support de l'ancien prop 'danger' et du nouveau 'variant'
  const isDanger = danger === true || variant === 'danger';
  const isSuccess = variant === 'success';

  const iconBg = isDanger ? '#fee2e2' : (isSuccess ? '#dcfce7' : '#eff6ff');
  const iconColor = isDanger ? '#dc2626' : (isSuccess ? '#16a34a' : '#2563eb');
  const btnBg = isDanger ? '#dc2626' : (isSuccess ? '#16a34a' : '#3b82f6');

  return (
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <div className="confirm-modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
          <div style={{
            width: '72px', height: '72px', borderRadius: '50%',
            background: iconBg, color: iconColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 1.5rem',
            fontSize: '2rem'
          }}>
            {isDanger && <FiAlertTriangle />}
            {isSuccess && <FiCheckCircle />}
            {!isDanger && !isSuccess && <FiInfo />}
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', marginBottom: '0.75rem' }}>
            {title}
          </h2>
          <p style={{ color: '#475569', fontSize: '1rem', lineHeight: '1.6', margin: 0 }}>
            {message}
          </p>
        </div>

        <div style={{ padding: '1.25rem 2rem', background: '#f8fafc', display: 'flex', gap: '1rem', justifyContent: 'center', borderTop: '1px solid #f1f5f9' }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0',
              background: 'white', color: '#64748b', fontWeight: '700', cursor: 'pointer',
              transition: 'all 0.2s', flex: 1
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none',
              background: btnBg, color: 'white', fontWeight: '700', cursor: 'pointer',
              boxShadow: '0 4px 12px ' + btnBg + '40',
              transition: 'all 0.2s', flex: 1,
              minWidth: '120px'
            }}
          >
            {loading ? 'Traitement...' : (isDanger ? 'Supprimer' : 'Confirmer')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;