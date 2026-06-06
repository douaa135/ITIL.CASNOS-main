import React, { useState, useEffect } from 'react';
import { 
    FiZap, FiFileText, FiTrash2, FiX, FiInfo, FiShield, 
    FiActivity, FiRefreshCw, FiAlertTriangle, FiMessageSquare, FiSend, FiLayers
} from 'react-icons/fi';
import Badge from '../../../components/common/Badge';
import rfcService from '../../../services/rfcService';

/**
 * RfcProcessModal - Modal de consultation et d'évaluation d'une RFC.
 * Ce composant permet d'analyser la demande, de modifier les paramètres ITIL,
 * de discuter via des commentaires, d'évaluer les risques et de prendre une décision finale.
 * 
 * @param {Object} props
 * @param {Object} props.selectedRfc - La demande de changement sélectionnée
 * @param {Function} props.closeModals - Handler de fermeture globale
 * @param {boolean} props.showReportForm - Toggle pour le formulaire de rapport
 * @param {Function} props.setShowReportForm - Setter pour l'affichage du rapport
 * @param {Object} props.reportForm - État local du rapport
 * @param {Function} props.setReportForm - Setter pour le rapport
 * @param {Function} props.handleCreateReport - Action d'enregistrement du rapport
 * @param {boolean} props.editDetail - Mode édition des détails de la RFC
 * @param {Object} props.detailForm - État local des détails modifiables
 * @param {Function} props.setDetailForm - Setter pour les détails
 * @param {Function} props.handleUpdateDetail - Action de mise à jour des détails
 * @param {Array} props.statuses - Liste des statuts RFC
 * @param {Array} props.rfcTypes - Liste des types de RFC (Standard, Normal, Urgent)
 * @param {Array} props.environments - Référentiel des environnements
 * @param {Array} props.priorities - Référentiel des priorités
 * @param {string} props.selectedEnv - Environnement sélectionné
 * @param {Function} props.setSelectedEnv - Setter pour l'environnement
 * @param {Object} props.relatedChange - Changement lié (si existant)
 * @param {Array} props.changeTasks - Tâches techniques liées au changement
 * @param {boolean} props.tasksLoading - État de chargement des tâches
 * @param {Object} props.risk - État de l'évaluation des risques (impact, probabilité, score)
 * @param {Function} props.setRisk - Setter pour le risque
 * @param {Array} props.comments - Liste des commentaires de discussion
 * @param {string} props.newComment - État du nouveau commentaire en cours
 * @param {Function} props.setNewComment - Setter pour le nouveau commentaire
 * @param {Function} props.handleAddComment - Action d'ajout d'un commentaire
 * @param {Function} props.handleDecision - Action de prise de décision (Approuver/Rejeter)
 * @param {Function} props.setRfcToDelete - Prépare la suppression d'une RFC
 * @param {Function} props.setShowConfirmDelete - Affiche le modal de confirmation de suppression
 * @param {Function} props.setToast - Affiche des notifications
 * @param {Function} props.getStatusClass - Utilitaire pour les classes CSS de statut
 */
const RfcProcessModal = ({
    selectedRfc,
    closeModals,
    showReportForm,
    setShowReportForm,
    reportForm,
    setReportForm,
    handleCreateReport,
    editDetail,
    detailForm,
    setDetailForm,
    handleUpdateDetail,
    statuses,
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
    handleDecision,
    setRfcToDelete,
    setShowConfirmDelete,
    setToast,
    getStatusClass: passedGetStatusClass
}) => {
    const [localEnvs, setLocalEnvs] = useState([]);

    useEffect(() => {
        if (environments && environments.length > 0) {
            setLocalEnvs(environments);
        } else {
            rfcService.getEnvironnements()
                .then(data => {
                    if (data && data.length > 0) {
                        setLocalEnvs(data);
                    }
                })
                .catch(() => {});
        }
    }, [environments]);

    if (!selectedRfc) return null;

    const getStatusClass = passedGetStatusClass || ((code) => {
        switch(code) {
            case 'BROUILLON':     return 'status-orange';
            case 'SOUMIS':        return 'status-blue';
            case 'EN_EVALUATION': return 'status-purple';
            case 'EVALUEE':       return 'status-indigo';
            case 'PRE_APPROUVEE': return 'status-yellow';
            case 'APPROUVEE':     return 'status-green';
            case 'PLANIFIEE':     return 'status-teal';
            case 'EN_COURS':      return 'status-pink';
            case 'REJETEE':       return 'status-red';
            case 'CLOTUREE':      return 'status-slate';
            case 'ANNULEE':       return 'status-red';
            default:              return 'status-default';
        }
    });

    const resolvedStatus = selectedRfc.statut || (statuses && statuses.find(s => String(s.id_statut) === String(selectedRfc.id_statut)));
    const statusCode = resolvedStatus?.code_statut || selectedRfc.statut?.code_statut || selectedRfc.code_statut || 'SOUMIS';


    return (
        <div className="modal-backdrop" onClick={closeModals}>
            <div className="modal-box glass-card" style={{ maxWidth: '1000px', width: '95%', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#f0f9ff', border: '1px solid #003366' }} onClick={e => e.stopPropagation()}>
                <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem', flexShrink: 0 }}>
                    <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                        <FiZap />
                    </div>
                    <div className="rfc-style-header-text">
                        <h2 style={{ color: '#ffffff' }}>
                            {selectedRfc.statut?.code_statut === 'PRE_APPROUVEE' ? 'Évaluation & Traitement de la RFC' : 'Consultation & Traitement de la RFC'}
                        </h2>
                        <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>#{selectedRfc.code_rfc} — {selectedRfc.titre_rfc}</div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        {setShowReportForm && (
                            <button onClick={() => setShowReportForm(!showReportForm)} style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', color: '#ffffff', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: '600', fontSize: '0.85rem' }}>
                                <FiFileText /> Rapport
                            </button>
                        )}
                        <button className="close-btn-rfc-style" onClick={closeModals} style={{ color: '#ffffff', background: 'none', border: 'none', cursor: 'pointer', alignSelf: 'flex-start', marginTop: '-5px' }}>
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                <div className="modal-body" style={{ overflowY: 'auto', flex: 1, padding: '2.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {showReportForm && (
                            <div style={{ background: '#fffbeb', padding: '1.5rem', borderRadius: '12px', border: '1px solid #fde68a' }}>
                                <h4 style={{ margin: '0 0 1rem 0', color: '#b45309', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiFileText /> Nouveau Rapport</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Titre du Rapport</label>
                                            <input type="text" value={reportForm.titre_rfc_rapport || reportForm.titre_rapport || ''} onChange={e => setReportForm({...reportForm, titre_rfc_rapport: e.target.value, titre_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none' }} placeholder="Ex: Rapport d'impact technique..." />
                                        </div>
                                        <div>
                                            <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Type</label>
                                            <select value={reportForm.type_rapport} onChange={e => setReportForm({...reportForm, type_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', background: 'white' }}>
                                                <option value="Audit">Audit</option>
                                                <option value="Risque">Analyse de Risque</option>
                                                <option value="Post-Incident">Post-Incident</option>
                                                <option value="PIR">PIR</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '600' }}>Contenu</label>
                                        <textarea value={reportForm.contenu_rapport} onChange={e => setReportForm({...reportForm, contenu_rapport: e.target.value})} style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #fcd34d', outline: 'none', minHeight: '100px' }} placeholder="Rédigez le contenu du rapport..." />
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                        <button onClick={() => setShowReportForm(false)} style={{ background: 'transparent', border: 'none', color: '#92400e', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem' }}>Annuler</button>
                                        <button onClick={handleCreateReport} style={{ background: '#f59e0b', color: 'white', border: 'none', borderRadius: '8px', padding: '0.5rem 1rem', cursor: 'pointer', fontWeight: '700', fontSize: '0.85rem' }}>Enregistrer le Rapport</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Alignement sur la même ligne (côte à côte) de l'analyse de la demande et des risques */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
                            {/* Analyse de la demande */}
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FiInfo /> Analyse de la demande
                                </h3>
                                
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description</label>
                                    <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0 1rem' }}>{selectedRfc.description}</p>
                                </div>
                                
                                <div>
                                    <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Justification Business</label>
                                    <p style={{ fontSize: '0.95rem', color: '#0f172a', fontWeight: '600', margin: '0.25rem 0 1rem' }}>{selectedRfc.justification || 'Aucune justification fournie.'}</p>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem', marginTop: '0.5rem' }}>
                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Statut Actuel</label>
                                        <div style={{ margin: '0.25rem 0' }}>
                                            {(() => {
                                                const statusLibelle = resolvedStatus?.libelle || selectedRfc.statut?.libelle || selectedRfc.libelle_statut || 'Inconnu';
                                                return (
                                                    <span className={`status-badge ${getStatusClass(statusCode)}`}>{statusLibelle}</span>
                                                );
                                            })()}
                                        </div>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FiActivity style={{ color: '#0369a1' }} /> Environnement
                                        </label>
                                        <select 
                                            value={selectedEnv || ''} 
                                            onChange={e => setSelectedEnv(e.target.value || '')}
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', color: '#1e293b', fontWeight: '600', cursor: 'pointer', marginTop: '0.25rem' }}
                                        >
                                            <option value="">Sélectionner...</option>
                                            {environments && environments.map(env => (
                                                <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <FiShield style={{ color: '#7c3aed' }} /> Type
                                        </label>
                                        {(() => {
                                            const currentValue = selectedRfc.id_type || selectedRfc.typeRfc?.id_type || detailForm?.id_type || '';
                                            const resolvedTypes = rfcTypes && rfcTypes.length > 0 ? rfcTypes : (
                                                selectedRfc.typeRfc ? [selectedRfc.typeRfc] : (
                                                    selectedRfc.id_type ? [{ id_type: selectedRfc.id_type, type: selectedRfc.type || 'STANDARD' }] : []
                                                )
                                            );
                                            const typeLabel = selectedRfc.typeRfc?.type || selectedRfc.type || 'STANDARD';
                                            const hasCurrentValue = resolvedTypes.some(t => String(t.id_type) === String(currentValue));
                                            const finalTypes = hasCurrentValue ? resolvedTypes : [
                                                ...resolvedTypes,
                                                ...(currentValue ? [{ id_type: currentValue, type: typeLabel }] : [])
                                            ];
                                            return (
                                                <select 
                                                    disabled={true}
                                                    value={currentValue} 
                                                    style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569', fontWeight: '600', marginTop: '0.25rem' }}
                                                >
                                                    <option value="">Sélectionner...</option>
                                                    {finalTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                                                </select>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>

                            {/* Évaluation des Risques - Sur la même ligne avec la description */}
                            <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                <h3 style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem', margin: 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FiAlertTriangle /> Évaluation des Risques
                                </h3>
                                
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.5rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Impact</label>
                                        <select 
                                            disabled={false}
                                            value={risk.impact} 
                                            onChange={e => setRisk({...risk, impact: parseInt(e.target.value), score: parseInt(e.target.value) * risk.probabilite})} 
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white', fontWeight: '600' }}
                                        >
                                            {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                        <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#475569' }}>Probabilité</label>
                                        <select 
                                            disabled={false}
                                            value={risk.probabilite} 
                                            onChange={e => setRisk({...risk, probabilite: parseInt(e.target.value), score: parseInt(e.target.value) * risk.impact})} 
                                            style={{ width: '100%', padding: '0.5rem', borderRadius: '8px', border: '1px solid #cbd5e1', cursor: 'pointer', background: 'white', fontWeight: '600' }}
                                        >
                                            {[1,2,3,4,5].map(v => <option key={v} value={v}>{v}</option>)}
                                        </select>
                                    </div>
                                </div>
                                
                                <div style={{ background: 'white', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '100px', marginTop: '0.5rem' }}>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Score de Risque</div>
                                    <div style={{ fontSize: '2rem', fontWeight: '900', color: risk.score > 12 ? '#dc2626' : risk.score > 6 ? '#f59e0b' : '#10b981' }}>{risk.score} / 25</div>
                                </div>
                            </div>
                        </div>

                        {/* Suivi d'implémentation */}
                        {relatedChange && (
                            <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <h3 style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '800', textTransform: 'uppercase', borderBottom: '2px solid #3b82f6', paddingBottom: '0.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <FiLayers style={{ color: '#3b82f6' }} /> Suivi Implémentation
                                </h3>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                                    <div style={{ background: '#f0f9ff', padding: '1rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: '700' }}>Changement</label>
                                        <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0c4a6e' }}>#{relatedChange.code_changement}</div>
                                    </div>
                                    <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>Statut</label>
                                        <Badge variant={
                                            ['IMPLEMENTE', 'CLOTURE', 'TERMINEE'].includes(relatedChange.statut?.code_statut) ? 'success' :
                                            ['EN_ECHEC', 'ANNULEE', 'REJETEE'].includes(relatedChange.statut?.code_statut) ? 'danger' : 'info'
                                        }>
                                            {relatedChange.statut?.libelle || relatedChange.statut?.code_statut}
                                        </Badge>
                                    </div>
                                </div>
                                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr style={{ background: '#f1f5f9', textAlign: 'left' }}>
                                                <th style={{ padding: '10px 12px' }}>Tâche</th>
                                                <th style={{ padding: '10px 12px' }}>Statut</th>
                                                <th style={{ padding: '10px 12px' }}>Assigné</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {tasksLoading ? (
                                                <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}><FiRefreshCw className="spin" /></td></tr>
                                            ) : changeTasks.length === 0 ? (
                                                <tr><td colSpan="3" style={{ padding: '2rem', textAlign: 'center' }}>Aucune tâche.</td></tr>
                                            ) : changeTasks.map(t => (
                                                <tr key={t.id_tache} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px' }}>
                                                        <div style={{ fontWeight: '800' }}>{t.titre_tache}</div>
                                                        <div style={{ fontSize: '0.75rem', color: '#3b82f6' }}>#{t.code_tache}</div>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '700', background: '#f1f5f9', color: '#475569' }}>
                                                            {t.statut?.libelle || 'En attente'}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px' }}>
                                                        <span style={{ fontWeight: '600' }}>{t.implementeur?.prenom_user} {t.implementeur?.nom_user}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="modal-footer" style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '1rem', flexShrink: 0 }}>
                    {handleDecision && ['PRE_APPROUVEE', 'SOUMIS', 'EN_EVALUATION', 'EVALUEE'].includes(statusCode) && (
                        <>
                            <button 
                                onClick={() => handleDecision('REJETEE')} 
                                className="modal-btn modal-btn-reject" 
                                style={{ background: '#ef4444', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                            >
                                Rejeter
                            </button>
                            <button 
                                onClick={() => handleDecision('APPROUVEE')} 
                                className="modal-btn modal-btn-approve" 
                                style={{ background: '#10b981', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '700' }}
                            >
                                Approuver
                            </button>
                        </>
                    )}
                    <button className="modal-btn modal-btn-cancel" onClick={closeModals} style={{ background: 'transparent', color: '#475569', border: '1px solid #cbd5e1', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600' }}>Fermer</button>
                </div>
            </div>
        </div>
    );
};

export default RfcProcessModal;
