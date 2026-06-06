import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiSettings, FiServer, FiList, FiPlus, FiEdit3, FiTrash2, 
  FiX, FiDatabase, FiRefreshCw, FiAlertCircle, FiLayers, FiInfo, FiSearch, FiCalendar
} from 'react-icons/fi';
import systemService from '../../services/systemService';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import './SystemSettings.css';
import './AdminUnified.css';
import PremiumToolbar from '../../components/common/PremiumToolbar';

const EnvironmentManagement = () => {
  const [activeTab, setActiveTab] = useState('ENVIRONNEMENTS');
  
  // States Environnements
  const [environnements, setEnvironnements] = useState([]);
  const [searchEnv, setSearchEnv] = useState('');
  const [filterEnv, setFilterEnv] = useState('ALL');
  const [envLoading, setEnvLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentEnv, setCurrentEnv] = useState(null);
  const [formData, setFormData] = useState(() => {
    const draft = localStorage.getItem('env_create_draft');
    if (draft) {
      try { return JSON.parse(draft); } catch (e) {}
    }
    return { nom_env: '', description: '' };
  });

  useEffect(() => {
    localStorage.setItem('env_create_draft', JSON.stringify(formData));
  }, [formData]);

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);

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
      setFormData({ nom_env: '', description: '' });
      localStorage.removeItem('env_create_draft');
      setCurrentEnv(null);
      handleCloseModal();
      fetchEnvironnements();
      setToast({ msg: currentEnv ? 'Environnement mis à jour.' : 'Environnement créé.', type: 'success' });
    } catch (error) {
      console.error("Erreur sauvegarde environnement", error);
      setToast({ msg: "Erreur: Impossible de sauvegarder l'environnement.", type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteEnv = (id) => {
    setConfirmDel({
      title: 'Supprimer l\'environnement',
      message: 'Supprimer cet environnement ? Cette action est irréversible.',
      id
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setIsSaving(true);
    try {
      await systemService.deleteEnvironnement(id);
      setEnvironnements(prev => prev.filter(e => e.id_env !== id));
      handleCloseModal();
      setToast({ msg: 'Environnement supprimé avec succès.', type: 'error' });
    } catch (err) {
      console.error('Erreur suppression env', err);
      setToast({ msg: 'Impossible de supprimer cet environnement (il peut être lié à d\'autres éléments).', type: 'error' });
    } finally {
      setIsSaving(false);
      setConfirmDel(null);
    }
  };

  return (
    <div className="settings-page">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiServer /></div>
          <div className="premium-header-text">
            <h1>Gestion des Environnements</h1>
            <p>Configurez les environnements techniques et supervisez les workflow du système ITIL ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={() => handleOpenModal()}>
            <FiPlus /> Nouvel environnement
          </button>
        </div>
      </div>

      <div className="settings-tabs-premium">
        <button className={`premium-tab ${activeTab === 'ENVIRONNEMENTS' ? 'active' : ''}`} onClick={() => setActiveTab('ENVIRONNEMENTS')}><FiDatabase /> Environnements</button>
        <button className={`premium-tab ${activeTab === 'REFERENTIELS' ? 'active' : ''}`} onClick={() => setActiveTab('REFERENTIELS')}><FiList /> Workflow</button>
      </div>


        {activeTab === 'ENVIRONNEMENTS' && (
          <div className="env-section">
            <PremiumToolbar 
              searchProps={{
                value: searchEnv,
                onChange: (e) => setSearchEnv(e.target.value),
                placeholder: "Rechercher (Filtre général)..."
              }}
              filters={[
                {
                  value: filterEnv,
                  onChange: (e) => setFilterEnv(e.target.value),
                  placeholder: "Tous les environnements",
                  options: environnements.map(env => ({ value: env.nom_env, label: env.nom_env }))
                }
              ]}
              onReset={() => { setSearchEnv(''); setFilterEnv('ALL'); }}
              showReset={!!(searchEnv || filterEnv !== 'ALL')}
            />

            <div className="section-header-premium">
              <div className="title-group">
                <FiLayers />
                <h3>Plateformes Configurées</h3>
                <span className="count-badge">{environnements.length}</span>
              </div>
            </div>

            {envLoading ? (
              <div className="loading-container"><FiRefreshCw className="spin" /></div>
            ) : (
              <div className="premium-table-card table-scroll-container">
                <table className="premium-settings-table" style={{ minWidth: '800px' }}>
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
                        const matchesFilter = filterEnv === 'ALL' || env.nom_env === filterEnv;
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
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                            <button onClick={(e) => { e.stopPropagation(); handleOpenModal(env); }} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Modifier">
                              <FiEdit3 size={16} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleDeleteEnv(env.id_env); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Supprimer">
                              <FiTrash2 size={16} />
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
          <div className="ref-section">
            <div className="section-header-premium">
              <div className="title-group">
                <FiInfo />
                <h3>Workflow Métier (Lecture Seule)</h3>
              </div>
            </div>
            <div className="ref-sub-tabs">
              {['STATUTS', 'PRIORITES', 'TYPES', 'DIRECTIONS'].map(tab => (
                <button key={tab} className={`ref-sub-tab ${refActiveTab === tab ? 'active' : ''}`} onClick={() => setRefActiveTab(tab)}>{tab}</button>
              ))}
            </div>
            <div className="premium-table-card table-scroll-container">
              <table className="premium-settings-table" style={{ minWidth: '800px' }}>
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

      {/* DETAIL MODAL */}
      {isDetailModalOpen && currentEnv && (
        <div className="modal-backdrop-cab" onClick={handleCloseModal}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '550px', border: '1px solid #003366', background: '#f0f9ff' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiServer /></div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>Détails : {currentEnv.nom_env}</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Fiche technique de l'environnement</div>
              </div>
              <button className="close-btn-rfc-style" onClick={handleCloseModal} style={{ color: '#ffffff' }}><FiX size={24} /></button>
            </div>
            <div className="modal-body-rfc-style">
              <div className="premium-detail-grid">
                <div className="premium-detail-box">
                  <div className="premium-detail-label">Nom de l'environnement</div>
                  <div className="premium-detail-value">{currentEnv.nom_env}</div>
                </div>
                <div className="premium-detail-box">
                  <div className="premium-detail-label">Type technique</div>
                  <div className="premium-detail-value">Infrastructure</div>
                </div>
              </div>

              <div className="premium-detail-box premium-detail-box-spacing-lg">
                <div className="premium-detail-label">Description & Usage</div>
                <div className="premium-detail-description">
                  {currentEnv.description || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Aucune description détaillée enregistrée pour cet environnement.</span>}
                </div>
              </div>

              <div className="premium-detail-actions">
                <button className="premium-detail-btn premium-detail-btn-delete" onClick={() => handleDeleteEnv(currentEnv.id_env)}>
                  <FiTrash2 size={16} /> Supprimer
                </button>
                <button className="premium-detail-btn premium-detail-btn-edit" onClick={() => handleOpenModal(currentEnv)}>
                  <FiEdit3 size={16} /> Modifier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FORM MODAL */}
      {isModalOpen && (
        <div className="modal-backdrop-cab" onClick={handleCloseModal}>
          <div className="modal-box-cab glass-card-cab" style={{ maxWidth: '500px', border: '1px solid #003366', background: '#f0f9ff' }} onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}><FiServer /></div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff' }}>{currentEnv ? "Modifier" : "Ajouter"} un Environnement</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)' }}>Paramétrage technique</div>
              </div>
              <button className="close-btn-rfc-style" onClick={handleCloseModal} style={{ color: '#ffffff' }}><FiX size={24} /></button>
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

      {/* Confirm Delete Modal */}
      {confirmDel && (
        <ConfirmModal
          title={confirmDel.title}
          message={confirmDel.message}
          danger={true}
          loading={isSaving}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default EnvironmentManagement;