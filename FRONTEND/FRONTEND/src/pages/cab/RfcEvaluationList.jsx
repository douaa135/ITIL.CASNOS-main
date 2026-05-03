import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiTarget, FiAlertCircle } from 'react-icons/fi';
import api from '../../api/axiosClient';
import './Dashboard.css'; // Reusing dashboard styles for layout, perhaps a specific css later if needed

const RfcEvaluationList = () => {
  const navigate = useNavigate();
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRfcs();
  }, []);

  const fetchRfcs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rfc');
      if (response.success) {
        // CAB members evaluate RFCs that are APPROVED (by manager) to become AUTHORIZED / CAB_REVIEW
        // Or in a standard ITIL flow, 'EN_ATTENTE_CAB' might be the status. 
        // Based on dashboard logic, it filters by 'APPROUVEE'
        const cabRfcs = (response.rfcs || []).filter(rfc => 
          rfc.statut?.code_statut === 'APPROUVEE' || 
          rfc.statut?.code_statut === 'EN_ATTENTE_CAB'
        );
        setRfcs(cabRfcs);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des RFCs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRfcs = rfcs.filter(rfc => 
    rfc.titre_rfc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    rfc.code_rfc?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="cab-dashboard">
      <div className="dashboard-header">
        <div>
          <h1>Évaluation des RFCs</h1>
          <p>Consultez et évaluez les changements à haut risque nécessitant l'expertise du CAB.</p>
        </div>
      </div>

      <div className="dashboard-card" style={{ marginTop: '2rem' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3><FiTarget /> RFCs en attente d'évaluation ({filteredRfcs.length})</h3>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
            <FiSearch style={{ color: '#94a3b8', marginRight: '0.5rem' }} />
            <input 
              type="text" 
              placeholder="Rechercher par code ou titre..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.9rem', width: '250px' }}
            />
          </div>
        </div>

        <div className="card-content">
          {loading ? (
             <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Chargement des données...</div>
          ) : filteredRfcs.length === 0 ? (
            <div className="empty-state">
              <FiAlertCircle size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
              <p>Aucune RFC en attente d'évaluation.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: '1rem' }}>Code RFC</th>
                    <th style={{ padding: '1rem' }}>Titre</th>
                    <th style={{ padding: '1rem' }}>Type</th>
                    <th style={{ padding: '1rem' }}>Priorité</th>
                    <th style={{ padding: '1rem' }}>Demandeur</th>
                    <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRfcs.map(rfc => (
                    <tr key={rfc.id_rfc} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '1rem', fontWeight: '600', color: '#1e293b' }}>#{rfc.code_rfc}</td>
                      <td style={{ padding: '1rem', color: '#334155' }}>
                        <div style={{ fontWeight: '500' }}>{rfc.titre_rfc}</div>
                        {rfc.date_creation && (
                          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.25rem' }}>
                            Créé le {new Date(rfc.date_creation).toLocaleDateString('fr-FR')}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', backgroundColor: '#e0e7ff', color: '#4f46e5' }}>
                          {rfc.type?.nom_type || 'Normal'}
                        </span>
                      </td>
                      <td style={{ padding: '1rem' }}>
                         <span className={`rfc-priority priority-${rfc.priorite?.toLowerCase()}`}>
                          {rfc.priorite}
                        </span>
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                        {rfc.demandeur?.prenom_user} {rfc.demandeur?.nom_user}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                         <button 
                            onClick={() => navigate(`/cab/rfcs/${rfc.id_rfc}/evaluate`)}
                            style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '8px', border: 'none', borderRadius: '6px', background: '#3b82f6', color: 'white', fontWeight: '500', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.background = '#2563eb'}
                            onMouseOut={(e) => e.currentTarget.style.background = '#3b82f6'}
                          >
                            <FiTarget /> Évaluer
                          </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RfcEvaluationList;
