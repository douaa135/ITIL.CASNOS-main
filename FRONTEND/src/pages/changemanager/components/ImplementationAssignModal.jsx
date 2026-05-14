/**
 * ImplementationAssignModal - Formulaire de création et d'assignation d'une nouvelle tâche technique.
 * Permet au Change Manager d'ajouter une intervention spécifique à un changement.
 * 
 * @param {Object} props
 * @param {boolean} props.show - Visibilité
 * @param {Function} props.onClose - Fermeture
 * @param {Object} props.selectedChange - Le changement parent concerné
 * @param {Object} props.newTask - État local de la nouvelle tâche
 * @param {Function} props.setNewTask - Setter pour l'état local du formulaire
 * @param {Array} props.implementers - Liste des utilisateurs ayant le rôle Implementeur
 * @param {Function} props.onSubmit - Handler de soumission du formulaire vers l'API
 * @param {boolean} props.isAssigning - État de chargement pendant la création
 */
const ImplementationAssignModal = ({ 
    show, 
    onClose, 
    selectedChange, 
    newTask, 
    setNewTask, 
    implementers, 
    onSubmit, 
    isAssigning 
}) => {
    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box-cab glass-card-cab tm-modal-medium" style={{ maxWidth: '600px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <FiPlus size={24} />
                    </div>
                    <div className="rfc-style-header-text">
                        <h2 className="tm-title" style={{ color: '#ffffff' }}>Nouvelle Tâche Technique</h2>
                        <div className="rfc-style-subtitle tm-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>#{selectedChange?.code_changement} — Planification Technique</div>
                    </div>
                    <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
                </div>

                <div className="modal-body-rfc-style">
                    <form onSubmit={onSubmit}>
                        <div className="tm-form-grid">
                            <div className="form-group-cab tm-col-span-2" style={{ marginBottom: '1rem' }}>
                                <label>Titre de la Tâche <span className="tm-required">*</span></label>
                                <input 
                                    required 
                                    className="premium-input-style"
                                    value={newTask.titre_tache} 
                                    onChange={e => setNewTask({...newTask, titre_tache: e.target.value})}
                                    placeholder="Ex: Migration de la DB..."
                                />
                            </div>

                            <div className="form-group-cab tm-col-span-2" style={{ marginBottom: '1rem' }}>
                                <label>Description & Instructions</label>
                                <textarea 
                                    className="premium-input-style"
                                    style={{ minHeight: '80px' }}
                                    value={newTask.description} 
                                    onChange={e => setNewTask({...newTask, description: e.target.value})}
                                    placeholder="Détails techniques pour l'implémenteur..."
                                />
                            </div>

                            <div className="form-group-cab">
                                <label>Priorité <span className="tm-required">*</span></label>
                                <select 
                                    required
                                    className="premium-input-style"
                                    value={newTask.priorite}
                                    onChange={e => setNewTask({...newTask, priorite: e.target.value})}
                                >
                                    <option value="BASSE">Basse</option>
                                    <option value="MOYENNE">Moyenne</option>
                                    <option value="HAUTE">Haute</option>
                                    <option value="CRITIQUE">Critique</option>
                                </select>
                            </div>

                            <div className="form-group-cab">
                                <label>Implémenteur <span className="tm-required">*</span></label>
                                <select 
                                    required
                                    className="premium-input-style"
                                    value={newTask.id_user}
                                    onChange={e => setNewTask({...newTask, id_user: e.target.value})}
                                >
                                    <option value="">Sélectionner un profil...</option>
                                    {implementers.map(imp => (
                                        <option key={imp.id_user} value={imp.id_user}>
                                             {imp.prenom_user} {imp.nom_user}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="form-group-cab">
                                <label>Début prévu</label>
                                <input 
                                    type="datetime-local" 
                                    className="premium-input-style"
                                    value={newTask.date_debut_prevue}
                                    onChange={e => setNewTask({...newTask, date_debut_prevue: e.target.value})}
                                />
                            </div>

                            <div className="form-group-cab">
                                <label>Fin prévue</label>
                                <input 
                                    type="datetime-local" 
                                    className="premium-input-style"
                                    value={newTask.date_fin_prevue}
                                    onChange={e => setNewTask({...newTask, date_fin_prevue: e.target.value})}
                                />
                            </div>

                            <div className="form-group-cab">
                                <label>Ordre d'exécution</label>
                                <input 
                                    type="number" 
                                    min="1" 
                                    className="premium-input-style"
                                    value={newTask.ordre_tache}
                                    onChange={e => setNewTask({...newTask, ordre_tache: parseInt(e.target.value)})}
                                />
                            </div>
                        </div>

                        <div className="modal-footer-rfc-style">
                            <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
                            <button type="submit" className="btn-submit-rfc-style" disabled={isAssigning} style={{ gap: '0.5rem' }}>
                                {isAssigning ? 'Création...' : <><FiPlus size={18} /> Créer la tâche</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ImplementationAssignModal;
