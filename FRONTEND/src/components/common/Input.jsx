import React from 'react';
import './Input.css';

const Input = ({ id, label, type = 'text', placeholder, icon, suffix, error, value, onChange, ...props }) => {
  return (
    <div className={`input-wrapper ${error ? 'has-error' : ''}`}>
      {label && <label htmlFor={id} className="input-label">{label}</label>}
      <div className="input-container">
        {icon && <span className="input-icon">{icon}</span>}
        <input
          id={id}
          type={type}
          className={`common-input ${icon ? 'with-icon' : ''} ${suffix ? 'with-suffix' : ''}`}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          {...props}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {error && <span className="input-error-message">{error}</span>}
    </div>
  );
};

export default Input;
