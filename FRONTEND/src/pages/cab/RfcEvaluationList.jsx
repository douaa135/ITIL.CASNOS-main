import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTarget, FiArrowLeft, FiAlertCircle } from 'react-icons/fi';
import './Dashboard.css'; 

const RfcEvaluationList = () => {
  const navigate = useNavigate();

  return (
    <div className="cab-dashboard" style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
      
      <div style={{ marginBottom: '3rem', textAlign: 'left' }}>
          <button 
              onClick={() => navigate('/cab/meetings')}
              style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontWeight: '600' }}
          >
              <FiArrowLeft size={18} /> Retour aux Réunions
          </button>
      </div>

      <div className="dashboard-card" style={{ padding: '4rem 2rem', background: 'white', borderRadius: '32px', border: '1px solid #e2e8f0', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.05)' }}>
          <div style={{ background: '#fef2f2', color: '#ef4444', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem' }}>
              <FiAlertCircle size={48} />
          </div>
          
          <h2 style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0f172a', marginBottom: '1.5rem', letterSpacing: '-0.025em' }}>
              Évaluation des RFCs
          </h2>
          
          <p style={{ fontSize: '1.3rem', color: '#475569', fontWeight: '600', lineHeight: '1.6', maxWidth: '700px', margin: '0 auto 2.5rem' }}>
              Veuillez examiner l'impact et les risques avant de rendre une décision.
          </p>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '2.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                  Note : Les évaluations s'effectuent désormais directement depuis l'espace de réunion de votre comité.
              </p>
              <button 
                  onClick={() => navigate('/cab/meetings')}
                  style={{ background: '#2563eb', color: 'white', border: 'none', padding: '1.1rem 2.5rem', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '800', cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.3)' }}
              >
                  Accéder à l'Espace Réunions
              </button>
          </div>
      </div>

    </div>
  );
};

export default RfcEvaluationList;
