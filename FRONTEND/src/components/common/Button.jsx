import React from 'react';
import './Button.css';

const Button = ({ children, variant = 'primary', icon, className = '', disabled, type = 'button', onClick, ...props }) => {
  return (
    <button
      type={type}
      className={`common-btn btn-${variant} ${className}`}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {icon && <span className="btn-icon">{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
