import React, { useState, useEffect } from 'react';
import {
  FiUsers, FiCalendar, FiClock, FiPlus, FiFileText,
  FiCheckCircle, FiXCircle, FiTrendingUp, FiChevronRight,
  FiUserPlus, FiTrash2, FiSearch, FiShield, FiX, FiCheck,
  FiUserCheck, FiAlertCircle, FiRefreshCw, FiLayers
} from 'react-icons/fi';
import api from '../../api/axiosClient';
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
  const user = JSON.parse(localStorage.getItem('user')) || {};
  const roles = user.roles || [];

  // CAB & réunions
  const [activeCab,       setActiveCab]       = useState(null);
  const [reunions,        setReunions]         = useState([]);
  const [selectedReunion, setSelectedReunion]  = useState(null);
  const [rfcsApprouvees,  setRfcsApprouvees]   = useState([]);
  const [changementsDisponibles, setChangementsDisponibles] = useState([]);
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
  const [showRecDetails,    setShowRecDetails]    = useState(false);
  const [selectedRecs,      setSelectedRecs]      = useState(null);
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
    actions_correctives: '',
    conditions: '',
    securite_rollback: '',
    precautions: ''
  });
  const [voteResultModal, setVoteResultModal] = useState(null); // { type: 'success' | 'error', message: '' }


  // Form nouvelle réunion
  const [newReunion, setNewReunion] = useState({
    date_reunion: '', heure_debut: '', heure_fin: '', ordre_jour: ''
  });
  // Profils sélectionnés pour la nouvelle réunion
  const [newReunionParticipants, setNewReunionParticipants] = useState([]);
  const [reunionMemberSearch,   setReunionMemberSearch]   = useState('');
  
  // Stockage local des évaluations pour les décisions
  const [rfcEvaluations, setRfcEvaluations] = useState({});

  // Toast notification
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadReunionDetails = async (reunionId) => {
    try {
      const res = await api.get(`/reunions/${reunionId}`);
      if (res.success) {
        setSelectedReunion(res.reunion);
      }
    } catch (err) {
      console.error('Erreur rechargement réunion:', err);
    }
  };

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
        api.get('/users?nom_role=MEMBRE_CAB&limit=100'),
      ]);

      console.log('API Responses Debug:', {
        cabs: resCabs.success,
        rfcs: resRfcs.success,
        profilesCount: resProfiles.data?.data?.length || 0
      });

      if (resCabs.success && (resCabs.data?.cabs?.length > 0 || resCabs.cabs?.length > 0)) {
        const cab = resCabs.data?.cabs?.[0] || resCabs.cabs?.[0];
        setActiveCab(cab);
        await fetchReunions(cab.id_cab);
        await fetchCabMembers(cab.id_cab);
      }

      if (resRfcs.success) {
        const rfcsList = resRfcs.data?.rfcs || resRfcs.rfcs || [];
        setRfcsApprouvees(rfcsList.filter(r => r.statut?.code_statut === 'APPROUVEE'));
      }

      // Charger les changements
      try {
        const resChanges = await api.get('/changements');
        const rawChanges = resChanges?.data?.changements || resChanges?.changements || resChanges?.data || resChanges || [];
        setChangementsDisponibles(Array.isArray(rawChanges) ? rawChanges : []);
      } catch (err) {
        console.error('Erreur chargement changements:', err);
      }

      const allUsers = resProfiles?.data?.data || resProfiles?.data?.users || resProfiles?.data || (Array.isArray(resProfiles) ? resProfiles : []);
      
      const hasRole = (u, name) => {
          if (!u) return false;
          const roleList = [];
          if (Array.isArray(u.roles)) {
              u.roles.forEach(r => {
                  if (typeof r === 'string') roleList.push(r.toUpperCase());
                  else if (r && r.nom_role) roleList.push(r.nom_role.toUpperCase());
              });
          }
          if (u.role && u.role.nom_role) roleList.push(u.role.nom_role.toUpperCase());
          if (u.nom_role) roleList.push(u.nom_role.toUpperCase());
          return roleList.includes(name.toUpperCase());
      };

      if (Array.isArray(allUsers)) {
        const cabProfiles = allUsers.filter(u => hasRole(u, 'MEMBRE_CAB'));
        console.log('Profiles CAB chargés:', cabProfiles.length);
        setAllCabProfiles(cabProfiles);
      } else {
        console.warn('Aucun profil trouvé.');
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
      if (res.success) setReunions(res.data?.reunions || res.reunions || []);
    } catch (err) {
      console.error('Fetch Reunions:', err);
    }
  };

  const fetchCabMembers = async (cabId) => {
    try {
      const res = await api.get(`/cab/${cabId}/membres`);
      if (res.success) setCabMembers(res.data?.membres || res.membres || []);
    } catch (err) {
      console.error('Fetch CAB Members:', err);
    }
  };

  const fetchParticipants = async (reunionId) => {
    try {
      const res = await api.get(`/reunions/${reunionId}/participants`);
      if (res.success) setParticipants(res.data?.participants || res.participants || []);
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

  const handleEvaluationClick = async (rfc) => {
    // D'abord on met un placeholder, puis on charge les données complètes
    setSelectedRfcForEval(rfc);

    const defaultEval = {
      impact_business: '',
      impact_technique: '',
      impact_securite: '',
      niveau_risque: 'FAIBLE',
      tests_valides: false,
      recommandations: '',
      actions_correctives: '',
      conditions: '',
      securite_rollback: '',
      precautions: ''
    };

    try {
      // 1. Charger les données COMPLÈTES de la RFC (description, justification, statut, etc.)
      const rfcRes = await api.get(`/rfc/${rfc.id_rfc}`);
      const fullRfc = rfcRes?.data?.rfc || rfcRes?.rfc || rfcRes?.data || rfc;
      setSelectedRfcForEval(fullRfc);

      // 2. Charger l'évaluation de risque existante
      try {
        const res = await api.get(`/rfcs/${rfc.id_rfc}/evaluation-risque`);
        if (res && res.id_evaluation) {
          if (res.description) {
            try {
              const parsed = JSON.parse(res.description);
              setEvaluation({
                ...defaultEval,
                ...parsed,
                niveau_risque: parsed.niveau_risque || (res.score_risque > 15 ? 'CRITIQUE' : res.score_risque > 10 ? 'ELEVE' : res.score_risque > 5 ? 'MOYEN' : 'FAIBLE')
              });
            } catch (e) {
              setEvaluation({ ...defaultEval, recommandations: res.description });
            }
          } else {
            setEvaluation(defaultEval);
          }
        } else {
          setEvaluation(defaultEval);
        }
      } catch (_) {
        setEvaluation(defaultEval);
      }
    } catch (err) {
      console.error('Erreur chargement RFC complète:', err);
      // Fallback : garder l'objet partiel reçu
      setEvaluation(defaultEval);
    }

    setShowEvaluationModal(true);
  };

  const handleSubmitEvaluation = async () => {
    try {
      // Préparer le payload pour le backend (table EvaluationRisque)
      const riskMapping = { 'FAIBLE': 1, 'MOYEN': 2, 'ELEVE': 4, 'CRITIQUE': 5 };
      const score = riskMapping[evaluation.niveau_risque] || 1;
      
      const payload = {
        impacte: 1, // Fixé car on stocke le détail dans description
        probabilite: score,
        description: JSON.stringify(evaluation) // On emballe tout l'objet UI dans le champ description
      };

      // Sauvegarder en BDD
      await api.put(`/rfcs/${selectedRfcForEval.id_rfc}/evaluation-risque`, payload);

      // Stocker également localement pour la session courante
      setRfcEvaluations(prev => ({
        ...prev,
        [selectedRfcForEval.id_rfc]: { ...evaluation }
      }));
      
      showToast('Évaluation enregistrée et synchronisée avec le serveur');
      setShowEvaluationModal(false);
      setSelectedRfcForEval(null);
    } catch (err) {
      console.error('Erreur évaluation:', err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement de l\'évaluation';
      showToast(errMsg, 'error');
    }
  };

  const handleSubmitDecision = async () => {
    if (!decision) {
      showToast('Veuillez sélectionner une décision', 'error');
      return;
    }

    const rfcEval = rfcEvaluations[selectedRfcForDecision.id_rfc] || {};
    
    // On prépare le motif en incluant les recommandations détaillées si présentes
    // Si des recommandations ITIL ont été saisies, on emballe le tout en JSON
    let finalMotif = decisionMotif;
    if (rfcEval.conditions || rfcEval.securite_rollback || rfcEval.precautions) {
      finalMotif = JSON.stringify({
        motif: decisionMotif,
        conditions: rfcEval.conditions,
        securite_rollback: rfcEval.securite_rollback,
        precautions: rfcEval.precautions,
        recommandations: rfcEval.recommandations,
        actions_correctives: rfcEval.actions_correctives
      });
    }

    try {
      const payload = {
        decision: decision,
        motif: finalMotif
      };
      
      const res = await api.post(`/reunions/${selectedReunion.id_reunion}/rfcs/${selectedRfcForDecision.id_rfc}/decision`, payload);
      
      if (res.success) {
        showToast(`Décision enregistrée pour la RFC #${selectedRfcForDecision.code_rfc}`);
        setShowDecisionModal(false);
        setSelectedRfcForDecision(null);
        setDecision('');
        setDecisionMotif('');
        
        // Recharger les données de la réunion pour mettre à jour l'UI
        await loadReunionDetails(selectedReunion.id_reunion);
      }
    } catch (err) {
      console.error('Erreur décision:', err);
      const errMsg = err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Erreur lors de l\'enregistrement de la décision';
      showToast(errMsg, 'error');
    }
  };

  const handleViewRecommendations = async (rfc) => {
    // 1. Chercher depuis la décision CAB (motif JSON)
    const decisionObj = selectedReunion?.rfcReunions?.find(item => item.id_rfc === rfc.id_rfc)?.decisionCab || 
                       selectedReunion?.decisionsCab?.find(d => d.id_rfc === rfc.id_rfc);
    
    let recData = null;

    if (decisionObj?.motif) {
      try {
        if (decisionObj.motif.startsWith('{')) {
          const parsed = JSON.parse(decisionObj.motif);
          if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
            recData = {
              motif: parsed.motif || '',
              conditions: parsed.conditions || 'Aucune condition spécifiée.',
              securite_rollback: parsed.securite_rollback || 'Non renseigné.',
              precautions: parsed.precautions || 'Non renseigné.',
              recommandations: parsed.recommandations || '',
              empty: false,
              code: rfc.code_rfc
            };
          }
        }
      } catch (e) { /* pas du JSON */ }
    }

    // 2. Fallback : lire depuis EvaluationRisque.description (JSON)
    if (!recData) {
      try {
        const evalRes = await api.get(`/rfcs/${rfc.id_rfc}/evaluation-risque`);
        if (evalRes?.id_evaluation && evalRes.description) {
          const parsed = JSON.parse(evalRes.description);
          if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
            recData = {
              motif: '',
              conditions: parsed.conditions || 'Non renseigné.',
              securite_rollback: parsed.securite_rollback || 'Non renseigné.',
              precautions: parsed.precautions || 'Non renseigné.',
              recommandations: parsed.recommandations || '',
              empty: false,
              code: rfc.code_rfc
            };
          }
        }
      } catch (e) { /* pas d'évaluation */ }
    }

    // 3. Rien trouvé du tout
    if (!recData) {
      setSelectedRecs({ empty: true, code: rfc.code_rfc });
      setShowRecDetails(true);
      return;
    }

    setSelectedRecs(recData);
    setShowRecDetails(true);
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

  /* ── Add Change to agenda ── */
  const handleAddChangeToAgenda = async (changeId) => {
    if (!selectedReunion) return;
    try {
      const selectedChange = changementsDisponibles.find(c => String(c.id_changement) === String(changeId));
      const idRfcToRegister = selectedChange?.id_rfc || selectedChange?.rfc?.id_rfc;

      if (!idRfcToRegister) {
        showToast('Ce changement n\'est pas lié à une RFC valide.', 'error');
        return;
      }

      const res = await api.post(`/reunions/${selectedReunion.id_reunion}/rfcs`, { id_rfc: idRfcToRegister });
      if (res.success) {
        const updated = await api.get(`/reunions/${selectedReunion.id_reunion}`);
        if (updated.success) setSelectedReunion(updated.reunion);
        showToast('Changement inscrit à l\'ordre du jour.');
      }
    } catch (err) {
      showToast(err?.response?.data?.message || 'Erreur lors de l\'inscription.', 'error');
    }
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

      {/* ── VOTE RESULT MODAL ── */}
      {voteResultModal && (
        <div onClick={() => setVoteResultModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', padding: '3rem 2.5rem', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', border: `3px solid ${voteResultModal.type === 'success' ? '#22c55e' : '#ef4444'}` }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: voteResultModal.type === 'success' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
              {voteResultModal.type === 'success' ? '✅' : '❌'}
            </div>
            <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.4rem', fontWeight: 900, color: voteResultModal.type === 'success' ? '#15803d' : '#b91c1c' }}>
              {voteResultModal.type === 'success' ? 'Vote Approuvé' : 'Vote Rejeté'}
            </h2>
            <p style={{ color: '#64748b', margin: '0 0 2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>{voteResultModal.message}</p>
            <button
              onClick={() => setVoteResultModal(null)}
              style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none', background: voteResultModal.type === 'success' ? '#22c55e' : '#ef4444', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* ═══ HEADER ══════════════════════════════════════════ */}
      <div className="premium-header-card" style={{ marginBottom: '1rem', background: 'white' }}>
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiLayers /></div>
          <div className="premium-header-text">
            <h1>Gestion de la Planification CAB</h1>
            <p>Planifiez les sessions, gérez les membres et enregistrez les décisions collectives.</p>
          </div>
        </div>
      </div>

      {/* ── TOOLBAR ACTIONS ── */}
      <div className="rfc-mgr-toolbar" style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
        <button className="btn-secondary-cab" onClick={() => initData()} style={{ background: '#f8fafc' }}>
          <FiRefreshCw /> Actualiser
        </button>
        <button className="btn-secondary-cab" onClick={() => setShowAddMember(true)}>
          <FiUserPlus /> Gérer les profils
        </button>
        <button className="btn-create-premium" onClick={() => setShowCreateReunion(true)}>
          <FiPlus /> Nouvelle réunion
        </button>
      </div>

      {/* ═══ KPIs ════════════════════════════════════════════ */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card blue">
          <div className="stat-icon-wrapper">
            <FiUsers size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{cabMembers.length}</div>
            <div className="stat-label">Membres CAB</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon-wrapper">
            <FiCalendar size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{reunions.length}</div>
            <div className="stat-label">Sessions</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon-wrapper">
            <FiFileText size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{rfcsApprouvees.length}</div>
            <div className="stat-label">RFC Approuvées</div>
          </div>
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
                    <h4>Changements à l'ordre du jour</h4>
                    {(!selectedReunion.rfcReunions || selectedReunion.rfcReunions.length === 0) ? (
                      <div className="cab-empty-list">
                        <FiFileText />
                        <p>Aucun changement inscrit. Sélectionnez-en un ci-dessous.</p>
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
                          <button className="btn-outline-sm" onClick={() => handleViewRecommendations(item.rfc)} style={{ padding: '8px', borderRadius: '8px', borderColor: '#6366f1', color: '#6366f1' }} title="Voir Recommandations">
                            <FiFileText />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Changements disponibles à ajouter */}
                  <div className="available-section">
                    <h4>Inscrire un Changement</h4>
                    <div className="select-picker-container" style={{ marginTop: '1rem', display: 'flex', gap: '10px' }}>
                      <select 
                        className="premium-select"
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id) handleAddChangeToAgenda(id);
                          e.target.value = '';
                        }}
                        style={{ flex: 1, padding: '12px', borderRadius: '10px', border: '2px solid #e2e8f0', background: 'white', fontSize: '0.9rem' }}
                      >
                        <option value="">-- Sélectionner un changement à inscrire --</option>
                        {changementsDisponibles
                          .filter(ac => {
                            const idRfc = ac.id_rfc || ac.rfc?.id_rfc;
                            return idRfc && !selectedReunion.rfcReunions?.some(i => i.rfc?.id_rfc === idRfc);
                          })
                          .map(ac => (
                            <option key={ac.id_changement} value={ac.id_changement}>
                              {ac.code_metier || ac.code_changement || ac.id_changement} - {ac.titre || ac.rfc?.titre_rfc}
                            </option>
                          ))}
                      </select>
                    </div>
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
                              <button className="btn-outline-sm" onClick={() => handleViewRecommendations(item.rfc)} style={{ borderColor: '#6366f1', color: '#6366f1' }}>
                                <FiFileText /> Recommandations
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
          <div className="cab-modal cab-modal--wide premium-evaluation" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style premium">
              <div className="rfc-style-icon-wrapper">
                <FiCalendar size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Nouvelle Session CAB</h2>
                <div className="rfc-style-subtitle">Renseignez les informations de la session et sélectionnez les membres participants.</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => { setShowCreateReunion(false); setNewReunionParticipants([]); }}><FiX size={24} /></button>
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
                      style={{ width: '100%', padding: '12px', borderRadius: '10px', border: '2px solid #bae6fd', background: 'white', fontSize: '0.9rem', cursor: 'pointer', outline: 'none', transition: 'all 0.2s' }}
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
                            <div key={u.id_user} className="selected-pilot-item" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'white', borderRadius: '10px', border: '1px solid #bae6fd', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
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
          <div className="cab-modal cab-modal--wide premium-evaluation" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style premium">
              <div className="rfc-style-icon-wrapper">
                <FiShield size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Profils disponibles — Rôle MEMBRE_CAB</h2>
                <div className="rfc-style-subtitle">Sélectionnez les utilisateurs ayant le rôle Membre CAB à intégrer dans le comité.</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowAddMember(false)}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              {/* Dropdown Select for official committee members */}
              <div className="committee-select-box" style={{ marginBottom: '2.5rem', background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #bae6fd' }}>
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
          <div className="cab-modal vote-modal premium-evaluation" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style premium">
              <div className="rfc-style-icon-wrapper">
                <FiTrendingUp size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Vote sur RFC #{selectedRfcForVote.code_rfc}</h2>
                <div className="rfc-style-subtitle">{selectedRfcForVote.titre_rfc}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowVoteModal(false)}><FiX size={24} /></button>
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ margin: 0 }}>Résultats des votes ({currentVotes.length})</h3>
                  {(roles.includes('ADMIN') || roles.includes('CHANGE_MANAGER') || roles.includes('ADMIN_SYSTEME')) && (
                    <button 
                      className="btn-outline-sm" 
                      onClick={() => handleViewRecommendations(selectedRfcForVote)}
                      style={{ borderColor: '#6366f1', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <FiFileText /> Recommandations
                    </button>
                  )}
                </div>
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
                        {(roles.includes('ADMIN') || roles.includes('ADMIN_SYSTEME') || roles.includes('CHANGE_MANAGER')) && (
                          <button 
                            className="cm-rec-icon-btn" 
                            onClick={() => handleViewRecommendations(selectedRfcForVote)}
                            style={{ width: '24px', height: '24px', fontSize: '0.8rem', background: '#f1f5f9', border: '1px solid #e2e8f0', color: '#6366f1', borderRadius: '6px', cursor: 'pointer' }}
                            title="Recommandations"
                          >
                            <FiFileText />
                          </button>
                        )}
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
          <div className="cab-modal decision-modal premium-evaluation" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style premium">
              <div className="rfc-style-icon-wrapper">
                <FiCheckCircle size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Décision finale sur RFC #{selectedRfcForDecision.code_rfc}</h2>
                <div className="rfc-style-subtitle">{selectedRfcForDecision.titre_rfc}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowDecisionModal(false)}><FiX size={24} /></button>
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
        <div className="cab-modal-overlay" onClick={() => setShowEvaluationModal(false)}>
          <div className="cab-modal cab-modal--xl premium-evaluation" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style premium">
              <div className="rfc-style-icon-wrapper">
                <FiFileText size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2>Évaluation de la RFC #{selectedRfcForEval.code_rfc}</h2>
                <div className="rfc-style-subtitle">{selectedRfcForEval.titre_rfc}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowEvaluationModal(false)}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body evaluation-form">
                <div className="eval-section">
                  <h3>Informations de la RFC</h3>
                  <div className="rfc-summary-card">
                    {/* En-tête : code + priorité */}
                    <div className="rfc-summary-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                      <span className="rfc-code" style={{ fontWeight: '800', color: '#0369a1', fontSize: '1rem' }}>
                        #{selectedRfcForEval.code_rfc}
                      </span>
                      {(selectedRfcForEval.priorite?.libelle || selectedRfcForEval.priorite) && (
                        <span style={{
                          background: ['CRITIQUE','CRITICAL'].includes(selectedRfcForEval.priorite?.code_priorite || selectedRfcForEval.priorite) ? '#fef2f2'
                            : ['HAUTE','HIGH'].includes(selectedRfcForEval.priorite?.code_priorite || selectedRfcForEval.priorite) ? '#fff7ed'
                            : '#f0f9ff',
                          color: ['CRITIQUE','CRITICAL'].includes(selectedRfcForEval.priorite?.code_priorite || selectedRfcForEval.priorite) ? '#dc2626'
                            : ['HAUTE','HIGH'].includes(selectedRfcForEval.priorite?.code_priorite || selectedRfcForEval.priorite) ? '#ea580c'
                            : '#0369a1',
                          padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700', border: '1px solid currentColor'
                        }}>
                          {selectedRfcForEval.priorite?.libelle || selectedRfcForEval.priorite}
                        </span>
                      )}
                    </div>

                    {/* Titre */}
                    <h4 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: '700', color: '#0f172a' }}>
                      {selectedRfcForEval.titre_rfc || '—'}
                    </h4>

                    {/* Description */}
                    {selectedRfcForEval.description && (
                      <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: '#475569', lineHeight: '1.6', background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        {selectedRfcForEval.description}
                      </p>
                    )}

                    {/* Métadonnées en grille */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.75rem' }}>
                      {[
                        { label: 'Demandeur', value: selectedRfcForEval.demandeur ? `${selectedRfcForEval.demandeur.prenom_user || ''} ${selectedRfcForEval.demandeur.nom_user || ''}`.trim() : '—' },
                        { label: 'Type de RFC',    value: selectedRfcForEval.typeRfc?.type || selectedRfcForEval.type_changement?.nom_type || '—' },
                        { label: 'Environnement', value: selectedRfcForEval.environnement?.nom_env || '—' },
                        { label: 'Impact estimé',  value: selectedRfcForEval.impacte_estimee || '—' },
                        { label: 'Date souhaitée', value: selectedRfcForEval.date_souhaitee ? new Date(selectedRfcForEval.date_souhaitee).toLocaleDateString('fr-FR') : '—' },
                        { label: 'Statut',         value: selectedRfcForEval.statut?.libelle || selectedRfcForEval.statut?.code_statut || '—' },
                      ].map(({ label, value }) => (
                        <div key={label} style={{ background: 'white', borderRadius: '8px', padding: '0.6rem 0.75rem', border: '1px solid #e2e8f0' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>{label}</div>
                          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Justification */}
                    {selectedRfcForEval.justification && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Justification</div>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#475569', lineHeight: '1.6', background: 'white', padding: '0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          {selectedRfcForEval.justification}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Informations complémentaires RFC — lecture seule */}
                <div className="eval-section">
                  <h3>📋 Détails de la RFC</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

                    {/* Description */}
                    <div>
                      <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }} />
                        Description
                      </div>
                      <div style={{
                        background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '10px',
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
                        background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '10px',
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
                        const code = selectedRfcForEval.statut?.code_statut || '';
                        const label = selectedRfcForEval.statut?.libelle || code || '—';
                        const cfg = {
                          SOUMISE:    { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                          EN_COURS:   { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
                          APPROUVEE:  { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                          REJETEE:    { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                          AJOURNEE:   { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
                          CLOTUREE:   { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
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

                  </div>
                </div>

                {/* Évaluation des risques — lecture seule */}
                <div className="eval-section">
                  <h3>⚠️ Évaluation des Risques</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Badge niveau de risque */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Niveau de Risque Global</div>
                        {(() => {
                          const cfg = {
                            FAIBLE:   { label: 'Faible',   bg: '#f0fdf4', color: '#16a34a', border: '#86efac' },
                            MOYEN:    { label: 'Moyen',    bg: '#fffbeb', color: '#d97706', border: '#fcd34d' },
                            ELEVE:    { label: 'Élevé',    bg: '#fef2f2', color: '#dc2626', border: '#fca5a5' },
                            CRITIQUE: { label: 'Critique', bg: '#fdf2f8', color: '#7c2d12', border: '#f0abfc' },
                          };
                          const r = cfg[evaluation.niveau_risque] || { label: 'Non évalué', bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0' };
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: '6px',
                              background: r.bg, color: r.color, border: `1.5px solid ${r.border}`,
                              padding: '6px 16px', borderRadius: '20px', fontWeight: '800', fontSize: '0.9rem'
                            }}>
                              {evaluation.niveau_risque === 'FAIBLE' && '🟢'}
                              {evaluation.niveau_risque === 'MOYEN'  && '🟡'}
                              {evaluation.niveau_risque === 'ELEVE'  && '🔴'}
                              {evaluation.niveau_risque === 'CRITIQUE' && '🔥'}
                              {!evaluation.niveau_risque && '⚪'}
                              {r.label}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Score de risque numérique depuis evaluationRisque backend */}
                      {selectedRfcForEval.evaluationRisque?.score_risque !== undefined && (
                        <div style={{ textAlign: 'center', background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '10px', padding: '0.6rem 1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>Score calculé</div>
                          <div style={{
                            fontSize: '1.4rem', fontWeight: '900',
                            color: selectedRfcForEval.evaluationRisque.score_risque > 15 ? '#dc2626'
                              : selectedRfcForEval.evaluationRisque.score_risque > 10 ? '#f59e0b' : '#10b981'
                          }}>
                            {selectedRfcForEval.evaluationRisque.score_risque} <span style={{ fontSize: '0.75rem', fontWeight: '500', color: '#94a3b8' }}>/&nbsp;25</span>
                          </div>
                        </div>
                      )}

                      {/* Impact & probabilité numériques */}
                      {selectedRfcForEval.evaluationRisque && (
                        <>
                          {[
                            { label: 'Impact',      val: selectedRfcForEval.evaluationRisque.impacte },
                            { label: 'Probabilité', val: selectedRfcForEval.evaluationRisque.probabilite },
                          ].map(({ label, val }) => val !== undefined && (
                            <div key={label} style={{ textAlign: 'center', background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '10px', padding: '0.6rem 1rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                              <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '2px' }}>{label}</div>
                              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#334155' }}>{val}<span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>/5</span></div>
                            </div>
                          ))}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Validation des tests — lecture seule */}
                <div className="eval-section">
                  <h3 style={{ color: '#003366' }}>🧪 Validation des Tests</h3>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    background: '#ffffff',
                    border: '1.5px solid #bae6fd',
                    borderRadius: '10px', padding: '0.875rem 1rem',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>{evaluation.tests_valides ? '✅' : '⚠️'}</span>
                    <span style={{
                      fontSize: '0.9rem', fontWeight: '600',
                      color: evaluation.tests_valides ? '#166534' : '#92400e'
                    }}>
                      {evaluation.tests_valides
                        ? 'Les tests appropriés ont été effectués et validés.'
                        : 'Les tests n\'ont pas encore été validés.'}
                    </span>
                  </div>
                </div>

                {/* Recommandations du Comité — éditables */}
                <div className="eval-section">
                  <h3>💡 Recommandations du Comité</h3>
                  <div className="eval-recommendations-grid">
                    <div className="impact-field">
                      <label>Quelles sont les conditions pour ce changement ?</label>
                      <textarea
                        placeholder="Spécifiez les conditions d'exécution..."
                        value={evaluation.conditions}
                        onChange={e => setEvaluation({...evaluation, conditions: e.target.value})}
                        rows={2}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Mesures de sécurité / Rollback</label>
                      <textarea
                        placeholder="Décrivez les mesures de sécurité et le plan de retour arrière..."
                        value={evaluation.securite_rollback}
                        onChange={e => setEvaluation({...evaluation, securite_rollback: e.target.value})}
                        rows={2}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Précautions à prendre...</label>
                      <textarea
                        placeholder="Autres précautions importantes..."
                        value={evaluation.precautions}
                        onChange={e => setEvaluation({...evaluation, precautions: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                {/* Notes additionnelles — éditables */}
                <div className="eval-section">
                  <h3>📝 Notes additionnelles</h3>
                  <textarea
                    placeholder="Commentaires généraux du CAB..."
                    value={evaluation.recommandations}
                    onChange={e => setEvaluation({...evaluation, recommandations: e.target.value})}
                    rows={3}
                  />
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

      {/* ══════════════════════════════════════════════════════
          MODAL — Détails des Recommandations (Admin/Manager)
      ══════════════════════════════════════════════════════ */}
      {showRecDetails && selectedRecs && (
        <div className="cab-modal-backdrop" onClick={() => setShowRecDetails(false)}>
          <div className="cab-modal" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
            <div className="cab-modal-header" style={{ 
              background: selectedRecs.empty ? '#fff1f2' : '#f0fdf4', 
              borderBottomColor: selectedRecs.empty ? '#fecaca' : '#bbf7d0' 
            }}>
              <div>
                <h2 style={{ color: selectedRecs.empty ? '#e11d48' : '#166534', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {selectedRecs.empty ? <FiAlertCircle /> : <FiFileText />} 
                  Recommandations du Comité
                </h2>
                <p>{selectedRecs.empty ? 'Aucune donnée disponible' : `RFC #${selectedRecs.code} · Mesures et conditions décidées`}</p>
              </div>
              <button className="modal-close" onClick={() => setShowRecDetails(false)}><FiX /></button>
            </div>
            
            <div className="cab-modal-body" style={{ padding: '2rem' }}>
              {selectedRecs.empty ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                  <div style={{ fontSize: '3.5rem', color: '#fda4af', marginBottom: '1.5rem' }}>
                    <FiAlertCircle />
                  </div>
                  <h3 style={{ color: '#1e293b', marginBottom: '0.5rem' }}>Aucune recommandation</h3>
                  <p style={{ color: '#64748b', maxWidth: '300px', margin: '0 auto' }}>
                    Le comité n'a pas encore enregistré de recommandations ou de conditions pour cette RFC.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #3b82f6' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Conditions pour ce changement</label>
                    <div style={{ fontSize: '0.95rem', color: '#1e293b', fontWeight: '600', lineHeight: '1.5' }}>
                      {selectedRecs.conditions}
                    </div>
                  </div>

                  <div style={{ background: '#fff1f2', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #e11d48' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#991b1b', textTransform: 'uppercase', marginBottom: '8px' }}>Sécurité / Rollback</label>
                    <div style={{ fontSize: '0.95rem', color: '#9f1239', fontWeight: '600', lineHeight: '1.5' }}>
                      {selectedRecs.securite_rollback}
                    </div>
                  </div>

                  <div style={{ background: '#fefce8', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #ca8a04' }}>
                    <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#854d0e', textTransform: 'uppercase', marginBottom: '8px' }}>Précautions à prendre</label>
                    <div style={{ fontSize: '0.95rem', color: '#713f12', fontWeight: '600', lineHeight: '1.5' }}>
                      {selectedRecs.precautions}
                    </div>
                  </div>

                  {selectedRecs.recommandations && (
                    <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', borderLeft: '4px solid #6366f1' }}>
                      <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '800', color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>Notes additionnelles</label>
                      <div style={{ fontSize: '0.9rem', color: '#334155', fontStyle: 'italic' }}>
                        {selectedRecs.recommandations}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="cab-modal-footer">
              <button className={selectedRecs.empty ? "btn-danger" : "btn-primary"} style={{ width: '100%', padding: '0.8rem' }} onClick={() => setShowRecDetails(false)}>
                {selectedRecs.empty ? 'Compris' : 'Fermer'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default CabManagement;
