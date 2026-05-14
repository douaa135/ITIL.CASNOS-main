import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    FiArrowLeft, FiAlertTriangle, FiFileText, 
    FiCheckCircle, FiXCircle, FiEdit3, FiSave
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import { useAuth } from '../../context/AuthContext';
import './Dashboard.css'; 

const RfcEvaluationForm = () => {
    const { id }             = useParams();           // id_rfc
    const [searchParams]     = useSearchParams();
    const { user: currentUser } = useAuth();
    // ✅ id_reunion passé en query param : /cab/rfcs/:id/evaluate?reunion=UUID
    const id_reunion         = searchParams.get('reunion');
    const navigate           = useNavigate();

    const [rfc,        setRfc]        = useState(null);
    const [loading,    setLoading]    = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error,      setError]      = useState('');

    const [evaluation, setEvaluation] = useState({
        decision:            '',   // 'APPROUVER' | 'REJETER' | 'REPORTER'
        impact_business:     '',
        impact_technique:    '',
        impact_securite:     '',
        niveau_risque:       'FAIBLE',
        tests_valides:       false,
        recommandations:     '',
        securite_rollback:   '',
        precautions:         '',
    });

    useEffect(() => { fetchRfcDetails(); }, [id]);

    const fetchRfcDetails = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/rfc/${id}`);
            const rfcData  = response.data?.rfc || response.rfc || response.data;
            setRfc(Array.isArray(rfcData) ? rfcData[0] : rfcData);
        } catch (err) {
            console.error('Erreur chargement RFC:', err);
        } finally {
            setLoading(false);
        }

        // ── 2. Charger les données d'évaluation existantes (si présentes) ──
        try {
            // Check global risk evaluation first
            const riskRes = await api.get(`/rfc/${id}/evaluation-risque`);
            const globalEval = riskRes.data?.evaluation || riskRes.data?.data?.evaluation;
            if (globalEval && globalEval.description) {
                try {
                    const parsed = JSON.parse(globalEval.description);
                    setEvaluation(prev => ({
                        ...prev,
                        impact_business:     parsed.impact_business || '',
                        impact_technique:    parsed.impact_technique || '',
                        impact_securite:     parsed.impact_securite || '',
                        niveau_risque:       parsed.niveau_risque || 'FAIBLE',
                        tests_valides:       parsed.tests_valides || false,
                    }));
                } catch (e) { /* fallback if not JSON */ }
            }

            // Check member-specific recommendations from comments
            const res = await api.get(`/rfc/${id}/commentaires`);
            const allComments = res.data?.commentaires || res.data?.data?.commentaires || res.data || [];
            const myComments = allComments.filter(c => (c.utilisateur?.id_user || c.id_user) === currentUser.id_user);
            
            for (const c of myComments) {
                if (c.contenu && c.contenu.startsWith('{')) {
                    try {
                        const parsed = JSON.parse(c.contenu);
                        if (parsed.conditions || parsed.securite_rollback || parsed.precautions) {
                            setEvaluation(prev => ({
                                ...prev,
                                recommandations:     parsed.conditions || '',
                                securite_rollback:   parsed.securite_rollback || '',
                                precautions:         parsed.precautions || '',
                            }));
                            break;
                        }
                    } catch (e) { /* skip */ }
                }
            }
        } catch (err) {
            console.error('Erreur chargement recs membre:', err);
        }
    };

    const handleEvaluationSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!evaluation.decision) {
            setError('Veuillez sélectionner une décision (Approuver ou Rejeter).');
            return;
        }
        if (!id_reunion) {
            setError('Réunion introuvable. Revenez à la liste des sessions et réessayez.');
            return;
        }

        try {
            setSubmitting(true);

            const motif = JSON.stringify({
                conditions:        evaluation.recommandations   || '',
                securite_rollback: evaluation.securite_rollback || '',
                precautions:       evaluation.precautions       || '',
            });

            await api.post(`/reunions/${id_reunion}/rfcs/${id}/decision`, {
                decision: evaluation.decision,
                motif,
            });

            await api.post(`/rfc/${id}/commentaires`, { contenu: motif });
            navigate(-1);
        } catch (err) {
            console.error('Erreur soumission:', err);
            const msg = err?.response?.data?.error?.message || err?.response?.data?.message || 'Erreur lors de l\'enregistrement de la décision.';
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div style={{ padding: '5rem', textAlign: 'center', color: '#64748b' }}>Chargement...</div>;

    if (!rfc) return (
        <div style={{ padding: '5rem', textAlign: 'center' }}>
            <FiAlertTriangle size={48} color="#ef4444" style={{ marginBottom: '1rem', display: 'block', margin: '0 auto 1rem' }} />
            <h2>Dossier introuvable</h2>
            <button onClick={() => navigate(-1)} className="btn-secondary-cab">Retourner à la session</button>
        </div>
    );

    return (
        <div className="cab-dashboard" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

            <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1rem' }}>
                    <button onClick={() => navigate(-1)} style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                        <FiArrowLeft size={20} />
                    </button>
                    <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.025em' }}>
                        Décision CAB — RFC #{rfc.code_rfc}
                    </h1>
                </div>
                <p style={{ margin: 0, color: '#475569', fontSize: '1.1rem', fontWeight: 500, paddingLeft: '4.5rem' }}>
                    Examinez l'impact et les risques avant de rendre votre décision finale.
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div style={{ padding: '2.5rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                            <FiFileText color="#3b82f6" /> Contexte de l'Intervention
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Titre de la RFC</label>
                                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>{rfc.titre_rfc}</div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px' }}>Description & Besoin</label>
                                <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', color: '#334155', lineHeight: 1.6, border: '1px solid #e2e8f0', fontSize: '0.95rem' }}>
                                    {rfc.description || 'Aucune description.'}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{ padding: '2.5rem', background: 'white', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', fontSize: '1.4rem', color: '#92400e', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #fef3c7', paddingBottom: '1rem' }}>
                            <FiAlertTriangle color="#f59e0b" /> Évaluation des Risques & Impacts
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '1rem' }}>Niveau de Risque Global</label>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    {['FAIBLE', 'MOYEN', 'ELEVE', 'CRITIQUE'].map(r => {
                                        const isActive = evaluation.niveau_risque === r;
                                        const colors = {
                                            FAIBLE:   { bg: '#10b981', light: '#ecfdf5' },
                                            MOYEN:    { bg: '#f59e0b', light: '#fffbeb' },
                                            ELEVE:    { bg: '#ef4444', light: '#fef2f2' },
                                            CRITIQUE: { bg: '#7c2d12', light: '#fff7ed' }
                                        };
                                        return (
                                            <button key={r} type="button" onClick={() => setEvaluation({ ...evaluation, niveau_risque: r })}
                                                style={{ flex: 1, padding: '0.75rem', borderRadius: '10px', fontWeight: 800, fontSize: '0.8rem', cursor: 'pointer', border: `2px solid ${isActive ? colors[r].bg : '#e2e8f0'}`, background: isActive ? colors[r].bg : 'white', color: isActive ? 'white' : '#64748b', transition: 'all 0.2s' }}>
                                                {r}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Impact Business</label>
                                <textarea value={evaluation.impact_business} onChange={e => setEvaluation({ ...evaluation, impact_business: e.target.value })} placeholder="Impact sur les services métiers..." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Impact Technique</label>
                                <textarea value={evaluation.impact_technique} onChange={e => setEvaluation({ ...evaluation, impact_technique: e.target.value })} placeholder="Impact sur l'infrastructure et les SI..." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
                            </div>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <form onSubmit={handleEvaluationSubmit} style={{ padding: '2.5rem', background: '#f8fafc', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px -5px rgba(0,0,0,0.05)', position: 'sticky', top: '2rem' }}>
                        <h3 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '1.5rem', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <FiSave color="#7c3aed" /> Votre Verdict & Recommandations
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Conditions d'exécution</label>
                                <textarea value={evaluation.recommandations} onChange={e => setEvaluation({ ...evaluation, recommandations: e.target.value })} placeholder="Conditions impératives..." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', minHeight: '100px', fontFamily: 'inherit' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontWeight: 700, color: '#334155', marginBottom: '0.5rem' }}>Sécurité & Rollback</label>
                                <textarea value={evaluation.securite_rollback} onChange={e => setEvaluation({ ...evaluation, securite_rollback: e.target.value })} placeholder="Plan de secours..." style={{ width: '100%', padding: '1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', minHeight: '80px', fontFamily: 'inherit' }} />
                            </div>
                            <div style={{ marginTop: '1rem', padding: '1.5rem', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'block', fontWeight: 800, color: '#0f172a', marginBottom: '1.5rem', textAlign: 'center', fontSize: '1.1rem' }}>DÉCISION FINALE</label>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    {[
                                        { value: 'REJETER',  label: 'Rejeter',  icon: <FiXCircle />,     color: '#ef4444', bg: '#fef2f2' },
                                        { value: 'APPROUVER',label: 'Approuver',icon: <FiCheckCircle />, color: '#10b981', bg: '#ecfdf5' },
                                    ].map(opt => {
                                        const active = evaluation.decision === opt.value;
                                        return (
                                            <button key={opt.value} type="button" onClick={() => setEvaluation({ ...evaluation, decision: opt.value })}
                                                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '1.5rem 1rem', borderRadius: '16px', cursor: 'pointer', border: `2.5px solid ${active ? opt.color : '#f1f5f9'}`, background: active ? opt.bg : 'white', color: active ? opt.color : '#64748b', transition: 'all 0.2s', fontWeight: 800 }}>
                                                <span style={{ fontSize: '1.8rem' }}>{opt.icon}</span>
                                                {opt.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                            <button type="submit" disabled={submitting || !evaluation.decision}
                                style={{ width: '100%', padding: '1.25rem', borderRadius: '16px', border: 'none', background: '#7c3aed', color: 'white', fontWeight: 900, fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', opacity: submitting || !evaluation.decision ? 0.6 : 1, transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(124, 58, 237, 0.3)' }}>
                                {submitting ? 'Enregistrement...' : <><FiSave /> Soumettre mon évaluation</>}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default RfcEvaluationForm;