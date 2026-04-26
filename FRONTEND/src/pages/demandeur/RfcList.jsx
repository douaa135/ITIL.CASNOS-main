import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import { FiPlus, FiFilter, FiSearch, FiMoreVertical, FiCheckSquare, FiEye, FiFileText, FiCheckCircle, FiXCircle, FiRotateCcw, FiEdit2 } from 'react-icons/fi';
import './RfcList.css';

import api from '../../api/axios';

const RfcList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    const fetchAllRfcs = async () => {
      try {
        setLoading(true);
        const data = await api.get('/rfc');
        if (data.success && data.data?.rfcs) {
          const mapped = data.data.rfcs.map(r => ({
            id_rfc: r.code_rfc || r.id_rfc,
            db_id: r.id_rfc,
            titre: r.titre_rfc,
            priorite: { niveau: r.priorite?.code_priorite || 'P2' },
            statut: { 
              code: r.statut?.code_statut || 'BROUILLON', 
              libelle: r.statut?.libelle || 'Brouillon' 
            },
            demandeur: r.demandeur ? `${r.demandeur.prenom_user} ${r.demandeur.nom_user}` : 'N/A',
            date_creation: new Date(r.date_creation).toLocaleDateString('fr-FR'),
            rollbackPlan: !!r.evaluationRisque // Approximation
          }));
          setRfcs(mapped);
        }
      } catch (err) {
        console.error('All RFCs load error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllRfcs();
  }, []);
  
  const filteredRfcs = rfcs.filter(rfc => {
    const matchesSearch = (rfc.titre?.toLowerCase() || '').includes(searchTerm.toLowerCase()) || (rfc.id_rfc?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? rfc.statut?.code === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const s = typeof status === 'object' ? status.code : status;
    switch (s) {
      case 'APPROUVEE':      return <Badge status="success">Approuvée</Badge>;
      case 'BROUILLON':      return <Badge status="info">Brouillon</Badge>;
      case 'SOUMIS':         return <Badge status="warning">Soumise</Badge>;
      case 'EVALUEE':        return <Badge status="warning">Évaluée</Badge>;
      case 'CLOTUREE':       return <Badge status="success">Clôturée</Badge>;
      case 'REJETEE':        return <Badge status="danger">Rejetée</Badge>;
      default: return <Badge>{s}</Badge>;
    }
  };

  // KPIs
  const totalRfcs = rfcs.length;
  const nbApprouves = rfcs.filter(r => ['APPROUVEE', 'CLOTUREE'].includes(r.statut?.code)).length;
  const nbRejetes = rfcs.filter(r => r.statut?.code === 'REJETEE').length;
  const nbEnCours = rfcs.filter(r => ['SOUMIS', 'EVALUEE'].includes(r.statut?.code)).length;
  const nbRollback = 0; // Temporaire
  // Rollback = RFCs rejetées qui ont un rollbackPlan renseigné (estimation)
  if (loading) return <div style={{ padding: '4rem', textAlign: 'center' }}>Chargement de la liste...</div>;

  return (
    <div className="rfc-list-page">

      {/* Page Title */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#0f172a', margin: '0 0 0.25rem 0' }}>Liste RFC</h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>Toutes les demandes de changement soumises dans le système.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.75rem' }}>
        <div className="kpi-card-interactive" style={{ background: 'white', border: '1px solid #e2e8f0', borderLeft: '4px solid #3b82f6', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#eff6ff', borderRadius: '50%', padding: '0.75rem', color: '#3b82f6' }}><FiFileText size={20} /></div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Total RFC</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{totalRfcs}</div>
          </div>
        </div>
        <div className="kpi-card-interactive" style={{ background: 'white', border: '1px solid #e2e8f0', borderLeft: '4px solid #f59e0b', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fffbeb', borderRadius: '50%', padding: '0.75rem', color: '#f59e0b' }}><FiFilter size={20} /></div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>En cours</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{nbEnCours}</div>
          </div>
        </div>
        <div className="kpi-card-interactive" style={{ background: 'white', border: '1px solid #e2e8f0', borderLeft: '4px solid #10b981', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#ecfdf5', borderRadius: '50%', padding: '0.75rem', color: '#10b981' }}><FiCheckCircle size={20} /></div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Approuvées</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>{nbApprouves}</div>
          </div>
        </div>
        <div className="kpi-card-interactive" style={{ background: 'white', border: '1px solid #e2e8f0', borderLeft: '4px solid #ef4444', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fef2f2', borderRadius: '50%', padding: '0.75rem', color: '#ef4444' }}><FiXCircle size={20} /></div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rejetées</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ef4444', lineHeight: 1 }}>{nbRejetes}</div>
          </div>
        </div>
        <div className="kpi-card-interactive" style={{ background: 'white', border: '1px solid #e2e8f0', borderLeft: '4px solid #ea580c', borderRadius: '0.75rem', padding: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <div style={{ background: '#fff7ed', borderRadius: '50%', padding: '0.75rem', color: '#ea580c' }}><FiRotateCcw size={20} /></div>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Rollbacks</div>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#ea580c', lineHeight: 1 }}>{nbRollback}</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>Plan de retour arrière</div>
          </div>
        </div>
      </div>
      <div className="page-header-actions">
        <div className="search-bar">
          <FiSearch className="search-icon" />
          <input 
            type="text" 
            placeholder="Search RFCs by ID or Title..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="action-buttons" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <select 
            style={{ padding: '0.5rem 0.875rem', border: '1.5px solid var(--border-color)', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-family)', fontSize: '0.875rem', color: 'var(--text-main)', background: 'var(--surface-color)', outline: 'none', cursor: 'pointer' }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            <option value="BROUILLON">Brouillon</option>
            <option value="SOUMIS">Soumise</option>
            <option value="EVALUEE">Évaluée</option>
            <option value="APPROUVEE">Approuvée</option>
            <option value="REJETEE">Rejetée</option>
            <option value="CLOTUREE">Clôturée</option>
          </select>
          {user?.role !== 'CHANGE_MANAGER' && (
            <Button variant="primary" icon={<FiPlus />} onClick={() => navigate('/rfcs/new')}>Créer RFC</Button>
          )}
        </div>
      </div>

      <Card className="table-card">
        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID RFC</th>
                <th>Titre</th>
                <th>Demandeur</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRfcs.map((rfc) => (
                <tr key={rfc.id_rfc}>
                  <td className="font-medium text-main">{rfc.id_rfc}</td>
                  <td style={{ fontWeight: 600 }}>{rfc.titre}</td>
                  <td style={{ fontSize: '0.85rem' }}>{rfc.demandeur}</td>
                  <td>{getStatusBadge(rfc.statut?.code || rfc.statut)}</td>
                  <td>{rfc.date_creation || rfc.date || ''}</td>
                  <td>
                    {user?.role === 'CHANGE_MANAGER' ? (
                      <Button 
                        variant="primary" 
                        icon={rfc.statut?.code === 'SOUMIS' ? <FiCheckSquare /> : <FiEye />} 
                        onClick={() => navigate(`/rfcs/${rfc.id_rfc}/review`)}
                      >
                        {rfc.statut?.code === 'SOUMIS' ? 'Évaluer' : 'Consulter'}
                      </Button>
                    ) : (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="icon-btn" title="Consulter" onClick={() => navigate(`/rfcs/${rfc.id_rfc}`)}>
                          <FiEye />
                        </button>
                        {rfc.statut?.code === 'BROUILLON' && (
                          <button 
                            className="icon-btn" 
                            title="Modifier" 
                            style={{ color: '#f59e0b' }}
                            onClick={() => navigate('/rfcs/new', { state: { edit: true, rfcData: rfc } })}
                          >
                            <FiEdit2 />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default RfcList;
