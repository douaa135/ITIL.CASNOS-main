import React, { useState, useEffect, useCallback } from 'react';
import {
  FiBell, FiCheckCircle, FiTrash2, FiClock,
  FiRefreshCw, FiInbox, FiMail, FiSearch, FiFilter, FiUser, FiX
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import notificationService from '../../services/notificationService';
import '../Notifications.css';

const NotificationsReception = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [total, setTotal]                 = useState(0);
  const [page, setPage]                   = useState(1);
  const [limit]                           = useState(20);
  const [filter, setFilter]               = useState('all');   // all | unread | read
  const [liveCount, setLiveCount]         = useState(0);

  // ── Filtres avancés ─────────────────────────────────────
  const [filterSearch,      setFilterSearch]      = useState('');
  const [filterExpediteur,  setFilterExpediteur]  = useState('');
  const [filterDateFrom,    setFilterDateFrom]     = useState('');
  const [filterDateTo,      setFilterDateTo]       = useState('');

  const navigate   = useNavigate();
  const { user }   = useAuth();
  const { socket } = useSocket();

  const hasFilters = filterSearch || filterExpediteur || filterDateFrom || filterDateTo;

  // ── Fetch ────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const lue = filter === 'unread' ? false : filter === 'read' ? true : undefined;
      const response = await notificationService.getMyNotifications({ page, limit, lue });
      setNotifications(response.data.notifications || []);
      setTotal(response.data.total || 0);
      setLiveCount(0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [page, limit, filter]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // ── WebSocket ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id_user || !socket) return;
    const handleNewNotif = (notif) => {
      if (filter !== 'read') {
        setNotifications(prev => {
          if (prev.some(n => n.id_notif === notif.id_notif)) return prev;
          return [notif, ...prev];
        });
        setTotal(prev => prev + 1);
        setLiveCount(prev => prev + 1);
      }
    };
    socket.on('notification:new', handleNewNotif);
    return () => socket.off('notification:new', handleNewNotif);
  }, [user?.id_user, filter, socket]);

  // ── Filtrage local ───────────────────────────────────────
  const filtered = notifications.filter(n => {
    const expediteur = n.expediteur
      ? `${n.expediteur.prenom_user ?? ''} ${n.expediteur.nom_user ?? ''}`.toLowerCase()
      : 'système';
    const objetStr = (n.objet ?? '').toLowerCase();
    const msgStr   = (n.message ?? '').toLowerCase();
    const searchTerm = filterSearch.toLowerCase();
    const expTerm    = filterExpediteur.toLowerCase();

    const matchSearch = !filterSearch ||
      objetStr.includes(searchTerm) ||
      msgStr.includes(searchTerm) ||
      expediteur.includes(searchTerm);

    const matchExp = !filterExpediteur || expediteur.includes(expTerm);

    const date = new Date(n.date_envoi);
    const matchFrom = filterDateFrom ? date >= new Date(filterDateFrom) : true;
    const matchTo   = filterDateTo   ? date <= new Date(filterDateTo + 'T23:59:59') : true;

    return matchSearch && matchExp && matchFrom && matchTo;
  });

  // ── Actions ──────────────────────────────────────────────
  const handleMarkRead = async (id) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications(prev => prev.map(n => n.id_notif === id ? { ...n, lue: true } : n));
    } catch (error) { console.error(error); }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, lue: true })));
    } catch (error) { console.error(error); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette notification ?')) return;
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id_notif !== id));
      setTotal(prev => prev - 1);
    } catch (error) { console.error(error); }
  };

  const handleNotifClick = (notif) => {
    if (!notif.lue) handleMarkRead(notif.id_notif);
    const role = user?.roles?.[0];
    if (notif.id_rfc) {
      if      (role === 'DEMANDEUR')      navigate(`/rfcs/${notif.id_rfc}`);
      else if (role === 'CHANGE_MANAGER') navigate(`/manager/rfcs`);
      else if (role === 'SERVICE_DESK')   navigate(`/servicedesk/rfcs`);
      else if (role === 'ADMIN')          navigate(`/admin/rfcs`);
      else                                navigate(`/rfcs/${notif.id_rfc}`);
    } else if (notif.id_changement) {
      if      (role === 'CHANGE_MANAGER') navigate(`/manager/changements`);
      else if (role === 'ADMIN')          navigate(`/admin/changes`);
      else                                navigate(`/manager/changements`);
    } else if (notif.id_tache) {
      if      (role === 'IMPLEMENTEUR')   navigate(`/implementer/tasks`);
      else if (role === 'ADMIN')          navigate(`/admin/tasks`);
      else if (role === 'CHANGE_MANAGER') navigate(`/manager/implementation`);
      else                                navigate(`/implementer/tasks`);
    }
  };

  const thStyle = { padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle', borderBottom: '1px solid #f1f5f9' };

  return (
    <div className="notif-page">

      {/* ── HEADER ── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#eff6ff', color: '#3b82f6', borderColor: '#bfdbfe' }}>
            <FiInbox />
          </div>
          <div className="premium-header-text">
            <h1>Notifications Reçues</h1>
            <p>Toutes les alertes et messages reçus dans votre boîte de réception</p>
          </div>
        </div>
        <div className="premium-header-actions">
          {liveCount > 0 && (
            <button
              className="mark-all-btn-premium"
              onClick={fetchNotifications}
              style={{ background: '#3b82f6', color: 'white', borderColor: '#3b82f6' }}
            >
              <FiRefreshCw /> {liveCount} nouvelle{liveCount > 1 ? 's' : ''} — Actualiser
            </button>
          )}
          <button className="refresh-btn-premium" onClick={fetchNotifications}>
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
          <button className="mark-all-btn-premium" onClick={handleMarkAllRead}>
            <FiCheckCircle /> Tout marquer comme lu
          </button>
        </div>
      </div>

      {/* ── TOOLBAR ── */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '5px' }}>

        {/* Filtre lu/non-lu */}
        <div className="notif-filters" style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          {['all', 'unread', 'read'].map(f => (
            <button
              key={f}
              className={`filter-tab ${filter === f ? 'active' : ''}`}
              onClick={() => { setFilter(f); setPage(1); }}
            >
              {f === 'all' ? 'Toutes' : f === 'unread' ? 'Non lues' : 'Lues'}
            </button>
          ))}
        </div>

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

        {/* Filtre expéditeur */}
        <div style={{ position: 'relative', minWidth: '190px' }}>
          <FiUser size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Filtrer par expéditeur..."
            value={filterExpediteur}
            onChange={e => setFilterExpediteur(e.target.value)}
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
            onClick={() => { setFilterSearch(''); setFilterExpediteur(''); setFilterDateFrom(''); setFilterDateTo(''); }}
            style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #3b82f6', fontSize: '0.875rem', background: '#eff6ff', color: '#3b82f6', cursor: 'pointer', fontWeight: '600', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
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
                <th style={{ ...thStyle, width: 36 }}></th>
                <th style={thStyle}>Objet</th>
                <th style={{ ...thStyle, maxWidth: 280 }}>Message</th>
                <th style={thStyle}><FiUser size={11} style={{ marginRight: 4 }} />Expéditeur</th>
                <th style={thStyle}>Catégorie</th>
                <th style={thStyle}><FiClock size={11} style={{ marginRight: 4 }} />Date</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiRefreshCw size={32} style={{ display: 'block', margin: '0 auto 0.75rem', animation: 'spin 1s linear infinite' }} />
                    Chargement...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiInbox size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucune notification trouvée.
                  </td>
                </tr>
              ) : filtered.map((notif) => {
                const isRead = notif.lue === true;
                return (
                  <tr
                    key={notif.id_notif}
                    onClick={() => handleNotifClick(notif)}
                    style={{
                      background: isRead ? '#ffffff' : '#f0f9ff',
                      cursor: 'pointer',
                      transition: 'background 0.15s',
                      borderLeft: isRead ? '3px solid transparent' : '3px solid #3b82f6',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = isRead ? '#f8fafc' : '#e0f2fe'}
                    onMouseLeave={e => e.currentTarget.style.background = isRead ? '#ffffff' : '#f0f9ff'}
                  >
                    {/* Indicateur lu/non-lu */}
                    <td style={{ ...tdStyle, paddingRight: 0 }}>
                      {!isRead && (
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', margin: '0 auto' }} />
                      )}
                    </td>

                    {/* Objet */}
                    <td style={tdStyle}>
                      <div style={{ fontWeight: isRead ? 500 : 700, color: '#0f172a', fontSize: '0.875rem', maxWidth: 220, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={notif.objet}>
                        {notif.objet || 'Notification système'}
                      </div>
                    </td>

                    {/* Message tronqué */}
                    <td style={{ ...tdStyle, maxWidth: 280 }}>
                      <div style={{ color: '#64748b', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 }}>
                        {notif.message}
                      </div>
                    </td>

                    {/* Expéditeur avec avatar */}
                    <td style={tdStyle}>
                      {notif.expediteur && notif.expediteur.email_user !== 'systeme@itil.internal' ? (() => {
                        const prenom = notif.expediteur.prenom_user ?? '';
                        const nom    = notif.expediteur.nom_user ?? '';
                        const init   = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
                        const colors = [
                          { bg: '#dbeafe', color: '#1d4ed8' }, { bg: '#d1fae5', color: '#065f46' },
                          { bg: '#fef3c7', color: '#92400e' }, { bg: '#ede9fe', color: '#5b21b6' },
                          { bg: '#fce7f3', color: '#9d174d' },
                        ];
                        const palette = colors[(prenom.charCodeAt(0) || 0) % colors.length];
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: 30, height: 30, borderRadius: '8px', flexShrink: 0, background: palette.bg, color: palette.color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700 }}>
                              {init}
                            </div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#1e293b' }}>{prenom} {nom}</span>
                          </div>
                        );
                      })() : (
                        <span style={{ fontSize: '0.82rem', color: '#64748b', fontStyle: 'italic' }}>Système</span>
                      )}
                    </td>

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

                    {/* Actions */}
                    <td style={{ ...tdStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        {!notif.lue && (
                          <button
                            onClick={() => handleMarkRead(notif.id_notif)}
                            title="Marquer comme lu"
                            style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#eff6ff', color: '#3b82f6', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                          >
                            <FiCheckCircle size={13} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(notif.id_notif)}
                          title="Supprimer"
                          style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#fef2f2', color: '#ef4444', border: 'none', borderRadius: '8px', cursor: 'pointer' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                          onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
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

export default NotificationsReception;