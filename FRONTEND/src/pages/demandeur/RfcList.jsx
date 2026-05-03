import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiPlus, FiSearch, FiFileText, FiCheckCircle,
  FiClock, FiXCircle, FiEye, FiEdit2, FiTrash2,
  FiUser, FiFilter, FiRefreshCw, FiAlertCircle,
  FiActivity, FiInbox, FiSend, FiX, FiTarget, FiPaperclip, FiFile, FiMessageSquare
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import './demandeur.css';



// ─── Helpers ──────────────────────────────────────────────────────────────────
const STATUS_CONFIG = {
  BROUILLON:   { badge: 'warning', label: 'Soumise',        progress: 30 },
  SOUMIS:      { badge: 'warning', label: 'Soumise',        progress: 30 },
  EVALUEE:     { badge: 'warning', label: 'Évaluée',        progress: 55 },
  APPROUVEE:   { badge: 'success', label: 'Approuvée',     progress: 75 },
  CLOTUREE:    { badge: 'success', label: 'Clôturée',      progress: 100 },
  REJETEE:     { badge: 'danger',  label: 'Rejetée',       progress: 100 },
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
    case 'active':   return rfcs.filter(r => ['BROUILLON','SOUMIS','EVALUEE','EN_EVALUATION','ACCEPTEE_SD','A_COMPLETER','PRE_APPROUVEE','PLANIFIEE','EN_COURS'].includes(r.statut.code));
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
  const [loading, setLoading]     = useState(true);
  const [tab,     setTab]     = useState('all');
  const [search,  setSearch]  = useState('');
  const [statusF, setStatusF] = useState('');
  const [sortBy,  setSortBy]  = useState('date_desc');
  const [toast,   setToast]   = useState(location.state?.success || false);
  const [selectedRfc, setSelectedRfc] = useState(null);


  const fetchMyRfcs = async () => {
    if (!user?.id_user) return;
    try {
      setLoading(true);
      const rfcsData = await rfcService.getAllRfcs({ id_user: user.id_user });
      
      const mapped = rfcsData.map(r => ({
        id_rfc:         r.code_rfc || r.id_rfc,
        db_id:          r.id_rfc,
        titre:          r.titre_rfc || 'Sans titre',
        impactEstime:   r.impacte_estimee || 'MINEUR',
        urgence:        r.urgence ? 'HAUTE' : 'NORMALE',
        priorite: {
          niveau:   r.priorite?.code_priorite || 'P2',
          libelle:  r.priorite?.libelle || 'Moyenne'
        },
        statut: {
          code:     r.statut?.code_statut || 'NOUVEAU',
          libelle:  r.statut?.libelle || 'Nouveau'
        },
        date_creation:   r.date_creation || new Date().toISOString(),
        date_souhaitee:  r.date_souhaitee ? new Date(r.date_souhaitee).toLocaleDateString('fr-FR') : '-',
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



  // Chargement initial
  useEffect(() => { fetchMyRfcs(); }, [user?.id_user]);

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
    encours:    localRfcs.filter(r => ['BROUILLON','EVALUEE', 'EN_EVALUATION', 'ACCEPTEE_SD', 'A_COMPLETER', 'PRE_APPROUVEE', 'PLANIFIEE', 'EN_COURS'].includes(r.statut.code)).length,
    traitees:   localRfcs.filter(r => ['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(r.statut.code)).length,
  };


  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.")) return;
    
    try {
      const res = await api.delete(`/rfc/${id}`);
      if (res.success) {
        setToast({ msg: 'RFC supprimée avec succès.', type: 'success' });
        fetchMyRfcs();
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Erreur lors de la suppression de la RFC.');
    }
  };

  return (
    <div className="mes-rfcs-page">
      {/* Success toast */}
      {toast && (
        <div className="success-toast" style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 9999,
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white', padding: '1rem 1.5rem', borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
          display: 'flex', alignItems: 'center', gap: '1rem', animation: 'slideInUp 0.3s ease-out'
        }}>
          <div style={{ width: '40px', height: '40px', background: 'rgba(255,255,255,0.2)', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiCheckCircle size={24} />
          </div>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '1rem' }}>Opération réussie !</p>
            <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.9 }}>{typeof toast === 'object' ? toast.msg : 'Votre demande a été enregistrée avec succès.'}</p>
          </div>
        </div>
      )}

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
            onClick={() => navigate('/rfcs/new', { state: { edit: false, rfcData: null } })}
            className="btn-create-premium"
          >
            <FiPlus /> Nouveau RFC
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all',      label: 'Toutes',     value: kpis.total,     color: '#3b82f6', bg: '#eff6ff', icon: <FiInbox /> },
          { key: 'soumises', label: 'Soumises',   value: kpis.soumises,   color: '#f59e0b', bg: '#fff7ed', icon: <FiSend /> },
          { key: 'active',   label: 'En cours',   value: kpis.encours,   color: '#7c3aed', bg: '#f5f3ff', icon: <FiClock /> },
          { key: 'traitees', label: 'Traitées',   value: kpis.traitees,   color: '#10b981', bg: '#f0fdf4', icon: <FiCheckCircle /> },
        ].map(k => (
          <div 
            key={k.key}
            onClick={() => setTab(k.key)}
            style={{ 
              background: 'white', padding: '1.25rem', borderRadius: '1rem', 
              border: tab === k.key ? `2px solid ${k.color}` : '1px solid #e2e8f0',
              boxShadow: tab === k.key ? '0 10px 15px -3px rgba(0,0,0,0.1)' : '0 1px 3px 0 rgba(0,0,0,0.1)',
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s',
              transform: tab === k.key ? 'translateY(-3px)' : 'none'
            }}
          >
            <div style={{ 
              width: '40px', height: '40px', background: k.bg, borderRadius: '10px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              margin: '0 auto 0.75rem', color: k.color, fontSize: '1.2rem' 
            }}>
              {k.icon}
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e293b', lineHeight: 1 }}>{k.value}</div>
            <div style={{ margin: '0.35rem 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filter Toolbar — Now on its own line */}
      <div style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        background: 'white', padding: '0.75rem 1.25rem', marginBottom: '1.5rem',
        borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', 
        boxShadow: 'var(--shadow-sm)' 
      }}>
        <div className="rfc-search-wrap" style={{ width: '350px', border: 'none', background: '#f1f5f9', padding: '0.5rem 1rem' }}>
          <FiSearch style={{ color: 'var(--text-muted)' }} />
          <input
            placeholder="Rechercher par ID ou titre..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f1f5f9', padding: '0.25rem 0.75rem', borderRadius: '10px' }}>
            <FiFilter size={14} color="#64748b" />
            <select 
              className="filter-select" 
              value={statusF} 
              onChange={e => setStatusF(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '0.4rem 0.2rem', fontSize: '0.85rem', fontWeight: '600', outline: 'none', color: '#475569' }}
            >
              <option value="">Tous les statuts</option>
              {Object.keys(STATUS_CONFIG).map(k => (
                <option key={k} value={k}>{STATUS_CONFIG[k].label}</option>
              ))}
            </select>
          </div>

          <select 
            className="filter-select" 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            style={{ background: '#f1f5f9', border: 'none', padding: '0.65rem 1rem', borderRadius: '10px', fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}
          >
            <option value="date_desc">Plus récentes</option>
            <option value="date_asc">Plus anciennes</option>
          </select>

          <button
            className="action-icon-btn"
            title="Actualiser"
            onClick={() => { setSearch(''); setTab('all'); setSortBy('date_desc'); fetchMyRfcs(); }}
            style={{ background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a' }}
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div className="table-scroll-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', width: '25%' }}>RFC & Code</th>
                <th style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Priorité</th>
                <th style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Impact</th>
                <th style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Statut</th>
                <th style={{ padding: '1rem 0.75rem', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chargement...</td></tr>
              ) : rfcs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
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
                      background: index % 2 === 0 ? 'white' : '#fafbfc',
                      transition: 'background 0.2s'
                    }}
                    className="hover-row-sd"
                  >
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{rfc.titre}</div>
                      <div style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: '700' }}>#{rfc.id_rfc}</div>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '6px' }}>
                        {rfc.typeRfc?.type || rfc.type || 'NORMAL'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', fontWeight: '800', padding: '0.3rem 0.6rem', borderRadius: '6px',
                        background: rfc.priorite?.niveau === 'P5' ? '#fee2e2' : '#f0f9ff',
                        color: rfc.priorite?.niveau === 'P5' ? '#991b1b' : '#0369a1',
                        border: `1px solid ${rfc.priorite?.niveau === 'P5' ? '#fecaca' : '#bae6fd'}`
                      }}>
                        {rfc.priorite?.libelle || 'Moyenne'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>{rfc.impactEstime}</span>
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      <Badge status={sc.badge}>{sc.label}</Badge>
                    </td>
                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        {['BROUILLON', 'SOUMIS', 'A_COMPLETER', 'REJETEE'].includes(rfc.statut.code) && (
                          <button
                            className="action-icon-btn"
                            onClick={() => navigate('/rfcs/new', { state: { edit: true, rfcData: rfc } })}
                            style={{ color: '#3b82f6', background: '#eff6ff' }}
                          >
                            <FiEdit2 />
                          </button>
                        )}
                        {['BROUILLON', 'REJETEE'].includes(rfc.statut.code) && (
                          <button
                            className="action-icon-btn"
                            onClick={(e) => handleDelete(rfc.db_id, e)}
                            style={{ color: '#ef4444', background: '#fef2f2' }}
                          >
                            <FiTrash2 />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedRfc && (
        <div className="modal-backdrop-cab" onClick={() => setSelectedRfc(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="modal-box-cab" onClick={e => e.stopPropagation()} style={{ background: 'white', width: '100%', maxWidth: '800px', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
            <div className="modal-top-rfc-style" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fff' }}>
              <div className="rfc-style-icon-wrapper" style={{ width: '56px', height: '56px', borderRadius: '14px', background: '#eff6ff', color: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', border: '1px solid #bfdbfe' }}>
                <FiFileText />
              </div>
              <div className="rfc-style-header-text" style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Détails de la RFC</h2>
                <div className="rfc-style-subtitle" style={{ color: '#64748b', fontSize: '0.85rem' }}>ID: {selectedRfc.id_rfc} • Créé le {new Date(selectedRfc.date_creation).toLocaleDateString('fr-FR')}</div>
              </div>
              <button onClick={() => setSelectedRfc(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '0.5rem' }}><FiX size={24} /></button>
            </div>

            <div style={{ padding: '2rem', maxHeight: '70vh', overflowY: 'auto', background: '#f8fafc' }}>
              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', fontWeight: 700, color: '#1e293b', borderBottom: '2px solid #f1f5f9', paddingBottom: '0.5rem' }}>{selectedRfc.titre}</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Type de Changement</span>
                    <span className="info-value-premium">{selectedRfc.type}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Priorité</span>
                    <span className="info-value-premium">{selectedRfc.priorite?.libelle}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Urgence</span>
                    <span className="info-value-premium">{selectedRfc.urgence}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Date souhaitée</span>
                    <span className="info-value-premium">{selectedRfc.date_souhaitee}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                 <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.9rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Analyse d'Impact</h3>
                 <p style={{ margin: 0, color: '#475569', fontSize: '0.95rem', lineHeight: 1.6 }}>{selectedRfc.impactEstime || 'Aucune description fournie.'}</p>
              </div>
            </div>

            <div style={{ padding: '1.25rem 2rem', background: '#fff', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedRfc(null)} style={{ padding: '0.65rem 1.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer' }}>Fermer</button>
            </div>
          </div>
        </div>
      )}


    </div>
  );
};

export default MesRfcs;
