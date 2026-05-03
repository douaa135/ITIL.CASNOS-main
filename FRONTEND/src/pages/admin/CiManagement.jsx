import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiDatabase,
  FiServer, FiGlobe, FiCpu, FiInfo, FiX, FiCalendar, FiLayers, FiCheckCircle
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';
import ConfirmModal from '../../components/common/ConfirmModal';
import Toast from '../../components/common/Toast';
import './AdminCabManagement.css';
import './CiManagement.css';

// Type CI Icons mapper
const getCiIcon = (type) => {
  const t = type?.toLowerCase() || '';
  if (t.includes('serveur')) return <FiServer />;
  if (t.includes('application') || t.includes('logiciel')) return <FiGlobe />;
  if (t.includes('reseau') || t.includes('réseau')) return <FiCpu />;
  return <FiDatabase />;
};

// ── Modals ────────────────────────────────────────────────────────
const CreateCiModal = ({ onClose, onCreated, environnements }) => {
  const [formData, setFormData] = useState({
    nom_ci: '',
    type_ci: 'Serveur',
    version_ci: '',
    description: '',
    env_ids: []
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nom_ci || !formData.type_ci) return setError('Nom et Type sont requis.');
    setLoading(true);
    try {
      // axios interceptor returns response.data directly
      const res = await api.post('/ci', formData);
      const newCi = res?.data?.ci || res?.ci || res;
      if (!newCi?.id_ci) throw new Error('Réponse inattendue du serveur.');
      onCreated(newCi);
      onClose();
    } catch (err) {
      setError(err?.message || 'Erreur lors de la création.');
    } finally { setLoading(false); }
  };

  const toggleEnv = (id) => {
    setFormData(prev => ({
      ...prev,
      env_ids: prev.env_ids.includes(id) ? prev.env_ids.filter(e => e !== id) : [...prev.env_ids, id]
    }));
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab ci-modal-medium" onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper"><FiDatabase /></div>
          <div className="rfc-style-header-text">
            <h2>Nouveau Configuration Item</h2>
            <div className="rfc-style-subtitle">Enregistrez un élément dans le référentiel CMDB</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body-rfc-style">
            <div className="ci-form-grid">
              <div className="form-group-cab ci-grid-span-2">
                <label>Nom du CI <span className="ci-required">*</span></label>
                <input type="text" value={formData.nom_ci} onChange={e => setFormData({...formData, nom_ci: e.target.value})} className="premium-input-style" placeholder="Ex: Serveur-Prod-01" required />
              </div>
              <div className="form-group-cab">
                <label>Type <span className="ci-required">*</span></label>
                <select value={formData.type_ci} onChange={e => setFormData({...formData, type_ci: e.target.value})} className="premium-input-style">
                  <option value="Serveur">Serveur</option>
                  <option value="Application">Application</option>
                  <option value="Base de données">Base de données</option>
                  <option value="Réseau">Réseau</option>
                  <option value="Matériel">Matériel</option>
                </select>
              </div>
              <div className="form-group-cab">
                <label>Version</label>
                <input type="text" value={formData.version_ci} onChange={e => setFormData({...formData, version_ci: e.target.value})} className="premium-input-style" placeholder="Ex: 2.1.4" />
              </div>
              <div className="form-group-cab ci-grid-span-2">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="premium-input-style" rows={3} placeholder="Description du CI..." />
              </div>
              {environnements.length > 0 && (
                <div className="form-group-cab ci-grid-span-2">
                  <label>Lier aux Environnements</label>
                  <div className="ci-env-tags-wrap">
                    {environnements.map(env => (
                      <label key={env.id_env} className={`ci-env-chip ${formData.env_ids.includes(env.id_env) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={formData.env_ids.includes(env.id_env)} onChange={() => toggleEnv(env.id_env)} className="ci-env-chip-checkbox" />
                        {env.nom_env}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer-rfc-style">
            <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={loading} className="btn-submit-rfc-style">{loading ? 'Création...' : 'Créer CI'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditCiModal = ({ ci, onClose, onUpdated, environnements }) => {
  const [formData, setFormData] = useState({
    nom_ci: ci.nom_ci || '',
    type_ci: ci.type_ci || '',
    version_ci: ci.version_ci || '',
    description: ci.description || '',
    env_ids: ci.ciEnvs?.map(e => e.id_env) || []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleEnv = (id) => {
    setFormData(prev => ({
      ...prev,
      env_ids: prev.env_ids.includes(id) ? prev.env_ids.filter(e => e !== id) : [...prev.env_ids, id]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!formData.nom_ci.trim()) { setError('Le nom du CI est requis.'); return; }
    if (!formData.type_ci.trim()) { setError('Le type est requis.'); return; }
    
    setLoading(true);
    try {
      const { env_ids, ...ciData } = formData;
      
      // axios interceptor returns response.data directly
      const res = await api.put(`/ci/${ci.id_ci}`, ciData);
      const updatedCi = res?.data?.ci || res?.ci || res;
      if (!updatedCi?.id_ci && !updatedCi?.nom_ci) {
        setError('Réponse inattendue du serveur.');
        setLoading(false);
        return;
      }
      
      // Gérer les changements d'environnements
      const currentEnvIds = ci.ciEnvs?.map(e => e.id_env) || [];
      const envsToAdd = env_ids.filter(id => !currentEnvIds.includes(id));
      const envsToRemove = currentEnvIds.filter(id => !env_ids.includes(id));
      
      for (const id_env of envsToAdd) {
        await api.post(`/ci/${ci.id_ci}/environnements`, { id_env });
      }
      for (const id_env of envsToRemove) {
        await api.delete(`/ci/${ci.id_ci}/environnements/${id_env}`);
      }
      
      setToast({ message: 'CI mis à jour avec succès.', type: 'success' });
      onUpdated(updatedCi);
      onClose();
    } catch (err) {
      setError(err?.message || 'Erreur lors de la modification.');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab ci-modal-medium" onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper ci-edit-icon"><FiEdit2 /></div>
          <div className="rfc-style-header-text">
            <h2>Modifier le CI</h2>
            <div className="rfc-style-subtitle">{ci.nom_ci} — #{ci.code_metier}</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body-rfc-style">
            {error && <div className="ci-error-banner">{error}</div>}
            <div className="ci-form-grid">
              <div className="form-group-cab ci-grid-span-2">
                <label>Nom du CI</label>
                <input type="text" value={formData.nom_ci} onChange={e => setFormData({...formData, nom_ci: e.target.value})} className="premium-input-style" required />
              </div>
              <div className="form-group-cab">
                <label>Type</label>
                <select value={formData.type_ci} onChange={e => setFormData({...formData, type_ci: e.target.value})} className="premium-input-style">
                  <option value="Serveur">Serveur</option>
                  <option value="Application">Application</option>
                  <option value="Base de données">Base de données</option>
                  <option value="Réseau">Réseau</option>
                  <option value="Matériel">Matériel</option>
                </select>
              </div>
              <div className="form-group-cab">
                <label>Version</label>
                <input type="text" value={formData.version_ci} onChange={e => setFormData({...formData, version_ci: e.target.value})} className="premium-input-style" />
              </div>
              <div className="form-group-cab ci-grid-span-2">
                <label>Description</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="premium-input-style" rows={3} />
              </div>
              {environnements.length > 0 && (
                <div className="form-group-cab ci-grid-span-2">
                  <label>Lier aux Environnements</label>
                  <div className="ci-env-tags-wrap">
                    {environnements.map(env => (
                      <label key={env.id_env} className={`ci-env-chip ${formData.env_ids.includes(env.id_env) ? 'selected' : ''}`}>
                        <input type="checkbox" checked={formData.env_ids.includes(env.id_env)} onChange={() => toggleEnv(env.id_env)} className="ci-env-chip-checkbox" />
                        {env.nom_env}
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-footer-rfc-style">
            <button type="button" className="btn-cancel-rfc-style" onClick={onClose}>Annuler</button>
            <button type="submit" disabled={loading} className="btn-submit-rfc-style">{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const DetailCiModal = ({ ci, onClose, onEdit, onDelete }) => {
  if (!ci) return null;

  return (
    <div className="modal-backdrop-cab" onClick={onClose}>
      <div className="modal-box-cab glass-card-cab ci-modal-large" onClick={e => e.stopPropagation()}>
        <div className="modal-top-rfc-style">
          <div className="rfc-style-icon-wrapper ci-detail-icon">
            {getCiIcon(ci.type_ci)}
          </div>
          <div className="rfc-style-header-text">
            <h2>Détails du CI</h2>
            <div className="rfc-style-subtitle">#{ci.code_metier} — {ci.nom_ci}</div>
          </div>
          <button className="close-btn-rfc-style" onClick={onClose}><FiX size={24} /></button>
        </div>

        <div className="modal-body-rfc-style">
          <div className="premium-detail-grid">
            <div className="premium-detail-box">
              <div className="premium-detail-label">Type d'équipement</div>
              <div className="premium-detail-value">{ci.type_ci}</div>
            </div>
            <div className="premium-detail-box">
              <div className="premium-detail-label">Version</div>
              <div className="premium-detail-value">{ci.version_ci || 'N/A'}</div>
            </div>
          </div>

          <div className="premium-detail-box premium-detail-box-spacing-sm">
            <div className="premium-detail-label">Description</div>
            <div className="premium-detail-description">
              {ci.description || <span className="ci-muted-italic">Aucune description fournie.</span>}
            </div>
          </div>

          <div className="premium-detail-box premium-detail-box-spacing-lg">
          <div className="premium-detail-label">Environnements Liés</div>
          <div className="ci-env-list ci-env-list-detail">
            {ci.ciEnvs?.length > 0 ? ci.ciEnvs.map(e => (
              <span key={e.environnement?.id_env || e.id_env} className="ci-env-pill ci-env-pill-detail">
                {e.environnement?.nom_env || 'Inconnu'}
              </span>
            )) : <span className="ci-muted-italic">Aucun environnement</span>}
          </div>
        </div>

        <div className="premium-detail-actions">
           <button onClick={() => { onClose(); onDelete(ci.id_ci, ci.nom_ci); }} className="premium-detail-btn premium-detail-btn-delete">
              <FiTrash2 size={16} /> Supprimer
           </button>
           <button onClick={() => { onClose(); onEdit(ci); }} className="premium-detail-btn premium-detail-btn-edit">
              <FiEdit2 size={16} /> Modifier
           </button>
        </div>
        </div>
        </div>
        </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────
const CiManagement = () => {
  const [cis, setCis] = useState([]);
  const [environnements, setEnvironnements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterEnv, setFilterEnv] = useState('ALL');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editCi, setEditCi] = useState(null);
  const [detailCi, setDetailCi] = useState(null);
  const [confirmDel, setConfirmDel] = useState(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // axios interceptor returns response.data directly
      const [ciRes, envRes] = await Promise.all([
        api.get('/ci'),
        api.get('/environnements')
      ]);
      // ciRes IS response.data => { cis: [...] } or { data: [...] }
      setCis(ciRes?.data?.cis || ciRes?.cis || ciRes?.data || []);
      // envRes IS response.data => { data: { environnements: [...] } }
      setEnvironnements(envRes?.data?.environnements || envRes?.environnements || envRes?.data || []);
    } catch (err) {
      console.error('Fetch CI/ENV error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = (id, nom) => {
    setConfirmDel({
      title: 'Supprimer le CI',
      message: `Supprimer le CI "${nom}" ? Cette action est irréversible.`,
      id
    });
  };

  const confirmDelete = async () => {
    if (!confirmDel) return;
    const { id } = confirmDel;
    setLoading(true);
    try {
      await api.delete(`/ci/${id}`);
      setCis(prev => prev.filter(c => c.id_ci !== id));
      setToast({ msg: 'CI supprimé avec succès.', type: 'error' });
      if (detailCi?.id_ci === id) setDetailCi(null);
    } catch (err) {
      console.error('Delete CI err:', err);
      setToast({ msg: 'Impossible de supprimer ce CI.', type: 'error' });
    } finally {
      setLoading(false);
      setConfirmDel(null);
    }
  };

  const handleViewClick = async (ci) => {
    try {
      const res = await api.get(`/ci/${ci.id_ci}`);
      // res IS response.data
      setDetailCi(res?.ci || res);
    } catch (e) {
      setToast({ msg: 'Erreur lors du chargement des détails du CI.', type: 'error' });
    }
  };

  const handleEditClick = async (ci) => {
    try {
      const res = await api.get(`/ci/${ci.id_ci}`);
      // res IS response.data
      setEditCi(res?.ci || res);
    } catch (e) {
      setToast({ msg: 'Erreur lors du chargement des détails du CI.', type: 'error' });
    }
  };

  const filtered = cis.filter(ci => {
    const matchSearch = !search || ci.nom_ci?.toLowerCase().includes(search.toLowerCase()) || ci.code_metier?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || ci.type_ci === filterType;
    const matchEnv = filterEnv === 'ALL' || ci.ciEnvs?.some(e => (e.environnement?.id_env || e.id_env) === filterEnv);
    return matchSearch && matchType && matchEnv;
  });

  const uniqueTypes = [...new Set((cis || []).map(c => c?.type_ci))].filter(Boolean);

  return (
    <div className="ci-page">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiDatabase /></div>
          <div className="premium-header-text">
            <h1>Gestion des CI</h1>
            <p>Configurez les éléments de configuration et supervisez les dépendances du parc informatique ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={() => setShowCreate(true)}>
            <FiPlus /> Nouvel Élément
          </button>
        </div>
      </div>

      {/* KPI Section */}
      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        <div className="stat-card blue">
          <div className="stat-icon-wrapper"><FiDatabase size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cis.length}</div>
            <div className="stat-label">Total CIs</div>
          </div>
        </div>
        <div className="stat-card purple">
          <div className="stat-icon-wrapper"><FiServer size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{cis.filter(c => c.type_ci?.toLowerCase().includes('serveur') || c.type_ci?.toLowerCase().includes('server')).length}</div>
            <div className="stat-label">Serveurs</div>
          </div>
        </div>
        <div className="stat-card green">
          <div className="stat-icon-wrapper"><FiGlobe size={24} /></div>
          <div className="stat-info">
            <div className="stat-value">{filtered.length}</div>
            <div className="stat-label">Filtrés</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
          <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
          <input 
            type="text" 
            placeholder="Rechercher par nom ou code..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
              borderRadius: '10px', border: '1.5px solid #e2e8f0',
              fontSize: '0.9rem', boxSizing: 'border-box',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <select 
        value={filterType} 
        onChange={e => setFilterType(e.target.value)} 
        style={{
            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
          }}
          >
          <option value="ALL">Tous les types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select 
        value={filterEnv} 
        onChange={e => setFilterEnv(e.target.value)} 
        style={{
            padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
            fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
            minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
          }}
          >
          <option value="ALL">Tous les environnements</option>
          {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
        </select>

        {(search || filterEnv !== 'ALL' || filterType !== 'ALL' ) && (
          <button 
            onClick={() => { setSearch(''); setFilterEnv('ALL'); }}
            style={{
              padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
              fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', 
              cursor: 'pointer', fontWeight: '600'
            }}
          >
            Réinitialiser
          </button>
        )}

        <button onClick={fetchData} className="ci-refresh-btn" title="Rafraîchir">
          <FiRefreshCw />
        </button>
      </div>

      {/* Table */}
      <Card className="ci-table-card">
        <div className="ci-table-wrap table-scroll-container">
          <table className="ci-table" style={{ minWidth: '1000px' }}>
            <thead>
              <tr className="ci-head-row">
                <th className="ci-head-cell">CI & Code</th>
                <th className="ci-head-cell">Type</th>
                <th className="ci-head-cell">Version</th>
                <th className="ci-head-cell">Environnements</th>
                <th className="ci-head-cell text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="ci-state-cell">Chargement des CIs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="ci-empty-cell">
                    <FiDatabase size={40} className="ci-empty-icon" />
                    Aucun CI trouvé.
                  </td>
                </tr>
              ) : filtered.map((ci, index) => (
                <tr key={ci.id_ci} onClick={(e) => { e.stopPropagation(); handleViewClick(ci); }} className={`hover-row ci-row ${index % 2 === 0 ? 'even' : 'odd'}`}>
                  <td className="ci-cell">
                    <div className="ci-name">{ci.nom_ci}</div>
                    <div className="ci-code">#{ci.code_metier}</div>
                  </td>
                  <td className="ci-cell">
                    <span className="ci-type-badge">
                      {getCiIcon(ci.type_ci)} {ci.type_ci}
                    </span>
                  </td>
                  <td className="ci-cell ci-version">
                    {ci.version_ci || <span className="ci-muted-italic">N/A</span>}
                  </td>
                  <td className="ci-cell">
                    <div className="ci-env-list">
                      {ci.ciEnvs?.length > 0 ? ci.ciEnvs.map(e => (
                        <span key={e.environnement?.id_env || e.id_env} className="ci-env-pill">
                          {e.environnement?.nom_env || 'Inconnu'}
                        </span>
                      )) : <span className="ci-muted-italic">Aucun</span>}
                    </div>
                  </td>
                  <td className="ci-cell text-right">
                    <div className="ci-actions">
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(ci); }} className="ci-action-btn edit" title="Modifier">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(ci.id_ci, ci.nom_ci); }} className="ci-action-btn delete" title="Supprimer">
                        <FiTrash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="ci-table-footer">
            Affichage de {filtered.length} CI{filtered.length > 1 ? 's' : ''}
          </div>
        )}
      </Card>

      {/* Modals Mounting */}
      {showCreate && (
        <CreateCiModal 
          environnements={environnements} 
          onClose={() => setShowCreate(false)} 
          onCreated={(newCi) => {
            fetchData();
            setToast({ msg: 'CI créé avec succès !', type: 'success' });
            setShowCreate(false);
          }} 
        />
      )}
      
      {editCi && (
        <EditCiModal 
          ci={editCi} 
          environnements={environnements} 
          onClose={() => setEditCi(null)} 
          onUpdated={(updatedCi) => {
            fetchData();
            setToast({ msg: 'CI mis à jour avec succès !', type: 'success' });
            setEditCi(null);
          }} 
        />
      )}
      
      {detailCi && (
        <DetailCiModal 
          ci={detailCi} 
          onClose={() => setDetailCi(null)} 
          onEdit={(ci) => { handleEditClick(ci); }}
          onDelete={(id, nom) => { handleDelete(id, nom); }}
        />
      )} 

      {/* Confirm Delete Modal */}
      {confirmDel && (
        <ConfirmModal
          title={confirmDel.title}
          message={confirmDel.message}
          danger={true}
          loading={loading}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmDel(null)}
        />
      )}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
};

export default CiManagement;
