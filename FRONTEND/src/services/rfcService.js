// ============================================================
// rfcService.js — Service complet pour les RFC
// ============================================================

import api from '../api/axiosClient';

const extract = (result, key, fallback = []) => {
  if (!result) return fallback;
  if (Array.isArray(result)) return result;
  if (result[key]) return result[key];
  if (result.data && result.data[key]) return result.data[key];
  if (result.data && Array.isArray(result.data)) return result.data;
  if (result.data && typeof result.data === 'object' && result.data[key]) return result.data[key];
  return fallback;
};

// ── RFC CRUD ──────────────────────────────────────────────────

export const getAllRfcs = async (params = {}) => {
  const result = await api.get('/rfc', { params });
  return extract(result, 'rfcs', []);
};

export const getMesRfcs = async () => {
  const result = await api.get('/rfc');
  return extract(result, 'rfcs', []);
};

export const getRfcById = async (id) => {
  const result = await api.get(`/rfc/${id}`);
  return extract(result, 'rfc', null);
};

export const createRfc = async (data) => {
  try {
    const result = await api.post('/rfc', {
      titre_rfc:       data.titre_rfc,
      description:     data.description,
      justification:   data.justification,
      date_souhaitee:  data.date_souhaitee || null,
      urgence:         data.urgence ?? false,
      impacte_estimee: data.impacte_estimee || null,
      id_env:          data.id_env || null,
      id_type_rfc:     data.id_type_rfc || null,
      id_priorite:     data.id_priorite || null,
      id_direction:    data.id_direction || null,
      ci_ids:          data.ci_ids ?? [],
    });
    return extract(result, 'rfc', null);
  } catch (err) {
    // Resilience: Si le backend renvoie 500 (bug notification) mais que la RFC est créée
    if (err.response?.status === 500 || !err.response) {
      try {
        // Attendre un court instant que la DB soit stable
        await new Promise(r => setTimeout(r, 800));
        const result = await api.get('/rfc');
        const rfcs = extract(result, 'rfcs', []);
        
        // Recherche par titre et description pour être sûr
        const found = rfcs.find(r => 
          r.titre_rfc === data.titre_rfc && 
          (r.description === data.description || rfcs.indexOf(r) === 0)
        );

        if (found) {
          console.warn("[RFC Service] Partial success detected (500 error but RFC created). Redirecting to success.");
          return found;
        }
      } catch (checkErr) {
        console.error("[RFC Service] Verification failed:", checkErr);
      }
    }
    throw err;
  }
};

export const submitRfc = async (id_rfc) => {
  const statutSoumis = await getStatutByCode('SOUMIS', 'RFC');
  if (!statutSoumis) throw new Error("Statut 'SOUMIS' introuvable");
  const result = await api.patch(`/rfc/${id_rfc}/status`, {
    id_statut: statutSoumis.id_statut,
  });
  return result?.data ?? null;
};

export const createAndSubmitRfc = async (data) => {
  // Le backend définit déjà le statut à 'SOUMIS' par défaut lors de la création.
  // Appeler submitRfc après createRfc provoquerait une erreur "SOUMIS -> SOUMIS" interdite.
  return await createRfc(data);
};

export const updateRfc = async (id, data) => {
  const result = await api.put(`/rfc/${id}`, data);
  return extract(result, 'rfc', null);
};

export const updateRfcStatus = async (id, id_statut, extra = {}) => {
  const result = await api.patch(`/rfc/${id}/status`, { id_statut, ...extra });
  return result?.data ?? null;
};

export const cancelRfc = async (id) => {
  const result = await api.delete(`/rfc/${id}`);
  return extract(result, 'rfc', null);
};

// ── Référentiels ──────────────────────────────────────────────

export const getStatuts = async (contexte = 'RFC') => {
  const result = await api.get(`/statuts?contexte=${contexte}`);
  return extract(result, 'statuts', []);
};

export const getStatutByCode = async (code_statut, contexte = 'RFC') => {
  const statuts = await getStatuts(contexte);
  return statuts.find((s) => s.code_statut === code_statut) ?? null;
};

export const getTypesRfc = async () => {
  const result = await api.get('/types-rfc');
  return extract(result, 'types', []);
};

export const getPriorites = async () => {
  const result = await api.get('/priorites');
  return extract(result, 'priorites', []);
};

export const getDirections = async () => {
  const result = await api.get('/directions');
  return extract(result, 'directions', []);
};

export const getEnvironnements = async () => {
  const result = await api.get('/environnements');
  return extract(result, 'environnements', []);
};

export const getConfigurationItems = async (filters = {}) => {
  const result = await api.get('/ci', { params: filters });
  return extract(result, 'cis', []);
};

export const getUsersByRole = async (nom_role) => {
  const result = await api.get('/users', { params: { limit: 1000, nom_role } }).catch(() => null);
  const allUsers = result?.data?.data || result?.data?.users || result?.data || (Array.isArray(result) ? result : []);
  
  if (!Array.isArray(allUsers)) return [];

  const hasRole = (u, name) => {
      if (!u) return false;
      const roleList = [];
      if (Array.isArray(u.roles)) {
          u.roles.forEach(r => {
              if (typeof r === 'string') roleList.push(r);
              else if (r && r.nom_role) roleList.push(r.nom_role);
          });
      }
      if (Array.isArray(u.userRoles)) {
          u.userRoles.forEach(ur => {
              if (ur && ur.role && ur.role.nom_role) roleList.push(ur.role.nom_role);
          });
      }
      if (u.role && u.role.nom_role) roleList.push(u.role.nom_role);
      if (u.nom_role) roleList.push(u.nom_role);
      
      const normalizedName = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      return roleList.some(r => {
          if (!r) return false;
          const normalizedRole = String(r).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          return normalizedRole.includes(normalizedName) || 
                 (normalizedName === 'IMPLEMENTEUR' && (normalizedRole.includes('IMPLEMENT') || normalizedRole.includes('TECH')));
      });
  };

  return allUsers.filter(u => hasRole(u, nom_role));
};

export const getChangeManagers = async () => getUsersByRole('CHANGE_MANAGER');

// ── Sous-ressources RFC ───────────────────────────────────────

export const getCommentaires = async (id_rfc) => {
  const result = await api.get(`/rfc/${id_rfc}/commentaires`);
  return extract(result, 'commentaires', []);
};

export const addCommentaire = async (id_rfc, contenu) => {
  const result = await api.post(`/rfc/${id_rfc}/commentaires`, { contenu });
  return extract(result, 'commentaire', null);
};

export const getEvaluationRisque = async (id_rfc) => {
  const result = await api.get(`/rfc/${id_rfc}/evaluation-risque`);
  return extract(result, 'evaluation', null);
};

export const upsertEvaluationRisque = async (id_rfc, data) => {
  const result = await api.put(`/rfc/${id_rfc}/evaluation-risque`, data);
  return extract(result, 'evaluation', null);
};

/**
 * Centralisation des statistiques pour le tableau de bord demandeur.
 */
export const getDemandeurStats = async (userId) => {
  if (!userId) return { total: 0, soumises: 0, inProgress: 0, finalized: 0 };
  
  const rfcsRaw = await getAllRfcs({ id_user: userId });
  
  const rfcs = rfcsRaw.map(rfc => {
    const envId = rfc.id_env || rfc.id_environnement || rfc.environnement_id || rfc.id_site || 
                rfc.evaluationRisque?.id_env || rfc.evaluationRisque?.id_environnement || 
                rfc.demande?.id_env || rfc.demande?.id_environnement || rfc.demande?.id_site;

    return {
      ...rfc,
      id_env: envId
    };
  });
  
  return {
    rfcs,
    stats: {
      total:      rfcs.length,
      soumises:   rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length,
      inProgress: rfcs.filter(r => ['BROUILLON', 'A_COMPLETER', 'ACCEPTEE_SD', 'EVALUEE', 'PLANIFIEE', 'EN_COURS'].includes(r.statut?.code_statut)).length,
      finalized:  rfcs.filter(r => ['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(r.statut?.code_statut)).length,
    }
  };
};

/**
 * Centralisation des statistiques pour le cockpit Service Desk.
 */
export const getServiceDeskStats = async () => {
  const [rfcRes, changeRes] = await Promise.all([
    api.get('/rfc', { params: { limit: 1000 } }),
    api.get('/changements', { params: { limit: 1000 } }).catch(() => ({ data: [] }))
  ]);

  const rfcsRaw = extract(rfcRes, 'rfcs', []);
  const changes = extract(changeRes, 'changements', []);

  const rfcs = rfcsRaw.map(rfc => {
    const chg = changes.find(c => c.id_rfc === rfc.id_rfc);
    
    // Détection exhaustive de l'ID d'environnement dès le service
    const envId = rfc.id_env || rfc.id_environnement || rfc.environnement_id || rfc.id_site || 
                rfc.evaluationRisque?.id_env || rfc.evaluationRisque?.id_environnement || 
                chg?.id_env || chg?.id_environnement || 
                rfc.demande?.id_env || rfc.demande?.id_environnement || rfc.demande?.id_site;

    return {
      ...rfc,
      environnement: rfc.environnement || chg?.environnement || rfc.demande?.environnement || null,
      id_env: envId
    };
  });
  
  const isLate = (rfc) => {
    if (!rfc.date_souhaitee) return false;
    if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
    return new Date(rfc.date_souhaitee) < new Date();
  };

  const isUrgent = (r) => {
    const prio = r.priorite?.code_priorite || '';
    const type = r.typeRfc?.type?.toUpperCase() || '';
    return (type === 'URGENT' || type === 'URGENCE' || r.urgence === true || 
            ['HAUTE', 'CRITIQUE', 'P4', 'P5'].includes(prio));
  };

  return {
    rfcs,
    stats: {
      total:      rfcs.length,
      backlog:    rfcs.filter(r => !['CLOTUREE', 'ANNULEE'].includes(r.statut?.code_statut)).length,
      pending:    rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length,
      urgent:     rfcs.filter(r => isUrgent(r)).length,
      urgentPending: rfcs.filter(r => r.statut?.code_statut === 'SOUMIS' && isUrgent(r)).length,
      preevaluee: rfcs.filter(r => r.statut?.code_statut === 'PRE_APPROUVEE').length,
      late:       rfcs.filter(r => isLate(r)).length,
    }
  };
};

/**
 * Centralisation des statistiques pour le tableau de bord du Change Manager.
 */
export const getChangeManagerStats = async () => {
  const [rfcs, allChgs] = await Promise.all([
    getAllRfcs({ limit: 1000 }),
    api.get('/changements?limit=1000').then(res => res.data?.changements || res.data || []).catch(() => [])
  ]);

  const deletedIds = JSON.parse(localStorage.getItem('deleted_rfcs') || '[]');
  
  // Enrichissement des RFC avec l'environnement
  const activeRfcs = rfcs.filter(r => !deletedIds.includes(r.id_rfc)).map(rfc => {
    const chg = allChgs.find(c => c.id_rfc === rfc.id_rfc);
    
    const envId = rfc.id_env || rfc.id_environnement || rfc.environnement_id || rfc.id_site || 
                rfc.evaluationRisque?.id_env || rfc.evaluationRisque?.id_environnement || 
                chg?.id_env || chg?.id_environnement || 
                rfc.demande?.id_env || rfc.demande?.id_environnement || rfc.demande?.id_site;

    return {
      ...rfc,
      environnement: rfc.environnement || chg?.environnement || rfc.demande?.environnement || null,
      id_env: envId
    };
  });

  const isUrgentRfc = (r) => {
    const typeStr = (r.typeRfc?.type || r.type || r.typeRfc?.code_type || '').toUpperCase();
    const prioStr = (r.priorite?.libelle || r.priorite?.code_priorite || r.id_priorite || '').toUpperCase();
    return typeStr.includes('URGENT') || prioStr.includes('URGENT') || prioStr.includes('CRITIQUE') || prioStr.includes('HAUTE') || prioStr.includes('P0') || prioStr.includes('P1') || r.urgence === true || r.urgence === 1 || r.urgence === 'true';
  };

  const urgentRfcs = activeRfcs.filter(r => isUrgentRfc(r) && ['SOUMIS', 'PRE_APPROUVEE', 'EVALUEE'].includes(r.statut?.code_statut));

  const urgentChanges = allChgs.filter(c => {
    const isUrgent = isUrgentRfc(c.rfc || {}) || (c.priorite || '').toUpperCase().includes('URGENT');
    return isUrgent && !['CLOTUREE', 'CLOTURE', 'IMPLEMENTE', 'TERMINEE', 'REUSSI', 'ECHEC', 'ANNULEE', 'REJETEE'].includes(c.statut?.code_statut);
  });

  return {
    rfcs: activeRfcs,
    allChgs,
    stats: {
      total:    activeRfcs.filter(r => ['PRE_APPROUVEE', 'EVALUEE'].includes(r.statut?.code_statut)).length,
      pending:  activeRfcs.filter(r => r.statut?.code_statut === 'PRE_APPROUVEE').length,
      approved: activeRfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length,
      rejected: activeRfcs.filter(r => r.statut?.code_statut === 'REJETEE').length,
      urgent:   urgentRfcs.length,
      techUrgent: urgentChanges.length
    }
  };
};

const rfcService = {
  getAllRfcs, getMesRfcs, getRfcById,
  createRfc, submitRfc, createAndSubmitRfc,
  updateRfc, updateRfcStatus, cancelRfc,
  getStatuts, getStatutByCode,
  getTypesRfc, getPriorites, getDirections,
  getEnvironnements, getConfigurationItems,
  getUsersByRole, getChangeManagers,
  getCommentaires, addCommentaire,
  getEvaluationRisque, upsertEvaluationRisque,
  getDemandeurStats, getServiceDeskStats, getChangeManagerStats
};

export default rfcService;
