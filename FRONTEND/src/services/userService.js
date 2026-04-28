// ============================================================
// userService.js — Gestion des utilisateurs (Admin)
// ============================================================

import api from '../api/axiosClient';

const extract = (result, key, fallback = []) => result?.data?.[key] ?? fallback;

// GET /api/users → data: { data: [...], total, page, limit, pages }
export const getAllUsers = async (params = {}) => {
  const result = await api.get('/users', { params });
  return {
    users: result?.data?.data ?? [],
    total: result?.data?.total ?? 0,
    pages: result?.data?.pages ?? 1,
  };
};

export const getUserById = async (id) => {
  const result = await api.get(`/users/${id}`);
  return extract(result, 'user', null);
};

export const createUser = async (data) => {
  const result = await api.post('/users', data);
  return extract(result, 'user', null);
};

export const updateUser = async (id, data) => {
  const result = await api.put(`/users/${id}`, data);
  return extract(result, 'user', null);
};

export const toggleUserActif = async (id, actif) => {
  const result = await api.patch(`/users/${id}/actif`, { actif });
  return extract(result, 'user', null);
};

// GET /api/users/roles → data: [ { id_role, nom_role, code_metier } ]
export const getRoles = async () => {
  const result = await api.get('/users/roles');
  return Array.isArray(result?.data) ? result.data : [];
};

// GET /api/users/directions → data: [ { id_direction, nom_direction } ]
export const getDirectionsAdmin = async () => {
  const result = await api.get('/users/directions');
  return Array.isArray(result?.data) ? result.data : [];
};

// GET /api/directions → data: { directions: [...], total }
export const getDirections = async () => {
  const result = await api.get('/directions');
  return result?.data?.directions ?? [];
};

const userService = {
  getAllUsers, getUserById, createUser, updateUser,
  toggleUserActif, getRoles, getDirectionsAdmin, getDirections,
};

export default userService;
