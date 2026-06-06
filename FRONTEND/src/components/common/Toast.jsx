import React, { useEffect } from 'react';
import { FiCheckCircle, FiAlertTriangle, FiX } from 'react-icons/fi';
import './Toast.css';

/**
 * Toast – Shared premium notification component
 * Standardized across all administration pages
 */
const Toast = ({ msg, type, onClose, duration = 5000 }) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [onClose, duration]);

  return (
    <div className={`premium-toast ${type}`} onClick={onClose}>
      <div className="toast-icon">
        {type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertTriangle size={20} />}
      </div>
      <span className="toast-message">{msg}</span>
      <button 
        onClick={(e) => { e.stopPropagation(); onClose(); }} 
        className="toast-close-btn"
        title="Fermer"
      >
        <FiX size={16} />
      </button>
    </div>
  );
};

export default Toast;
