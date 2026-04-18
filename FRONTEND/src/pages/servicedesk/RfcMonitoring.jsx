import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiRefreshCw, FiFilter,
  FiEye, FiActivity, FiClock, FiFileText,
  FiZap, FiCalendar, FiList, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiPlus, FiArrowRight, FiInfo, FiEdit2, FiX, FiCheck
} from 'react-icons/fi';
import api from '../../api/axios';
import '../changemanager/RfcManagement.css'; // Reusing established styles

/* ─── KPI Card ── */
const KpiCard = ({ label, value, icon, color, sub }) => (
  <div className={`premium-glass-card stat-card ${color}`} style={{ flex: 1, minWidth: '200px' }}>
    <div className="stat-icon-wrapper">{icon}</div>
    <div className="stat-info">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
      {sub && <span className="stat-sub" style={{ fontSize: '0.75rem', opacity: 0.7 }}>{sub}</span>}
    </div>
  </div>
);

const getStatusClass = (code) => {
  switch (code) {
    case 'SOUMIS':    return 'status-working';
    case 'EVALUEE':   return 'status-working';
    case 'APPROUVEE': return 'status-success';
    case 'REJETEE':   return 'status-danger';
    case 'CLOTUREE':  return 'status-neutral';
    default:          return 'status-neutral';
  }
};

const IMPACT_TEMPLATES = {
  COMPLET: `**[ÉVALUATION D'IMPACT COMPLET]**
- IMPACT TECHNIQUE : (Ressources serveurs, BD, Réseau)
- IMPACT UTILISATEUR : (Nombre d'utilisateurs, temps d'interruption)
- IMPACT MÉTIER : (Processus critiques impactés)
- PLAN DE VÉRIFICATION : (Tests déjà effectués)`,
  
  TECHNIQUE: `**[VÉRIFICATION TECHNIQUE]**
- Infrastructure : OK / À surveiller
- Sécurité : Aucun risque identifié
- Performance : Charge processeur stable`,
  
  MINEUR: `**[IMPACT FAIBLE]**
Changement standard à faible risque.
Aucune interruption de service prévue.
Vérification post-implémentation requise.`
};

const RfcMonitoring = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  
  // Processing Modal
  const [selectedRfc, setSelectedRfc] = useState(null);
  const [showProcess, setShowProcess] = useState(false);
  const [selectedType, setSelectedType] = useState('');
  const [analysis, setAnalysis] = useState('');
  const [rfcTypes, setRfcTypes] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const [statuses, setStatuses] = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [environnements, setEnvironnements] = useState([]);

  // Selections for Approval
  const [selectedCM, setSelectedCM] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');

  const fetchRfcs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfc');
      if (res.success) setRfcs(res.data.rfcs || []);
    } catch (e) {
      console.error('Monitoring Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/admin/statuts?contexte=RFC'),
        api.get('/users/by-role/CHANGE_MANAGER'),
        api.get('/admin/environnements'),
        api.get('/admin/types-rfc')
      ]);
      
      const stRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const cmRes = results[1].status === 'fulfilled' ? results[1].value : null;
      const envRes = results[2].status === 'fulfilled' ? results[2].value : null;
      const typeRes = results[3].status === 'fulfilled' ? results[3].value : null;

      if (stRes?.success) setStatuses(stRes.data.statuts || []);
      if (cmRes?.success) setChangeManagers(cmRes.data.users || cmRes.data.data || []);
      if (envRes?.success) setEnvironnements(envRes.data.environnements || []);
      if (typeRes?.success) setRfcTypes(typeRes.data.types || []);
    } catch (e) { console.error('Reference data error:', e); }
  };

  useEffect(() => {
    fetchRfcs();
    fetchReferenceData();
    
    // Check if we should open the new RFC form (passed from dashboard)
    if (location.state?.openNew) {
      navigate('/rfcs/new');
    }
  }, []);

  const handleDecision = async (statusCode) => {
    if (!selectedRfc || !selectedType) {
      alert('Veuillez sélectionner le type de la demande.');
      return;
    }
    
    if (!analysis.trim()) {
      alert('Veuillez saisir votre analyse technique.');
      return;
    }

    const targetStatus = statuses.find(s => s.code_statut === statusCode);
    if (!targetStatus) return alert(`Statut ${statusCode} introuvable.`);

    if (statusCode === 'APPROUVEE') {
      if (!selectedCM) return alert('Sélectionnez un Change Manager pour approuver.');
      if (!selectedEnv) return alert('Sélectionnez un Environnement cible pour approuver.');
    }

    setSubmitting(true);
    try {
      const res = await api.patch(`/rfc/${selectedRfc.id_rfc}/status`, {
        id_statut: targetStatus.id_statut,
        id_type: selectedType,
        id_change_manager: selectedCM || undefined,
        id_env: selectedEnv || undefined,
        commentaire: analysis
      });

      if (res.success) {
        setShowProcess(false);
        setSelectedRfc(null);
        setSelectedType('');
        setSelectedCM('');
        setSelectedEnv('');
        setAnalysis('');
        fetchRfcs();
      }
    } catch (error) {
      console.error('Decision Error:', error);
      alert('Erreur lors du traitement de la demande.');
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = rfcs.filter(r => {
    const q = search.toLowerCase();
    const matchSearch = !q ||
      r.titre_rfc?.toLowerCase().includes(q) ||
      r.code_rfc?.toLowerCase().includes(q) ||
      `${r.demandeur?.nom_user} ${r.demandeur?.prenom_user}`.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.statut?.code_statut === filterStatus;
    return matchSearch && matchStatus;
  });

  const kpis = {
    total: rfcs.length,
    pending: rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length,
    urgent: rfcs.filter(r => r.typeRfc?.type === 'URGENT').length,
    approved: rfcs.filter(r => r.statut?.code_statut === 'APPROUVEE').length,
  };

  return (
    <div className="rfc-mgr-page">
      <div className="rfc-mgr-header">
        <div>
          <h1><FiList /> Analyse et Évaluation des RFC</h1>
          <p>Évaluation technique, classification et transition vers la planification.</p>
        </div>
        <div className="header-date-badge">
          <FiCalendar />
          {new Date().toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' })}
        </div>
      </div>

      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <KpiCard label="Total RFC" value={kpis.total} icon={<FiFileText />} color="blue" />
        <KpiCard label="En Attente" value={kpis.pending} icon={<FiClock />} color="purple" sub="Vérification ITIL" />
        <KpiCard label="Urgentes" value={kpis.urgent} icon={<FiZap />} color="amber" />
        <KpiCard label="Approuvées" value={kpis.approved} icon={<FiCheckCircle />} color="green" />
      </div>

      <div className="rfc-mgr-toolbar">
        <div className="search-wrapper">
          <FiSearch className="search-ico" />
          <input
            type="text"
            placeholder="Filtrer par titre, ID ou demandeur..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="toolbar-filters">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="premium-select">
            <option value="">Tous les statuts</option>
            <option value="SOUMIS">📬 Nouvelles (Soumises)</option>
            <option value="EVALUEE">⚙️ Évaluées</option>
            <option value="APPROUVEE">✅ Approuvées</option>
            <option value="REJETEE">❌ Rejetées</option>
          </select>
          <button className="refresh-btn-premium" onClick={fetchRfcs} title="Actualiser">
            <FiRefreshCw />
          </button>
          <button className="act-btn-new-premium" onClick={() => navigate('/rfcs/new')}>
            <FiPlus /> Nouvelle RFC
          </button>
        </div>
      </div>

      <div className="premium-glass-card table-card-premium">
        {loading ? (
          <div className="table-loading">Chargement du flux...</div>
        ) : filtered.length === 0 ? (
          <div className="table-empty">
            <FiAlertCircle size={40} />
            <p>Aucune demande trouvée.</p>
          </div>
        ) : (
          <table className="rfc-table">
            <thead>
              <tr>
                <th>Code RFC</th>
                <th>Titre</th>
                <th>Demandeur</th>
                <th>Type</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(rfc => (
                  <tr 
                  key={rfc.id_rfc} 
                  onClick={() => { 
                    setSelectedRfc(rfc); 
                    setSelectedType(rfc.typeRfc?.id_type || '');
                    setShowProcess(true); 
                  }} 
                  className={`eval-row ${selectedRfc?.id_rfc === rfc.id_rfc ? 'selected-active' : ''}`}
                >
                  <td style={{ fontWeight: '700', color: '#1e40af' }}>#{rfc.code_rfc || rfc.id_rfc?.slice(0,8)}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{rfc.titre_rfc}</div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rfc.typeRfc?.type}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</div>
                    <div style={{ fontSize: '0.7rem', color: '#adafb5' }}>{rfc.demandeur?.direction?.nom_direction || 'Service Interne'}</div>
                  </td>
                  <td>
                    <span className={`type-badge type-${rfc.typeRfc?.type?.toLowerCase()}`}>
                        {rfc.typeRfc?.type || '—'}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${getStatusClass(rfc.statut?.code_statut)}`}>
                      {rfc.statut?.libelle}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                    {new Date(rfc.date_creation).toLocaleDateString('fr-FR')}
                  </td>
                  <td>
                    <div className="actions-cell" style={{ display: 'flex', gap: '8px' }}>
                      <button 
                        className="act-btn act-view" 
                        title="Consulter"
                        onClick={(e) => { e.stopPropagation(); navigate(`/rfcs/${rfc.id_rfc}`); }}
                      >
                        <FiEye />
                      </button>
                      {rfc.statut?.code_statut === 'SOUMIS' && (
                        <button 
                          className="act-btn act-eval" 
                          title="Vérifier / Évaluer"
                          style={{ background: '#f59e0b', color: 'white' }}
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedRfc(rfc); 
                            setSelectedType(rfc.typeRfc?.id_type || '');
                            setShowProcess(true); 
                          }} 
                        >
                          <FiActivity />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showProcess && selectedRfc && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 8999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowProcess(false)}>
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
            {/* Header du panneau Premium */}
            <div style={{ background: 'linear-gradient(135deg, #1e40af, #3b82f6)', color: 'white', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <FiActivity size={24} opacity={0.9} />
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700' }}>Évaluation & Traitement</h2>
                  <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>RFC #{selectedRfc.code_rfc || selectedRfc.id_rfc?.slice(0,8)} — {selectedRfc.titre_rfc}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowProcess(false)} 
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', padding: '8px', borderRadius: '50%', display: 'flex', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                <FiX size={20} />
              </button>
            </div>

            <div className="rfc-modal-body" style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                 <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiInfo /> Détails de la Demande
                 </h3>
                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Titre</label>
                        <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{selectedRfc.titre_rfc}</div>
                    </div>
                    <div>
                        <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Demandeur</label>
                        <div style={{ fontSize: '0.9rem' }}>{selectedRfc.demandeur?.prenom_user} {selectedRfc.demandeur?.nom_user}</div>
                    </div>
                 </div>
                 <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Description</label>
                    <div style={{ fontSize: '0.85rem', color: '#475569', whiteSpace: 'pre-wrap' }}>{selectedRfc.description}</div>
                 </div>
                 {selectedRfc.justification && (
                   <div>
                      <label style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Justification</label>
                      <div style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic' }}>{selectedRfc.justification}</div>
                   </div>
                 )}
              </div>

              <div className="decision-form">
                 <h3 style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FiActivity /> Analyse et Décision
                 </h3>
                 
                 {/* Checklist Intégrée */}
                 <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '1.5rem', padding: '12px', background: '#f0f9ff', borderRadius: '10px', border: '1px border-blue-100' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: '800', color: '#0c4a6e', textTransform: 'uppercase', marginBottom: '4px' }}>Validation Critères Minimaux</div>
                    {[
                      { label: "Description et titre explicites", checked: true },
                      { label: "Justification métier valide", checked: true },
                      { label: "Impact et urgence évalués", checked: false },
                    ].map((check, idx) => (
                      <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem', cursor: 'pointer', color: '#334155' }}>
                        <input type="checkbox" defaultChecked={check.checked} style={{ width: '16px', height: '16px' }} /> {check.label}
                      </label>
                    ))}
                 </div>

                 <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.25rem' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.8rem', color: '#475569' }}>Change Manager <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={selectedCM} onChange={e => setSelectedCM(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                        <option value="">-- Assigner --</option>
                        {changeManagers.map(cm => <option key={cm.id_user} value={cm.id_user}>{cm.prenom_user} {cm.nom_user}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.8rem', color: '#475569' }}>Environnement <span style={{ color: '#ef4444' }}>*</span></label>
                      <select value={selectedEnv} onChange={e => setSelectedEnv(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                        <option value="">-- Cibler --</option>
                        {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
                      </select>
                    </div>
                 </div>

                 <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontWeight: '700', marginBottom: '6px', fontSize: '0.8rem', color: '#475569' }}>Type RFC / Workflow <span style={{ color: '#ef4444' }}>*</span></label>
                    <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}>
                      <option value="">-- Sélectionner le type --</option>
                      {rfcTypes.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                    </select>
                 </div>

                 <div style={{ marginTop: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                       <label style={{ display: 'block', fontWeight: '700', fontSize: '0.8rem', color: '#475569' }}>Analyse d'Impact <span style={{ color: '#ef4444' }}>*</span></label>
                       <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="button" onClick={() => setAnalysis(IMPACT_TEMPLATES.COMPLET)} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #3b82f6', background: 'transparent', color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}>Complet</button>
                          <button type="button" onClick={() => setAnalysis(IMPACT_TEMPLATES.MINEUR)} style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '6px', border: '1px solid #10b981', background: 'transparent', color: '#10b981', cursor: 'pointer', fontWeight: '600' }}>Mineur</button>
                       </div>
                    </div>
                    <textarea 
                      value={analysis}
                      onChange={e => setAnalysis(e.target.value)}
                      placeholder="Commentaires d'impact technique et fonctionnel..."
                      style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', minHeight: '120px', resize: 'none' }}
                    />
                 </div>
              </div>
            </div>

            {/* Footer de décision */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'white', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end', flexShrink: 0 }}>
                <button 
                  onClick={(e) => { e.stopPropagation(); navigate('/rfcs/new', { state: { edit: true, rfcData: selectedRfc } }); }}
                  disabled={submitting}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#64748b', background: 'white', cursor: 'pointer', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <FiEdit2 size={16} /> Éditer
                </button>
                <button 
                  onClick={() => handleDecision('REJETEE')}
                  disabled={submitting || !selectedType || !analysis.trim()}
                  style={{ padding: '10px 20px', borderRadius: '8px', border: 'none', background: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', filter: submitting ? 'opacity(0.7)' : 'none' }}
                >
                  <FiXCircle size={18} /> {submitting ? 'Traitement...' : 'Rejeter'}
                </button>
                <button 
                  onClick={() => handleDecision('APPROUVEE')}
                  disabled={submitting || !selectedType || !selectedCM || !selectedEnv || !analysis.trim()}
                  style={{ padding: '10px 24px', borderRadius: '8px', border: 'none', background: '#10b981', color: 'white', cursor: 'pointer', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px', filter: (submitting || !selectedCM || !selectedEnv) ? 'opacity(0.7)' : 'none' }}
                >
                  <FiCheckCircle size={18} /> {submitting ? 'Traitement...' : 'Approuver'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RfcMonitoring;
