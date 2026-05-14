import React, { useState, useEffect, useCallback } from 'react';
import {
  FiRadio, FiSend, FiUsers, FiPlus, FiX, FiInfo,
  FiSearch, FiFilter, FiTrash2, FiInbox, FiMail,
  FiClock, FiRefreshCw, FiChevronLeft, FiChevronRight,
  FiChevronsLeft, FiChevronsRight, FiCheckCircle
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import './BroadcastCenter.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';

const ITEMS_PER_PAGE = 10;

const ROLE_LABELS = {
  ADMIN: 'Admin', CHANGE_MANAGER: 'Change Manager',
  SERVICE_DESK: 'Service Desk', IMPLEMENTEUR: 'Implémenteur',
  DEMANDEUR: 'Demandeur', MEMBRE_CAB: 'Membre CAB', ADMIN_SYSTEME: 'Admin Système',
};

const TEMPLATES = [
  { objet: 'Mise à jour préventive',                msg: 'Une mise à jour préventive du système est planifiée. Merci de sauvegarder vos travaux en cours avant la fenêtre de maintenance.' },
  { objet: 'Interruption de service',               msg: "Une interruption de service est actuellement en cours. Nos équipes techniques travaillent activement à la résolution." },
  { objet: 'Service restauré',                      msg: 'Le service a été restauré avec succès. Vous pouvez reprendre votre activité normalement.' },
  { objet: "Changement d'urgence en cours",         msg: "Un changement d'urgence est en cours d'implémentation. Durée estimée : 30 minutes." },
  { objet: 'Maintenance planifiée – ce soir',       msg: 'Rappel : une maintenance est planifiée ce soir de 20h00 à 23h00.' },
  { objet: 'Nouvelle RFC soumise – action requise', msg: "Une nouvelle RFC a été soumise et nécessite votre validation dans les meilleurs délais." },
];

const selectStyle = {
  padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px',
  border: '1.5px solid #e2e8f0', fontSize: '0.875rem',
  background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', outline: 'none',
};

const thStyle = {
  padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.07em',
  color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap',
};

const tdStyle = {
  padding: '14px 16px', fontSize: '0.875rem',
  color: '#334155', verticalAlign: 'middle',
};

const btnPage = (disabled) => ({
  padding: '5px 10px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  background: disabled ? '#f8fafc' : 'white',
  color: disabled ? '#cbd5e1' : '#475569',
  cursor: disabled ? 'not-allowed' : 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s', fontWeight: '600', fontSize: '0.8rem',
});

// ── Avatar généré ──────────────────────────────────────────
const Avatar = ({ prenom = '', nom = '' }) => {
  const init = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  const colors = [
    { bg: '#dbeafe', color: '#1d4ed8' }, { bg: '#d1fae5', color: '#065f46' },
    { bg: '#fef3c7', color: '#92400e' }, { bg: '#ede9fe', color: '#5b21b6' },
    { bg: '#fce7f3', color: '#9d174d' }, { bg: '#e0f2fe', color: '#0369a1' },
  ];
  const palette = colors[(prenom.charCodeAt(0) || 0) % colors.length];
  return (
    <div style={{ width: 32, height: 32, borderRadius: '9px', flexShrink: 0, background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 700 }}>
      {init || '?'}
    </div>
  );
};

const BroadcastCenter = () => {
  const { user } = useAuth();
  const canSendBroadcast = user?.roles?.includes('ADMIN') || user?.roles?.includes('CHANGE_MANAGER');

  // ── Tabs ──
  const [activeTab, setActiveTab] = useState('reception');

  // ── État envoi (panel) ──
  const [users, setUsers]               = useState([]);
  const [message, setMessage]           = useState('');
  const [objet, setObjet]               = useState('');
  const [selectedUser, setSelectedUser] = useState('TOUS');
  const [sending, setSending]           = useState(false);
  const [showPanel, setShowPanel]       = useState(false);

  // ── Données ──
  const [receptionNotifs, setReceptionNotifs] = useState([]);
  const [receptionTotal, setReceptionTotal]   = useState(0);
  const [receptionLoading, setReceptionLoading] = useState(false);

  const [sentNotifs, setSentNotifs]     = useState([]);
  const [sentTotal, setSentTotal]       = useState(0);
  const [sentLoading, setSentLoading]   = useState(false);

  // ── Filtres réception ──
  const [filterRcvSearch, setFilterRcvSearch]   = useState('');
  const [filterRcvSender, setFilterRcvSender]   = useState('');
  const [filterRcvDate, setFilterRcvDate]       = useState('');
  const [filterRcvLue, setFilterRcvLue]         = useState('');

  // ── Filtres envoi ──
  const [filterSentSearch, setFilterSentSearch] = useState('');
  const [filterSentRecip, setFilterSentRecip]   = useState('');
  const [filterSentDate, setFilterSentDate]     = useState('');

  // ── KPI ──
  const [kpiFilter, setKpiFilter] = useState('');

  // ── Pagination ──
  const [currentPage, setCurrentPage] = useState(1);

  // ── Toast & Confirm & Recipients Modal ──
  const [toast, setToast]                   = useState(null);
  const [confirmDelete, setConfirmDelete]   = useState({ open: false, id: null });
  const [recipientsModal, setRecipientsModal] = useState({ open: false, list: [], objet: '' });

  const showToast = (msg, type = 'success') => setToast({ msg, type });

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    setCurrentPage(1);
    if (activeTab === 'reception') fetchReception();
    else fetchSent();
  }, [activeTab]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterRcvSearch, filterRcvSender, filterRcvDate, filterRcvLue, filterSentSearch, filterSentRecip, filterSentDate, kpiFilter]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users?limit=1000');
      const list = res?.data?.data ?? res?.data ?? [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (e) { console.error('fetchUsers error:', e); }
  };

  const fetchReception = useCallback(async () => {
    setReceptionLoading(true);
    try {
      const res = await api.get('/notifications/me', { params: { page: 1, limit: 200 } });
      const list = res?.notifications ?? res?.data?.notifications ?? res?.data ?? (Array.isArray(res) ? res : []);
      const arr = Array.isArray(list) ? list : [];
      setReceptionNotifs(arr);
      setReceptionTotal(arr.length);
    } catch (e) {
      console.error('fetchReception error:', e);
    } finally { setReceptionLoading(false); }
  }, []);

  const fetchSent = useCallback(async () => {
    setSentLoading(true);
    try {
      const res = await api.get('/notifications/me/sent', { params: { page: 1, limit: 200 } });
      const list =
        res?.data?.notifications ??
        res?.data?.data ??
        res?.notifications ??
        res?.data ??
        (Array.isArray(res) ? res : []);
      const arr = Array.isArray(list) ? list : [];
      setSentNotifs(arr);
      setSentTotal(arr.length);
    } catch (e) {
      console.error('fetchSent error:', e);
    } finally { setSentLoading(false); }
  }, []);

  // ── Filtrage réception ──────────────────────────────────
  const filteredReception = receptionNotifs.filter(n => {
    const sender = n.expediteur
      ? `${n.expediteur.prenom_user ?? ''} ${n.expediteur.nom_user ?? ''}`.toLowerCase()
      : '';
    const objetStr = (n.objet ?? '').toLowerCase();
    const matchSearch = !filterRcvSearch || objetStr.includes(filterRcvSearch.toLowerCase()) || sender.includes(filterRcvSearch.toLowerCase());
    const matchSender = !filterRcvSender || sender.includes(filterRcvSender.toLowerCase());
    const date = new Date(n.date_envoi ?? n.date);
    const matchDate = !filterRcvDate || date.toLocaleDateString('fr-CA') === filterRcvDate;
    const matchLue = !filterRcvLue
      ? true
      : filterRcvLue === 'lue' ? n.lue === true : n.lue === false;
    const matchKpi = !kpiFilter
      ? true
      : kpiFilter === 'non_lue' ? n.lue === false : kpiFilter === 'lue' ? n.lue === true : true;
    return matchSearch && matchSender && matchDate && matchLue && matchKpi;
  });

  // ── Filtrage envoi ──────────────────────────────────────
  const filteredSent = sentNotifs.filter(n => {
    const objetStr = (n.objet ?? '').toLowerCase();
    const recipients = Array.isArray(n.destinataires)
      ? n.destinataires.map(d => `${d.destinataire?.prenom_user ?? ''} ${d.destinataire?.nom_user ?? ''}`.toLowerCase()).join(' ')
      : '';
    const matchSearch = !filterSentSearch || objetStr.includes(filterSentSearch.toLowerCase());
    const matchRecip = !filterSentRecip || recipients.includes(filterSentRecip.toLowerCase());
    const date = new Date(n.date_envoi ?? n.date);
    const matchDate = !filterSentDate || date.toLocaleDateString('fr-CA') === filterSentDate;
    return matchSearch && matchRecip && matchDate;
  });

  // ── KPI ────────────────────────────────────────────────
  const kpiTotal   = receptionNotifs.length;
  const kpiNonLues = receptionNotifs.filter(n => !n.lue).length;
  const kpiLues    = receptionNotifs.filter(n => n.lue).length;
  const kpiSent    = sentNotifs.length;

  // ── Pagination ──────────────────────────────────────────
  const currentData = activeTab === 'reception' ? filteredReception : filteredSent;
  const totalPages  = Math.max(1, Math.ceil(currentData.length / ITEMS_PER_PAGE));
  const safePage    = Math.min(currentPage, totalPages);
  const paginated   = currentData.slice((safePage - 1) * ITEMS_PER_PAGE, safePage * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || Math.abs(i - safePage) <= 1) pages.push(i);
      else if (pages[pages.length - 1] !== '...') pages.push('...');
    }
    return pages;
  };

  const resolveTargetIds = () => {
    if (selectedUser === 'TOUS') return users.map(u => u.id_user);
    return [selectedUser];
  };
  const targetCount = resolveTargetIds().length;

  const handleDeleteNotif = async () => {
    const id = confirmDelete.id;
    try {
      await api.delete(`/notifications/${id}`);
      if (activeTab === 'reception') {
        setReceptionNotifs(prev => prev.filter(n => (n.id_notif ?? n.id) !== id));
      } else {
        setSentNotifs(prev => prev.filter(n => (n.id_notif ?? n.id) !== id));
      }
      showToast('Notification supprimée.', 'success');
    } catch (e) {
      showToast('Impossible de supprimer.', 'error');
    } finally {
      setConfirmDelete({ open: false, id: null });
    }
  };

  const handleSendBroadcast = async (e) => {
    e.preventDefault();
    if (!message.trim() || !objet.trim()) return;
    const targetIds = resolveTargetIds();
    if (targetIds.length === 0) { showToast('Aucun utilisateur trouvé.', 'error'); return; }

    setSending(true);
    try {
      await api.post('/notifications/broadcast', { message, objet, id_users: targetIds });
      showToast(`✅ ${targetIds.length} notification(s) envoyée(s) !`, 'success');
      setMessage(''); setObjet(''); setSelectedUser('TOUS');
      setShowPanel(false);
      fetchSent();
    } catch (error) {
      const detail = typeof error === 'string' ? error : error?.message ?? error?.error?.message ?? 'Erreur inconnue';
      showToast(`Erreur: ${typeof detail === 'string' ? detail : JSON.stringify(detail)}`, 'error');
    } finally { setSending(false); }
  };

  const hasRcvFilters  = filterRcvSearch || filterRcvSender || filterRcvDate || filterRcvLue;
  const hasSentFilters = filterSentSearch || filterSentRecip || filterSentDate;

  return (
    <div className="broadcaster-page">

      {/* ── HEADER ── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
            <FiRadio />
          </div>
          <div className="premium-header-text">
            <h1>Centre de Diffusion</h1>
            <p>{canSendBroadcast ? 'Gérez vos messages de diffusion et consultez les notifications reçues et envoyées' : 'Consultez les notifications et messages de diffusion reçus'}</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}
            onClick={() => { activeTab === 'reception' ? fetchReception() : fetchSent(); }}>
            <FiRefreshCw /> Actualiser
          </button>
          {canSendBroadcast && (
            <button className="btn-create-premium" onClick={() => setShowPanel(true)}>
              <FiPlus /> Nouvelle Diffusion
            </button>
          )}
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem', background: '#f1f5f9', padding: '0.5rem', borderRadius: '16px', width: 'fit-content' }}>
        <button
          onClick={() => setActiveTab('reception')}
          style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '12px', background: activeTab === 'reception' ? 'white' : 'transparent', color: activeTab === 'reception' ? '#7c3aed' : '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: activeTab === 'reception' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
        >
          <FiInbox /> Réception
        </button>
        {canSendBroadcast && (
          <button
            onClick={() => setActiveTab('envoi')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.75rem 1.5rem', border: 'none', borderRadius: '12px', background: activeTab === 'envoi' ? 'white' : 'transparent', color: activeTab === 'envoi' ? '#7c3aed' : '#64748b', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', boxShadow: activeTab === 'envoi' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none', transition: 'all 0.2s' }}
          >
            <FiSend /> Envoi
          </button>
        )}
      </div>

      {/* ── KPI CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {activeTab === 'reception' ? (
          <>
            <div className="stat-card blue" style={{ cursor: 'pointer' }} onClick={() => setKpiFilter('')}>
              <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiInbox size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiTotal}</div>
                <div className="stat-label">Total Reçues</div>
              </div>
            </div>
            <div className={`stat-card red ${kpiFilter === 'non_lue' ? 'selected-active' : ''}`}
              style={{ borderLeft: '3px solid #ef4444', cursor: 'pointer' }}
              onClick={() => setKpiFilter(kpiFilter === 'non_lue' ? '' : 'non_lue')}>
              <div className="stat-icon-wrapper" style={{ background: '#fef2f2', color: '#dc2626' }}><FiMail size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiNonLues}</div>
                <div className="stat-label">Non lues</div>
              </div>
            </div>
            <div className={`stat-card green ${kpiFilter === 'lue' ? 'selected-active' : ''}`}
              style={{ cursor: 'pointer' }}
              onClick={() => setKpiFilter(kpiFilter === 'lue' ? '' : 'lue')}>
              <div className="stat-icon-wrapper" style={{ background: '#f0fdf4', color: '#16a34a' }}><FiCheckCircle size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiLues}</div>
                <div className="stat-label">Lues</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="stat-card blue">
              <div className="stat-icon-wrapper" style={{ background: '#eff6ff', color: '#3b82f6' }}><FiSend size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">{kpiSent}</div>
                <div className="stat-label">Total Envoyées</div>
              </div>
            </div>
            <div className="stat-card purple">
              <div className="stat-icon-wrapper" style={{ background: '#f5f3ff', color: '#7c3aed' }}><FiUsers size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">
                  {sentNotifs.reduce((acc, n) => acc + (n.destinataires?.length ?? 1), 0)}
                </div>
                <div className="stat-label">Destinataires touchés</div>
              </div>
            </div>
            <div className="stat-card amber">
              <div className="stat-icon-wrapper"><FiClock size={24} /></div>
              <div className="stat-info">
                <div className="stat-value">
                  {sentNotifs.filter(n => {
                    const d = new Date(n.date_envoi ?? n.date);
                    const today = new Date();
                    return d.toDateString() === today.toDateString();
                  }).length}
                </div>
                <div className="stat-label">Envoyées aujourd'hui</div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── TOOLBAR ── */}
      <PremiumToolbar 
        searchProps={{
          value: activeTab === 'reception' ? filterRcvSearch : filterSentSearch,
          onChange: (e) => activeTab === 'reception' ? setFilterRcvSearch(e.target.value) : setFilterSentSearch(e.target.value),
          placeholder: "Rechercher par objet..."
        }}
        filters={[
          ...(activeTab === 'reception' ? [{
            value: filterRcvSender,
            onChange: (e) => setFilterRcvSender(e.target.value),
            placeholder: "Tous les expéditeurs",
            options: [...new Map(
              receptionNotifs.filter(n => n.expediteur).map(n => [n.expediteur.id_user, n.expediteur])
            ).values()].map(u => ({ value: `${u.prenom_user} ${u.nom_user}`.toLowerCase(), label: `${u.prenom_user} ${u.nom_user}` }))
          }] : []),
          ...(activeTab === 'envoi' ? [{
            value: filterSentRecip,
            onChange: (e) => setFilterSentRecip(e.target.value),
            placeholder: "Tous les destinataires",
            options: users.map(u => ({ value: `${u.prenom_user} ${u.nom_user}`.toLowerCase(), label: `${u.prenom_user} ${u.nom_user}` }))
          }] : []),
          ...(activeTab === 'reception' ? [{
            value: filterRcvLue,
            onChange: (e) => setFilterRcvLue(e.target.value),
            placeholder: "Toutes",
            options: [
              { value: "non_lue", label: "Non lues" },
              { value: "lue", label: "Lues" }
            ]
          }] : [])
        ]}
        extraContent={
          <div className="premium-toolbar-filter" style={{ flex: 0.6, minWidth: '150px' }}>
            <div style={{ position: 'relative' }}>
              <FiFilter className="premium-toolbar-icon" size={13} />
              <input
                type="date"
                value={activeTab === 'reception' ? filterRcvDate : filterSentDate}
                onChange={e => activeTab === 'reception' ? setFilterRcvDate(e.target.value) : setFilterSentDate(e.target.value)}
                className="premium-toolbar-input"
                style={{ paddingLeft: '2.2rem' }}
              />
            </div>
          </div>
        }
        onReset={() => {
          setFilterRcvSearch(''); setFilterSentSearch(''); setFilterRcvSender(''); setFilterSentRecip(''); setFilterRcvDate(''); setFilterSentDate(''); setFilterRcvLue('');
        }}
        showReset={!!(filterRcvSearch || filterSentSearch || filterRcvSender || filterSentRecip || filterRcvDate || filterSentDate || filterRcvLue)}
      />

      {/* ── TABLE ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          {activeTab === 'reception' ? (
            <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Objet</th>
                  <th style={thStyle}>Message</th>
                  <th style={thStyle}>Expéditeur</th>
                  <th style={thStyle}>Date</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Statut</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {receptionLoading ? (
                  <tr><td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <FiInbox size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.25 }} />
                      Aucune notification reçue.
                    </td>
                  </tr>
                ) : paginated.map(n => (
                  <tr key={n.id_notif ?? n.id}
                    style={{ borderBottom: '1px solid #f1f5f9', background: n.lue ? '#ffffff' : '#faf5ff', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = n.lue ? '#ffffff' : '#faf5ff'}
                  >
                    <td style={tdStyle}>
                      <div style={{ fontWeight: n.lue ? 600 : 800, color: '#0f172a', fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {!n.lue && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#7c3aed', flexShrink: 0, display: 'inline-block' }} />}
                        {n.objet ?? '—'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>
                      <div style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                        {n.message}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      {n.expediteur ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <Avatar prenom={n.expediteur.prenom_user} nom={n.expediteur.nom_user} />
                          <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>
                            {n.expediteur.prenom_user} {n.expediteur.nom_user}
                          </span>
                        </div>
                      ) : <span style={{ color: '#94a3b8' }}>—</span>}
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                        {new Date(n.date_envoi ?? n.date).toLocaleString('fr-FR')}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 700, background: n.lue ? '#f0fdf4' : '#faf5ff', color: n.lue ? '#16a34a' : '#7c3aed', border: `1px solid ${n.lue ? '#bbf7d0' : '#ddd6fe'}` }}>
                        {n.lue ? 'Lu' : 'Non lu'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>
                      <button
                        onClick={() => setConfirmDelete({ open: true, id: n.id_notif ?? n.id })}
                        style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={thStyle}>Objet</th>
                  <th style={thStyle}>Message</th>
                  <th style={thStyle}>Destinataires</th>
                  <th style={thStyle}>Date d'envoi</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sentLoading ? (
                  <tr><td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>Chargement...</td></tr>
                ) : paginated.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                      <FiSend size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.25 }} />
                      Aucune diffusion envoyée.
                    </td>
                  </tr>
                ) : paginated.map(n => {
                  const recipients = Array.isArray(n.destinataires) ? n.destinataires : [];
                  const recipientLabel = recipients.length === 0 ? '—'
                    : recipients.length === 1
                      ? `${recipients[0].destinataire?.prenom_user ?? ''} ${recipients[0].destinataire?.nom_user ?? ''}`
                      : `${recipients.length} destinataires`;

                  return (
                    <tr key={n.id_notif ?? n.id}
                      style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background 0.15s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                      onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                    >
                      <td style={tdStyle}>
                        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{n.objet ?? '—'}</div>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: 260 }}>
                        <div style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                          {n.message}
                        </div>
                      </td>

                      {/* ── Cellule Destinataires — cliquable si > 1 ── */}
                      <td style={tdStyle}>
                        {recipients.length === 0 ? (
                          <span style={{ color: '#94a3b8' }}>—</span>
                        ) : recipients.length === 1 ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Avatar prenom={recipients[0].destinataire?.prenom_user} nom={recipients[0].destinataire?.nom_user} />
                            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.875rem' }}>{recipientLabel}</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setRecipientsModal({ open: true, list: recipients, objet: n.objet ?? '' })}
                            style={{
                              padding: '4px 12px', borderRadius: '20px', background: '#eff6ff',
                              color: '#1d4ed8', border: '1px solid #bfdbfe', fontSize: '0.75rem',
                              fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s'
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#dbeafe'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#eff6ff'; }}
                          >
                            👥 {recipients.length} destinataires
                          </button>
                        )}
                      </td>

                      <td style={tdStyle}>
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 500 }}>
                          {new Date(n.date_envoi ?? n.date).toLocaleString('fr-FR')}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, textAlign: 'right' }}>
                        <button
                          onClick={() => setConfirmDelete({ open: true, id: n.id_notif ?? n.id })}
                          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                        >
                          <FiTrash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer pagination ── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            {currentData.length === 0 ? '0 résultat' : (
              <>
                <strong style={{ color: '#64748b' }}>{(safePage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(safePage * ITEMS_PER_PAGE, currentData.length)}</strong>
                {' '}sur{' '}
                <strong style={{ color: '#64748b' }}>{currentData.length}</strong>
                {currentData.length !== (activeTab === 'reception' ? receptionTotal : sentTotal) && (
                  <span style={{ color: '#cbd5e1' }}> (filtré · {activeTab === 'reception' ? receptionTotal : sentTotal} au total)</span>
                )}
              </>
            )}
          </span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button disabled={safePage === 1} onClick={() => setCurrentPage(1)} style={btnPage(safePage === 1)}><FiChevronsLeft size={14} /></button>
              <button disabled={safePage === 1} onClick={() => setCurrentPage(p => p - 1)} style={btnPage(safePage === 1)}><FiChevronLeft size={14} /></button>
              {getPageNumbers().map((p, idx) =>
                p === '...'
                  ? <span key={`dots-${idx}`} style={{ padding: '0 6px', color: '#94a3b8', fontSize: '0.85rem' }}>…</span>
                  : (
                    <button key={p} onClick={() => setCurrentPage(p)}
                      style={{ ...btnPage(false), border: `1.5px solid ${p === safePage ? '#7c3aed' : '#e2e8f0'}`, background: p === safePage ? '#7c3aed' : 'white', color: p === safePage ? 'white' : '#475569', fontWeight: p === safePage ? '700' : '500', minWidth: '34px' }}>
                      {p}
                    </button>
                  )
              )}
              <button disabled={safePage === totalPages} onClick={() => setCurrentPage(p => p + 1)} style={btnPage(safePage === totalPages)}><FiChevronRight size={14} /></button>
              <button disabled={safePage === totalPages} onClick={() => setCurrentPage(totalPages)} style={btnPage(safePage === totalPages)}><FiChevronsRight size={14} /></button>
            </div>
          )}
        </div>
      </div>

      {showPanel && (
        <div className="modal-backdrop" style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }} onClick={() => setShowPanel(false)}>
          <div onClick={e => e.stopPropagation()} className="premium-modal-blue-box" style={{ width: '540px', maxWidth: '95vw', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
            <div className="premium-modal-blue-header">
              <div className="premium-modal-blue-icon">
                <FiSend size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <h2>Nouvelle Diffusion</h2>
                <div className="premium-modal-blue-header-subtitle">Rédigez et envoyez un message aux utilisateurs</div>
              </div>
              <button onClick={() => setShowPanel(false)} className="close-btn-rfc-style" style={{ color: '#fff' }}>
                <FiX size={20} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '1.75rem 2rem' }}>
              <form onSubmit={handleSendBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Destinataire</label>
                  <select value={selectedUser} onChange={e => setSelectedUser(e.target.value)}
                    style={{ ...selectStyle, width: '100%', background: 'white' }}>
                    <option value="TOUS">Tous les utilisateurs</option>
                    {users.map(u => (
                      <option key={u.id_user} value={u.id_user}>
                        {u.prenom_user} {u.nom_user}{u.roles?.[0] ? ` — ${ROLE_LABELS[u.roles[0]] ?? u.roles[0]}` : ''}
                      </option>
                    ))}
                  </select>
                  <div style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', borderRadius: '99px', padding: '0.25rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, background: targetCount > 0 ? '#eff6ff' : '#f8fafc', color: targetCount > 0 ? '#1d4ed8' : '#94a3b8', border: `1px solid ${targetCount > 0 ? '#bfdbfe' : '#e2e8f0'}` }}>
                    <FiUsers size={12} />
                    {targetCount} utilisateur{targetCount !== 1 ? 's' : ''} ciblé{targetCount !== 1 ? 's' : ''}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Objet du message</label>
                  <input type="text" placeholder="ex: Maintenance planifiée du module ERP" value={objet} onChange={e => setObjet(e.target.value)} required
                    style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Message</label>
                  <textarea placeholder="Décrivez l'impact, la durée prévue et les solutions de secours..." value={message} onChange={e => setMessage(e.target.value)} required
                    style={{ width: '100%', minHeight: '110px', padding: '0.75rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontSize: '0.9rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }} />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Modèles rapides</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {TEMPLATES.map((t, i) => (
                      <button key={i} type="button" onClick={() => { setObjet(t.objet); setMessage(t.msg); }}
                        style={{ padding: '0.55rem 0.75rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '0.75rem', color: '#475569', fontWeight: 600, cursor: 'pointer', textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#f5f3ff'; e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.color = '#7c3aed'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.color = '#475569'; }}
                      >{t.objet}</button>
                    ))}
                  </div>
                </div>

                <div style={{ background: '#eff6ff', borderRadius: '10px', padding: '0.9rem 1rem', display: 'flex', gap: '0.75rem', color: '#1e40af', fontSize: '0.82rem', alignItems: 'flex-start' }}>
                  <FiInfo size={15} style={{ flexShrink: 0, marginTop: '1px' }} />
                  <p style={{ margin: 0 }}>Un préavis minimum de 24h est recommandé pour les changements normaux.</p>
                </div>

                <button type="submit" disabled={sending || targetCount === 0}
                  style={{ width: '100%', padding: '0.85rem', borderRadius: '10px', border: 'none', background: sending || targetCount === 0 ? '#94a3b8' : 'linear-gradient(135deg, #7c3aed, #6d28d9)', color: 'white', fontWeight: 700, fontSize: '0.95rem', cursor: sending || targetCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', boxShadow: targetCount > 0 ? '0 4px 12px rgba(124,58,237,0.25)' : 'none' }}
                >
                  <FiSend size={15} />
                  {sending ? 'Diffusion en cours...' : 'Diffuser maintenant'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL DESTINATAIRES ── */}
      {recipientsModal.open && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setRecipientsModal({ open: false, list: [], objet: '' })}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '20px', width: '480px', maxWidth: '95vw', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
          >
            {/* Header */}
            <div style={{ padding: '1.5rem 1.75rem', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>Destinataires</h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  {recipientsModal.objet} · {recipientsModal.list.length} utilisateur{recipientsModal.list.length > 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setRecipientsModal({ open: false, list: [], objet: '' })}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '8px', width: 32, height: 32, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
              >
                <FiX size={16} />
              </button>
            </div>

            {/* Liste */}
            <div style={{ overflowY: 'auto', padding: '1rem 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recipientsModal.list.map((d, i) => {
                const u = d.destinataire ?? d;
                const prenom = u.prenom_user ?? '';
                const nom = u.nom_user ?? '';
                const role = u.roles?.[0];
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.6rem 0.75rem', borderRadius: '10px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                    <Avatar prenom={prenom} nom={nom} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.875rem' }}>{prenom} {nom}</div>
                      {role && (
                        <div style={{ fontSize: '0.72rem', color: '#7c3aed', fontWeight: 600, marginTop: '1px' }}>
                          {ROLE_LABELS[role] ?? role}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div style={{ padding: '1rem 1.75rem', borderTop: '1px solid #f1f5f9', background: '#fafafa', textAlign: 'center' }}>
              <button
                onClick={() => setRecipientsModal({ open: false, list: [], objet: '' })}
                style={{ padding: '0.6rem 2rem', borderRadius: '10px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', fontWeight: 700, cursor: 'pointer', fontSize: '0.875rem' }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIRM DELETE ── */}
      <ConfirmModal
        isOpen={confirmDelete.open}
        title="Supprimer la notification"
        message="Voulez-vous vraiment supprimer cette notification ? Cette action est irréversible."
        onConfirm={handleDeleteNotif}
        onCancel={() => setConfirmDelete({ open: false, id: null })}
        danger={true}
      />

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default BroadcastCenter;