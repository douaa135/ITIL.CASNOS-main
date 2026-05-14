import React from 'react';
import { FiX, FiActivity, FiPlus, FiTrash2, FiRefreshCw, FiCheckCircle } from 'react-icons/fi';
import InlineEditableBadge from '../../../components/common/InlineEditableBadge';

const TasksModal = ({
    show,
    onClose,
    selectedChangement,
    tasksToShow,
    handleUpdateTaskStatus,
    handleDeleteTask,
    handleCreateTask,
    newTaskForm,
    setNewTaskForm,
    implementeurs,
    taskStatuses,
    TACHE_STATUS_LABELS,
    TACHE_TRANSITIONS,
    showNewTaskForm,
    setShowNewTaskForm,
    saving
}) => {
    if (!show || !selectedChangement) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box glass-card" style={{ maxWidth: '800px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#f0f9ff', border: '1px solid #003366', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiActivity /></div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>Tâches du Changement</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Suivi opérationnel des interventions techniques</div>
                    </div>
                    <button onClick={onClose} className="close-btn-rfc-style" style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer' }}><FiX size={24} /></button>
                </div>

                <div className="modal-body acl-modal-body" style={{ padding: '1.5rem', background: '#f8fafc' }}>
                    {showNewTaskForm && (
                        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}><FiPlus /> Créer une nouvelle tâche</h4>
                            <form onSubmit={handleCreateTask}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                    <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Titre *</label><input type="text" value={newTaskForm.titre_tache} onChange={e => setNewTaskForm({ ...newTaskForm, titre_tache: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} required /></div>
                                    <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Priorité</label><select value={newTaskForm.priorite} onChange={e => setNewTaskForm({ ...newTaskForm, priorite: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}><option value="BASSE">Basse</option><option value="MOYENNE">Moyenne</option><option value="HAUTE">Haute</option><option value="CRITIQUE">Critique</option></select></div>
                                </div>
                                <div style={{ marginBottom: '1rem' }}><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Description</label><textarea value={newTaskForm.description} onChange={e => setNewTaskForm({ ...newTaskForm, description: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '60px' }} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                                    <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Assigné à *</label><select value={newTaskForm.id_user} onChange={e => setNewTaskForm({ ...newTaskForm, id_user: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} required><option value="">Sélectionner...</option>{implementeurs.map(m => <option key={m.id_user} value={m.id_user}>{m.prenom_user} {m.nom_user}</option>)}</select></div>
                                    <div><label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', color: '#64748b', marginBottom: '0.4rem' }}>Début prévu (Optionnel)</label><input type="datetime-local" value={newTaskForm.date_debut_prevue} onChange={e => setNewTaskForm({ ...newTaskForm, date_debut_prevue: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                                    <button type="button" onClick={() => setShowNewTaskForm(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                                    <button type="submit" disabled={saving} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 20px', cursor: 'pointer', fontWeight: 700 }}>{saving ? 'Création...' : 'Créer la tâche'}</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {tasksToShow.length > 0 ? (
                        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Code</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Titre</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Statut</th>
                                        <th style={{ padding: '12px', textAlign: 'left', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Assigné à</th>
                                        <th style={{ padding: '12px', textAlign: 'right', fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tasksToShow.map((task) => (
                                        <tr key={task.id_tache} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '14px 12px', fontWeight: 700, color: '#3b82f6', fontSize: '0.85rem' }}>{task.code_tache || '—'}</td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.85rem' }}>{task.titre_tache || '—'}</div>
                                            </td>
                                            <td style={{ padding: '14px 12px' }}>
                                                <InlineEditableBadge
                                                    currentValue={task.id_statut || task.statut?.id_statut || ''}
                                                    label={TACHE_STATUS_LABELS[task.statut?.code_statut] || task.statut?.libelle || 'N/A'}
                                                    options={taskStatuses.map(s => ({ value: s.id_statut, label: TACHE_STATUS_LABELS[s.code_statut] || s.libelle, code: s.code_statut }))}
                                                    allowedCodes={TACHE_TRANSITIONS[task.statut?.code_statut] || []}
                                                    dropdownPosition="down"
                                                    onUpdate={(newId) => handleUpdateTaskStatus(task.id_tache, newId)}
                                                    getVariant={(val) => { 
                                                        const s = taskStatuses.find(st => st.id_statut === val); 
                                                        const code = s?.code_statut || ''; 
                                                        if (['TERMINEE', 'REUSSI', 'CLOTUREE'].includes(code)) return 'success'; 
                                                        if (code === 'EN_COURS') return 'warning'; 
                                                        if (['ECHEC', 'REJETE', 'ANNULEE'].includes(code)) return 'danger'; 
                                                        return 'default'; 
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '14px 12px', fontSize: '0.85rem', color: '#475569' }}>
                                                {task.implementeur?.prenom_user} {task.implementeur?.nom_user || '—'}
                                            </td>
                                            <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                                <button onClick={() => handleDeleteTask(task.id_tache)} style={{ padding: '6px', background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '6px', cursor: 'pointer' }}><FiTrash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '3rem', background: 'white', borderRadius: '16px', border: '1px dashed #cbd5e1' }}>Aucune tâche technique définie.</p>
                    )}
                </div>

                <div className="modal-footer" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button type="button" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>Fermer</button>
                    <button onClick={() => setShowNewTaskForm(!showNewTaskForm)} style={{ padding: '0.75rem 1.5rem', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FiPlus /> {showNewTaskForm ? 'Masquer le formulaire' : 'Nouvelle Tâche'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TasksModal;
