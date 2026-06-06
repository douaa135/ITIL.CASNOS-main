import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiArrowLeft, FiFileText, FiClock, FiTarget,
  FiCheckCircle, FiXCircle, FiMessageSquare, FiPaperclip,
  FiSend, FiDownload, FiInfo, FiCalendar, FiActivity,
  FiChevronRight, FiLayers, FiRefreshCw
} from 'react-icons/fi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import './RfcDetail.css';
import rfcService from '../../services/rfcService';
import changeService from '../../services/changeService';

const STATUS_BADGE = {
  BROUILLON: 'info',
  SOUMIS: 'info',
  ACCEPTEE_SD: 'info',
  EN_INSTRUCTION: 'warning',
  EVALUEE: 'warning',
  EN_ATTENTE_CAB: 'warning',
  APPROUVEE: 'success',
  EN_COURS: 'info',
  CLOTUREE: 'success',
  REJETEE: 'danger',
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }) : '-';
const formatDateTime = (d) => d ? new Date(d).toLocaleString('fr-FR', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-';
const formatSize = (b) => b >= 1048576 ? `${(b/1048576).toFixed(1)} Mo` : `${(b/1024).toFixed(0)} Ko`;

const FILE_COLORS = { PDF:'#ef4444', DOCX:'#3b82f6', XLSX:'#10b981', PNG:'#8b5cf6', JPG:'#f97316' };

const SectionCard = ({ icon, title, children }) => (
  <div className="section-card">
    <div className="section-card-header">
      <div className="section-card-title">{icon}{title}</div>
    </div>
    <div className="section-card-body">{children}</div>
  </div>
);

const RfcDetail = () => {
  const navigate = useNavigate();
  const { id }   = useParams();
  const [rfc, setRfc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [changeTasks, setChangeTasks] = useState([]);
  const [tasksLoading, setTasksLoading] = useState(false);
  const [relatedChange, setRelatedChange] = useState(null);

  useEffect(() => {
    const fetchRfc = async () => {
      try {
        setLoading(true);
        const r = await rfcService.getRfcById(id);
        if (r) {
          // Mapper les données du backend au format attendu par le frontend
          setRfc({
            id_rfc: r.code_rfc || r.id_rfc,
            db_id: r.id_rfc,
            titre: r.titre_rfc,
            description_rfc: r.description,
            justification_rfc: r.justification,
            plan_implementation: '-', 
            risques_connus: '-', 
            date_creation: r.date_creation,
            date_souhaitee: r.date_souhaitee,
            urgence: r.urgence ? 'HAUTE' : 'NORMALE',
            type: { nom: r.typeRfc?.type || 'NORMAL' },
            statut: { 
              code: r.statut?.code_statut || 'NOUVEAU', 
              libelle: r.statut?.libelle || 'Nouveau' 
            },
            statut_historique: r.historiques?.map(h => ({
              id: h.id_historique,
              statut: h.statut?.code_statut,
              libelle: h.statut?.libelle,
              date: h.date_changement,
              commentaire: h.commentaire,
              couleur: STATUS_BADGE[h.statut?.code_statut] || 'info'
            })) || [],
            commentaires: r.commentaires?.map(c => ({
              id: c.id_commentaire,
              auteur: { 
                nom: `${c.auteur?.prenom_user} ${c.auteur?.nom_user}`, 
                role: c.auteur?.roles?.[0] || 'Utilisateur',
                initiales: c.auteur?.prenom_user?.[0] + (c.auteur?.nom_user?.[0] || ''), 
                color: '#3b82f6' 
              },
              contenu: c.contenu,
              date: c.date_publication
            })) || [],
            pieces_jointes: r.piecesJointes?.map(p => ({
              id: p.id_piece,
              nom: p.nom_fichier,
              type: p.nom_fichier.split('.').pop().toUpperCase(),
              taille: p.taille || 0,
              date: p.date_upload
            })) || [],
            changements: r.changements || []
          });

          // Fetch change and tasks
          setTasksLoading(true);
          try {
            const dbChange = await changeService.getChangeByRfc(r.id_rfc);
            if (dbChange) {
              setRelatedChange(dbChange);
              const tasks = await changeService.getTasksByChange(dbChange.id_changement);
              setChangeTasks(tasks || []);
            }
          } catch (err) {
            console.error("Error fetching linked change/tasks:", err);
          } finally {
            setTasksLoading(false);
          }
        }
      } catch (err) {
        console.error('Erreur detail:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRfc();
  }, [id]);

  const handleAddComment = async () => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await rfcService.addCommentaire(rfc.db_id, comment);
      setComment('');
      // Re-fetch comments or update state locally
      const updatedRfc = await rfcService.getRfcById(id);
      if (updatedRfc) {
        setRfc(prev => ({
          ...prev,
          commentaires: updatedRfc.commentaires?.map(c => ({
            id: c.id_commentaire,
            auteur: { 
              nom: `${c.auteur?.prenom_user} ${c.auteur?.nom_user}`, 
              role: c.auteur?.roles?.[0] || 'Utilisateur',
              initiales: c.auteur?.prenom_user?.[0] + (c.auteur?.nom_user?.[0] || ''), 
              color: '#3b82f6' 
            },
            contenu: c.contenu,
            date: c.date_publication
          })) || []
        }));
      }
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="impl-loading">
      <FiRefreshCw className="spinning" /> Chargement des détails de la RFC...
    </div>
  );
  if (!rfc) return <div style={{ padding: '4rem', textAlign: 'center' }}>RFC introuvable.</div>;

  return (
    <div className="rfc-detail-page">
      <nav className="page-breadcrumb">
        <a onClick={() => navigate('/mes-rfcs')}>Mes RFCs (Demandeur)</a>
        <FiChevronRight className="breadcrumb-sep" />
        <span>{rfc.id_rfc}</span>
      </nav>

      <div className="detail-hero-card">
        <div className="detail-hero-top">
          <div className="detail-hero-left">
            <div className="detail-rfc-id"><FiFileText size={12} />{rfc.id_rfc}</div>
            <div className="detail-title">{rfc.titre}</div>
            <div className="detail-meta-tags">
              <span className="detail-meta-chip">⚡ Urgence : {rfc.urgence}</span>
            </div>
          </div>
          <div className="detail-hero-right">
            <Badge status={STATUS_BADGE[rfc.statut.code] || 'default'} className="status-big-badge">
              {rfc.statut.libelle}
            </Badge>
          </div>
        </div>
        <div className="detail-hero-bottom" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          <div className="detail-info-item">
            <span className="detail-info-label"><FiCalendar size={12} />Soumise le</span>
            <span className="detail-info-value">{formatDate(rfc.date_creation)}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label"><FiClock size={12} />Mise en œuvre souhaitée</span>
            <span className="detail-info-value">{formatDate(rfc.date_souhaitee)}</span>
          </div>
          <div className="detail-info-item">
            <span className="detail-info-label"><FiInfo size={12} />Statut Actuel</span>
            <span className="detail-info-value">{rfc.statut.libelle}</span>
          </div>
        </div>
      </div>

      <div className="detail-layout" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="detail-main">
          <SectionCard icon={<FiTarget />} title="Dossier de la Demande">
            <div className="desc-block">
              <span className="desc-label">Description détaillée</span>
              <p className="desc-text">{rfc.description_rfc}</p>
            </div>
            <div className="desc-block">
              <span className="desc-label">Justification Business</span>
              <p className="desc-text">{rfc.justification_rfc}</p>
            </div>
            <div className="desc-block">
              <span className="desc-label">Plan d'implémentation</span>
              <p className="desc-text">{rfc.plan_implementation}</p>
            </div>
            <div className="desc-block">
              <span className="desc-label">Risques identifiés par métier</span>
              <p className="desc-text">{rfc.risques_connus || 'Non spécifiés.'}</p>
            </div>
            
            {(rfc.managerRecommendation || rfc.cabDate) && (
              <div style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderLeft: '4px solid #3b82f6', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}>
                <h4 style={{ fontSize: '0.9rem', color: '#1e293b', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FiInfo color="#3b82f6" /> Retour Officiel du Change Manager
                </h4>
                {rfc.managerRecommendation && (
                  <div style={{ marginBottom: rfc.cabDate ? '0.75rem' : '0' }}>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Recommandations / Justifications</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', fontStyle: 'italic' }}>"{rfc.managerRecommendation}"</p>
                  </div>
                )}
                {rfc.cabDate && (
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#64748b', display: 'block', marginBottom: '0.25rem' }}>Date planifiée pour présentation CAB</span>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: '#10b981', fontWeight: '500' }}>{new Date(rfc.cabDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard icon={<FiMessageSquare />} title={`Échanges & Feedback (${rfc.commentaires.length})`}>
            <div className="comments-list">
              {rfc.commentaires.map(c => (
                <div key={c.id} className="comment-item">
                  <div className="comment-avatar" style={{ background: c.auteur.color }}>{c.auteur.initiales}</div>
                  <div className="comment-bubble">
                    <div className="comment-meta">
                      <span className="comment-author">{c.auteur.nom} ({c.auteur.role})</span>
                      <span className="comment-date">{formatDateTime(c.date)}</span>
                    </div>
                    <p className="comment-text">{c.contenu}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="comment-input-area">
              <div className="comment-input-box">
                <textarea
                  className="comment-textarea" rows={3}
                  placeholder="Ajouter un retour..."
                  value={comment} onChange={e => setComment(e.target.value)}
                />
                <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'0.5rem' }}>
                  <Button variant="primary" size="sm" icon={<FiSend size={13} />} onClick={handleAddComment} disabled={!comment.trim() || submitting}>
                    {submitting ? 'Envoi...' : 'Ajouter un retour'}
                  </Button>
                </div>
              </div>
            </div>
          </SectionCard>

          {relatedChange && (
            <SectionCard icon={<FiLayers />} title="Suivi de l'Implémentation">
              <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Référence Changement</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1e293b' }}>#{relatedChange.code_changement}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', display: 'block' }}>Statut Global</span>
                    <Badge variant={
                      ['IMPLEMENTE', 'CLOTURE', 'TERMINEE'].includes(relatedChange.statut?.code_statut) ? 'success' :
                      ['EN_ECHEC', 'ANNULEE', 'REJETEE'].includes(relatedChange.statut?.code_statut) ? 'danger' :
                      ['EN_COURS', 'PLANIFIEE'].includes(relatedChange.statut?.code_statut) ? 'info' : 'warning'
                    }>
                      {relatedChange.statut?.libelle || relatedChange.statut?.code_statut}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="implementation-tasks-list" style={{ marginTop: '2rem' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#475569', fontWeight: '700', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FiActivity size={14} /> Plan d'exécution technique
                </h4>
                
                {tasksLoading ? (
                   <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8' }}>Chargement du suivi...</div>
                ) : changeTasks.length === 0 ? (
                   <div style={{ padding: '2rem', textAlign: 'center', color: '#94a3b8', background: '#f8fafc', borderRadius: '8px' }}>
                     Aucune étape d'implémentation détaillée n'est encore disponible.
                   </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {changeTasks.map(t => (
                      <div key={t.id_tache} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', transition: 'all 0.2s' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontWeight: '800', fontSize: '0.8rem' }}>
                          {t.code_tache?.slice(-2) || '??'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '700', color: '#1e293b', fontSize: '0.9rem' }}>{t.titre_tache}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigné à : {t.implementeur?.prenom_user} {t.implementeur?.nom_user}</div>
                        </div>
                        <div>
                          <span style={{ padding: '4px 10px', borderRadius: '6px', fontSize: '0.7rem', fontWeight: '800', background: t.statut?.code_statut === 'TERMINEE' ? '#f0fdf4' : '#f8fafc', color: t.statut?.code_statut === 'TERMINEE' ? '#16a34a' : '#64748b', border: '1px solid ' + (t.statut?.code_statut === 'TERMINEE' ? '#dcfce7' : '#e2e8f0') }}>
                            {t.statut?.libelle || 'En attente'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </SectionCard>
          )}
        </div>

        <div className="detail-sidebar">
          {rfc.statut.code === 'A_COMPLETER' && (
             <Button variant="primary" icon={<FiActivity />} onClick={() => navigate('/rfcs/new', { state: { edit: true, rfcData: rfc } })} style={{ width: '100%', justifyContent: 'center', marginBottom: '10px', background: '#d97706', borderColor: '#b45309' }}>
               Éditer et Resoumettre
             </Button>
          )}

          <Button variant="secondary" icon={<FiArrowLeft />} onClick={() => navigate('/mes-rfcs')} style={{ width: '100%', justifyContent: 'center' }}>
            Retour à Mes Demandes
          </Button>

          <div className="sidebar-widget">
            <div className="sidebar-widget-header"><FiActivity size={14} />Suivi de l'avancement</div>
            <div className="sidebar-widget-body">
              <div className="timeline">
                {[...rfc.statut_historique].reverse().map(item => (
                  <div key={item.id} className="timeline-item">
                    <div className={`timeline-dot ${item.couleur}`}>
                      {item.couleur === 'success' ? <FiCheckCircle size={14} /> : item.couleur === 'danger' ? <FiXCircle size={14} /> : <FiClock size={14} />}
                    </div>
                    <div className="timeline-content">
                      <div className="timeline-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.2rem' }}>
                        <span className="timeline-status" style={{ fontSize: '0.8rem' }}>{item.libelle}</span>
                        <span className="timeline-date" style={{ marginLeft: 0 }}>{formatDateTime(item.date)}</span>
                      </div>
                      {item.commentaire && <div className="timeline-comment" style={{ fontSize: '0.75rem', padding: '0.4rem' }}>{item.commentaire}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="sidebar-widget">
            <div className="sidebar-widget-header"><FiPaperclip size={14} />Documentation Jointe</div>
            <div className="sidebar-widget-body" style={{ padding: '0.75rem' }}>
              <div className="attachment-list">
                {rfc.pieces_jointes.map(f => (
                  <div key={f.id} className="attachment-item" style={{ padding: '0.5rem' }}>
                    <div className="attach-icon" style={{ width: 28, height: 28, color: FILE_COLORS[f.type] || '#3b82f6', background: (FILE_COLORS[f.type] || '#3b82f6') + '18' }}>
                      <FiFileText size={12} />
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div className="attach-name" style={{ fontSize: '0.8rem' }}>{f.nom}</div>
                      <div className="attach-meta">{formatSize(f.taille)}</div>
                    </div>
                    <FiDownload className="attach-download" size={14} />
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default RfcDetail;
