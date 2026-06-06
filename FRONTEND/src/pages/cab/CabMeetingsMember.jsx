import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  FiCalendar, FiClock, FiCheckCircle, FiUsers, FiTrendingUp,
  FiCheck, FiX, FiInfo, FiPlus, FiLayers, FiHash, FiShield, FiSearch, FiAlertTriangle,
  FiFileText, FiAlertCircle, FiThumbsUp, FiThumbsDown, FiMinus, FiEdit3, FiSave, FiMessageSquare
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import '../changemanager/CabMeetings.css';
import '../admin/AdminUnified.css';

const CabMeetingsMember = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [meetings, setMeetings]         = useState([]);
  const [cabs, setCabs]                 = useState([]);
  const [selectedCab, setSelectedCab]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [rfcs, setRfcs]                 = useState([]);
  const [votes, setVotes]               = useState([]);
  const [participants, setParticipants] = useState([]);
  const [decisions, setDecisions]       = useState([]);
  const [activeTab, setActiveTab]       = useState('rfcs_votes');
  const [toast, setToast]               = useState(null);
  const [showRecModal, setShowRecModal] = useState(false);
  const [currentRecs, setCurrentRecs]   = useState(null);
  const [votingRfcId, setVotingRfcId]   = useState(null); 
  const [voteResultModal, setVoteResultModal] = useState(null);
  const [kpiFilter, setKpiFilter]       = useState('');
  const [searchTerm, setSearchTerm]     = useState('');

  // ── Evaluation Modal State ──
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [selectedRfcForEval, setSelectedRfcForEval]   = useState(null);
  const [submittingEval, setSubmittingEval]           = useState(false);
  const [evaluation, setEvaluation] = useState({
    impact_business:   '',
    impact_technique:  '',
    impact_securite:   '',
    niveau_risque:     'FAIBLE',
    tests_valides:     false,
    conditions:        '',
    securite_rollback: '',
    precautions:       '',
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const cabsRes = await api.get('/cab');
      const allCabs = cabsRes?.data?.cabs || cabsRes?.cabs || [];

      // Garder seulement les CABs dont l'utilisateur est membre
      const myCabs = allCabs.filter(cab =>
        (cab.membres || []).some(m =>
          String(m.utilisateur?.id_user || m.id_user || '') === String(currentUser.id_user)
        )
      );
      setCabs(myCabs);

      const allMeetings = [];
      for (const cab of myCabs) {
        try {
          const rRes = await api.get(`/cab/${cab.id_cab}/reunions`);
          const reunions = rRes?.data?.reunions || rRes?.reunions || [];
          reunions.forEach(r => allMeetings.push({
            ...r,
            id_cab:      cab.id_cab,
            cab_nom:     cab.nom_cab,
            cab_type:    cab.type_cab,
            cab_membres: cab.membres || []
          }));
        } catch (_) { }
      }
      setMeetings(allMeetings);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id_user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    setKpiFilter(params.get('kpi') || '');
  }, [location.search]);

  const fetchMeetingDetails = useCallback(async (meetingId) => {
    try {
      const [rfcsRes, votesRes, partsRes, decsRes] = await Promise.all([
        api.get(`/reunions/${meetingId}/rfcs`),
        api.get(`/reunions/${meetingId}/votes`),
        api.get(`/reunions/${meetingId}/participants`),
        api.get(`/reunions/${meetingId}/decisions`),
      ]);
      setRfcs(rfcsRes?.data?.rfcs         || rfcsRes?.rfcs         || []);
      setVotes(votesRes?.data?.votes       || votesRes?.votes       || []);
      setParticipants(partsRes?.data?.participants || partsRes?.participants || []);
      setDecisions(decsRes?.data?.decisions || decsRes?.decisions   || []);
    } catch (error) {
      console.error('Erreur détails réunion:', error);
      setToast({ msg: 'Erreur lors du chargement des détails.', type: 'error' });
    }
  }, []);

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    fetchMeetingDetails(meeting.id_reunion);
  };

  const handleVote = async (rfcId, voteValue) => {
    if (!selectedMeeting) return;
    setVotingRfcId(rfcId);
    try {
      await api.post(
        `/reunions/${selectedMeeting.id_reunion}/rfcs/${rfcId}/votes`,
        { id_user: currentUser.id_user, valeur_vote: voteValue }
      );
      
      // Modal de succès
      setVoteResultModal({
        type: voteValue === 'APPROUVER' ? 'success' : 'error',
        label: voteValue === 'APPROUVER' ? 'Vote « Approuver » enregistré !' : 'Vote « Rejeter » enregistré.'
      });

      await fetchMeetingDetails(selectedMeeting.id_reunion);
      return true;
    } catch (error) {
      const msg = error?.error?.message || error?.message || 'Erreur lors du vote';
      setToast({ msg, type: 'error' });
      return false;
    } finally {
      setVotingRfcId(null);
    }
  };

  const handleEvaluationClick = async (rfc) => {
    // 1. Fetch full RFC details
    try {
      const detailRes = await api.get(`/rfc/${rfc.id_rfc}`);
      const fullRfc = detailRes.data?.rfc || detailRes.data?.data?.rfc || detailRes.data;
      const rfcToUse = Array.isArray(fullRfc) ? fullRfc[0] : fullRfc;
      setSelectedRfcForEval(rfcToUse || rfc);
    } catch (e) {
      console.error("Erreur fetch RFC details:", e);
      setSelectedRfcForEval(rfc);
    }

    setEvaluation({
      impact_business:   '',
      impact_technique:  '',
      impact_securite:   '',
      niveau_risque:     'FAIBLE',
      tests_valides:     false,
      conditions:        '',
      securite_rollback: '',
      precautions:       '',
    });

    try {
      const riskRes = await api.get(`/rfc/${rfc.id_rfc}/evaluation-risque`);
      const globalEval = riskRes.data?.evaluation || riskRes.data?.data?.evaluation;
      if (globalEval && globalEval.description) {
        try {
          const p = JSON.parse(globalEval.description);
          setEvaluation(prev => ({
            ...prev,
            impact_business:  p.impact_business || '',
            impact_technique: p.impact_technique || '',
            niveau_risque:    p.niveau_risque || 'FAIBLE',
          }));
        } catch(e){}
      }
    } catch(e){}

    try {
      const commRes = await api.get(`/rfc/${rfc.id_rfc}/commentaires`);
      const allComments = commRes.data?.commentaires || commRes.data?.data?.commentaires || [];
      // Find the LATEST JSON comment from current user
      const myComment = [...allComments]
        .reverse()
        .find(c => (c.utilisateur?.id_user || c.id_user) === currentUser.id_user && c.contenu?.startsWith('{'));
        
      if (myComment) {
        try {
          const p = JSON.parse(myComment.contenu);
          setEvaluation(prev => ({
            ...prev,
            impact_business:   p.impact_business || '',
            impact_technique:  p.impact_technique || '',
            niveau_risque:     p.niveau_risque || 'FAIBLE',
            conditions:        p.conditions || '',
            securite_rollback: p.securite_rollback || '',
            precautions:       p.precautions || '',
          }));
        } catch(e){}
      } else {
        // Fallback: try to get global risk if no personal comment yet
        try {
          const riskRes = await api.get(`/rfc/${rfc.id_rfc}/evaluation-risque`);
          const globalEval = riskRes.data?.evaluation || riskRes.data?.data?.evaluation;
          if (globalEval && globalEval.description) {
            const p = JSON.parse(globalEval.description);
            setEvaluation(prev => ({
              ...prev,
              impact_business:  p.impact_business || '',
              impact_technique: p.impact_technique || '',
              niveau_risque:    p.niveau_risque || 'FAIBLE',
            }));
          }
        } catch(e){}
      }
    } catch(e){}

    setShowEvaluationModal(true);
  };

  const handleOpenRecommendations = async (rfc) => {
    try {
      const res = await api.get(`/rfc/${rfc.id_rfc}/commentaires`);
      const allComments = res.data?.commentaires || res.data?.data?.commentaires || [];
      // Look for the LATEST JSON comment
      const myComment = [...allComments].reverse().find(c => 
        (c.utilisateur?.id_user || c.id_user) === currentUser.id_user && 
        c.contenu && c.contenu.startsWith('{')
      );

      if (myComment) {
        const p = JSON.parse(myComment.contenu);
        setCurrentRecs({
          rfcCode: rfc.code_rfc,
          niveau_risque: p.niveau_risque || 'FAIBLE',
          impact_business: p.impact_business || '—',
          impact_technique: p.impact_technique || '—',
          conditions: p.conditions || '—',
          securite_rollback: p.securite_rollback || '—',
          precautions: p.precautions || '—',
          empty: false
        });
      } else {
        setCurrentRecs({ empty: true });
      }
      setShowRecModal(true);
    } catch (error) {
      setToast({ msg: "Impossible de charger les recommandations.", type: 'error' });
    }
  };

  const handleSubmitEvaluation = async (shouldClose = true) => {
    if (!selectedRfcForEval) return;
    setSubmittingEval(true);
    try {
      const motif = JSON.stringify({
        impact_business:   evaluation.impact_business,
        impact_technique:  evaluation.impact_technique,
        niveau_risque:     evaluation.niveau_risque,
        conditions:        evaluation.conditions,
        securite_rollback: evaluation.securite_rollback,
        precautions:       evaluation.precautions,
      });
      await api.post(`/rfc/${selectedRfcForEval.id_rfc}/commentaires`, { contenu: motif });
      
      if (shouldClose) {
        setShowEvaluationModal(false);
      }
      
      setToast({ msg: 'Recommandations enregistrées.', type: 'success' });
    } catch (error) {
      const msg = error?.error?.message || error?.message || 'Erreur lors de la sauvegarde';
      setToast({ msg, type: 'error' });
    } finally {
      setSubmittingEval(false);
    }
  };

  const baseMeetings = meetings.filter(m => {
    if (selectedCab && m.id_cab !== selectedCab.id_cab) return false;
    return true;
  });

  const sortedMeetings = [...baseMeetings]
    .filter(m => {
      if (kpiFilter === 'UPCOMING') return new Date(m.date_reunion) > new Date();
      if (kpiFilter === 'PAST')     return new Date(m.date_reunion) <= new Date();
      if (kpiFilter === 'URGENT')   return ['URGENCE', 'URGENT'].includes(m.cab_type?.toUpperCase());
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return m.ordre_jour?.toLowerCase().includes(term) || m.cab_nom?.toLowerCase().includes(term);
      }
      return true;
    })
    .sort((a, b) => new Date(b.date_reunion) - new Date(a.date_reunion));

  return (
    <div className="cm-page">
      {voteResultModal && (
        <div onClick={() => setVoteResultModal(null)} className="cab-modal-overlay">
          <div onClick={e => e.stopPropagation()} className="cab-modal" style={{ maxWidth: '380px', textAlign: 'center', padding: '2rem' }}>
            <div style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'center' }}>
              {voteResultModal.type === 'success' ? <FiCheckCircle size={48} color="#15803d" /> : <FiX size={48} color="#b91c1c" />}
            </div>
            <h2 style={{ color: voteResultModal.type === 'success' ? '#15803d' : '#b91c1c', margin: '0 0 0.5rem' }}>{voteResultModal.type === 'success' ? 'Vote Approuvé' : 'Vote Rejeté'}</h2>
            <p style={{ color: '#64748b', marginBottom: '2rem' }}>{voteResultModal.label}</p>
            <button onClick={() => setVoteResultModal(null)} className="btn-primary" style={{ width: '100%', background: voteResultModal.type === 'success' ? '#22c55e' : '#ef4444', justifyContent: 'center' }}>Fermer</button>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      <div className="premium-header-card" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: '1rem 0' }}>
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#e0f2fe', color: '#003366', borderColor: '#bae6fd' }}><FiCalendar /></div>
          <div className="premium-header-text">
            <h1>Espace Réunions CAB</h1>
            <p>Participation aux votes et consultation des sessions</p>
          </div>
        </div>
        <div className="premium-header-actions">
          {cabs.length > 0 && (
            <select className="cm-cab-select" value={selectedCab?.id_cab || ''} onChange={e => setSelectedCab(e.target.value ? cabs.find(c => c.id_cab === e.target.value) : null)}>
              <option value="">Tous les comités</option>
              {cabs.map(c => <option key={c.id_cab} value={c.id_cab}>{c.nom_cab}</option>)}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'À venir', value: baseMeetings.filter(m => new Date(m.date_reunion) > new Date()).length, filter: 'UPCOMING', colorClass: 'purple', icon: <FiClock size={24} /> },
          { label: 'Urgentes', value: baseMeetings.filter(m => ['URGENT','URGENCE'].includes(m.cab_type?.toUpperCase())).length, filter: 'URGENT', colorClass: 'red', icon: <FiAlertTriangle size={24} /> },
        ].map(k => (
          <div key={k.filter} className={`stat-card ${k.colorClass} ${kpiFilter === k.filter ? 'active' : ''}`} onClick={() => setKpiFilter(k.filter)} style={{ cursor: 'pointer' }}>
            <div className="stat-icon-wrapper">{k.icon}</div>
            <div className="stat-info"><div className="stat-value">{k.value}</div><div className="stat-label">{k.label}</div></div>
          </div>
        ))}
      </div>

      <div className="cm-layout">
        <div className="cm-sidebar">
          <div className="cm-sidebar-title">Sessions Planifiées<span className="cm-sidebar-badge">{sortedMeetings.length}</span></div>
          <div className="cm-sidebar-search">
            <FiSearch className="cm-search-icon" />
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <div className="cm-scroll-list">
            {loading ? <div className="cm-loading">Chargement...</div> : sortedMeetings.map(meeting => (
              <div key={meeting.id_reunion} className={`cm-meeting-item ${selectedMeeting?.id_reunion === meeting.id_reunion ? 'selected' : ''}`} onClick={() => handleSelectMeeting(meeting)}>
                <div className="cm-date-badge">
                  <span className="cm-day">{new Date(meeting.date_reunion).getDate()}</span>
                  <span className="cm-month">{new Date(meeting.date_reunion).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                </div>
                <div className="cm-meeting-info">
                  <div className="cm-meeting-title">{meeting.ordre_jour || 'Session CAB'}</div>
                  <div className="cm-meeting-meta">{meeting.cab_nom}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="cm-workspace">
          {selectedMeeting ? (
            <div className="cm-workspace-inner">
              <div className="cm-workspace-header">
                <div style={{ flex: 1 }}>
                  <h2>{selectedMeeting.ordre_jour || 'Session sans titre'}</h2>
                  <div className="cm-meta-row">
                    <span><FiLayers /> {selectedMeeting.cab_nom}</span>
                    <span><FiUsers /> {participants.length} participants</span>
                  </div>
                </div>
                <button className="cm-close-btn" onClick={() => setSelectedMeeting(null)}><FiX /></button>
              </div>

              <div className="cm-tabs">
                <button className={`cm-tab-btn ${activeTab === 'rfcs_votes' ? 'active' : ''}`} onClick={() => setActiveTab('rfcs_votes')}><FiTrendingUp /> RFC & Vote</button>
                <button className={`cm-tab-btn ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => setActiveTab('participants')}><FiUsers /> Participants</button>
              </div>

              <div className="cm-content">
                {activeTab === 'rfcs_votes' && (
                  <div className="cm-votes-view">
                    {rfcs.map(rfc => {
                      const rfcVotes = votes.filter(v => v.id_rfc === rfc.id_rfc);
                      const myVote = rfcVotes.find(v => (v.utilisateur?.id_user || v.id_user) === currentUser.id_user);
                      const isClosed = decisions.some(d => d.id_rfc === rfc.id_rfc);
                      const rfcDecision = decisions.find(d => d.id_rfc === rfc.id_rfc);
                      
                      // Mettre en évidence le statut du Président (optionnel, selon la demande)
                      const president = selectedMeeting.cab_membres?.find(m => m.role === 'PRESIDENT');
                      const appCount = rfcVotes.filter(v => v.valeur_vote === 'APPROUVER').length;
                      const rejCount = rfcVotes.filter(v => v.valeur_vote === 'REJETER').length;
                      const totalVotes = appCount + rejCount;

                      return (
                        <div key={rfc.id_rfc} className={`cm-rfc-vote-card ${isClosed ? 'closed' : ''}`} onClick={() => handleEvaluationClick(rfc)} style={{ cursor: 'pointer', position: 'relative' }}>
                          
                          <div className="cm-rvc-header">
                            <div className="cm-rvc-title-box">
                              <span className="cm-rfc-code">#{rfc.code_rfc}</span>
                              <h4>{rfc.titre_rfc}</h4>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {!isClosed && !myVote && <div style={{ color: '#6366f1', fontSize: '0.85rem', fontWeight: 700 }}>Évaluer et voter</div>}
                              {rfcDecision && <div className={`cm-decision-badge ${rfcDecision.decision.toLowerCase()}`}>{rfcDecision.decision}</div>}
                              {myVote && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div className={`cm-v-tag ${myVote.valeur_vote.toLowerCase()}`}>{myVote.valeur_vote}</div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleOpenRecommendations(rfc); }}
                                    className="cm-rec-icon-btn"
                                    style={{ 
                                      background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#6366f1', 
                                      width: '28px', height: '28px', borderRadius: '6px', 
                                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' 
                                    }}
                                    title="Voir mes recommandations"
                                  >
                                    <FiFileText size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                            <div className="cm-rvc-stats-bar">
                              <div className="cm-rvc-stat-item rej">
                                <span className="cm-rvc-stat-n">{rejCount}</span>
                                <span className="cm-rvc-stat-l">Contre</span>
                                <div className="cm-rvc-progress"><div style={{ width: `${(rejCount / (totalVotes || 1)) * 100}%` }}></div></div>
                              </div>
                              <div className="cm-rvc-stat-item app">
                                <span className="cm-rvc-stat-n">{appCount}</span>
                                <span className="cm-rvc-stat-l">Pour</span>
                                <div className="cm-rvc-progress"><div style={{ width: `${(appCount / (totalVotes || 1)) * 100}%` }}></div></div>
                              </div>
                            </div>
                          </div>
                      );
                    })}
                  </div>
                )}
                {activeTab === 'participants' && (
                  <div className="cm-participants-view">
                    <div className="cm-section-card">
                      <h4>Membres Permanents</h4>
                      <div className="cm-members-grid">
                        {selectedMeeting.cab_membres?.map(m => {
                          const isPresident = m.role === 'PRESIDENT';
                          return (
                            <div key={m.id_user} className="cm-member-badge-card" style={isPresident ? { border: '2px solid #fbbf24', background: '#fffbeb' } : {}}>
                              <div className="cm-mbc-avatar" style={isPresident ? { background: '#fbbf24' } : {}}>{(m.utilisateur?.prenom_user || '?')[0]}</div>
                              <div className="cm-mbc-body">
                                <span>{m.utilisateur?.prenom_user} {m.utilisateur?.nom_user}</span>
                                {isPresident && <span style={{ fontSize: '0.65rem', color: '#b45309', fontWeight: 800 }}>PRÉSIDENT</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : <div className="cm-placeholder"><h2>Sélectionnez une session</h2></div>}
        </div>
      </div>

      {showEvaluationModal && selectedRfcForEval && (
        <div className="cab-modal-backdrop" onClick={() => setShowEvaluationModal(false)}>
          <div className="cab-modal cab-modal--xl premium-evaluation" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style premium">
              <div className="rfc-style-icon-wrapper">
                <FiFileText size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Évaluation Détaillée — #{selectedRfcForEval.code_rfc}</h2>
                <div className="rfc-style-subtitle">{selectedRfcForEval.titre_rfc}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowEvaluationModal(false)} style={{ marginTop: '5px' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              <div className="evaluation-form">
                {/* Détails RFC — lecture seule */}
                <div className="eval-section">
                  <h3><FiFileText style={{ marginRight: '8px' }}/>Détails de la RFC</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Description */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                        Description
                      </div>
                      <div style={{
                        background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                        padding: '0.875rem 1rem', fontSize: '0.875rem', lineHeight: '1.7',
                        color: selectedRfcForEval.description ? '#334155' : '#94a3b8',
                        fontStyle: selectedRfcForEval.description ? 'normal' : 'italic',
                        userSelect: 'text', minHeight: '72px'
                      }}>
                        {selectedRfcForEval.description || 'Aucune description fournie.'}
                      </div>
                    </div>

                    {/* Justification Business */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }} />
                        Justification Business
                      </div>
                      <div style={{
                        background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '10px',
                        padding: '0.875rem 1rem', fontSize: '0.875rem', lineHeight: '1.7',
                        color: selectedRfcForEval.justification ? '#4c1d95' : '#94a3b8',
                        fontStyle: selectedRfcForEval.justification ? 'normal' : 'italic',
                        userSelect: 'text', minHeight: '60px'
                      }}>
                        {selectedRfcForEval.justification || 'Aucune justification fournie.'}
                      </div>
                    </div>

                    {/* Statut Actuel */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        Statut Actuel
                      </div>
                      {(() => {
                        const code  = selectedRfcForEval.statut?.code_statut || selectedRfcForEval.statut_rfc || '';
                        const label = selectedRfcForEval.statut?.libelle || code || '—';
                        const cfg = {
                          SOUMISE:   { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                          EN_COURS:  { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
                          APPROUVEE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                          REJETEE:   { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                          AJOURNEE:  { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
                          CLOTUREE:  { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
                        };
                        const s = cfg[code] || { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' };
                        return (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            background: s.bg, color: s.color, border: `1.5px solid ${s.border}`,
                            padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.875rem'
                          }}>
                            {label}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Score (Si disponible) */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                        Score
                      </div>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '6px',
                        background: '#fffbeb', color: '#b45309', border: '1.5px solid #fde68a',
                        padding: '6px 16px', borderRadius: '20px', fontWeight: '700', fontSize: '0.875rem'
                      }}>
                        {selectedRfcForEval.evaluationRisque?.score_risque !== undefined && selectedRfcForEval.evaluationRisque?.score_risque !== null ? selectedRfcForEval.evaluationRisque.score_risque : 'Non évalué'}
                      </span>
                    </div>

                  </div>
                </div>

                {/* Risque */}
                <div className="eval-section">
                  <h3><FiAlertTriangle style={{ marginRight: '8px' }}/>Évaluation des Risques</h3>
                  <div className="risk-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'].map(risk => (
                      <button
                        key={risk}
                        type="button"
                        className={`risk-btn ${evaluation.niveau_risque === risk ? 'active' : ''}`}
                        onClick={() => setEvaluation({...evaluation, niveau_risque: risk})}
                        style={{ 
                          padding: '0.5rem 1rem', borderRadius: '8px', border: '2px solid transparent', cursor: 'pointer', fontWeight: '700', fontSize: '0.8rem',
                          '--risk-color': risk === 'FAIBLE' ? '#10b981' : risk === 'MOYEN' ? '#f59e0b' : risk === 'ELEVE' ? '#ef4444' : '#7c2d12',
                          borderColor: evaluation.niveau_risque === risk ? 'var(--risk-color)' : '#e2e8f0',
                          backgroundColor: evaluation.niveau_risque === risk ? 'var(--risk-color)' : 'white',
                          color: evaluation.niveau_risque === risk ? 'white' : '#64748b'
                        }}
                      >
                        {risk}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recommandations */}
                <div className="eval-section">
                  <h3><FiInfo style={{ marginRight: '8px' }}/>Recommandations & Conditions</h3>
                  <div className="impact-grid">
                    <div className="impact-field">
                      <label>Conditions d'exécution</label>
                      <textarea
                        value={evaluation.conditions}
                        onChange={e => setEvaluation({...evaluation, conditions: e.target.value})}
                        rows={2}
                        placeholder="Quelles sont les conditions impératives ?"
                      />
                    </div>
                    <div className="impact-field">
                      <label>Sécurité / Rollback</label>
                      <textarea
                        value={evaluation.securite_rollback}
                        onChange={e => setEvaluation({...evaluation, securite_rollback: e.target.value})}
                        rows={2}
                        placeholder="Plan de secours..."
                      />
                    </div>
                    <div className="impact-field">
                      <label>Précautions</label>
                      <textarea
                        value={evaluation.precautions}
                        onChange={e => setEvaluation({...evaluation, precautions: e.target.value})}
                        rows={2}
                        placeholder="Précautions techniques..."
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-primary" 
                      onClick={() => handleSubmitEvaluation(false)}
                      disabled={submittingEval}
                      style={{ background: '#7c3aed', borderColor: '#7c3aed', padding: '0.6rem 1.5rem', borderRadius: '10px' }}
                    >
                      <FiCheck /> {submittingEval ? 'Enregistrement...' : 'Enregistrer mon avis'}
                    </button>
                  </div>
                </div>

                {/* VOTE SECTION */}
                {(() => {
                  const rfcVotes = votes.filter(v => v.id_rfc === selectedRfcForEval.id_rfc);
                  const myVote = rfcVotes.find(v => (v.utilisateur?.id_user || v.id_user) === currentUser.id_user);
                  const isClosed = decisions.some(d => d.id_rfc === selectedRfcForEval.id_rfc);

                  if (isClosed) return (
                    <div className="eval-section" style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem', textAlign: 'center' }}>
                      <h3 style={{ color: '#64748b' }}><FiCheckCircle /> Session Clôturée</h3>
                      <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>Une décision finale a déjà été prise pour cette RFC.</p>
                    </div>
                  );

                  if (myVote) return (
                    <div className="eval-section" style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem', textAlign: 'center' }}>
                      <h3 style={{ color: '#10b981' }}><FiCheck /> Votre vote est enregistré</h3>
                      <div style={{ marginTop: '0.5rem' }}>
                        <span className={`cm-v-tag ${myVote.valeur_vote.toLowerCase()}`} style={{ fontSize: '1rem', padding: '8px 24px' }}>
                          {myVote.valeur_vote}
                        </span>
                      </div>
                    </div>
                  );

                  return (
                    <div className="eval-section" style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                      <h3 style={{ color: '#7c3aed' }}><FiTrendingUp /> Exprimer votre vote</h3>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button 
                          className="btn-vote-modal approve"
                          onClick={async () => {
                            const ok = await handleVote(selectedRfcForEval.id_rfc, 'APPROUVER');
                            if (ok) handleSubmitEvaluation();
                          }}
                          style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <FiCheck /> Approuver
                        </button>
                        <button 
                          className="btn-vote-modal reject"
                          onClick={async () => {
                            const ok = await handleVote(selectedRfcForEval.id_rfc, 'REJETER');
                            if (ok) handleSubmitEvaluation();
                          }}
                          style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        >
                          <FiX /> Rejeter
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECOMMENDATIONS VIEWER MODAL ──────────────────────── */}
      {showRecModal && currentRecs && (
        <div className="cab-modal-backdrop" onClick={() => setShowRecModal(false)}>
          <div className="cab-modal cab-modal--lg" onClick={e => e.stopPropagation()} style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{
                background: currentRecs.empty ? 'rgba(225, 29, 72, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                borderColor: currentRecs.empty ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255, 255, 255, 0.2)'
              }}>
                {currentRecs.empty ? <FiAlertCircle /> : <FiFileText />}
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Recommandations</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                  {currentRecs.empty ? 'Aucun avis enregistré' : `RFC #${currentRecs.rfcCode} · Vos analyses`}
                </div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowRecModal(false)} style={{ color: '#ffffff', marginTop: '5px' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              {currentRecs.empty ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <FiAlertTriangle size={48} color="#fca5a5" style={{ marginBottom: '1rem' }} />
                  <p style={{ color: '#64748b' }}>Vous n'avez pas encore soumis de recommandations pour ce dossier.</p>
                </div>
              ) : (
                <div className="recommendations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
                  <div className="rec-item" style={{ gridColumn: '1 / -1', background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}><FiAlertTriangle /> Niveau de Risque</div>
                    <div className="rec-value">
                      <span style={{ 
                        padding: '4px 12px', borderRadius: '12px', background: '#334155', color: 'white', fontSize: '0.75rem', fontWeight: 800,
                        backgroundColor: currentRecs.niveau_risque === 'FAIBLE' ? '#10b981' : currentRecs.niveau_risque === 'MOYEN' ? '#f59e0b' : currentRecs.niveau_risque === 'ELEVE' ? '#ef4444' : '#7c2d12'
                      }}>
                        {currentRecs.niveau_risque}
                      </span>
                    </div>
                  </div>
                  <div className="rec-item" style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}><FiCheckCircle /> Conditions d'exécution</div>
                    <div className="rec-value" style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.6', fontWeight: '600' }}>{currentRecs.conditions}</div>
                  </div>
                  <div className="rec-item" style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}><FiShield /> Sécurité / Rollback</div>
                    <div className="rec-value" style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.6', fontWeight: '600' }}>{currentRecs.securite_rollback}</div>
                  </div>
                  <div className="rec-item" style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}><FiAlertTriangle /> Précautions</div>
                    <div className="rec-value" style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.6', fontWeight: '600' }}>{currentRecs.precautions}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="cab-modal-footer">
              <button className={currentRecs.empty ? "btn-close-rec danger" : "btn-close-rec"} onClick={() => setShowRecModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CabMeetingsMember;