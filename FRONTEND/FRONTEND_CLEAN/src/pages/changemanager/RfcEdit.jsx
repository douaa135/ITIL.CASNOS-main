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

    const [formData, setFormData] = useState({
        titre_rfc: '',
        description: '',
        justification: '',
        impacte_estimee: '',
        id_type: '',
        id_priorite: ''
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [resRfc, resTypes, resPrios] = await Promise.all([
                    api.get(`/rfc/${id}`),
                    api.get('/admin/types-rfc'), 
                    api.get('/admin/priorites')
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
                        id_priorite: r.id_priorite || ''
                    });
                }
                if (resTypes.success) setTypes(resTypes.types);
                if (resPrios.success) setPriorities(resPrios.prioriteArr || resPrios.priorites || []);

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
            const res = await api.put(`/rfc/${id}`, formData);
            if (res.success) {
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
            <div className="edit-header">
                <button className="back-link" onClick={() => navigate('/manager/rfcs')}>
                    <FiChevronLeft /> Retour au backlog
                </button>
                <h1>Édition Technique de la RFC #{rfc?.code_rfc}</h1>
                <p>Correction des informations avant évaluation ou approbation.</p>
            </div>

            <form className="edit-form-card" onSubmit={handleSubmit}>
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
                            <label>Type de RFC</label>
                            <select name="id_type" value={formData.id_type} onChange={handleChange}>
                                {types.map(t => <option key={t.id_type} value={t.id_type}>{t.type}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Priorité</label>
                            <select name="id_priorite" value={formData.id_priorite} onChange={handleChange}>
                                {priorities.map(p => <option key={p.id_priorite} value={p.id_priorite}>{p.libelle}</option>)}
                            </select>
                        </div>
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
                        <label>Impact Estimé</label>
                        <select name="impacte_estimee" value={formData.impacte_estimee} onChange={handleChange}>
                            <option value="MINEUR">Mineur</option>
                            <option value="MOYEN">Moyen</option>
                            <option value="MAJEUR">Majeur</option>
                            <option value="CRITIQUE">Critique</option>
                        </select>
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
