import React, { useState, useEffect, useCallback } from 'react';
import {
  FiSearch, FiRefreshCw, FiPlus, FiEdit2, FiTrash2, FiDatabase,
  FiServer, FiGlobe, FiCpu, FiInfo, FiX
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import Card from '../../components/common/Card';

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
    if (!formData.nom_ci || !formData.type_ci) return alert('Nom et Type sont requis.');
    setLoading(true);
    try {
      const res = await api.post('/ci', formData);
      if (res.success) {
        onCreated(res.data.ci);
        onClose();
      } else alert(res.message);
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la création.');
    } finally {
      setLoading(false);
    }
  };

  const toggleEnv = (id) => {
    setFormData(prev => {
      const exists = prev.env_ids.includes(id);
      return {
        ...prev,
        env_ids: exists ? prev.env_ids.filter(e => e !== id) : [...prev.env_ids, id]
      };
    });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', width: '500px', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiDatabase /> Nouveau Configuration Item</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nom du CI <span style={{ color: 'red' }}>*</span></label>
            <input type="text" value={formData.nom_ci} onChange={e => setFormData({...formData, nom_ci: e.target.value})} style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }} required />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Type <span style={{ color: 'red' }}>*</span></label>
              <select value={formData.type_ci} onChange={e => setFormData({...formData, type_ci: e.target.value})} style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="Serveur">Serveur</option>
                <option value="Application">Application</option>
                <option value="Base de données">Base de données</option>
                <option value="Réseau">Réseau</option>
                <option value="Matériel">Matériel</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Version</label>
              <input type="text" value={formData.version_ci} onChange={e => setFormData({...formData, version_ci: e.target.value})} style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Lier aux Environnements</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {environnements.map(env => (
                <label key={env.id_env} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={formData.env_ids.includes(env.id_env)} onChange={() => toggleEnv(env.id_env)} />
                  {env.nom_env}
                </label>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Création...' : 'Créer CI'}
            </button>
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
    description: ci.description || ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.put(`/ci/${ci.id_ci}`, formData);
      if (res.success) {
        onUpdated(res.data.ci);
        onClose();
      } else alert(res.message);
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la modification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', width: '500px', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiEdit2 /> Modifier CI</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Nom du CI</label>
            <input type="text" value={formData.nom_ci} onChange={e => setFormData({...formData, nom_ci: e.target.value})} style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }} required />
          </div>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Type</label>
              <select value={formData.type_ci} onChange={e => setFormData({...formData, type_ci: e.target.value})} style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }}>
                <option value="Serveur">Serveur</option>
                <option value="Application">Application</option>
                <option value="Base de données">Base de données</option>
                <option value="Réseau">Réseau</option>
                <option value="Matériel">Matériel</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Version</label>
              <input type="text" value={formData.version_ci} onChange={e => setFormData({...formData, version_ci: e.target.value})} style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }} />
            </div>
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>Description</label>
            <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} rows="3" style={{ width: '100%', padding: '0.3rem', borderRadius: '6px', border: '1px solid #ccc' }}></textarea>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', background: '#e2e8f0', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
            <button type="submit" disabled={loading} style={{ padding: '0.5rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};



const DetailCiModal = ({ ci, onClose, onEdit, onDelete }) => {
  if (!ci) return null;

  const detailStyle = {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    padding: '1rem',
    background: '#f8fafc',
    borderRadius: '12px',
    border: '1px solid #e2e8f0'
  };

  const labelStyle = {
    fontSize: '0.75rem',
    color: '#64748b',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: '0.2rem'
  };

  const valueStyle = {
    fontSize: '0.95rem',
    color: '#0f172a',
    fontWeight: '600'
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ padding: '2rem', maxWidth: '600px', width: '100%', maxHeight: '90vh', overflowY: 'auto', position: 'relative', background: 'rgba(255, 255, 255, 0.72)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.4)', borderRadius: '20px', boxShadow: '0 25px 60px rgba(0,0,0,0.2)' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
          <FiX size={24} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem' }}>
          <div style={{
            width: '70px', height: '70px', borderRadius: '18px',
            background: '#eff6ff', color: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', border: '1px solid #bfdbfe'
          }}>
            {getCiIcon(ci.type_ci)}
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>{ci.nom_ci}</h2>
            <div style={{ marginTop: '0.4rem', fontSize: '0.85rem', color: '#64748b', fontWeight: '600' }}>#{ci.code_metier}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={detailStyle}>
            <div style={labelStyle}>Type d'équipement</div>
            <div style={valueStyle}>{ci.type_ci}</div>
          </div>
          <div style={detailStyle}>
            <div style={labelStyle}>Version</div>
            <div style={valueStyle}>{ci.version_ci || 'N/A'}</div>
          </div>
        </div>

        <div style={{ ...detailStyle, marginBottom: '1rem' }}>
          <div style={labelStyle}>Description</div>
          <div style={{ fontSize: '0.85rem', color: '#334155', lineHeight: '1.5' }}>
            {ci.description || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Aucune description fournie.</span>}
          </div>
        </div>

        <div style={{ ...detailStyle, marginBottom: '2rem' }}>
          <div style={labelStyle}>Environnements Liés</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '0.5rem' }}>
            {ci.ciEnvs?.length > 0 ? ci.ciEnvs.map(e => (
              <span key={e.environnement.id_env} style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.4rem 0.8rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: '700' }}>
                {e.environnement.nom_env}
              </span>
            )) : <span style={{ color: '#cbd5e1', fontSize: '0.85rem', fontStyle: 'italic' }}>Aucun environnement</span>}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
           <button onClick={() => { onClose(); onDelete(ci.id_ci, ci.nom_ci); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontWeight: '700' }}>
              <FiTrash2 size={16} /> Supprimer
           </button>
           <button onClick={() => { onClose(); onEdit(ci); }} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.25rem', borderRadius: '10px', border: 'none', background: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '700' }}>
              <FiEdit2 size={16} /> Modifier
           </button>
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

  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [filterEnv, setFilterEnv] = useState('ALL');

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editCi, setEditCi] = useState(null);
  const [detailCi, setDetailCi] = useState(null);
  
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [ciRes, envRes] = await Promise.all([
        api.get('/ci'),
        api.get('/environnements')
      ]);
      if (ciRes.success) setCis(ciRes.data.cis || ciRes.data.data || []);
      if (envRes.success) setEnvironnements(envRes.data.environnements || envRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (id, nom) => {
    if (!window.confirm(`Supprimer définitivement le CI "${nom}" ?`)) return;
    try {
      const res = await api.delete(`/ci/${id}`);
      if (res.success) {
        setCis(prev => prev.filter(c => c.id_ci !== id));
      } else {
        alert(res.message);
      }
    } catch (err) {
      alert(err?.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const handleViewClick = async (ci) => {
    try {
      const res = await api.get(`/ci/${ci.id_ci}`);
      if (res.success) {
        setDetailCi(res.data.ci);
      }
    } catch (e) {
      alert('Erreur lors du chargement des détails du CI.');
    }
  };

  const handleEditClick = async (ci) => {
    try {
      const res = await api.get(`/ci/${ci.id_ci}`);
      if (res.success) {
        setEditCi(res.data.ci);
      }
    } catch (e) {
      alert('Erreur lors du chargement des détails du CI.');
    }
  };

  const filtered = cis.filter(ci => {
    const matchSearch = !search || ci.nom_ci?.toLowerCase().includes(search.toLowerCase()) || ci.code_metier?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === 'ALL' || ci.type_ci === filterType;
    const matchEnv = filterEnv === 'ALL' || ci.ciEnvs?.some(e => e.environnement?.id_env === filterEnv);
    return matchSearch && matchType && matchEnv;
  });

  const uniqueTypes = [...new Set(cis.map(c => c.type_ci))].filter(Boolean);

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <FiDatabase color="#3b82f6" /> Référentiel CIs
          </h1>
          <p style={{ color: '#64748b', margin: '0.25rem 0 0' }}>Gérez vos éléments de configuration (Serveurs, Applications, Réseau, etc.)</p>
        </div>
        <button 
          onClick={() => setShowCreate(true)}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#3b82f6', color: 'white', border: 'none', padding: '0.75rem 1.25rem', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)' }}
        >
          <FiPlus /> Nouveau CI
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'white', padding: '1rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou code..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem' }}
          />
        </div>
        <select value={filterType} onChange={e => setFilterType(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155', outline: 'none' }}>
          <option value="ALL">Tous les types</option>
          {uniqueTypes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filterEnv} onChange={e => setFilterEnv(e.target.value)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#334155', outline: 'none', maxWidth: '250px' }}>
          <option value="ALL">Tous les environnements</option>
          {environnements.map(env => <option key={env.id_env} value={env.id_env}>{env.nom_env}</option>)}
        </select>
        <button onClick={fetchData} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer', color: '#64748b' }} title="Rafraîchir">
          <FiRefreshCw />
        </button>
      </div>

      {/* Table */}
      <Card style={{ padding: 0, overflow: 'hidden', border: '1px solid #e2e8f0', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>CI & Code</th>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type</th>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Version</th>
                <th style={{ padding: '0.2rem 0.3rem', textAlign: 'left', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Environnements</th>
                <th style={{ padding: '0.2rem 0.3rem', fontSize: '0.65rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>Chargement des CIs...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                    <FiDatabase size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
                    Aucun CI trouvé.
                  </td>
                </tr>
              ) : filtered.map((ci, index) => (
                <tr key={ci.id_ci} onClick={(e) => { e.stopPropagation(); handleViewClick(ci); }} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', background: index % 2 === 0 ? 'white' : '#fafbfc', transition: 'background 0.2s' }} className="hover-row">
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.8rem' }}>{ci.nom_ci}</div>
                    <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>#{ci.code_metier}</div>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#f1f5f9', padding: '0.25rem 0.6rem', borderRadius: '99px', fontSize: '0.65rem', color: '#475569', fontWeight: '600' }}>
                      {getCiIcon(ci.type_ci)} {ci.type_ci}
                    </span>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem', fontSize: '0.75rem', color: '#334155' }}>
                    {ci.version_ci || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>N/A</span>}
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem' }}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {ci.ciEnvs?.length > 0 ? ci.ciEnvs.map(e => (
                        <span key={e.environnement.id_env} style={{ background: '#e0e7ff', color: '#3730a3', padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: '600' }}>
                          {e.environnement.nom_env}
                        </span>
                      )) : <span style={{ color: '#cbd5e1', fontSize: '0.8rem', fontStyle: 'italic' }}>Aucun</span>}
                    </div>
                  </td>
                  <td style={{ padding: '0.2rem 0.3rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button onClick={(e) => { e.stopPropagation(); handleViewClick(ci); }} style={{ background: '#f1f5f9', color: '#10b981', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Détails">
                        <FiInfo size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleEditClick(ci); }} style={{ background: '#f1f5f9', color: '#3b82f6', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Modifier">
                        <FiEdit2 size={16} />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(ci.id_ci, ci.nom_ci); }} style={{ background: '#fef2f2', color: '#ef4444', border: 'none', padding: '0.3rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Supprimer">
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
          <div style={{ padding: '0.2rem 0.3rem', background: '#f8fafc', borderTop: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#64748b' }}>
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
            fetchData(); // Refetch to get complete nested data
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

    </div>
  );
};

export default CiManagement;
