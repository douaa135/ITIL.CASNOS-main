import api from '../api/axios';

export const getAllChangements = async () => {
    try {
        return await api.get('/changements');
    } catch (error) {
        console.error('Erreur lors du chargement des changements:', error);
        return { success: false, message: error?.message || 'Erreur API changements' };
    }
};

export const getImplementers = async () => {
    try {
        return await api.get('/users/by-role/IMPLEMENTEUR');
    } catch (error) {
        console.error('Erreur lors du chargement des implémenteurs:', error);
        return { success: false, message: error?.message || 'Erreur API implémenteurs' };
    }
};

export const assignImplementer = async (idChangement, idImpl) => {
    try {
        return await api.put(`/changements/${idChangement}`, { id_implementeur: idImpl });
    } catch (error) {
        console.error('Erreur lors de l assignation:', error);
        return { success: false, message: error?.message || 'Erreur API assignation' };
    }
};

export const updateChangement = async (idChangement, payload) => {
    try {
        return await api.put(`/changements/${idChangement}`, payload);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du changement:', error);
        return { success: false, message: error?.message || 'Erreur API mise à jour' };
    }
};

export const getChangeStatuses = async () => {
    try {
        return await api.get('/admin/statuts?contexte=CHANGEMENT');
    } catch (error) {
        console.error('Erreur lors du chargement des statuts de changement:', error);
        return { success: false, message: error?.message || 'Erreur API statuts' };
    }
};

export const updateChangementStatus = async (idChangement, idStatut, commentaire) => {
    try {
        return await api.patch(`/changements/${idChangement}/status`, { id_statut: idStatut, commentaire });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut du changement:', error);
        return { success: false, message: error?.message || 'Erreur API statut du changement' };
    }
};

export const getTasksByChange = async (idChangement) => {
    try {
        return await api.get(`/changements/${idChangement}/taches`);
    } catch (error) {
        console.error('Erreur lors du chargement des tâches du changement:', error);
        return { success: false, message: error?.message || 'Erreur API tâches' };
    }
};

export const createTache = async (idChangement, payload) => {
    try {
        return await api.post(`/changements/${idChangement}/taches`, payload);
    } catch (error) {
        console.error('Erreur lors de la création de la tâche:', error);
        return { success: false, message: error?.message || 'Erreur API création tâche' };
    }
};

export const updateTache = async (idTache, payload) => {
    try {
        return await api.put(`/taches/${idTache}`, payload);
    } catch (error) {
        console.error('Erreur lors de la mise à jour de la tâche:', error);
        return { success: false, message: error?.message || 'Erreur API mise à jour tâche' };
    }
};

export const deleteChangement = async (idChangement) => {
    try {
        return await api.delete(`/changements/${idChangement}`);
    } catch (error) {
        console.error('Erreur lors de la suppression du changement:', error);
        return { success: false, message: error?.message || 'Erreur API suppression' };
    }
};
