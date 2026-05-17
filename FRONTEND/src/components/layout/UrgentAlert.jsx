import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FiAlertTriangle } from 'react-icons/fi';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosClient';
import { useSocket } from '../../context/SocketContext';
import './UrgentAlert.css';

// ─── Calcul du compte d'éléments urgents ─────────────────────
async function computeUrgentCount(user) {
  if (!user) return { total: 0, rfc: 0, changements: 0, taches: 0 };
  try {
    const hasRole = (name) => {
      const roleList = [];
      if (Array.isArray(user.roles)) {
        user.roles.forEach(r => {
          if (typeof r === 'string') roleList.push(r.toUpperCase());
          else if (r && r.nom_role) roleList.push(r.nom_role.toUpperCase());
        });
      }
      if (user.role?.nom_role) roleList.push(user.role.nom_role.toUpperCase());
      if (typeof user.role === 'string') roleList.push(user.role.toUpperCase());
      if (user.nom_role) roleList.push(user.nom_role.toUpperCase());
      if (Array.isArray(user.userRoles)) {
        user.userRoles.forEach(ur => { if (ur?.role?.nom_role) roleList.push(ur.role.nom_role.toUpperCase()); });
      }
      // On cherche si un des rôles contient le mot clé (ex: 'CAB' match 'MEMBRE CAB')
      // Et on gère les underscores/espaces
      const normalizedName = name.toUpperCase().replace(/_/g, ' ');
      return roleList.some(r => r.includes(normalizedName) || r.includes(name.toUpperCase()));
    };

    const isAdmin = hasRole('ADMIN');
    const isCM = hasRole('CHANGE_MANAGER') || hasRole('MANAGER');
    const isSD = hasRole('SERVICE_DESK') || hasRole('DESK');
    const isImp = hasRole('IMPLEMENTEUR') || hasRole('TECH');
    const isDem = hasRole('DEMANDEUR');
    const isCAB = hasRole('CAB');

    let rfcCount = 0;
    let chgCount = 0;
    let tchCount = 0;

    // --- RFCs ---
    let urgentRfcs = [];
    if (isAdmin || isCM || isSD || isCAB || isDem) {
      const res = await api.get('/rfc').catch(() => null);
      const rfcList = res?.data?.rfcs || res?.rfcs || (Array.isArray(res?.data) ? res.data : []);
      
      const deletedRfcIds = JSON.parse(localStorage.getItem('deleted_rfcs') || '[]');
      
      urgentRfcs = rfcList.filter(r => {
        if (deletedRfcIds.includes(r.id_rfc)) return false;

        const typeStr = (r.typeRfc?.type || r.type || r.typeRfc?.code_type || '').toUpperCase();
        const prioStr = String(r.priorite?.libelle || r.priorite?.code_priorite || r.id_priorite || '').toUpperCase();
        const isUrgent = typeStr.includes('URGENT') || 
                         prioStr.includes('URGENT') || prioStr.includes('HAUTE') || prioStr.includes('CRITIQUE') || prioStr.includes('P0') || prioStr.includes('P1') ||
                         r.urgence === true || r.urgence === 1 || String(r.urgence) === 'true';

        if (!isUrgent) return false;

        const isOwner = (isDem && !isAdmin && !isCM && !isSD && !isCAB) ? String(r.id_user) === String(user.id_user) : true;
        return isOwner;
      });
      
      // Ségrégation : RFC Urgentes selon le cumul des rôles
      const targetStatuses = new Set();
      if (isAdmin || isSD || isCAB || isCM) targetStatuses.add('SOUMIS');
      if (isCM) {
        targetStatuses.add('PRE_APPROUVEE');
        targetStatuses.add('EVALUEE');
      }
      
      const urgentFiltered = urgentRfcs.filter(r => targetStatuses.has(r.statut?.code_statut));
      rfcCount = urgentFiltered.length;
    }

    // --- Changements ---
    if (isAdmin || isCM || isImp) {
      const res = await api.get('/changements').catch(() => null);
      const allChgs = res?.data?.changements || res?.changements || (Array.isArray(res?.data) ? res.data : []);
      
      const deletedChgIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
      
      const filteredChgs = allChgs.filter(c => {
        if (deletedChgIds.includes(c.id_changement)) return false;

        const typeStr = (c.rfc?.typeRfc?.type || c.type || c.rfc?.typeRfc?.code_type || '').toUpperCase();
        const prioChg = (c.priorite || '').toUpperCase();
        const isUrgent = typeStr.includes('URGENT') || prioChg.includes('URGENT') || prioChg.includes('CRITIQUE') || prioChg.includes('HAUTE') ||
                         c.rfc?.urgence === true || c.rfc?.urgence === 1 || String(c.rfc?.urgence) === 'true';

        const s = c.statut;
        const statusCode = (typeof s === 'object' && s !== null) ? (s.code_statut || s.libelle) : s;
        return isUrgent && !['CLOTUREE', 'CLOTURE', 'IMPLEMENTE', 'TERMINEE', 'REUSSI', 'ECHEC', 'ANNULEE', 'REJETEE'].includes(statusCode);
      });
      
      chgCount = filteredChgs.length;
    }

    // --- Tâches ---
    if (isAdmin || isCM || isImp) {
      try {
        const res = await api.get('/changements?limit=1000');
        const data = res?.data || res;
        const allChanges = data?.changements || (Array.isArray(data) ? data : []);

        const deletedChgIds = JSON.parse(localStorage.getItem('deleted_changements') || '[]');
        const filteredAllChanges = allChanges.filter(c => !deletedChgIds.includes(c.id_changement));

        const taskPromises = filteredAllChanges.map(async (change) => {
          try {
            const tRes = await api.get(`/changements/${change.id_changement}/taches`);
            const tData = tRes?.data || tRes;
            const rawTasks = tData?.taches || (Array.isArray(tData) ? tData : []);
            
            return rawTasks.map(t => {
              const rfcPrio = (change.rfc?.priorite?.code_priorite || change.rfc?.id_priorite || '').toUpperCase();
              const rfcType = (change.rfc?.typeRfc?.type || change.rfc?.type || '').toUpperCase();
              const taskPrio = (t.priorite || '').toUpperCase();
              const chgPrio = (change.priorite || '').toUpperCase();
              
              const isUrgentRfc = ['URGENCE', 'URGENT', 'HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5'].includes(rfcType) || 
                                 ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5'].includes(rfcPrio) || 
                                 change.rfc?.urgence === true || change.rfc?.urgence === 1 || String(change.rfc?.urgence) === 'true';
              
              const isUrgentTask = ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5', 'URGENT'].includes(taskPrio) || 
                                  ['HAUTE', 'CRITIQUE', 'P0', 'P1', 'P4', 'P5', 'URGENT'].includes(chgPrio);

              return { ...t, isUrgent: isUrgentRfc || isUrgentTask };
            });
          } catch (e) { return []; }
        });

        const results = await Promise.allSettled(taskPromises);
        const allFetchedTasks = results
          .filter(r => r.status === 'fulfilled')
          .flatMap(r => r.value || []);

        const urgentTasks = allFetchedTasks.filter(t => {
          const s = t.statut;
          const statusCode = (typeof s === 'object' && s !== null) ? (s.code_statut || s.libelle || 'PLANIFIEE') : (s || 'PLANIFIEE');
          const isPending = statusCode === 'EN_ATTENTE';
          const isMyTask = isImp && !isAdmin && !isCM ? (String(t.id_user) === String(user.id_user) || String(t.implementeur?.id_user) === String(user.id_user)) : true;
          return isPending && t.isUrgent && isMyTask;
        });

        tchCount = urgentTasks.length;
      } catch (err) {
        console.error('UrgentAlert Task Fetch Error:', err);
      }
    }
    
    // --- Sessions CAB Urgentes ---
    let meetingCount = 0;
    if (isAdmin || isCM || isCAB) {
      try {
        const cabRes = await api.get('/cab').catch(() => null);
        const allCabs = cabRes?.data?.cabs || cabRes?.cabs || (Array.isArray(cabRes?.data) ? cabRes.data : []);
        
        let allReunions = [];
        for (const cab of allCabs) {
          try {
            const rRes = await api.get(`/cab/${cab.id_cab}/reunions`);
            const reunions = rRes?.data?.reunions || rRes?.reunions || (Array.isArray(rRes?.data) ? rRes.data : []);
            allReunions = [...allReunions, ...reunions.map(r => ({ ...r, cab_type: cab.type_cab }))];
          } catch(e) {}
        }
        
        const urgentReunions = allReunions.filter(m => 
          ['URGENT', 'URGENCE'].includes((m.cab_type || '').toUpperCase())
        );
        meetingCount = urgentReunions.length;
      } catch (err) {}
    }

    // Calcul du total intelligent — Parité STRICTE avec les KPIs "Urgents" de chaque tableau de bord
    let finalTotal = 0;
    if (isAdmin) {
      finalTotal = rfcCount + chgCount + tchCount + meetingCount;
    } else if (isCM) {
      // Pour le CM, l'alerte cumule désormais RFCs + Changements + Tâches + Sessions
      finalTotal = rfcCount + chgCount + tchCount + meetingCount;
    } else if (isImp) {
      // Pour l'implémenteur, l'alerte correspond au KPI "Urgentes" des tâches (ImplementerDashboard.jsx)
      finalTotal = tchCount;
    } else if (isSD) {
      // Pour le SD, l'alerte correspond au KPI "Urgents" des RFCs (InquiryHub.jsx)
      finalTotal = rfcCount;
    } else if (isCAB) {
      // Pour le CAB, l'alerte correspond au KPI "Sessions urgentes"
      finalTotal = meetingCount;
    } else {
      finalTotal = rfcCount + chgCount + tchCount + meetingCount;
    }

    return { total: finalTotal, rfc: rfcCount, changements: chgCount, taches: tchCount, reunions: meetingCount };
  } catch (error) {
    console.error('Erreur computeUrgentCount:', error);
    return { total: 0, rfc: 0, changements: 0, taches: 0 };
  }
}


// ─── Composant ───────────────────────────────────────────────
const UrgentAlert = () => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate  = useNavigate();
  const location  = useLocation();

  const [urgentCounts, setUrgentCounts] = useState({ total: 0, rfc: 0, changements: 0, taches: 0 });

  const [loading,     setLoading]     = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  // Détection des rôles pour l'affichage conditionnel
  const hasRole = (name) => {
    if (!user) return false;
    const roleList = [];
    if (Array.isArray(user.roles)) {
      user.roles.forEach(r => {
        if (typeof r === 'string') roleList.push(r.toUpperCase());
        else if (r && r.nom_role) roleList.push(r.nom_role.toUpperCase());
      });
    }
    if (user.role?.nom_role) roleList.push(user.role.nom_role.toUpperCase());
    if (typeof user.role === 'string') roleList.push(user.role.toUpperCase());
    if (user.nom_role) roleList.push(user.nom_role.toUpperCase());
    
    const normalizedName = name.toUpperCase().replace(/_/g, ' ');
    return roleList.some(r => r.includes(normalizedName) || r.includes(name.toUpperCase()));
  };

  const isAdmin = hasRole('ADMIN');
  const isCM = hasRole('CHANGE_MANAGER') || hasRole('MANAGER');
  const isCAB = hasRole('CAB');

  // ── Fetch (appelé une fois + sur événement WS) ──────────────
  const fetchUrgentItems = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const countsObj = await computeUrgentCount(user);
      setUrgentCounts(countsObj);
      if (user.id_user) {
        localStorage.setItem(`urgentCountsObj_${user.id_user}`, JSON.stringify(countsObj));
      }
    } catch (error) {
      console.error('[UrgentAlert] Erreur :', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // ── Chargement initial ──────────────────────────────────────
  useEffect(() => {
    fetchUrgentItems();
  }, [fetchUrgentItems]);

  // ── Listeners WebSocket — remplace setInterval(60 000) ──────
  useEffect(() => {
    if (!user?.id_user || !socket) return;

    // Les événements qui peuvent faire bouger le compteur urgent
    const refresh = () => fetchUrgentItems();

    socket.on('rfc:update',        refresh);
    socket.on('changement:update', refresh);
    socket.on('tache:update',      refresh);
    socket.on('kpi:refresh',       refresh);
    socket.on('notification:new',  refresh);

    return () => {
      socket.off('rfc:update',        refresh);
      socket.off('changement:update', refresh);
      socket.off('tache:update',      refresh);
      socket.off('kpi:refresh',       refresh);
      socket.off('notification:new',  refresh);
    };
  }, [user?.id_user, socket, fetchUrgentItems]);

  // ── Fermeture dropdown au clic extérieur ────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // ── Navigation ───────────────────────────────────────────────
  const handleClick = () => {
    const roles = user?.roles || [];
    const path  = location.pathname;

    if (path.startsWith('/admin') || path.startsWith('/manager')) {
      setShowOptions(!showOptions);
    } else if (path.startsWith('/servicedesk')) {
      navigate('/servicedesk/inquiry?type=URGENT');
    } else if (path.startsWith('/implementer')) {
      navigate('/implementer/tasks?kpi=URGENT');
    } else {
      if (roles.includes('ADMIN') || roles.includes('CHANGE_MANAGER')) {
        setShowOptions(!showOptions);
      } else if (roles.includes('SERVICE_DESK')) {
        navigate('/servicedesk/inquiry?type=URGENT');
      } else if (roles.includes('IMPLEMENTEUR')) {
        navigate('/implementer/tasks?kpi=URGENT');
      } else if (roles.includes('CAB') || roles.includes('MEMBRE_CAB')) {
        navigate('/cab/meetings?kpi=URGENT');
      }
    }
  };

  const handleSelectOption = (path) => {
    setShowOptions(false);
    navigate(path);
  };

  // ── Rendu ────────────────────────────────────────────────────
  if (user?.roles?.includes('DEMANDEUR')) return null;
  return (
    <div className="urgent-alert-container" ref={dropdownRef}>
      <div
        className={`urgent-alert-icon-wrapper ${urgentCounts.total > 0 ? 'radiant-glow' : ''}`}
        onClick={handleClick}
        title={loading ? 'Recherche en cours…' : (isCAB && !isAdmin && !isCM) ? `${urgentCounts.total} session(s) urgente(s)` : `${urgentCounts.total} élément(s) urgent(s)`}
        style={{ opacity: loading && urgentCounts.total === 0 ? 0.5 : 1 }}
      >
        <FiAlertTriangle className={`urgent-icon ${urgentCounts.total > 0 ? 'flashing-icon' : ''} ${loading && urgentCounts.total === 0 ? 'spin-icon' : ''}`} />
        {(urgentCounts.total > 0 || !loading) && (
          <span className="urgent-count-badge">{urgentCounts.total}</span>
        )}
      </div>

      {showOptions && (
        <div className="urgent-options-dropdown glass-card">
          <div className="urgent-options-header">Éléments Urgents</div>
          <button
            className="urgent-option-item"
            onClick={() => handleSelectOption(
              location.pathname.startsWith('/admin')
                ? '/admin/rfcs?kpi=URGENT'
                : location.pathname.startsWith('/servicedesk')
                  ? '/servicedesk/rfcs?kpi=URGENT'
                  : '/manager/rfcs?kpi=URGENT'
            )}
          >
            <span className="dot rfc" /> RFCs Urgents 
            <span style={{ marginLeft: 'auto', background: '#eff6ff', color: '#3b82f6', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800' }}>
              {urgentCounts.rfc || 0}
            </span>
          </button>
          <button
            className="urgent-option-item"
            onClick={() => handleSelectOption(
              location.pathname.startsWith('/admin')
                ? '/admin/changes?kpi=URGENT'
                : '/manager/changements?kpi=URGENT'
            )}
          >
            <span className="dot change" /> Changements Urgents
            <span style={{ marginLeft: 'auto', background: '#f5f3ff', color: '#8b5cf6', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800' }}>
              {urgentCounts.changements || 0}
            </span>
          </button>
          <button
            className="urgent-option-item"
            onClick={() => handleSelectOption(
              location.pathname.startsWith('/admin')
                ? '/admin/tasks?kpi=URGENT'
                : '/manager/tasks?kpi=URGENT'
            )}
          >
            <span className="dot task" /> Tâches Urgentes
            <span style={{ marginLeft: 'auto', background: '#fffbeb', color: '#f59e0b', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800' }}>
              {urgentCounts.taches || 0}
            </span>
          </button>
          {(isAdmin || isCM || isCAB) && (
            <button
              className="urgent-option-item"
              onClick={() => handleSelectOption('/cab/meetings?kpi=URGENT')}
            >
              <span className="dot" style={{ background: '#ef4444' }} /> Sessions urgentes
              <span style={{ marginLeft: 'auto', background: '#fef2f2', color: '#ef4444', padding: '2px 8px', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '800' }}>
                {urgentCounts.reunions || 0}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default UrgentAlert;