import React, { useState, useEffect, useCallback } from 'react';
import {
  FiCalendar, FiClock, FiFileText, FiCheckCircle, FiEdit, FiSave,
  FiAlertCircle, FiUsers, FiTrendingUp, FiArrowRight, FiCheck, FiX, FiInfo,
  FiPlus, FiLayers, FiHash, FiShield, FiTrash2, FiMessageSquare, FiEdit3, FiAward, FiCheckSquare
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import rfcService from '../../services/rfcService';
import changeService from '../../services/changeService';
import RfcProcessModal from './components/RfcProcessModal';
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
  const [meetings, setMeetings] = useState([]);
  const [cabs, setCabs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [statuses, setStatuses] = useState([]);
  const [environments, setEnvironments] = useState([]);
  const [rfcTypes, setRfcTypes] = useState([]);
  const [priorities, setPriorities] = useState([]);
  
  // État des modales
  const [showProcess, setShowProcess] = useState(false);
  const [processSelectedRfc, setProcessSelectedRfc] = useState(null);
  const [processEnv, setProcessEnv] = useState('');
  const [processRisk, setProcessRisk] = useState({ impact: 1, probabilite: 1, score: 1, notes: '' });
  const [selectedCab, setSelectedCab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [rfcs, setRfcs] = useState([]);
  const [votes, setVotes] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [globalDecisionsCount, setGlobalDecisionsCount] = useState(0);
  // totalDecisionsKPI maintenu pour compatibilité — reflète globalDecisionsCount
  const [totalDecisionsKPI, setTotalDecisionsKPI] = useState(0);
  const [filterUpcoming, setFilterUpcoming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('rfcs_votes');
  const [addingUser, setAddingUser] = useState('');
  const [availableRfcs, setAvailableRfcs] = useState([]);
  const [availableChanges, setAvailableChanges] = useState([]);
  const [addingRfc, setAddingRfc] = useState('');
  const [partLoading, setPartLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  const [showRecModal, setShowRecModal] = useState(false);
  const [currentRecs, setCurrentRecs] = useState(null);
  const [voteResultModal, setVoteResultModal] = useState(null); // { type: 'success'|'error', label: '' }

  // Évaluation détaillée state
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [showRecEditModal, setShowRecEditModal] = useState(false);
  const [selectedRfcForEval, setSelectedRfcForEval] = useState(null);
  const [rfcEvaluations, setRfcEvaluations] = useState({});
  const [voteFilters, setVoteFilters] = useState({}); // { rfcId: 'APPROUVER'|'REJETER'|null }
  const [evaluation, setEvaluation] = useState({
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

  // État de la modale de création de réunion
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState(() => {
    const draft = localStorage.getItem('cab_create_draft');
    if (draft) {
      try { return JSON.parse(draft); } catch (e) { }
    }
    return {
      id_cab: '',
      date_reunion: '',
      heure_debut: '',
      heure_fin: '',
      meet_link: ''
    };
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    localStorage.setItem('cab_create_draft', JSON.stringify(createForm));
  }, [createForm]);

  // ── Fetch all CABs, meetings, and users ──────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cabsRes, usersRes, statutsRes, envsRes, typesRes, priosRes] = await Promise.all([
        api.get('/cab'),
        api.get('/users?limit=1000').catch(() => null),
        rfcService.getStatuts('RFC').catch(() => []),
        rfcService.getEnvironnements().catch(() => []),
        rfcService.getTypesRfc().catch(() => []),
        rfcService.getPriorites().catch(() => [])
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
      const rawUsers = usersRes?.data?.data || usersRes?.data?.users || usersRes?.data || [];
      const filteredUsers = (Array.isArray(rawUsers) ? rawUsers : []).filter(u => 
        !(u.prenom_user?.toLowerCase() === 'itil' && u.nom_user?.toLowerCase() === 'systeme') &&
        !(u.prenom_user?.toLowerCase() === 'systeme' && u.nom_user?.toLowerCase() === 'itil')
      );
      setAllUsers(filteredUsers);
      
      // Transformation des statuts : renommer PRE_EVALUE en PREAPPROUVER
      const rawStatuses = Array.isArray(statutsRes) ? statutsRes : [];
      const transformedStatuses = rawStatuses.map(s => {
        if (s.code_statut && s.code_statut.toUpperCase() === 'PRE_EVALUE') {
          return {
            ...s,
            code_statut: 'PREAPPROUVER',
            libelle: s.libelle ? s.libelle.replace(/pre.?evalue/i, 'Pré‑approuver') : s.libelle
          };
        }
        return s;
      });
      setStatuses(transformedStatuses);
      
      setEnvironments(Array.isArray(envsRes) ? envsRes : []);
      setRfcTypes(Array.isArray(typesRes) ? typesRes : []);
      setPriorities(Array.isArray(priosRes) ? priosRes : []);

      const uid = currentUser?.id_user || JSON.parse(localStorage.getItem('user'))?.id_user;

      // Chargement des réunions depuis tous les CABs
      const allMeetings = [];
      const presidedCabs = [];

      for (const cab of allCabs) {
        try {
          const [rRes, mRes] = await Promise.all([
            api.get(`/cab/${cab.id_cab}/reunions`),
            api.get(`/cab/${cab.id_cab}/membres`).catch(() => null)
          ]);
          const reunions = extractData(rRes, 'reunions');
          const membres = extractData(mRes, 'membres');

          const isPresidentOfCab = membres.some(mb => {
            const mUid = mb.utilisateur?.id_user || mb.id_user;
            const role = String(mb.role).toUpperCase();
            return String(mUid) === String(uid) && (role === 'PRESIDENT' || role === 'PRÉSIDENT' || role.includes('PRÉSIDENT') || role.includes('PRESIDENT'));
          });

          if (isPresidentOfCab) {
            presidedCabs.push({
              ...cab,
              membres: membres
            });

            // Attacher les membres du CAB à chaque réunion pour un accès facilité
            reunions.forEach(r => allMeetings.push({
              ...r,
              id_cab: cab.id_cab,
              cab_nom: cab.nom_cab,
              cab_type: cab.type_cab,
              cab_membres: membres
            }));
          }
        } catch (_) { /* skip */ }
      }

      setCabs(presidedCabs);
      setMeetings(allMeetings);

      // Calcul du nombre global de décisions pour toutes les réunions
      const fetchGlobalDecisions = async () => {
        try {
          const allMeetingIds = allMeetings.map(m => m.id_reunion);

          // Récupérer les décisions de toutes les réunions
          const decisionsPromises = allMeetingIds.map(id => api.get(`/reunions/${id}/decisions`).catch(() => null));
          const results = await Promise.all(decisionsPromises);
          
          let count = 0;
          results.forEach(res => {
            const decs = extractData(res, 'decisions');
            count += decs.filter(d => d.decision === 'APPROUVER' || d.decision === 'REJETER').length;
          });
          
          setGlobalDecisionsCount(count);
        } catch (e) {
          console.error('Error fetching global decisions:', e);
        }
      };
      // Déclencher le calcul global des décisions (en arrière-plan)
      fetchGlobalDecisions();

      if (allMeetings.length > 0 && !selectedMeeting) {
        handleSelectMeeting(allMeetings[0]);
      }

      if (presidedCabs.length > 0 && !createForm.id_cab) {
        setCreateForm(f => ({ ...f, id_cab: presidedCabs[0].id_cab }));
      }
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
      // Aucune modification nécessaire ici, conservé pour contexte

      // Utilitaire d'extraction de données robuste
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

    setAddingUser('');
    if (meeting.id_cab) {
      const meetingCab = cabs.find(c => String(c.id_cab) === String(meeting.id_cab));
      if (meetingCab) setSelectedCab(meetingCab);
    }
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

  // Ajoute un utilisateur spécifique directement (évite les problèmes d'état asynchrone React)
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

  const handleVote = async (rfcId, voteValue) => {
    try {
      await api.post(`/reunions/${selectedMeeting.id_reunion}/rfcs/${rfcId}/votes`, {
        id_user: currentUser.id_user,
        valeur_vote: voteValue
      });
      // Afficher la modale de résultat du vote
      setVoteResultModal({
        type: voteValue === 'APPROUVER' ? 'success' : 'error',
        label: voteValue === 'APPROUVER' ? 'Vote  « Approuver  » enregistré !' : 'Vote  « Rejeter  » enregistré.'
      });
      await fetchMeetingDetails(selectedMeeting.id_reunion);
    } catch (error) {
      setToast({ msg: error?.error?.message || error?.message || 'Erreur lors du vote', type: 'error' });
    }
  };

  const handleAddChange = async () => {
    if (!addingRfc || !selectedMeeting) return;
    try {
      await api.post(`/reunions/${selectedMeeting.id_reunion}/rfcs`, { id_rfc: addingRfc });
      setAddingRfc('');
      await fetchMeetingDetails(selectedMeeting.id_reunion);
      setToast({ msg: 'RFC inscrite à l\'ordre du jour.', type: 'success' });
    } catch (err) {
      const errorMsg = err?.response?.data?.error?.message || err?.error?.message || err?.message;
      if (errorMsg?.toLowerCase().includes('permission') || err?.response?.status === 403) {
        setToast({ msg: 'Permission insuffisante : seul le Président ou un Admin peut inscrire une RFC.', type: 'error' });
      } else {
        setToast({ msg: errorMsg || 'Erreur lors de l\'ajout de la RFC', type: 'error' });
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
    // Réinitialisation immédiate de l'état
    const defaultEval = {
      impact_business: '', impact_technique: '', impact_securite: '',
      niveau_risque: 'FAIBLE', tests_valides: false, recommandations: '',
      actions_correctives: '', conditions: '', securite_rollback: '', precautions: ''
    };
    setEvaluation(defaultEval);
    setSelectedRfcForEval(rfc);

    try {
      // 1. Charger les données COMPLÃˆTES de la RFC (description, justification, statut, etc.)
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
    // Réinitialisation de l'état
    setSelectedMemberRec({ user, rfc, conditions: 'Chargement...', rollback: '...', precautions: '...' });
    setShowMemberRecModal(true);

    try {
      // Vérifier si c'est le Président du CAB, car ses recs sont dans l'évaluation détaillée
      const isPres = selectedMeeting?.cab_membres?.some(mb => 
        String(mb.utilisateur?.id_user || mb.id_user) === String(user.id_user) && String(mb.role).toUpperCase() === 'PRESIDENT'
      );
      
      if (isPres) {
        try {
          const evalRes = await api.get(`/rfc/${rfc.id_rfc}/evaluation-risque`);
          const existingEval = evalRes?.data?.data?.evaluation || evalRes?.data?.evaluation || evalRes?.evaluation;
          if (existingEval && existingEval.description) {
            try {
              const parsed = JSON.parse(existingEval.description);
              if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
                setSelectedMemberRec({
                  user, rfc,
                  conditions: parsed.conditions || 'Non renseigné.',
                  rollback: parsed.securite_rollback || 'Non renseigné.',
                  precautions: parsed.precautions || 'Non renseigné.'
                });
                return;
              }
            } catch (e) { /* ignore */ }
          }
        } catch (e) { /* fallback aux commentaires */ }
      }

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
                rollback: parsed.securite_rollback || parsed.actions_correctives || 'Non renseigné.',
                precautions: parsed.precautions || 'Non renseigné.'
              });
              found = true;
              break;
            }
          } catch (e) { /* ignore */ }
        }
      }

      if (!found) {
        // Repli : afficher le dernier commentaire en texte brut comme conditions
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
        rollback: 'Non renseigné.',
        precautions: 'Non renseigné.'
      });
    }
  };

  const handleFinalDecision = async (rfc, statusCode) => {
    try {
      const targetStatut = statuses.find(s => s.code_statut === statusCode);
      if (!targetStatut) return setToast({ msg: 'Statut non trouvé.', type: 'error' });

      // 1. Enregistrer officiellement la décision dans le contexte de la réunion CAB
      const decisionValue = statusCode === 'APPROUVEE' ? 'APPROUVER' : 'REJETER';
      try {
        await api.post(`/reunions/${selectedMeeting?.id_reunion}/rfcs/${rfc.id_rfc}/decision`, {
          decision: decisionValue,
          motif: processRisk ? JSON.stringify(processRisk) : "Décision finale"
        });
      } catch (decisionErr) {
        console.warn("La décision CAB a échoué ou a déjà été enregistrée :", decisionErr);
      }

      // Construction des informations supplémentaires à mettre à jour (environnement, risque, change manager)
      const extraPayload = {
        id_change_manager: currentUser?.id_user,
        id_env: processEnv || rfc.id_env || null
      };

      // Mise à jour du statut de la RFC vers le statut intermédiaire sélectionné (APPROUVEE ou REJETEE)
      await rfcService.updateRfcStatus(rfc.id_rfc, targetStatut.id_statut, extraPayload);

      if (statusCode === 'APPROUVEE') {
        // Enregistrement de l'évaluation des risques si présente
        if (processRisk && processRisk.impact && processRisk.probabilite) {
          try {
            await rfcService.upsertEvaluationRisque(rfc.id_rfc, {
              impacte: processRisk.impact,
              probabilite: processRisk.probabilite,
              score_risque: processRisk.score || (processRisk.impact * processRisk.probabilite),
              description: processRisk.notes || ""
            });
          } catch (_) {}
        }

        // Création de l'enregistrement de changement
        try {
          await changeService.createChangement({
            id_rfc: rfc.id_rfc,
            id_env: processEnv || rfc.id_env || null,
            id_change_manager: currentUser?.id_user,
            date_debut: rfc.date_souhaitee || new Date().toISOString()
          });
        } catch (e) {
          console.warn('Change creation failed (might already exist):', e);
        }
      }

      // Après une décision finale, passer la RFC au statut clôture défini par le backend
      const clotureStatut = statuses.find(s => s.code_statut === 'CLOTUREE' || s.code_statut === 'CLOTURE');
      if (clotureStatut) {
        try {
          await rfcService.updateRfcStatus(rfc.id_rfc, clotureStatut.id_statut);
        } catch (e) {
          console.warn('Failed to set RFC to closed status:', e);
        }
      }

      // Rafraîchir les détails de la réunion pour obtenir les décisions et la liste RFC mises à jour
      if (statusCode === 'APPROUVEE' || statusCode === 'REJETEE') {
        fetchMeetingDetails(selectedMeeting?.id_reunion);
      }

      // Rafraîchir le KPI global des décisions
      fetchAll();

      setToast({ msg: `RFC ${statusCode === 'APPROUVEE' ? 'Approuvée' : 'Rejetée'} et traitée avec succès !`, type: 'success' });
      setShowProcess(false);
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors du traitement', type: 'error' });
    }
  };

  const handleOpenProcess = (rfc) => {
    setProcessSelectedRfc(rfc);
    setProcessEnv(rfc.environnement?.id_env || rfc.id_env || '');
    // Réinitialisation du risque
    setProcessRisk({ impact: 1, probabilite: 1, score: 1, notes: '' });
    setShowProcess(true);
  };

  const handleCreateReunion = async (e) => {
    e.preventDefault();
    if (!createForm.id_cab || !createForm.date_reunion) {
      return setToast({ msg: 'Le CAB et la date sont obligatoires.', type: 'error' });
    }
    setCreating(true);
    try {
      await api.post(`/cab/${createForm.id_cab}/reunions`, {
        date_reunion: createForm.date_reunion,
        heure_debut: createForm.heure_debut || undefined,
        heure_fin: createForm.heure_fin || undefined,
      });
      setShowCreateModal(false);
      setCreateForm({ id_cab: cabs[0]?.id_cab || '', date_reunion: '', heure_debut: '', heure_fin: '', meet_link: '' });
      localStorage.removeItem('cab_create_draft');
      await fetchAll();
      setToast({ msg: 'Réunion créée avec succès !', type: 'success' });
    } catch (err) {
      setToast({ msg: err?.error?.message || err?.message || 'Erreur lors de la création.', type: 'error' });
    } finally {
      setCreating(false);
    }
  };

  // Calcul des KPIs (global, réunions présidées)

  // Décisions prises = total global des décisions enregistrées
  const decisionsKPI = globalDecisionsCount;

  const currentUserId = currentUser?.id_user || JSON.parse(localStorage.getItem('user'))?.id_user;
  const isAdmin = (() => {
    const roles = currentUser?.roles || JSON.parse(localStorage.getItem('user'))?.roles || [];
    return roles.some(r => {
      const nom = typeof r === 'string' ? r : (r?.nom_role || r?.role?.nom_role);
      return nom && nom.toUpperCase() === 'ADMIN_SYSTEME';
    });
  })();

  // Barre latérale : filtrer par CAB sélectionné et vérifier que l'utilisateur est PRÉSIDENT
  const baseMeetings = [...meetings].filter(m => {
    if (selectedCab && m.id_cab !== selectedCab.id_cab) return false;

    const membres = m.cab_membres || [];
    const isPresident = membres.some(mb => {
      const uid = mb.utilisateur?.id_user || mb.id_user;
      const role = String(mb.role).toUpperCase();
      return String(uid) === String(currentUserId) && (role === 'PRESIDENT' || role === 'PRÉSIDENT' || role.includes('PRÉSIDENT') || role.includes('PRESIDENT'));
    });
    return isPresident;
  });

  const totalMeetings = baseMeetings.length;
  const upcoming = baseMeetings.filter(m => new Date(m.date_reunion) > new Date()).length;

  const sortedMeetings = [...baseMeetings]
    .filter(m => !filterUpcoming || new Date(m.date_reunion) > new Date())
    .sort((a, b) => new Date(b.date_reunion) - new Date(a.date_reunion));

  // Nombre total de participants = membres CAB + participants additionnels
  const totalAttendees = (selectedMeeting?.cab_membres?.length || 0) + participants.length;

  return (
    <div className="cm-page">

      {/* ── VOTE RESULT MODAL ── */}
      {voteResultModal && (
        <div onClick={() => setVoteResultModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: '24px', padding: '3rem 2.5rem', maxWidth: '380px', width: '100%', textAlign: 'center', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', border: `3px solid ${voteResultModal.type === 'success' ? '#22c55e' : '#ef4444'}` }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: voteResultModal.type === 'success' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2.5rem' }}>
              {voteResultModal.type === 'success' ? <FiCheck /> : <FiX />}
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
            <p>Gestion des votes des membres et procès-verbaux</p>
            {selectedCab && (
              <span className="cm-cab-badge" style={{ marginTop: '0.5rem', display: 'inline-flex', alignItems: 'center', gap: '4px', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '600', color: '#475569', border: '1px solid #e2e8f0' }}>
                <FiHash size={11} /> {selectedCab.nom_cab}  · {selectedCab.type_cab === 'URGENT' ? 'e-CAB Urgent' : 'CAB'}
              </span>
            )}
          </div>
        </div>

        <div className="premium-header-actions">
          {/* CAB selector */}
          {cabs.length > 0 && (
            <select
              className="cm-cab-select"
              value={selectedCab?.id_cab || ''}
              onChange={e => {
                const val = e.target.value;
                if (!val) {
                  setSelectedCab(null);
                } else {
                  const c = cabs.find(c => c.id_cab === val);
                  setSelectedCab(c);
                }
              }}
              style={{ padding: '0.65rem 1rem', borderRadius: '12px', border: '1px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: '600', fontSize: '0.85rem' }}
            >
              <option value="">Tous les comités CAB</option>
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
        <div 
          className={`stat-card purple ${filterUpcoming ? 'active-filter' : ''}`}
          style={{ cursor: 'pointer', border: filterUpcoming ? '2px solid #a855f7' : 'none' }}
          onClick={() => setFilterUpcoming(!filterUpcoming)}
        >
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
            <FiAward size={24} />
          </div>
          <div className="stat-info">
            <div className="stat-value">{decisionsKPI}</div>
            <div className="stat-label">Décisions prises</div>
          </div>
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div className="cm-layout">

        {/* Sidebar */}
        <div className="cm-sidebar">
          <div className="cm-sidebar-title">
            Réunions
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
                const isPast = new Date(meeting.date_reunion) < new Date();
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

                      <div className="cm-meeting-meta">
                        <FiClock size={11} />
                        {meeting.heure_debut?.substring(11, 16) || '--:--'} · {meeting.cab_nom || ''}
                      </div>
                    </div>
                    <div className="cm-meeting-status">
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
            <div className="cm-workspace-inner" style={{ overflowX: 'auto', maxWidth: '100%' }}>

              {/* Workspace Header */}
              <div className="cm-workspace-header">
                <div style={{ flex: 1 }}>
                  <div className="cm-header-top-row">
                    <span className="cm-type-tag">Session {selectedMeeting.cab_type === 'URGENT' ? 'e-CAB Urgent' : 'CAB'}</span>
                    <span className="cm-date-text">
                      <FiCalendar style={{ marginRight: 8 }} />
                      {new Date(selectedMeeting.date_reunion).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  </div>

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
                  { id: 'rfcs_votes', icon: <FiTrendingUp />, label: 'RFC & Vote' },
                  { id: 'participants', icon: <FiUsers />, label: 'Membres & Participants' },
                  { id: 'rfcs_traitees', icon: <FiCheckSquare />, label: 'RFCs Traitées' },
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
                {activeTab === 'rfcs_votes' && (
                  <div className="cm-votes-view">
                    <div className="cm-section-header-inline">
                      <div className="cm-shi-title">
                        <h3>RFC & Vote</h3>
                        <p>{rfcs.length} RFC(s) inscrite(s)</p>
                      </div>
                      <div className="cm-agenda-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                        <select
                          className="cm-mini-select"
                          value={addingRfc}
                          onChange={e => setAddingRfc(e.target.value)}
                          style={{ minWidth: '220px' }}
                        >
                          <option value="">Inscrire une RFC...</option>
                          {availableRfcs
                            .filter(ar => {
                              if (rfcs.some(r => r.id_rfc === ar.id_rfc) || availableChanges.some(c => c.id_rfc === ar.id_rfc)) return false;
                              const code = statuses.find(s => s.id_statut === ar.id_statut)?.code_statut;
                              return code === 'EVALUEE' || code === 'PRE_APPROUVEE';
                            })
                            .map(ar => (
                              <option key={ar.id_rfc} value={ar.id_rfc}>
                                {ar.code_rfc} - {ar.titre_rfc}
                              </option>
                            ))}
                        </select>
                        <button onClick={handleAddChange} disabled={!addingRfc} className="cm-btn-mini-plus"><FiPlus /></button>
                      </div>
                    </div>

                    {rfcs.length === 0 ? (
                      <div className="cm-empty-block">Aucune RFC inscrite à l'ordre du jour.</div>
                    ) : (
                      <>
                        {/* SECTION: RFC EN ATTENTE */}
                        {rfcs.filter(r => {
                          const decision = decisions.find(d => d.id_rfc === r.id_rfc);
                          const hasDecision = decision && (decision.decision === 'APPROUVER' || decision.decision === 'REJETER');
                          const statusCode = statuses.find(s => s.id_statut === r.id_statut)?.code_statut;
                          const hasStatus = statusCode === 'APPROUVEE' || statusCode === 'REJETEE' || statusCode === 'CLOTURE' || statusCode === 'CLOTUREE';
                          return !(hasDecision || hasStatus);
                        }).map(rfc => {
                          const rfcDecision = decisions.find(d => d.id_rfc === rfc.id_rfc);
                          // Récupérer tous les membres du CAB pour cette réunion
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
                              
                              {/* Résultat des votes en cours */}
                              {(!rfcDecision && (appCount > 0 || rejCount > 0)) && (
                                <div style={{ fontSize: '0.75rem', fontWeight: 700, display: 'flex', gap: '0.4rem', background: '#f8fafc', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                  {appCount > 0 && <span style={{ color: '#16a34a' }}>{appCount} Pour</span>}
                                  {appCount > 0 && rejCount > 0 && <span style={{ color: '#cbd5e1' }}>|</span>}
                                  {rejCount > 0 && <span style={{ color: '#dc2626' }}>{rejCount} Contre</span>}
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
                              <div className="cm-rvc-progress"><div style={{ width: `${(rejCount / (totalVotes || 1)) * 100}%` }}></div></div>
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
                              <div className="cm-rvc-progress"><div style={{ width: `${(appCount / (totalVotes || 1)) * 100}%` }}></div></div>
                            </div>
                          </div>

                          {/* Détail des votes par membre */}
                          <div className="cm-votes-detail">
                            <div className="cm-vd-title">
                              {voteFilters[rfc.id_rfc] ? (
                                <>Membres ayant voté  « {voteFilters[rfc.id_rfc] === 'APPROUVER' ? 'Pour' : 'Contre'}  »</>
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

                            {/* Final Decision Buttons for CAB President */}
                            <div className="cm-vd-final-actions" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleFinalDecision(rfc, 'REJETEE'); }}
                                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fee2e2', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                              >
                                <FiX /> Rejeter la RFC
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleOpenProcess(rfc); }}
                                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#f0fdf4', color: '#16a34a', border: '1px solid #dcfce7', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
                              >
                                <FiCheck /> Évaluer & Approuver la RFC
                              </button>
                            </div>
                          </div>
                        </div>
                          );
                        })}

                      </>
                    )}
                  </div>
                )}

                {activeTab === 'rfcs_traitees' && (
                  <div className="cm-votes-view">
                    <div className="cm-section-header-inline">
                      <div className="cm-shi-title">
                        <h3>RFCs Traitées</h3>
                        <p>Historique des décisions finales</p>
                      </div>
                    </div>

                    {!rfcs.some(r => {
                      const decision = decisions.find(d => d.id_rfc === r.id_rfc);
                      const hasDecision = decision && (decision.decision === 'APPROUVER' || decision.decision === 'REJETER');
                      const statusCode = statuses.find(s => s.id_statut === r.id_statut)?.code_statut;
                      const hasStatus = statusCode === 'APPROUVEE' || statusCode === 'REJETEE' || statusCode === 'CLOTURE' || statusCode === 'CLOTUREE';
                      return hasDecision || hasStatus;
                    }) ? (
                      <div className="cm-empty-block">Aucune RFC traitée pour le moment.</div>
                    ) : (
                      <div style={{ marginTop: '1rem' }}>
                        {rfcs.filter(r => {
                          const decision = decisions.find(d => d.id_rfc === r.id_rfc);
                          const hasDecision = decision && (decision.decision === 'APPROUVER' || decision.decision === 'REJETER');
                          const statusCode = statuses.find(s => s.id_statut === r.id_statut)?.code_statut;
                          const hasStatus = statusCode === 'APPROUVEE' || statusCode === 'REJETEE' || statusCode === 'CLOTURE' || statusCode === 'CLOTUREE';
                          return hasDecision || hasStatus;
                        }).map(rfc => {
                          let rfcDecision = decisions.find(d => d.id_rfc === rfc.id_rfc);
                          if (!rfcDecision) {
                            const sc = statuses.find(s => s.id_statut === rfc.id_statut)?.code_statut;
                            rfcDecision = { decision: sc === 'APPROUVEE' || sc === 'CLOTURE' || sc === 'CLOTUREE' ? 'APPROUVER' : 'REJETER' };
                          }
                          const isApprouver = rfcDecision.decision === 'APPROUVER';
                          return (
                            <div key={rfc.id_rfc} className="cm-rfc-vote-card" style={{ opacity: 0.9 }}>
                              <div className="cm-rvc-header">
                                <div className="cm-rvc-title-box">
                                  <span className="cm-rfc-code">#{rfc.code_rfc}</span>
                                  <h4>{rfc.titre_rfc}</h4>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                  {/* Résultat officiel du vote */}
                                  <div style={{
                                    display: 'flex', alignItems: 'center', gap: '0.5rem',
                                    padding: '6px 12px', borderRadius: '8px',
                                    fontWeight: '700', fontSize: '0.85rem',
                                    background: isApprouver ? '#dcfce7' : '#fee2e2',
                                    color: isApprouver ? '#16a34a' : '#dc2626',
                                    border: `1px solid ${isApprouver ? '#bbf7d0' : '#fecaca'}`
                                  }}>
                                    {isApprouver ? <FiCheck /> : <FiX />}
                                    {rfcDecision.decision}
                                  </div>
                                  <button
                                    className="cm-rec-icon-btn"
                                    onClick={(e) => { e.stopPropagation(); handleOpenRecommendations(rfc.id_rfc); }}
                                    title="Voir Recommandations Détaillées"
                                  >
                                    <FiFileText />
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleRemoveRfc(rfc.id_rfc); }} className="cm-btn-trash-rfc" title="Retirer de l'agenda">
                                    <FiTrash2 size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                                setToast({ msg: err?.error?.message || "Erreur lors de l'ajout au comité", type: "error" });
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
                          const isPres = String(m.role || '').toUpperCase() === 'PRESIDENT';
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
                                    if (!window.confirm(`Retirer ${u.prenom_user} du comité CAB ?`)) return;
                                    try {
                                      await api.delete(`/cab/${selectedCab.id_cab}/membres/${u.id_user}`);
                                      fetchAll();
                                    } catch (err) { setToast({ msg: "Erreur lors du retrait", type: "error" }); }
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
            <div style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiCalendar style={{ color: '#7c3aed' }} /> Toutes les Réunions
                </h2>
                <span style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 700, fontSize: '0.8rem', padding: '4px 12px', borderRadius: '20px' }}>
                  {sortedMeetings.length} session{sortedMeetings.length !== 1 ? 's' : ''}
                </span>
              </div>
              {sortedMeetings.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                  <FiCalendar size={40} style={{ marginBottom: '1rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600 }}>Aucune réunion planifiée</p>
                  <p style={{ fontSize: '0.85rem' }}>Créez-en une en cliquant sur « Nouvelle Réunion ».</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                  {sortedMeetings.map(m => {
                    const isPast = new Date(m.date_reunion) < new Date();
                    return (
                      <div
                        key={m.id_reunion}
                        onClick={() => handleSelectMeeting(m)}
                        style={{
                          background: 'white',
                          border: '1.5px solid #e2e8f0',
                          borderRadius: '14px',
                          padding: '1.25rem',
                          cursor: 'pointer',
                          transition: 'all 0.18s ease',
                          borderLeft: `4px solid ${isPast ? '#94a3b8' : '#7c3aed'}`,
                          boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
                        }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,58,237,0.13)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'}
                      >
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                          <div style={{ background: isPast ? '#f1f5f9' : '#f5f3ff', color: isPast ? '#64748b' : '#7c3aed', borderRadius: '10px', padding: '0.5rem 0.85rem', textAlign: 'center', minWidth: '52px' }}>
                            <div style={{ fontSize: '1.4rem', fontWeight: 900, lineHeight: 1 }}>{new Date(m.date_reunion).getDate()}</div>
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>{new Date(m.date_reunion).toLocaleDateString('fr-FR', { month: 'short' })}</div>
                          </div>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: isPast ? '#f1f5f9' : '#ede9fe', color: isPast ? '#94a3b8' : '#7c3aed' }}>
                            {isPast ? 'Passée' : 'À venir'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#1e293b', marginBottom: '0.35rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                          <FiClock size={12} />
                          {m.heure_debut?.substring(11,16) || '--:--'} · {m.cab_nom || 'CAB'}
                        </div>
                        <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.4rem', color: '#7c3aed', fontSize: '0.8rem', fontWeight: 700 }}>
                          Ouvrir <FiArrowRight size={13} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
                    <FiHash size={14} style={{ marginRight: 6 }} />Lien de la réunion
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
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>{currentRecs.empty ? 'Données manquantes' : `RFC #${currentRecs.rfcCode}  · Rapport d'évaluation`}</div>
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
              <button className="close-btn-rfc-style" onClick={() => setShowEvaluationModal(false)} style={{ color: '#ffffff', marginTop: '5px' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              <div className="evaluation-form">
                {/* Détails RFC — lecture seule */}
                <div className="eval-section">
                  <h3><FiFileText /> Détails de la RFC</h3>
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
                        const code = selectedRfcForEval.statut?.code_statut || '';
                        const label = selectedRfcForEval.statut?.libelle || code || '-';
                        const cfg = {
                          SOUMISE: { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' },
                          EN_COURS: { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
                          APPROUVEE: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
                          REJETEE: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
                          AJOURNEE: { bg: '#fefce8', color: '#ca8a04', border: '#fef08a' },
                          CLOTUREE: { bg: '#f8fafc', color: '#475569', border: '#e2e8f0' },
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
                  <h3><FiAlertCircle /> Évaluation des Risques</h3>
                  <div className="risk-buttons" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'].map(risk => (
                      <button
                        key={risk}
                        type="button"
                        className={`risk-btn ${evaluation.niveau_risque === risk ? 'active' : ''}`}
                        onClick={() => setEvaluation({ ...evaluation, niveau_risque: risk })}
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
                  <h3><FiInfo /> Recommandations & Conditions</h3>
                  <div className="impact-grid">
                    <div className="impact-field">
                      <label>Conditions d'exécution</label>
                      <textarea
                        value={evaluation.conditions}
                        onChange={e => setEvaluation({ ...evaluation, conditions: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Sécurité / Rollback</label>
                      <textarea
                        value={evaluation.securite_rollback}
                        onChange={e => setEvaluation({ ...evaluation, securite_rollback: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="impact-field">
                      <label>Précautions</label>
                      <textarea
                        value={evaluation.precautions}
                        onChange={e => setEvaluation({ ...evaluation, precautions: e.target.value })}
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
              <button className="close-btn-rfc-style" onClick={() => setShowRecEditModal(false)} style={{ color: '#ffffff', marginTop: '5px' }}><FiX size={24} /></button>
            </div>
            <div className="cab-modal-body">
              <div className="evaluation-form">
                <div className="eval-section">
                  <h3><FiInfo /> Recommandations & Conditions</h3>
                  <div className="impact-grid">
                    <div className="impact-field">
                      <label>Conditions d'exécution</label>
                      <textarea
                        value={evaluation.conditions}
                        onChange={e => setEvaluation({ ...evaluation, conditions: e.target.value })}
                        rows={3}
                        placeholder="Quelles sont les conditions impératives pour ce changement ?"
                      />
                    </div>
                    <div className="impact-field">
                      <label>Sécurité / Rollback</label>
                      <textarea
                        value={evaluation.securite_rollback}
                        onChange={e => setEvaluation({ ...evaluation, securite_rollback: e.target.value })}
                        rows={3}
                        placeholder="Mesures de sécurité et plan de retour arrière..."
                      />
                    </div>
                    <div className="impact-field">
                      <label>Précautions</label>
                      <textarea
                        value={evaluation.precautions}
                        onChange={e => setEvaluation({ ...evaluation, precautions: e.target.value })}
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
              <button className="close-btn-rfc-style" onClick={() => setShowMemberRecModal(false)} style={{ color: '#ffffff', marginTop: '5px' }}><FiX size={24} /></button>
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

      {/* MODAL ÉVALUATION ET TRAITEMENT RFC */}
      {showProcess && processSelectedRfc && (
        <RfcProcessModal
          selectedRfc={processSelectedRfc}
          closeModals={() => setShowProcess(false)}
          statuses={statuses}
          rfcTypes={rfcTypes}
          environments={environments}
          priorities={priorities}
          selectedEnv={processEnv}
          setSelectedEnv={setProcessEnv}
          risk={processRisk}
          setRisk={setProcessRisk}
          handleDecision={(statusCode) => handleFinalDecision(processSelectedRfc, statusCode)}
        />
      )}
    </div>
  );
};

export default CabMeetings;
