import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiSettings, FiServer, FiList, FiPlus, FiEdit3, FiTrash2, 
  FiX, FiDatabase, FiRefreshCw, FiAlertCircle, FiLayers, FiInfo, FiSearch
} from 'react-icons/fi';
import systemService from '../../services/systemService';
import './SystemSettings.css';

const EnvironmentManagement = () => {
  const [activeTab, setActiveTab] = useState('ENVIRONNEMENTS');
  
  // States Environnements
  const [environnements, setEnvironnements] = useState([]);
  const [searchEnv, setSearchEnv] = useState('');
  const [filterEnv, setFilterEnv] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentEnv, setCurrentEnv] = useState(null);
  const [formData, setFormData] = useState({ nom_env: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // States Référentiels
  const [refActiveTab, setRefActiveTab] = useState('STATUTS');
  const [refData, setRefData] = useState([]);
  const [refLoading, setRefLoading] = useState(false);

  const fetchEnvironnements = useCallback(async () => {
    setEnvLoading(true);
    try {
      const res = await systemService.getEnvironnements();
      if (res.success && res.data && res.data.data) {
        setEnvironnements(res.data.data);
      } else if (res.data) {
        setEnvironnements(res.data.environnements || res.data);
      }
    } catch (error) {
      console.error("Erreur récup environnements", error);
    } finally {
      setEnvLoading(false);
    }
  }, []);

  const fetchRefData = useCallback(async (type) => {
    setRefLoading(true);
    try {
      let res;
      switch(type) {
        case 'STATUTS':    res = await systemService.getStatuts(); break;
        case 'PRIORITES':  res = await systemService.getPriorites(); break;
        case 'TYPES':      res = await systemService.getTypesRfc(); break;
        case 'DIRECTIONS': res = await systemService.getDirections(); break;
        default: break;
      }
      
      if (res && res.data) {
        const dataKey = type.toLowerCase() === 'types' ? 'types' : type.toLowerCase();
        setRefData(res.data[dataKey] || res.data.data || res.data || []);
      }
    } catch (error) {
      console.error(`Erreur récup ${type}`, error);
    } finally {
      setRefLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'ENVIRONNEMENTS') {
      fetchEnvironnements();
    } else {
      fetchRefData(refActiveTab);
    }
  }, [activeTab, refActiveTab, fetchEnvironnements, fetchRefData]);

  const handleOpenModal = (env = null) => {
    if (env) {
      setCurrentEnv(env);
      setFormData({ nom_env: env.nom_env, description: env.description || '' });
    } else {
      setCurrentEnv(null);
      setFormData({ nom_env: '', description: '' });
    }
    setIsModalOpen(true);
    setIsDetailModalOpen(false);
  };

  const handleOpenDetail = (env) => {
    setCurrentEnv(env);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsDetailModalOpen(false);
    setCurrentEnv(null);
    setFormData({ nom_env: '', description: '' });
  };

  const handleSaveEnv = async (e) => {
    e.preventDefault();
    if (!formData.nom_env) return;

    setIsSaving(true);
    try {
      if (currentEnv) {
        await systemService.updateEnvironnement(currentEnv.id_env, formData);
      } else {
        await systemService.createEnvironnement(formData);
      }
      handleCloseModal();
      fetchEnvironnements();
    } catch (error) {
      console.error("Erreur sauvegarde environnement", error);
      alert("Erreur: Impossible de sauvegarder l'environnement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEnv = async (id) => {
    if (!window.confirm("Supprimer cet environnement ?")) return;
    try {
      await systemService.deleteEnvironnement(id);
      fetchEnvironnements();
      handleCloseModal();
    } catch (error) {
      console.error("Erreur suppression", error);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className="header-icon-main" style={{ width: '56px', height: '56px', background: '#eff6ff', color: '#3b82f6', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.6rem', border: '1px solid #bfdbfe' }}>
            <FiServer />
          </div>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>Gestion des Environnements</h1>
            <p style={{ color: '#64748b', fontSize: '1rem', margin: '0.25rem 0 0', fontWeight: 500 }}>Supervisez les plateformes techniques et consultez les référentiels ITIL du système.</p>
          </div>
        </div>
        <button className="btn-create-premium" onClick={() => handleOpenModal()}>
          <FiPlus /> Nouvel environnement
        </button>
      </div>

      <div className="settings-tabs-premium">
        <button className={`premium-tab ${activeTab === 'ENVIRONNEMENTS' ? 'active' : ''}`} onClick={() => setActiveTab('ENVIRONNEMENTS')}><FiDatabase /> Environnements</button>
        <button className={`premium-tab ${activeTab === 'REFERENTIELS' ? 'active' : ''}`} onClick={() => setActiveTab('REFERENTIELS')}><FiList /> Référentiels</button>
      </div>

      <div className="settings-main-content">
        {activeTab === 'ENVIRONNEMENTS' && (
          <div className="env-section">
            <div className="rfc-mgr-toolbar" style={{ marginBottom: '1.5rem', background: 'white', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.04)', display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input 
                  type="text" 
                  placeholder="Rechercher (Filtre général)..." 
                  value={searchEnv}
                  onChange={(e) => setSearchEnv(e.target.value)}
                  style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', outline: 'none' }}
                />
              </div>
              <select 
                value={filterEnv}
                onChange={(e) => setFilterEnv(e.target.value)}
                style={{ padding: '0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0', fontSize: '0.9rem', color: '#334155', outline: 'none', minWidth: '200px' }}
              >
                <option value="">Tous les environnements</option>
                {environnements.map(env => <option key={env.id_env} value={env.nom_env}>{env.nom_env}</option>)}
              </select>
            </div>

            <div className="section-header-premium">
              <div className="title-group">
                <h3><FiLayers /> Plateformes Configurées</h3>
                <span className="count-badge">{environnements.length}</span>
              </div>
            </div>

            {envLoading ? (
              <div className="loading-container"><FiRefreshCw className="spin" /></div>
            ) : (
              <div className="premium-table-card">
                <table className="premium-settings-table">
                  <thead>
                    <tr>
                      <th>Plateforme</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {environnements
                      .filter(env => {
                        const matchesSearch = !searchEnv || env.nom_env?.toLowerCase().includes(searchEnv.toLowerCase()) || env.description?.toLowerCase().includes(searchEnv.toLowerCase());
                        const matchesFilter = !filterEnv || env.nom_env === filterEnv;
                        return matchesSearch && matchesFilter;
                      })
                      .map(env => (
                      <tr key={env.id_env} onClick={() => handleOpenDetail(env)} style={{ cursor: 'pointer' }}>
                        <td className="env-name-cell">
                          <div className="env-dot"></div>
                          {env.nom_env}
                        </td>
                        <td className="env-desc-cell">{env.description || '—'}</td>
                        <td style={{ textAlign: 'right' }}>
                          <div className="actions-flex">
                            <button className="action-circle-btn edit" onClick={(e) => { e.stopPropagation(); handleOpenModal(env); }}><FiEdit3 size={14} /></button>
                            <button className="action-circle-btn delete" onClick={(e) => { e.stopPropagation(); handleDeleteEnv(env.id_env); }}><FiTrash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'REFERENTIELS' && (
          <div className="ref-section">
            <div className="section-header-premium"><h3><FiInfo /> Référentiels Métier (Lecture Seule)</h3></div>
            <div className="ref-sub-tabs">
              {['STATUTS', 'PRIORITES', 'TYPES', 'DIRECTIONS'].map(tab => (
                <button key={tab} className={`ref-sub-tab ${refActiveTab === tab ? 'active' : ''}`} onClick={() => setRefActiveTab(tab)}>{tab}</button>
              ))}
            </div>
            <div className="premium-table-card">
              <table className="premium-settings-table">
                <thead>
                  <tr>
                    <th>Code / Valeur</th>
                    {refActiveTab === 'STATUTS' && <th>Contexte</th>}
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {refData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="ref-code-cell">{item.code_statut || item.code_priorite || item.type || item.nom_direction || item.code_metier}</td>
                      {refActiveTab === 'STATUTS' && <td><span className="ref-badge">{item.contexte}</span></td>}
                      <td className="ref-desc-cell">{item.libelle || item.description || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {isDetailModalOpen && currentEnv && (
        <div className="modal-backdrop-cab" onClick={handleCloseModal}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '550px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper"><FiServer /></div>
              <div className="rfc-style-header-text">
                <h2>Détails : {currentEnv.nom_env}</h2>
                <div className="rfc-style-subtitle">Fiche technique de l'environnement</div>
              </div>
              <div className="rfc-style-actions">
                <button className="rfc-action-btn edit" onClick={() => handleOpenModal(currentEnv)}><FiEdit3 /> Modifier</button>
                <button className="rfc-action-btn delete" onClick={() => handleDeleteEnv(currentEnv.id_env)}><FiTrash2 /> Supprimer</button>
              </div>
              <button className="close-btn-rfc-style" onClick={handleCloseModal}><FiX size={24} /></button>
            </div>
            <div className="modal-body-rfc-style">
              <div className="rfc-details-grid" style={{ gridTemplateColumns: '1fr' }}>
                <div className="detail-item">
                  <label>Nom de l'environnement</label>
                  <div className="detail-value" style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a' }}>{currentEnv.nom_env}</div>
                </div>
                <div className="detail-item" style={{ marginTop: '1rem' }}>
                  <label>Description & Usage</label>
                  <div className="detail-value" style={{ lineHeight: '1.6', background: '#f8fafc', padding: '1rem', borderRadius: '12px' }}>
                    {currentEnv.description || 'Aucune description détaillée enregistrée pour cet environnement.'}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer-rfc-style">
              <button className="btn-cancel-rfc-style" onClick={handleCloseModal}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop-cab" onClick={handleCloseModal}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style">
              <div className="rfc-style-icon-wrapper"><FiServer /></div>
              <div className="rfc-style-header-text">
                <h2>{currentEnv ? "Modifier" : "Ajouter"} un Environnement</h2>
                <div className="rfc-style-subtitle">Paramétrage technique</div>
              </div>
              <button className="close-btn-rfc-style" onClick={handleCloseModal}><FiX size={24} /></button>
            </div>
            <form onSubmit={handleSaveEnv}>
              <div className="modal-body-rfc-style">
                <div className="form-group-cab">
                  <label>Nom de l'environnement</label>
                  <input type="text" className="premium-input-style" value={formData.nom_env} onChange={e => setFormData({...formData, nom_env: e.target.value})} required />
                </div>
                <div className="form-group-cab" style={{ marginTop: '1.5rem' }}>
                  <label>Description détaillée</label>
                  <textarea className="premium-input-style" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows={4} />
                </div>
              </div>
              <div className="modal-footer-rfc-style">
                <button type="button" className="btn-cancel-rfc-style" onClick={handleCloseModal}>Annuler</button>
                <button type="submit" className="btn-submit-rfc-style" disabled={isSaving}>{isSaving ? 'Traitement...' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnvironmentManagement;
