import React from 'react';
import './Card.css';

const Card = ({ children, className = '', ...props }) => {
  return (
    <div className={`common-card ${className}`} {...props}>
      {children}
    </div>
  );
};

export default Card;
