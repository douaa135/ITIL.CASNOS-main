import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  FiCalendar, FiLayers, FiAlertOctagon, FiChevronLeft, FiChevronRight, 
  FiPlus, FiEdit2, FiTrash2, FiRefreshCw, FiClock, FiActivity, FiSearch, FiInfo, FiCheckCircle, FiXCircle, FiX
} from 'react-icons/fi';
import planningService from '../../services/planningService';
import rfcService from '../../services/rfcService';
import { useAuth } from '../../context/AuthContext';
import Card from './Card';
import Badge from './Badge';
import Toast from './Toast';
import ConfirmModal from './ConfirmModal';
import ChangementDetailModal from '../../pages/admin/components/ChangementDetailModal';
import './Planning.css';

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

const getLocalDateString = (dateObjOrStr) => {
  if (!dateObjOrStr) return null;
  const d = typeof dateObjOrStr === 'string' ? new Date(dateObjOrStr) : dateObjOrStr;
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// ── Modal de création/édition de Blackout ───────────────────────────
const BlackoutModal = ({ selectedBlackout, blackoutForm, setBlackoutForm, onClose, onSave }) => {
  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div 
        className="modal-box-cab glass-card-cab" 
        style={{ 
          maxWidth: '520px', 
          background: '#f0f9ff', 
          border: '1px solid #003366',
          animation: 'modalIn 0.45s cubic-bezier(0.16, 1, 0.3, 1) both' 
        }} 
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalIn {
            from { opacity: 0; transform: scale(0.95) translateY(40px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
        `}</style>

        <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
          <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
            <FiActivity size={20} />
          </div>
          <div className="rfc-style-header-text">
            <h2 style={{ color: '#ffffff' }}>{selectedBlackout ? 'Modifier le Blackout' : 'Nouveau Blackout'}</h2>
            <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Configuration des périodes d'indisponibilité</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose} style={{ color: '#ffffff' }}><FiX size={24} /></button>
        </div>
        
        <div className="modal-body-rfc-style" style={{ padding: '2rem' }}>
          <form onSubmit={onSave}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Libellé de la période</label>
                <input 
                  type="text" 
                  value={blackoutForm.libelle} 
                  onChange={e => setBlackoutForm({...blackoutForm, libelle: e.target.value})} 
                  required 
                  placeholder="Ex: Maintenance serveurs production"
                  style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #bae6fd', fontSize: '0.95rem', outline: 'none', color: '#0f172a', background: '#ffffff' }} 
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type d'indisponibilité</label>
                  <select 
                    value={blackoutForm.type} 
                    onChange={e => setBlackoutForm({...blackoutForm, type: e.target.value})} 
                    style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #bae6fd', fontSize: '0.95rem', outline: 'none', background: '#ffffff', color: '#0f172a', cursor: 'pointer' }}
                  >
                    <option value="PERIODE_CRITIQUE">Gel (Critique)</option>
                    <option value="MAINTENANCE">Maintenance Planifiée</option>
                    <option value="JOUR_FERIE">Jour Férié / Fête</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '1.5rem' }}>
                  <div style={{ position: 'relative', display: 'inline-block', width: '38px', height: '22px' }}>
                    <input 
                      type="checkbox" 
                      id="recurrent" 
                      checked={blackoutForm.recurrent} 
                      onChange={e => setBlackoutForm({...blackoutForm, recurrent: e.target.checked})}
                      style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <label htmlFor="recurrent" style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: blackoutForm.recurrent ? '#10b981' : '#cbd5e1', borderRadius: '34px', transition: '.4s' }}>
                      <span style={{ position: 'absolute', content: '""', height: '16px', width: '16px', left: '3px', bottom: '3px', backgroundColor: 'white', borderRadius: '50%', transition: '.4s', transform: blackoutForm.recurrent ? 'translateX(16px)' : 'translateX(0)' }}></span>
                    </label>
                  </div>
                  <label htmlFor="recurrent" style={{ fontSize: '0.85rem', fontWeight: '700', color: '#475569', cursor: 'pointer' }}>Récurrent annuel</label>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date de début</label>
                  <input 
                    type="date" 
                    value={blackoutForm.date_debut} 
                    onChange={e => setBlackoutForm({...blackoutForm, date_debut: e.target.value})} 
                    required 
                    style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #bae6fd', fontSize: '0.95rem', outline: 'none', color: '#0f172a', background: '#ffffff' }} 
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date de fin</label>
                  <input 
                    type="date" 
                    value={blackoutForm.date_fin} 
                    onChange={e => setBlackoutForm({...blackoutForm, date_fin: e.target.value})} 
                    style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #bae6fd', fontSize: '0.95rem', outline: 'none', color: '#0f172a', background: '#ffffff' }} 
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.7rem', fontWeight: '800', color: '#64748b', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description détaillée</label>
                <textarea 
                  value={blackoutForm.description} 
                  onChange={e => setBlackoutForm({...blackoutForm, description: e.target.value})} 
                  placeholder="Précisez les systèmes ou services impactés..."
                  style={{ width: '100%', padding: '0.875rem 1rem', borderRadius: '12px', border: '1.5px solid #bae6fd', minHeight: '100px', outline: 'none', resize: 'vertical', fontSize: '0.95rem', color: '#0f172a', background: '#ffffff' }} 
                />
              </div>
            </div>

            <div className="modal-footer-rfc-style" style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={onClose} className="btn-cancel-rfc-style" style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: '700' }}>Annuler</button>
              <button type="submit" className="btn-submit-rfc-style" style={{ background: '#003366', color: '#ffffff', border: 'none', padding: '0.75rem 2rem', borderRadius: '12px', fontWeight: '800', boxShadow: '0 4px 12px rgba(0, 51, 102, 0.3)' }}>
                {selectedBlackout ? 'ENREGISTRER' : 'CRÉER LE BLACKOUT'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const Planning = () => {
  const { user } = useAuth();
  
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
    if (user.nom_role) roleList.push(user.nom_role.toUpperCase());
    return roleList.includes(name.toUpperCase());
  };

  const isAdmin = hasRole('ADMIN');

  // State
  const [view, setView] = useState('month'); // 'month' | 'semester' | 'blackouts'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ changements: [], blackouts: [], par_mois: {} });
  const [rfcsMap, setRfcsMap] = useState({});
  const [toast, setToast] = useState(null);
  const [showBlackoutModal, setShowBlackoutModal] = useState(false);
  const [selectedBlackout, setSelectedBlackout] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedChangementForDetail, setSelectedChangementForDetail] = useState(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportForm, setReportForm] = useState({ titre_rapport: '', type_rapport: 'Audit', contenu_rapport: '' });
  
  // Blackout Form State
  const [blackoutForm, setBlackoutForm] = useState({
    libelle: '',
    type: 'PERIODE_CRITIQUE',
    date_debut: '',
    date_fin: '',
    recurrent: false,
    description: ''
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Always fetch all blackouts to ensure consistency across views/semesters
      const [resAllBlackouts, rfcsData] = await Promise.all([
        planningService.getAllBlackouts().catch(() => ({ data: { blackouts: [] } })),
        rfcService.getAllRfcs().catch(() => [])
      ]);
      const allBlackouts = resAllBlackouts.data?.blackouts || resAllBlackouts.blackouts || resAllBlackouts.data || [];

      const rMap = {};
      (rfcsData || []).forEach(r => {
        if (r && r.id_rfc) {
          rMap[r.id_rfc] = r;
        }
      });
      setRfcsMap(rMap);

      if (view === 'month') {
        const res = await planningService.getVueMois(currentDate.getFullYear(), currentDate.getMonth() + 1);
        const payload = res.data?.data || res.data || res;
        setData(prev => ({ 
          ...prev,
          changements: payload.changements || [], 
          blackouts: allBlackouts, // Use global list
          weekends: payload.weekends || []
        }));
      } else if (view === 'semester') {
        const semester = currentDate.getMonth() < 6 ? 1 : 2;
        const res = await planningService.getVueSemestre(currentDate.getFullYear(), semester);
        const payload = res.data?.data || res.data || res;
        setData(prev => ({
          ...prev,
          changements: payload.changements || [],
          blackouts: allBlackouts, // Use global list
          par_mois: payload.par_mois || {},
          weekends: payload.weekends || []
        }));
      } else if (view === 'blackouts') {
        const res = await planningService.getAllBlackouts();
        const payload = res.data?.data || res.data || res;
        setData(prev => ({ ...prev, blackouts: payload.blackouts || payload || [] }));
      }
    } catch (error) {
      console.error('Fetch Planning Error:', error);
      setToast({ msg: 'Erreur lors du chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [view, currentDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(next.getMonth() - 1);
    else if (view === 'semester') next.setMonth(next.getMonth() - 6);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (view === 'month') next.setMonth(next.getMonth() + 1);
    else if (view === 'semester') next.setMonth(next.getMonth() + 6);
    setCurrentDate(next);
  };

  const handleCreateBlackout = async (e) => {
    e.preventDefault();
    try {
      // Si date_fin est vide, on prend la valeur de date_debut par défaut
      const payloadToSubmit = { ...blackoutForm };
      if (!payloadToSubmit.date_fin) {
        payloadToSubmit.date_fin = payloadToSubmit.date_debut;
      }

      if (selectedBlackout) {
        await planningService.updateBlackout(selectedBlackout.id_blackout, payloadToSubmit);
        setToast({ msg: 'Période blackout mise à jour', type: 'success' });
      } else {
        await planningService.createBlackout(payloadToSubmit);
        setToast({ msg: 'Blackout créé avec succès', type: 'success' });
      }
      setShowBlackoutModal(false);
      fetchData();
    } catch (error) {
      const errMsg = error.response?.data?.error?.message || error.response?.data?.message || error.message || 'Erreur lors de la sauvegarde';
      setToast({ msg: errMsg, type: 'error' });
    }
  };

  const handleDeleteBlackout = async () => {
    if (!confirmDel) return;
    try {
      await planningService.deleteBlackout(confirmDel.id_blackout);
      setToast({ msg: 'Période blackout supprimée', type: 'error' });
      setConfirmDel(null);
      fetchData();
    } catch (error) {
      setToast({ msg: 'Erreur lors de la suppression', type: 'error' });
    }
  };

  // ── Rendering Helpers ──────────────────────────────────────────

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Aligner sur lundi (0=dimanche dans JS, on veut Lun=0)
    // index 0=dim, 1=lun... => (day + 6) % 7
    const offset = (firstDay + 6) % 7; 
    
    const cells = [];
    // Previous month days - keep as empty placeholders to maintain grid structure
    for (let i = offset - 1; i >= 0; i--) {
      cells.push({ day: null, type: 'other' });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({ day: i, type: 'current', date: new Date(year, month, i) });
    }
    // Next month days - keep as empty placeholders
    const remaining = 42 - cells.length;
    for (let i = 1; i <= remaining; i++) {
      cells.push({ day: null, type: 'other' });
    }

    return (
      <div className="calendar-grid">
        {['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'].map((d, i) => (
          <div key={d} className={`calendar-day-header ${i === 4 || i === 5 ? 'weekend' : ''}`}>{d}</div>
        ))}
        {cells.map((cell, idx) => {
          const isToday = cell.type === 'current' && cell.date.toDateString() === new Date().toDateString();
          const iso = cell.date ? getLocalDateString(cell.date) : null;
          
          const dayChanges = iso ? data.changements.filter(c => {
            const start = getLocalDateString(c.date_debut);
            const end = getLocalDateString(c.date_fin_prevu) || start;
            return iso >= start && iso <= end;
          }) : [];

          const dayBlackouts = iso ? data.blackouts.filter(b => {
            const start = getLocalDateString(b.date_debut);
            const end = getLocalDateString(b.date_fin);
            if (b.recurrent) {
                const bM = new Date(b.date_debut).getMonth();
                const bD = new Date(b.date_debut).getDate();
                const fM = new Date(b.date_fin).getMonth();
                const fD = new Date(b.date_fin).getDate();
                const curM = cell.date.getMonth();
                const curD = cell.date.getDate();
                // Simplification récurrence
                return curM >= bM && curM <= fM && curD >= bD && curD <= fD;
            }
            return iso >= start && iso <= end;
          }) : [];

          const isWE = cell.date && (cell.date.getDay() === 5 || cell.date.getDay() === 6); // Vendredi / Samedi

          return (
            <div key={idx} className={`calendar-day-cell ${cell.type === 'other' ? 'other-month' : ''} ${isToday ? 'today' : ''} ${isWE ? 'weekend' : ''}`}>
              {!isWE && cell.day && <div className="day-number">{cell.day}</div>}
              {isWE && cell.type === 'current' && (
                <div className="weekend-label-centered">WEEKEND</div>
              )}
              
              {dayBlackouts.map(b => (
                <div key={b.id_blackout} className="calendar-event event-blackout" title={b.description}>
                  <FiAlertOctagon size={10} /> {b.libelle}
                </div>
              ))}

              {dayChanges.map(c => (
                <div 
                  key={c.id_changement} 
                  className={`calendar-event event-change ${c.statut?.code_statut}`} 
                  title={c.planChangement?.titre_plan || c.rfc?.titre_rfc || 'Changement Standard'}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedChangementForDetail(c);
                    setShowDetailModal(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  #{c.code_changement} {c.planChangement?.titre_plan || c.rfc?.titre_rfc || 'Changement Standard'}
                </div>
              ))}

              {/* Weekend label removed as requested */}
            </div>
          );
        })}
      </div>
    );
  };

  const renderSemesterView = () => {
    const startMois = currentDate.getMonth() < 6 ? 0 : 6;
    const year = currentDate.getFullYear();
    
    return (
      <div className="semester-grid">
        {[0, 1, 2, 3, 4, 5].map(offset => {
          const mIndex = startMois + offset;
          const dateRef = new Date(year, mIndex, 1);
          const daysInMonth = new Date(year, mIndex + 1, 0).getDate();
          const firstDay = new Date(year, mIndex, 1).getDay();
          const startOffset = (firstDay + 6) % 7;

          const days = [];
          for (let i = 0; i < startOffset; i++) days.push(null);
          for (let i = 1; i <= daysInMonth; i++) days.push(i);

          const localMonthStr = getLocalDateString(dateRef);
          const monthKey = localMonthStr ? localMonthStr.slice(0, 7) : dateRef.toISOString().slice(0, 7);
          const monthChanges = data.par_mois?.[monthKey] || [];

          return (
            <div key={offset} className="mini-month">
              <div className="mini-month-title">{MONTHS_FR[mIndex]} {year}</div>
              <div className="mini-grid">
                {['L','M','M','J','V','S','D'].map((d, i) => <div key={i} className={`mini-day-header ${i === 4 || i === 5 ? 'weekend' : ''}`}>{d}</div>)}
                {days.map((d, i) => {
                  if (!d) return <div key={i} className="mini-day empty"></div>;
                  
                  const iso = `${monthKey}-${String(d).padStart(2, '0')}`;

                  // Check using par_mois (date_debut match) + flat changements (range match)
                  const hasChange =
                    monthChanges.some(c => {
                      const start = getLocalDateString(c.date_debut);
                      const end = getLocalDateString(c.date_fin_prevu) || start;
                      return iso >= start && iso <= end;
                    }) ||
                    data.changements.some(c => {
                      const start = getLocalDateString(c.date_debut);
                      const end = getLocalDateString(c.date_fin_prevu) || start;
                      return iso >= start && iso <= end;
                    });

                  const hasBlackout = data.blackouts.some(b => {
                    const start = getLocalDateString(b.date_debut);
                    const end = getLocalDateString(b.date_fin);
                    if (b.recurrent) {
                        const bM = new Date(b.date_debut).getMonth();
                        const bD = new Date(b.date_debut).getDate();
                        const fM = new Date(b.date_fin).getMonth();
                        const fD = new Date(b.date_fin).getDate();
                        const curDate = new Date(year, mIndex, d);
                        const curM = curDate.getMonth();
                        const curD = curDate.getDate();
                        return curM >= bM && curM <= fM && curD >= bD && curD <= fD;
                    }
                    return iso >= start && iso <= end;
                  });

                  // Sat/Sun (columns 5 and 6, 0-indexed from Monday)
                  const isWeekendMini = (i % 7 === 4 || i % 7 === 5);

                  const cellStyle =
                    hasBlackout ? { background: '#ef4444', color: '#ffffff', borderRadius: '4px' } :
                    hasChange   ? { background: '#3b82f6', color: '#ffffff', borderRadius: '4px' } :
                    {};

                  return (
                    <div 
                      key={i} 
                      className={`mini-day ${hasChange ? 'has-change' : ''} ${hasBlackout ? 'has-blackout' : ''} ${isWeekendMini ? 'weekend-mini' : ''}`}
                      style={cellStyle}
                    >
                      {(hasBlackout || hasChange)
                        ? d
                        : (!isWeekendMini ? d : <span style={{ fontSize: '0.5rem', opacity: 0.5 }}>WE</span>)
                      }
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderBlackoutList = () => (
    <div className="blackout-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontWeight: 800 }}>Périodes d'indisponibilité (Blackouts)</h3>
        {isAdmin && (
          <button className="btn-create-premium" onClick={() => {
            setSelectedBlackout(null);
            setBlackoutForm({ libelle: '', type: 'PERIODE_CRITIQUE', date_debut: '', date_fin: '', recurrent: false, description: '' });
            setShowBlackoutModal(true);
          }}>
            <FiPlus /> Ajouter un Blackout
          </button>
        )}
      </div>
      
      <table className="blackout-list-table">
        <thead>
          <tr>
            <th>Code</th>
            <th>Libellé</th>
            <th>Type</th>
            <th>Début</th>
            <th>Fin</th>
            <th>Récurrent</th>
            {isAdmin && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {data.blackouts.length > 0 ? data.blackouts.map(b => (
            <tr key={b.id_blackout}>
              <td style={{ fontWeight: 700, color: '#0369a1' }}>{b.code_metier}</td>
              <td>{b.libelle}</td>
              <td>
                <span className={`blackout-type-badge type-${b.type?.toLowerCase()}`}>
                  {b.type}
                </span>
              </td>
              <td>{new Date(b.date_debut).toLocaleDateString()}</td>
              <td>{new Date(b.date_fin).toLocaleDateString()}</td>
              <td>{b.recurrent ? <Badge variant="success">Oui</Badge> : <Badge variant="default">Non</Badge>}</td>
              {isAdmin && (
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => {
                      setSelectedBlackout(b);
                      setBlackoutForm({
                        libelle: b.libelle,
                        type: b.type,
                        date_debut: b.date_debut.split('T')[0],
                        date_fin: b.date_fin.split('T')[0],
                        recurrent: b.recurrent,
                        description: b.description || ''
                      });
                      setShowBlackoutModal(true);
                    }} style={{ color: '#3b82f6', border: 'none', background: 'none', cursor: 'pointer' }}><FiEdit2 /></button>
                    <button onClick={() => setConfirmDel(b)} style={{ color: '#ef4444', border: 'none', background: 'none', cursor: 'pointer' }}><FiTrash2 /></button>
                  </div>
                </td>
              )}
            </tr>
          )) : (
            <tr><td colSpan={isAdmin ? 7 : 6} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>Aucune période blackout enregistrée</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="planning-page">
      {/* Header */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f0f9ff', color: '#0369a1', borderColor: '#bae6fd' }}><FiCalendar /></div>
          <div className="premium-header-text">
            <h1>Planification & Ordonnancement</h1>
            <p>Gérez le calendrier des changements et les périodes de gel (blackouts).</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={fetchData} style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#fff' }}>
            <FiRefreshCw /> Actualiser
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="planning-tabs">
        <div className={`tab-item ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>
          <FiCalendar /> Calendrier Mensuel
        </div>
        <div className={`tab-item ${view === 'semester' ? 'active' : ''}`} onClick={() => setView('semester')}>
          <FiLayers /> Vue Semestrielle
        </div>
        <div className={`tab-item ${view === 'blackouts' ? 'active' : ''}`} onClick={() => setView('blackouts')}>
          <FiAlertOctagon /> Périodes Blackout
        </div>
      </div>

      {/* Controls */}
      {view !== 'blackouts' && (
        <div className="calendar-controls">
          <button className="control-btn" onClick={handlePrev}><FiChevronLeft /></button>
          <div className="current-period-label">
            {view === 'month' 
              ? `${MONTHS_FR[currentDate.getMonth()]} ${currentDate.getFullYear()}`
              : `Semestre ${currentDate.getMonth() < 6 ? '1' : '2'} - ${currentDate.getFullYear()}`
            }
          </div>
          <button className="control-btn" onClick={handleNext}><FiChevronRight /></button>
        </div>
      )}

      {/* Views */}
      <div className="planning-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem', color: '#64748b' }}>
            <FiRefreshCw className="spin" size={40} />
            <p style={{ marginTop: '1rem', fontWeight: 600 }}>Chargement du planning...</p>
          </div>
        ) : (
          <>
            {view === 'month' && renderMonthView()}
            {view === 'semester' && renderSemesterView()}
            {view === 'blackouts' && renderBlackoutList()}
          </>
        )}
      </div>

      {showBlackoutModal && (
        <BlackoutModal
          selectedBlackout={selectedBlackout}
          blackoutForm={blackoutForm}
          setBlackoutForm={setBlackoutForm}
          onClose={() => setShowBlackoutModal(false)}
          onSave={handleCreateBlackout}
        />
      )}

      {confirmDel && (
        <ConfirmModal
          isOpen={!!confirmDel}
          title="Supprimer la période blackout"
          message={`Êtes-vous sûr de vouloir supprimer "${confirmDel.libelle}" ?`}
          onConfirm={handleDeleteBlackout}
          onCancel={() => setConfirmDel(null)}
          variant="danger"
        />
      )}

      {showDetailModal && (
        <ChangementDetailModal
          show={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedChangementForDetail(null);
            setShowReportForm(false);
          }}
          selectedChangement={selectedChangementForDetail}
          showReportForm={showReportForm}
          setShowReportForm={setShowReportForm}
          reportForm={reportForm}
          setReportForm={setReportForm}
          handleCreateReport={() => {
            setToast({ msg: "La gestion des rapports est réservée à l'espace d'administration des changements", type: 'warning' });
            setShowReportForm(false);
          }}
          getStatusColor={(code) => {
            switch (code) {
                case 'EN_PLANIFICATION': return 'info';
                case 'PLANIFIEE': return 'warning';
                case 'EN_COURS': return 'primary';
                case 'REUSSI': return 'success';
                case 'EN_ECHEC': return 'danger';
                case 'ANNULEE': return 'default';
                default: return 'default';
            }
          }}
          rfcsMap={rfcsMap}
        />
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default Planning;
