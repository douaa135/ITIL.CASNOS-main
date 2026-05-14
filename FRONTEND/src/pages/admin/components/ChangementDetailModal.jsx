import React from 'react';
import { FiX, FiRefreshCw, FiEdit3, FiFileText, FiCheckCircle } from 'react-icons/fi';
import Badge from '../../../components/common/Badge';

const ChangementDetailModal = ({
    show,
    onClose,
    selectedChangement,
    editMode,
    setEditMode,
    editForm,
    setEditForm,
    newStatutId,
    setNewStatutId,
    handleSaveEdit,
    handleCreateReport,
    showReportForm,
    setShowReportForm,
    reportForm,
    setReportForm,
    changeManagers,
    environments,
    uniqueStatuts,
    saving,
    getStatusColor
}) => {
    if (!show || !selectedChangement) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box glass-card premium-modal-blue-box" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
                <div className="premium-modal-blue-header">
                    <div className="premium-modal-blue-icon"><FiRefreshCw /></div>
                    <div style={{ flex: 1 }}>
                        <h2>Détails du Changement</h2>
                        <div className="premium-modal-blue-header-subtitle">#{selectedChangement.code_changement} — {selectedChangement.rfc?.titre_rfc || selectedChangement.planChangement?.titre_plan || 'Changement Standard'}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <button onClick={() => setEditMode(!editMode)} className="acl-modal-btn edit" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FiEdit3 /> {editMode ? 'Annuler' : 'Modifier'}
                        </button>
                        <button onClick={() => setShowReportForm(!showReportForm)} className="acl-modal-btn report" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', border: '1px solid rgba(255, 255, 255, 0.2)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <FiFileText /> Rapport
                        </button>
                        <button onClick={onClose} className="close-btn-rfc-style" style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer' }}><FiX size={24} /></button>
                    </div>
                </div>

                <div className="modal-body acl-modal-body" style={{ padding: '2rem' }}>
                    {showReportForm && (
                        <div className="acl-panel acl-panel-report" style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a', marginBottom: '1.5rem' }}>
                            <h4 className="acl-panel-title report" style={{ margin: '0 0 1rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText /> Nouveau Rapport</h4>
                            <div className="acl-stack" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div className="acl-grid-2-1" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Titre</label><input type="text" value={reportForm.titre_rapport} onChange={e => setReportForm({ ...reportForm, titre_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d' }} /></div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Type</label><select value={reportForm.type_rapport} onChange={e => setReportForm({ ...reportForm, type_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d' }}><option value="Audit">Audit</option><option value="Risque">Analyse de Risque</option><option value="Post-Incident">Post-Incident</option><option value="PIR">PIR</option></select></div>
                                </div>
                                <div><label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Contenu</label><textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({ ...reportForm, contenu_rapport: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', minHeight: '80px' }} /></div>
                                <div className="acl-actions-end" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: 'none', color: '#b45309', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                                    <button onClick={handleCreateReport} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700 }}>Enregistrer</button>
                                </div>
                            </div>
                        </div>
                    )}

                    {editMode ? (
                        <div style={{ background: '#f0f9ff', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd', marginBottom: '1.5rem' }}>
                            <h4 style={{ margin: '0 0 1rem 0', color: '#0369a1', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiEdit3 /> Modifier le Changement</h4>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Titre</label><input type="text" value={editForm.titre} onChange={e => setEditForm({ ...editForm, titre: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }} /></div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Priorité</label><select value={editForm.priorite} onChange={e => setEditForm({ ...editForm, priorite: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }}><option value="">Sélectionner...</option><option value="BASSE">Basse</option><option value="MOYENNE">Moyenne</option><option value="HAUTE">Haute</option><option value="CRITIQUE">Critique</option></select></div>
                                </div>
                                <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Description</label><textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc', minHeight: '80px' }} /></div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date début</label><input type="datetime-local" value={editForm.date_debut} onChange={e => setEditForm({ ...editForm, date_debut: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }} /></div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Date fin</label><input type="datetime-local" value={editForm.date_fin} onChange={e => setEditForm({ ...editForm, date_fin: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }} /></div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Environnement</label><select value={editForm.environnement} onChange={e => setEditForm({ ...editForm, environnement: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }}><option value="">Sélectionner...</option>{environments.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}</select></div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Statut</label><select value={newStatutId} onChange={e => setNewStatutId(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }}>{uniqueStatuts.map(s => <option key={s?.id_statut} value={s?.id_statut}>{s?.libelle}</option>)}</select></div>
                                </div>
                                <div><label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '600' }}>Change Manager</label><select value={editForm.id_manager} onChange={e => setEditForm({ ...editForm, id_manager: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #7dd3fc' }}><option value="">Sélectionner...</option>{changeManagers.map(m => <option key={m?.id_user} value={m?.id_user}>{m?.prenom_user} {m?.nom_user}</option>)}</select></div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                    <button onClick={() => setEditMode(false)} style={{ background: 'transparent', border: 'none', color: '#0369a1', cursor: 'pointer', fontWeight: 600 }}>Annuler</button>
                                    <button onClick={handleSaveEdit} disabled={saving} style={{ background: '#0ea5e9', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {saving ? <FiRefreshCw className="spin" /> : <FiCheckCircle />} {saving ? 'Sauvegarde...' : 'Enregistrer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement</label>
                                <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.environnement?.nom_env || 'N/A'}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Date de création</label>
                                <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{new Date(selectedChangement.date_creation).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Change Manager</label>
                                <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.changeManager ? `${selectedChangement.changeManager.prenom_user || ''} ${selectedChangement.changeManager.nom_user || ''}`.trim() : 'Non assigné'}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Lié à la RFC</label>
                                <p style={{ fontSize: '0.95rem', color: selectedChangement.rfc ? '#3b82f6' : '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedChangement.rfc ? `#${selectedChangement.rfc.code_rfc}` : 'Non lié'}</p>
                            </div>
                            <div>
                                <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut</label>
                                <p style={{ margin: '0.25rem 0' }}>
                                    <span className={`status-badge status-${getStatusColor(selectedChangement.statut?.code_statut)}`} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
                                        {selectedChangement.statut?.libelle || 'Inconnu'}
                                    </span>
                                </p>
                            </div>
                        </div>
                    )}
                </div>
                
                <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'white', border: '1px solid #cbd5e1', color: '#64748b', cursor: 'pointer', fontWeight: 700 }}>Fermer</button>
                </div>
            </div>
        </div>
    );
};

export default ChangementDetailModal;
