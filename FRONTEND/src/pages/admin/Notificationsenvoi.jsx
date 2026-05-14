import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSend, FiRefreshCw, FiSearch, FiFilter,
  FiUsers, FiClock, FiX, FiUser, FiInbox
} from 'react-icons/fi';
import notificationService from '../../services/notificationService';
import '../Notifications.css';

const NotificationsEnvoi = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [limit]                           = useState(20);

  // ── Filtres avancés ─────────────────────────────────────
  const [filterSearch,       setFilterSearch]       = useState('');
  const [filterDestinataire, setFilterDestinataire] = useState('');
  const [filterDateFrom,     setFilterDateFrom]      = useState('');
  const [filterDateTo,       setFilterDateTo]        = useState('');

  const hasFilters = filterSearch || filterDestinataire || filterDateFrom || filterDateTo;

  // ── Fetch ────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const response = await notificationService.getMySentNotifications({ page, limit });
      setNotifications(response.data.notifications || []);
      setTotal(response.data.total || 0);
    } catch (error) {
      console.error('Error fetching sent notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── Filtrage local ───────────────────────────────────────
  const filtered = notifications.filter(n => {
    const objetStr = (n.objet ?? '').toLowerCase();
    const msgStr   = (n.message ?? '').toLowerCase();
    const searchTerm = filterSearch.toLowerCase();
    const destTerm   = filterDestinataire.toLowerCase();

    const destinatairesStr = (n.destinataires ?? [])
      .map(d => `${d.destinataire?.prenom_user ?? ''} ${d.destinataire?.nom_user ?? ''}`.trim())
      .join(' ')
      .toLowerCase();

    const matchSearch = !filterSearch ||
      objetStr.includes(searchTerm) ||
      msgStr.includes(searchTerm) ||
      destinatairesStr.includes(searchTerm);

    const matchDest = !filterDestinataire || destinatairesStr.includes(destTerm);

    const date = new Date(n.date_envoi);
    const matchFrom = filterDateFrom ? date >= new Date(filterDateFrom) : true;
    const matchTo   = filterDateTo   ? date <= new Date(filterDateTo + 'T23:59:59') : true;

    return matchSearch && matchDest && matchFrom && matchTo;
  });

  const thStyle = { padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' };

  return (
    <div className="notif-page">

      {/* ── HEADER ── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
            <FiSend />
          </div>
          <div className="premium-header-text">
            <h1>Notifications Envoyées</h1>
            <p>Historique de toutes les notifications que vous avez émises</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="refresh-btn-premium" onClick={fetchNotifications}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '5px' }}>

        {/* Recherche globale */}
        <div style={{ position: 'relative', flex: '1 1 220px', minWidth: '180px' }}>
          <FiSearch size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Rechercher (objet, message...)"
            value={filterSearch}
            onChange={e => setFilterSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none', background: '#f8fafc' }}
          />
        </div>

        {/* Filtre destinataire */}
        <div style={{ position: 'relative', minWidth: '210px' }}>
          <FiUsers size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Filtrer par destinataire..."
            value={filterDestinataire}
            onChange={e => setFilterDestinataire(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', boxSizing: 'border-box', outline: 'none', background: '#f8fafc' }}
          />
        </div>

        {/* Date début */}
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <FiFilter size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="date"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            title="Date début"
            style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Date fin */}
        <div style={{ position: 'relative', minWidth: '150px' }}>
          <FiFilter size={12} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }} />
          <input
            type="date"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            title="Date fin"
            style={{ width: '100%', padding: '0.6rem 0.75rem 0.6rem 2.2rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', background: '#f8fafc', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Reset */}
        {hasFilters && (
          <button
            onClick={() => { setFilterSearch(''); setFilterDestinataire(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed', fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <FiX size={13} /> Réinitialiser
          </button>
        )}

        <span style={{ fontSize: '0.82rem', color: '#64748b', whiteSpace: 'nowrap', marginLeft: 'auto' }}>
          <strong style={{ color: '#334155' }}>{filtered.length}</strong> / {total} notification{total !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── TABLEAU ── */}
      <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '750px', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={thStyle}>Objet</th>
                <th style={{ ...thStyle, maxWidth: 260 }}>Message</th>
                <th style={thStyle}><FiUsers size={11} style={{ marginRight: 4 }} />Destinataires</th>
                <th style={thStyle}>Catégorie</th>
                <th style={thStyle}><FiClock size={11} style={{ marginRight: 4 }} />Date d'envoi</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiRefreshCw size={32} style={{ display: 'block', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiInbox size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucune notification envoyée trouvée.
                  </td>
                </tr>
              ) : filtered.map((notif) => {
                const recipients = notif.destinataires ?? [];
                const recipientLabel = recipients.length === 0
                  ? <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sans destinataire</span>
                  : recipients.length === 1
                    ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {(() => {
                          const prenom = recipients[0].destinataire?.prenom_user ?? '';
                          const nom    = recipients[0].destinataire?.nom_user ?? '';
                          const init   = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
                          const colors = [
                            { bg: '#dbeafe', color: '#1d4ed8' }, { bg: '#d1fae5', color: '#065f46' },
                            { bg: '#fef3c7', color: '#92400e' }, { bg: '#ede9fe', color: '#5b21b6' },
                          ];
                          const palette = colors[(prenom.charCodeAt(0) || 0) % colors.length];
                          return (
                            <>
                              <div style={{ width: 28, height: 28, borderRadius: '8px', flexShrink: 0, background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700 }}>
                                {init}
                              </div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{prenom} {nom}</span>
                            </>
                          );
                        })()}
                      </div>
                    )
                    : (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7c3aed', fontSize: '0.78rem', fontWeight: 700 }}>
                        <FiUsers size={11} />
                        {recipients.length} destinataires
                      </div>
                    );

                return (
                  <tr
                    key={notif.id_notif}
                    style={{ background: '#ffffff', transition: 'background 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                  >
                    {/* Objet */}
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.875rem', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={notif.objet}>
                        {notif.objet || 'Notification système'}
                      </div>
                    </td>

                    {/* Message */}
                    <td style={{ ...tdStyle, maxWidth: 260 }}>
                      <div style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 240 }}>
                        {notif.message}
                      </div>
                    </td>

                    {/* Destinataires */}
                    <td style={tdStyle}>{recipientLabel}</td>

                    {/* Catégorie */}
                    <td style={tdStyle}>
                      {(() => {
                        const cat = notif.id_rfc ? 'RFC' : notif.id_changement ? 'Changement' : notif.id_tache ? 'Tâche' : 'Système';
                        const colors = { RFC: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' }, Changement: { bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' }, Tâche: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' }, Système: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' } };
                        const c = colors[cat];
                        return <span style={{ padding: '3px 10px', borderRadius: '20px', background: c.bg, color: c.color, border: `1px solid ${c.border}`, fontSize: '0.72rem', fontWeight: 700 }}>{cat}</span>;
                      })()}
                    </td>

                    {/* Date */}
                    <td style={tdStyle}>
                      <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 500 }}>
                        {new Date(notif.date_envoi).toLocaleString('fr-FR')}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer pagination */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #f1f5f9', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
            <strong style={{ color: '#64748b' }}>{filtered.length}</strong> notification{filtered.length !== 1 ? 's' : ''}
            {filtered.length !== notifications.length && <span style={{ color: '#cbd5e1' }}> (filtré · {notifications.length} total)</span>}
          </span>
          {total > limit && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={{ padding: '5px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: page === 1 ? '#f8fafc' : 'white', color: page === 1 ? '#cbd5e1' : '#475569', cursor: page === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                Précédent
              </button>
              <span style={{ fontSize: '0.82rem', color: '#64748b' }}>Page {page} / {Math.ceil(total / limit)}</span>
              <button disabled={page >= Math.ceil(total / limit)} onClick={() => setPage(p => p + 1)} style={{ padding: '5px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0', background: page >= Math.ceil(total / limit) ? '#f8fafc' : 'white', color: page >= Math.ceil(total / limit) ? '#cbd5e1' : '#475569', cursor: page >= Math.ceil(total / limit) ? 'not-allowed' : 'pointer', fontWeight: 600 }}>
                Suivant
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsEnvoi;