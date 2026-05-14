import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiCalendar, FiClock, FiFileText, FiCheckCircle, FiEdit, FiSave, 
  FiAlertCircle, FiUsers, FiTrendingUp, FiArrowRight, FiCheck, FiX, FiInfo,
  FiPlus, FiLayers, FiHash, FiShield, FiTrash2, FiMessageSquare, FiEdit3
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
  const [availableRfcs, setAvailableRfcs] = useState([]);
  const [availableChanges, setAvailableChanges] = useState([]);
  const [addingRfc, setAddingRfc]       = useState('');
  const [partLoading, setPartLoading]   = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showRecModal, setShowRecModal] = useState(false);
  const [currentRecs, setCurrentRecs] = useState(null);
  const [voteResultModal, setVoteResultModal] = useState(null); // { type: 'success'|'error', label: '' }
  
  // Évaluation détaillée state
  const [showEvaluationModal,   setShowEvaluationModal]   = useState(false);
  const [showRecEditModal,      setShowRecEditModal]      = useState(false);
  const [selectedRfcForEval,    setSelectedRfcForEval]    = useState(null);
  const [rfcEvaluations,        setRfcEvaluations]        = useState({});
  const [voteFilters,           setVoteFilters]           = useState({}); // { rfcId: 'APPROUVER'|'REJETER'|null }
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
  const [showMemberRecModal, setShowMemberRecModal] = useState(false);
  const [selectedMemberRec, setSelectedMemberRec] = useState(null);

  // Create reunion modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm]     = useState({
    id_cab: '',
    date_reunion: '',
    heure_debut: '',
    heure_fin: '',
    ordre_jour: '',
    meet_link: ''
  });
  const [creating, setCreating]         = useState(false);

  // ── Fetch all CABs, meetings, and users ──────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cabsRes, usersRes] = await Promise.all([
        api.get('/cab'),
        api.get('/users?limit=1000').catch(() => null)
      ]);

      const extractData = (res, key) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.data && Array.isArray(res.data?.[key])) return res.data[key];
        if (res.data?.data && Array.isArray(res.data.data?.[key])) return res.data.data[key];
        if (Array.isArray(res?.[key])) return res[key];
        return [];
      };

      const allCabs = extractData(cabsRes, 'cabs');
      setCabs(allCabs);
      
      const rawUsers = usersRes?.data?.data || usersRes?.data?.users || usersRes?.data || [];
      setAllUsers(Array.isArray(rawUsers) ? rawUsers : []);

      // Load meetings from all CABs
      const allMeetings = [];
      for (const cab of allCabs) {
        try {
          const rRes = await api.get(`/cab/${cab.id_cab}/reunions`);
          const reunions = extractData(rRes, 'reunions');
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

      if (allMeetings.length > 0 && !selectedMeeting) {
        handleSelectMeeting(allMeetings[0]);
      }

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
      const [rfcsRes, votesRes, partsRes, decsRes, allRfcsRes, allChangesRes] = await Promise.all([
        api.get(`/reunions/${meetingId}/rfcs`),
        api.get(`/reunions/${meetingId}/votes`),
        api.get(`/reunions/${meetingId}/participants`),
        api.get(`/reunions/${meetingId}/decisions`),
        api.get('/rfc'),
        api.get('/changements')
      ]);

      // Robust extraction helper
      const extractData = (res, key) => {
        if (!res) return [];
        if (Array.isArray(res)) return res;
        if (res.data && Array.isArray(res.data)) return res.data;
        if (res.data && Array.isArray(res.data?.[key])) return res.data[key];
        if (res.data?.data && Array.isArray(res.data.data?.[key])) return res.data.data[key];
        if (Array.isArray(res?.[key])) return res[key];
        return [];
      };

      setRfcs(extractData(rfcsRes, 'rfcs'));
      setVotes(extractData(votesRes, 'votes'));
      setParticipants(extractData(partsRes, 'participants'));
      setDecisions(extractData(decsRes, 'decisions'));
      
      setAvailableRfcs(extractData(allRfcsRes, 'rfcs'));

      const rawChanges = allChangesRes?.data?.data?.changements || allChangesRes?.data?.changements || allChangesRes?.data || allChangesRes || [];
      setAvailableChanges(Array.isArray(rawChanges) ? rawChanges : []);
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
      await fetchAll();
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
      // Show styled vote result modal
      setVoteResultModal({
        type: voteValue === 'APPROUVER' ? 'success' : 'error',
        label: voteValue === 'APPROUVER' ? 'Vote « Approuver » enregistré !' : 'Vote « Rejeter » enregistré.'
      });
      await fetchMeetingDetails(selectedMeeting.id_reunion);
    } catch (error) {
      setToast({ msg: error?.error?.message || error?.message || 'Erreur lors du vote', type: 'error' });
    }
  };

  const handleAddChange = async () => {
    if (!addingRfc || !selectedMeeting) return;
    try {
      // Find the change to get its id_rfc
      const selectedChange = availableChanges.find(c => String(c.id_changement) === String(addingRfc));
      const idRfcToRegister = selectedChange?.id_rfc || selectedChange?.rfc?.id_rfc;

      if (!idRfcToRegister) {
        setToast({ msg: 'Ce changement n\'est pas lié à une RFC valide.', type: 'error' });
        return;
      }

      await api.post(`/reunions/${selectedMeeting.id_reunion}/rfcs`, { id_rfc: idRfcToRegister });
      setAddingRfc('');
      await fetchMeetingDetails(selectedMeeting.id_reunion);
      setToast({ msg: 'Changement inscrit à l\'ordre du jour.', type: 'success' });
    } catch (err) {
      const errorMsg = err?.response?.data?.error?.message || err?.error?.message || err?.message;
      if (errorMsg?.toLowerCase().includes('permission') || err?.response?.status === 403) {
        setToast({ msg: 'Permission insuffisante : seul le Président ou un Admin peut inscrire un changement.', type: 'error' });
      } else {
        setToast({ msg: errorMsg || 'Erreur lors de l\'ajout du changement', type: 'error' });
      }
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
          await fetchMeetingDetails(selectedMeeting.id_reunion);
          setToast({ msg: 'RFC retirée de l\'ordre du jour.', type: 'error' });
        } catch (err) {
          setToast({ msg: err?.error?.message || err?.message || 'Erreur lors du retrait de la RFC', type: 'error' });
        } finally {
          setConfirmDel(null);
        }
      }
    });
  };

  const handleEvaluationClick = async (rfc) => {
    // Isolation: Reset state immediately
    const defaultEval = {
      impact_business: '', impact_technique: '', impact_securite: '',
      niveau_risque: 'FAIBLE', tests_valides: false, recommandations: '',
      actions_correctives: '', conditions: '', securite_rollback: '', precautions: ''
    };
    setEvaluation(defaultEval);
    setSelectedRfcForEval(rfc);

    try {
      // 1. Charger les données COMPLÈTES de la RFC (description, justification, statut, etc.)
      const rfcRes = await api.get(`/rfc/${rfc.id_rfc}`);
      const fullRfc = rfcRes?.data?.data?.rfc || rfcRes?.data?.rfc || rfcRes?.rfc || rfc;
      setSelectedRfcForEval(fullRfc);

      // 2. Charger l'évaluation de risque existante
      try {
        const res = await api.get(`/rfc/${rfc.id_rfc}/evaluation-risque`);
        const existingEval = res?.data?.data?.evaluation || res?.data?.evaluation || res?.evaluation;
        if (existingEval && existingEval.description) {
          try {
            const parsed = JSON.parse(existingEval.description);
            setEvaluation({ ...defaultEval, ...parsed });
          } catch (_) {
            setEvaluation({ ...defaultEval, recommandations: existingEval.description });
          }
        } else {
          setEvaluation(defaultEval);
        }
      } catch (err) {
        console.warn("[CAB] No existing evaluation found:", err);
        setEvaluation(defaultEval);
      }
    } catch (err) {
      console.error('Erreur chargement RFC complète:', err);
      setEvaluation(defaultEval);
    }

    setShowEvaluationModal(true);
  };

  const handleRecEditClick = async (rfc) => {
    // Isolation: Reset state immediately
    const defaultEval = {
      impact_business: '', impact_technique: '', impact_securite: '',
      niveau_risque: 'FAIBLE', tests_valides: false, recommandations: '',
      actions_correctives: '', conditions: '', securite_rollback: '', precautions: ''
    };
    setEvaluation(defaultEval);
    setSelectedRfcForEval(rfc);

    try {
      const res = await api.get(`/rfc/${rfc.id_rfc}/evaluation-risque`);
      const existingEval = res?.data?.data?.evaluation || res?.data?.evaluation || res?.evaluation;
      if (existingEval && existingEval.description) {
        try {
          const parsed = JSON.parse(existingEval.description);
          setEvaluation({ ...defaultEval, ...parsed });
        } catch (_) {
          setEvaluation({ ...defaultEval, recommandations: existingEval.description });
        }
      } else {
        setEvaluation(defaultEval);
      }
    } catch (err) {
      console.warn("[CAB-Rec] No existing evaluation:", err);
      setEvaluation(defaultEval);
    }
    setShowRecEditModal(true);
  };

  const handleSubmitEvaluation = async () => {
    try {
      const riskMapping = { 'FAIBLE': 1, 'MOYEN': 2, 'ELEVE': 4, 'CRITIQUE': 5 };
      const score = riskMapping[evaluation.niveau_risque] || 1;
      
      const payload = {
        impacte: 1,
        probabilite: score,
        description: JSON.stringify(evaluation)
      };

      await api.put(`/rfc/${selectedRfcForEval.id_rfc}/evaluation-risque`, payload);

      setRfcEvaluations(prev => ({
        ...prev,
        [selectedRfcForEval.id_rfc]: { ...evaluation }
      }));
      
      setToast({ msg: 'Évaluation enregistrée avec succès.', type: 'success' });
      setShowEvaluationModal(false);
      setShowRecEditModal(false);
      setSelectedRfcForEval(null);
    } catch (err) {
      console.error('[CAB-Save] Error saving evaluation:', err);
      setToast({ msg: 'Erreur lors de l\'enregistrement de l\'évaluation.', type: 'error' });
    }
  };

  const handleOpenRecommendations = async (rfcId) => {
    const rfcCode = rfcs.find(r => r.id_rfc === rfcId)?.code_rfc;
    const decision = decisions.find(d => d.id_rfc === rfcId);

    let recData = null;

    // 1. Essayer de lire les données depuis la décision CAB (motif JSON)
    if (decision?.motif) {
      try {
        if (decision.motif.startsWith('{')) {
          const parsed = JSON.parse(decision.motif);
          if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
            recData = {
              conditions: parsed.conditions || 'Non renseigné.',
              securite_rollback: parsed.securite_rollback || parsed.actions_correctives || 'Non renseigné.',
              precautions: parsed.precautions || 'Non renseigné.',
              empty: false
            };
          }
        }
      } catch (e) { /* pas du JSON structuré */ }
    }

    // 2. Fallback : lire depuis EvaluationRisque.description (JSON) si décision vide ou sans champs
    if (!recData) {
      try {
        const res = await api.get(`/rfc/${rfcId}/evaluation-risque`);
        const existingEval = res?.data?.data?.evaluation || res?.data?.evaluation || res?.evaluation;
        if (existingEval && existingEval.description) {
          try {
            const parsed = JSON.parse(existingEval.description);
            if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
              recData = {
                conditions: parsed.conditions || 'Non renseigné.',
                securite_rollback: parsed.securite_rollback || 'Non renseigné.',
                precautions: parsed.precautions || 'Non renseigné.',
                empty: false
              };
            }
          } catch (_) {
             // Si c'est du texte brut
             recData = {
                conditions: existingEval.description,
                securite_rollback: 'Non renseigné.',
                precautions: 'Non renseigné.',
                empty: false
             };
          }
        }
      } catch (e) { /* pas d'évaluation */ }
    }

    // 3. Si rien trouvé du tout
    if (!recData) {
      setCurrentRecs({ empty: true, rfcCode });
      setShowRecModal(true);
      return;
    }

    setCurrentRecs({ rfcCode, ...recData });
    setShowRecModal(true);
  };

  const handleViewMemberRecs = async (rfc, user) => {
    // Reset state
    setSelectedMemberRec({ user, rfc, conditions: 'Chargement...', rollback: '...', precautions: '...' });
    setShowMemberRecModal(true);

    try {
      // 1. Fetch comments for this RFC
      const res = await api.get(`/rfc/${rfc.id_rfc}/commentaires`);
      const allComments = res?.data?.commentaires || res?.commentaires || [];
      
      // 2. Filter comments by this specific user
      const userComments = allComments.filter(c => (c.utilisateur?.id_user || c.id_user) === user.id_user);
      
      // 3. Look for a JSON recommendation or the latest comment
      let found = false;
      for (const c of userComments.reverse()) { // Newest first
        if (c.contenu && c.contenu.startsWith('{')) {
          try {
            const parsed = JSON.parse(c.contenu);
            if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
              setSelectedMemberRec({
                user, rfc,
                conditions: parsed.conditions || 'Non renseigné.',
                rollback:   parsed.securite_rollback || parsed.actions_correctives || 'Non renseigné.',
                precautions: parsed.precautions || 'Non renseigné.'
              });
              found = true;
              break;
            }
          } catch (e) { /* ignore */ }
        }
      }

      if (!found) {
        // Fallback: Show the last plain text comment as conditions
        const lastText = userComments[0]?.contenu || 'Aucune recommandation trouvée pour ce membre.';
        setSelectedMemberRec({
          user, rfc,
          conditions: lastText,
          rollback: 'Non renseigné.',
          precautions: 'Non renseigné.'
        });
      }
    } catch (err) {
      console.error('Error fetching member recs:', err);
      setSelectedMemberRec({
        user, rfc,
        conditions: 'Erreur lors de la récupération.',
        rollback: '—',
        precautions: '—'
      });
    }
  };

  const handleCreateReunion = async (e) => {
    e.preventDefault();
    if (!createForm.id_cab || !createForm.date_reunion) {
      return alert('Le CAB et la date sont obligatoires.');
    }
    setCreating(true);
    try {
      // Include meet link in agenda if present
      const finalAgenda = createForm.meet_link 
        ? `Lien Meet: ${createForm.meet_link}\n\n${createForm.ordre_jour}`
        : createForm.ordre_jour;

      await api.post(`/cab/${createForm.id_cab}/reunions`, {
        date_reunion: createForm.date_reunion,
        heure_debut:  createForm.heure_debut || undefined,
        heure_fin:    createForm.heure_fin   || undefined,
        ordre_jour:   finalAgenda || undefined
      });
      setShowCreateModal(false);
      setCreateForm({ id_cab: cabs[0]?.id_cab || '', date_reunion: '', heure_debut: '', heure_fin: '', ordre_jour: '', meet_link: '' });
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
            <p style={{ color: '#64748b', margin: '0 0 2rem', fontSize: '0.95rem', lineHeight: 1.6 }}>{voteResultModal.label}</p>
            <button
              onClick={() => setVoteResultModal(null)}
              style={{ width: '100%', padding: '0.9rem', borderRadius: '12px', border: 'none', background: voteResultModal.type === 'success' ? '#22c55e' : '#ef4444', color: 'white', fontWeight: 800, fontSize: '1rem', cursor: 'pointer' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

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
                <FiHash size={11} /> {selectedCab.nom_cab} · {selectedCab.type_cab === 'URGENT' ? 'e-CAB Urgent' : 'CAB'}
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
      <div className="stats-grid">
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
              {/* Workspace Header — Premium Blue Frame Only */}
              <div className="cm-workspace-header">
                <div style={{ flex: 1 }}>
                  <div className="cm-header-top-row">
                    <span className="cm-type-tag">Session {selectedMeeting.cab_type === 'URGENT' ? 'e-CAB Urgent' : 'CAB'}</span>
                    <span className="cm-date-text">
                      <FiCalendar style={{ marginRight: 8 }} /> 
                      {new Date(selectedMeeting.date_reunion).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>
                  
                  <h2>{selectedMeeting.ordre_jour || 'Session CAB'}</h2>

                  <div className="cm-meta-grid">
                    <div className="cm-meta-item">
                      <span className="cm-meta-label">Comité / Organisation</span>
                      <span className="cm-meta-value"><FiLayers /> {selectedMeeting.cab_nom || 'Comité CAB'} — CASNOS</span>
                    </div>
                    <div className="cm-meta-item">
                      <span className="cm-meta-label">Participants</span>
                      <span className="cm-meta-value"><FiUsers /> {totalAttendees} participants</span>
                    </div>
                    <div className="cm-meta-item">
                      <span className="cm-meta-label">Plage Horaire</span>
                      <span className="cm-meta-value time">
                        <FiClock /> {selectedMeeting.heure_debut?.substring(11, 16) || '09:00'} - {selectedMeeting.heure_fin?.substring(11, 16) || '11:00'}
                      </span>
                    </div>
                  </div>
                </div>
                <button className="cm-close-btn" onClick={() => setSelectedMeeting(null)}><FiX size={18} /></button>
              </div>

              {/* Tabs */}
              <div className="cm-tabs">
                {[
                  { id: 'agenda_editor', icon: <FiFileText />, label: 'Ordre du Jour' },
                  { id: 'rfcs_votes',   icon: <FiTrendingUp />, label: 'Changement & Vote' },
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
                        <h3>Ordre du Jour & Changement & Vote</h3>
                        <p>{rfcs.length} Changement(s) inscrit(s)</p>
                      </div>
                      <div className="cm-agenda-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <select 
                          className="cm-mini-select" 
                          value={addingRfc} 
                          onChange={e => setAddingRfc(e.target.value)}
                          style={{ minWidth: '220px' }}
                        >
                          <option value="">Inscrire un changement...</option>
                          {availableChanges
                            .filter(ac => {
                                const idRfc = ac.id_rfc || ac.rfc?.id_rfc;
                                return idRfc && !rfcs.some(r => r.id_rfc === idRfc);
                            })
                            .map(ac => (
                              <option key={ac.id_changement} value={ac.id_changement}>
                                {ac.code_metier || ac.code_changement || ac.id_changement} - {ac.titre || ac.rfc?.titre_rfc}
                              </option>
                            ))}
                        </select>
                        <button onClick={handleAddChange} disabled={!addingRfc} className="cm-btn-mini-plus"><FiPlus /></button>
                      </div>
                    </div>

                    {rfcs.length === 0 ? (
                      <div className="cm-empty-block">Aucun changement inscrit à l'ordre du jour.</div>
                    ) : rfcs.map(rfc => {
                      const rfcDecision = decisions.find(d => d.id_rfc === rfc.id_rfc);
                      // Get all members of the CAB for this meeting
                      const cabMembres = selectedMeeting?.cab_membres || [];
                      const rfcVotes = votes.filter(v => v.id_rfc === rfc.id_rfc);
                      
                      const appCount = rfcVotes.filter(v => v.valeur_vote === 'APPROUVER').length;
                      const rejCount = rfcVotes.filter(v => v.valeur_vote === 'REJETER').length;
                      const totalVotes = appCount + rejCount;

                      return (
                        <div key={rfc.id_rfc} className="cm-rfc-vote-card" onClick={() => handleEvaluationClick(rfc)} style={{ cursor: 'pointer' }}>
                          <div className="cm-rvc-header">
                            <div className="cm-rvc-title-box">
                               <span className="cm-rfc-code">#{rfc.code_rfc}</span>
                               <h4>{rfc.titre_rfc}</h4>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              {rfcDecision && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <div className={`cm-decision-badge ${rfcDecision.decision.toLowerCase()}`}>
                                    {rfcDecision.decision}
                                  </div>
                                  <button 
                                    className="cm-rec-icon-btn" 
                                    onClick={(e) => { e.stopPropagation(); handleOpenRecommendations(rfc.id_rfc); }}
                                    title="Voir Recommandations Détaillées"
                                  >
                                    <FiFileText />
                                  </button>
                                </div>
                              )}
                              <button onClick={(e) => { e.stopPropagation(); handleRemoveRfc(rfc.id_rfc); }} className="cm-btn-trash-rfc" title="Retirer de l'agenda">
                                <FiTrash2 size={16} />
                              </button>
                            </div>
                          </div>
                          
                          <div className="cm-rvc-stats-bar">
                            <div 
                              className={`cm-rvc-stat-item rej ${voteFilters[rfc.id_rfc] === 'REJETER' ? 'active-filter' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoteFilters(prev => ({
                                  ...prev,
                                  [rfc.id_rfc]: prev[rfc.id_rfc] === 'REJETER' ? null : 'REJETER'
                                }));
                              }}
                              style={{ 
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                background: voteFilters[rfc.id_rfc] === 'REJETER' ? '#fef2f2' : 'transparent',
                                border: voteFilters[rfc.id_rfc] === 'REJETER' ? '1.5px solid #ef4444' : '1.5px solid transparent'
                              }}
                            >
                              <span className="cm-rvc-stat-n">{rejCount}</span>
                              <span className="cm-rvc-stat-l">Contre</span>
                              <div className="cm-rvc-progress"><div style={{ width: `${(rejCount/(totalVotes || 1))*100}%` }}></div></div>
                            </div>

                            <div 
                              className={`cm-rvc-stat-item app ${voteFilters[rfc.id_rfc] === 'APPROUVER' ? 'active-filter' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setVoteFilters(prev => ({
                                  ...prev,
                                  [rfc.id_rfc]: prev[rfc.id_rfc] === 'APPROUVER' ? null : 'APPROUVER'
                                }));
                              }}
                              style={{ 
                                cursor: 'pointer',
                                padding: '10px',
                                borderRadius: '8px',
                                transition: 'all 0.2s',
                                background: voteFilters[rfc.id_rfc] === 'APPROUVER' ? '#f0fdf4' : 'transparent',
                                border: voteFilters[rfc.id_rfc] === 'APPROUVER' ? '1.5px solid #10b981' : '1.5px solid transparent'
                              }}
                            >
                              <span className="cm-rvc-stat-n">{appCount}</span>
                              <span className="cm-rvc-stat-l">Pour</span>
                              <div className="cm-rvc-progress"><div style={{ width: `${(appCount/(totalVotes || 1))*100}%` }}></div></div>
                            </div>
                          </div>

                          {/* Détail des votes par membre */}
                          <div className="cm-votes-detail">
                            <div className="cm-vd-title">
                              {voteFilters[rfc.id_rfc] ? (
                                <>Membres ayant voté « {voteFilters[rfc.id_rfc] === 'APPROUVER' ? 'Pour' : 'Contre'} »</>
                              ) : (
                                <>Répartition des votes par membre</>
                              )}
                            </div>
                            <div className="cm-vd-list">
                              {cabMembres
                                .filter(m => {
                                  if (!voteFilters[rfc.id_rfc]) return true;
                                  const u = m.utilisateur || m;
                                  const v = rfcVotes.find(vote => (vote.utilisateur?.id_user || vote.id_user) === u.id_user);
                                  return v?.valeur_vote === voteFilters[rfc.id_rfc];
                                })
                                .map(m => {
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
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <div className={`cm-v-tag ${memberVote.valeur_vote.toLowerCase()}`}>
                                            {memberVote.valeur_vote === 'APPROUVER' ? <FiCheck /> : 
                                             memberVote.valeur_vote === 'REJETER' ? <FiX /> : <FiInfo />}
                                            {memberVote.valeur_vote}
                                          </div>
                                          <button 
                                            className="cm-rec-icon-btn" 
                                            onClick={(e) => { e.stopPropagation(); handleViewMemberRecs(rfc, u); }}
                                            title={`Voir les recommandations de ${u.prenom_user}`}
                                          >
                                            <FiMessageSquare />
                                          </button>
                                        </div>
                                      ) : (
                                        <span className="cm-v-pending">En attente</span>
                                      )}
                                    </div>
                                    {u.id_user === currentUser?.id_user && !memberVote && !rfcDecision && (
                                      <div className="cm-vd-actions" onClick={e => e.stopPropagation()}>
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
          <div className="modal-box-cab glass-card-cab modal-box-medium" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>

            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <FiCalendar size={20} />
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Créer une Réunion CAB</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Planifiez une nouvelle session du comité</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowCreateModal(false)} style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>

            <form onSubmit={handleCreateReunion}>
              <div className="modal-body-rfc-style">

                {/* CAB Selector */}
                <div className="form-group-cab" style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                    <FiLayers size={14} style={{ marginRight: 6 }} />Comité CAB *
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
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                      <FiCalendar size={14} style={{ marginRight: 6 }} />Date de la réunion *
                    </label>
                    <input
                      type="date"
                      className="modal-input-cab"
                      value={createForm.date_reunion}
                      onChange={e => setCreateForm(f => ({ ...f, date_reunion: e.target.value }))}
                      required
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #bae6fd', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group-cab">
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                      <FiClock size={14} style={{ marginRight: 6 }} />Heure de début
                    </label>
                    <input
                      type="time"
                      value={createForm.heure_debut}
                      onChange={e => setCreateForm(f => ({ ...f, heure_debut: e.target.value }))}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #bae6fd', outline: 'none' }}
                    />
                  </div>
                  <div className="form-group-cab">
                    <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                      <FiClock size={14} style={{ marginRight: 6 }} />Heure de fin
                    </label>
                    <input
                      type="time"
                      value={createForm.heure_fin}
                      onChange={e => setCreateForm(f => ({ ...f, heure_fin: e.target.value }))}
                      style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #bae6fd', outline: 'none' }}
                    />
                  </div>
                </div>

                <div className="form-group-cab" style={{ marginTop: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', fontSize: '0.85rem', fontWeight: '700', color: '#475569', marginBottom: '0.5rem' }}>
                    <FiHash size={14} style={{ marginRight: 6 }} />Lien de la réunion (Google Meet)
                  </label>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <input
                      type="text"
                      className="modal-input-cab"
                      value={createForm.meet_link}
                      onChange={e => setCreateForm(f => ({ ...f, meet_link: e.target.value }))}
                      placeholder="https://meet.google.com/..."
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #bae6fd', outline: 'none' }}
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        const code = Math.random().toString(36).substring(2, 5) + '-' + Math.random().toString(36).substring(2, 6) + '-' + Math.random().toString(36).substring(2, 5);
                        setCreateForm(f => ({ ...f, meet_link: `https://meet.google.com/${code}` }));
                      }}
                      style={{ padding: '0.75rem 1rem', background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: '10px', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem' }}
                    >
                      Générer Meet
                    </button>
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
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '10px', border: '1.5px solid #bae6fd', minHeight: '100px', outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
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

      {/* ── RECOMMENDATIONS MODAL ── */}
      {showRecModal && currentRecs && (
        <div className="cab-modal-overlay" onClick={() => setShowRecModal(false)}>
          <div className="cab-modal cab-modal--lg" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ 
                background: currentRecs.empty ? 'rgba(225, 29, 72, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                color: '#ffffff',
                borderColor: currentRecs.empty ? 'rgba(225, 29, 72, 0.3)' : 'rgba(255, 255, 255, 0.2)'
              }}>
                {currentRecs.empty ? <FiAlertCircle /> : <FiFileText />}
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Recommandations du Comité</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{currentRecs.empty ? 'Données manquantes' : `RFC #${currentRecs.rfcCode} · Rapport d'évaluation`}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowRecModal(false)} style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              {currentRecs.empty ? (
                <div style={{ textAlign: 'center', padding: '3rem 1rem' }}>
                  <FiAlertCircle style={{ fontSize: '4rem', color: '#fca5a5', marginBottom: '1.5rem' }} />
                  <h3 style={{ color: '#1e293b' }}>Aucune recommandation disponible</h3>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Le président du CAB n'a pas encore validé les recommandations pour ce changement.
                  </p>
                </div>
              ) : (
                <div className="recommendations-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', padding: '1.5rem' }}>
                  <div className="rec-item" style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}>
                      <FiInfo /> Conditions d'exécution
                    </div>
                    <div className="rec-value" style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.6', fontWeight: '600' }}>{currentRecs.conditions}</div>
                  </div>
                  <div className="rec-item" style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}>
                      <FiShield /> Sécurité & Rollback
                    </div>
                    <div className="rec-value" style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.6', fontWeight: '600' }}>{currentRecs.securite_rollback}</div>
                  </div>
                  <div className="rec-item" style={{ background: '#ffffff', border: '1.5px solid #bae6fd', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                    <div className="rec-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', fontWeight: '800', color: '#0369a1', textTransform: 'uppercase', marginBottom: '10px' }}>
                      <FiAlertCircle /> Précautions
                    </div>
                    <div className="rec-value" style={{ fontSize: '0.95rem', color: '#1e293b', lineHeight: '1.6', fontWeight: '600' }}>{currentRecs.precautions}</div>
                  </div>
                </div>
              )}
            </div>
            <div className="cab-modal-footer">
              <button className={currentRecs.empty ? "btn-close-rec danger" : "btn-close-rec"} onClick={() => setShowRecModal(false)}>
                {currentRecs.empty ? 'Compris' : 'Fermer le rapport'}
              </button>
            </div>
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
      {showEvaluationModal && selectedRfcForEval && (
        <div className="cab-modal-backdrop" onClick={() => setShowEvaluationModal(false)}>
          <div className="cab-modal cab-modal--xl" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <FiFileText />
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Évaluation Détaillée — #{selectedRfcForEval.code_rfc}</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Analyse complète de l'impact et des risques pour la prise de décision CAB</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowEvaluationModal(false)} style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              <div className="evaluation-form">
                {/* Détails RFC — lecture seule */}
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
                        const code  = selectedRfcForEval.statut?.code_statut || '';
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

                  </div>
                </div>

                {/* Risque */}
                <div className="eval-section">
                  <h3>⚠️ Évaluation des Risques</h3>
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
                  <h3>💡 Recommandations & Conditions</h3>
                  <div className="impact-grid">
                    <div className="impact-field">
                      <label>Conditions d'exécution</label>
                      <textarea
                        value={evaluation.conditions}
                        onChange={e => setEvaluation({...evaluation, conditions: e.target.value})}
                        rows={2}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Sécurité / Rollback</label>
                      <textarea
                        value={evaluation.securite_rollback}
                        onChange={e => setEvaluation({...evaluation, securite_rollback: e.target.value})}
                        rows={2}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Précautions</label>
                      <textarea
                        value={evaluation.precautions}
                        onChange={e => setEvaluation({...evaluation, precautions: e.target.value})}
                        rows={2}
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1.25rem', display: 'flex', justifyContent: 'flex-end' }}>
                    <button 
                      className="btn-primary" 
                      onClick={handleSubmitEvaluation}
                      style={{ background: '#7c3aed', borderColor: '#7c3aed', padding: '0.6rem 1.5rem', borderRadius: '10px' }}
                    >
                      <FiCheck /> Enregistrer les Recommandations
                    </button>
                  </div>
                </div>

                {/* VOTE SECTION */}
                <div className="eval-section" style={{ borderTop: '2px dashed #e2e8f0', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
                  <h3 style={{ color: '#7c3aed' }}><FiTrendingUp /> Exprimer votre vote</h3>
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                    <button 
                      className="btn-vote-modal approve"
                      onClick={() => handleVote(selectedRfcForEval.id_rfc, 'APPROUVER')}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#10b981', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <FiCheck /> APPROUVER
                    </button>
                    <button 
                      className="btn-vote-modal reject"
                      onClick={() => handleVote(selectedRfcForEval.id_rfc, 'REJETER')}
                      style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      <FiX /> REJETER
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showRecEditModal && selectedRfcForEval && (
        <div className="cab-modal-backdrop" onClick={() => setShowRecEditModal(false)}>
          <div className="cab-modal cab-modal--lg" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <FiFileText />
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Recommandations & Conditions — #{selectedRfcForEval.code_rfc}</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Définissez les recommandations spécifiques du comité pour cette RFC</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowRecEditModal(false)} style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              <div className="evaluation-form">
                <div className="eval-section">
                  <h3>💡 Recommandations & Conditions</h3>
                  <div className="impact-grid">
                    <div className="impact-field">
                      <label>Conditions d'exécution</label>
                      <textarea
                        value={evaluation.conditions}
                        onChange={e => setEvaluation({...evaluation, conditions: e.target.value})}
                        rows={3}
                        placeholder="Quelles sont les conditions impératives pour ce changement ?"
                      />
                    </div>
                    <div className="impact-field">
                      <label>Sécurité / Rollback</label>
                      <textarea
                        value={evaluation.securite_rollback}
                        onChange={e => setEvaluation({...evaluation, securite_rollback: e.target.value})}
                        rows={3}
                        placeholder="Mesures de sécurité et plan de retour arrière..."
                      />
                    </div>
                    <div className="impact-field">
                      <label>Précautions</label>
                      <textarea
                        value={evaluation.precautions}
                        onChange={e => setEvaluation({...evaluation, precautions: e.target.value})}
                        rows={3}
                        placeholder="Précautions techniques ou opérationnelles..."
                      />
                    </div>
                  </div>
                  <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                    {/* Verdict for CAB Members */}
                    {!(currentUser.roles?.includes('ADMIN') || currentUser.roles?.includes('CHANGE_MANAGER') || currentUser.roles?.includes('ADMIN_SYSTEME')) && (
                      <div style={{ display: 'flex', gap: '0.75rem', marginRight: 'auto' }}>
                        <button 
                          className="btn-vote-modal approve"
                          onClick={() => {
                            handleVote(selectedRfcForEval.id_rfc, 'APPROUVER');
                            handleSubmitEvaluation();
                          }}
                          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: '#10b981', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <FiCheck /> APPROUVER
                        </button>
                        <button 
                          className="btn-vote-modal reject"
                          onClick={() => {
                            handleVote(selectedRfcForEval.id_rfc, 'REJETER');
                            handleSubmitEvaluation();
                          }}
                          style={{ padding: '0.75rem 1.5rem', borderRadius: '12px', border: 'none', background: '#ef4444', color: 'white', fontWeight: '800', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          <FiX /> REJETER
                        </button>
                      </div>
                    )}

                    <button 
                      className="btn-primary" 
                      onClick={handleSubmitEvaluation}
                      style={{ background: '#7c3aed', borderColor: '#7c3aed', padding: '0.75rem 2rem', borderRadius: '12px' }}
                    >
                      <FiCheck /> {!(currentUser.roles?.includes('ADMIN') || currentUser.roles?.includes('CHANGE_MANAGER') || currentUser.roles?.includes('ADMIN_SYSTEME')) ? 'Enregistrer mon avis' : 'Enregistrer les Recommandations'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
      {/* Modal Recommandations Membre Spécifique */}
      {showMemberRecModal && selectedMemberRec && (
        <div className="cab-modal-backdrop" onClick={() => setShowMemberRecModal(false)}>
          <div className="cab-modal cab-modal--md" style={{ background: '#f0f9ff', border: '1px solid #bae6fd' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                <FiMessageSquare />
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Recommandation de {selectedMemberRec.user?.prenom_user} {selectedMemberRec.user?.nom_user}</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>RFC #{selectedMemberRec.rfc?.code_rfc}</div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setShowMemberRecModal(false)} style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              <div className="cm-member-rec-viewer">
                <div className="cm-mrv-field">
                  <label>Conditions d'exécution</label>
                  <div className="cm-mrv-content">{selectedMemberRec.conditions}</div>
                </div>
                <div className="cm-mrv-field">
                  <label>Sécurité / Rollback</label>
                  <div className="cm-mrv-content">{selectedMemberRec.rollback}</div>
                </div>
                <div className="cm-mrv-field">
                  <label>Précautions</label>
                  <div className="cm-mrv-content">{selectedMemberRec.precautions}</div>
                </div>
              </div>
            </div>
            <div className="cab-modal-footer">
               <button className="btn-secondary" onClick={() => setShowMemberRecModal(false)}>Fermer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CabMeetings;