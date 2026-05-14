import React, { useState, useEffect, useCallback } from 'react';
import { FiClock, FiCheckCircle, FiAlertCircle, FiSearch, FiFileText, FiRefreshCw, FiCheck, FiDownload, FiX } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import changeService from '../../services/changeService';
import './MyTasks.css'; 
import '../admin/AdminUnified.css';

const ImplementerHistory = () => {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [resultModal, setResultModal] = useState({ show: false, type: '', title: '', task: null });
  const { user } = useAuth();

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

  const filteredJournals = journals.filter(j => 
    j.titre_journal?.toLowerCase().includes(search.toLowerCase()) ||
    j.description?.toLowerCase().includes(search.toLowerCase()) ||
    j.tache?.code_tache?.toLowerCase().includes(search.toLowerCase())
  );

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
      </div>
      
      <div className="tasks-list-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '1rem' }}>
           <div className="search-bar" style={{ marginBottom: 0, flex: 1, maxWidth: '400px' }}>
             <FiSearch />
             <input 
               type="text" 
               placeholder="Rechercher dans l'historique..." 
               value={search}
               onChange={e => setSearch(e.target.value)}
             />
           </div>
           <button
             onClick={fetchHistory}
             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.65rem 1.25rem', borderRadius: '10px', border: 'none', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
           >
             <FiRefreshCw className={loading ? 'spinning' : ''} size={14} /> Actualiser
           </button>
        </div>

        <div className="tasks-table-container">
          {loading ? (
             <div className="loading-state">Chargement de l'historique...</div>
          ) : filteredJournals.length === 0 ? (
             <div className="empty-state">
               <FiFileText size={48} style={{ color: '#cbd5e1', marginBottom: '1rem' }} />
               <br />
               Aucun historique trouvé.
             </div>
          ) : (
            <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
             <table className="tasks-table">
               <thead>
                 <tr>
                    <th style={{ width: '15%' }}>Date</th>
                    <th style={{ width: '20%' }}>Titre du Journal</th>
                    <th style={{ width: '15%' }}>Tâche Associée</th>
                    <th style={{ width: '20%' }}>Description</th>
                    <th style={{ width: '30%' }}>Rapport</th>
                 </tr>
               </thead>
               <tbody>
                 {filteredJournals.map(journal => (
                   <tr key={journal.id_journal}>
                     <td>{new Date(journal.date_entree).toLocaleString()}</td>
                     <td>
                       <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                         <strong>{journal.titre_journal || 'Journal'}</strong>
                         {journal.titre_journal?.toLowerCase().includes('échec') || journal.titre_journal?.toLowerCase().includes('incident') 
                           ? <span style={{ background: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiAlertCircle size={12} /> Échec</span> 
                           : <span style={{ background: '#d1fae5', color: '#059669', padding: '2px 8px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '4px' }}><FiCheckCircle size={12} /> Succès</span>}
                       </div>
                     </td>
                     <td>
                        <span className="task-id" style={{ fontSize: '0.8rem', color: '#3b82f6', fontWeight: 800 }}>{journal.tache?.code_tache}</span>
                     </td>
                     <td style={{ whiteSpace: 'pre-wrap', color: '#64748b', fontSize: '0.85rem' }}>
                       {journal.tache?.description || '-'}
                     </td>
                     <td style={{ whiteSpace: 'pre-wrap', color: '#0f172a', fontSize: '0.85rem', fontWeight: 500 }}>
                       {journal.titre_journal?.toLowerCase().includes('échec') || journal.titre_journal?.toLowerCase().includes('incident') ? (
                         <button className="result-btn rollback" onClick={() => setResultModal({ show: true, type: 'ROLLBACK', title: 'Rapport d\'Incident / Échec (Rollback Déclenché)', task: journal.tache })}>
                             <FiRefreshCw /> Rollback
                         </button>
                       ) : (
                         <button className="result-btn success" onClick={() => setResultModal({ show: true, type: 'SUCCESS', title: 'Rapport de Succès de l\'Implémentation', task: journal.tache })}>
                             <FiCheck /> Rapport
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
               </tbody>
             </table>
            </div>
          )}
        </div>
      </div>

      {resultModal.show && (
          <div className="modal-overlay" style={{ zIndex: 9999 }}>
              <div className="modal-box-cab glass-card-cab tm-modal-large" style={{ maxWidth: '700px', background: '#f0f9ff', border: '1px solid #bae6fd' }}>
                  <div className="modal-top-rfc-style" style={{ background: '#003366', borderBottom: '1px solid #002855', padding: '1.5rem 2rem' }}>
                      <div className="rfc-style-icon-wrapper" 
                           style={{ background: 'rgba(255, 255, 255, 0.1)', color: '#ffffff', borderColor: 'rgba(255, 255, 255, 0.2)' }}>
                          {resultModal.type === 'SUCCESS' ? <FiCheckCircle size={24} /> : <FiAlertCircle size={24} />}
                      </div>
                      <div className="rfc-style-header-text">
                          <h2 style={{ color: '#ffffff', margin: 0, fontSize: '1.25rem' }}>{resultModal.title}</h2>
                          <div className="rfc-style-subtitle" style={{ color: 'rgba(255, 255, 255, 0.7)', marginTop: '0.25rem' }}>Tâche: {resultModal.task?.titre_tache} (#{resultModal.task?.code_tache})</div>
                      </div>
                      <button className="close-btn-rfc-style" onClick={() => setResultModal({ show: false, type: '', title: '' })} style={{ color: '#ffffff' }}><FiX size={24} /></button>
                  </div>

                  <div className="modal-body-rfc-style" id="report-content-to-print">
                      <div className="tm-detail-grid" style={{ marginBottom: '1.5rem' }}>
                          <div className="tm-detail-box">
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>Implémenteur Responsable</div>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{resultModal.task?.implementeur?.prenom_user || user?.prenom_user} {resultModal.task?.implementeur?.nom_user || user?.nom_user}</div>
                          </div>
                          <div className="tm-detail-box">
                              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: '#64748b', marginBottom: '0.25rem' }}>Statut Final</div>
                              <div style={{ fontWeight: '600', color: '#0f172a' }}>{resultModal.task?.statut?.libelle || resultModal.task?.statut?.code_statut || 'N/A'}</div>
                          </div>
                      </div>

                      <div className="tm-title-box" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1e40af' }}>
                          <FiClock size={18} /> Historique & Journaux d'Exécution
                      </div>

                      <div className="tm-description-box" style={{ padding: '1.25rem', background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', minHeight: '200px', maxHeight: '400px', overflowY: 'auto' }}>
                          {resultModal.task?.journaux && resultModal.task.journaux.length > 0 ? (
                              <div className="timeline-tracker">
                                  {resultModal.task.journaux.map((log, idx) => (
                                      <div key={idx} style={{ marginBottom: '1.25rem', borderLeft: '3px solid #3b82f6', paddingLeft: '1.25rem', position: 'relative' }}>
                                          <div style={{ position: 'absolute', left: '-6.5px', top: '0', width: '10px', height: '10px', background: '#3b82f6', borderRadius: '50%', border: '2px solid white' }}></div>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b', marginBottom: '0.4rem' }}>
                                              <strong style={{ color: '#0f172a' }}>{log.titre_journal || 'Mise à jour d\'implémentation'}</strong>
                                              <span style={{ fontSize: '0.75rem', background: '#f1f5f9', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{new Date(log.date_entree).toLocaleString('fr-DZ')}</span>
                                          </div>
                                          <div style={{ fontSize: '0.95rem', color: '#334155', lineHeight: '1.5', background: '#f8fafc', padding: '0.75rem', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                                              {log.description}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                                  <FiClock size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                                  <p style={{ fontStyle: 'italic' }}>Aucun journal d'exécution n'a été saisi par l'implémenteur pour cette tâche.</p>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="modal-footer-rfc-style">
                      <button className="btn-cancel-rfc-style" onClick={() => setResultModal({ show: false, type: '', title: '' })}>Fermer</button>
                      <button className="btn-submit-rfc-style" onClick={handleDownloadPDF} style={{ background: '#3b82f6' }}>
                          <FiDownload size={18} /> Télécharger le rapport (PDF)
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default ImplementerHistory;
