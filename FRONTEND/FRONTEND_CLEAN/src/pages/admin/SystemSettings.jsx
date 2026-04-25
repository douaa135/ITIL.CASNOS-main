import React, { useState, useEffect } from 'react';
import { 
  FiSettings, FiServer, FiList, FiPlus, FiEdit2, FiTrash2, 
  FiX, FiDatabase, FiRefreshCw, FiAlertCircle 
} from 'react-icons/fi';
import systemService from '../../services/systemService';
import './SystemSettings.css';

const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('ENVIRONNEMENTS');
  
  // States Environnements
  const [environnements, setEnvironnements] = useState([]);
  const [envLoading, setEnvLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentEnv, setCurrentEnv] = useState(null); // null if adding, object if editing
  const [formData, setFormData] = useState({ nom_env: '', description: '' });
  const [isSaving, setIsSaving] = useState(false);

  // States Référentiels
  const [refActiveTab, setRefActiveTab] = useState('STATUTS');
  const [refData, setRefData] = useState([]);
  const [refLoading, setRefLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'ENVIRONNEMENTS') {
      fetchEnvironnements();
    } else {
      fetchRefData(refActiveTab);
    }
  }, [activeTab, refActiveTab]);

  // ── Environnements Logic ──────────────────────────────────────
  const fetchEnvironnements = async () => {
    setEnvLoading(true);
    try {
      const res = await systemService.getEnvironnements();
      if (res.success && res.data && res.data.data) {
        setEnvironnements(res.data.data);
      } else if (res.data) {
        // Fallback depending on exact API structure
        setEnvironnements(res.data.environnements || res.data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération des environnements", error);
    } finally {
      setEnvLoading(false);
    }
  };

  const handleOpenModal = (env = null) => {
    if (env) {
      setCurrentEnv(env);
      setFormData({ nom_env: env.nom_env, description: env.description || '' });
    } else {
      setCurrentEnv(null);
      setFormData({ nom_env: '', description: '' });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
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
      console.error("Erreur lors de la sauvegarde de l'environnement", error);
      alert("Erreur: Impossible de sauvegarder l'environnement.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEnv = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cet environnement ?")) return;
    try {
      await systemService.deleteEnvironnement(id);
      fetchEnvironnements();
    } catch (error) {
      console.error("Erreur lors de la suppression", error);
      alert("Impossible de supprimer cet environnement. Il est peut-être déjà lié à des composants (CI).");
    }
  };

  // ── Référentiels Logic ─────────────────────────────────────────
  const fetchRefData = async (type) => {
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
      console.error(`Erreur lors de la récupération des ${type}`, error);
    } finally {
      setRefLoading(false);
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1><FiSettings /> Paramétrages système</h1>
        <p>Gérez l'architecture logicielle et consultez les référentiels de base.</p>
      </div>

      <div className="settings-tabs">
        <button 
          className={`tab-btn ${activeTab === 'ENVIRONNEMENTS' ? 'active' : ''}`}
          onClick={() => setActiveTab('ENVIRONNEMENTS')}
        >
          <FiServer /> Environnements de Travail
        </button>
        <button 
          className={`tab-btn ${activeTab === 'REFERENTIELS' ? 'active' : ''}`}
          onClick={() => setActiveTab('REFERENTIELS')}
        >
          <FiList /> Référentiels (Lecture Seule)
        </button>
      </div>

      <div className="settings-content-card">
        {activeTab === 'ENVIRONNEMENTS' && (
          <div>
            <div className="content-header">
              <h2><FiDatabase /> Liste des Environnements</h2>
              <button className="add-btn" onClick={() => handleOpenModal()}>
                <FiPlus /> Ajouter un environnement
              </button>
            </div>

            {envLoading ? (
              <div className="loading-state"><FiRefreshCw className="spinning" /><p>Chargement...</p></div>
            ) : environnements.length === 0 ? (
              <div className="empty-state"><FiServer /><p>Aucun environnement configuré.</p></div>
            ) : (
              <div className="settings-table-container">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Nom de l'environnement</th>
                      <th>Description</th>
                      <th style={{ width: '120px' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {environnements.map(env => (
                      <tr key={env.id_env}>
                        <td className="table-id">#{env.id_env.slice(0, 8)}</td>
                        <td className="table-name">{env.nom_env}</td>
                        <td>{env.description || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                        <td>
                          <div className="table-actions">
                            <button className="action-btn edit" onClick={() => handleOpenModal(env)} title="Modifier">
                              <FiEdit2 />
                            </button>
                            <button className="action-btn delete" onClick={() => handleDeleteEnv(env.id_env)} title="Supprimer">
                              <FiTrash2 />
                            </button>
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
          <div>
            <div className="content-header">
              <h2><FiList /> Consultation des Référentiels ITIL</h2>
            </div>
            
            <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: '12px', color: '#1e40af', marginBottom: '1.5rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <FiAlertCircle size={20} />
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Les données de référence sont gérées côté Backend et sont affichées ici en lecture seule pour des raisons d'intégrité de la base de données ITIL.</p>
            </div>

            <div className="ref-tabs">
              {['STATUTS', 'PRIORITES', 'TYPES', 'DIRECTIONS'].map(tab => (
                <button 
                  key={tab}
                  className={`ref-tab-btn ${refActiveTab === tab ? 'active' : ''}`}
                  onClick={() => setRefActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>

            {refLoading ? (
              <div className="loading-state"><FiRefreshCw className="spinning" /><p>Chargement...</p></div>
            ) : (
              <div className="settings-table-container">
                <table className="settings-table">
                  <thead>
                    <tr>
                      <th>ID Technique</th>
                      <th>Code Métier / Valeur</th>
                      {refActiveTab === 'STATUTS' && <th>Contexte</th>}
                      <th>Libellé / Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {refData.map((item, idx) => (
                      <tr key={idx}>
                        <td className="table-id">#{
                          (item.id_statut || item.id_priorite || item.id_type || item.id_direction || '').slice(0, 8)
                        }</td>
                        <td className="table-name">{item.code_statut || item.code_priorite || item.type || item.nom_direction || item.code_metier}</td>
                        {refActiveTab === 'STATUTS' && <td><span className="badge">{item.contexte}</span></td>}
                        <td>{item.libelle || item.description || <span style={{ color: '#cbd5e1' }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal CRUD Environnement */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{currentEnv ? "Modifier l'environnement" : "Nouvel environnement"}</h3>
              <button className="close-btn" onClick={handleCloseModal}><FiX /></button>
            </div>
            <form onSubmit={handleSaveEnv}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nom de l'environnement *</label>
                  <input 
                    type="text" 
                    value={formData.nom_env} 
                    onChange={e => setFormData({...formData, nom_env: e.target.value})}
                    placeholder="Ex: PROD, PRE-PROD, UAT..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Description (Optionnelle)</label>
                  <textarea 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                    placeholder="Brève description de l'usage de cet environnement"
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={handleCloseModal} disabled={isSaving}>Annuler</button>
                <button type="submit" className="btn-save" disabled={isSaving || !formData.nom_env}>
                  {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
