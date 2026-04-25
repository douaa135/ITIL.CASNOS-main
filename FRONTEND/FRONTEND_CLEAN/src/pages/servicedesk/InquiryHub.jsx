import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiSearch, FiLayers, FiClock, FiInfo, FiActivity, FiX, FiFileText, FiCheckCircle, FiEdit2, FiXCircle, FiExternalLink
} from 'react-icons/fi';
import api from '../../api/axiosClient';
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
      const [resRfc, resChg] = await Promise.all([
        api.get('/rfc'),
        api.get('/changements')
      ]);
      if (resRfc.success) setRfcs(resRfc.data.rfcs || []);
      if (resChg.success) setChangements(resChg.data.changements || []);
    } catch (error) {
      console.error('Inquiry Hub Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/admin/statuts?contexte=RFC'),
        api.get('/admin/environnements'),
        api.get('/admin/types-rfc')
      ]);
      if (results[0].status === 'fulfilled' && results[0].value.success) setStatuses(results[0].value.data.statuts);
      if (results[1].status === 'fulfilled' && results[1].value.success) setEnvironnements(results[1].value.data.environnements);
      if (results[2].status === 'fulfilled' && results[2].value.success) setRfcTypes(results[2].value.data.types);
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
      if (statusCode === 'ACCEPTEE_SD') {
        await api.put(`/rfc/${selectedItem.id_rfc}`, {
          id_type: selectedType,
          impacte_estimee: "Environnement ciblé: " + environnements.find(e => e.id_env === selectedEnv)?.nom_env
        });
      }

      // 2. Transmettre au statut suivant
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

  const getStatusClass = (code) => {
    switch (code) {
      case 'SOUMIS':      return 'status-warning';
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
    ...(filterType === 'ALL' || filterType === 'RFC' ? rfcs.map(r => ({ ...r, typeLabel: 'RFC', dataType: 'RFC' })) : []),
    ...(filterType === 'ALL' || filterType === 'CHG' ? changements.map(c => ({ ...c, typeLabel: 'CHG', dataType: 'CHG', titre_rfc: c.rfc?.titre_rfc, code_rfc: c.rfc?.code_rfc })) : [])
  ].filter(item => {
    const search = searchTerm.toLowerCase();
    const code = (item.code_rfc || item.code_changement || '').toLowerCase();
    const title = (item.titre_rfc || item.titre_changement || '').toLowerCase();
    return code.includes(search) || title.includes(search);
  });

  return (
    <div className="inquiry-hub">
      <div className="hub-header">
         <div className="hub-title">
            <h2><FiLayers /> Triage des Requêtes (Inquiry Hub)</h2>
            <p>Vérification formelle et complétude des requêtes avant soumission au Change Management.</p>
         </div>
         <div className="hub-controls">
            <div className="hub-search">
               <FiSearch />
               <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
            </div>
            <select className="hub-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
               <option value="ALL">Tous</option>
               <option value="RFC">RFC (Nouvelles requêtes)</option>
               <option value="CHG">CHG (Historique)</option>
            </select>
            <button className="hub-refresh" onClick={fetchData}><FiClock /></button>
         </div>
      </div>

      <div className="hub-main">
         <table className="hub-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Référence</th>
                <th>Titre</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                 <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Chargement...</td></tr>
              ) : filteredData.map((item, idx) => (
                <tr key={idx} onClick={() => setSelectedItem(item)} style={{ cursor: 'pointer' }}>
                  <td><span className={`type-badge type-${item.dataType === 'RFC' ? 'normal' : 'standard'}`}>{item.typeLabel}</span></td>
                  <td style={{ fontWeight: '700' }}>{item.code_rfc || item.code_changement}</td>
                  <td>{item.titre_rfc || item.titre_changement}</td>
                  <td><span className={`status-pill ${getStatusClass(item.statut?.code_statut)}`}>{item.statut?.libelle}</span></td>
                  <td>{new Date(item.date_creation || item.createdAt).toLocaleDateString()}</td>
                  <td><button style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer' }}><FiInfo /></button></td>
                </tr>
              ))}
            </tbody>
         </table>
      </div>

      {selectedItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setSelectedItem(null)}>
          <div style={{ width: '600px', maxWidth: '100%', background: 'white', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#1e40af', color: 'white', padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Vérification {selectedItem.dataType} ({selectedItem.code_rfc || selectedItem.code_changement})</h3>
              <button onClick={() => setSelectedItem(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}><FiX size={20} /></button>
            </div>
            
            <div style={{ padding: '1.5rem', maxHeight: '70vh', overflowY: 'auto' }}>
              <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid #e2e8f0' }}>
                <div style={{ marginBottom: '10px' }}>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Titre</label>
                  <div style={{ fontWeight: '600', fontSize: '1.1rem', color: '#1e293b' }}>{selectedItem.titre_rfc || selectedItem.titre_changement}</div>
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description & Justification</label>
                  <div style={{ fontSize: '0.9rem', color: '#475569', marginTop: '4px', whiteSpace: 'pre-wrap' }}>{selectedItem.description}</div>
                </div>
              </div>

              {selectedItem.dataType === 'RFC' && selectedItem.statut?.code_statut === 'SOUMIS' && (
                <div className="action-form">
                  <h4 style={{ marginBottom: '1rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
                     <FiCheckCircle /> Triage Initial & Classification
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem', background: '#f8fafc', padding: '10px', borderRadius: '8px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>Type de Demande</label>
                      <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="">Sélectionner un Type...</option>
                        {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '600', marginBottom: '4px' }}>Environnement Impacté</label>
                      <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
                        <option value="">Cibler un environnement...</option>
                        {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                      </select>
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '8px', color: '#334155' }}>Motif ou commentaire pour le demandeur :</label>
                    <textarea 
                      placeholder="Indiquez ici pourquoi la demande est incomplète, ou ajoutez une note pour le Change Manager..."
                      value={analysis} 
                      onChange={e => setAnalysis(e.target.value)} 
                      style={{ width: '100%', height: '100px', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', resize: 'vertical', fontFamily: 'inherit' }} 
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                    <button onClick={() => handleTriageDecision('REFUSEE_SD')} disabled={submitting} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                      Refuser (Non conforme)
                    </button>
                    <button onClick={() => handleTriageDecision('A_COMPLETER')} disabled={submitting} style={{ flex: 1.2, padding: '10px', borderRadius: '8px', background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s' }}>
                      Demander Complétude
                    </button>
                    <button onClick={() => handleTriageDecision('ACCEPTEE_SD')} disabled={submitting} style={{ flex: 1.5, padding: '10px', borderRadius: '8px', background: '#10b981', color: 'white', border: 'none', fontWeight: '700', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' }}>
                      Accepter & Transférer
                    </button>
                  </div>
                </div>
              )}

              {selectedItem.dataType === 'RFC' && selectedItem.statut?.code_statut !== 'SOUMIS' && (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                  <FiClock size={32} color="#94a3b8" style={{ marginBottom: '10px' }} />
                  <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Cette demande a déjà été traitée (Statut actuel : {selectedItem.statut?.libelle}).</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InquiryHub;
