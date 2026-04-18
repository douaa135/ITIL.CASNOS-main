import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiAlertTriangle, FiCheckCircle, FiArrowLeft, FiInfo,
  FiZap, FiShield, FiClipboard
} from 'react-icons/fi';
import api from '../../api/axios';
import './RfcEvaluation.css';

const RfcEvaluation = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [rfc, setRfc] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Evaluation State
    const [impact, setImpact] = useState(1);
    const [probability, setProbability] = useState(1);
    const [description, setDescription] = useState('');

    const riskScore = impact * probability;

    useEffect(() => {
        const fetchRfc = async () => {
            try {
                const res = await api.get(`/rfc/${id}`);
                if (res.success) {
                    setRfc(res.rfc);
                    if (res.rfc.evaluationRisque) {
                        setImpact(res.rfc.evaluationRisque.impacte || 1);
                        setProbability(res.rfc.evaluationRisque.probabilite || 1);
                        setDescription(res.rfc.evaluationRisque.description || '');
                    }
                }
            } catch (error) {
                console.error('Error fetching RFC:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchRfc();
    }, [id]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await api.put(`/rfc/${id}/evaluate`, {
                impacte: impact,
                probabilite: probability,
                score_risque: riskScore,
                description_risque: description
            });
            if (res.success) {
                navigate('/manager/rfcs');
            }
        } catch (error) {
            console.error('Evaluation Error:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const getRiskLevel = (score) => {
        if (score <= 5) return { label: 'FAIBLE', color: 'green' };
        if (score <= 12) return { label: 'MOYEN', color: 'orange' };
        if (score <= 20) return { label: 'ÉLEVÉ', color: 'red' };
        return { label: 'CRITIQUE', color: 'darkred' };
    };

    if (loading) return <div className="loading-spinner">Chargement des détails...</div>;
    if (!rfc) return <div className="error-message">RFC introuvable.</div>;

    const riskLevel = getRiskLevel(riskScore);

    return (
        <div className="evaluation-page">
            <div className="evaluation-header">
                <button className="back-btn" onClick={() => navigate('/manager/rfcs')}>
                    <FiArrowLeft /> Retour au backlog
                </button>
                <h1>Analyse de Risque et Évaluation</h1>
            </div>

            <div className="evaluation-grid">
                {/* RFC Summary Sidebar */}
                <div className="rfc-summary-card">
                    <div className="card-tag">#{rfc.code_rfc}</div>
                    <h2>{rfc.titre_rfc}</h2>
                    <div className="summary-meta">
                        <div className="meta-item">
                            <span className="label">Demandeur:</span>
                            <span className="value">{rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}</span>
                        </div>
                        <div className="meta-item">
                            <span className="label">Type:</span>
                            <span className="value">{rfc.typeRfc?.type}</span>
                        </div>
                    </div>
                    <div className="summary-desc">
                        <h4>Description</h4>
                        <p>{rfc.description}</p>
                    </div>
                </div>

                {/* Evaluation Form */}
                <form className="evaluation-form-card" onSubmit={handleSubmit}>
                    <div className="form-section">
                        <div className="section-title">
                            <FiZap /> <h3>Matrice des Risques</h3>
                        </div>
                        
                        <div className="matrix-controls">
                            <div className="control-group">
                                <label>Impact (1-5)</label>
                                <p className="control-hint">Étendue des perturbations potentielles.</p>
                                <div className="range-input">
                                    <input type="range" min="1" max="5" value={impact} onChange={(e) => setImpact(parseInt(e.target.value))} />
                                    <span className="range-value">{impact}</span>
                                </div>
                            </div>

                            <div className="control-group">
                                <label>Probabilité (1-5)</label>
                                <p className="control-hint">Risque de survenance d'un incident.</p>
                                <div className="range-input">
                                    <input type="range" min="1" max="5" value={probability} onChange={(e) => setProbability(parseInt(e.target.value))} />
                                    <span className="range-value">{probability}</span>
                                </div>
                            </div>
                        </div>

                        <div className={`risk-result-box ${riskLevel.color}`}>
                            <div className="result-main">
                                <span className="score-circle">{riskScore}</span>
                                <div className="result-text">
                                    <span className="risk-label">Niveau de Risque : <strong>{riskLevel.label}</strong></span>
                                    <p>Ce score devra être validé lors du prochain CAB.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <div className="section-title">
                            <FiShield /> <h3>Analyse Qualitative</h3>
                        </div>
                        <div className="input-group">
                            <label>Description du Risque et Mesures d'Atténuation</label>
                            <textarea 
                                placeholder="Détaillez les risques techniques et les mesures prévues (sauvegardes, tests, etc.)"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="5"
                                required
                            ></textarea>
                        </div>
                    </div>

                    <div className="form-section">
                         <div className="section-title">
                            <FiClipboard /> <h3>Pré-planification</h3>
                        </div>
                        <div className="info-alert">
                            <FiInfo />
                            <p>Les plans détaillés (Implémentation et Rollback) seront finalisés après l'approbation du CAB.</p>
                        </div>
                    </div>

                    <div className="form-actions">
                        <button type="button" className="cancel-btn" onClick={() => navigate('/manager/rfcs')}>Annuler</button>
                        <button type="submit" className="submit-eval-btn" disabled={submitting}>
                            {submitting ? 'Enregistrement...' : 'Valider l\'évaluation'}
                            <FiCheckCircle />
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RfcEvaluation;
