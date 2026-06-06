import React from 'react';
import { 
    FiX, FiFileText, FiShield, FiLayers, FiActivity, 
    FiRefreshCw, FiAlertTriangle, FiMessageSquare, FiSend, FiEdit3 
} from 'react-icons/fi';
import Badge from '../../../components/common/Badge';

const RfcDetailModal = ({
    show,
    onClose,
    selectedRfc,
    editDetail,
    setEditDetail,
    detailForm,
    setDetailForm,
    statuses,
    handleUpdateDetail,
    rfcTypes,
    environments,
    priorities,
    selectedEnv,
    setSelectedEnv,
    relatedChange,
    changeTasks,
    tasksLoading,
    risk,
    setRisk,
    comments,
    newComment,
    setNewComment,
    handleAddComment,
    history,
    handleDecision,
    showReportForm,
    setShowReportForm,
    getStatusClass,
    isReadOnly = false,
    onTaskClick
}) => {
    if (!show || !selectedRfc) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-box glass-card" style={{ maxWidth: '700px', width: '100%', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <FiFileText />
                    </div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>
                            {selectedRfc.statut?.code_statut === 'PRE_APPROUVEE' ? 'Évaluation de la RFC' : 'Consultation de la RFC'}
                        </h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>#{selectedRfc.code_rfc} — {selectedRfc.titre_rfc}</div>
                    </div>
                    <button onClick={onClose} className="close-btn-rfc-style" style={{ color: '#ffffff' }}><FiX size={24} /></button>
                </div>

                <div className="modal-body" style={{ background: '#f8fafc', padding: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem' }}>
                        {!isReadOnly && (
                            <button onClick={() => setEditDetail(!editDetail)} style={{ background: '#e0f2fe', border: '1px solid #bae6fd', color: '#0369a1', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}>
                                <FiEdit3 /> {editDetail ? 'Annuler' : 'Modifier'}
                            </button>
                        )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                            {editDetail ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Titre</label><input type="text" value={detailForm.titre_rfc} onChange={e => setDetailForm({ ...detailForm, titre_rfc: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Description</label><textarea value={detailForm.description} onChange={e => setDetailForm({ ...detailForm, description: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', minHeight: '80px' }} /></div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                        <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Date Souhaitée</label><input type="date" value={detailForm.date_souhaitee} onChange={e => setDetailForm({ ...detailForm, date_souhaitee: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                        <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Impact Estimé</label><input type="text" value={detailForm.impacte_estimee} onChange={e => setDetailForm({ ...detailForm, impacte_estimee: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    </div>
                                    <div><label style={{ fontSize: '0.7rem', color: '#64748b' }}>Justification</label><textarea value={detailForm.justification} onChange={e => setDetailForm({ ...detailForm, justification: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} /></div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#7c3aed', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.4rem' }}><FiShield size={12} /> Statut RFC</label>
                                        <select value={detailForm.id_statut} onChange={e => setDetailForm({ ...detailForm, id_statut: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '2px solid #a78bfa', outline: 'none', fontWeight: '700', background: '#faf5ff', color: '#6d28d9', cursor: 'pointer' }}>
                                            <option value="">— Statut actuel —</option>
                                            {statuses.map(s => <option key={s.id_statut} value={s.id_statut}>{s.libelle}</option>)}
                                        </select>
                                    </div>
                                    <button onClick={handleUpdateDetail} className="btn-primary" style={{ alignSelf: 'flex-end', background: '#10b981', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer' }}>Enregistrer</button>
                                </div>
                            ) : (
                                <>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description</label>
                                    <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0 1rem' }}>{selectedRfc.description}</p>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Justification Business</label>
                                    <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0' }}>{selectedRfc.justification || 'Aucune justification fournie.'}</p>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut Actuel</label>
                                    <div style={{ margin: '0.25rem 0' }}>
                                        <span className={`status-badge ${getStatusClass(selectedRfc.statut?.code_statut)}`}>{selectedRfc.statut?.libelle || 'Inconnu'}</span>
                                    </div>
                                </>
                            )}
                        </div>



                        {!isReadOnly && (
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                                <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span><FiShield /> Paramètres ITIL</span>
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Type de Workflow</label>
                                        <select disabled={isReadOnly} value={detailForm.id_type} onChange={e => setDetailForm({ ...detailForm, id_type: e.target.value })} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                                            <option value="">Sélectionner...</option>
                                            {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Environnement Cible</label>
                                        <select disabled={isReadOnly} value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontWeight: '600' }}>
                                            <option value="">Sélectionner...</option>
                                            {environments.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                                        </select>
                                    </div>
                                </div>
                                {!isReadOnly && (
                                    <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                                        <button onClick={handleUpdateDetail} className="btn-primary" style={{ background: '#4f46e5', color: 'white', border: 'none', padding: '0.6rem 1.2rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}>
                                            Enregistrer ITIL
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {relatedChange && (
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '800', textTransform: 'uppercase', borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FiLayers style={{ color: '#3b82f6' }} /> Changement & Implémentation
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '700', textTransform: 'uppercase' }}>Code Changement</label>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0c4a6e' }}>#{relatedChange.code_changement}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut du Changement</label>
                                        <div>
                                            <Badge variant={
                                                ['IMPLEMENTE', 'CLOTURE', 'TERMINEE'].includes(relatedChange.statut?.code_statut) ? 'success' :
                                                ['EN_ECHEC', 'ANNULEE', 'REJETEE'].includes(relatedChange.statut?.code_statut) ? 'danger' :
                                                ['EN_COURS', 'PLANIFIEE'].includes(relatedChange.statut?.code_statut) ? 'info' : 'warning'
                                            }>
                                                {relatedChange.statut?.libelle || relatedChange.statut?.code_statut}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <div style={{ padding: '0.75rem 1rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontWeight: '700', fontSize: '0.75rem', color: '#475569' }}>
                                        Tâches d'implémentation ({changeTasks.length}) <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 'normal', marginLeft: '5px' }}> (Cliquer pour ouvrir les détails)</span>
                                    </div>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <tbody>
                                            {tasksLoading ? (
                                                <tr><td style={{ padding: '2rem', textAlign: 'center' }}><FiRefreshCw className="spin" /></td></tr>
                                            ) : changeTasks.length === 0 ? (
                                                <tr><td style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Aucune tâche.</td></tr>
                                            ) : changeTasks.map(t => (
                                                <tr key={t.id_tache} onClick={() => onTaskClick && onTaskClick(t)} style={{ borderBottom: '1px solid #f1f5f9', cursor: onTaskClick ? 'pointer' : 'default' }} className="task-row-hover">
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: '700', color: onTaskClick ? '#3b82f6' : '#1e293b' }}>{t.titre_tache}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>#{t.code_tache}</div>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>{t.statut?.libelle}</td>
                                                    <td style={{ padding: '12px' }}>{t.implementeur?.prenom_user} {t.implementeur?.nom_user}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {!isReadOnly && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem' }}><FiAlertTriangle /> Risques</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem' }}>Impact (1-5)</label>
                                            <select disabled={isReadOnly} value={risk.impact} onChange={e => setRisk({ ...risk, impact: parseInt(e.target.value), score: parseInt(e.target.value) * risk.probabilite })} style={{ width: '100%', padding: '0.4rem' }}>
                                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem' }}>Proba (1-5)</label>
                                            <select disabled={isReadOnly} value={risk.probabilite} onChange={e => setRisk({ ...risk, probabilite: parseInt(e.target.value), score: parseInt(e.target.value) * risk.impact })} style={{ width: '100%', padding: '0.4rem' }}>
                                                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ background: 'white', padding: '10px', borderRadius: '8px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '900', color: risk.score > 12 ? '#dc2626' : risk.score > 6 ? '#f59e0b' : '#10b981' }}>{risk.score} / 25</div>
                                    </div>
                                </div>

                                <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                    <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '1rem' }}><FiMessageSquare /> Discussion</h3>
                                    <div style={{ maxHeight: '150px', overflowY: 'auto', marginBottom: '1rem' }}>
                                        {comments.map(c => (
                                            <div key={c.id_commentaire} style={{ background: 'white', padding: '8px', borderRadius: '8px', marginBottom: '5px', fontSize: '0.8rem', border: '1px solid #eee' }}>
                                                <div style={{ fontWeight: '700', color: '#3b82f6' }}>{c.auteur?.prenom_user} {c.auteur?.nom_user}</div>
                                                <div>{c.contenu}</div>
                                            </div>
                                        ))}
                                    </div>
                                    {!isReadOnly && (
                                        <div style={{ position: 'relative' }}>
                                            <textarea value={newComment} onChange={e => setNewComment(e.target.value)} placeholder="Ajouter une note..." style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                                            <button onClick={handleAddComment} style={{ position: 'absolute', right: '5px', bottom: '5px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', padding: '4px', cursor: 'pointer' }}><FiSend /></button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    <button className="modal-btn modal-btn-cancel" onClick={onClose}>Fermer</button>
                    {!isReadOnly && <button className="modal-btn modal-btn-reject" onClick={() => handleDecision('REJETEE')}>Rejeter</button>}
                    {!isReadOnly && <button className="modal-btn modal-btn-approve" onClick={() => handleDecision('APPROUVEE')}>Approuver & Planifier</button>}
                </div>
            </div>
        </div>
    );
};

export default RfcDetailModal;
