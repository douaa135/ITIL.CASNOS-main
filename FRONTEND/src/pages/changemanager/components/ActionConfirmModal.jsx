import React from 'react';
import { FiX } from 'react-icons/fi';

/**
 * ActionConfirmModal - Modal de confirmation pour les actions rapides sur les tâches.
 * Ce composant gère les confirmations pour démarrer, valider ou rejeter une tâche technique.
 * 
 * @param {Object} props
 * @param {boolean} props.show - État de visibilité du modal
 * @param {string} props.type - Type d'action (START, CONFIRM, REJECT)
 * @param {Function} props.onClose - Fonction pour fermer le modal
 * @param {Function} props.onConfirm - Callback déclenché après confirmation avec l'ID du nouveau statut
 * @param {Array} props.taskStatuses - Liste globale des statuts techniques possibles
 */
const ActionConfirmModal = ({ 
    show, 
    type, 
    onClose, 
    onConfirm,
    taskStatuses
}) => {
    if (!show) return null;

    /**
     * getTitle - Génère un titre dynamique basé sur le type d'action.
     */
    const getTitle = () => {
        switch(type) {
            case 'START': return 'Démarrer la tâche';
            case 'CONFIRM': return 'Confirmer exécution';
            case 'REJECT': return 'Rejeter exécution';
            default: return 'Confirmation';
        }
    };

    /**
     * getMessage - Génère le message d'avertissement contextuel.
     */
    const getMessage = () => {
        switch(type) {
            case 'START': return 'Voulez-vous vraiment démarrer cette tâche technique ?';
            case 'CONFIRM': return 'Confirmez-vous que la tâche a été exécutée avec succès ?';
            case 'REJECT': return 'Voulez-vous rejeter l\'exécution de cette tâche ? Cela pourrait déclencher un rollback.';
            default: return 'Êtes-vous sûr de vouloir effectuer cette action ?';
        }
    };

    return (
        <div className="modal-overlay">
            <div className="assign-task-modal" style={{ maxWidth: '450px', textAlign: 'center' }}>
                <div className="modal-header">
                    <h2>{getTitle()}</h2>
                    <button onClick={onClose}><FiX /></button>
                </div>
                <div style={{ margin: '1.5rem 0', color: '#64748b' }}>
                    {getMessage()}
                </div>
                <div className="modal-actions">
                    <button className="cancel-btn" onClick={onClose}>Annuler</button>
                    <button 
                        className={`confirm-btn ${type === 'REJECT' ? 'red' : ''}`}
                        onClick={() => {
                            const statusMap = {
                                'START': 'EN_COURS',
                                'CONFIRM': 'TERMINEE',
                                'REJECT': 'ANNULEE'
                            };
                            const statusId = taskStatuses.find(s => s.code_statut === statusMap[type])?.id_statut;
                            onConfirm(statusId);
                        }}
                    >
                        Confirmer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ActionConfirmModal;
