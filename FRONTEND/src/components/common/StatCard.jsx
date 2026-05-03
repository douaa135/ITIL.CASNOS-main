import React from 'react';
import './StatCard.css';

const StatCard = ({ title, value, icon, color, trend, onClick, active }) => {
  return (
    <div 
      className={`stat-card ${color} ${onClick ? 'clickable' : ''} ${active ? 'selected-active' : ''}`}
      onClick={onClick}
    >
      <div className="stat-icon-wrapper">
        {icon}
      </div>
      <div className="stat-info">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{title}</div>
        {trend && (
          <div className={`stat-trend ${trend.type}`}>
            {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
