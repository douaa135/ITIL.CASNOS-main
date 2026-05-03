import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  FiPlus, FiFileText, FiCheckCircle, FiXCircle, 
  FiActivity, FiList, FiClock, FiEye, FiArrowRight,
  FiZap, FiInfo, FiUser, FiSend
} from 'react-icons/fi';
import Card from '../../components/common/Card';
import Badge from '../../components/common/Badge';
import api from '../../api/axiosClient';

const DemandeurDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfcs, setRfcs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (!user?.id_user) return;
        const res = await api.get('/rfc', { params: { id_user: user.id_user } });
        if (res.success) {
          setRfcs(res.data?.rfcs || []);
        }
      } catch (err) {
        console.error('Dash load error:', err);
      } finally {
        setLoading(false);
      }
    };
    if (user?.id_user) fetchData();
  }, [user?.id_user]);

  const prenom = user?.prenom_user || 'Utilisateur';
  
  // BPMN-aligned categorization
  const total      = rfcs.length;
  const soumises   = rfcs.filter(r => r.statut?.code_statut === 'SOUMIS').length;
  const inProgress = rfcs.filter(r => ['BROUILLON', 'A_COMPLETER', 'ACCEPTEE_SD', 'EVALUEE'].includes(r.statut?.code_statut)).length;
  const finalized  = rfcs.filter(r => ['APPROUVEE', 'CLOTUREE', 'REJETEE'].includes(r.statut?.code_statut)).length;

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: '#64748b' }}><span className="spinner" /> Chargement du flux BPMN...</div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Hero Banner — Premium Gradient */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiUser /></div>
          <div className="premium-header-text">
            <h1>Bonjour, {prenom} 👋</h1>
            <p>Suivi en temps réel de vos demandes de changement.</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button 
            onClick={() => navigate('/rfcs/new', { state: { edit: false, rfcData: null } })}
            className="btn-create-premium"
          >
            <FiPlus /> Nouveau RFC
          </button>
        </div>
      </div>

      {/* BPMN Pipeline KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '3rem' }}>
        {[
          { label: 'Total Demandes', val: total, icon: <FiList />, color: '#1e40af', bg: '#eff6ff' },
          { label: 'Soumises', val: soumises, icon: <FiSend />, color: '#f59e0b', bg: '#fffbeb' },
          { label: "En Cours", val: inProgress, icon: <FiActivity />, color: '#3b82f6', bg: '#eff6ff' },
          { label: 'Traitées', val: finalized, icon: <FiCheckCircle />, color: '#10b981', bg: '#f0fdf4' }
        ].map((kpi, idx) => (
          <div 
            key={idx}
            style={{ 
              background: 'white', padding: '1.25rem', borderRadius: '1.25rem', 
              border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', 
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              userSelect: 'none'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0,0,0,0.1)';
              e.currentTarget.style.borderColor = kpi.color;
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.95) translateY(-5px)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1) translateY(-5px)'}
          >
            <div style={{ width: '48px', height: '48px', background: kpi.bg, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem', color: kpi.color }}>
              {kpi.icon}
            </div>
            <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, color: '#1e293b' }}>{kpi.val}</h2>
            <p style={{ margin: '0.25rem 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Content Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem' }}>
        {/* Recent RFCs - Premium Table Style */}
        <Card style={{ padding: '2rem', borderRadius: '1.25rem', background: 'white', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#1e293b' }}>
              <FiFileText color="#1e40af" /> Activités récentes
            </h3>
            <button onClick={() => navigate('/mes-rfcs')} style={{ background: 'transparent', border: 'none', color: '#1e40af', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>Voir tout</button>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {rfcs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0' }}>
                <FiFileText size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                <p style={{ color: '#94a3b8', fontSize: '1rem' }}>Aucune demande pour le moment.</p>
              </div>
            ) : (
              rfcs.slice(0, 6).map(rfc => (
                <div 
                  key={rfc.id_rfc} 
                  onClick={() => navigate(`/rfcs/${rfc.id_rfc}`)}
                  style={{ 
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                    padding: '1.25rem', border: '1px solid #f1f5f9', borderRadius: '1rem',
                    cursor: 'pointer', transition: 'all 0.2s',
                    background: rfc.statut?.code_statut === 'A_COMPLETER' ? '#fffbeb' : '#f8fafc'
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = '#cbd5e1'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = '#f1f5f9'}
                >
                  <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                    <div style={{ 
                        width: '40px', height: '40px', borderRadius: '10px', 
                        background: rfc.statut?.code_statut === 'APPROUVEE' ? '#dcfce7' : '#dbeafe',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: rfc.statut?.code_statut === 'APPROUVEE' ? '#166534' : '#1e40af'
                    }}>
                        <FiZap />
                    </div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#1e40af', textTransform: 'uppercase' }}>
                        {rfc.code_rfc || rfc.id_rfc?.slice(0, 8)}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#334155', marginTop: '0.1rem' }}>
                        {rfc.titre_rfc}
                      </div>
                    </div>
                  </div>
                  <Badge status={
                    rfc.statut?.code_statut === 'APPROUVEE' || rfc.statut?.code_statut === 'CLOTUREE' ? 'success' : 
                    rfc.statut?.code_statut === 'REJETEE' ? 'danger' : 
                    rfc.statut?.code_statut === 'A_COMPLETER' ? 'warning' : 'primary'
                  }>
                    {rfc.statut?.libelle || 'En cours'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Quick Actions & Help */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <Card style={{ padding: '2rem', borderRadius: '1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>Guide du Workflow</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {[
                    { step: '1', label: 'Soumission', desc: 'Créez votre demande avec les justificatifs.', color: '#3b82f6' },
                    { step: '2', label: 'Triage (SD)', desc: 'Le Service Desk vérifie les prérequis.', color: '#8b5cf6' },
                    { step: '3', label: 'Évaluation (CM)', desc: 'Analyse technique et planification.', color: '#f59e0b' },
                    { step: '4', label: 'Décision (CAB)', desc: 'Validation finale pour mise en œuvre.', color: '#10b981' },
                ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: '1rem' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: item.color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800, flexShrink: 0 }}>
                            {item.step}
                        </div>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#334155' }}>{item.label}</div>
                            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.desc}</div>
                        </div>
                    </div>
                ))}
            </div>
            </Card>

            <Card style={{ padding: '2rem', borderRadius: '1.25rem', background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                <FiInfo size={32} color="#1e40af" style={{ marginBottom: '1rem' }} />
                <h4 style={{ margin: '0 0 0.5rem', fontWeight: 700 }}>Besoin d'aide ?</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 1.5rem' }}>Consultez la base de connaissances ITIL ou contactez le support.</p>
                <button 
                  onClick={() => navigate('/profile')}
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '0.75rem', border: '1px solid #1e40af', background: 'transparent', color: '#1e40af', fontWeight: 700, cursor: 'pointer' }}
                >
                    Mon Compte
                </button>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default DemandeurDashboard;
