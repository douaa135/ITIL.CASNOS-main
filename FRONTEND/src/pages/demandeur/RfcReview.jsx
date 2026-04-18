import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import { 
  FiArrowLeft, FiAlertTriangle, FiCheckCircle, FiXCircle, 
  FiUsers, FiFileText, FiRotateCcw, FiShield, FiClock, FiAlertCircle
} from 'react-icons/fi';

import api from '../../api/axios';

const RfcReview = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rfc, setRfc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recommendation, setRecommendation] = useState('');
  const [cabDate, setCabDate] = useState('');

  // Rollback state
  const [rollbackText, setRollbackText] = useState('');
  const [rollbackResponsible, setRollbackResponsible] = useState('');
  const [rollbackDuration, setRollbackDuration] = useState('');
  const [rollbackActivated, setRollbackActivated] = useState(false);
  const [rollbackSaved, setRollbackSaved] = useState(false);

  useEffect(() => {
    const fetchRfc = async () => {
      try {
        setLoading(true);
        const data = await api.get(`/rfc/${id}`);
        if (data.success) {
          const r = data.rfc;
          setRfc(r);
          // Pré-remplir les champs si existants
          if (r.evaluationRisque?.plan_rollback) setRollbackText(r.evaluationRisque.plan_rollback);
          if (r.commentaires?.length > 0) {
            const lastManagerComment = r.commentaires.find(c => c.auteur?.roles?.includes('CHANGE_MANAGER'));
            if (lastManagerComment) setRecommendation(lastManagerComment.contenu);
          }
        }
      } catch (err) {
        console.error('Fetch RFC error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRfc();
  }, [id]);

  const updateRfcStatus = async (newStatusCode) => {
    if (!rfc) return;
    try {
      // Pour être plus simple, on passe directement le code attendu par le backend ITIL
      // 'EN_ATTENTE_CAB', 'APPROUVEE', 'REJETEE'
      const code = newStatusCode === 'APPROUVE' ? 'APPROUVEE' : (newStatusCode === 'REJETE' ? 'REJETEE' : 'EN_ATTENTE_CAB');
      
      const response = await api.patch(`/rfc/${rfc.id_rfc}/status`, {
        code_statut: code,
        commentaire: recommendation,
        cab_date: cabDate,
        // Ces IDs devraient idéalement venir de la session ou du contexte
        id_change_manager: user?.id_user, 
        id_env: 1 // Production par défaut pour le moment ou à choisir
      });
      
      if (response.success) {
        navigate('/rfcs');
      }
    } catch (err) {
      console.error('Status update error:', err);
      alert('Erreur lors de la mise à jour du statut.');
    }
  };

  const saveRollbackPlan = (activate = false) => {
    if (!rfc || !rollbackText.trim()) return;
    // Simulate saving rollback plan to backend
    setRollbackSaved(true);
    if (activate) setRollbackActivated(true);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'APPROUVE':       return <Badge status="success">Approuvé</Badge>;
      case 'NOUVEAU':        return <Badge status="info">Nouveau</Badge>;
      case 'EN_ATTENTE_CAB': return <Badge status="warning">Attente CAB</Badge>;
      case 'REJETE':         return <Badge status="danger">Rejeté</Badge>;
      default:               return <Badge>{status}</Badge>;
    }
  };

  if (!rfc) return <div style={{ padding: '2rem' }}>Chargement ou RFC non trouvée...</div>;

  const currentStatus = rfc.statut?.code || rfc.status;
  const isRejected = currentStatus === 'REJETE';

  // ── Styles ──────────────────────────────────────────────────────────────────
  const s = {
    label: { fontSize: '0.85rem', color: '#475569', fontWeight: '600', marginBottom: '0.3rem', display: 'block' },
    input: { width: '100%', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0', fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' },
    row: { display: 'flex', gap: '0.75rem' },
  };

  return (
    <div className="rfc-review-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button className="icon-btn" onClick={() => navigate('/rfcs')}>
          <FiArrowLeft />
        </button>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'var(--text-main)', margin: '0' }}>
            Évaluation de {rfc.id_rfc || rfc.id}
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0 0' }}>Supervision et validation par le Change Manager</p>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          {getStatusBadge(currentStatus)}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '1.5rem' }}>

        {/* ── COLONNE GAUCHE ─────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Détails RFC */}
          <Card>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Détails de la demande</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Titre de la RFC</p>
                <p style={{ fontWeight: '500' }}>{rfc.titre || rfc.title}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Date de création</p>
                <p style={{ fontWeight: '500' }}>{rfc.date_creation || rfc.date}</p>
              </div>
              <div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Demandeur</p>
                <p style={{ fontWeight: '500' }}>Mohamed Isser (Simulé)</p>
              </div>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Description du changement</p>
              <div style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                {rfc.description_rfc || rfc.description || "Aucune description détaillée n'a été fournie pour cette demande."}
              </div>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '0.5rem' }}>Pièces Jointes Soumises</p>
              {rfc.fichiers && rfc.fichiers.length > 0 ? (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {rfc.fichiers.map((file, idx) => (
                    <div key={idx} style={{ padding: '0.25rem 0.75rem', background: '#eff6ff', color: '#1d4ed8', borderRadius: '1rem', fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                      <FiFileText /> {file.name}
                    </div>
                  ))}
                </div>
              ) : (
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Aucun document technique joint</span>
              )}
            </div>
          </Card>

          {/* ── PLAN DE ROLLBACK ──────────────────────────────────────────────── */}
          <Card style={{ border: rollbackActivated ? '2px solid #ea580c' : '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h2 style={{ fontSize: '1.1rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: rollbackActivated ? '#ea580c' : '#1e293b' }}>
                <FiRotateCcw color={rollbackActivated ? '#ea580c' : '#64748b'} />
                Plan de Retour Arrière (Rollback)
              </h2>
              {rollbackActivated && (
                <span style={{ background: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.7rem', borderRadius: '1rem' }}>
                  🔴 ROLLBACK ACTIVÉ
                </span>
              )}
              {rollbackSaved && !rollbackActivated && (
                <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.7rem', borderRadius: '1rem' }}>
                  ✓ Plan enregistré
                </span>
              )}
            </div>

            {/* Rollback already active: display read-only */}
            {rollbackActivated ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '0.5rem', padding: '1rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#9a3412', fontWeight: 700, textTransform: 'uppercase' }}>Procédure de rollback</p>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: '#431407', whiteSpace: 'pre-wrap' }}>{rollbackText}</p>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>RESPONSABLE</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{rollbackResponsible || 'Non défini'}</p>
                  </div>
                  <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #e2e8f0' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>DURÉE ESTIMÉE</p>
                    <p style={{ margin: 0, fontWeight: 700, color: '#0f172a' }}>{rollbackDuration || 'Non définie'}</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Editable form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
                <div>
                  <label style={s.label}>Procédure de rollback *</label>
                  <textarea
                    rows="4"
                    style={{ ...s.input, resize: 'vertical' }}
                    value={rollbackText}
                    onChange={e => setRollbackText(e.target.value)}
                    placeholder="Ex: 1. Stopper le service X.&#10;2. Restaurer le snapshot VM du 2024-04-20.&#10;3. Relancer les services dépendants.&#10;4. Valider la connectivité..."
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={s.label}>Responsable du rollback</label>
                    <input
                      style={s.input}
                      value={rollbackResponsible}
                      onChange={e => setRollbackResponsible(e.target.value)}
                      placeholder="Ex: Équipe infrastructure, M. Benali"
                    />
                  </div>
                  <div>
                    <label style={s.label}>Durée estimée du rollback</label>
                    <input
                      style={s.input}
                      value={rollbackDuration}
                      onChange={e => setRollbackDuration(e.target.value)}
                      placeholder="Ex: 2 heures, 30 minutes"
                    />
                  </div>
                </div>

                {/* Existing plan from requester (read-only display) */}
                {rfc.rollbackPlan && !rollbackText && (
                  <div style={{ background: '#f1f5f9', border: '1px dashed #94a3b8', borderRadius: '0.5rem', padding: '0.75rem' }}>
                    <p style={{ margin: '0 0 0.25rem 0', fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>PLAN SOUMIS PAR LE DEMANDEUR</p>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#334155', fontStyle: 'italic' }}>{rfc.rollbackPlan}</p>
                    <button
                      style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.8rem', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      onClick={() => setRollbackText(rfc.rollbackPlan)}
                    >
                      Utiliser ce plan comme base →
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                  <button
                    onClick={() => saveRollbackPlan(false)}
                    disabled={!rollbackText.trim()}
                    style={{ flex: 1, padding: '0.6rem', background: rollbackText.trim() ? '#f8fafc' : '#f1f5f9', border: `1px solid ${rollbackText.trim() ? '#cbd5e1' : '#e2e8f0'}`, borderRadius: '0.5rem', cursor: rollbackText.trim() ? 'pointer' : 'not-allowed', color: '#475569', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <FiShield size={15} /> Enregistrer le plan
                  </button>
                  <button
                    onClick={() => saveRollbackPlan(true)}
                    disabled={!rollbackText.trim() || isRejected === false}
                    style={{ flex: 1, padding: '0.6rem', background: rollbackText.trim() ? '#fff7ed' : '#f1f5f9', border: `1px solid ${rollbackText.trim() ? '#fed7aa' : '#e2e8f0'}`, borderRadius: '0.5rem', cursor: rollbackText.trim() ? 'pointer' : 'not-allowed', color: '#ea580c', fontWeight: 700, fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                  >
                    <FiRotateCcw size={15} /> Activer le Rollback
                  </button>
                </div>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'center' }}>
                  ⚠️ "Activer le Rollback" déclenche la procédure de retour arrière immédiate.
                </p>
              </div>
            )}
          </Card>

        </div>

        {/* ── COLONNE DROITE (Panneau Manager) ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Évaluation Risques */}
          <Card style={{ background: 'var(--surface-color)', border: '2px solid #e2e8f0' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#334155' }}>
              <FiAlertTriangle color="#f59e0b" /> Évaluation des Risques (CMDB)
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Métrique d'Impact</span>
                <strong style={{ color: rfc.type === 'URGENT' || rfc.type === 'NORMAL' ? '#b91c1c' : '#047857' }}>
                  {rfc.type === 'URGENT' ? 'CATASTROPHIQUE (9/10)' : rfc.type === 'NORMAL' ? 'ÉLEVÉ (7/10)' : 'MINEUR (2/10)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Services Affectés</span>
                <strong>{rfc.type === 'URGENT' ? 'Portail Assurés, Oracle' : 'Interface Web Externe'}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Temps d'arrêt estimé</span>
                <strong>{rfc.duration || '2'} Heures</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-muted)' }}>Plan Rollback</span>
                <span style={{ fontSize: '0.8rem', padding: '0.2rem 0.6rem', borderRadius: '1rem', background: rollbackSaved ? '#fff7ed' : '#f1f5f9', color: rollbackSaved ? '#ea580c' : '#94a3b8', fontWeight: 600 }}>
                  {rollbackActivated ? '🔴 Activé' : rollbackSaved ? '✓ Prêt' : '○ Non défini'}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions Manager */}
          <Card style={{ background: '#f8fafc', border: '1px solid #cbd5e1' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1.25rem', color: '#1e293b' }}>Actions du Manager</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Commentaire Technique <span style={{ color: '#ef4444' }}>*</span></label>
                <textarea 
                  rows="3" 
                  value={recommendation}
                  onChange={(e) => setRecommendation(e.target.value)}
                  placeholder="Justifiez votre décision technique ou donnez des recommandations (backup, impact, tests...)"
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem', resize: 'vertical', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontSize: '0.85rem', color: '#475569', fontWeight: '500' }}>Date Réunion CAB (Si applicable)</label>
                <input 
                  type="date"
                  value={cabDate}
                  onChange={(e) => setCabDate(e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', fontSize: '0.9rem' }}
                />
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0.5rem 0' }} />

              <Button 
                onClick={() => updateRfcStatus('EN_ATTENTE_CAB')}
                style={{ width: '100%', justifyContent: 'center', background: 'white', color: '#0369a1', border: '2px solid #0ea5e9' }}
                icon={<FiUsers />}
                disabled={currentStatus !== 'NOUVEAU'}
              >
                Convoquer le CAB
              </Button>
              <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '-0.5rem' }}>Nécessaire pour les changements Majeurs/Normaux.</p>

              <hr style={{ border: 'none', borderTop: '1px dashed #cbd5e1', margin: '0' }} />

              <Button 
                onClick={() => updateRfcStatus('APPROUVE')}
                style={{ width: '100%', justifyContent: 'center', background: '#10b981', color: 'white', border: 'none' }}
                icon={<FiCheckCircle />}
                disabled={currentStatus === 'APPROUVE' || !recommendation.trim()}
              >
                Approuver Directement
              </Button>
              <p style={{ fontSize: '0.75rem', color: '#64748b', textAlign: 'center', marginTop: '-0.5rem' }}>Autorisé uniquement pour les risques standard.</p>

              <Button 
                onClick={() => updateRfcStatus('REJETE')}
                style={{ width: '100%', justifyContent: 'center', background: 'white', color: '#ef4444', border: '1px solid #ef4444' }}
                icon={<FiXCircle />}
                disabled={currentStatus === 'REJETE' || !recommendation.trim()}
              >
                Rejeter la RFC
              </Button>

            </div>
          </Card>
        </div>

      </div>
    </div>
  );
};

export default RfcReview;
