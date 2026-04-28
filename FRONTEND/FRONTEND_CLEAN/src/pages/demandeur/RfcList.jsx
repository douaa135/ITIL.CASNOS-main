import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  FiPlus, FiSearch, FiFileText, FiCheckCircle,
  FiClock, FiXCircle, FiEye, FiEdit2, FiTrash2,
  FiUser, FiFilter, FiRefreshCw, FiAlertCircle,
  FiActivity, FiInbox
} from 'react-icons/fi';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import api from '../../api/axiosClient';
import './demandeur.css';

// ─── Dummy data reflétant le diagramme de classe ─────────────────────────────
const MY_RFCS = [
  {
    id_rfc: 'RFC-2026-045',
    titre: 'Mise à jour PostgreSQL 15 → PostgreSQL 16 sur serveur de production',
    type: 'NORMAL',
    impactEstime: 'MAJEUR',
    urgence: 'HAUTE',
    priorite: { niveau: 'P1', libelle: 'Haute' },
    statut: { code: 'EN_ATTENTE_CAB', libelle: 'Attente CAB' },
    date_creation: '2026-04-01',
    date_souhaitee: '2026-04-20',
    nb_pieces: 3,
    nb_commentaires: 5,
    score_risque: 12,
  },
  {
    id_rfc: 'RFC-2026-046',
    titre: 'Patch critique CVE-2026-1234 sur pare-feu DMZ-PALO01',
    type: 'URGENT',
    impactEstime: 'CRITIQUE',
    urgence: 'CRITIQUE',
    priorite: { niveau: 'P0', libelle: 'Critique' },
    statut: { code: 'APPROUVE', libelle: 'Approuvé' },
    date_creation: '2026-04-05',
    date_souhaitee: '2026-04-10',
    nb_pieces: 1,
    nb_commentaires: 2,
    score_risque: 20,
  },
  {
    id_rfc: 'RFC-2026-044',
    titre: 'Ajout champ numéro matricule dans API profil utilisateur',
    type: 'STANDARD',
    impactEstime: 'MINEUR',
    urgence: 'FAIBLE',
    priorite: { niveau: 'P3', libelle: 'Basse' },
    statut: { code: 'EN_COURS_IMPLEMENTATION', libelle: 'En cours' },
    date_creation: '2026-03-28',
    date_souhaitee: '2026-04-15',
    nb_pieces: 2,
    nb_commentaires: 8,
    score_risque: 4,
  },
  {
    id_rfc: 'RFC-2026-040',
    titre: 'Migration serveur mail Exchange 2016 vers Exchange 2019',
    type: 'NORMAL',
    impactEstime: 'MAJEUR',
    urgence: 'NORMALE',
    priorite: { niveau: 'P2', libelle: 'Moyenne' },
    statut: { code: 'CLOTURE', libelle: 'Clôturé' },
    date_creation: '2026-03-10',
    date_souhaitee: '2026-03-25',
    nb_pieces: 5,
    nb_commentaires: 11,
    score_risque: 9,
  },
  {
    id_rfc: 'RFC-2026-047',
    titre: 'Déploiement module archivage des dossiers médicaux numérisés',
    type: 'NORMAL',
    impactEstime: 'MODERE',
    urgence: 'MOYENNE',
    priorite: { niveau: 'P2', libelle: 'Moyenne' },
    statut: { code: 'REJETE', libelle: 'Rejeté' },
    date_creation: '2026-04-07',
    date_souhaitee: '2026-04-30',
    nb_pieces: 0,
    nb_commentaires: 3,
    score_risque: 6,
  },
  {
    id_rfc: 'RFC-2026-048',
    titre: 'Activation HTTPS/TLS 1.3 sur portail intranet RH CASNOS',
    type: 'STANDARD',
    impactEstime: 'MODERE',
    urgence: 'NORMALE',
    priorite: { niveau: 'P2', libelle: 'Moyenne' },
    statut: { code: 'NOUVEAU', libelle: 'Nouveau' },
    date_creation: '2026-04-09',
    date_souhaitee: '2026-04-25',
    nb_pieces: 1,
    nb_commentaires: 0,
    score_risque: 6,
  },
];

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
    case 'active':   return rfcs.filter(r => ['BROUILLON','SOUMIS','EVALUEE'].includes(r.statut.code));
    case 'approved': return rfcs.filter(r => r.statut.code === 'APPROUVEE');
    case 'rejected': return rfcs.filter(r => r.statut.code === 'REJETEE');
    case 'closed':   return rfcs.filter(r => r.statut.code === 'CLOTUREE');
    default:         return rfcs;
  }
};

// ─── Main Component ───────────────────────────────────────────────────────────

// ─── RfcDetailModal ──────────────────────────────────────────────────────────
const RfcDetailModal = ({ rfcId, onClose }) => {
  const [rfc, setRfc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const fetchDetail = async () => {
    try {
      const res = await api.get(`/rfc/${rfcId}`);
      if (res.success) setRfc(res.data.rfc);
    } catch (err) {
      console.error('Modal detail fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (rfcId) fetchDetail();
  }, [rfcId]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSending(true);
    try {
      const res = await api.post(`/rfc/${rfc.id_rfc}/comments`, { contenu: comment });
      if (res.success) {
        setComment('');
        fetchDetail(); // Refresh to show new comment
      }
    } catch (err) {
      console.error('Add comment error:', err);
      alert('Erreur lors de l\'envoi du message.');
    } finally {
      setSending(false);
    }
  };

  if (!rfcId) return null;

  return (
    <div className="modal-overlay-premium" onClick={onClose}>
      <div className="modal-content-premium" onClick={e => e.stopPropagation()}>
        <div className="modal-header-premium">
          <h3><FiFileText color="var(--primary-color)" /> Détails de la RFC</h3>
          <button className="modal-close-btn" onClick={onClose}><FiX /></button>
        </div>
        
        <div className="modal-body-premium">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
              <span className="spinner" /> Chargement des détails...
            </div>
          ) : rfc ? (
            <>
              <div className="modal-section">
                <div className="modal-section-title"><FiInfo /> Informations Générales</div>
                <div className="info-grid-premium">
                  <div className="info-item-premium">
                    <span className="info-label-premium">ID RFC</span>
                    <span className="info-value-premium" style={{ color: 'var(--primary-color)', fontWeight: 800 }}>{rfc.code_rfc}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Statut Actuel</span>
                    <Badge status={STATUS_CONFIG[rfc.statut?.code_statut]?.badge || 'default'}>
                      {rfc.statut?.libelle || 'Inconnu'}
                    </Badge>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Urgence</span>
                    <span className="info-value-premium">{rfc.urgence ? 'HAUTE' : 'NORMALE'}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Priorité</span>
                    <span className="info-value-premium">{rfc.priorite?.libelle || 'Moyenne'}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Date de Création</span>
                    <span className="info-value-premium">{new Date(rfc.date_creation).toLocaleDateString('fr-FR')}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Date Souhaitée</span>
                    <span className="info-value-premium">{rfc.date_souhaitee ? new Date(rfc.date_souhaitee).toLocaleDateString('fr-FR') : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-title"><FiTarget /> Contenu de la Demande</div>
                <div className="description-block-premium">
                  <span className="info-label-premium">Titre</span>
                  <p className="info-value-premium" style={{ marginTop: '0.25rem', fontSize: '1.05rem' }}>{rfc.titre_rfc}</p>
                </div>
                <div className="description-block-premium">
                  <span className="info-label-premium">Description</span>
                  <p className="description-text-premium">{rfc.description}</p>
                </div>
                <div className="description-block-premium">
                  <span className="info-label-premium">Justification</span>
                  <p className="description-text-premium">{rfc.justification}</p>
                </div>
              </div>

              <div className="modal-section">
                <div className="modal-section-title"><FiLayers /> Configuration & Impact</div>
                <div className="info-grid-premium">
                  <div className="info-item-premium">
                    <span className="info-label-premium">Impact Estimé</span>
                    <span className="info-value-premium">{rfc.impacte_estimee || 'MINEUR'}</span>
                  </div>
                  <div className="info-item-premium">
                    <span className="info-label-premium">Type de Changement</span>
                    <span className="info-value-premium">{rfc.typeRfc?.type || 'NORMAL'}</span>
                  </div>
                </div>
              </div>

              {/* ─── Commentaires & Feedback ─── */}
              <div className="modal-section">
                <div className="modal-section-title"><FiMessageSquare /> Échanges & Feedback</div>
                
                <div className="comments-list-premium" style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {rfc.commentaires?.length > 0 ? rfc.commentaires.map(c => (
                    <div key={c.id_commentaire} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary-color)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
                        {c.auteur?.prenom_user?.[0]}{c.auteur?.nom_user?.[0]}
                      </div>
                      <div style={{ flex: 1, background: '#f1f5f9', padding: '0.75rem', borderRadius: '0 12px 12px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#1e293b' }}>{c.auteur?.prenom_user} {c.auteur?.nom_user}</span>
                          <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{new Date(c.date_publication).toLocaleDateString('fr-FR')}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569' }}>{c.contenu}</p>
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>Aucun échange pour le moment.</div>
                  )}
                </div>

                <div className="comment-input-premium">
                  <label className="info-label-premium" style={{ marginBottom: '0.5rem', display: 'block' }}>Modèles de Message :</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    {[
                      { label: 'Mise à jour préventive', text: 'Bonjour, nous procédons à une mise à jour préventive du système pour garantir sa stabilité optimale.' },
                      { label: 'Interruption de service', text: 'Bonjour, nous vous informons d\'une interruption de service momentanée suite à une anomalie critique.' },
                      { label: 'Service restauré', text: 'Bonjour, le service a été restauré avec succès. Merci de nous signaler toute instabilité résiduelle.' },
                      { label: 'Changement d\'urgence', text: 'Bonjour, un changement d\'urgence est actuellement en cours pour résoudre un incident majeur.' },
                      { label: 'Maintenance – ce soir', text: 'Bonjour, une maintenance planifiée aura lieu ce soir à partir de 18h. Le service sera indisponible pendant 1h.' },
                      { label: 'Nouvelle RFC – action requise', text: 'Bonjour, une nouvelle RFC a été soumise et nécessite votre attention immédiate.' }
                    ].map((m, i) => (
                      <button 
                        key={i} 
                        type="button" 
                        onClick={() => setComment(m.text)}
                        style={{ 
                          fontSize: '0.72rem', 
                          padding: '0.35rem 0.75rem', 
                          borderRadius: '8px', 
                          border: '1px solid #e2e8f0', 
                          background: '#f8fafc', 
                          cursor: 'pointer', 
                          color: '#475569',
                          fontWeight: '700',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onMouseEnter={e => { e.target.style.background = '#eff6ff'; e.target.style.borderColor = '#3b82f6'; e.target.style.color = '#3b82f6'; }}
                        onMouseLeave={e => { e.target.style.background = '#f8fafc'; e.target.style.borderColor = '#e2e8f0'; e.target.style.color = '#475569'; }}
                      >
                        <FiRadio size={11} /> {m.label}
                      </button>
                    ))}
                  </div>
                  
                  <div style={{ position: 'relative' }}>
                    <textarea 
                      placeholder="Votre message..." 
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '12px', border: '1px solid #e2e8f0', outline: 'none', fontSize: '0.85rem', minHeight: '80px' }}
                    />
                    <button 
                      type="button"
                      disabled={!comment.trim() || sending}
                      onClick={handleAddComment}
                      style={{ position: 'absolute', right: '10px', bottom: '10px', background: 'var(--primary-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '0.4rem 0.8rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <FiSend size={12} /> {sending ? '...' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#ef4444' }}>
              Erreur lors du chargement des détails.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRfc, setSelectedRfc] = useState(null);

  const fetchMyRfcs = async () => {
    if (!user?.id_user) return;
    try {
      setLoading(true);
      const data = await api.get(`/rfc?id_user=${user.id_user}`);
      if (data.success && data.data?.rfcs) {
        const mapped = data.data.rfcs.map(r => ({
          id_rfc:         r.code_rfc || r.id_rfc,
          db_id:          r.id_rfc,
          titre:          r.titre_rfc || 'Sans titre',
          impactEstime: r.impacte_estimee || 'MINEUR',
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
        }));
        setLocalRfcs(mapped);
      } else {
        setLocalRfcs([]);
      }
    } catch (err) {
      console.error('Erreur chargement RFC:', err);
      setLocalRfcs([]);
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
    encours:    localRfcs.filter(r => ['BROUILLON','SOUMIS','EVALUEE'].includes(r.statut.code)).length,
    approuvees: localRfcs.filter(r => r.statut.code === 'APPROUVEE').length,
    rejetees:   localRfcs.filter(r => r.statut.code === 'REJETEE').length,
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm("Êtes-vous sûr de vouloir supprimer cette demande ? Cette action est irréversible.")) {
      setLocalRfcs(prev => prev.filter(r => r.id_rfc !== id));
    }
  };

  return (
    <div className="mes-rfcs-page">
      {/* Success toast */}
      {toast && (
        <div className="success-toast">
          <div className="success-toast-icon"><FiCheckCircle /></div>
          <div>
            <p>RFC soumise avec succès !</p>
            <p style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--status-success-text)', opacity: 0.85 }}>
              Votre demande a été transmise au Change Manager. Vous serez notifié à chaque changement de statut.
            </p>
          </div>
        </div>
      )}

      <div className="rfcs-hero" style={{ padding: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div className="hero-content">
          <div className="hero-badge"><FiUser size={11} /> Espace Demandeur</div>
          <h2 style={{ color: 'white', fontSize: '1.6rem', margin: '0.5rem 0 0.5rem 0', fontWeight: 700 }}>Vue d'ensemble</h2>
          <p style={{ color: 'rgba(255,255,255,0.8)', margin: 0 }}>Consultez l'historique et l'avancement de vos demandes en temps réel.</p>
        </div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => navigate('/rfcs/new', { state: { edit: false, rfcData: null } })}
            className="btn-create-premium"
            style={{ background: 'white', color: '#1e40af' }}
          >
            <FiPlus /> Nouveau RFC
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { key: 'all',      label: 'Toutes',     value: kpis.total,     color: '#3b82f6', bg: '#eff6ff', icon: <FiInbox /> },
          { key: 'active',   label: 'En cours',   value: kpis.encours,   color: '#f59e0b', bg: '#fff7ed', icon: <FiClock /> },
          { key: 'approved', label: 'Approuvées', value: kpis.approuvees, color: '#10b981', bg: '#f0fdf4', icon: <FiCheckCircle /> },
          { key: 'rejected', label: 'Rejetées',   value: kpis.rejetees,   color: '#ef4444', bg: '#fef2f2', icon: <FiXCircle /> },
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
          >
            <FiRefreshCw />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="rfc-table-card">
        {rfcs.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon"><FiInbox /></div>
            <h3>Aucune RFC trouvée</h3>
            <p>Aucune demande ne correspond à vos critères de recherche.</p>
            <Button variant="primary" icon={<FiPlus />} onClick={() => navigate('/rfcs/new', { state: { edit: false, rfcData: null } })}>
              Créer ma première RFC
            </Button>
          </div>
        ) : (
          <table className="rfc-table">
            <thead>
              <tr>
                <th>ID RFC</th>
                <th>Titre</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {rfcs.map(rfc => {
                const sc = STATUS_CONFIG[rfc.statut.code] || { badge: 'default', label: rfc.statut.libelle, progress: 0 };
                return (
                  <tr key={rfc.id_rfc} onClick={() => { setSelectedRfc(rfc.db_id); setShowDetail(true); }}>
                    <td>
                      <span className="rfc-id">{rfc.id_rfc}</span>
                    </td>
                    <td>
                      <div className="rfc-title-cell">
                        <span className="rfc-title-text">{rfc.titre}</span>
                        <span className="rfc-title-meta">
                          {rfc.fichiers && rfc.fichiers.length > 0
                            ? rfc.fichiers.map((f, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginRight: '0.5rem', background: 'var(--border-color)', borderRadius: '4px', padding: '1px 6px', fontSize: '0.75rem' }}>
                                  📎 {f.name}
                                </span>
                              ))
                            : <span>📎 {rfc.nb_pieces} pièce(s)</span>
                          }
                          &nbsp;💬 {rfc.nb_commentaires} &nbsp;· Date souhaitée : {rfc.date_souhaitee}
                        </span>
                      </div>
                    </td>
                    <td>
                      <Badge status={sc.badge}>{sc.label}</Badge>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        {new Date(rfc.date_creation).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      <div className="table-actions">
                        {rfc.statut.code === 'BROUILLON' && (
                          <button
                            className="action-icon-btn"
                            title="Modifier"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/rfcs/new', { state: { edit: true, rfcData: rfc } });
                            }}
                          >
                            <FiEdit2 />
                          </button>
                        )}
                        {rfc.statut.code === 'BROUILLON' && (
                          <button 
                            className="action-icon-btn danger" 
                            title="Supprimer la demande"
                            onClick={(e) => handleDelete(rfc.id_rfc, e)}
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
        )}
      </div>

      {toast && (
        <div className="toast-success">
          <FiCheckCircle /> Votre demande a été enregistrée avec succès !
        </div>
      )}

      {showDetail && (
        <RfcDetailModal 
          rfcId={selectedRfc} 
          onClose={() => { setShowDetail(false); setSelectedRfc(null); }} 
        />
      )}
    </div>
  );
};

export default MesRfcs;
