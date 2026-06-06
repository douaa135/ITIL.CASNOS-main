import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiSearch, FiFileText, FiRefreshCw, FiCheck, FiDownload, FiX, FiUser } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import changeService from '../../services/changeService';
import './MyTasks.css'; 
import '../admin/AdminUnified.css';

const ImplementerHistory = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resultModal, setResultModal] = useState({ show: false, type: '', title: '', task: null });
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [reportFilter, setReportFilter] = useState('ALL');

  const filteredJournals = journals.filter(journal => {
    const q = search.trim().toLowerCase();
    const matchesSearch = !q || 
      (journal.titre_journal || '').toLowerCase().includes(q) ||
      (journal.description || '').toLowerCase().includes(q) ||
      (journal.tache?.code_tache || '').toLowerCase().includes(q) ||
      (journal.tache?.description || '').toLowerCase().includes(q);

    const isIncident = (journal.titre_journal || '').toLowerCase().includes('échec') || (journal.titre_journal || '').toLowerCase().includes('incident');
    const matchesReport = reportFilter === 'ALL' || 
      (reportFilter === 'SUCCESS' && !isIncident) || 
      (reportFilter === 'ROLLBACK' && isIncident);

    return matchesSearch && matchesReport;
  });

  const getReportHtml = (task, type, title) => {
      const isSuccess = type === 'SUCCESS';
      const themeColor = isSuccess ? '#059669' : '#dc2626';
      const statusLabel = isSuccess ? 'SUCCÈS' : 'INCIDENT';
      const description = task?.journaux?.map(j => `[${new Date(j.date_entree).toLocaleString()}] ${j.titre_journal || ''}\n${j.description}`).join('\n\n') || task?.description || "Aucun contenu disponible.";

      return `
        <div id="report-to-capture" style="font-family:'Segoe UI',Tahoma,sans-serif;padding:20mm;color:#1e293b;line-height:1.6;background:white;width:210mm;min-height:297mm;margin:auto;box-sizing:border-box;border:1px solid #eee;">
          <div style="border-bottom:3px solid ${themeColor};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end;">
            <div>
              <div style="display:flex;align-items:center;gap:15px;">
                <h1 style="color:${themeColor};margin:0;font-size:28px;">${title || "Rapport d'exécution"}</h1>
                <span style="background:${themeColor};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;">${statusLabel}</span>
              </div>
              <div style="font-size:14px;color:#64748b;margin-top:5px;">Document Officiel ITIL - CASNOS</div>
            </div>
            <div style="font-size:14px;color:#64748b;text-align:right;">Généré le: ${new Date().toLocaleString()}</div>
          </div>
          <div style="margin-bottom:25px;">
            <div style="font-weight:bold;color:${themeColor};text-transform:uppercase;font-size:12px;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:5px;">Informations Générales</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
              <div><strong style="color:#64748b;">Code Rapport:</strong> DOC-AUTO</div>
              <div><strong style="color:#64748b;">Type:</strong> Journal</div>
              <div><strong style="color:#64748b;">Référence:</strong> ${task?.code_tache || 'N/A'}</div>
              <div><strong style="color:#64748b;">Date d'Entrée:</strong> ${new Date().toLocaleDateString()}</div>
              <div style="margin-top:10px;"><strong style="color:#64748b;">Implémenteur Responsable:</strong> ${task?.implementeur?.nom_user || task?.changeManager?.nom_user || 'Non assigné'}</div>
              <div style="margin-top:10px;"><strong style="color:#64748b;">Statut Final:</strong> ${task?.statut?.libelle_statut || task?.statut?.code_statut || 'Non défini'}</div>
            </div>
          </div>
          <div style="margin-bottom:25px;">
            <div style="font-weight:bold;color:${themeColor};text-transform:uppercase;font-size:12px;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:5px;">Contenu du Rapport</div>
            <div style="white-space:pre-wrap;background:#ffffff;padding:25px;border-radius:8px;border:1px solid #e2e8f0;min-height:400px;color:#334155;font-size:15px;">
              ${description}
            </div>
          </div>
        </div>
      `;
  };

  const handleDownloadPDF = () => {
      const task = resultModal.task;
      if (!task) return;
      const htmlContent = getReportHtml(task, resultModal.type, resultModal.title);
      
      const s1 = document.createElement('script');
      s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s1.onload = () => {
        const s2 = document.createElement('script');
        s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        s2.onload = () => {
          const container = document.createElement('div');
          container.style.cssText = 'position:absolute;top:0;left:-2000px;width:210mm;';
          container.innerHTML = htmlContent;
          document.body.appendChild(container);
          setTimeout(() => {
            window.html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
              const imgData = canvas.toDataURL('image/jpeg', 1.0);
              const { jsPDF } = window.jspdf;
              const pdf = new jsPDF('p', 'mm', 'a4');
              const w = pdf.internal.pageSize.getWidth();
              const h = (canvas.height * w) / canvas.width;
              pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
              pdf.save(`Rapport_Implementation_${task?.code_tache || 'DOC'}.pdf`);
              document.body.removeChild(container);
            }).catch(err => { console.error(err); document.body.removeChild(container); });
          }, 1000);
        };
        document.head.appendChild(s2);
      };
      document.head.appendChild(s1);
  };

  const fetchHistory = useCallback(async () => {
      try {
        if (!user?.id_user) return;
        setLoading(true);
        
        const userTasks = await changeService.getMyTasks(user.id_user);
        
        // Aplatir les journaux depuis les tâches
        const allJournals = userTasks.flatMap(task => 
          (task.journaux || []).map(j => ({
            ...j,
            tache: task,
            changement: task.changement
          }))
        );
        
        // Trier par date la plus récente
        allJournals.sort((a, b) => new Date(b.date_entree) - new Date(a.date_entree));
        
        setJournals(allJournals);
      } catch (error) {
        console.error('Fetch History Error:', error);
      } finally {
        setLoading(false);
      }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return (
    <div className="my-tasks-container">
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f0fdf4', color: '#16a34a', borderColor: '#bbf7d0' }}><FiClock /></div>
          <div className="premium-header-text">
            <h1>Historique d'exécution</h1>
            <p>Retrouvez l'historique complet de vos journaux d'exécution et rapports d'incidents.</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button
            onClick={fetchHistory}
            className="btn-create-premium"
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FiRefreshCw className={loading ? 'spinning' : ''} size={14} /> Actualiser
          </button>
        </div>
      </div>
      
      <div className="tasks-list-panel">
        <div className="panel-header" style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1.5rem' }}>
           <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
             <FiSearch style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
             <input
               type="text"
               placeholder="Rechercher par code tâche, titre de journal, description..."
               value={search}
               onChange={e => setSearch(e.target.value)}
               style={{ width: '100%', padding: '0.75rem 1rem 0.75rem 2.5rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', fontSize: '0.95rem', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', outline: 'none' }}
             />
           </div>
           <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
             <select
               value={reportFilter}
               onChange={e => setReportFilter(e.target.value)}
               style={{ padding: '0.75rem 1rem', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#fff', color: '#1e293b', fontWeight: '600', fontSize: '0.9rem', minWidth: '200px' }}
             >
               <option value="ALL">Tous les rapports</option>
               <option value="SUCCESS">Succès d'exécution</option>
               <option value="ROLLBACK">Échec / Rollback</option>
             </select>
             {(search || reportFilter !== 'ALL') && (
               <button
                 onClick={() => { setSearch(''); setReportFilter('ALL'); }}
                 className="reset-filters-btn-cab"
                 style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                 title="Réinitialiser"
               >
                 <FiRefreshCw size={14} /> Réinitialiser
               </button>
             )}
           </div>
        </div>
        
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <FiRefreshCw className="spinning" style={{ display: 'block', margin: '0 auto 1rem' }} size={32} />
              Chargement de l'historique...
            </div>
          ) : journals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
              <FiFileText size={40} style={{ display: 'block', margin: '0 auto 1rem', opacity: 0.3 }} />
              Aucun historique trouvé.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ position: 'sticky', left: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap', borderRight: '1px solid #e2e8f0' }}>Titre du Journal</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Tâche</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Date</th>
                    <th style={{ padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'left', whiteSpace: 'nowrap' }}>Description</th>
                    <th style={{ position: 'sticky', right: 0, zIndex: 3, background: '#f8fafc', padding: '12px 16px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', textAlign: 'right', whiteSpace: 'nowrap', borderLeft: '1px solid #e2e8f0' }}>Rapport</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredJournals.map(journal => {
                    const isIncident = (journal.titre_journal || '').toLowerCase().includes('échec') || (journal.titre_journal || '').toLowerCase().includes('incident');
                    return (
                      <tr
                        key={journal.id_journal}
                        style={{ borderBottom: '1px solid #f1f5f9', background: '#ffffff', transition: 'background 0.15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = '#ffffff'}
                      >
                        {/* Titre — sticky */}
                        <td style={{ position: 'sticky', left: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderRight: '1px solid #f1f5f9', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: isIncident ? '#ef4444' : '#10b981' }} />
                            <div>
                              <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '0.82rem', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: '2px' }} title={journal.titre_journal}>{journal.titre_journal || 'Journal'}</div>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, background: isIncident ? '#fee2e2' : '#d1fae5', color: isIncident ? '#dc2626' : '#059669' }}>
                                {isIncident ? <FiAlertCircle size={11} /> : <FiCheckCircle size={11} />}
                                {isIncident ? 'Échec' : 'Succès'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Tâche */}
                        <td style={{ padding: '14px 16px', fontSize: '0.875rem', color: '#334155', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 700 }}>{journal.tache?.code_tache || '-'}</span>
                        </td>

                        {/* Date */}
                        <td style={{ padding: '14px 16px', fontSize: '0.8rem', color: '#64748b', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                          {new Date(journal.date_entree).toLocaleString()}
                        </td>

                        {/* Description */}
                        <td style={{ padding: '14px 16px', fontSize: '0.82rem', color: '#64748b', verticalAlign: 'middle', maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={journal.tache?.description}>
                          {journal.tache?.description || '-'}
                        </td>

                        {/* Rapport — sticky */}
                        <td style={{ position: 'sticky', right: 0, zIndex: 2, background: 'inherit', padding: '14px 16px', borderLeft: '1px solid #f1f5f9', textAlign: 'right' }}>
                          {isIncident ? (
                            <button
                              onClick={() => setResultModal({ show: true, type: 'ROLLBACK', title: "Rapport d'Incident / Échec (Rollback Déclenché)", task: journal.tache })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#fef2f2', color: '#ef4444', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                              onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                            >
                              <FiAlertCircle size={13} /> Rollback
                            </button>
                          ) : (
                            <button
                              onClick={() => setResultModal({ show: true, type: 'SUCCESS', title: "Rapport de Succès de l'Implémentation", task: journal.tache })}
                              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '6px 14px', borderRadius: '8px', border: 'none', background: '#f0fdf4', color: '#16a34a', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', transition: 'background 0.15s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#dcfce7'}
                              onMouseLeave={e => e.currentTarget.style.background = '#f0fdf4'}
                            >
                              <FiCheck size={13} /> Rapport
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {resultModal.show && (
        <div className="modal-backdrop-cab" onClick={() => setResultModal({ show: false, type: '', title: '' })}>
          <div className="modal-box-cab glass-card-cab tm-modal-large" style={{ background: '#f0f9ff', border: '1px solid #bae6fd', maxWidth: '720px' }} onClick={e => e.stopPropagation()}>

            {/* ── Header ── */}
            <div className="modal-top-rfc-style" style={{ background: resultModal.type === 'SUCCESS' ? '#064e3b' : '#7f1d1d', borderBottom: `1px solid ${resultModal.type === 'SUCCESS' ? '#065f46' : '#991b1b'}`, padding: '1.5rem 2rem' }}>
              <div className="rfc-style-icon-wrapper" style={{ background: 'rgba(255,255,255,0.1)', color: '#ffffff', borderColor: 'rgba(255,255,255,0.2)' }}>
                {resultModal.type === 'SUCCESS' ? <FiCheckCircle size={22} /> : <FiAlertCircle size={22} />}
              </div>
              <div className="rfc-style-header-text">
                <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.2rem' }}>{resultModal.title}</h2>
                <div className="rfc-style-subtitle" style={{ color: 'rgba(255,255,255,0.75)', marginTop: '0.25rem' }}>
                  {resultModal.task?.titre_tache} — #{resultModal.task?.code_tache}
                </div>
              </div>
              <button className="close-btn-rfc-style" onClick={() => setResultModal({ show: false, type: '', title: '' })} style={{ color: '#ffffff' }}>
                <FiX size={24} />
              </button>
            </div>

            {/* ── Body ── */}
            <div className="modal-body-rfc-style">
              {/* Info cards */}
              <div className="tm-detail-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="form-group-cab">
                  <label>Implémenteur Responsable</label>
                  <div className="detail-value-display tm-detail-box tm-detail-with-icon">
                    <FiUser className="tm-muted-icon" />
                    {resultModal.task?.implementeur?.prenom_user || user?.prenom_user || ''}{' '}
                    {resultModal.task?.implementeur?.nom_user || user?.nom_user || ''}
                  </div>
                </div>
                <div className="form-group-cab">
                  <label>Statut Final</label>
                  <div className="detail-value-display tm-detail-box">
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '0.78rem', fontWeight: 700,
                      background: resultModal.type === 'SUCCESS' ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
                      color: resultModal.type === 'SUCCESS' ? '#10b981' : '#ef4444'
                    }}>
                      {resultModal.task?.statut?.libelle || resultModal.task?.statut?.code_statut || 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="form-group-cab">
                  <label>Changement Associé</label>
                  <div className="detail-value-display tm-detail-box tm-change-code">
                    {resultModal.task?.changement?.code_changement || 'N/A'}
                  </div>
                </div>
                <div className="form-group-cab">
                  <label>Date du Rapport</label>
                  <div className="detail-value-display tm-detail-box tm-detail-with-icon">
                    <FiClock className="tm-muted-icon" />
                    {new Date().toLocaleDateString('fr-DZ')}
                  </div>
                </div>
              </div>

              {/* Timeline */}
              <div className="form-group-cab tm-col-span-2">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FiClock size={14} /> Historique & Journaux d'Exécution
                </label>
                <div className="tm-description-box" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '160px', maxHeight: '380px', overflowY: 'auto' }}>
                  {resultModal.task?.journaux && resultModal.task.journaux.length > 0 ? (
                    <div>
                      {resultModal.task.journaux.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: '1.25rem', borderLeft: `3px solid ${resultModal.type === 'SUCCESS' ? '#10b981' : '#ef4444'}`, paddingLeft: '1.25rem', position: 'relative' }}>
                          <div style={{ position: 'absolute', left: '-6.5px', top: 0, width: '10px', height: '10px', background: resultModal.type === 'SUCCESS' ? '#10b981' : '#ef4444', borderRadius: '50%', border: '2px solid white' }} />
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem' }}>
                            <strong style={{ color: '#0f172a' }}>{log.titre_journal || "Mise à jour d'implémentation"}</strong>
                            <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{new Date(log.date_entree).toLocaleString('fr-DZ')}</span>
                          </div>
                          <div style={{ fontSize: '0.92rem', color: '#334155', lineHeight: '1.6', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                            {log.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: '#94a3b8' }}>
                      <FiClock size={40} style={{ opacity: 0.2, display: 'block', margin: '0 auto 1rem' }} />
                      <p style={{ fontStyle: 'italic' }}>Aucun journal d'exécution saisi pour cette tâche.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ── Footer ── */}
            <div className="modal-footer-rfc-style">
              <button className="btn-cancel-rfc-style" onClick={() => setResultModal({ show: false, type: '', title: '' })}>
                Fermer
              </button>
              <button className="btn-submit-rfc-style" onClick={handleDownloadPDF} style={{ background: resultModal.type === 'SUCCESS' ? '#059669' : '#dc2626' }}>
                <FiDownload size={16} /> Télécharger PDF
              </button>
            </div>

          </div>
        </div>
      )}


    </div>
  );
};

export default ImplementerHistory;
