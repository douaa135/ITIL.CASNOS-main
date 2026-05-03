// ============================================================
// rfcService.js — Service complet pour les RFC
// ============================================================

import api from '../api/axiosClient';

const extract = (result, key, fallback = []) => {
  if (!result) return fallback;
  // The backend R.success wraps everything in a 'data' property.
  // result is the body: { success: true, message: "...", data: { [key]: ... } }
  // OR result is the body: { success: true, message: "...", data: [...] }
  
  if (result.data && result.data[key]) return result.data[key];
  if (result[key]) return result[key];
  if (key === 'data' && result.data) return result.data;
  if (Array.isArray(result.data)) return result.data;
  
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
  const result = await api.post('/rfc', {
    titre_rfc:       data.titre_rfc,
    description:     data.description,
    justification:   data.justification,
    date_souhaitee:  data.date_souhaitee || null,
    urgence:         data.urgence ?? false,
    impacte_estimee: data.impacte_estimee || null,
    ci_ids:          data.ci_ids ?? [],
  });
  return extract(result, 'rfc', null);
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
  const rfc = await createRfc(data);
  if (!rfc) throw new Error('Échec de la création de la RFC');
  return await submitRfc(rfc.id_rfc);
};

export const updateRfc = async (id, data) => {
  const result = await api.put(`/rfc/${id}`, data);
  return extract(result, 'rfc', null);
};

export const updateRfcStatus = async (id, id_statut, extra = {}) => {
  const result = await api.patch(`/rfc/${id}/status`, { id_statut, ...extra });
  return result?.data ?? null; // Retourne { rfc, changement }
};

export const cancelRfc = async (id) => {
  const result = await api.delete(`/rfc/${id}`);
  return extract(result, 'rfc', null);
};

export const deleteRfc = async (id) => {
  const result = await api.delete(`/rfc/${id}`);
  return result?.data ?? null;
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
  const userRes = await api.get('/users', { params: { nom_role } });
  return userRes?.data?.data?.data || userRes?.data?.data || userRes?.data?.users || [];
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

const rfcService = {
  getAllRfcs, getMesRfcs, getRfcById,
  createRfc, submitRfc, createAndSubmitRfc,
  updateRfc, updateRfcStatus, cancelRfc, deleteRfc,
  getStatuts, getStatutByCode,
  getTypesRfc, getPriorites, getDirections,
  getEnvironnements, getConfigurationItems,
  getUsersByRole, getChangeManagers,
  getCommentaires, addCommentaire,
  getEvaluationRisque, upsertEvaluationRisque,
};

export default rfcService;
