import React from 'react';
import { FiRefreshCw, FiEdit2, FiFileText, FiX, FiInfo } from 'react-icons/fi';

/**
 * ChangeProcessModal - Modal central de traitement d'un changement.
 * Permet de visualiser les détails, de modifier les informations et de créer des rapports.
 * 
 * @param {Object} props
 * @param {Object} props.selectedChangement - Le changement actuellement sélectionné
 * @param {Function} props.closeModals - Fonction pour fermer tous les modals
 * @param {Function} props.handleEditChangement - Handler pour passer en mode édition
 * @param {boolean} props.showReportForm - État d'affichage du formulaire de rapport
 * @param {Function} props.setShowReportForm - Toggle pour le formulaire de rapport
 * @param {Object} props.reportForm - État local du formulaire de rapport
 * @param {Function} props.setReportForm - Setter pour le formulaire de rapport
 * @param {Function} props.handleCreateReport - Action de création du rapport final
 * @param {boolean} props.editMode - État d'édition des métadonnées du changement
 * @param {Function} props.setEditMode - Toggle pour le mode édition
 * @param {Object} props.editForm - État local des champs éditables
 * @param {Function} props.setEditForm - Setter pour les champs éditables
 * @param {Function} props.handleSaveEdit - Action de sauvegarde des modifications
 * @param {Array} props.environments - Référentiel des environnements (PROD, TEST, etc.)
 * @param {Array} props.changeManagers - Liste des Change Managers disponibles
 * @param {Function} props.getStatusColor - Utilitaire de couleur basé sur le statut
 */
const ChangeProcessModal = ({
    selectedChangement,
    closeModals,
    handleEditChangement,
    showReportForm,
    setShowReportForm,
    reportForm,
    setReportForm,
    handleCreateReport,
    editMode,
    setEditMode,
    editForm,
    setEditForm,
    handleSaveEdit,
    environments,
    changeManagers,
    getStatusColor
}) => {
    if (!selectedChangement) return null;

    return (
        <div className="modal-backdrop" onClick={closeModals}>
            <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiRefreshCw /></div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>Détails du Changement</h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>#{selectedChangement.code_changement} — {selectedChangement.rfc?.titre_rfc || selectedChangement.planChangement?.titre_plan || 'Changement Standard'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button
                            onClick={handleEditChangement}
                            className="acl-modal-btn edit"
                            style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                        >
                            <FiEdit2 /> Modifier
                        </button>
                        <button
                            onClick={() => setShowReportForm(!showReportForm)}
                            className="acl-modal-btn report"
                            style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
                        >
                            <FiFileText /> Rapport
                        </button>
                        <button onClick={closeModals} className="close-btn-rfc-style" style={{ color: '#ffffff' }}>
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                <div className="modal-body acl-modal-body" style={{ padding: '2rem' }}>
                    <div className="acl-modal-grid" style={{ display: 'block' }}>
                        <div>
                            <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem' }}><FiInfo /> Informations Générales</h3>

                            {showReportForm && (
                                <div className="acl-panel acl-panel-report" style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                                    <h4 className="acl-panel-title report" style={{ margin: '0 0 1rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText /> Nouveau Rapport</h4>
                                    <div className="acl-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div className="acl-grid-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label className="acl-label-xs report" style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Titre du Rapport</label>
                                                <input type="text" value={reportForm.titre_rapport} onChange={e => setReportForm({ ...reportForm, titre_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d' }} placeholder="Ex: Rapport d'implémentation..." />
                                            </div>
                                            <div>
                                                <label className="acl-label-xs report" style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Type</label>
                                                <select value={reportForm.type_rapport} onChange={e => setReportForm({ ...reportForm, type_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', background: 'white' }}>
                                                    <option value="Audit">Audit</option>
                                                    <option value="Risque">Analyse de Risque</option>
                                                    <option value="Post-Incident">Post-Incident</option>
                                                    <option value="PIR">PIR</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="acl-label-xs report" style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Contenu</label>
                                            <textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({ ...reportForm, contenu_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', minHeight: '100px' }} placeholder="Rédigez le contenu du rapport..." />
                                        </div>
                                        <div className="acl-actions-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                            <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                                            <button onClick={handleCreateReport} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700' }}>Enregistrer le Rapport</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {editMode && (
                                <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
                                    <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiEdit2 /> Modifier le Changement</h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Titre</label>
                                                <input
                                                    type="text"
                                                    value={editForm.titre}
                                                    onChange={e => setEditForm({ ...editForm, titre: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                    placeholder="Titre du changement..."
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Priorité</label>
                                                <select
                                                    value={editForm.priorite}
                                                    onChange={e => setEditForm({ ...editForm, priorite: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                >
                                                    <option value="">Sélectionner...</option>
                                                    <option value="BASSE">Basse</option>
                                                    <option value="MOYENNE">Moyenne</option>
                                                    <option value="HAUTE">Haute</option>
                                                    <option value="CRITIQUE">Critique</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Description</label>
                                            <textarea
                                                value={editForm.description}
                                                onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                                                style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', minHeight: '80px', background: 'white' }}
                                                placeholder="Description du changement..."
                                            />
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date début</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editForm.date_debut}
                                                    onChange={e => setEditForm({ ...editForm, date_debut: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                />
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date fin</label>
                                                <input
                                                    type="datetime-local"
                                                    value={editForm.date_fin}
                                                    onChange={e => setEditForm({ ...editForm, date_fin: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                />
                                            </div>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Environnement</label>
                                                <select
                                                    value={editForm.environnement}
                                                    onChange={e => setEditForm({ ...editForm, environnement: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                >
                                                    <option value="">Sélectionner...</option>
                                                    {environments.map(env => (
                                                        <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Change Manager</label>
                                                <select
                                                    value={editForm.id_manager}
                                                    onChange={e => setEditForm({ ...editForm, id_manager: e.target.value })}
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', outline: 'none', background: 'white' }}
                                                >
                                                    <option value="">Sélectionner...</option>
                                                    {changeManagers?.map(m => (
                                                        <option key={m?.id_user} value={m?.id_user}>{m?.prenom_user} {m?.nom_user}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                            <button onClick={() => setEditMode(false)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: '600' }}>Annuler</button>
                                            <button onClick={handleSaveEdit} style={{ background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700' }}>Enregistrer</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement</label>
                                    <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.environnement?.nom_env || 'N/A'}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut</label>
                                    <p style={{ margin: '0.25rem 0 0.5rem' }}>
                                        <span className={`status-badge status-${getStatusColor(selectedChangement.statut?.code_statut)}`}>
                                            {selectedChangement.statut?.libelle || 'Inconnu'}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date de création</label>
                                    <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{new Date(selectedChangement.date_creation).toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Change Manager</label>
                                    <p style={{ fontSize: '0.9rem', color: '#0f172a', fontWeight: '700', margin: '0.25rem 0' }}>
                                        {selectedChangement.changeManager
                                            ? `${selectedChangement.changeManager.prenom_user || ''} ${selectedChangement.changeManager.nom_user || ''}`.trim()
                                            : <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: '400' }}>Non assigné</span>
                                        }
                                    </p>
                                </div>
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lié à la RFC</label>
                                    <p style={{ fontSize: '0.95rem', color: '#3b82f6', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.rfc ? `#${selectedChangement.rfc.code_rfc}` : 'Non lié'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer-rfc-style" style={{ padding: '1.5rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="btn-cancel-rfc-style" onClick={closeModals} style={{ padding: '0.5rem 1.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', fontWeight: '600' }}>Fermer</button>
                </div>
            </div>
        </div>
    );
};

export default ChangeProcessModal;
