import React, { useState, useEffect } from 'react';
import { 
  FiCalendar, FiFilter, FiMapPin, FiClock, 
  FiCheckCircle, FiActivity, FiUser 
} from 'react-icons/fi';
import api from '../../api/axios';
import './ChangeCalendar.css';

const ChangeCalendar = () => {
    const [changements, setChangements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedEnv, setSelectedEnv] = useState('ALL');

    useEffect(() => {
        const fetchChanges = async () => {
            try {
                const res = await api.get('/changements');
                if (res.success) {
                    setChangements(res.changements);
                }
            } catch (error) {
                console.error('Fetch Changes Error:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchChanges();
    }, []);

    const filteredChanges = selectedEnv === 'ALL' 
        ? changements 
        : changements.filter(c => c.environnement?.id_env === selectedEnv);

    // Grouping logic
    const groupedChanges = filteredChanges.reduce((groups, change) => {
        const date = change.date_debut ? new Date(change.date_debut).toLocaleDateString() : 'Non planifié';
        if (!groups[date]) groups[date] = [];
        groups[date].push(change);
        return groups;
    }, {});

    const sortedDates = Object.keys(groupedChanges).sort((a, b) => {
        if (a === 'Non planifié') return 1;
        if (b === 'Non planifié') return -1;
        return new Date(a) - new Date(b);
    });

    if (loading) return <div className="loading-spinner">Chargement du calendrier...</div>;

    return (
        <div className="calendar-page">
            <div className="calendar-header">
                <div className="header-info">
                    <h1>Forward Schedule of Change (FSC)</h1>
                    <p>Calendrier prévisionnel des changements approuvés et planifiés.</p>
                </div>
                <div className="calendar-filters">
                    <FiFilter className="filter-icon" />
                    <select value={selectedEnv} onChange={(e) => setSelectedEnv(e.target.value)}>
                        <option value="ALL">Tous les environnements</option>
                        {/* Env list would ideally be fetched from API */}
                        <option value="1">PRODUCTION</option>
                        <option value="2">STAGING</option>
                        <option value="3">PRE-PROD</option>
                    </select>
                </div>
            </div>

            <div className="fsc-timeline">
                {sortedDates.length > 0 ? sortedDates.map(date => (
                    <div key={date} className="timeline-day-group">
                        <div className="timeline-date-sticky">
                            <span className="date-label">{date}</span>
                            <div className="date-dot"></div>
                        </div>
                        <div className="timeline-items">
                            {groupedChanges[date].map(change => (
                                <div key={change.id_changement} className={`timeline-card ${change.statut?.code_statut}`}>
                                    <div className="card-side-accent"></div>
                                    <div className="card-main">
                                        <div className="card-header-row">
                                            <span className="change-code">#{change.code_changement}</span>
                                            <span className={`status-pill ${change.statut?.code_statut}`}>
                                                {change.statut?.libelle}
                                            </span>
                                        </div>
                                        <h3>{change.rfc?.titre_rfc || 'Changement Standard'}</h3>
                                        <div className="card-details">
                                            <div className="detail-item">
                                                <FiMapPin /> {change.environnement?.nom_env}
                                            </div>
                                            <div className="detail-item">
                                                <FiClock /> {change.date_debut ? new Date(change.date_debut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </div>
                                            <div className="detail-item">
                                                <FiUser /> {change.changeManager?.prenom_user} {change.changeManager?.nom_user}
                                            </div>
                                        </div>
                                        <div className="card-footer">
                                            <div className="tache-count">
                                                <FiActivity /> {change._count?.taches || 0} tâches d'implémentation
                                            </div>
                                            <button className="view-detail-btn">Détails</button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )) : (
                    <div className="empty-calendar-state">
                        <FiCalendar />
                        <h3>Aucun changement planifié</h3>
                        <p>Les changements apparaîtront ici une fois approuvés et planifiés.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChangeCalendar;
