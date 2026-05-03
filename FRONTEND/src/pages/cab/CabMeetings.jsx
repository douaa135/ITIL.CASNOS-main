import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiCalendar, FiClock, FiFileText, FiCheckCircle, FiEdit, FiSave, 
  FiAlertCircle, FiUsers, FiTrendingUp, FiArrowRight, FiCheck, FiX, FiInfo,
  FiPlus, FiLayers, FiHash, FiShield, FiTrash2
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import './CabMeetings.css';

// ── KPI Card (aligné avec AdminCabManagement) ────────────────
const KpiCard = ({ label, value, icon, color }) => (
  <div className={`cm-kpi-card cm-kpi-${color}`}>
    <div className="cm-kpi-icon">{icon}</div>
    <div className="cm-kpi-body">
      <span className="cm-kpi-value">{value}</span>
      <span className="cm-kpi-label">{label}</span>
    </div>
  </div>
);

const CabMeetings = () => {
  const { user: currentUser } = useAuth();
  const [meetings, setMeetings]         = useState([]);
  const [cabs, setCabs]                 = useState([]);
  const [allUsers, setAllUsers]         = useState([]);
  const [selectedCab, setSelectedCab]   = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [rfcs, setRfcs]                 = useState([]);
  const [votes, setVotes]               = useState([]);
  const [participants, setParticipants] = useState([]);
  const [decisions, setDecisions]       = useState([]);
  const [ordreJourContent, setOrdreJourContent] = useState('');
  const [submitting, setSubmitting]     = useState(false);
  const [activeTab, setActiveTab]       = useState('agenda_editor');
  const [addingUser, setAddingUser]     = useState('');
  const [addingRfc, setAddingRfc]       = useState('');
  const [availableRfcs, setAvailableRfcs] = useState([]);
  const [partLoading, setPartLoading]   = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

  // Create reunion modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]     = useState({
    id_cab: '',
    date_reunion: '',
    heure_debut: '',
    heure_fin: '',
    ordre_jour: ''
  });
  const [creating, setCreating]         = useState(false);

  // ── Fetch all CABs, meetings, and users ──────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cabsRes, usersRes] = await Promise.all([
        api.get('/cab'),
        api.get('/users').catch(() => null)
      ]);
      const allCabs = cabsRes?.data?.cabs || cabsRes?.cabs || [];
      setCabs(allCabs);
      const rawUsers = usersRes?.data?.data || usersRes?.data?.users || [];
      setAllUsers(Array.isArray(rawUsers) ? rawUsers : []);

      // Load meetings from all CABs
      const allMeetings = [];
      for (const cab of allCabs) {
        try {
          const rRes = await api.get(`/cab/${cab.id_cab}/reunions`);
          const reunions = rRes?.data?.reunions || rRes?.reunions || [];
          // Attach cab members to each reunion for easy access
          reunions.forEach(r => allMeetings.push({
            ...r,
            id_cab:      cab.id_cab,
            cab_nom:     cab.nom_cab,
            cab_type:    cab.type_cab,
            cab_membres: cab.membres || []
          }));
        } catch (_) { /* skip */ }
      }
      setMeetings(allMeetings);

      if (allCabs.length > 0 && !createForm.id_cab) {
        setCreateForm(f => ({ ...f, id_cab: allCabs[0].id_cab }));
      }
      if (allCabs.length > 0) setSelectedCab(allCabs[0]);
    } catch (error) {
      console.error('Erreur chargement:', error);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const fetchMeetingDetails = useCallback(async (meetingId) => {
    try {
      const [rfcsRes, votesRes, partsRes, decsRes, allRfcsRes] = await Promise.all([
        api.get(`/reunions/${meetingId}/rfcs`),
        api.get(`/reunions/${meetingId}/votes`),
        api.get(`/reunions/${meetingId}/participants`),
        api.get(`/reunions/${meetingId}/decisions`),
        api.get('/rfc?statut=APPROUVEE').catch(() => null)
      ]);
      setRfcs(rfcsRes?.data?.rfcs || rfcsRes?.rfcs || []);
      setVotes(votesRes?.data?.votes || votesRes?.votes || []);
      setParticipants(partsRes?.data?.participants || partsRes?.participants || []);
      setDecisions(decsRes?.data?.decisions || decsRes?.decisions || []);
      
      const rawRfcs = allRfcsRes?.data?.rfcs || allRfcsRes?.rfcs || [];
      setAvailableRfcs(rawRfcs);
    } catch (error) {
      console.error('Erreur détails réunion:', error);
      setToast({ msg: 'Erreur lors du chargement des détails.', type: 'error' });
    }
  }, []);

  const handleSelectMeeting = (meeting) => {
    setSelectedMeeting(meeting);
    setOrdreJourContent(meeting.ordre_jour || '');
    setAddingUser('');
    fetchMeetingDetails(meeting.id_reunion);
  };

  const handleAddParticipant = async () => {
    if (!addingUser || !selectedMeeting) return;
    setPartLoading(true);
    try {
      await api.post(`/reunions/${selectedMeeting.id_reunion}/participants`, { id_user: addingUser });
      setAddingUser('');
      await fetchMeetingDetails(selectedMeeting.id_reunion);
      setToast({ msg: 'Participant ajouté avec succès !', type: 'success' });
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de l\'ajout', type: 'error' });
    } finally {
      setPartLoading(false);
    }
  };

  const handleRemoveParticipant = (id_user) => {
    const participant = participants.find(p => (p.utilisateur?.id_user || p.id_user) === id_user);
    const name = participant ? (participant.utilisateur?.prenom_user || participant.prenom_user) + ' ' + (participant.utilisateur?.nom_user || participant.nom_user) : 'ce participant';
    
    setConfirmDel({
      title: 'Retirer le participant',
      message: `Voulez-vous vraiment retirer ${name} de cette session ?`,
      onConfirm: async () => {
        setPartLoading(true);
        try {
          await api.delete(`/reunions/${selectedMeeting.id_reunion}/participants/${id_user}`);
          await fetchMeetingDetails(selectedMeeting.id_reunion);
          setToast({ msg: 'Participant retiré avec succès.', type: 'error' });
        } catch (err) {
          setToast({ msg: err?.error?.message || err?.message || 'Erreur lors du retrait', type: 'error' });
        } finally {
          setPartLoading(false);
          setConfirmDel(null);
        }
      }
    });
  };

  // Adds a specific user directly (avoids React async state issue)
  const handleAddSpecificUser = async (id_user) => {
    if (!id_user || !selectedMeeting) return;
    setPartLoading(true);
    try {
      await api.post(`/reunions/${selectedMeeting.id_reunion}/participants`, { id_user });
      await fetchMeetingDetails(selectedMeeting.id_reunion);
      setToast({ msg: 'Membre du CAB ajouté à la session.', type: 'success' });
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de l\'ajout', type: 'error' });
    } finally {
      setPartLoading(false);
    }
  };

  const handleOrdreJourSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.put(`/reunions/${selectedMeeting.id_reunion}`, { ordre_jour: ordreJourContent });
      setToast({ msg: 'Ordre du jour enregistré avec succès !', type: 'success' });
      fetchAll();
      setSelectedMeeting(prev => ({ ...prev, ordre_jour: ordreJourContent }));
    } catch (error) {
      setToast({ msg: 'Erreur lors de l\'enregistrement de l\'ordre du jour.', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVote = async (rfcId, voteValue) => {
    try {
      await api.post(`/reunions/${selectedMeeting.id_reunion}/rfcs/${rfcId}/votes`, {
        id_user: currentUser.id_user,
        valeur_vote: voteValue
      });
      setToast({ msg: 'Vote enregistré !', type: 'success' });
      fetchMeetingDetails(selectedMeeting.id_reunion);
    } catch (error) {
      setToast({ msg: error?.error?.message || error?.message || 'Erreur lors du vote', type: 'error' });
    }
  };

  const handleAddRfc = async () => {
    if (!addingRfc || !selectedMeeting) return;
    try {
      await api.post(`/reunions/${selectedMeeting.id_reunion}/rfcs`, { id_rfc: addingRfc });
      setAddingRfc('');
      fetchMeetingDetails(selectedMeeting.id_reunion);
      setToast({ msg: 'RFC inscrite à l\'ordre du jour.', type: 'success' });
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de l\'ajout de la RFC', type: 'error' });
    }
  };

  const handleRemoveRfc = (rfcId) => {
    const rfc = rfcs.find(r => r.id_rfc === rfcId);
    setConfirmDel({
      title: 'Retirer la RFC de l\'agenda',
      message: `Voulez-vous vraiment retirer la RFC "${rfc?.titre_rfc || rfcId}" de l'ordre du jour ?`,
      onConfirm: async () => {
        try {
          await api.delete(`/reunions/${selectedMeeting.id_reunion}/rfcs/${rfcId}`);
          fetchMeetingDetails(selectedMeeting.id_reunion);
          setToast({ msg: 'RFC retirée de l\'ordre du jour.', type: 'error' });
        } catch (err) {
          setToast({ msg: err?.error?.message || err?.message || 'Erreur lors du retrait de la RFC', type: 'error' });
        } finally {
          setConfirmDel(null);
        }
      }
    });
  };

  const handleCreateReunion = async (e) => {
    e.preventDefault();
    if (!createForm.id_cab || !createForm.date_reunion) {
      return alert('Le CAB et la date sont obligatoires.');
    }
    setCreating(true);
    try {
      await api.post(`/cab/${createForm.id_cab}/reunions`, {
        date_reunion: createForm.date_reunion,
        heure_debut:  createForm.heure_debut || undefined,
        heure_fin:    createForm.heure_fin   || undefined,
        ordre_jour:   createForm.ordre_jour  || undefined
      });
      setShowCreateModal(false);
      setCreateForm({ id_cab: cabs[0]?.id_cab || '', date_reunion: '', heure_debut: '', heure_fin: '', ordre_jour: '' });
      await fetchAll();
      setToast({ msg: 'Réunion créée avec succès !', type: 'success' });
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de la création.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // KPI computations (global, tous les CABs)
  const totalMeetings = meetings.length;
  const upcoming      = meetings.filter(m => new Date(m.date_reunion) > new Date()).length;
  const past          = meetings.filter(m => new Date(m.date_reunion) <= new Date()).length;

  // Sidebar: filter by selected CAB
  const sortedMeetings = [...meetings]
    .filter(m => !selectedCab || m.id_cab === selectedCab.id_cab)
    .sort((a, b) => new Date(b.date_reunion) - new Date(a.date_reunion));

  // Coherent participant count = API participants + CAB members not yet added
  const cabMembresCount = selectedMeeting?.cab_membres?.length || 0;
  const totalAttendees  = participants.length;

  return (
    <div className="cm-page">

      {/* ── HEADER CARD ── */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#fef3c7', color: '#b45309', borderColor: '#fde68a' }}>
            <FiCalendar />
          </div>
          <div className="premium-header-text">
            <h1>Espace Réunions CAB</h1>
            <p>Gestion des ordres du jour, votes des membres et procès-verbaux</p>
            {selectedCab && (
              <span className="cm-cab-badge" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', color: '#475569', border: '1px solid #e2e8f0' }}>
                <FiHash size={11} /> {selectedCab.nom_cab} · {selectedCab.type_cab}
              </span>
            )}
          </div>
        </div>

        <div className="premium-header-actions">
          {/* CAB selector */}
          {cabs.length > 1 && (
            <select
              className="cm-cab-select"
              value={selectedCab?.id_cab || ''}
              onChange={e => {
                const c = cabs.find(c => c.id_cab === e.target.value);
                setSelectedCab(c);
              }}
              style={{ padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '600', fontSize: '0.85rem' }}
            >
              {cabs.map(c => (
                <option key={c.id_cab} value={c.id_cab}>{c.nom_cab}</option>
              ))}
            </select>
          )}
          <button className="btn-create-premium" onClick={() => setShowCreateModal(true)}>
            <FiPlus /> Nouvelle Réunion
          </button>
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card blue">
          <div className="stat-icon-wrapper">
            <FiCalendar size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{totalMeetings}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon-wrapper">
            <FiClock size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{upcoming}</div>
            <div className="stat-label">À venir</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon-wrapper">
            <FiLayers size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{cabs.length}</div>
            <div className="stat-label">Comités Actifs</div>
          </div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="cm-layout">

        {/* Sidebar */}
        <div className="cm-sidebar">
          <div className="cm-sidebar-title">
            Calendrier des Sessions
            <span className="cm-sidebar-badge">{sortedMeetings.length}</span>
          </div>
          <div className="cm-scroll-list">
            {loading ? (
              <div className="cm-loading">Chargement des sessions...</div>
            ) : sortedMeetings.length === 0 ? (
              <div className="cm-empty-sidebar">
                <FiAlertCircle />
                <p>Aucune réunion planifiée.<br />Créez-en une ci-dessus.</p>
              </div>
            ) : (
              sortedMeetings.map(meeting => {
                const isPast     = new Date(meeting.date_reunion) < new Date();
                const isSelected = selectedMeeting?.id_reunion === meeting.id_reunion;
                return (
                  <div
                    key={meeting.id_reunion}
                    className={`cm-meeting-item ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                    onClick={() => handleSelectMeeting(meeting)}
                  >
                    <div className="cm-date-badge">
                      <span className="cm-day">{new Date(meeting.date_reunion).getDate()}</span>
                      <span className="cm-month">{new Date(meeting.date_reunion).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                    </div>
                    <div className="cm-meeting-info">
                      <div className="cm-meeting-title">{meeting.ordre_jour || 'Session CAB'}</div>
                      <div className="cm-meeting-meta">
                        <FiClock size={11} />
                        {meeting.heure_debut?.substring(11, 16) || '—'} · {meeting.cab_nom || ''}
                      </div>
                    </div>
                    <div className="cm-meeting-status">
                      {meeting.ordre_jour
                        ? <FiCheckCircle className="done" />
                        : <FiEdit className="pending" />}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Main workspace */}
        <div className="cm-workspace">
          {selectedMeeting ? (
            <div className="cm-workspace-inner">

              {/* Workspace Header */}
              <div className="cm-workspace-header">
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span className="cm-type-tag">Session {selectedMeeting.cab_type || 'Standard'}</span>
                    <span className="cm-date-text">
                      <FiCalendar style={{ marginRight: 4 }} /> 
                      {new Date(selectedMeeting.date_reunion).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  <h2>{selectedMeeting.ordre_jour || 'Sans ordre du jour'}</h2>
                  <div className="cm-meta-row">
                    {selectedMeeting.cab_nom && <span><FiLayers /> {selectedMeeting.cab_nom}</span>}
                    <span><FiUsers /> {totalAttendees} participant{totalAttendees > 1 ? 's' : ''}</span>
                    <span><FiClock /> {selectedMeeting.heure_debut?.substring(11, 16) || '--:--'} - {selectedMeeting.heure_fin?.substring(11, 16) || '--:--'}</span>
                  </div>
                </div>
                <button className="cm-close-btn" onClick={() => setSelectedMeeting(null)}><FiX /></button>
              </div>

              {/* Tabs */}
              <div className="cm-tabs">
                {[
                  { id: 'agenda_editor', icon: <FiFileText />, label: 'Ordre du Jour' },
                  { id: 'rfcs_votes',   icon: <FiTrendingUp />, label: 'RFCs & Votes' },
                  { id: 'participants', icon: <FiUsers />,     label: 'Membres & Participants' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    className={`cm-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.id)}
                  >
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="cm-content">
                {activeTab === 'agenda_editor' && (
                  <div className="cm-editor-section">
                    <div className="cm-editor-intro">
                      <h3><FiEdit /> Rédaction de l'ordre du jour</h3>
                      <p>Consignez ici les points clés et les discussions prévues pour cette séance.</p>
                    </div>
                    <form onSubmit={handleOrdreJourSubmit}>
                      <textarea
                        value={ordreJourContent}
                        onChange={e => setOrdreJourContent(e.target.value)}
                        placeholder="Saisissez l'ordre du jour de la réunion..."
                        className="cm-textarea"
                      />
                      <div className="cm-form-actions">
                        <button type="submit" className="cm-btn-save" disabled={submitting}>
                          <FiSave /> {submitting ? 'Enregistrement...' : "Enregistrer l'ordre du jour"}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {activeTab === 'rfcs_votes' && (
                  <div className="cm-votes-view">
                    <div className="cm-section-header-inline">
                      <div className="cm-shi-title">
                        <h3>Ordre du Jour & Votes</h3>
                        <p>{rfcs.length} RFC(s) inscrite(s)</p>
                      </div>
                      <div className="cm-agenda-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                          className="cm-mini-select" 
                          value={addingRfc} 
                          onChange={e => setAddingRfc(e.target.value)}
                          style={{ minWidth: '200px' }}
                        >
                          <option value="">Inscrire une RFC...</option>
                          {availableRfcs
                            .filter(ar => !rfcs.some(r => r.id_rfc === ar.id_rfc))
                            .map(ar => (
                              <option key={ar.id_rfc} value={ar.id_rfc}>#{ar.code_rfc} - {ar.titre_rfc}</option>
                            ))}
                        </select>
                        <button onClick={handleAddRfc} disabled={!addingRfc} className="cm-btn-mini-plus"><FiPlus /></button>
                      </div>
                    </div>

                    {rfcs.length === 0 ? (
                      <div className="cm-empty-block">Aucune RFC inscrite à l'ordre du jour.</div>
                    ) : rfcs.map(rfc => {
                      const rfcDecision = decisions.find(d => d.id_rfc === rfc.id_rfc);
                      // Get all members of the CAB for this meeting
                      const cabMembres = selectedMeeting?.cab_membres || [];
                      const rfcVotes = votes.filter(v => v.id_rfc === rfc.id_rfc);
                      
                      const appCount = rfcVotes.filter(v => v.valeur_vote === 'APPROUVER').length;
                      const rejCount = rfcVotes.filter(v => v.valeur_vote === 'REJETER').length;
                      const absCount = rfcVotes.filter(v => v.valeur_vote === 'ABSTENTION').length;

                      return (
                        <div key={rfc.id_rfc} className="cm-rfc-vote-card">
                          <div className="cm-rvc-header">
                            <div className="cm-rvc-title-box">
                              <span className="cm-rfc-code">#{rfc.code_rfc}</span>
                              <h4>{rfc.titre_rfc}</h4>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {rfcDecision && (
                                <div className={`cm-decision-badge ${rfcDecision.decision.toLowerCase()}`}>
                                  {rfcDecision.decision}
                                </div>
                              )}
                              <button onClick={() => handleRemoveRfc(rfc.id_rfc)} className="cm-btn-trash-rfc" title="Retirer de l'agenda">
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="cm-rvc-stats-bar">
                            <div className="cm-rvc-stat-item app">
                              <span className="cm-rvc-stat-n">{appCount}</span>
                              <span className="cm-rvc-stat-l">Pour</span>
                              <div className="cm-rvc-progress"><div style={{ width: `${(appCount/(appCount+rejCount+absCount || 1))*100}%` }}></div></div>
                            </div>
                            <div className="cm-rvc-stat-item rej">
                              <span className="cm-rvc-stat-n">{rejCount}</span>
                              <span className="cm-rvc-stat-l">Contre</span>
                              <div className="cm-rvc-progress"><div style={{ width: `${(rejCount/(appCount+rejCount+absCount || 1))*100}%` }}></div></div>
                            </div>
                            <div className="cm-rvc-stat-item abs">
                              <span className="cm-rvc-stat-n">{absCount}</span>
                              <span className="cm-rvc-stat-l">Abstention</span>
                              <div className="cm-rvc-progress"><div style={{ width: `${(absCount/(appCount+rejCount+absCount || 1))*100}%` }}></div></div>
                            </div>
                          </div>

                          {/* Détail des votes par membre */}
                          <div className="cm-votes-detail">
                            <div className="cm-vd-title">Répartition des votes par membre</div>
                            <div className="cm-vd-list">
                              {cabMembres.map(m => {
                                const u = m.utilisateur || m;
                                const memberVote = rfcVotes.find(v => (v.utilisateur?.id_user || v.id_user) === u.id_user);
                                return (
                                  <div key={u.id_user} className="cm-vd-row">
                                    <div className="cm-vd-user">
                                      <div className="cm-vd-avatar">{(u.prenom_user || '?')[0]}</div>
                                      <div className="cm-vd-info">
                                        <span className="cm-vd-name">{u.prenom_user} {u.nom_user}</span>
                                        <span className="cm-vd-role">{m.role === 'PRESIDENT' ? 'Président' : 'Membre'}</span>
                                      </div>
                                    </div>
                                    <div className="cm-vd-vote">
                                      {memberVote ? (
                                        <div className={`cm-v-tag ${memberVote.valeur_vote.toLowerCase()}`}>
                                          {memberVote.valeur_vote === 'APPROUVER' ? <FiCheck /> : 
                                           memberVote.valeur_vote === 'REJETER' ? <FiX /> : <FiInfo />}
                                          {memberVote.valeur_vote}
                                        </div>
                                      ) : (
                                        <span className="cm-v-pending">En attente</span>
                                      )}
                                    </div>
                                    {u.id_user === currentUser?.id_user && !memberVote && !rfcDecision && (
                                      <div className="cm-vd-actions">
                                        <button className="cm-v-mini-btn app" onClick={() => handleVote(rfc.id_rfc, 'APPROUVER')}><FiCheck /></button>
                                        <button className="cm-v-mini-btn rej" onClick={() => handleVote(rfc.id_rfc, 'REJETER')}><FiX /></button>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {activeTab === 'participants' && (
                  <div className="cm-participants-view">
                    
                    {/* SECTION: GESTION DU COMITÉ CAB (Nouveau) */}
                    <div className="cm-section-card">
                      <div className="cm-sc-header">
                        <div className="cm-sc-title">
                          <FiShield /> 
                          <div>
                            <h4>Membres Permanents du Comité</h4>
                            <p>Gérez la composition officielle du CAB {selectedCab?.nom_cab}</p>
                          </div>
                        </div>
                        <div className="cm-sc-actions">
                          <select
                            className="cm-mini-select"
                            value=""
                            onChange={async (e) => {
                              const uid = e.target.value;
                              if (!uid) return;
                              setPartLoading(true);
                              try {
                                await api.post(`/cab/${selectedCab.id_cab}/membres`, { id_user: uid });
                                fetchAll();
                              } catch (err) {
                                alert(err?.error?.message || 'Erreur lors de l\'ajout au comité');
                              } finally {
                                setPartLoading(false);
                              }
                            }}
                          >
                            <option value="">+ Ajouter un membre au comité...</option>
                            {allUsers
                              .filter(u => !selectedMeeting?.cab_membres?.some(m => (m.utilisateur?.id_user || m.id_user) === u.id_user))
                              .map(u => (
                                <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                              ))}
                          </select>
                        </div>
                      </div>

                      <div className="cm-members-grid">
                        {(selectedMeeting?.cab_membres || []).map(m => {
                          const u = m.utilisateur || m;
                          const isPres = m.role === 'PRESIDENT';
                          return (
                            <div key={u.id_user} className={`cm-member-badge-card ${isPres ? 'pres' : ''}`}>
                              <div className="cm-mbc-avatar">{(u.prenom_user || '?')[0]}</div>
                              <div className="cm-mbc-body">
                                <span className="cm-mbc-name">{u.prenom_user} {u.nom_user}</span>
                                <span className="cm-mbc-role">{isPres ? 'Président' : 'Membre'}</span>
                              </div>
                              {!isPres && (
                                <button 
                                  className="cm-mbc-remove" 
                                  onClick={async () => {
                                    if(!window.confirm(`Retirer ${u.prenom_user} du comité CAB ?`)) return;
                                    try {
                                      await api.delete(`/cab/${selectedCab.id_cab}/membres/${u.id_user}`);
                                      fetchAll();
                                    } catch (err) { alert('Erreur lors du retrait'); }
                                  }}
                                >
                                  <FiTrash2 size={14} />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div style={{ height: '2rem' }}></div>

                    {/* SECTION: PARTICIPANTS À LA SESSION */}
                    <div className="cm-section-card">
                      <div className="cm-sc-header">
                        <div className="cm-sc-title">
                          <FiUsers /> 
                          <div>
                            <h4>Participants à cette Session</h4>
                            <p>Experts et demandeurs invités pour cette séance spécifique</p>
                          </div>
                        </div>
                        <div className="cm-sc-actions">
                          <select
                            className="cm-mini-select"
                            value={addingUser}
                            onChange={e => setAddingUser(e.target.value)}
                          >
                            <option value="">Inviter un participant...</option>
                            {allUsers
                              .filter(u => !participants.some(p => (p.utilisateur?.id_user || p.id_user) === u.id_user))
                              .map(u => (
                                <option key={u.id_user} value={u.id_user}>{u.prenom_user} {u.nom_user}</option>
                              ))}
                          </select>
                          <button onClick={handleAddParticipant} disabled={!addingUser} className="cm-btn-mini-plus"><FiPlus /></button>
                        </div>
                      </div>

                      <div className="cm-participants-list">
                        {participants.length === 0 ? (
                          <div className="cm-empty-inline">Aucun participant invité pour le moment.</div>
                        ) : (
                          <div className="cm-part-flex">
                            {participants.map(p => {
                              const uid = p.utilisateur?.id_user || p.id_user;
                              return (
                                <div key={uid} className="cm-part-tag">
                                  <div className="cm-pt-avatar">{(p.utilisateur?.prenom_user || p.prenom_user || '?')[0]}</div>
                                  <div className="cm-pt-info">
                                    <span className="cm-pt-name">{p.utilisateur?.prenom_user || p.prenom_user} {p.utilisateur?.nom_user || p.nom_user}</span>
                                    <span className="cm-pt-email">{p.utilisateur?.email_user || p.email_user}</span>
                                  </div>
                                  <button onClick={() => handleRemoveParticipant(uid)} className="cm-pt-remove"><FiX /></button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </div>


          ) : (
            <div className="cm-placeholder">
              <div>
                <div className="cm-placeholder-icon"><FiCalendar /></div>
                <h2>Sélectionnez une session</h2>
                <p>Choisissez une réunion dans le calendrier pour rédiger l'ordre du jour ou participer aux votes.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── CREATE REUNION MODAL ── */}
      {showCreateModal && (
        <div className="modal-backdrop-cab" onClick={() => setShowCreateModal(false)}>
          <div className="modal-box-cab glass-card-cab modal-box-medium" onClick={e => e.stopPropagation()}>

            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper" style={{ background: '#dbeafe', color: '#2563eb', borderColor: '#bfdbfe' }}>
                <FiCalendar size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Créer une Réunion CAB</h2>
                <div className="rfc-style-subtitle">Planifiez une nouvelle session du comité</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowCreateModal(false)}><FiX size={24} /></button>
            </div>

            <form onSubmit={handleCreateReunion}>
              <div className="modal-body-rfc-style">

                {/* CAB Selector */}
                <div className="form-group-cab" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                    <FiLayers size={13} style={{ marginRight: 5 }} />Comité CAB *
                  </label>
                  <select
                    className="modal-select-cab"
                    value={createForm.id_cab}
                    onChange={e => setCreateForm(f => ({ ...f, id_cab: e.target.value }))}
                    required
                    style={{ width: '100%' }}
                  >
                    <option value="">Sélectionner un CAB...</option>
                    {cabs.map(c => (
                      <option key={c.id_cab} value={c.id_cab}>{c.nom_cab} ({c.type_cab})</option>
                    ))}
                  </select>
                </div>

                <div className="rfc-style-grid">
                  <div className="form-group-cab">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                      <FiCalendar size={13} style={{ marginRight: 5 }} />Date de la réunion *
                    </label>
                    <input
                      type="date"
                      className="modal-input-cab"
                      value={createForm.date_reunion}
                      onChange={e => setCreateForm(f => ({ ...f, date_reunion: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group-cab">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                      <FiClock size={13} style={{ marginRight: 5 }} />Heure de début
                    </label>
                    <input
                      type="time"
                      value={createForm.heure_debut}
                      onChange={e => setCreateForm(f => ({ ...f, heure_debut: e.target.value }))}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group-cab">
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                      <FiClock size={13} style={{ marginRight: 5 }} />Heure de fin
                    </label>
                    <input
                      type="time"
                      value={createForm.heure_fin}
                      onChange={e => setCreateForm(f => ({ ...f, heure_fin: e.target.value }))}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="form-group-cab" style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                    <FiFileText size={13} style={{ marginRight: 5 }} />Ordre du jour (optionnel)
                  </label>
                  <textarea
                    value={createForm.ordre_jour}
                    onChange={e => setCreateForm(f => ({ ...f, ordre_jour: e.target.value }))}
                    placeholder="Décrivez les points à l'ordre du jour..."
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', minHeight: '100px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                  />
                </div>

              </div>
              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={() => setShowCreateModal(false)}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={creating}>
                  {creating ? 'Création...' : <><FiPlus /> Créer la réunion</>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {confirmDel && (
        <ConfirmModal
          title={confirmDel.title}
          message={confirmDel.message}
          danger={true}
          onConfirm={confirmDel.onConfirm}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default CabMeetings;
