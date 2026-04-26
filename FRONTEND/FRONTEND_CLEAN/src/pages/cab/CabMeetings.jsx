import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiCalendar, FiClock, FiFileText, FiCheckCircle, FiEdit, FiSave, 
  FiAlertCircle, FiUsers, FiTrendingUp, FiArrowRight, FiCheck, FiX, FiInfo
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './CabMeetings.css';

const CabMeetings = () => {
    const { user: currentUser } = useAuth();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [rfcs, setRfcs] = useState([]);
    const [votes, setVotes] = useState([]);
    const [pvContent, setPvContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('pv'); // 'pv' or 'agenda'

    const fetchMeetingDetails = useCallback(async (meetingId) => {
        try {
            const [rfcsRes, votesRes] = await Promise.all([
                api.get(`/cab/reunions/${meetingId}/rfcs`),
                api.get(`/cab/reunions/${meetingId}/votes`)
            ]);
            setRfcs(rfcsRes.data?.rfcs || rfcsRes.rfcs || []);
            setVotes(votesRes.data?.votes || votesRes.votes || []);
        } catch (error) {
            console.error('Erreur détails réunion:', error);
        }
    }, []);

    const fetchMeetings = useCallback(async () => {
        try {
            setLoading(true);
            const cabsRes = await api.get('/cab');
            const cabs = cabsRes.data?.cabs || cabsRes.cabs || [];
            
            if (cabs.length > 0) {
                // Pour l'instant on prend le premier CAB ou on filtre par appartenance
                const cabId = cabs[0].id_cab;
                const reunionsRes = await api.get(`/cab/${cabId}/reunions`);
                const reunions = reunionsRes.data?.reunions || reunionsRes.reunions || [];
                setMeetings(reunions);
            }
        } catch (error) {
            console.error('Erreur chargement réunions:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchMeetings();
    }, [fetchMeetings]);

    const handleSelectMeeting = (meeting) => {
        setSelectedMeeting(meeting);
        setPvContent(meeting.proces_verbal || '');
        fetchMeetingDetails(meeting.id_reunion);
    };

    const handlePvSubmit = async (e) => {
        e.preventDefault();
        if (!pvContent.trim()) return alert('Le PV ne peut pas être vide.');

        try {
            setSubmitting(true);
            await api.post(`/cab/reunions/${selectedMeeting.id_reunion}/pv`, {
                proces_verbal: pvContent
            });
            alert('Procès-verbal enregistré !');
            fetchMeetings();
            setSelectedMeeting(null);
        } catch (error) {
            console.error('Erreur PV:', error);
            alert('Erreur lors de l\'enregistrement.');
        } finally {
            setSubmitting(false);
        }
    };

    const handleVote = async (rfcId, voteValue) => {
        try {
            await api.post(`/cab/reunions/${selectedMeeting.id_reunion}/rfcs/${rfcId}/votes`, {
                valeur_vote: voteValue
            });
            alert('Vote enregistré !');
            fetchMeetingDetails(selectedMeeting.id_reunion);
        } catch (error) {
            alert(error.response?.data?.message || 'Erreur lors du vote');
        }
    };

    const sortedMeetings = [...meetings].sort((a,b) => new Date(b.date_reunion) - new Date(a.date_reunion));

    return (
        <div className="meetings-page-container">
            {/* HEADER */}
            <div className="meetings-header-premium">
                <div className="header-info-group">
                    <div className="header-icon-box"><FiCalendar /></div>
                    <div>
                        <h1>Espace Réunions CAB</h1>
                        <p>Gestion des ordres du jour, votes des membres et rédaction des procès-verbaux.</p>
                    </div>
                </div>
                <div className="header-stats-group">
                    <div className="header-mini-stat">
                        <span className="stat-label">Total</span>
                        <span className="stat-value">{meetings.length}</span>
                    </div>
                    <div className="header-mini-stat">
                        <span className="stat-label">À venir</span>
                        <span className="stat-value">{meetings.filter(m => new Date(m.date_reunion) > new Date()).length}</span>
                    </div>
                </div>
            </div>

            <div className="meetings-layout">
                {/* SIDEBAR: MEETINGS LIST */}
                <div className="meetings-sidebar">
                    <div className="sidebar-title">Calendrier des Sessions</div>
                    <div className="meetings-scroll-list">
                        {loading ? (
                            <div className="loading-simple">Chargement des sessions...</div>
                        ) : sortedMeetings.length === 0 ? (
                            <div className="empty-meetings">
                                <FiAlertCircle />
                                <p>Aucune réunion trouvée.</p>
                            </div>
                        ) : (
                            sortedMeetings.map(meeting => {
                                const isPast = new Date(meeting.date_reunion) < new Date();
                                const isSelected = selectedMeeting?.id_reunion === meeting.id_reunion;
                                return (
                                    <div 
                                        key={meeting.id_reunion}
                                        className={`meeting-card-item ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}`}
                                        onClick={() => handleSelectMeeting(meeting)}
                                    >
                                        <div className="meeting-date-badge">
                                            <span className="day">{new Date(meeting.date_reunion).getDate()}</span>
                                            <span className="month">{new Date(meeting.date_reunion).toLocaleDateString('fr-FR', { month: 'short' })}</span>
                                        </div>
                                        <div className="meeting-main-info">
                                            <div className="meeting-title">{meeting.ordre_jour || 'Session CAB'}</div>
                                            <div className="meeting-time">
                                                <FiClock /> {meeting.heure_debut?.substring(11, 16)} - {meeting.heure_fin?.substring(11, 16)}
                                            </div>
                                        </div>
                                        <div className="meeting-status-icon">
                                            {meeting.proces_verbal ? <FiCheckCircle className="done" /> : <FiEdit className="pending" />}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* MAIN CONTENT: WORKSPACE */}
                <div className="meeting-workspace">
                    {selectedMeeting ? (
                        <div className="workspace-inner glass-card">
                            <div className="workspace-header">
                                <div className="meeting-meta-header">
                                    <div className="m-type-tag">Session {selectedMeeting.type_cab || 'Standard'}</div>
                                    <h2>{selectedMeeting.ordre_jour}</h2>
                                    <div className="m-details-row">
                                        <span><FiCalendar /> {new Date(selectedMeeting.date_reunion).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                        <span><FiUsers /> {selectedMeeting._count?.participants || 0} participants</span>
                                    </div>
                                </div>
                                <button className="close-workspace" onClick={() => setSelectedMeeting(null)}><FiX /></button>
                            </div>

                            <div className="workspace-tabs">
                                <button className={`tab-btn ${activeTab === 'pv' ? 'active' : ''}`} onClick={() => setActiveTab('pv')}>
                                    <FiFileText /> Procès-Verbal
                                </button>
                                <button className={`tab-btn ${activeTab === 'agenda' ? 'active' : ''}`} onClick={() => setActiveTab('agenda')}>
                                    <FiTrendingUp /> Ordre du Jour & Votes
                                </button>
                            </div>

                            <div className="workspace-content">
                                {activeTab === 'pv' ? (
                                    <div className="pv-editor-section">
                                        <div className="section-instruction">
                                            <h3><FiEdit /> Rédaction du compte rendu</h3>
                                            <p>Consignez ici les points clés, les discussions et les décisions globales prises lors de cette séance.</p>
                                        </div>
                                        <form onSubmit={handlePvSubmit}>
                                            <textarea 
                                                value={pvContent}
                                                onChange={e => setPvContent(e.target.value)}
                                                placeholder="Saisissez le procès-verbal de la réunion..."
                                                className="premium-textarea"
                                            />
                                            <div className="form-actions">
                                                <button type="submit" className="btn-save-pv" disabled={submitting}>
                                                    <FiSave /> {submitting ? 'Enregistrement...' : 'Enregistrer le PV'}
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                ) : (
                                    <div className="agenda-section">
                                        <div className="agenda-grid">
                                            {rfcs.length === 0 ? (
                                                <div className="empty-agenda">Aucune RFC inscrite à l'ordre du jour.</div>
                                            ) : (
                                                rfcs.map(rfc => {
                                                    const userVote = votes.find(v => v.id_rfc === rfc.id_rfc && v.id_user === currentUser?.id_user);
                                                    return (
                                                        <div key={rfc.id_rfc} className="agenda-rfc-card">
                                                            <div className="rfc-card-header">
                                                                <span className="rfc-id">#{rfc.code_rfc}</span>
                                                                <div className={`rfc-priority-badge prio-${rfc.id_priorite}`}>{rfc.priorite?.nom_priorite || 'Prio'}</div>
                                                            </div>
                                                            <h4>{rfc.titre_rfc}</h4>
                                                            <p className="rfc-desc">{rfc.description?.substring(0, 100)}...</p>
                                                            
                                                            <div className="rfc-vote-stats">
                                                                <div className="vote-count"><FiCheckCircle color="#10b981"/> {votes.filter(v => v.id_rfc === rfc.id_rfc && v.valeur_vote === 'APPROUVER').length}</div>
                                                                <div className="vote-count"><FiX color="#ef4444"/> {votes.filter(v => v.id_rfc === rfc.id_rfc && v.valeur_vote === 'REJETER').length}</div>
                                                            </div>

                                                            <div className="rfc-actions-footer">
                                                                {userVote ? (
                                                                    <div className={`vote-badge ${userVote.valeur_vote.toLowerCase()}`}>
                                                                        Votre vote : {userVote.valeur_vote}
                                                                    </div>
                                                                ) : (
                                                                    <div className="vote-buttons-group">
                                                                        <button className="v-btn app" onClick={() => handleVote(rfc.id_rfc, 'APPROUVER')} title="Approuver"><FiCheck /></button>
                                                                        <button className="v-btn rej" onClick={() => handleVote(rfc.id_rfc, 'REJETER')} title="Rejeter"><FiX /></button>
                                                                    </div>
                                                                )}
                                                                <button className="btn-rfc-details"><FiInfo /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="workspace-placeholder">
                            <div className="placeholder-content">
                                <div className="p-icon"><FiCalendar /></div>
                                <h2>Sélectionnez une session</h2>
                                <p>Choisissez une réunion dans le calendrier pour commencer la rédaction du PV ou participer aux votes.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CabMeetings;
