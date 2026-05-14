import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiFileText, FiSearch, FiLayers, FiCheckSquare, FiActivity, FiClock, 
  FiCalendar, FiChevronRight, FiAlertCircle, FiFilter, 
  FiDownload, FiHash, FiX, FiInfo, FiPrinter, FiRefreshCw
} from 'react-icons/fi';
import api from '../../api/axiosClient';
import './Reports.css';

const Reports = () => {
  const [loading, setLoading] = useState(true);
  const [activeKpi, setActiveKpi] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [data, setData] = useState({
    rfcs: [],
    changes: [],
    tasks: [],
    rfcRapports: {},   // { [id_rfc]: [rapport, ...] }
    chgRapports: {},   // { [id_changement]: [rapport, ...] }
  });
  const [itemReports, setItemReports] = useState([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // ─────────────────────────────────────────────
  // Fetch data — now fetches /rapports directly
  // ─────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [rfcsRes, changesRes, rapportsRes, auditRes] = await Promise.all([
        api.get('/rfc'),
        api.get('/changements'),
        // ✅ FIX #1: Fetch all rapports from the dedicated endpoint
        api.get('/rapports'),
        api.get('/audit-logs', { params: { entite_type: 'JOURNAL', limit: 200 } })
      ]);

      const rfcs     = rfcsRes?.data?.rfcs      || rfcsRes?.rfcs      || (Array.isArray(rfcsRes?.data)     ? rfcsRes.data     : []);
      const changes  = changesRes?.data?.changements || changesRes?.changements || (Array.isArray(changesRes?.data)  ? changesRes.data  : []);
      const rapports = rapportsRes?.data?.rapports  || rapportsRes?.rapports  || (Array.isArray(rapportsRes?.data) ? rapportsRes.data : []);
      
      // ✅ Build lookup maps for RFC/CHG rapports
      const rfcRapports = {};
      const chgRapports = {};
      rapports.forEach(r => {
        if (r.id_rfc) {
          if (!rfcRapports[r.id_rfc]) rfcRapports[r.id_rfc] = [];
          rfcRapports[r.id_rfc].push(r);
        }
        if (r.id_changement) {
          if (!chgRapports[r.id_changement]) chgRapports[r.id_changement] = [];
          chgRapports[r.id_changement].push(r);
        }
      });

      // ✅ Fetch ALL tasks for ALL changes to be coherent with Implementation Tracker
      let allTasks = [];
      try {
        const taskResponses = await Promise.all(
          changes.map(chg => api.get(`/changements/${chg.id_changement}/taches`).catch(() => ({ data: { taches: [] } })))
        );
        allTasks = taskResponses.flatMap(res => res?.data?.taches || res?.taches || []);
      } catch (err) {
        console.warn('Error fetching all tasks:', err);
      }

      setData({ rfcs, changes, tasks: allTasks, rfcRapports, chgRapports });
    } catch (error) {
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ─────────────────────────────────────────────
  // Load detail view for a selected item
  // ─────────────────────────────────────────────
  const loadItemDetails = async (item, type) => {
    setSelectedItem({ ...item, reportType: type });
    setReportsLoading(true);
    setItemReports([]);
    try {
      if (type === 'RFC') {
        // ✅ Use pre-fetched rapports — no extra API call needed
        const rapports = data.rfcRapports[item.id_rfc] || [];
        setItemReports(rapports);
      } else if (type === 'CHG') {
        // ✅ Use pre-fetched rapports keyed by id_changement
        const rapports = data.chgRapports[item.id_changement] || [];
        const status = item.reussite === true ? 'success' : item.reussite === false ? 'incident' : 'neutral';
        setItemReports(rapports.map(r => ({ ...r, status })));
      } else if (type === 'TASK') {
        const res = await api.get(`/taches/${item.id_tache}/journaux`);
        const journals = res?.data?.journaux || res?.journaux || [];
        const taskStatus = item.statut?.code_statut === 'TERMINEE' ? 'success'
          : item.statut?.code_statut === 'ANNULEE' ? 'incident' : 'neutral';
        setItemReports(journals.map(j => ({
          titre_rapport: j.titre_journal || "Journal d'exécution",
          type_rapport: 'Journal',
          status: taskStatus,
          contenu_rapport: j.description,
          date_generation: j.date_entree
        })));
      }
    } catch (error) {
      console.error('Error loading item details:', error);
      setItemReports([]);
    } finally {
      setReportsLoading(false);
    }
  };

  // ─────────────────────────────────────────────
  // Filtering
  // ─────────────────────────────────────────────
  const getFilteredItems = () => {
    let items = [];

    if (activeKpi === 'ALL' || activeKpi === 'RFC') {
      // ✅ Filter RFCs that actually have rapports in the DB
      const rfcItems = data.rfcs
        .filter(r => (data.rfcRapports[r.id_rfc] || []).length > 0)
        .map(r => ({ ...r, type: 'RFC', label: r.titre_rfc, code: r.code_rfc, date: r.date_creation }));
      items = [...items, ...rfcItems];
    }

    // ✅ Removed CHG KPIs as requested

    if (activeKpi === 'ALL' || activeKpi === 'TASK_SUCCESS' || activeKpi === 'TASK_ROLLBACK') {
      const successCodes = ['TERMINEE', 'CLOTUREE', 'SUCCES'];
      const rollbackCodes = ['ANNULEE', 'EN_ECHEC', 'ROLLBACK'];

      const taskItems = data.tasks
        .filter(t => {
          if (activeKpi === 'TASK_SUCCESS') return successCodes.includes(t.statut?.code_statut);
          if (activeKpi === 'TASK_ROLLBACK') return rollbackCodes.includes(t.statut?.code_statut);
          return successCodes.includes(t.statut?.code_statut) || rollbackCodes.includes(t.statut?.code_statut);
        })
        .map(t => ({
          ...t,
          type: 'TASK',
          label: t.titre_tache || "Tâche d'exécution",
          code: t.code_tache,
          date: t.date_creation
        }));
      items = [...items, ...taskItems];
    }

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      items = items.filter(i =>
        (i.label || '').toLowerCase().includes(q) ||
        (i.code  || '').toLowerCase().includes(q)
      );
    }

    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const filteredItems = getFilteredItems();

  // ─────────────────────────────────────────────
  // KPIs — derived from real rapport maps
  // ─────────────────────────────────────────────
  const renderKPIs = () => {
    // ✅ Count RFCs that actually have rapports in the DB
    const rfcCount  = data.rfcs.filter(r => (data.rfcRapports[r.id_rfc] || []).length > 0).length;
    
    const successTasks = data.tasks.filter(t => ['TERMINEE', 'CLOTUREE', 'SUCCES'].includes(t.statut?.code_statut)).length;
    const rollbackTasks = data.tasks.filter(t => ['ANNULEE', 'EN_ECHEC', 'ROLLBACK'].includes(t.statut?.code_statut)).length;
    
    const total = rfcCount + successTasks + rollbackTasks;

    return (
      <div className="rep-stats-grid">
        <div className={`rep-kpi-card blue   ${activeKpi === 'ALL'  ? 'selected-active' : ''}`} onClick={() => setActiveKpi('ALL')}>
          <span className="rep-kpi-value">{total}</span>
          <span className="rep-kpi-label">Tous les rapports</span>
        </div>
        <div className={`rep-kpi-card purple ${activeKpi === 'RFC'  ? 'selected-active' : ''}`} onClick={() => setActiveKpi('RFC')}>
          <span className="rep-kpi-value">{rfcCount}</span>
          <span className="rep-kpi-label">Rapports RFC</span>
        </div>
        {/* CHG KPIs removed */}
        <div className={`rep-kpi-card amber  ${activeKpi === 'TASK_SUCCESS' ? 'selected-active' : ''}`} onClick={() => setActiveKpi('TASK_SUCCESS')}>
          <span className="rep-kpi-value">{successTasks}</span>
          <span className="rep-kpi-label">Rapports Succès (Tâches)</span>
        </div>
        <div className={`rep-kpi-card red    ${activeKpi === 'TASK_ROLLBACK' ? 'selected-active' : ''}`} onClick={() => setActiveKpi('TASK_ROLLBACK')}>
          <span className="rep-kpi-value" style={{ color: '#ef4444' }}>{rollbackTasks}</span>
          <span className="rep-kpi-label">Rapports Rollback (Tâches)</span>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────
  // Shared HTML template for print / download
  // ─────────────────────────────────────────────
  const getReportHtml = (report) => {
    const themeColor  = report.status === 'success' ? '#059669' : report.status === 'incident' ? '#dc2626' : '#3b82f6';
    const statusLabel = report.status === 'success' ? 'SUCCÈS'  : report.status === 'incident' ? 'INCIDENT' : 'DOC';
    return `
      <div id="report-to-capture" style="font-family:'Segoe UI',Tahoma,sans-serif;padding:20mm;color:#1e293b;line-height:1.6;background:white;width:210mm;min-height:297mm;margin:auto;box-sizing:border-box;border:1px solid #eee;">
        <div style="border-bottom:3px solid ${themeColor};padding-bottom:20px;margin-bottom:30px;display:flex;justify-content:space-between;align-items:flex-end;">
          <div>
            <div style="display:flex;align-items:center;gap:15px;">
              <h1 style="color:${themeColor};margin:0;font-size:28px;">${report.titre_rapport || "Rapport d'exécution"}</h1>
              <span style="background:${themeColor};color:white;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:bold;">${statusLabel}</span>
            </div>
            <div style="font-size:14px;color:#64748b;margin-top:5px;">Document Officiel ITIL - CASNOS</div>
          </div>
          <div style="font-size:14px;color:#64748b;text-align:right;">Généré le: ${new Date().toLocaleString()}</div>
        </div>
        <div style="margin-bottom:25px;">
          <div style="font-weight:bold;color:${themeColor};text-transform:uppercase;font-size:12px;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:5px;">Informations Générales</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;background:#f8fafc;padding:15px;border-radius:8px;border:1px solid #e2e8f0;">
            <div><strong style="color:#64748b;">Code Rapport:</strong> ${report.code_metier || 'DOC-AUTO'}</div>
            <div><strong style="color:#64748b;">Type:</strong> ${report.type_rapport || 'Journal'}</div>
            <div><strong style="color:#64748b;">Référence:</strong> ${selectedItem?.code || 'N/A'}</div>
            <div><strong style="color:#64748b;">Date d'Entrée:</strong> ${new Date(report.date_generation || report.date_entree || Date.now()).toLocaleDateString()}</div>
            <div style="margin-top:10px;"><strong style="color:#64748b;">Implémenteur Responsable:</strong> ${selectedItem?.implementeur?.nom_user || selectedItem?.changeManager?.nom_user || 'Non assigné'}</div>
            <div style="margin-top:10px;"><strong style="color:#64748b;">Statut Final:</strong> ${selectedItem?.statut?.libelle_statut || selectedItem?.statut?.code_statut || 'Non défini'}</div>
          </div>
        </div>
        <div style="margin-bottom:25px;">
          <div style="font-weight:bold;color:${themeColor};text-transform:uppercase;font-size:12px;margin-bottom:10px;border-bottom:1px solid #f1f5f9;padding-bottom:5px;">Contenu du Rapport</div>
          <div style="white-space:pre-wrap;background:#ffffff;padding:25px;border-radius:8px;border:1px solid #e2e8f0;min-height:400px;color:#334155;font-size:15px;">
            ${report.contenu_rapport || report.description || "Aucun contenu disponible."}
          </div>
        </div>
      </div>
    `;
  };

  const handlePrintReport = (report) => {
    const w = window.open('', '_blank');
    if (!w) return alert("Veuillez autoriser les pop-ups pour imprimer le rapport.");
    w.document.write(`<html><head><title>${report.titre_rapport || 'Rapport ITIL'}</title></head><body style="margin:0;">${getReportHtml(report)}<script>setTimeout(()=>{window.print();window.close();},500);</script></body></html>`);
    w.document.close();
  };

  const handleDownloadReport = (report) => {
    const s1 = document.createElement('script');
    s1.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    s1.onload = () => {
      const s2 = document.createElement('script');
      s2.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s2.onload = () => {
        const container = document.createElement('div');
        container.style.cssText = 'position:absolute;top:0;left:-2000px;width:210mm;';
        container.innerHTML = getReportHtml(report);
        document.body.appendChild(container);
        setTimeout(() => {
          window.html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' }).then(canvas => {
            const imgData = canvas.toDataURL('image/jpeg', 1.0);
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const w = pdf.internal.pageSize.getWidth();
            const h = (canvas.height * w) / canvas.width;
            pdf.addImage(imgData, 'JPEG', 0, 0, w, h);
            pdf.save(`Rapport_${selectedItem?.code || 'ITIL'}_${report.code_metier || 'DOC'}.pdf`);
            document.body.removeChild(container);
          }).catch(err => { console.error(err); document.body.removeChild(container); });
        }, 1000);
      };
      document.head.appendChild(s2);
    };
    document.head.appendChild(s1);
  };

  // ─────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────
  return (
    <div className="rep-page">
      {/* Header */}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#fff7ed', color: '#f59e0b', borderColor: '#ffedd5' }}>
            <FiFileText />
          </div>
          <div className="premium-header-text">
            <h1>Centre de Rapports</h1>
            <p>Visualisation centralisée des rapports d'exécution, d'audit et de post-implémentation</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button className="btn-create-premium" onClick={fetchData} style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}>
            <FiRefreshCw /> Actualiser
          </button>
        </div>
      </div>

      {/* KPIs */}
      {renderKPIs()}

      <div className="rep-layout">
        {/* Sidebar */}
        <div className="rep-sidebar">
          <div className="rep-sidebar-title">
            Éléments documentés
            <span className="rep-sidebar-badge">{filteredItems.length}</span>
          </div>

          <div style={{ padding: '1rem', borderBottom: '1px solid #f1f5f9' }}>
            <div className="rep-search-box">
              <FiSearch size={14} />
              <input
                type="text"
                placeholder="Filtrer par code ou titre..."
                className="rep-search-input"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="rep-scroll-list">
            {loading ? (
              <div className="rep-loading">
                <div className="rep-spinner"></div>
                <span>Chargement...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="rep-placeholder">
                <div className="rep-empty-box">
                  <FiAlertCircle className="rep-empty-icon" />
                  <p>Aucun rapport trouvé pour ce filtre.</p>
                </div>
              </div>
            ) : (
              filteredItems.map(item => (
                <div
                  key={`${item.type}-${item.code}`}
                  className={`rep-item ${selectedItem?.code === item.code ? 'selected' : ''}`}
                  onClick={() => loadItemDetails(item, item.type)}
                >
                  <div className="rep-item-icon">
                    {item.type === 'RFC'  && <FiLayers />}
                    {item.type === 'CHG'  && <FiActivity />}
                    {item.type === 'TASK' && <FiCheckSquare />}
                  </div>
                  <div className="rep-item-body">
                    <div className="rep-item-title">{item.label}</div>
                    <div className="rep-item-meta">
                      <span className={`rep-badge-type ${item.type.toLowerCase()}`}>{item.type}</span>
                      <span>#{item.code}</span>
                    </div>
                  </div>
                  <FiChevronRight size={16} color="#cbd5e1" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Workspace */}
        <div className="rep-workspace">
          <div className="rep-workspace-inner">
            {selectedItem ? (
              <>
                <div className="rep-workspace-header">
                  <div className="rep-header-main">
                    <span className={`rep-badge-type ${selectedItem.reportType.toLowerCase()}`}>{selectedItem.reportType}</span>
                    <h2>{selectedItem.label}</h2>
                    <div className="rep-item-meta">
                      <span><FiHash /> {selectedItem.code}</span>
                      <span><FiCalendar /> Créé le {new Date(selectedItem.date).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <button className="cm-close-btn" onClick={() => setSelectedItem(null)}><FiX /></button>
                </div>

                <div className="rep-content">
                  {reportsLoading ? (
                    <div className="rep-loading">
                      <div className="rep-spinner"></div>
                      <span>Génération de la vue...</span>
                    </div>
                  ) : itemReports.length === 0 ? (
                    <div className="rep-placeholder">
                      <p>Aucun rapport détaillé disponible pour cet élément.</p>
                    </div>
                  ) : (
                    <div className="rep-doc-view">
                      {itemReports.map((report, idx) => (
                        <div key={idx} className={`rep-card status-${report.status || 'neutral'}`} style={{ marginBottom: '2rem' }}>
                          <div className="rep-doc-header">
                            <div>
                              <span className={`rep-badge-type status-${report.status || 'neutral'}`} style={{ marginBottom: '0.5rem' }}>
                                {report.type_rapport || (selectedItem.reportType === 'TASK' ? 'Journal' : 'Rapport')}
                                {report.status === 'success'  && ' — SUCCÈS'}
                                {report.status === 'incident' && ' — INCIDENT'}
                              </span>
                              <h3>{report.titre_rapport || report.titre_journal || "Rapport d'exécution"}</h3>
                            </div>
                            <div className="rep-doc-date">
                              <FiClock /> {new Date(report.date_generation || report.date_entree || Date.now()).toLocaleString()}
                            </div>
                          </div>

                          <div className="rep-section">
                            <div className="rep-section-title"><FiInfo /> Détails de l'entrée</div>
                            <div className="rep-grid-info">
                              <div className="rep-info-item">
                                <label>Code Rapport</label>
                                <span>{report.code_metier || 'DOC-AUTO'}</span>
                              </div>
                              <div className="rep-info-item">
                                <label>Généré par</label>
                                <span>{selectedItem?.changeManager?.nom_user || selectedItem?.implementeur?.nom_user || 'Système'}</span>
                              </div>
                              <div className="rep-info-item">
                                <label>Implémenteur Responsable</label>
                                <span>{selectedItem?.implementeur?.nom_user || selectedItem?.changeManager?.nom_user || 'Non assigné'}</span>
                              </div>
                              <div className="rep-info-item">
                                <label>Statut Final</label>
                                <span>{selectedItem?.statut?.libelle_statut || selectedItem?.statut?.code_statut || 'Non défini'}</span>
                              </div>
                            </div>
                          </div>

                          <div className="rep-section">
                            <div className="rep-section-title"><FiFileText /> Contenu du rapport</div>
                            <div className="rep-body-content">
                              {report.contenu_rapport || report.description || 'Aucun contenu disponible.'}
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem', gap: '1rem' }}>
                            <button className="rep-btn-view"          onClick={() => handlePrintReport(report)}>   <FiPrinter />  Imprimer    </button>
                            <button className="rep-btn-download-red"  onClick={() => handleDownloadReport(report)}><FiDownload /> Télécharger </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="rep-placeholder">
                <div className="rep-empty-box">
                  <div className="rep-empty-icon"><FiFileText /></div>
                  <h2>Sélectionnez un document</h2>
                  <p>Choisissez un élément dans la liste de gauche pour consulter ses rapports et journaux associés.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;