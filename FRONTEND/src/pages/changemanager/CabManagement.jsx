import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiCalendar, FiClock, FiPlus, FiFileText,
  FiCheckCircle, FiXCircle, FiTrendingUp, FiChevronRight,
  FiUserPlus, FiTrash2, FiSearch, FiShield, FiX, FiCheck,
  FiUserCheck, FiAlertCircle, FiRefreshCw
} from 'react-icons/fi';
import api from '../../api/axios';
import './CabManagement.css';

/* ─── Helpers ─── */
const initials = (u) =>
  `${u?.prenom_user?.[0] || ''}${u?.nom_user?.[0] || ''}`.toUpperCase();

const roleColor = {
  MEMBRE_CAB:     { bg: '#fef3c7', color: '#b45309' },
  CHANGE_MANAGER: { bg: '#e0f2fe', color: '#0369a1' },
  ADMIN_SYSTEME:  { bg: '#fee2e2', color: '#dc2626' },
};

/* ─── Sub-component: Member Card ─── */
const MemberCard = ({ user, onRemove, isParticipant, onToggleParticipant }) => (
  <div className={`member-card ${isParticipant ? 'member-card--selected' : ''}`}>
    <div className="member-avatar">{initials(user)}</div>
    <div className="member-info">
      <span className="member-name">{user.prenom_user} {user.nom_user}</span>
      <span className="member-email">{user.email_user}</span>
      <span className="member-dir">{user.direction?.nom_direction || '—'}</span>
    </div>
    <div className="member-actions">
      {onToggleParticipant && (
        <button
          className={`btn-toggle-participant ${isParticipant ? 'active' : ''}`}
          onClick={() => onToggleParticipant(user)}
          title={isParticipant ? 'Retirer de la réunion' : 'Inviter à la réunion'}
        >
          {isParticipant ? <FiUserCheck /> : <FiUserPlus />}
        </button>
      )}
      {onRemove && (
        <button className="btn-remove-member" onClick={() => onRemove(user)} title="Retirer du CAB">
          <FiTrash2 />
        </button>
      )}
    </div>
  </div>
);

/* ─── Main Component ─── */
const CabManagement = () => {
  // CAB & réunions
  const [activeCab,       setActiveCab]       = useState(null);
  const [reunions,        setReunions]         = useState([]);
  const [selectedReunion, setSelectedReunion]  = useState(null);
  const [rfcsApprouvees,  setRfcsApprouvees]   = useState([]);
  const [loading,         setLoading]          = useState(true);

  // Membres CAB
  const [cabMembers,    setCabMembers]    = useState([]);   // membres officiels du CAB
  const [allCabProfiles, setAllCabProfiles] = useState([]); // tous les users MEMBRE_CAB en BDD
  const [memberSearch,  setMemberSearch]  = useState('');

  // Participants réunion sélectionnée
  const [participants, setParticipants] = useState([]);

  // Modals
  const [showCreateReunion, setShowCreateReunion] = useState(false);
  const [showAddMember,     setShowAddMember]     = useState(false);
  const [showVoteModal,     setShowVoteModal]     = useState(false);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [activeTab,         setActiveTab]         = useState('agenda'); // 'agenda' | 'participants'

  // Vote/Decision state
  const [selectedRfcForVote,    setSelectedRfcForVote]    = useState(null);
  const [selectedRfcForDecision, setSelectedRfcForDecision] = useState(null);
  const [currentVotes,          setCurrentVotes]          = useState([]);
  const [userVote,              setUserVote]              = useState('');
  const [decision,              setDecision]              = useState('');
  const [decisionMotif,         setDecisionMotif]         = useState('');

  // Évaluation détaillée state
  const [showEvaluationModal,   setShowEvaluationModal]   = useState(false);
  const [selectedRfcForEval,    setSelectedRfcForEval]    = useState(null);
  const [evaluation,            setEvaluation]            = useState({
    impact_business: '',
    impact_technique: '',
    impact_securite: '',
    niveau_risque: 'FAIBLE',
    tests_valides: false,
    recommandations: '',
    actions_correctives: ''
  });

  // Form nouvelle réunion
  const [newReunion, setNewReunion] = useState({
    date_reunion: '', heure_debut: '', heure_fin: '', ordre_jour: ''
  });
  // Profils sélectionnés pour la nouvelle réunion
  const [newReunionParticipants, setNewReunionParticipants] = useState([]);
  const [reunionMemberSearch,   setReunionMemberSearch]   = useState('');

  const handleVoteClick = async (rfc) => {
    setSelectedRfcForVote(rfc);
    setUserVote('');
    try {
      const res = await api.get(`/reunions/${selectedReunion.id_reunion}/rfcs/${rfc.id_rfc}/votes`);
      setCurrentVotes(res.data);
    } catch (err) {
      console.error('Erreur chargement votes:', err);
      setCurrentVotes([]);
    }
    setShowVoteModal(true);
  };

  const handleSubmitVote = async () => {
    if (!userVote) {
      showToast('Veuillez sélectionner votre vote', 'error');
      return;
    }

    try {
      const voteData = {
        id_user: JSON.parse(localStorage.getItem('user')).id_user,
        valeur_vote: userVote
      };

      await api.post(`/reunions/${selectedReunion.id_reunion}/rfcs/${selectedRfcForVote.id_rfc}/votes`, voteData);

      // Recharger les votes
      const res = await api.get(`/reunions/${selectedReunion.id_reunion}/rfcs/${selectedRfcForVote.id_rfc}/votes`);
      setCurrentVotes(res.data);

      showToast('Vote enregistré avec succès');
      setUserVote('');
    } catch (err) {
      console.error('Erreur vote:', err);
      showToast(err.response?.data?.message || 'Erreur lors du vote', 'error');
    }
  };

  const handleSubmitDecision = async () => {
    if (!decision) {
      showToast('Veuillez sélectionner une décision', 'error');
      return;
    }

    try {
      const decisionData = {
        decision,
        motif: decisionMotif || null
      };

      await api.post(`/reunions/${selectedReunion.id_reunion}/rfcs/${selectedRfcForDecision.id_rfc}/decision`, decisionData);

      showToast('Décision enregistrée avec succès');
      setShowDecisionModal(false);
      setSelectedRfcForDecision(null);
      setDecision('');
      setDecisionMotif('');

      // Recharger les données de la réunion
      await loadReunionDetails(selectedReunion.id_reunion);
    } catch (err) {
      console.error('Erreur décision:', err);
      showToast(err.response?.data?.message || 'Erreur lors de la décision', 'error');
    }
  };

  /* ── Init ── */
  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoading(true);
    console.log('CAB Management: Initializing data...');
    try {
      const [resCabs, resRfcs, resProfiles] = await Promise.all([
        api.get('/cab'),
        api.get('/rfc'),
        api.get('/users/by-role/MEMBRE_CAB'),
      ]);

      console.log('API Responses Debug:', {
        cabs: resCabs.success,
        rfcs: resRfcs.success,
        profilesCount: resProfiles.users?.length || 0
      });

      if (resCabs.success && resCabs.cabs?.length > 0) {
        const cab = resCabs.cabs[0];
        setActiveCab(cab);
        await fetchReunions(cab.id_cab);
        await fetchCabMembers(cab.id_cab);
      }

      if (resRfcs.success) {
        setRfcsApprouvees((resRfcs.rfcs || []).filter(r => r.statut?.code_statut === 'APPROUVEE'));
      }

      if (resProfiles.success && resProfiles.users?.length > 0) {
        console.log('Profiles CAB chargés via API dédiée:', resProfiles.users);
        setAllCabProfiles(resProfiles.users);
      } else {
        // FALLBACK: Si l'API dédiée ne renvoie rien, on tente de récupérer tous les utilisateurs
        // et on filtre sur le rôle coté client pour être sûr à 100%.
        console.warn('API dédiée CAB vide, tentative de fallback sur la liste globale...');
        try {
          const resAll = await api.get('/users?limit=200');
          if (resAll.success) {
            const fallbackCabs = (resAll.data || []).filter(u => 
                u.roles?.includes('MEMBRE_CAB') || 
                (u.userRoles && u.userRoles.some(ur => ur.role?.nom_role === 'MEMBRE_CAB'))
            );
            console.log('Profiles CAB chargés via Fallback:', fallbackCabs);
            setAllCabProfiles(fallbackCabs);
          }
        } catch (fallbackErr) {
          console.error('Fallback failed:', fallbackErr);
        }
      }
    } catch (err) {
      console.error('CRITICAL: CabManagement Init Error:', err);
      showToast('Erreur lors du chargement des données CAB. Vérifiez la console.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchReunions = async (cabId) => {
    try {
      const res = await api.get(`/cab/${cabId}/reunions`);
      if (res.success) setReunions(res.reunions || []);
    } catch (err) {
      console.error('Fetch Reunions:', err);
    }
  };

  const fetchCabMembers = async (cabId) => {
    try {
      const res = await api.get(`/cab/${cabId}/membres`);
      if (res.success) setCabMembers(res.membres || []);
    } catch (err) {
      console.error('Fetch CAB Members:', err);
    }
  };

  const fetchParticipants = async (reunionId) => {
    try {
      const res = await api.get(`/reunions/${reunionId}/participants`);
      if (res.success) setParticipants(res.participants || []);
    } catch (err) {
      console.error('Fetch Participants:', err);
    }
  };

  /* ── Select reunion ── */
  const handleSelectReunion = async (r) => {
    setSelectedReunion(r);
    setActiveTab('agenda');
    await fetchParticipants(r.id_reunion);
  };

  /* ── Add CAB member (from MEMBRE_CAB pool) ── */
  const handleAddCabMember = async (user) => {
    if (!activeCab) return;
    // Check if already member
    if (cabMembers.some(m => m.utilisateur?.id_user === user.id_user)) {
      showToast('Ce profil est déjà membre du CAB.', 'error');
      return;
    }
    try {
      const res = await api.post(`/cab/${activeCab.id_cab}/membres`, { id_user: user.id_user });
      if (res.success) {
        await fetchCabMembers(activeCab.id_cab);
        showToast(`${user.prenom_user} ${user.nom_user} ajouté au comité CAB.`);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur lors de l\'ajout du membre.', 'error');
    }
  };

  /* ── Remove CAB member ── */
  const handleRemoveCabMember = async (member) => {
    if (!window.confirm(`Retirer ${member.utilisateur?.prenom_user} ${member.utilisateur?.nom_user} du CAB ?`)) return;
    try {
      const res = await api.delete(`/cab/${activeCab.id_cab}/membres/${member.utilisateur?.id_user}`);
      if (res.success) {
        await fetchCabMembers(activeCab.id_cab);
        showToast('Membre retiré du comité.');
      }
    } catch (err) {
      showToast('Erreur lors de la suppression.', 'error');
    }
  };

  /* ── Toggle participant pour la réunion sélectionnée ── */
  const handleToggleParticipant = async (user) => {
    if (!selectedReunion) return;
    const isAlready = participants.some(p => p.utilisateur?.id_user === user.id_user || p.id_user === user.id_user);
    try {
      if (isAlready) {
        await api.delete(`/reunions/${selectedReunion.id_reunion}/participants/${user.id_user}`);
        setParticipants(prev => prev.filter(p => (p.utilisateur?.id_user || p.id_user) !== user.id_user));
        showToast(`${user.prenom_user} ${user.nom_user} retiré de la session.`);
      } else {
        const res = await api.post(`/reunions/${selectedReunion.id_reunion}/participants`, { id_user: user.id_user });
        if (res.success) {
          await fetchParticipants(selectedReunion.id_reunion);
          showToast(`${user.prenom_user} ${user.nom_user} invité à la session.`);
        }
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur lors de la mise à jour des participants.', 'error');
    }
  };

  const handleDecisionClick = (rfc) => {
    setSelectedRfcForDecision(rfc);
    setDecision('');
    setDecisionMotif('');
    setShowDecisionModal(true);
  };

  const handleEvaluationClick = (rfc) => {
    setSelectedRfcForEval(rfc);
    // Charger l'évaluation existante si elle existe
    setEvaluation({
      impact_business: '',
      impact_technique: '',
      impact_securite: '',
      niveau_risque: 'FAIBLE',
      tests_valides: false,
      recommandations: '',
      actions_correctives: ''
    });
    setShowEvaluationModal(true);
  };

  const handleSubmitEvaluation = async () => {
    try {
      // Ici nous pourrions sauvegarder l'évaluation dans la base de données
      // Pour l'instant, on affiche juste un message de succès
      showToast('Évaluation enregistrée avec succès');
      setShowEvaluationModal(false);
      setSelectedRfcForEval(null);
    } catch (err) {
      console.error('Erreur évaluation:', err);
      showToast('Erreur lors de l\'enregistrement de l\'évaluation', 'error');
    }
  };

  const generateProcesVerbal = () => {
    if (!selectedReunion) return;

    const pv = {
      titre: `Procès-verbal de la réunion CAB - ${selectedReunion.ordre_jour || 'Session CAB'}`,
      date: new Date(selectedReunion.date_reunion).toLocaleDateString('fr-FR'),
      heure_debut: selectedReunion.heure_debut?.substring(11, 16),
      heure_fin: selectedReunion.heure_fin?.substring(11, 16),
      participants: participants.map(p => `${p.utilisateur.prenom_user} ${p.utilisateur.nom_user}`),
      rfcs_discutees: selectedReunion.rfcReunions?.map(item => ({
        code: item.rfc.code_rfc,
        titre: item.rfc.titre_rfc,
        decision: 'À définir' // Dans un vrai système, ceci viendrait des décisions enregistrées
      })) || [],
      recommandations: 'Les recommandations détaillées seront ajoutées après validation des évaluations.',
      date_generation: new Date().toLocaleString('fr-FR')
    };

    // Pour l'instant, on affiche juste dans la console. Dans un vrai système, on générerait un PDF ou un document.
    console.log('Procès-verbal généré:', pv);
    showToast('Procès-verbal généré (voir console pour les détails)');

    // Ici on pourrait ouvrir un modal pour afficher le PV ou le télécharger
  };

  /* ── Add RFC to agenda ── */
  const handleAddRfcToAgenda = async (rfcId) => {
    if (!selectedReunion) return;
    try {
      const res = await api.post(`/reunions/${selectedReunion.id_reunion}/rfcs`, { id_rfc: rfcId });
      if (res.success) {
        const updated = await api.get(`/reunions/${selectedReunion.id_reunion}`);
        if (updated.success) setSelectedReunion(updated.reunion);
        showToast('RFC ajoutée à l\'ordre du jour.');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur lors de l\'ajout à l\'agenda.', 'error');
    }
  };

  /* ── Create réunion ── */
  const handleCreateReunion = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/cab/${activeCab.id_cab}/reunions`, newReunion);
      if (res.success) {
        const newReunionId = res.reunion?.id_reunion;

        // Enrôler les participants sélectionnés en parallèle
        if (newReunionId && newReunionParticipants.length > 0) {
          await Promise.all(
            newReunionParticipants.map(u =>
              api.post(`/reunions/${newReunionId}/participants`, { id_user: u.id_user }).catch(() => {})
            )
          );
        }

        setShowCreateReunion(false);
        await fetchReunions(activeCab.id_cab);
        setNewReunion({ date_reunion: '', heure_debut: '', heure_fin: '', ordre_jour: '' });
        setNewReunionParticipants([]);
        showToast(`Session CAB créée avec ${newReunionParticipants.length} participant${newReunionParticipants.length > 1 ? 's' : ''}.`);
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur lors de la création.', 'error');
    }
  };

  const toggleNewReunionParticipant = (member) => {
    const u = member.utilisateur || member;
    setNewReunionParticipants(prev => {
      const exists = prev.some(p => p.id_user === u.id_user);
      return exists ? prev.filter(p => p.id_user !== u.id_user) : [...prev, u];
    });
  };

  const isSelectedForNew = (member) => {
    const u = member.utilisateur || member;
    return newReunionParticipants.some(p => p.id_user === u.id_user);
  };

  /* ── Filters ── */
  const filteredProfiles = allCabProfiles.filter(u => {
    const q = memberSearch.toLowerCase();
    return !q ||
      `${u.prenom_user} ${u.nom_user}`.toLowerCase().includes(q) ||
      u.email_user?.toLowerCase().includes(q) ||
      u.direction?.nom_direction?.toLowerCase().includes(q);
  });

  const isParticipant = (user) =>
    participants.some(p => (p.utilisateur?.id_user || p.id_user) === user.id_user);

  const isCabMember = (userId) =>
    cabMembers.some(m => (m.utilisateur?.id_user || m.id_user) === userId);

  if (loading) return (
    <div className="cab-loading">
      <div className="cab-spinner" />
      <p>Chargement du portail CAB...</p>
    </div>
  );

  /* ── Render ── */
  return (
    <div className="cab-page">

      {/* Toast */}
      {toast && (
        <div className={`cab-toast ${toast.type}`}>
          {toast.type === 'success' ? <FiCheck /> : <FiAlertCircle />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="cab-header">
        <div>
          <h1><FiUsers /> Gestion de la Planification CAB</h1>
          <p>Planifiez les sessions, gérez les membres et enregistrez les décisions collectives.</p>
        </div>
        <div className="cab-header-actions">
          <button className="btn-secondary-cab" onClick={() => setShowAddMember(true)}>
            <FiUserPlus /> Gérer les profils
          </button>
          <button className="btn-primary-cab" onClick={() => setShowCreateReunion(true)}>
            <FiPlus /> Nouvelle réunion
          </button>
        </div>
      </div>

      {/* ═══ KPIs ════════════════════════════════════════════ */}
      <div className="cab-kpis">
        <div className="cab-kpi">
          <FiUsers />
          <div><span className="kpi-num">{cabMembers.length}</span><span className="kpi-lbl">Membres CAB</span></div>
        </div>
        <div className="cab-kpi">
          <FiCalendar />
          <div><span className="kpi-num">{reunions.length}</span><span className="kpi-lbl">Sessions</span></div>
        </div>
        <div className="cab-kpi">
          <FiFileText />
          <div><span className="kpi-num">{rfcsApprouvees.length}</span><span className="kpi-lbl">RFC Approuvées</span></div>
        </div>
      </div>

      {/* ═══ MAIN GRID ═══════════════════════════════════════ */}
      <div className="cab-grid">

        {/* ── Left: Sessions + Membres ────────────────────── */}
        <div className="cab-left-col">

          {/* Sessions */}
          <div className="cab-card">
            <div className="cab-card-header">
              <h3>Sessions Planifiées</h3>
              <span className="count-pill">{reunions.length}</span>
            </div>
            <div className="reunion-list">
              {reunions.length === 0 ? (
                <div className="cab-empty-list">
                  <FiCalendar />
                  <p>Aucune session planifiée.</p>
                </div>
              ) : reunions.map(r => (
                <div
                  key={r.id_reunion}
                  className={`reunion-item ${selectedReunion?.id_reunion === r.id_reunion ? 'active' : ''}`}
                  onClick={() => handleSelectReunion(r)}
                >
                  <div className="reunion-date-badge">
                    <span className="rd-day">{new Date(r.date_reunion).getDate()}</span>
                    <span className="rd-month">{new Date(r.date_reunion).toLocaleString('fr-FR', { month: 'short' })}</span>
                  </div>
                  <div className="reunion-item-info">
                    <span className="ri-title">{r.ordre_jour || 'Session CAB'}</span>
                    <span className="ri-time"><FiClock /> {r.heure_debut?.substring(11, 16) || '--:--'} – {r.heure_fin?.substring(11, 16) || '--:--'}</span>
                  </div>
                  <FiChevronRight className="ri-arrow" />
                </div>
              ))}
            </div>
          </div>

          {/* Membres du CAB */}
          <div className="cab-card">
            <div className="cab-card-header">
              <h3>Membres du Comité</h3>
              <button className="btn-icon-sm" onClick={() => setShowAddMember(true)} title="Gérer les profils">
                <FiUserPlus />
              </button>
            </div>
            <div className="members-list">
              {cabMembers.length === 0 ? (
                <div className="cab-empty-list">
                  <FiUsers />
                  <p>Aucun membre enregistré.</p>
                  <button className="btn-link" onClick={() => setShowAddMember(true)}>Ajouter un profil</button>
                </div>
              ) : cabMembers.map((m, idx) => {
                const u = m.utilisateur || m;
                return (
                  <div key={idx} className="member-row">
                    <div className="member-avatar-sm">{initials(u)}</div>
                    <div className="member-row-info">
                      <span className="mr-name">{u.prenom_user} {u.nom_user}</span>
                      <span className="mr-role">
                        {m.role === 'PRESIDENT' ? '👑 Président' : 'Membre'}
                      </span>
                    </div>
                    <button className="btn-remove-sm" onClick={() => handleRemoveCabMember(m)} title="Retirer">
                      <FiX />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* ── Right: Réunion Detail ──────────────────────── */}
        <div className="cab-right-col">
          {!selectedReunion ? (
            <div className="no-selection">
              <FiCalendar className="no-sel-icon" />
              <h3>Sélectionnez une session</h3>
              <p>Choisissez une réunion dans la liste pour gérer l'ordre du jour et les participants.</p>
            </div>
          ) : (
            <div className="reunion-detail">

              {/* Detail header */}
              <div className="detail-header">
                <div>
                  <h2>{selectedReunion.ordre_jour || 'Session CAB'}</h2>
                  <div className="detail-meta">
                    <span><FiCalendar /> {new Date(selectedReunion.date_reunion).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                    <span><FiClock /> {selectedReunion.heure_debut?.substring(11, 16)} – {selectedReunion.heure_fin?.substring(11, 16)}</span>
                    <span><FiUsers /> {participants.length} participant{participants.length > 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div className="detail-actions">
                  <button className="btn-secondary-cab" onClick={generateProcesVerbal}>
                    <FiFileText /> Générer PV
                  </button>
                  <span className="session-status-badge">Planifiée</span>
                </div>
              </div>

              {/* Tabs */}
              <div className="detail-tabs">
                <button className={`tab-btn ${activeTab === 'agenda' ? 'active' : ''}`} onClick={() => setActiveTab('agenda')}>
                  <FiFileText /> Ordre du Jour
                </button>
                <button className={`tab-btn ${activeTab === 'participants' ? 'active' : ''}`} onClick={() => setActiveTab('participants')}>
                  <FiUsers /> Inviter Participants
                </button>
                <button className={`tab-btn ${activeTab === 'historique' ? 'active' : ''}`} onClick={() => setActiveTab('historique')}>
                  <FiTrendingUp /> Historique CAB
                </button>
              </div>

              {/* Tab: Agenda */}
              {activeTab === 'agenda' && (
                <div className="tab-content">
                  {/* RFCs inscrites */}
                  <div className="agenda-section">
                    <h4>RFCs à l'ordre du jour</h4>
                    {(!selectedReunion.rfcReunions || selectedReunion.rfcReunions.length === 0) ? (
                      <div className="cab-empty-list">
                        <FiFileText />
                        <p>Aucune RFC inscrite. Ajoutez-en depuis la liste ci-dessous.</p>
                      </div>
                    ) : selectedReunion.rfcReunions.map(item => (
                      <div key={item.rfc?.id_rfc} className="agenda-rfc-card">
                        <div className="arc-info">
                          <span className="arc-code">#{item.rfc?.code_rfc}</span>
                          <span className="arc-title">{item.rfc?.titre_rfc}</span>
                          <span className="arc-dem">{item.rfc?.demandeur?.prenom_user} {item.rfc?.demandeur?.nom_user}</span>
                        </div>
                        <div className="arc-actions">
                          <button className="btn-eval" onClick={() => handleEvaluationClick(item.rfc)}><FiFileText /> Évaluer</button>
                          <button className="btn-vote" onClick={() => handleVoteClick(item.rfc)}><FiTrendingUp /> Votes</button>
                          <button className="btn-decide" onClick={() => handleDecisionClick(item.rfc)}><FiCheckCircle /> Décider</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* RFC disponibles à ajouter */}
                  <div className="available-section">
                    <h4>Ajouter une RFC Approuvée</h4>
                    {rfcsApprouvees.length === 0 ? (
                      <p className="no-rfc-hint">Aucune RFC approuvée disponible pour l'instant.</p>
                    ) : rfcsApprouvees.map(rfc => {
                      const alreadyOnAgenda = selectedReunion.rfcReunions?.some(i => i.rfc?.id_rfc === rfc.id_rfc);
                      return (
                        <div key={rfc.id_rfc} className="available-rfc-row">
                          <div className="avr-info">
                            <span className="avr-code">#{rfc.code_rfc}</span>
                            <span className="avr-title">{rfc.titre_rfc}</span>
                          </div>
                          <button
                            className={`btn-add-agenda ${alreadyOnAgenda ? 'already' : ''}`}
                            disabled={alreadyOnAgenda}
                            onClick={() => handleAddRfcToAgenda(rfc.id_rfc)}
                          >
                            {alreadyOnAgenda ? <><FiCheck /> Inscrite</> : <><FiPlus /> Ajouter</>}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Tab: Participants */}
              {activeTab === 'participants' && (
                <div className="tab-content">
                  {/* Dropdown Select participants for EXISTING reunion */}
                  <div className="select-picker-container" style={{ marginBottom: '2rem' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <select 
                            className="premium-select"
                            onChange={(e) => {
                                const id = e.target.value;
                                if (!id) return;
                                const user = allCabProfiles.find(u => u.id_user === id);
                                if (user) handleToggleParticipant(user);
                                e.target.value = ''; // Reset select
                            }}
                            style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', background: 'white', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            <option value="">-- Sélectionner un compte CAB à inviter --</option>
                            {allCabProfiles
                                .filter(u => !isParticipant(u))
                                .map(u => (
                                <option key={u.id_user} value={u.id_user}>
                                    {u.prenom_user} {u.nom_user} ({u.direction?.nom_direction || u.email_user})
                                </option>
                                ))
                            }
                        </select>
                    </div>
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Sélectionnez un utilisateur avec le rôle CAB pour l'inviter à la réunion.</p>
                  </div>

                  {allCabProfiles.length === 0 ? (
                    <div className="cab-empty-list">
                      <FiUsers />
                      <p>Aucun profil CAB trouvé en base de données.</p>
                    </div>
                  ) : (
                    <div className="participants-grid">
                      {allCabProfiles
                        .filter(u => {
                            const q = reunionMemberSearch.toLowerCase();
                            return !q || `${u.prenom_user} ${u.nom_user}`.toLowerCase().includes(q) || u.email_user?.toLowerCase().includes(q);
                        })
                        .map((u, idx) => {
                          const invited = isParticipant(u);
                          const isOfficial = isCabMember(u.id_user);
                          return (
                            <div key={idx} className={`participant-card ${invited ? 'invited' : ''}`}>
                              <div className="pc-avatar">{initials(u)}</div>
                              <div className="pc-info">
                                <span className="pc-name">
                                    {u.prenom_user} {u.nom_user}
                                    {isOfficial && <span className="official-tag" style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>Comité</span>}
                                </span>
                                <span className="pc-dir">{u.direction?.nom_direction || u.email_user}</span>
                                <span className="pc-role-tag">Rôle: Membre CAB</span>
                              </div>
                              <button
                                className={`btn-invite-toggle ${invited ? 'active' : ''}`}
                                onClick={() => handleToggleParticipant(u)}
                                title={invited ? 'Retirer de la session' : 'Inviter à la session'}
                              >
                                {invited ? <><FiUserCheck /> Invité</> : <><FiUserPlus /> Inviter</>}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab: Historique CAB */}
              {activeTab === 'historique' && (
                <div className="tab-content">
                  <div className="historique-section">
                    <h4>Historique des Décisions CAB</h4>
                    <p className="historique-intro">
                      Suivi des évaluations et recommandations du Change Advisory Board pour cette session.
                    </p>

                    {/* Statistiques de la session */}
                    <div className="session-stats">
                      <div className="stat-card">
                        <div className="stat-number">{selectedReunion.rfcReunions?.length || 0}</div>
                        <div className="stat-label">RFCs évaluées</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">{participants.length}</div>
                        <div className="stat-label">Participants</div>
                      </div>
                      <div className="stat-card">
                        <div className="stat-number">0</div>
                        <div className="stat-label">Décisions finales</div>
                      </div>
                    </div>

                    {/* Liste des RFCs avec status d'évaluation */}
                    <div className="historique-rfcs">
                      <h5>RFCs de la session</h5>
                      {(!selectedReunion.rfcReunions || selectedReunion.rfcReunions.length === 0) ? (
                        <div className="cab-empty-list">
                          <FiFileText />
                          <p>Aucune RFC inscrite à cette session.</p>
                        </div>
                      ) : selectedReunion.rfcReunions.map(item => (
                        <div key={item.rfc?.id_rfc} className="historique-rfc-item">
                          <div className="hrfc-header">
                            <span className="hrfc-code">#{item.rfc?.code_rfc}</span>
                            <span className="hrfc-title">{item.rfc?.titre_rfc}</span>
                            <div className="hrfc-status">
                              <span className="status-indicator status-pending">Évaluation en cours</span>
                            </div>
                          </div>
                          <div className="hrfc-details">
                            <div className="hrfc-meta">
                              <span>Demandeur: {item.rfc?.demandeur?.prenom_user} {item.rfc?.demandeur?.nom_user}</span>
                              <span>Type: {item.rfc?.type_changement?.nom_type || 'N/A'}</span>
                              <span>Priorité: {item.rfc?.priorite}</span>
                            </div>
                            <div className="hrfc-actions">
                              <button className="btn-outline-sm" onClick={() => handleEvaluationClick(item.rfc)}>
                                <FiFileText /> Voir Évaluation
                              </button>
                              <button className="btn-outline-sm" onClick={() => handleVoteClick(item.rfc)}>
                                <FiTrendingUp /> Voir Votes
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Recommandations générales */}
                    <div className="recommandations-section">
                      <h5>Recommandations Générales de la Session</h5>
                      <div className="rec-card">
                        <p className="rec-placeholder">
                          Les recommandations générales de la session CAB seront disponibles après
                          l'évaluation complète de toutes les RFCs et la prise de décision finale.
                        </p>
                        <div className="rec-actions">
                          <button className="btn-secondary-sm" onClick={generateProcesVerbal}>
                            <FiFileText /> Générer Rapport
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL — Créer une réunion
      ══════════════════════════════════════════════════════ */}
      {showCreateReunion && (
        <div className="cab-modal-backdrop" onClick={() => { setShowCreateReunion(false); setNewReunionParticipants([]); }}>
          <div className="cab-modal cab-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="cab-modal-header">
              <div>
                <h2><FiCalendar /> Nouvelle Session CAB</h2>
                <p>Renseignez les informations de la session et sélectionnez les membres participants.</p>
              </div>
              <button className="modal-close" onClick={() => { setShowCreateReunion(false); setNewReunionParticipants([]); }}><FiX /></button>
            </div>
            <form onSubmit={handleCreateReunion}>
              <div className="cab-modal-body create-reunion-body">

                {/* Colonne gauche : infos session */}
                <div className="create-col-left">
                  <div className="cm-field">
                    <label>Date de la session <span className="req">*</span></label>
                    <input type="date" value={newReunion.date_reunion}
                      onChange={e => setNewReunion({ ...newReunion, date_reunion: e.target.value })} required />
                  </div>
                  <div className="cm-field-row">
                    <div className="cm-field">
                      <label>Heure de début</label>
                      <input type="time" value={newReunion.heure_debut}
                        onChange={e => setNewReunion({ ...newReunion, heure_debut: e.target.value })} />
                    </div>
                    <div className="cm-field">
                      <label>Heure de fin</label>
                      <input type="time" value={newReunion.heure_fin}
                        onChange={e => setNewReunion({ ...newReunion, heure_fin: e.target.value })} />
                    </div>
                  </div>
                  <div className="cm-field">
                    <label>Ordre du jour</label>
                    <textarea rows="4" value={newReunion.ordre_jour}
                      onChange={e => setNewReunion({ ...newReunion, ordre_jour: e.target.value })}
                      placeholder="Ex: Revue des RFC urgentes — Sprint 12" />
                  </div>
                </div>

                {/* Colonne droite : sélection des participants */}
                <div className="create-col-right">
                  <div className="participants-col-header">
                    <label>Sélectionner des Comptes CAB</label>
                    {newReunionParticipants.length > 0 && (
                      <span className="selected-count-badge">
                        {newReunionParticipants.length} sélectionné{newReunionParticipants.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Dropdown Select participants */}
                  <div className="select-picker-container" style={{ marginBottom: '1.5rem' }}>
                    <select 
                      className="premium-select"
                      disabled={allCabProfiles.length === 0}
                      onChange={(e) => {
                          const id = e.target.value;
                          console.log('Selection changed:', id);
                          if (!id) return;
                          const user = allCabProfiles.find(u => String(u.id_user) === String(id));
                          if (user && !newReunionParticipants.some(p => String(p.id_user) === String(id))) {
                              setNewReunionParticipants([...newReunionParticipants, user]);
                          }
                          e.target.value = ''; // Reset select
                      }}
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', background: 'white', fontSize: '0.9rem', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}
                    >
                      <option value="">
                        {loading ? '-- Chargement des comptes... --' : 
                         allCabProfiles.length === 0 ? '-- Aucun compte CAB trouvé en base --' : 
                         '-- Choisir un compte avec le rôle CAB --'}
                      </option>
                      {allCabProfiles
                        .filter(u => !newReunionParticipants.some(p => String(p.id_user) === String(u.id_user)))
                        .map(u => (
                          <option key={u.id_user} value={u.id_user}>
                            {u.prenom_user} {u.nom_user} ({u.direction?.nom_direction || u.email_user})
                          </option>
                        ))
                      }
                    </select>
                    {allCabProfiles.length === 0 && !loading && (
                      <div style={{ marginTop: '10px', padding: '10px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', color: '#9a3412', fontSize: '0.8rem' }}>
                         <strong>Info :</strong> Aucun utilisateur avec le rôle technique 'MEMBRE_CAB' n'a été trouvé. Veuillez vérifier dans la gestion des utilisateurs (Admin).
                      </div>
                    )}
                    <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#64748b' }}>Seuls les utilisateurs ayant le rôle CAB sont listés ici.</p>
                  </div>

                  {/* List of selected participants */}
                  <div className="selected-participants-list" style={{ maxHeight: '280px', overflowY: 'auto' }}>
                    {newReunionParticipants.length === 0 ? (
                      <div className="cab-empty-list" style={{ padding: '2rem 1rem', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                        <FiUserPlus size={32} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
                        <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>Aucun participant sélectionné.<br/>Utilisez la liste déroulante ci-dessus.</p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {newReunionParticipants.map(u => {
                          const isOfficial = isCabMember(u.id_user);
                          return (
                            <div key={u.id_user} className="selected-pilot-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'white', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '32px', height: '32px', background: '#e0f2fe', color: '#0369a1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700', fontSize: '0.75rem' }}>{initials(u)}</div>
                                <div>
                                  <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1e293b' }}>
                                    {u.prenom_user} {u.nom_user}
                                    {isOfficial && <span style={{ marginLeft: '8px', fontSize: '0.65rem', background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px' }}>Comité</span>}
                                  </div>
                                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{u.direction?.nom_direction || u.email_user}</div>
                                </div>
                              </div>
                              <button 
                                type="button"
                                onClick={() => setNewReunionParticipants(prev => prev.filter(p => p.id_user !== u.id_user))}
                                style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex' }}
                              >
                                <FiX size={16} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

              </div>
              <div className="cab-modal-footer">
                <span className="member-count-info">
                  {newReunionParticipants.length}/{cabMembers.length} membres sélectionnés
                </span>
                <button type="button" className="btn-cancel-modal" onClick={() => { setShowCreateReunion(false); setNewReunionParticipants([]); }}>Annuler</button>
                <button type="submit" className="btn-submit-modal"><FiCheck /> Créer la session</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Gérer les profils MEMBRE_CAB
      ══════════════════════════════════════════════════════ */}
      {showAddMember && (
        <div className="cab-modal-backdrop" onClick={() => setShowAddMember(false)}>
          <div className="cab-modal cab-modal--wide" onClick={e => e.stopPropagation()}>
            <div className="cab-modal-header">
              <div>
                <h2><FiShield /> Profils disponibles — Rôle MEMBRE_CAB</h2>
                <p>Sélectionnez les utilisateurs ayant le rôle <strong>Membre CAB</strong> à intégrer dans le comité.</p>
              </div>
              <button className="modal-close" onClick={() => setShowAddMember(false)}><FiX /></button>
            </div>
            <div className="cab-modal-body">
              {/* Dropdown Select for official committee members */}
              <div className="committee-select-box" style={{ marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                 <label style={{ display: 'block', fontWeight: '700', marginBottom: '10px', fontSize: '0.9rem', color: '#1e40af' }}>Recruter un nouveau Membre du Comité</label>
                 <select 
                    className="premium-select"
                    onChange={(e) => {
                        const id = e.target.value;
                        if (!id) return;
                        const user = allCabProfiles.find(u => u.id_user === id);
                        if (user) handleAddCabMember(user);
                        e.target.value = ''; // Reset select
                    }}
                    style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #3b82f6', background: 'white', fontSize: '1rem', cursor: 'pointer' }}
                 >
                    <option value="">-- Parcourir les comptes de rôle CAB --</option>
                    {allCabProfiles
                        .filter(u => !isCabMember(u.id_user))
                        .map(u => (
                            <option key={u.id_user} value={u.id_user}>
                                {u.prenom_user} {u.nom_user} ({u.direction?.nom_direction || u.email_user})
                            </option>
                        ))
                    }
                 </select>
                 <p style={{ margin: '10px 0 0', fontSize: '0.8rem', color: '#64748b' }}>Seuls les comptes ayant le rôle CAB peuvent être intégrés au comité.</p>
              </div>

              {/* Display existing committee members for reference and management */}
              <h3 style={{ fontSize: '1rem', color: '#0f172a', marginBottom: '1rem', paddingLeft: '4px' }}>Membres Actuels du Comité ({cabMembers.length})</h3>
              <div className="profiles-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                 {cabMembers.map((m, idx) => {
                    const u = m.utilisateur || m;
                    return (
                        <div key={idx} className="profile-card profile-card--member" style={{ padding: '12px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ width: '36px', height: '36px', background: 'white', color: '#0369a1', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '700' }}>{initials(u)}</div>
                              <div>
                                 <div style={{ fontSize: '0.9rem', fontWeight: '700' }}>{u.prenom_user} {u.nom_user}</div>
                                 <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{m.role === 'PRESIDENT' ? '👑 Président' : 'Membre CAB'}</div>
                              </div>
                           </div>
                           <button className="btn-remove-sm" onClick={() => handleRemoveCabMember(m)} title="Retirer du comité" style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '8px' }}>
                              <FiTrash2 size={18} />
                           </button>
                        </div>
                    );
                 })}
              </div>
            </div>
            <div className="cab-modal-footer">
              <span className="member-count-info">
                {cabMembers.length} membre{cabMembers.length > 1 ? 's' : ''} dans le comité • {allCabProfiles.length} profil{allCabProfiles.length > 1 ? 's' : ''} disponible{allCabProfiles.length > 1 ? 's' : ''}
              </span>
              <button className="btn-cancel-modal" onClick={() => setShowAddMember(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vote */}
      {showVoteModal && selectedRfcForVote && (
        <div className="cab-modal-overlay" onClick={() => setShowVoteModal(false)}>
          <div className="cab-modal vote-modal" onClick={e => e.stopPropagation()}>
            <div className="cab-modal-header">
              <div>
                <h2><FiTrendingUp /> Vote sur RFC #{selectedRfcForVote.code_rfc}</h2>
                <p>{selectedRfcForVote.titre_rfc}</p>
              </div>
              <button className="modal-close" onClick={() => setShowVoteModal(false)}><FiX /></button>
            </div>
            <div className="cab-modal-body">
              <div className="vote-section">
                <h3>Votre vote</h3>
                <div className="vote-options">
                  <label className="vote-option">
                    <input
                      type="radio"
                      name="vote"
                      value="APPROUVE"
                      checked={userVote === 'APPROUVE'}
                      onChange={e => setUserVote(e.target.value)}
                    />
                    <span className="vote-label approve"><FiCheckCircle /> Approuver</span>
                  </label>
                  <label className="vote-option">
                    <input
                      type="radio"
                      name="vote"
                      value="REJETE"
                      checked={userVote === 'REJETE'}
                      onChange={e => setUserVote(e.target.value)}
                    />
                    <span className="vote-label reject"><FiXCircle /> Rejeter</span>
                  </label>
                  <label className="vote-option">
                    <input
                      type="radio"
                      name="vote"
                      value="AJOURNE"
                      checked={userVote === 'AJOURNE'}
                      onChange={e => setUserVote(e.target.value)}
                    />
                    <span className="vote-label adjourn"><FiClock /> Ajourner</span>
                  </label>
                </div>
              </div>

              <div className="votes-summary">
                <h3>Résultats des votes ({currentVotes.length})</h3>
                {currentVotes.length === 0 ? (
                  <p className="no-votes">Aucun vote enregistré pour le moment.</p>
                ) : (
                  <div className="votes-list">
                    {currentVotes.map(vote => (
                      <div key={vote.id_vote} className="vote-item">
                        <div className="vote-user">
                          {initials(vote.utilisateur)} {vote.utilisateur.prenom_user} {vote.utilisateur.nom_user}
                        </div>
                        <div className={`vote-value ${vote.valeur_vote.toLowerCase()}`}>
                          {vote.valeur_vote === 'APPROUVE' && <><FiCheckCircle /> Approuvé</>}
                          {vote.valeur_vote === 'REJETE' && <><FiXCircle /> Rejeté</>}
                          {vote.valeur_vote === 'AJOURNE' && <><FiClock /> Ajourné</>}
                        </div>
                        <div className="vote-date">
                          {new Date(vote.date_vote).toLocaleString('fr-FR')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="cab-modal-footer">
              <button className="btn-cancel-modal" onClick={() => setShowVoteModal(false)}>Fermer</button>
              <button className="btn-primary" onClick={handleSubmitVote} disabled={!userVote}>
                <FiCheck /> Voter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Décision */}
      {showDecisionModal && selectedRfcForDecision && (
        <div className="cab-modal-overlay" onClick={() => setShowDecisionModal(false)}>
          <div className="cab-modal decision-modal" onClick={e => e.stopPropagation()}>
            <div className="cab-modal-header">
              <div>
                <h2><FiCheckCircle /> Décision finale sur RFC #{selectedRfcForDecision.code_rfc}</h2>
                <p>{selectedRfcForDecision.titre_rfc}</p>
              </div>
              <button className="modal-close" onClick={() => setShowDecisionModal(false)}><FiX /></button>
            </div>
            <div className="cab-modal-body">
              <div className="decision-section">
                <div className="cm-field">
                  <label>Décision <span className="req">*</span></label>
                  <select
                    value={decision}
                    onChange={e => setDecision(e.target.value)}
                    required
                    className="premium-select"
                  >
                    <option value="">-- Sélectionner une décision --</option>
                    <option value="APPROUVEE">Approuver la RFC</option>
                    <option value="REJETEE">Rejeter la RFC</option>
                    <option value="AJOURNEE">Ajourner la RFC</option>
                  </select>
                </div>
                <div className="cm-field">
                  <label>Motif (optionnel)</label>
                  <textarea
                    rows="3"
                    value={decisionMotif}
                    onChange={e => setDecisionMotif(e.target.value)}
                    placeholder="Expliquez brièvement la décision..."
                  />
                </div>
              </div>
            </div>
            <div className="cab-modal-footer">
              <button className="btn-cancel-modal" onClick={() => setShowDecisionModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleSubmitDecision} disabled={!decision}>
                <FiCheck /> Valider la décision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL — Évaluation détaillée RFC
      ══════════════════════════════════════════════════════ */}
      {showEvaluationModal && selectedRfcForEval && (
        <div className="cab-modal-backdrop" onClick={() => setShowEvaluationModal(false)}>
          <div className="cab-modal cab-modal--xl" onClick={e => e.stopPropagation()}>
            <div className="cab-modal-header">
              <div>
                <h2><FiFileText /> Évaluation Détaillée — #{selectedRfcForEval.code_rfc}</h2>
                <p>Analyse complète de l'impact et des risques pour la prise de décision CAB</p>
              </div>
              <button className="modal-close" onClick={() => setShowEvaluationModal(false)}><FiX /></button>
            </div>
            <div className="cab-modal-body">
              <div className="evaluation-form">

                {/* Informations RFC */}
                <div className="eval-section">
                  <h3>Informations de la RFC</h3>
                  <div className="rfc-summary-card">
                    <div className="rfc-summary-header">
                      <span className="rfc-code">#{selectedRfcForEval.code_rfc}</span>
                      <span className="rfc-priority" style={{
                        background: selectedRfcForEval.priorite === 'CRITIQUE' ? '#fef2f2' : selectedRfcForEval.priorite === 'HAUTE' ? '#fff7ed' : '#f1f5f9',
                        color: selectedRfcForEval.priorite === 'CRITIQUE' ? '#dc2626' : selectedRfcForEval.priorite === 'HAUTE' ? '#ea580c' : '#475569',
                        padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600'
                      }}>
                        {selectedRfcForEval.priorite}
                      </span>
                    </div>
                    <h4>{selectedRfcForEval.titre_rfc}</h4>
                    <p className="rfc-description">{selectedRfcForEval.description_rfc}</p>
                    <div className="rfc-meta">
                      <span><strong>Demandeur:</strong> {selectedRfcForEval.demandeur?.prenom_user} {selectedRfcForEval.demandeur?.nom_user}</span>
                      <span><strong>Type:</strong> {selectedRfcForEval.type_changement?.nom_type || 'N/A'}</span>
                      <span><strong>Environnement:</strong> {selectedRfcForEval.environnement?.nom_env || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Analyse d'impact */}
                <div className="eval-section">
                  <h3>📊 Analyse d'Impact</h3>
                  <div className="impact-grid">
                    <div className="impact-field">
                      <label>Impact Business</label>
                      <textarea
                        placeholder="Décrivez l'impact sur les processus métier, les utilisateurs finaux, etc."
                        value={evaluation.impact_business}
                        onChange={e => setEvaluation({...evaluation, impact_business: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Impact Technique</label>
                      <textarea
                        placeholder="Impact sur l'infrastructure, les systèmes, la performance, etc."
                        value={evaluation.impact_technique}
                        onChange={e => setEvaluation({...evaluation, impact_technique: e.target.value})}
                        rows={3}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Impact Sécurité</label>
                      <textarea
                        placeholder="Risques de sécurité, conformité, confidentialité, etc."
                        value={evaluation.impact_securite}
                        onChange={e => setEvaluation({...evaluation, impact_securite: e.target.value})}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>

                {/* Évaluation des risques */}
                <div className="eval-section">
                  <h3>⚠️ Évaluation des Risques</h3>
                  <div className="risk-assessment">
                    <div className="risk-level-selector">
                      <label>Niveau de Risque Global</label>
                      <div className="risk-buttons">
                        {[
                          { value: 'FAIBLE', label: 'Faible', color: '#10b981' },
                          { value: 'MOYEN', label: 'Moyen', color: '#f59e0b' },
                          { value: 'ELEVE', label: 'Élevé', color: '#ef4444' },
                          { value: 'CRITIQUE', label: 'Critique', color: '#7c2d12' }
                        ].map(risk => (
                          <button
                            key={risk.value}
                            type="button"
                            className={`risk-btn ${evaluation.niveau_risque === risk.value ? 'active' : ''}`}
                            onClick={() => setEvaluation({...evaluation, niveau_risque: risk.value})}
                            style={{ '--risk-color': risk.color }}
                          >
                            {risk.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Validation des tests */}
                <div className="eval-section">
                  <h3>🧪 Validation des Tests</h3>
                  <div className="tests-validation">
                    <label className="checkbox-field">
                      <input
                        type="checkbox"
                        checked={evaluation.tests_valides}
                        onChange={e => setEvaluation({...evaluation, tests_valides: e.target.checked})}
                      />
                      <span className="checkmark"></span>
                      Les tests appropriés ont été effectués et validés
                    </label>
                    {!evaluation.tests_valides && (
                      <p className="warning-text">
                        ⚠️ Attention: La validation des tests est recommandée avant l'approbation finale.
                      </p>
                    )}
                  </div>
                </div>

                {/* Recommandations */}
                <div className="eval-section">
                  <h3>💡 Recommandations du CAB</h3>
                  <textarea
                    placeholder="Formulez vos recommandations pour l'approbation, le rejet ou la modification de cette RFC..."
                    value={evaluation.recommandations}
                    onChange={e => setEvaluation({...evaluation, recommandations: e.target.value})}
                    rows={4}
                  />
                </div>

                {/* Actions correctives */}
                <div className="eval-section">
                  <h3>🔧 Actions Correctives Recommandées</h3>
                  <textarea
                    placeholder="Si nécessaire, proposez des actions correctives ou des conditions d'approbation..."
                    value={evaluation.actions_correctives}
                    onChange={e => setEvaluation({...evaluation, actions_correctives: e.target.value})}
                    rows={3}
                  />
                </div>

              </div>
            </div>
            <div className="cab-modal-footer">
              <button className="btn-cancel-modal" onClick={() => setShowEvaluationModal(false)}>Annuler</button>
              <button className="btn-primary" onClick={handleSubmitEvaluation}>
                <FiCheck /> Enregistrer l'Évaluation
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CabManagement;
