import React from 'react';
import { getEnvName } from '../../utils/rfcUtils';

/**
 * Composant badge standardisé pour l'affichage de l'environnement
 * @param {Object} item - La RFC ou le Changement
 * @param {Array} environments - Liste de référence des environnements
 */
const EnvironmentBadge = ({ item, environments = [] }) => {
  const name = getEnvName(item, environments);
  
  if (!name) return null;

  return (
    <span style={{ 
      display: 'inline-flex', 
      alignItems: 'center', 
      padding: '3px 10px', 
      borderRadius: '20px', 
      background: '#f0f9ff', 
      border: '1px solid #bae6fd', 
      fontSize: '0.72rem', 
      color: '#0369a1', 
      fontWeight: 600,
      whiteSpace: 'nowrap'
    }}>
      {name}
    </span>
  );
};

export default EnvironmentBadge;
