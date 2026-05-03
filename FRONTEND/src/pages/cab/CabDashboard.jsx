import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiUsers, FiCalendar, FiClock, FiFileText, FiTrendingUp,
  FiCheckCircle, FiXCircle, FiAlertTriangle, FiBarChart2,
  FiChevronRight, FiRefreshCw, FiShield, FiTarget, FiActivity,
  FiSearch, FiX, FiEdit2, FiTrash2
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import rfcService from '../../services/rfcService';
import './dashboard.css';

const CabDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalReunions: 0,
    rfcsEnAttente: 0,
    membresActifs: 0,
    decisionsRecentes: 0
  });
  const [upcomingMeetings, setUpcomingMeetings] = useState([]);
  const [pendingRfcs, setPendingRfcs] = useState([]);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cabs, setCabs] = useState([]);
  const [activeCab, setActiveCab] = useState(null);
  const [cabMembers, setCabMembers] = useState([]);
  const [allCabMembers, setAllCabMembers] = useState([]);
  const [changeManagers, setChangeManagers] = useState([]);
  const [selectedCabMemberIds, setSelectedCabMemberIds] = useState([]);
  const [selectedPresidentId, setSelectedPresidentId] = useState('');
  const [cabType, setCabType] = useState('STANDARD');
  const [cabName, setCabName] = useState('');
  const [createCabLoading, setCreateCabLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createCabError, setCreateCabError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Charger les statistiques générales
      const [cabsRes, rfcsRes, cabUsers, changeManagersRes] = await Promise.all([
        api.get('/cab'),
        api.get('/rfc'),
        rfcService.getUsersByRole('MEMBRE_CAB'),
        rfcService.getChangeManagers(),
      ]);

      const availableCabUsers = Array.isArray(cabUsers) ? cabUsers : [];
      const changeManagersList = Array.isArray(changeManagersRes) ? changeManagersRes : [];
      setAllCabMembers(availableCabUsers);
      setChangeManagers(changeManagersList);

      if (cabsRes.success) {
        const cabList = cabsRes.cabs || [];
        setCabs(cabList);

        if (cabList.length > 0) {
          const activeCabData = cabList[0];
          setActiveCab(activeCabData);

          // Charger les réunions du CAB
          const reunionsRes = await api.get(`/cab/${activeCabData.id_cab}/reunions`);
          if (reunionsRes.success) {
            const reunions = reunionsRes.reunions || [];
            setStats(prev => ({
              ...prev,
              totalReunions: reunions.length,
              membresActifs: availableCabUsers.length,
            }));

            // Réunions à venir (prochaines 30 jours)
            const now = new Date();
            const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
            const upcoming = reunions
              .filter(r => new Date(r.date_reunion) >= now && new Date(r.date_reunion) <= thirtyDaysFromNow)
              .sort((a, b) => new Date(a.date_reunion) - new Date(b.date_reunion))
              .slice(0, 5);
            setUpcomingMeetings(upcoming);
          }

          await fetchCabMembers(activeCabData.id_cab);
        } else {
          setStats(prev => ({ ...prev, membresActifs: availableCabUsers.length }));
        }
      } else {
        setCabs([]);
        setStats(prev => ({ ...prev, membresActifs: availableCabUsers.length }));
      }

      // RFCs approuvées en attente d'évaluation CAB
      if (rfcsRes.success) {
        const approvedRfcs = (rfcsRes.rfcs || []).filter(rfc =>
          rfc.statut?.code_statut === 'APPROUVEE'
        );
        setStats(prev => ({
          ...prev,
          rfcsEnAttente: approvedRfcs.length
        }));
      }

    } catch (error) {
      console.error('Erreur chargement dashboard CAB:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCabMembers = async (cabId) => {
    try {
      const res = await api.get(`/cab/${cabId}/membres`);
      if (res.success) {
        setCabMembers(res.membres || []);
      }
    } catch (err) {
      console.error('Fetch CAB members error:', err);
    }
  };

  const filteredCabMemberCandidates = allCabMembers.filter((user) => !selectedCabMemberIds.includes(user.id_user));

  const selectedMembers = allCabMembers.filter((user) => selectedCabMemberIds.includes(user.id_user));
  const currentPresident = cabMembers.find((member) => member.role === 'PRESIDENT');

  const handleToggleCabMember = (id_user) => {
    setSelectedCabMemberIds((prev) =>
      prev.includes(id_user) ? prev.filter((id) => id !== id_user) : [...prev, id_user]
    );
  };

  const addCabMember = async (cabId, userId, role = 'MEMBRE') => {
    try {
      await api.post(`/cab/${cabId}/membres`, { id_user: userId, role });
    } catch (err) {
      if (err.response?.status !== 409) throw err;
    }
  };

  const handleCreateCab = async () => {
    if (createCabLoading) return;
    if (!selectedPresidentId) {
      setCreateCabError('Veuillez choisir un président de type Change Manager.');
      return;
    }
    if (selectedCabMemberIds.length === 0) {
      setCreateCabError('Veuillez sélectionner au moins un membre CAB.');
      return;
    }

    setCreateCabError('');
    setCreateCabLoading(true);

    try {
      const result = await api.post('/cab', { type_cab: cabType, nom_cab: cabName });
      if (!result.success || !result.cab) {
        throw new Error(result.message || 'Impossible de créer le CAB.');
      }

      const newCab = result.cab;
      setCabs((prev) => [newCab, ...prev]);
      setActiveCab(newCab);

      const memberIds = selectedCabMemberIds.filter((id) => id !== selectedPresidentId);
      await addCabMember(newCab.id_cab, selectedPresidentId, 'PRESIDENT');
      await Promise.all(memberIds.map((id) => addCabMember(newCab.id_cab, id, 'MEMBRE')));

      await fetchCabMembers(newCab.id_cab);

      setSelectedCabMemberIds([]);
      setSelectedPresidentId('');
      setCabType('STANDARD');
      setCabName('');
      setShowCreateForm(false);
    } catch (err) {
      console.error('Erreur création CAB:', err);
      setCreateCabError(err.response?.data?.message || err.message || 'Erreur lors de la création du CAB.');
    } finally {
      setCreateCabLoading(false);
    }
  };

  const handleEditCab = (cab) => {
    alert('Modification de CAB non implémentée.');
  };

  const handleDeleteCab = async (cabId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce CAB ?')) return;
    try {
      await api.delete(`/cab/${cabId}`);
      setCabs(prev => prev.filter(c => c.id_cab !== cabId));
      if (activeCab?.id_cab === cabId) {
        setActiveCab(null);
        setCabMembers([]);
      }
    } catch (err) {
      console.error('Erreur suppression CAB:', err);
      alert('Erreur lors de la suppression du CAB.');
    }
  };

  const StatCard = ({ icon: Icon, title, value, subtitle, color = '#6366f1' }) => (
    <div className="stat-card" style={{ '--card-color': color }}>
      <div className="stat-icon">
        <Icon />
      </div>
      <div className="stat-content">
        <div className="stat-value">{value}</div>
        <div className="stat-title">{title}</div>
        {subtitle && <div className="stat-subtitle">{subtitle}</div>}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="cab-dashboard">
        <div className="dashboard-loading">
          <div className="loading-spinner" />
          <p>Chargement du tableau de bord CAB...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="cab-dashboard" style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>

      {/* Header */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiShield /></div>
          <div className="premium-header-text">
            <h1>Espace CAB</h1>
            <p>Vue d'ensemble des activités du Change Advisory Board</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button
            type="button"
            className="btn-create-premium"
            onClick={() => setShowCreateForm(true)}
          >
            <FiPlus /> Créer CAB
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content premium-glass-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', width: '90%' }}>
            <div className="modal-header" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(226, 232, 240, 0.3)', padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><FiShield style={{ color: '#6366f1' }}/> Créer un nouveau CAB</h2>
              <button className="close-modal-btn" onClick={() => setShowCreateForm(false)} style={{ background: 'transparent', border: 'none', fontSize: '1.25rem', color: '#64748b', cursor: 'pointer' }}><FiX /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', padding: '1.5rem' }}>
              <div className="cab-create-section">

                <div className="cab-form-group">
                  <label>Nom du CAB</label>
                  <input
                    type="text"
                    placeholder="Ex: CAB Hebdomadaire..."
                    value={cabName}
                    onChange={(e) => setCabName(e.target.value)}
                    className="premium-input"
                    style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }}
                  />
                </div>
                <div className="cab-form-group">
                  <label>Type de CAB</label>
                  <select className="premium-select" value={cabType} onChange={(e) => setCabType(e.target.value)} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }}>
                    <option value="STANDARD">Standard</option>
                    <option value="NORMAL">Normal</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="cab-form-group">
                  <label>Président (Change Manager)</label>
                  <select className="premium-select" value={selectedPresidentId} onChange={(e) => setSelectedPresidentId(e.target.value)} style={{ width: '100%', padding: '0.85rem 1rem', borderRadius: '10px', border: '1px solid #d1d5db', outline: 'none' }}>
                    <option value="">Sélectionner un président</option>
                    {changeManagers.map((user) => (
                      <option key={user.id_user} value={user.id_user}>
                        {user.prenom_user} {user.nom_user} — {user.email_user}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="cab-form-group">
                  <label>Profils CAB disponibles</label>
                  <div className="member-candidate-list premium-list-container" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '10px', padding: '8px', background: 'rgba(248, 250, 252, 0.6)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {filteredCabMemberCandidates.length === 0 ? (
                      <div className="empty-state" style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b' }}>
                        <FiSearch style={{ fontSize: '2rem', opacity: 0.5, marginBottom: '8px' }} />
                        <p style={{ margin: 0 }}>Aucun membre CAB disponible</p>
                      </div>
                    ) : (
                      filteredCabMemberCandidates.slice(0, 20).map((user) => (
                        <button
                          key={user.id_user}
                          type="button"
                          className="member-select-btn premium-hover"
                          onClick={() => handleToggleCabMember(user.id_user)}
                          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: '8px', border: '1px solid transparent', background: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseOver={(e) => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#eef2ff'; }}
                          onMouseOut={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'white'; }}
                        >
                          <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.prenom_user} {user.nom_user}</span>
                          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{user.email_user}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="cab-form-group">
                  <label>Membres sélectionnés ({selectedMembers.length})</label>
                  <div className="selected-member-list" style={{ minHeight: '60px', border: '1px dashed #cbd5e1', borderRadius: '10px', padding: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', background: 'white' }}>
                    {selectedMembers.length === 0 ? (
                      <div className="empty-state" style={{ width: '100%', textAlign: 'center', opacity: 0.7, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ margin: 0, fontSize: '0.85rem' }}>Aucun membre sélectionné</p>
                      </div>
                    ) : (
                      selectedMembers.map((user) => (
                        <div key={user.id_user} className="member-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#e0f2fe', color: '#0369a1', borderRadius: '999px', fontSize: '0.85rem', fontWeight: 600, border: '1px solid #bae6fd' }}>
                          <span>{user.prenom_user} {user.nom_user}</span>
                          <button type="button" onClick={() => handleToggleCabMember(user.id_user)} style={{ background: 'transparent', border: 'none', color: '#0284c7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.color = '#ef4444'} onMouseOut={(e) => e.currentTarget.style.color = '#0284c7'}>
                            <FiX />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {createCabError && <div className="form-error" style={{ color: '#ef4444', background: '#fef2f2', border: '1px solid #fecaca', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}><FiAlertTriangle /> {createCabError}</div>}
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: '1px solid #f1f5f9', padding: '1.25rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', background: '#fafbff', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px' }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowCreateForm(false)}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                onMouseOut={(e) => e.currentTarget.style.background = 'white'}
              >
                Annuler
              </button>
              <button
                type="button"
                className="btn-primary premium-button"
                onClick={handleCreateCab}
                disabled={createCabLoading}
                style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: '#6366f1', color: 'white', border: 'none', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s', opacity: createCabLoading ? 0.7 : 1 }}
                onMouseOver={(e) => !createCabLoading && (e.currentTarget.style.background = '#4f46e5')}
                onMouseOut={(e) => !createCabLoading && (e.currentTarget.style.background = '#6366f1')}
              >
                {createCabLoading ? 'Création en cours...' : <><FiCheckCircle /> Créer le CAB</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistiques principales */}
      <div className="stats-section">
        <h2><FiBarChart2 /> Métriques Clés</h2>
        <div className="stats-grid">
          <StatCard
            icon={FiCalendar}
            title="Réunions"
            value={stats.totalReunions}
            subtitle="Sessions planifiées"
            color="#6366f1"
          />
          <StatCard
            icon={FiFileText}
            title="RFCs en Attente"
            value={stats.rfcsEnAttente}
            subtitle="À évaluer"
            color="#f59e0b"
          />
          <StatCard
            icon={FiUsers}
            title="Membres Actifs"
            value={stats.membresActifs}
            subtitle="Comité CAB"
            color="#10b981"
          />
          <StatCard
            icon={FiCheckCircle}
            title="Décisions Récentes"
            value={stats.decisionsRecentes}
            subtitle="Ce mois"
            color="#8b5cf6"
          />
        </div>
      </div>

      {/* Table CAB */}
      <div className="cab-table-card dashboard-card">
        <div className="card-header">
          <h3><FiUsers /> CAB</h3>
        </div>
        <div className="card-content">
          {cabs.length === 0 ? (
            <div className="empty-state">
              <FiFileText />
              <p>Aucun CAB créé pour l'instant.</p>
            </div>
          ) : (
            <div className="cab-table-wrapper">
              <table className="cab-table">
                <thead>
                  <tr>
                    <th>Nom CAB</th>
                    <th>Code CAB</th>
                    <th>Type</th>
                    <th>Date de création</th>
                    <th>Membres</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {cabs.map((cab) => (
                    <tr key={cab.id_cab}>
                      <td>{cab.nom_cab || '--'}</td>
                      <td>{cab.code_metier}</td>
                      <td>{cab.type_cab}</td>
                      <td>{new Date(cab.date_creation).toLocaleDateString('fr-FR')}</td>
                      <td>{cab.membres?.length ?? '--'}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-icon-btn"
                            title="Modifier"
                            onClick={() => handleEditCab(cab)}
                          >
                            <FiEdit2 />
                          </button>
                          <button
                            className="action-icon-btn danger"
                            title="Supprimer"
                            onClick={() => handleDeleteCab(cab.id_cab)}
                          >
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
      </div>

      {/* Contenu principal en grille */}
      <div className="dashboard-main-grid">
        {/* Indicateurs de performance */}
        <div className="dashboard-card">
          <div className="card-header">
            <h3><FiTrendingUp /> Performance CAB</h3>
          </div>
          <div className="card-content">
            <div className="performance-indicators">
              <div className="indicator">
                <div className="indicator-label">Temps moyen d'évaluation</div>
                <div className="indicator-value">-- jours</div>
                <div className="indicator-trend neutral">À déterminer</div>
              </div>
              <div className="indicator">
                <div className="indicator-label">Taux d'approbation</div>
                <div className="indicator-value">-- %</div>
                <div className="indicator-trend neutral">À déterminer</div>
              </div>
              <div className="indicator">
                <div className="indicator-label">Participation moyenne</div>
                <div className="indicator-value">-- membres</div>
                <div className="indicator-trend neutral">À déterminer</div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CabDashboard;