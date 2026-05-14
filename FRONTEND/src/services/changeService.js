// ============================================================
// changeService.js — Service Changements & Tâches
// ============================================================

import api from '../api/axiosClient';

const extract = (result, key, fallback = []) => {
  if (!result) return fallback;
  if (Array.isArray(result)) return result;
  if (result.data && result.data[key]) return result.data[key];
  if (result[key]) return result[key];
  if (result.data && Array.isArray(result.data)) return result.data;
  if (result.data && result.data.data) return result.data.data;
  return fallback;
};

// ── Changements ───────────────────────────────────────────────

export const getAllChangements = async (params = {}) => {
  const result = await api.get('/changements', { params });
  return extract(result, 'changements', []);
};

export const getChangementById = async (id) => {
  const result = await api.get(`/changements/${id}`);
  return extract(result, 'changement', null);
};

export const getChangeByRfc = async (idRfc) => {
  const result = await api.get('/changements', { params: { id_rfc: idRfc } });
  const list = extract(result, 'changements', []);
  return list.length > 0 ? list[0] : null;
};

export const createChangement = async (payload) => {
  const result = await api.post('/changements', payload);
  return extract(result, 'changement', null);
};

export const updateChangement = async (idChangement, payload) => {
  const result = await api.put(`/changements/${idChangement}`, payload);
  return extract(result, 'changement', null);
};

export const updateChangementStatus = async (idChangement, idStatut, commentaire = '') => {
  const result = await api.patch(`/changements/${idChangement}/status`, {
    id_statut: idStatut,
    commentaire,
  });
  return extract(result, 'changement', null);
};

export const cloturerChangement = async (idChangement, raison = '', reussite = true) => {
  const result = await api.delete(`/changements/${idChangement}`, {
    data: { raison, reussite },
  });
  return extract(result, 'changement', null);
};

export const getChangeStatuses = async () => {
  const result = await api.get('/statuts?contexte=CHANGEMENT');
  return extract(result, 'statuts', []);
};

// ── Tâches ───────────────────────────────────────────────────

export const getTasksByChange = async (idChangement) => {
  const result = await api.get(`/changements/${idChangement}/taches`);
  return extract(result, 'taches', []);
};

export const createTache = async (idChangement, payload) => {
  const result = await api.post(`/changements/${idChangement}/taches`, payload);
  return extract(result, 'tache', null);
};

export const updateTache = async (idTache, payload) => {
  const result = await api.put(`/taches/${idTache}`, payload);
  return extract(result, 'tache', null);
};

export const updateTacheStatut = async (idTache, idStatut) => {
  const result = await api.patch(`/taches/${idTache}/statut`, { id_statut: idStatut });
  return extract(result, 'tache', null);
};

export const deleteTache = async (idTache) => {
  const result = await api.delete(`/taches/${idTache}`);
  return result?.data ?? null;
};

export const getTacheById = async (idTache) => {
  const result = await api.get(`/taches/${idTache}`);
  return extract(result, 'tache', null);
};

// ── Journaux d'exécution ─────────────────────────────────────

export const getJournauxByTache = async (idTache) => {
  const result = await api.get(`/taches/${idTache}/journaux`);
  return extract(result, 'journaux', []);
};

export const addJournal = async (idTache, payload) => {
  const result = await api.post(`/taches/${idTache}/journaux`, payload);
  return extract(result, 'journal', null);
};

// ── Implémenteurs ─────────────────────────────────────────────
export const getImplementers = async () => {
  const result = await api.get('/users', { params: { nom_role: 'IMPLEMENTEUR' } });
  return result?.data?.data ?? [];
};

/**
 * Assigner un implémenteur à un changement
 * PATCH /changements/:id/implementeur
 */
export const assignImplementer = async (idChangement, idUser) => {
  const result = await api.patch(`/changements/${idChangement}/implementeur`, {
    id_user: idUser,
  });
  return extract(result, 'changement', null);
};

/**
 * Supprimer un changement
 * DELETE /changements/:id
 */
export const deleteChangement = async (idChangement) => {
  const result = await api.delete(`/changements/${idChangement}`);
  return result?.data ?? null;
};

// ── PIR ───────────────────────────────────────────────────────

export const getPirByChangement = async (idChangement) => {
  const result = await api.get(`/changements/${idChangement}/pir`);
  return extract(result, 'pir', null);
};

export const createPir = async (idChangement, payload) => {
  const result = await api.post(`/changements/${idChangement}/pir`, payload);
  return extract(result, 'pir', null);
};

export const updatePir = async (idChangement, payload) => {
  const result = await api.put(`/changements/${idChangement}/pir`, payload);
  return extract(result, 'pir', null);
};

// ── Tests ─────────────────────────────────────────────────────

export const getTestsByChangement = async (idChangement) => {
  const result = await api.get(`/changements/${idChangement}/tests`);
  return extract(result, 'tests', []);
};

export const createTest = async (idChangement, payload) => {
  const result = await api.post(`/changements/${idChangement}/tests`, payload);
  return extract(result, 'test', null);
};

export const getTaskStatuses = async () => {
  const result = await api.get('/statuts?contexte=TACHE');
  return extract(result, 'statuts', []);
};

/**
 * Récupère toutes les tâches assignées à un implémenteur spécifique.
 * Nécessite de parcourir tous les changements car le backend ne propose pas encore
 * d'accès direct filtré par utilisateur à la racine.
 */
export const getMyTasks = async (userId) => {
  if (!userId) return [];
  
  // 1. Récupérer les changements (limite haute pour ne rien rater)
  const changes = await getAllChangements({ limit: 1000 });
  
  if (changes.length === 0) return [];

  // 2. Récupérer les tâches de chaque changement en parallèle
  const taskPromises = changes.map(async (change) => {
    try {
      // Optimisation : si _count indique 0 tâches, on saute
      if (change._count && change._count.taches === 0) return [];

      const tasks = await getTasksByChange(change.id_changement);
      
      // Filtrer par implémenteur
      const userTasks = tasks.filter(t => 
        String(t.id_user) === String(userId) || 
        String(t.implementeur?.id_user) === String(userId)
      );
      
      if (userTasks.length === 0) return [];

      // Enrichissement avec les métadonnées du changement pour les KPIs
      const rfcPrio = change.rfc?.priorite?.code_priorite || '';
      const changeType = (change.rfc?.typeRfc?.type || change.type_changement || '').toUpperCase();
      const isUrgent = (
        changeType === 'URGENCE' || 
        changeType === 'URGENT' || 
        change.rfc?.urgence === true ||
        ['HAUTE', 'CRITIQUE', 'P4', 'P5'].includes(rfcPrio)
      );

      return userTasks.map(t => ({
        ...t,
        changement: change,
        priorite_code: rfcPrio || 'NORMALE',
        is_change_urgent: isUrgent
      }));
    } catch (e) {
      console.error(`Error fetching tasks for CHG ${change.id_changement}:`, e);
      return [];
    }
  });

  const results = await Promise.allSettled(taskPromises);
  const allUserTasks = results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value || []);
    
  // Tri chronologique inverse (le plus récent en premier)
  return allUserTasks.sort((a, b) => new Date(b.date_creation) - new Date(a.date_creation));
};

const changeService = {
  getAllChangements, getChangementById, getChangeByRfc, createChangement,
  updateChangement, updateChangementStatus, cloturerChangement,
  getChangeStatuses, getTaskStatuses, getMyTasks,
  getTasksByChange, createTache, updateTache, updateTacheStatut, deleteTache, getTacheById,
  getJournauxByTache, addJournal,
  getImplementers, assignImplementer, deleteChangement,
  getPirByChangement, createPir, updatePir,
  getTestsByChangement, createTest,
};

export default changeService;