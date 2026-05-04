// ============================================================
// changeService.js — Service Changements & Tâches
// ============================================================

import api from '../api/axiosClient';

const extract = (result, key, fallback = []) => result?.data?.[key] ?? fallback;

// ── Changements ───────────────────────────────────────────────

export const getAllChangements = async (params = {}) => {
  const result = await api.get('/changements', { params });
  return extract(result, 'changements', []);
};

export const getChangementById = async (id) => {
  const result = await api.get(`/changements/${id}`);
  return extract(result, 'changement', null);
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

const changeService = {
  getAllChangements, getChangementById, createChangement,
  updateChangement, updateChangementStatus, cloturerChangement,
  getChangeStatuses, getTaskStatuses,
  getTasksByChange, createTache, updateTache, updateTacheStatut, deleteTache,
  getJournauxByTache, addJournal,
  getImplementers, assignImplementer, deleteChangement,
  getPirByChangement, createPir, updatePir,
  getTestsByChangement, createTest,
};

export default changeService;