/**
 * Utilitaires partagés pour la gestion des RFC
 */

/**
 * Extrait le nom de l'environnement de manière robuste à partir d'un objet RFC ou Change.
 * Gère les objets imbriqués, les IDs simples et les fallbacks.
 * 
 * @param {Object} item - L'objet RFC ou Changement
 * @param {Array} environments - La liste de référence des environnements
 * @returns {string|null} Le nom de l'environnement ou null
 */
export const getEnvName = (item, environments = []) => {
  if (!item) return null;

  const isNumeric = (val) => val !== null && val !== undefined && !isNaN(val) && (typeof val === 'number' || (typeof val === 'string' && val.trim() !== ''));

  const resolve = (obj, id) => {
    // 1. Détermination de l'ID cible (prioritaire)
    const targetId = id || obj?.id_env || obj?.id_environnement || obj?.id || (isNumeric(obj) ? obj : null);
    
    // 2. Recherche dans le référentiel si on a un ID
    if (targetId && Array.isArray(environments)) {
      const found = environments.find(e => 
        String(e.id_env) === String(targetId) || 
        String(e.id) === String(targetId) ||
        String(e.nom_env || '').toLowerCase() === String(targetId).toLowerCase()
      );
      if (found) return found.nom_env;
    }

    // 3. Fallback : si c'est un objet avec nom_env ou libelle (et pas juste une chaîne)
    if (obj && typeof obj === 'object') {
      if (obj.nom_env) return obj.nom_env;
      if (obj.libelle) return obj.libelle;
    }
    
    // 4. Fallback ultime : si targetId est déjà une chaîne (nom de l'env)
    if (targetId && typeof targetId === 'string' && targetId.length > 2 && isNaN(targetId)) {
      return targetId;
    }

    return null;
  };

  // Scan dynamique exhaustif de l'objet principal pour trouver un ID d'environnement
  const findIdInObject = (obj) => {
    if (!obj) return null;
    return obj.id_env || obj.id_environnement || obj.id_environement || obj.id_site || obj.id_site_env || obj.environnement_id || 
           (isNumeric(obj) ? obj : null);
  };

  // On récupère l'objet changement lié s'il existe (via rel ou changement)
  const rel = item.rel || item.changement;
  const demande = item.demande || item.demande_rfc || item.request;
  const status = item.statut?.code_statut;

  // Ordre de résolution spécifique demandé
  let name = null;
  
  if (status === 'SOUMIS') {
    // 1. Priorité au choix du demandeur (données du formulaire initial)
    // On cherche d'abord dans l'objet demande, puis à la racine, puis dans id_site
    name = resolve(demande?.environnement, findIdInObject(demande)) ||
           resolve(item.environnement, findIdInObject(item)) ||
           resolve(null, item.id_env || item.id_site || item.id_site_env || item.id_environnement);
  } else if (status === 'PRE_APPROUVEE' || status === 'EVALUEE') {
    // 2. Priorité aux données de qualification du Service Desk
    if (typeof item.impacte_estimee === 'string' && item.impacte_estimee.includes('Environnement')) {
      name = item.impacte_estimee.replace(/Environnement\s*cibl[é|e]\s*:\s*/i, '').trim();
    }
    
    // Fallback sur l'ID de l'item (mis à jour par le SD) ou la demande
    if (!name) {
      name = resolve(item.environnement, findIdInObject(item)) ||
             resolve(demande?.environnement, findIdInObject(demande));
    }
  } else {
    // 3. Cas général pour les autres statuts
    name = resolve(item.environnement, findIdInObject(item)) ||
           resolve(demande?.environnement, findIdInObject(demande)) ||
           resolve(rel?.environnement, findIdInObject(rel)) ||
           resolve(item.evaluationRisque?.environnement, findIdInObject(item.evaluationRisque));
  }

  if (name) return name;

  // Scan dynamique de secours sur toutes les clés si rien n'a été trouvé
  const scanAllIds = (obj) => {
    if (!obj) return [];
    return Object.keys(obj)
      .filter(k => (k.toLowerCase().includes('env') || k.toLowerCase().includes('site')) && isNumeric(obj[k]))
      .map(k => obj[k]);
  };

  const allPossibleIds = [
    ...scanAllIds(item),
    ...scanAllIds(demande),
    ...scanAllIds(rel),
    ...scanAllIds(item.evaluationRisque)
  ];

  for (const id of allPossibleIds) {
    const n = resolve(null, id);
    if (n) return n;
  }

  return 'N/A';
};

/**
 * Variante de couleur pour les badges de statut
 */
export const getStatusVariant = (code) => {
  switch (code) {
    case 'BROUILLON':     return 'warning';
    case 'SOUMIS':        return 'primary';
    case 'EVALUEE':       return 'indigo';
    case 'PRE_APPROUVEE': return 'warning';
    case 'APPROUVEE':     return 'success';
    case 'PLANIFIEE':     return 'info';
    case 'EN_COURS':      return 'pink';
    case 'TERMINEE':      return 'success';
    case 'CLOTUREE':      return 'secondary';
    case 'REJETEE':       return 'danger';
    case 'ANNULEE':       return 'danger';
    default:              return 'default';
  }
};
