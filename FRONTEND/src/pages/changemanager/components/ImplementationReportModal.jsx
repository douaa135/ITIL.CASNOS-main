/**
 * ImplementationReportModal - Affiche le rapport détaillé d'exécution d'une tâche.
 * Ce modal présente les journaux (logs) et permet le téléchargement du rapport en PDF.
 * 
 * @param {Object} props
 * @param {boolean} props.show - État de visibilité
 * @param {string} props.type - Type de résultat (SUCCESS ou ROLLBACK)
 * @param {string} props.title - Titre affiché dans l'en-tête
 * @param {Object} props.task - Les données de la tâche incluant l'historique (journaux)
 * @param {Function} props.onClose - Handler de fermeture
 * @param {Function} props.onDownloadPDF - Déclencheur de la génération PDF (html2canvas + jspdf)
 */
const ImplementationReportModal = ({ 
    show, 
    type, 
    title, 
    task, 
    onClose, 
    onDownloadPDF 
}) => {
    if (!show) return null;

    return (
        <div className="modal-overlay">
            <div className="modal-box-cab glass-card-cab tm-modal-large" style={{ maxWidth: '700px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" 
                         style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        {type === 'SUCCESS' ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                    </div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>{title}</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Tâche: {task?.titre_tache} (#{task?.code_tache})</div>
                    </div>
                    <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
                </div>

                <div className="modal-body-rfc-style" id="report-content-to-print">
                    <div className="tm-detail-grid" style={{ marginBottom: '1.5rem' }}>
                        <div className="tm-detail-box">
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>Implémenteur Responsable</div>
                            <div style={{ fontWeight: '600' }}>{task?.implementeur?.prenom_user} {task?.implementeur?.nom_user}</div>
                        </div>
                        <div className="tm-detail-box">
                            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>Statut Final</div>
                            <div style={{ fontWeight: '600' }}>{task?.statut?.libelle || task?.statut}</div>
                        </div>
                    </div>

                    <div className="tm-title-box" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FiClock size={18} /> Historique & Journaux d'Exécution
                    </div>

                    <div className="tm-description-box" style={{ padding: '1.25rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                        {task?.journaux && task.journaux.length > 0 ? (
                            <div className="timeline-tracker">
                                {task.journaux.map((log, idx) => (
                                    <div key={idx} style={{ marginBottom: '1.25rem', borderLeft: '3px solid #3b82f6', paddingLeft: '1.25rem', position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '-6.5px', top: '0', width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%', border: '2px solid white' }}></div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem' }}>
                                            <strong>{log.titre_journal || 'Mise à jour d\'implémentation'}</strong>
                                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{new Date(log.date_entree).toLocaleString('fr-DZ')}</span>
                                        </div>
                                        <div style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.5', background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                            {log.description}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                                <FiClock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                <p style={{ fontStyle: 'italic' }}>Aucun journal d'exécution n'a été saisi par l'implémenteur pour cette tâche.</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer-rfc-style">
                    <button className="btn-cancel-rfc-style" onClick={onClose}>Fermer</button>
                    <button className="btn-submit-rfc-style" onClick={onDownloadPDF} style={{ background: '#3b82f6' }}>
                        <FiDownload size={18} /> Télécharger le rapport (PDF)
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImplementationReportModal;
