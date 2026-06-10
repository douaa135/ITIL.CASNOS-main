import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiPlus, FiSearch, FiFileText, FiCheckCircle,
  FiClock, FiXCircle, FiEye, FiEdit2, FiTrash2,
  FiUser, FiFilter, FiRefreshCw, FiAlertCircle,
  FiActivity, FiInbox, FiSend, FiX, FiTarget, FiPaperclip, FiFile, FiMessageSquare
} from 'react-icons/fi';
import InlineEditableBadge from '../../components/common/InlineEditableBadge';
import { RFC_TRANSITIONS, RFC_STATUS_VARIANT } from '../../utils/constants';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import './demandeur.css';
import '../admin/AdminChangementList.css'; // Pour réutiliser acl-table si possible
import RfcDetailModal from './components/RfcDetailModal';
import EnvironmentBadge from '../../components/common/EnvironmentBadge';
import PremiumToolbar from '../../components/common/PremiumToolbar';


/**
 * MesRfcs - Liste des demandes de changement (RFC) soumises par l'utilisateur connecté.
 * Permet de suivre l'avancement, de modifier les brouillons et de consulter les détails.
 */


// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  BROUILLON:      { badge: 'neutral',  label: 'Brouillon',       progress: 10 },
  SOUMIS:         { badge: 'warning',  label: 'Soumise',         progress: 25 },
  ACCEPTEE_SD:    { badge: 'info',     label: 'Acceptée (SD)',   progress: 35 },
  A_COMPLETER:    { badge: 'warning',  label: 'À Compléter',     progress: 30 },
  EN_EVALUATION:  { badge: 'info',     label: 'En Évaluation',   progress: 45 },
  EVALUEE:        { badge: 'info',     label: 'Evaluer',         progress: 55 },
  PRE_APPROUVEE:  { badge: 'info',     label: 'Pré-aprouver',   progress: 65 },
  EN_ATTENTE_CAB: { badge: 'warning',  label: 'Attente CAB',     progress: 70 },
  PLANIFIEE:      { badge: 'info',     label: 'Planifiée',       progress: 75 },
  EN_COURS:       { badge: 'primary',  label: 'En Cours',        progress: 80 },
  APPROUVEE:      { badge: 'success',  label: 'Approuvée',       progress: 90 },
  CLOTUREE:       { badge: 'success',  label: 'Clôturée',        progress: 100 },
  REJETEE:        { badge: 'danger',   label: 'Rejetée',         progress: 100 },
  ANNULEE:        { badge: 'danger',   label: 'Annulée',         progress: 100 },
};

const PROGRESS_COLORS = {
  info:    'var(--primary-color)',
  warning: 'var(--status-warning)',
  success: 'var(--status-success)',
  danger:  'var(--status-danger)',
};

const getRiskColor = (score) => {
  if (score <= 3)  return '#10b981';
  if (score <= 6)  return '#f59e0b';
  if (score <= 12) return '#f97316';
  return '#ef4444';
};

const TABS = [
  { key: 'all',      label: 'Toutes',          icon: <FiInbox /> },
  { key: 'active',   label: 'En cours',         icon: <FiActivity /> },
  { key: 'approved', label: 'Approuvées',       icon: <FiCheckCircle /> },
  { key: 'rejected', label: 'Rejetées',         icon: <FiXCircle /> },
  { key: 'closed',   label: 'Clôturées',        icon: <FiFileText /> },
];

const filterByTab = (rfcs, tab) => {
  switch (tab) {
    case 'active':   return rfcs.filter(r => ['BROUILLON','SOUMIS','EVALUEE','ACCEPTEE_SD','A_COMPLETER','PRE_APPROUVEE','PLANIFIEE','EN_COURS'].includes(r.statut.code));
    case 'approved': return rfcs.filter(r => r.statut.code === 'APPROUVEE');
    case 'rejected': return rfcs.filter(r => r.statut.code === 'REJETEE');
    case 'closed':   return rfcs.filter(r => r.statut.code === 'CLOTUREE');
    default:         return rfcs;
  }
};


// ─── Main Component ───────────────────────────────────────────────────────────

// ─── RfcDetailModal ──────────────────────────────────────────────────────────


const MesRfcs = () => {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();
  const [localRfcs, setLocalRfcs] = useState([]);
  const [deletedRfcIds, setDeletedRfcIds] = useState(
    () => JSON.parse(localStorage.getItem('deleted_rfcs') || '[]')
  );
  const [loading, setLoading]     = useState(true);
  const [tab,     setTab]     = useState('all');
  const [statuses, setStatuses] = useState([]);
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [typeF,   setTypeF]   = useState('');
  const [sortBy,  setSortBy]  = useState('date_desc');
  const [toast,   setToast]   = useState(location.state?.success ? { msg: location.state?.isEdit ? 'RFC mise à jour avec succès !' : 'RFC créée avec succès !', type: 'success' } : null);
  const [selectedRfc, setSelectedRfc] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [environments, setEnvironments] = useState([]);

  useEffect(() => {
    const fetchEnvs = async () => {
      try {
        const envs = await rfcService.getEnvironnements();
        setEnvironments(envs);
      } catch (err) { console.error('Envs error:', err); }
    };
    fetchEnvs();
  }, []);


  const fetchMyRfcs = async () => {
    if (!user?.id_user) return;
    try {
      setLoading(true);
      const { rfcs: rfcsData, stats: kpiData } = await rfcService.getDemandeurStats(user.id_user);
      
      const deletedIds = JSON.parse(localStorage.getItem('deleted_rfcs') || '[]');
      
      const mapped = rfcsData
        .filter(r => !deletedIds.includes(r.id_rfc))
        .map(r => ({
          ...r, // Conserver toutes les données brutes pour les utilitaires
          id_rfc:         r.code_rfc || r.id_rfc,
          db_id:          r.id_rfc,
          titre:          r.titre_rfc || 'Sans titre',
          description:    r.description || '',
          justification:  r.justification || '',
          impactEstime:   r.impacte_estimee || 'MINEUR',
          id_env:          r.id_env || r.id_environnement,
          urgence:        r.urgence ? 'HAUTE' : 'NORMALE',
          priorite: {
            niveau:   r.priorite?.code_priorite || 'P2',
            libelle:  r.priorite?.libelle || 'Moyenne'
          },
          statut: {
            code:     r.statut?.code_statut || 'NOUVEAU',
            libelle:  r.statut?.libelle || 'Nouveau',
            id_statut: r.statut?.id_statut
          },
          date_creation:   r.date_creation || new Date().toISOString(),
          date_souhaitee:  r.date_souhaitee ? new Date(r.date_souhaitee).toLocaleDateString('fr-FR') : '-',
          raw_date_souhaitee: r.date_souhaitee || '',
          nb_pieces:       r._count?.piecesJointes || 0,
          nb_commentaires: r._count?.commentaires || 0,
          score_risque:    r.evaluationRisque?.score_risque || 0,
          type:            r.typeRfc?.type || 'NORMAL',
        }));
      setLocalRfcs(mapped);
    } catch (err) {
      console.error('Erreur chargement RFC:', err);
      setLocalRfcs([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch possible status values for inline editing
  const fetchStatuses = async () => {
    try {
      const res = await api.get('/statuts?contexte=RFC');
      const data = res?.data || res;
      const list = Array.isArray(data?.statuts) ? data.statuts : Array.isArray(data) ? data : [];
      setStatuses(list);
    } catch (e) {
      console.error('Statuses fetch error:', e);
    }
  };



  // Chargement initial
  useEffect(() => { fetchMyRfcs(); fetchStatuses(); }, [user?.id_user]);

  // Re-fetch après création d'une RFC
  useEffect(() => {
    if (location.state?.success || location.state?.newRfc) {
      fetchMyRfcs();
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Auto-dismiss du toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(false), 5000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Filtering
  let rfcs = filterByTab(localRfcs, tab);
  if (search) rfcs = rfcs.filter(r =>
    r.titre.toLowerCase().includes(search.toLowerCase()) ||
    r.id_rfc.toLowerCase().includes(search.toLowerCase())
  );
  if (statusF) rfcs = rfcs.filter(r => r.statut.code === statusF);
  if (typeF) rfcs = rfcs.filter(r => (r.type || 'NORMAL').toUpperCase() === typeF.toUpperCase());
  rfcs = [...rfcs].sort((a, b) => {
    if (sortBy === 'date_desc') return new Date(b.date_creation) - new Date(a.date_creation);
    if (sortBy === 'date_asc')  return new Date(a.date_creation) - new Date(b.date_creation);
    if (sortBy === 'risque')    return b.score_risque - a.score_risque;
    return 0;
  });

  // KPIs
  const kpis = {
    total:      localRfcs.length,
    soumises:   localRfcs.filter(r => r.statut.code === 'SOUMIS').length,
    encours:    localRfcs.filter(r => ['BROUILLON','EVALUEE', 'ACCEPTEE_SD', 'A_COMPLETER', 'PRE_APPROUVEE', 'PLANIFIEE', 'EN_COURS'].includes(r.statut.code)).length,
    traitees:   localRfcs.filter(r => ['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(r.statut.code)).length,
  };


  const handleDelete = (id, e) => {
    e.stopPropagation();
    setConfirmDel({
      title: 'Supprimer la demande',
      message: 'Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.',
      id
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    try {
      await api.delete(`/rfc/${confirmDel.id}`);
      const updatedDeleted = [...deletedRfcIds, confirmDel.id];
      setDeletedRfcIds(updatedDeleted);
      localStorage.setItem('deleted_rfcs', JSON.stringify(updatedDeleted));
      setLocalRfcs(prev => prev.filter(r => r.db_id !== confirmDel.id));
      setToast({ msg: 'RFC supprimée avec succès.', type: 'success' });
    } catch (err) {
      console.error('Delete error:', err);
      setToast({ msg: 'Erreur lors de la suppression de la RFC.', type: 'error' });
    } finally {
      setConfirmDel(null);
    }
  };

  return (
    <div className="mes-rfcs-page">
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiUser /></div>
          <div className="premium-header-text">
            <h1>Vue d'ensemble</h1>
            <p>Consultez l'historique et l'avancement de vos demandes en temps réel.</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button 
            className="btn-create-premium"
            onClick={() => window.location.reload()}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', marginRight: '10px' }}
          >
            <FiRefreshCw /> Actualiser
          </button>
          <button 
            className="btn-create-premium"
            onClick={() => navigate('/rfcs/new', { state: { edit: false, rfcData: null } })}
          >
            <FiPlus /> Demander un RFC
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <PremiumToolbar 
        searchProps={{
            value: search,
            onChange: (e) => setSearch(e.target.value),
            placeholder: "Rechercher par code ou titre..."
        }}
        filters={[
            {
                value: statusF,
                onChange: (e) => setStatusF(e.target.value),
                placeholder: "Tous les statuts",
                options: [
                  { value: 'SOUMIS', label: 'Soumis' },
                  { value: 'EVALUEE', label: 'Evaluer' },
                  { value: 'PRE_APPROUVEE', label: 'Pré-aprouver' },
                  { value: 'APPROUVEE', label: 'Approuvée' },
                  { value: 'CLOTUREE', label: 'Clôturée' },
                  { value: 'REJETEE', label: 'Rejetée' }
                ]
            },
            {
                value: typeF,
                onChange: (e) => setTypeF(e.target.value),
                placeholder: "Tous les types",
                options: [
                  { value: 'NORMAL', label: 'Normal' },
                  { value: 'STANDARD', label: 'Standard' },
                  { value: 'URGENT', label: 'Urgent' }
                ]
            }
        ]}
        showReset={false}
      />

      {/* Table Section */}
      <div style={{ 
        background: '#ffffff', 
        borderRadius: '16px', 
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        marginTop: '-0.8rem'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '1000px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ 
                  position: 'sticky', left: 0, zIndex: 3, 
                  background: '#f8fafc', padding: '12px 16px', 
                  fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', 
                  letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', 
                  whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' 
                }}>
                  RFC & Code
                </th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left' }}>Priorité</th>
                <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left' }}>Statut</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '4rem' }}>
                    <div className="impl-loading" style={{ background: 'transparent', padding: 0 }}>
                      <FiRefreshCw className="spinning" /> Chargement de vos demandes...
                    </div>
                  </td>
                </tr>
              ) : rfcs.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
                    <FiInbox size={48} style={{ marginBottom: '1rem', opacity: 0.2 }} />
                    <p style={{ margin: 0, fontWeight: 600 }}>Aucune RFC trouvée</p>
                  </td>
                </tr>
              ) : rfcs.map((rfc, index) => {
                const sc = STATUS_CONFIG[rfc.statut.code] || { badge: 'default', label: rfc.statut.libelle };
                return (
                  <tr 
                    key={rfc.db_id} 
                    onClick={() => setSelectedRfc(rfc)}
                    style={{ 
                      cursor: 'pointer', 
                      borderBottom: '1px solid #f1f5f9', 
                      background: '#ffffff',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    <td style={{ 
                      position: 'sticky', left: 0, zIndex: 2, 
                      background: 'inherit', padding: '14px 16px',
                      borderRight: '1px solid #f1f5f9'
                    }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.82rem', marginBottom: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '250px' }}>{rfc.titre}</div>
                      <div style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: '700' }}>#{rfc.id_rfc}</div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {(() => {
                        const isHigh = rfc.priorite?.niveau === 'P5' || rfc.priorite?.niveau === 'P1';
                        return (
                          <span style={{ 
                            fontSize: '0.72rem', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                            background: isHigh ? '#fef2f2' : '#f0f9ff',
                            color: isHigh ? '#991b1b' : '#0369a1',
                            border: `1px solid ${isHigh ? '#fecaca' : '#bae6fd'}`
                          }}>
                            {rfc.priorite?.libelle || 'Moyenne'}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '14px 16px' }} onClick={(e) => e.stopPropagation()}>
                      <InlineEditableBadge
                          currentValue={rfc.statut?.id_statut}
                          label={sc.label}
                          currentCode={rfc.statut?.code}
                          options={statuses.map(s => ({ value: s.id_statut, label: s.libelle, code: s.code_statut }))}
                          allowedCodes={RFC_TRANSITIONS[rfc.statut?.code] || []}
                          getVariantByCode={(code) => RFC_STATUS_VARIANT[code] || 'default'}
                          onUpdate={async (newId) => {
                            try {
                              await rfcService.updateRfcStatus(rfc.db_id, newId, {});
                              fetchMyRfcs();
                            } catch (err) {
                              console.error('Erreur mise à jour statut', err);
                            }
                          }}
                          isEditable={!['CLOTUREE', 'REJETEE'].includes(rfc.statut?.code)}
                          dropdownPosition="down"
                        />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <RfcDetailModal 
        rfc={selectedRfc}
        environments={environments}
        onClose={() => setSelectedRfc(null)}
      />


      {confirmDel && (
        <ConfirmModal
          title={confirmDel.title}
          message={confirmDel.message}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
    </div>
  );
};

export default MesRfcs;
