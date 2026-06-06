import React from 'react';
import { FiFileText, FiX } from 'react-icons/fi';


/**
 * RfcDetailModal - Modal de consultation détaillée d'une RFC pour le demandeur.
 * Affiche les informations clés, les dates et l'analyse d'impact.
 * 
 * @param {Object} props
 * @param {Object} props.rfc - La RFC à afficher
 * @param {Array} props.environments - La liste des environnements
 * @param {Function} props.onClose - Handler de fermeture
 */
const RfcDetailModal = ({ rfc, onClose }) => {
  if (!rfc) return null;

  return (
    <div className="modal-backdrop-cab" onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="modal-box-cab" onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '800px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div className="modal-top-rfc-style" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderBottom: '1px solid #002855', background: 'linear-gradient(90deg, #003366 0%, #003d80 100%)' }}>
          <div className="rfc-style-icon-wrapper" style={{ width: '56px', height: '56px', borderRadius: '14px', background: 'rgba(255,255,255,0.1)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid rgba(255,255,255,0.2)' }}>
            <FiFileText />
          </div>
          <div className="rfc-style-header-text" style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#ffffff' }}>Détails de la RFC</h2>
            <div className="rfc-style-subtitle" style={{ color: '#bae6fd', fontSize: '0.85rem' }}>ID: {rfc.id_rfc} • Créé le {new Date(rfc.date_creation).toLocaleDateString('fr-FR')}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#ffffff', cursor: 'pointer', padding: '0.5rem' }}><FiX size={24} /></button>
        </div>

        <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto', background: '#f8fafc' }}>
          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>{rfc.titre}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="info-item-premium">
                <span className="info-label-premium">Type de Changement</span>
                <span className="info-value-premium">{rfc.type}</span>
              </div>
              <div className="info-item-premium">
                <span className="info-label-premium">Priorité</span>
                <span className="info-value-premium">{rfc.priorite?.libelle}</span>
              </div>
              <div className="info-item-premium">
                <span className="info-label-premium">Urgence</span>
                <span className="info-value-premium">{rfc.urgence}</span>
              </div>
              <div className="info-item-premium">
                <span className="info-label-premium">Date souhaitée</span>
                <span className="info-value-premium">{rfc.date_souhaitee}</span>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
             <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Analyse d'Impact</h3>
             <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>{rfc.impactEstime || 'Aucune description fournie.'}</p>
          </div>
        </div>

        <div style={{ padding: '1.25rem 2rem', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
        </div>
      </div>
    </div>
  );
};

export default RfcDetailModal;
