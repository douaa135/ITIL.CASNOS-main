import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  FiSearch, FiRefreshCw, FiFilter,
  FiEye, FiActivity, FiClock, FiFileText,
  FiZap, FiCalendar, FiList, FiAlertCircle,
  FiCheckCircle, FiXCircle, FiPlus, FiArrowRight, FiInfo, FiEdit2, FiX, FiCheck
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import '../changemanager/RfcManagement.css'; 
import '../admin/AdminUnified.css';
import RfcProcessingModal from './components/RfcProcessingModal';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import { RFC_TRANSITIONS, RFC_STATUS_VARIANT } from '../../utils/constants';

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
  const [filterUrgent, setFilterUrgent] = useState(false);
  
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
  const [priorites, setPriorites] = useState([]);

  // Selections for Approval
  const [selectedCM, setSelectedCM] = useState('');
  const [selectedEnv, setSelectedEnv] = useState('');
  const [selectedPrio, setSelectedPrio] = useState('');

  const fetchRfcs = async () => {
    setLoading(true);
    try {
      const res = await api.get('/rfc?limit=1000');
      const data = res?.data || res;
      const list = Array.isArray(data?.rfcs) ? data.rfcs : 
                  Array.isArray(data) ? data : 
                  Array.isArray(res?.rfcs) ? res.rfcs : [];
      setRfcs(list);
    } catch (e) {
      console.error('Monitoring Fetch Error:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchReferenceData = async () => {
    try {
      const results = await Promise.allSettled([
        api.get('/statuts?contexte=RFC'),
        api.get('/users?limit=1000'),
        api.get('/environnements'),
        api.get('/types-rfc'),
        api.get('/priorites')
      ]);
      
      const extractRef = (res, key) => {
        const d = res?.data || res;
        return Array.isArray(d?.[key]) ? d[key] : 
               Array.isArray(d) ? d : 
               Array.isArray(res?.[key]) ? res[key] : [];
      };

      const stRes = results[0].status === 'fulfilled' ? results[0].value : null;
      const usersRes = results[1].status === 'fulfilled' ? results[1].value : null;
      const envRes = results[2].status === 'fulfilled' ? results[2].value : null;
      const typeRes = results[3].status === 'fulfilled' ? results[3].value : null;
      const prioRes = results[4].status === 'fulfilled' ? results[4].value : null;

      setStatuses(extractRef(stRes, 'statuts'));
      setEnvironnements(extractRef(envRes, 'environnements'));
      setRfcTypes(extractRef(typeRes, 'types'));
      setPriorites(extractRef(prioRes, 'priorites'));
      
      const allUsers = usersRes?.data?.data || usersRes?.data?.users || usersRes?.data || (Array.isArray(usersRes) ? usersRes : []);
      const hasRole = (u, name) => {
          if (!u) return false;
          const roleList = [];
          
          // Check various possible locations for roles (depending on API nesting)
          if (Array.isArray(u.roles)) {
              u.roles.forEach(r => {
                  if (typeof r === 'string') roleList.push(r.toUpperCase());
                  else if (r && r.nom_role) roleList.push(r.nom_role.toUpperCase());
              });
          }
          if (Array.isArray(u.userRoles)) {
              u.userRoles.forEach(ur => {
                  if (ur && ur.role && ur.role.nom_role) roleList.push(ur.role.nom_role.toUpperCase());
              });
          }
          if (u.role && u.role.nom_role) roleList.push(u.role.nom_role.toUpperCase());
          if (u.nom_role) roleList.push(u.nom_role.toUpperCase());
          
          const normalizedTarget = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
          return roleList.some(r => {
              if (!r) return false;
              const normalizedRole = r.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
              return normalizedRole.includes(normalizedTarget) || normalizedRole.includes('MANAGER');
          });
      };

      if (Array.isArray(allUsers)) {
          const cms = allUsers.filter(u => hasRole(u, 'CHANGE_MANAGER'));
          setChangeManagers(cms);
      }
    } catch (e) { console.error('Reference data error:', e); }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const kpi = params.get('kpi');
    if (kpi === 'URGENT') {
      setFilterUrgent(true);
    }
  }, [location.search]);

  useEffect(() => {
    fetchRfcs();
    fetchReferenceData();
    
    // Check if we should open the new RFC form (passed from dashboard)
    if (location.state?.openNew) {
      navigate('/servicedesk/rfcs/new');
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

    if (statusCode === 'APPROUVEE' || statusCode === 'PRE_APPROUVEE') {
      if (!selectedCM) return alert('Sélectionnez un Change Manager pour approuver.');
    }

    setSubmitting(true);
    try {
      const res = await api.patch(`/rfc/${selectedRfc.id_rfc}/status`, {
        id_statut: targetStatus.id_statut,
        id_type: selectedType,
        id_priorite: selectedPrio || undefined,
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
        setSelectedPrio('');
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
      `${r.demandeur?.nom_user || ''} ${r.demandeur?.prenom_user || ''}`.toLowerCase().includes(q);
    const matchStatus = !filterStatus || r.statut?.code_statut === filterStatus;
    
    const typeStr = (r.typeRfc?.type || r.type || '').toUpperCase();
    const isUrgent = typeStr.includes('URGENT') || r.urgence === true || r.urgence === 'true';
    const matchUrgent = !filterUrgent || isUrgent;

    return matchSearch && matchStatus && matchUrgent;
  });

  const isLate = (rfc) => {
    if (!rfc.date_souhaitee) return false;
    if (['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)) return false;
    return new Date(rfc.date_souhaitee) < new Date();
  };

  const kpis = {
    pending: rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length,
    urgent: rfcs.filter(r => {
      const typeStr = (r.typeRfc?.type || r.type || '').toUpperCase();
      return typeStr.includes('URGENT') || r.urgence === true || r.urgence === 'true';
    }).length,
    preevaluee: rfcs.filter(r => r.statut?.code_statut === 'PRE_APPROUVEE').length,
    late: rfcs.filter(r => isLate(r)).length,
  };

  return (
    <div className="rfc-mgr-page">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiList /></div>
          <div className="premium-header-text">
            <h1>Analyse et Évaluation des RFC</h1>
            <p>Évaluation technique, classification et transition vers la planification.</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-secondary-cab" onClick={fetchRfcs} style={{ marginRight: '0.75rem' }}>
            <FiRefreshCw /> Actualiser
          </button>
          <button className="btn-create-premium" onClick={() => navigate('/servicedesk/rfcs/new')}>
            <FiPlus /> Nouvelle RFC
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div onClick={() => { setFilterStatus('SOUMIS'); setFilterUrgent(false); }} style={{ cursor: 'pointer' }}>
          <KpiCard label="En Attente" value={kpis.pending} icon={<FiClock />} color="purple" sub="Vérification ITIL" />
        </div>
        <div onClick={() => { setFilterUrgent(!filterUrgent); setFilterStatus(''); }} style={{ cursor: 'pointer' }}>
          <KpiCard label="Urgentes" value={kpis.urgent} icon={<FiZap />} color="amber" border={filterUrgent ? '2px solid #f59e0b' : 'none'} />
        </div>
        <div onClick={() => { setFilterStatus('PRE_APPROUVEE'); setFilterUrgent(false); }} style={{ cursor: 'pointer' }}>
          <KpiCard label="Pré-aprouver" value={kpis.preevaluee} icon={<FiCheckCircle />} color="green" />
        </div>
        <div onClick={() => { setFilterStatus(''); setFilterUrgent(false); }} style={{ cursor: 'pointer' }}>
          <KpiCard label="En Retard" value={kpis.late} icon={<FiAlertCircle />} color="red" />
        </div>
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
            <option value="EVALUEE">⚙️ Evaluer</option>
            <option value="APPROUVEE">✅ Approuvées</option>
            <option value="REJETEE">❌ Rejetées</option>
          </select>
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
                    setSelectedPrio(rfc.priorite?.id_priorite || '');
                    setShowProcess(true); 
                  }} 
                  className={`eval-row ${selectedRfc?.id_rfc === rfc.id_rfc ? 'selected-active' : ''}`}
                >
                  <td style={{ fontWeight: '700', color: '#1e40af' }}>#{rfc.code_rfc || rfc.id_rfc?.slice(0,8)}</td>
                  <td>
                    <div style={{ fontWeight: '600' }}>{rfc.titre_rfc}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '0.85rem' }}>{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</div>
                    <div style={{ fontSize: '0.7rem', color: '#adafb5' }}>{rfc.demandeur?.direction?.nom_direction || 'Service Interne'}</div>
                  </td>
                  <td onClick={e => e.stopPropagation()}>
                    <InlineEditableBadge
                      currentValue={rfc.statut?.id_statut}
                      label={rfc.statut?.libelle || 'N/A'}
                      currentCode={rfc.statut?.code_statut}
                      options={statuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                      allowedCodes={RFC_TRANSITIONS[rfc.statut?.code_statut] || []}
                      getVariantByCode={(code) => RFC_STATUS_VARIANT[code] || 'default'}
                      onUpdate={async (newId) => {
                        try {
                          await rfcService.updateRfcStatus(rfc.id_rfc, newId, {});
                          fetchRfcs();
                        } catch (err) {
                          console.error('Erreur mise à jour statut', err);
                        }
                      }}
                      isEditable={!['CLOTUREE', 'REJETEE'].includes(rfc.statut?.code_statut)}
                      dropdownPosition="down"
                    />
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
                            setSelectedPrio(rfc.priorite?.id_priorite || '');
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

      <RfcProcessingModal 
        show={showProcess}
        rfc={selectedRfc}
        onClose={() => setShowProcess(false)}
        selectedType={selectedType}
        setSelectedType={setSelectedType}
        analysis={analysis}
        setAnalysis={setAnalysis}
        rfcTypes={rfcTypes}
        changeManagers={changeManagers}
        selectedCM={selectedCM}
        setSelectedCM={setSelectedCM}
        environnements={environnements}
        selectedEnv={selectedEnv}
        setSelectedEnv={setSelectedEnv}
        priorites={priorites}
        selectedPrio={selectedPrio}
        setSelectedPrio={setSelectedPrio}
        submitting={submitting}
        onDecision={handleDecision}
        onEdit={() => navigate('/servicedesk/rfcs/new', { state: { edit: true, rfcData: selectedRfc } })}
        templates={IMPACT_TEMPLATES}
      />
    </div>
  );
};

export default RfcMonitoring;
