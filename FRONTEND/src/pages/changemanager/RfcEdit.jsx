import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiSave, FiX, FiInfo, FiChevronLeft } from 'react-icons/fi';
import api from '../../api/axiosClient';
import './RfcEdit.css';

const RfcEdit = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rfc, setRfc] = useState(null);
    const [types, setTypes] = useState([]);
    const [priorities, setPriorities] = useState([]);
    const [environments, setEnvironments] = useState([]);
    const [directions, setDirections] = useState([]);
    const [statuses, setStatuses] = useState([]);
    const [cis, setCis] = useState([]);

    const [formData, setFormData] = useState({
        titre_rfc: '',
        description: '',
        justification: '',
        impacte_estimee: '',
        id_type: '',
        id_priorite: '',
        id_environnement: '',
        id_statut: '',
        date_souhaitee: '',
        urgence: false,
        note_interne: '',
        ci_ids: []
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resRfc, resTypes, resPrios, resEnvs, resDirs, resStats] = await Promise.all([
                    api.get(`/rfc/${id}`),
                    api.get('/types-rfc'), 
                    api.get('/priorites'),
                    api.get('/environnements'),
                    api.get('/directions'),
                    api.get('/statuts?contexte=RFC'),
                    api.get('/ci')
                ]);

                if (resRfc.success) {
                    const r = resRfc.rfc;
                    setRfc(r);
                    setFormData({
                        titre_rfc: r.titre_rfc || '',
                        description: r.description || '',
                        justification: r.justification || '',
                        impacte_estimee: r.impacte_estimee || 'MINEUR',
                        id_type: r.id_type || '',
                        id_priorite: r.id_priorite || '',
                        id_statut: r.id_statut || '',
                        id_environnement: r.id_environnement || '', // Still fetch for UI
                        date_souhaitee: r.date_souhaitee ? r.date_souhaitee.split('T')[0] : '',
                        urgence: !!r.urgence,
                        note_interne: '',
                        ci_ids: r.ciRfcs?.map(c => c.id_ci) || []
                    });
                }
                if (resTypes.success) setTypes(resTypes.types || []);
                if (resPrios.success) setPriorities(resPrios.prioriteArr || resPrios.priorites || []);
                if (resEnvs.success) setEnvironments(resEnvs.environnements || []);
                if (resDirs.success) setDirections(resDirs.directions || []);
                if (resStats.success) setStatuses(resStats.statuts || resStats.data || []);
                if (resCis.success) setCis(resCis.cis || []);

            } catch (err) {
                console.error('Fetch RFC Edit Data Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            // Filter only backend supported fields for updateRfc
            const updatePayload = {
                titre_rfc: formData.titre_rfc,
                description: formData.description,
                justification: formData.justification,
                impacte_estimee: formData.impacte_estimee,
                id_type: formData.id_type,
                id_priorite: formData.id_priorite,
                id_statut: formData.id_statut,
                date_souhaitee: formData.date_souhaitee,
                urgence: formData.urgence,
                ci_ids: formData.ci_ids
            };

            const res = await api.put(`/rfc/${id}`, updatePayload);
            
            if (res.success) {
                // If status changed, update it separately via the status endpoint
                const currentStatusId = rfc.id_statut || rfc.statut?.id_statut;
                if (formData.id_statut && formData.id_statut !== currentStatusId) {
                    await api.patch(`/rfc/${id}/status`, { 
                        id_statut: formData.id_statut,
                        // If it's an approval, it might need more fields, but for a general edit we just change status
                    });
                }

                // If there's a new internal note, save it as a comment
                if (formData.note_interne.trim()) {
                    await api.post(`/rfc/${id}/commentaires`, { contenu: formData.note_interne });
                }
                navigate('/manager/rfcs');
            }
        } catch (err) {
            console.error('Update RFC Error:', err);
            alert('Erreur lors de la mise à jour.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="loading-spinner">Chargement de la demande...</div>;

    return (
        <div className="rfc-edit-page">
            <div className="premium-header-card">
                <div className="premium-header-left">
                    <div className="premium-header-icon" style={{ background: '#eff6ff', color: '#2563eb', borderColor: '#bfdbfe' }}><FiInfo /></div>
                    <div className="premium-header-text">
                        <h1>Édition Technique de la RFC #{rfc?.code_rfc}</h1>
                        <p>Correction des informations avant évaluation ou approbation.</p>
                    </div>
                </div>
                <div className="premium-header-actions">
                    <button className="btn-secondary-cab" onClick={() => navigate('/manager/rfcs')} style={{ marginRight: '0.75rem' }}>
                        <FiChevronLeft /> Retour au backlog
                    </button>
                    <button onClick={handleSubmit} className="btn-create-premium" disabled={saving}>
                        {saving ? 'Enregistrement...' : <><FiSave /> Enregistrer</>}
                    </button>
                </div>
            </div>

            <form className="edit-form-card" onSubmit={handleSubmit}>
                <div className="form-actions-top">
                    <h3>Modification de la RFC</h3>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Enregistrement...' : <><FiSave /> Enregistrer</>}
                    </button>
                </div>

                <div className="form-section">
                    <h3>Informations Générales</h3>
                    <div className="form-group">
                        <label>Titre de la demande</label>
                        <input 
                            name="titre_rfc" 
                            value={formData.titre_rfc} 
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Type de Workflow</label>
                            <select name="id_type" value={formData.id_type} onChange={handleChange}>
                                <option value="">Sélectionner un type</option>
                                {types.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Priorité</label>
                            <select name="id_priorite" value={formData.id_priorite} onChange={handleChange}>
                                <option value="">Sélectionner une priorité</option>
                                {priorities.map(p => <option key={p.id_priorite} value={p.id_priorite}>{p.libelle}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Environnement Cible</label>
                            <select name="id_environnement" value={formData.id_environnement} onChange={handleChange}>
                                <option value="">Sélectionner un environnement</option>
                                {environments.map(e => (
                                    <option key={e.id_env || e.id_environnement} value={e.id_env || e.id_environnement}>
                                        {e.nom_env || e.nom_environnement}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Statut de la RFC</label>
                            <select name="id_statut" value={formData.id_statut} onChange={handleChange}>
                                <option value="">Sélectionner un statut</option>
                                {statuses.map(s => <option key={s.id_statut} value={s.id_statut}>{s.libelle}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label>Impact Estimé</label>
                            <select name="impacte_estimee" value={formData.impacte_estimee} onChange={handleChange}>
                                <option value="MINEUR">Mineur</option>
                                <option value="MOYEN">Moyen</option>
                                <option value="MAJEUR">Majeur</option>
                                <option value="CRITIQUE">Critique</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Date de mise en œuvre souhaitée</label>
                            <input 
                                type="date" 
                                name="date_souhaitee" 
                                value={formData.date_souhaitee} 
                                onChange={handleChange} 
                            />
                        </div>
                    </div>
                    <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                        <input 
                            type="checkbox" 
                            name="urgence" 
                            id="urgence"
                            checked={formData.urgence} 
                            onChange={(e) => setFormData(prev => ({ ...prev, urgence: e.target.checked }))}
                            style={{ width: 'auto' }}
                        />
                        <label htmlFor="urgence" style={{ cursor: 'pointer', marginBottom: 0 }}>Marquer comme Urgence Métier</label>
                    </div>
                </div>

                <div className="form-section">
                    <h3>Contenu & Justification</h3>
                    <div className="form-group">
                        <label>Description</label>
                        <textarea 
                            name="description" 
                            value={formData.description} 
                            onChange={handleChange}
                            rows="5"
                        />
                    </div>
                    <div className="form-group">
                        <label>Justification Métier</label>
                        <textarea 
                            name="justification" 
                            value={formData.justification} 
                            onChange={handleChange}
                            rows="3"
                        />
                    </div>
                    <div className="form-group">
                        <label>Éléments de Configuration (CI) Impactés</label>
                        <select 
                            multiple 
                            name="ci_ids" 
                            value={formData.ci_ids} 
                            onChange={(e) => {
                                const values = Array.from(e.target.selectedOptions, option => option.value);
                                setFormData(prev => ({ ...prev, ci_ids: values }));
                            }}
                            style={{ height: '120px' }}
                        >
                            {cis.map(ci => (
                                <option key={ci.id_ci} value={ci.id_ci}>
                                    {ci.nom_ci} ({ci.type_ci})
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label>Discussion Interne (Nouvelle Note)</label>
                        <textarea 
                            name="note_interne" 
                            value={formData.note_interne} 
                            onChange={handleChange}
                            rows="2"
                            placeholder="Ajouter une note..."
                        />
                    </div>
                </div>

                <div className="form-actions">
                    <button type="button" className="btn-secondary" onClick={() => navigate('/manager/rfcs')}>
                        <FiX /> Annuler
                    </button>
                    <button type="submit" className="btn-primary" disabled={saving}>
                        {saving ? 'Enregistrement...' : <><FiSave /> Enregistrer les modifications</>}
                    </button>
                </div>
            </form>

            <div className="edit-notice">
                <FiInfo />
                <p>Note: Les modifications effectuées ici seront enregistrées dans l'historique de la demande.</p>
            </div>
        </div>
    );
};

export default RfcEdit;
