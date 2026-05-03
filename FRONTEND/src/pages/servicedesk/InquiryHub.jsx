import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiLayers, FiClock, FiInfo, FiActivity, FiX, FiFileText, FiCheckCircle, FiEdit2, FiXCircle, FiExternalLink, FiArrowRight, FiRefreshCw
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import './InquiryHub.css';

const InquiryHub = () => {
  const navigate = useNavigate();
  const [rfcs, setRfcs] = useState([]);
  const [changements, setChangements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [selectedItem, setSelectedItem] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [statuses, setStatuses] = useState([]);
  const [environnements, setEnvironnements] = useState([]);
  const [rfcTypes, setRfcTypes] = useState([]);

  const [selectedType, setSelectedType] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [analysis, setAnalysis] = useState('');

  useEffect(() => {
    fetchData();
    fetchReferenceData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const rfcsPromise = rfcService.getAllRfcs().catch(err => {
        console.error('RFC Fetch Error:', err);
        return [];
      });
      const chgsPromise = api.get('/changements').catch(err => {
        console.error('CHG Fetch Error:', err);
        return [];
      });

      const [allRfcs, allChgs] = await Promise.all([rfcsPromise, chgsPromise]);
      
      setRfcs(Array.isArray(allRfcs) ? allRfcs : []);
      const chgData = allChgs?.data?.changements || allChgs?.changements || (Array.isArray(allChgs) ? allChgs : []);
      setChangements(chgData);
    } catch (error) {
      console.error('Inquiry Hub Critical Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };


  const fetchReferenceData = async () => {
    try {
      const [stats, envs, types] = await Promise.all([
        rfcService.getStatuts('RFC'),
        rfcService.getEnvironnements(),
        rfcService.getTypesRfc()
      ]);
      setStatuses(stats);
      setEnvironnements(envs);
      setRfcTypes(types);
    } catch (e) { console.error('Ref data error:', e); }
  };

  const handleTriageDecision = async (statusCode) => {
    if (!selectedItem || selectedItem.dataType !== 'RFC') return;
    if ((statusCode === 'A_COMPLETER' || statusCode === 'REFUSEE_SD') && !analysis.trim()) {
      return alert('Un commentaire est requis pour cette action.');
    }
    if (statusCode === 'ACCEPTEE_SD' && (!selectedType || !selectedEnv)) {
      return alert('Vous devez classifier le Type et assigner l\'Environnement avant d\'accepter.');
    }

    const targetStatus = statuses.find(s => s.code_statut === statusCode);
    if (!targetStatus) return alert('Statut introuvable.');

    setSubmitting(true);
    try {
      // 1. Mettre à jour le type et l'environnement de la RFC
      if (statusCode === 'EVALUEE') {
        await api.put(`/rfc/${selectedItem.id_rfc}`, {
          id_type: selectedType,
          impacte_estimee: "Environnement ciblé: " + (environnements.find(e => e.id_env === selectedEnv)?.nom_env || 'Non spécifié')
        });
      }

      // 2. Transmettre au statut suivant
      const targetStatus = statuses.find(s => s.code_statut === statusCode);
      if (!targetStatus) return alert('Statut introuvable.');

      const res = await api.patch(`/rfc/${selectedItem.id_rfc}/status`, {
        id_statut: targetStatus.id_statut,
        commentaire: analysis.trim() || undefined
      });
      
      if (res.success) {
         alert('RFC triée et classifiée avec succès.');

        setSelectedItem(null);
        fetchData();
        setAnalysis('');
        setSelectedType('');
        setSelectedEnv('');
      }
    } catch (error) { 
      alert('Erreur lors du traitement du triage.'); 
      console.error(error);
    }
    finally { setSubmitting(false); }
  };

  const getStatusLabel = (item) => {
    if (item.dataType === 'RFC' && item.statut?.code_statut === 'BROUILLON') {
      return 'Soumise';
    }
    return item.statut?.libelle || 'Inconnu';
  };

  const getStatusClass = (code) => {
    switch (code) {
      case 'SOUMIS':      return 'status-warning';
      case 'BROUILLON':   return 'status-warning'; // Display as Soumise
      case 'A_COMPLETER': return 'status-warning';
      case 'ACCEPTEE_SD': return 'status-working';
      case 'REFUSEE_SD':  return 'status-danger';
      case 'EVALUEE':     return 'status-working';
      case 'APPROUVEE':   return 'status-success';
      case 'REJETEE':     return 'status-danger';
      case 'CLOTUREE':    return 'status-neutral';
      default:            return 'status-neutral';
    }
  };

  const filteredData = [
    ...(filterType === 'ALL' || filterType === 'RFC' ? (rfcs || []).map(r => ({ 
      ...r, 
      typeLabel: 'RFC', 
      dataType: 'RFC', 
      titre_rfc: r.titre_rfc || r.titre, 
      code_rfc: r.code_rfc || r.id_rfc 
    })) : []),
    ...(filterType === 'ALL' || filterType === 'CHG' ? (changements || []).map(c => ({ 
      ...c, 
      typeLabel: 'CHG', 
      dataType: 'CHG', 
      titre_rfc: c.rfc?.titre_rfc || c.titre_changement, 
      code_rfc: c.rfc?.code_rfc || c.code_changement 
    })) : [])
  ].filter(item => {


    const search = searchTerm.toLowerCase();
    const code = (item.code_rfc || '').toLowerCase();
    const title = (item.titre_rfc || '').toLowerCase();
    return code.includes(search) || title.includes(search);
  });

  return (
    <div className="inquiry-hub">
      <div className="premium-header-card" style={{ marginBottom: '1rem' }}>
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiLayers /></div>
          <div className="premium-header-text">
            <h1>Triage des Requêtes</h1>
            <p>Vérifiez et qualifiez les nouvelles demandes soumises par les demandeurs.</p>
          </div>
        </div>
        <div className="premium-header-actions">
           <button 
             className="btn-create-premium" 
             onClick={fetchData}
             style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)' }}
           >
             <FiRefreshCw /> Actualiser
           </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'white', padding: '1rem', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          <input 
            type="text" 
            placeholder="Rechercher par référence ou titre..." 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            style={{ width: '100%', padding: '0.65rem 0.9rem 0.65rem 2.4rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
          />
        </div>
        <select 
          value={filterType} 
          onChange={e => setFilterType(e.target.value)}
          style={{ padding: '0.65rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '600', fontSize: '0.85rem', minWidth: '160px' }}
        >
          <option value="ALL">Tous les types</option>
          <option value="RFC">RFC uniquement</option>
          <option value="CHG">Changements uniquement</option>
        </select>
      </div>

      <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
         <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Type</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Référence</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Titre de la Demande</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Demandeur</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Statut</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase' }}>Date</th>
                <th style={{ padding: '1rem 1.25rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chargement des données...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Aucune requête en attente.</td></tr>
              ) : filteredData.map((item, idx) => (
                <tr key={idx} onClick={() => setSelectedItem(item)} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', background: idx % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.2s' }} className="hover-row">
                  <td style={{ padding: '1rem 1.25rem' }}><span className={`item-badge ${item.dataType}`}>{item.typeLabel}</span></td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: '700', color: '#0f172a' }}>{item.code_rfc || item.code_changement}</td>
                  <td style={{ padding: '1rem 1.25rem', fontWeight: '600', color: '#1e293b' }}>{item.titre_rfc || item.titre_changement}</td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: '800' }}>
                        {item.demandeur?.prenom_user?.[0]}{item.demandeur?.nom_user?.[0]}
                      </div>
                      <span style={{ fontSize: '0.85rem', fontWeight: '500', color: '#475569' }}>
                        {item.demandeur?.prenom_user} {item.demandeur?.nom_user}
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: '1rem 1.25rem' }}>
                    <span className={`status-pill ${getStatusClass(item.statut?.code_statut)}`}>
                      {getStatusLabel(item)}
                    </span>
                  </td>
                  <td style={{ padding: '1rem 1.25rem', color: '#64748b', fontSize: '0.85rem' }}>{new Date(item.date_creation || item.createdAt).toLocaleDateString('fr-FR')}</td>
                  <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}><button className="sd-view-btn" style={{ padding: '6px', borderRadius: '8px' }}><FiArrowRight /></button></td>
                </tr>
              ))}
            </tbody>
         </table>
      </div>

      {selectedItem && (
        <div className="modal-backdrop-cab" onClick={() => setSelectedItem(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-box-cab" onClick={e => e.stopPropagation()} style={{ width: '850px', maxWidth: '100%', background: 'white', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="modal-top-rfc-style" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
              <div className="rfc-style-icon-wrapper tm-icon-success" style={{ width: '56px', height: '56px', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}><FiCheckCircle /></div>
              <div className="rfc-style-header-text" style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Triage & Qualification</h2>
                <div className="rfc-style-subtitle" style={{ color: '#64748b', fontSize: '0.85rem' }}>{selectedItem.dataType} #{selectedItem.code_rfc || selectedItem.code_changement} • Demandeur: {selectedItem.demandeur?.prenom_user} {selectedItem.demandeur?.nom_user}</div>
              </div>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '8px' }}><FiX size={24} /></button>
            </div>
            
            <div className="modal-body-rfc-style" style={{ padding: '2rem', maxHeight: '75vh', overflowY: 'auto', background: '#f8fafc' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Objet de la demande</div>
                <div style={{ fontWeight: '800', fontSize: '1.2rem', color: '#0f172a', marginBottom: '1rem' }}>{selectedItem.titre_rfc || selectedItem.titre_changement}</div>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: '1.6', background: '#f1f5f9', padding: '1rem', borderRadius: '12px' }}>{selectedItem.description}</div>
              </div>

              {selectedItem.dataType === 'RFC' && ['SOUMIS', 'BROUILLON'].includes(selectedItem.statut?.code_statut) ? (
                <div className="action-form" style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                  <div className="tm-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                    <div className="form-group-cab">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', color: '#475569', textTransform: 'uppercase' }}>Classification RFC <span className="tm-required">*</span></label>
                      <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}>
                        <option value="">Sélectionner un Type...</option>
                        {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                      </select>
                    </div>
                    <div className="form-group-cab">
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', color: '#475569', textTransform: 'uppercase' }}>Environnement Cible <span className="tm-required">*</span></label>
                      <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none' }}>
                        <option value="">Cibler un environnement...</option>
                        {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', marginBottom: '8px', color: '#475569', textTransform: 'uppercase' }}>Analyse & Commentaires de Triage</label>
                    <textarea 
                      placeholder="Analyse préliminaire ou motif du rejet..."
                      value={analysis} 
                      onChange={e => setAnalysis(e.target.value)} 
                      style={{ width: '100%', height: '100px', padding: '12px', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', resize: 'vertical', fontSize: '0.95rem', outline: 'none' }} 
                    />
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '2rem', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                   <p style={{ margin: 0, color: '#64748b', fontWeight: 600 }}>Cette demande est en cours de traitement ou déjà qualifiée.</p>
                </div>
              )}
            </div>

            <div className="modal-footer-rfc-style" style={{ padding: '1.25rem 2rem', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button onClick={() => setSelectedItem(null)} style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Annuler</button>
              {selectedItem.dataType === 'RFC' && ['SOUMIS', 'BROUILLON'].includes(selectedItem.statut?.code_statut) && (
                <>
                  <button 
                    onClick={() => handleTriageDecision('REJETEE')} 
                    disabled={submitting} 
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Rejeter
                  </button>
                  <button 
                    onClick={() => handleTriageDecision('EVALUEE')} 
                    disabled={submitting} 
                    style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: 'white', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
                  >
                    Accepter & Transférer
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}


  </div>
  );
};

export default InquiryHub;
