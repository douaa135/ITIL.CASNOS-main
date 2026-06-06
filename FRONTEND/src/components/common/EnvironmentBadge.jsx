import React from 'react';
import { getEnvName } from '../../utils/rfcUtils';

/**
 * Composant badge standardisé pour l'affichage de l'environnement
 * @param {Object} item - La RFC ou le Changement
 * @param {Array} environments - Liste de référence des environnements
 */
const EnvironmentBadge = ({ item, environments = [] }) => {
  let name = null;
  
  // 1. Essayer d'abord de faire le mapping direct depuis id_env si c'est disponible
  const directId = item?.id_env || item?.id_environnement || item?.environnement?.id_env || item?.environnement?.id || item?.demande?.environnement?.id_env;
  if (directId && Array.isArray(environments)) {
    const found = environments.find(e => String(e.id_env) === String(directId) || String(e.id) === String(directId));
    if (found) name = found.nom_env || found.libelle;
  }

  // 2. Fallback sur l'utilitaire global si non trouvé
  if (!name) {
    name = getEnvName(item, environments);
  }
  
  if (!name || name === 'N/A') {
    if (directId) name = `ID: ${directId}`;
    else return null;
  }

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
