/**
 * ImplementerTasksModal - Affiche la liste des tâches actives pour un implémenteur spécifique.
 * Permet au Change Manager de suivre et de modifier le statut des tâches d'un membre de l'équipe.
 * 
 * @param {Object} props
 * @param {boolean} props.show - Visibilité
 * @param {Function} props.onClose - Handler de fermeture
 * @param {Object} props.selectedImplementer - Profil de l'implémenteur sélectionné
 * @param {Array} props.implementerTasks - Liste des tâches filtrées pour cet utilisateur
 * @param {boolean} props.loadingTasks - État de chargement
 * @param {Array} props.taskStatuses - Référentiel des statuts
 * @param {Function} props.onStatusUpdate - Callback pour mettre à jour le statut d'une tâche via l'API
 */
const ImplementerTasksModal = ({ 
    show, 
    onClose, 
    selectedImplementer, 
    implementerTasks, 
    loadingTasks, 
    taskStatuses, 
    onStatusUpdate,
    TACHE_STATUS_LABELS,
    TACHE_TRANSITIONS
}) => {
    if (!show || !selectedImplementer) return null;

    return (
        <div className="modal-backdrop-center" onClick={onClose}>
            <div className="tasks-modal-content" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiUser /></div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>{selectedImplementer.prenom_user} {selectedImplementer.nom_user}</h2>
                        <p className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Tâches assignées - {implementerTasks.length} au total</p>
                    </div>
                    <button type="button" className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}>
                        <FiX size={24} />
                    </button>
                </div>
                <div className="modal-body-tasks">
                    {loadingTasks ? (
                        <div className="loading-box">Chargement des tâches...</div>
                    ) : implementerTasks.length === 0 ? (
                        <div className="empty-team">Aucune tâche assignée pour cet implémenteur.</div>
                    ) : (
                        <table className="tasks-modal-table">
                            <thead>
                                <tr>
                                    <th>Titre</th>
                                    <th>Code</th>
                                    <th>Changement</th>
                                    <th>Statut</th>
                                    <th>Priorité</th>
                                    <th>Réalisée</th>
                                </tr>
                            </thead>
                            <tbody>
                                {implementerTasks.filter(t => !['TERMINEE', 'CLOTUREE', 'SUCCES', 'ANNULEE'].includes(t.statut?.code_statut || t.statut)).map((task) => {
                                    const isCompleted = ['TERMINEE', 'CLOTUREE'].includes(task.statut?.code_statut || task.statut);
                                    return (
                                        <tr key={task.id_tache} className="dynamic-row">
                                            <td><div className="task-title-cell" style={{ fontWeight: 800, color: '#000000' }}>{task.titre_tache}</div></td>
                                            <td><strong className="task-code-premium" style={{ color: '#3b82f6', border: '1px solid #bfdbfe', background: '#eff6ff' }}>{task.code_tache || '—'}</strong></td>
                                            <td><span className="change-ref-badge">{task.changement?.code_changement || '—'}</span></td>
                                            <td>
                                                <InlineEditableBadge 
                                                    currentValue={task.id_statut || task.statut?.id_statut} 
                                                    label={TACHE_STATUS_LABELS[task.statut?.code_statut] || task.statut?.libelle || 'N/A'}
                                                    options={taskStatuses.map(s => ({ value: s.id_statut, label: TACHE_STATUS_LABELS[s.code_statut] || s.libelle, code: s.code_statut }))}
                                                    allowedCodes={TACHE_TRANSITIONS[task.statut?.code_statut] || []}
                                                    getVariant={(val) => {
                                                        const s = taskStatuses.find(st => st.id_statut == val);
                                                        return s?.code_statut?.toLowerCase() || 'default';
                                                    }}
                                                    onUpdate={(newId) => onStatusUpdate(task.id_tache, newId, task.id_changement)}
                                                    isEditable={true}
                                                    dropdownPosition="down"
                                                />
                                            </td>
                                            <td>
                                                <span className={`prio-pill ${task.changement?.priorite?.toLowerCase() || 'p3'}`}>
                                                    {task.changement?.priorite || task.priorite || 'P3'}
                                                </span>
                                            </td>
                                            <td className="text-center">
                                                <div 
                                                    className={`realisee-toggle ${isCompleted ? 'checked' : ''}`}
                                                    onClick={() => {
                                                        const termId = taskStatuses.find(s => s.code_statut === 'TERMINEE')?.id_statut;
                                                        const attId = taskStatuses.find(s => s.code_statut === 'EN_ATTENTE')?.id_statut;
                                                        if (termId && attId) {
                                                            onStatusUpdate(task.id_tache, isCompleted ? attId : termId, task.id_changement);
                                                        }
                                                    }}
                                                >
                                                    {isCompleted ? <FiCheckCircle style={{color: '#10b981'}} /> : <FiClock style={{color: '#94a3b8'}} />}
                                                    <span>{isCompleted ? 'Oui' : 'Non'}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImplementerTasksModal;
