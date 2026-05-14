import React from 'react';
import { FiActivity, FiX, FiInfo, FiEdit2, FiXCircle, FiCheckCircle } from 'react-icons/fi';

/**
 * RfcProcessingModal - Modal de qualification Service Desk d'une RFC.
 * Permet l'analyse technique, la classification et le transfert au Change Manager.
 * 
 * @param {Object} props
 * @param {boolean} props.show - État de visibilité
 * @param {Object} props.rfc - La RFC sélectionnée
 * @param {Function} props.onClose - Fermeture
 * @param {string} props.selectedType - Type RFC sélectionné (ID)
 * @param {Function} props.setSelectedType - Setter du type
 * @param {string} props.analysis - Contenu de l'analyse technique
 * @param {Function} props.setAnalysis - Setter de l'analyse
 * @param {Array} props.rfcTypes - Référentiel des types
 * @param {Array} props.changeManagers - Liste des Change Managers
 * @param {string} props.selectedCM - CM sélectionné (ID)
 * @param {Function} props.setSelectedCM - Setter du CM
 * @param {Array} props.environnements - Référentiel des environnements
 * @param {string} props.selectedEnv - Environnement sélectionné (ID)
 * @param {Function} props.setSelectedEnv - Setter de l'environnement
 * @param {Array} props.priorites - Référentiel des priorités
 * @param {string} props.selectedPrio - Priorité sélectionnée (ID)
 * @param {Function} props.setSelectedPrio - Setter de la priorité
 * @param {boolean} props.submitting - État de soumission
 * @param {Function} props.onDecision - Handler pour Approuver/Rejeter
 * @param {Function} props.onEdit - Redirection vers l'édition
 * @param {Object} props.templates - Templates d'analyse (impact)
 */
const RfcProcessingModal = ({
  show,
  rfc,
  onClose,
  selectedType,
  setSelectedType,
  analysis,
  setAnalysis,
  rfcTypes,
  changeManagers,
  selectedCM,
  setSelectedCM,
  environnements,
  selectedEnv,
  setSelectedEnv,
  priorites,
  selectedPrio,
  setSelectedPrio,
  submitting,
  onDecision,
  onEdit,
  templates
}) => {
  if (!show || !rfc) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 8999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={onClose}>
      <div 
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: '800px', maxWidth: '95vw', background: 'white', maxHeight: '90vh', 
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', 
          borderRadius: '12px',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'fadeIn 0.3s ease-out'
        }}
      >
        {/* Header - Bleu Premium */}
        <div style={{ background: '#003366', color: 'white', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, borderBottom: '2px solid #002855' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', padding: '10px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(255, 255, 255, 0.2)' }}>
                <FiActivity size={24} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', letterSpacing: '0.025em' }}>Qualification Service Desk</h2>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', fontWeight: '500' }}>
                Analyse et préparation de la RFC avant transfert au Change Manager
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', display: 'flex', borderRadius: '50%', transition: 'background 0.2s' }}
            onMouseOver={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseOut={e => e.currentTarget.style.background = 'transparent'}
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="rfc-modal-body" style={{ padding: '2rem', overflowY: 'auto', flex: 1, background: '#f8fafc' }}>
          {/* Détails RFC */}
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
             <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: '#003366', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <FiInfo /> Détails de la Demande
             </h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Référence</label>
                    <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e40af' }}>#{rfc.code_rfc}</div>
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Titre</label>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', color: '#0f172a' }}>{rfc.titre_rfc}</div>
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Demandeur</label>
                    <div style={{ fontSize: '0.9rem', color: '#334155', fontWeight: '500' }}>{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</div>
                </div>
             </div>
             
             <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Description du besoin</label>
                    <div style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap', lineHeight: '1.6', background: '#f1f5f9', padding: '1rem', borderRadius: '8px' }}>{rfc.description}</div>
                </div>
                <div>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '800', textTransform: 'uppercase', display: 'block', marginBottom: '4px' }}>Score de Risque</label>
                    <div style={{ marginTop: '4px' }}>
                      <div style={{ 
                        padding: '12px', 
                        borderRadius: '10px', 
                        fontSize: '1.25rem', 
                        fontWeight: '900',
                        textAlign: 'center',
                        background: (rfc.evaluationRisque?.score_risque || 0) > 12 ? '#fef2f2' : (rfc.evaluationRisque?.score_risque || 0) > 6 ? '#fffbeb' : '#f0fdf4',
                        color: (rfc.evaluationRisque?.score_risque || 0) > 12 ? '#ef4444' : (rfc.evaluationRisque?.score_risque || 0) > 6 ? '#d97706' : '#22c55e',
                        border: `2px solid ${(rfc.evaluationRisque?.score_risque || 0) > 12 ? '#fee2e2' : (rfc.evaluationRisque?.score_risque || 0) > 6 ? '#fef3c7' : '#dcfce7'}`
                      }}>
                        {rfc.evaluationRisque?.score_risque || '00'} / 25
                      </div>
                      <p style={{ fontSize: '0.7rem', color: '#94a3b8', textAlign: 'center', marginTop: '6px', fontWeight: '500' }}>Évalué par le demandeur</p>
                    </div>
                </div>
             </div>
          </div>

          <div className="decision-form" style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
             <h3 style={{ margin: '0 0 1.25rem', fontSize: '0.95rem', color: '#003366', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <FiActivity /> Analyse & Affectation
             </h3>
             
             {/* Checklist Validation */}
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '1.5rem', padding: '12px', background: '#f0f9ff', borderRadius: '10px', border: '1px solid #e0f2fe' }}>
                {[
                  { label: "Détails explicites", checked: true },
                  { label: "Justification valide", checked: true },
                  { label: "Impact évalué", checked: false },
                ].map((check, idx) => (
                  <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', cursor: 'pointer', color: '#0369a1', fontWeight: '700' }}>
                    <input type="checkbox" defaultChecked={check.checked} style={{ width: '15px', height: '15px', cursor: 'pointer' }} /> {check.label}
                  </label>
                ))}
             </div>

             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem', marginBottom: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '6px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Classification RFC <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', outline: 'none', background: '#fcfcfc' }}>
                    <option value="">-- Type / Workflow --</option>
                    {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '6px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Priorité Assignée <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={selectedPrio} onChange={e => setSelectedPrio(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', outline: 'none', background: '#fcfcfc' }}>
                    <option value="">-- Priorité --</option>
                    {priorites.map(p => <option key={p.id_priorite} value={p.id_priorite}>{p.libelle}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '6px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Assigner Change Manager <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={selectedCM} onChange={e => setSelectedCM(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', outline: 'none', background: '#fcfcfc' }}>
                    <option value="">-- Choisir le manager --</option>
                    {changeManagers.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: '800', marginBottom: '6px', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Environnement Cible <span style={{ color: '#ef4444' }}>*</span></label>
                  <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: '600', outline: 'none', background: '#fcfcfc' }}>
                    <option value="">-- Cibler l'environnement --</option>
                    {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                  </select>
                </div>
             </div>

             <div style={{ marginTop: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                   <label style={{ display: 'block', fontWeight: '800', fontSize: '0.75rem', color: '#64748b', textTransform: 'uppercase' }}>Analyse Technique d'Impact <span style={{ color: '#ef4444' }}>*</span></label>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button type="button" onClick={() => setAnalysis(templates.COMPLET)} style={{ fontSize: '0.7rem', padding: '5px 12px', borderRadius: '6px', border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s' }}>Modèle Complet</button>
                      <button type="button" onClick={() => setAnalysis(templates.MINEUR)} style={{ fontSize: '0.7rem', padding: '5px 12px', borderRadius: '6px', border: '1px solid #10b981', background: 'transparent', color: '#10b981', cursor: 'pointer', fontWeight: '700', transition: 'all 0.2s' }}>Modèle Rapide</button>
                   </div>
                </div>
                <textarea 
                  value={analysis}
                  onChange={e => setAnalysis(e.target.value)}
                  placeholder="Saisissez ici l'analyse technique pour le Change Manager..."
                  style={{ width: '100%', padding: '15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.9rem', minHeight: '150px', resize: 'none', outline: 'none', transition: 'border-color 0.2s', lineHeight: '1.5' }}
                  onFocus={e => e.target.style.borderColor = '#3b82f6'}
                  onBlur={e => e.target.style.borderColor = '#cbd5e1'}
                />
             </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div style={{ padding: '1.5rem 2rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexShrink: 0 }}>
            <button 
              onClick={onEdit}
              disabled={submitting}
              style={{ padding: '12px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', color: '#475569', background: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', transition: 'all 0.2s' }}
            >
              <FiEdit2 size={18} /> Modifier
            </button>
            <div style={{ width: '1px', background: '#e2e8f0', margin: '0 8px' }}></div>
            <button 
              onClick={() => onDecision('REJETEE')}
              disabled={submitting || !selectedType || !analysis.trim()}
              style={{ padding: '12px 24px', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.2)', transition: 'all 0.2s', opacity: (submitting || !selectedType || !analysis.trim()) ? 0.6 : 1 }}
            >
              <FiXCircle size={20} /> {submitting ? 'Traitement...' : 'Rejeter'}
            </button>
            <button 
              onClick={() => onDecision('PRE_APPROUVEE')}
              disabled={submitting || !selectedType || !selectedPrio || !selectedCM || !selectedEnv || !analysis.trim()}
              style={{ padding: '12px 28px', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)', transition: 'all 0.2s', opacity: (submitting || !selectedType || !selectedPrio || !selectedCM || !selectedEnv || !analysis.trim()) ? 0.6 : 1 }}
            >
              <FiCheckCircle size={20} /> {submitting ? 'Traitement...' : 'Approuver & Transférer'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default RfcProcessingModal;
