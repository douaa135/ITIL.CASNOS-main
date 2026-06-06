import React, { useState } from 'react';
import { 
    FiLayers, FiX, FiPlus, FiTrash2 
} from 'react-icons/fi';
import InlineEditableBadge from '../../../components/common/InlineEditableBadge';
import Avatar from '../../../components/common/Avatar';

/**
 * ChangeTasksModal - Modal de gestion opérationnelle des tâches techniques.
 * Permet de lister, créer, modifier le statut et supprimer des tâches d'intervention.
 * 
 * @param {Object} props
 * @param {Object} props.selectedChangement - Changement parent
 * @param {Function} props.closeModals - Handler de fermeture
 * @param {boolean} props.showNewTaskForm - Toggle pour le formulaire de création
 * @param {Function} props.setShowNewTaskForm - Setter pour l'affichage du formulaire
 * @param {Function} props.handleCreateTask - Action de création d'une tâche technique
 * @param {Object} props.newTaskForm - État local du formulaire de création
 * @param {Function} props.setNewTaskForm - Setter pour le formulaire de création
 * @param {Array} props.implementeurs - Liste des techniciens assignables
 * @param {boolean} props.saving - État de chargement pendant la sauvegarde
 * @param {Array} props.tasksToShow - Liste des tâches liées au changement
 * @param {Array} props.taskStatuses - Référentiel des statuts techniques
 * @param {Function} props.handleUpdateTaskStatus - Action de mise à jour du statut d'une tâche
 * @param {Function} props.handleDeleteTask - Action de suppression d'une tâche
 */
const ChangeTasksModal = ({
    selectedChangement,
    closeModals,
    showNewTaskForm,
    setShowNewTaskForm,
    handleCreateTask,
    newTaskForm,
    setNewTaskForm,
    implementeurs,
    saving,
    tasksToShow,
    taskStatuses,
    TACHE_STATUS_LABELS,
    TACHE_TRANSITIONS,
    handleUpdateTaskStatus,
    handleDeleteTask,
}) => {
    if (!selectedChangement) return null;

    return (
        <div className="modal-backdrop" onClick={closeModals}>
            <div className="modal-box glass-card" style={{ maxWidth: '750px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiLayers /></div>
                    <div className="rfc-style-header-text" style={{ flexGrow: 1 }}>
                        <h2 style={{ color: '#ffffff' }}>Suivi Opérationnel des Tâches</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Interventions pour {selectedChangement?.code_changement}</div>
                    </div>
                    <button onClick={closeModals} className="close-btn-rfc-style" style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer' }}><FiX size={24} /></button>
                </div>

                <div className="acl-modal-body" style={{ padding: '2rem' }}>
                    {showNewTaskForm && (
                        <div style={{ background: 'transparent', padding: '1rem 0', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><FiPlus /> Créer une nouvelle tâche</h4>
                            <form onSubmit={handleCreateTask}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Titre de la tâche *</label>
                                        <input
                                            type="text"
                                            value={newTaskForm.titre_tache}
                                            onChange={e => setNewTaskForm({ ...newTaskForm, titre_tache: e.target.value })}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Priorité</label>
                                        <select
                                            value={newTaskForm.priorite}
                                            onChange={e => setNewTaskForm({ ...newTaskForm, priorite: e.target.value })}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                        >
                                            <option value="BASSE">Basse</option>
                                            <option value="MOYENNE">Moyenne</option>
                                            <option value="HAUTE">Haute</option>
                                            <option value="CRITIQUE">Critique</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Description</label>
                                    <textarea
                                        value={newTaskForm.description}
                                        onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })}
                                        style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', minHeight: '60px', background: 'white' }}
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Assigné à</label>
                                        <select
                                            value={newTaskForm.id_user}
                                            onChange={e => setNewTaskForm({ ...newTaskForm, id_user: e.target.value })}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                            required
                                        >
                                            <option value="">Sélectionner...</option>
                                            {implementeurs.map(m => (
                                                <option key={m.id_user} value={m.id_user}>{m.prenom_user} {m.nom_user}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Début prévu</label>
                                        <input
                                            type="datetime-local"
                                            value={newTaskForm.date_debut_prevue}
                                            onChange={e => setNewTaskForm({ ...newTaskForm, date_debut_prevue: e.target.value })}
                                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', background: 'white' }}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                    <button type="button" onClick={() => setShowNewTaskForm(false)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                                    <button type="submit" disabled={saving} style={{ background: '#f59e0b', color: 'white', border: 'none', padding: '8px 20px', borderRadius: '10px', cursor: 'pointer', fontWeight: '700' }}>
                                        {saving ? 'Création...' : 'Créer la tâche'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {tasksToShow.length > 0 ? (
                        <div className="table-scroll-container" style={{ overflowX: 'auto', marginBottom: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                            <table className="acl-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                        <th style={{ padding: '12px' }}>Code</th>
                                        <th style={{ padding: '12px' }}>Titre</th>
                                        <th style={{ padding: '12px' }}>Priorité</th>
                                        <th style={{ padding: '12px' }}>Statut</th>
                                        <th style={{ padding: '12px' }}>Assigné</th>
                                        <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasksToShow.map((task, idx) => (
                                        <tr key={task.id_tache} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? 'white' : '#f8fafc' }}>
                                            <td style={{ padding: '12px', fontWeight: '700', color: '#3b82f6' }}>{task.code_tache || '—'}</td>
                                            <td style={{ padding: '12px', fontWeight: '600' }}>{task.titre_tache || '—'}</td>
                                            <td style={{ padding: '12px' }}>
                                                {(() => {
                                                    const prio = (task.priorite || 'BASSE').toUpperCase();
                                                    const colors = { CRITIQUE: '#ef4444', HAUTE: '#f97316', MOYENNE: '#ca8a04', BASSE: '#22c55e' };
                                                    return <span style={{ color: colors[prio] || '#64748b', fontWeight: 700 }}>{prio}</span>;
                                                })()}
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                {(() => {
                                                    const code = task.statut?.code_statut || '';
                                                    const label = TACHE_STATUS_LABELS[code] || task.statut?.libelle || 'N/A';
                                                    let bg = 'rgba(100, 116, 139, 0.1)';
                                                    let fg = '#64748b';
                                                    if (code === 'TERMINE' || code === 'REUSSI') {
                                                        bg = 'rgba(16, 185, 129, 0.1)';
                                                        fg = '#10b981';
                                                    } else if (code === 'EN_COURS') {
                                                        bg = 'rgba(245, 158, 11, 0.1)';
                                                        fg = '#d97706';
                                                    } else if (code === 'ECHEC' || code === 'REJETE') {
                                                        bg = 'rgba(239, 68, 68, 0.1)';
                                                        fg = '#ef4444';
                                                    }
                                                    return (
                                                        <span style={{ 
                                                            display: 'inline-block',
                                                            padding: '4px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '0.75rem',
                                                            fontWeight: '700',
                                                            backgroundColor: bg,
                                                            color: fg
                                                        }}>
                                                            {label}
                                                        </span>
                                                    );
                                                })()}
                                            </td>
                                             <td style={{ padding: '12px' }}>
                                                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                     <Avatar name={task.implementeur ? `${task.implementeur.prenom_user} ${task.implementeur.nom_user}` : 'Non assigné'} size={28} />
                                                     <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                         <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.82rem' }}>
                                                             {task.implementeur ? `${task.implementeur.prenom_user} ${task.implementeur.nom_user}` : 'Non assigné'}
                                                         </span>
                                                         <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Responsable</span>
                                                     </div>
                                                 </div>
                                             </td>
                                            <td style={{ padding: '12px', textAlign: 'right' }}>
                                                {(task.statut === 'EN_ATTENTE' || task.statut?.code_statut === 'EN_ATTENTE') ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDeleteTask(task.id_tache); }}
                                                        style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.4rem', borderRadius: '6px', cursor: 'pointer' }}
                                                    >
                                                        <FiTrash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontStyle: 'italic', paddingRight: '8px' }}>—</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Aucune tâche active.</p>
                    )}
                </div>
                <div className="modal-footer" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button onClick={closeModals} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', fontWeight: '700', cursor: 'pointer' }}>Fermer</button>
                    <button
                        onClick={() => setShowNewTaskForm(!showNewTaskForm)}
                        style={{ padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        <FiPlus /> Nouvelle Tâche
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangeTasksModal;
