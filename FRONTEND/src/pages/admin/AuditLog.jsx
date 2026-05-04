import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiActivity, FiSearch, FiFilter, FiRefreshCw, FiUser, 
  FiClock, FiDatabase, FiLayers, FiEye, FiArrowRight, FiX, FiTrash2, FiCheckCircle, FiAlertTriangle, FiCalendar, FiFileText, FiPrinter, FiDownload
} from 'react-icons/fi';
import auditService from '../../services/auditService';
import userService from '../../services/userService';
import './AuditLog.css';

// ── Toast Inline (Partagé entre les modules admin) ─────────────
const Toast = ({ msg, type, onClose }) => (
  <div className={`toast-notification ${type}`}>
    <div className="toast-content">
      {type === 'success' ? <FiCheckCircle /> : <FiAlertTriangle />}
      <span>{msg}</span>
    </div>
    <button onClick={onClose} className="toast-close"><FiX /></button>
  </div>
);

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
  const [toast, setToast] = useState({ msg: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({
    entite_type: '',
    id_user: '',
    action: ''
  });
  const [search,     setSearch]     = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, data: null, loading: false });
  const [hasFetched, setHasFetched] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = {
        page,
        limit,
        entite_type: filterType || undefined,
        id_user: filterUser || undefined,
        action: search.trim() || undefined
      };
      
      const response = await auditService.getAuditLogs(activeFilters);
      console.log('Audit logs response:', response);

      // Extraction ultra-résiliente
      let fetchedLogs = [];
      let fetchedTotal = 0;

      if (response) {
        // Cas 1: Structure standard { success, data: { logs, total } }
        if (response.data && response.data.logs) {
          fetchedLogs = response.data.logs;
          fetchedTotal = response.data.total || fetchedLogs.length;
        } 
        // Cas 2: Structure plate { logs, total } (si l'intercepteur a déjà déballé .data.data)
        else if (response.logs) {
          fetchedLogs = response.logs;
          fetchedTotal = response.total || fetchedLogs.length;
        }
        // Cas 3: Retour direct d'un tableau
        else if (Array.isArray(response.data)) {
          fetchedLogs = response.data;
          fetchedTotal = fetchedLogs.length;
        }
        else if (Array.isArray(response)) {
          fetchedLogs = response;
          fetchedTotal = fetchedLogs.length;
        }
      }
      
      setLogs(fetchedLogs);
      setTotal(fetchedTotal);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setToast({ msg: error.message || 'Erreur lors de la récupération des journaux d\'audit.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [filterType, filterUser, search, page, limit]);

  const fetchUsers = useCallback(async () => {
    try {
      const result = await userService.getAllUsers({ limit: 1000 });
      // userService returns { users, total, pages }
      const list = result?.users || [];
      setUsers(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1); // Reset to first page on filter change
  };

  const handleRowClick = (log) => {
    setSelectedLog(log);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const handleDeleteLog = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Voulez-vous vraiment supprimer cette entrée du journal d\'audit ?')) return;
    setLogs(currentLogs => currentLogs.filter(l => l.id_log !== id));
    setTotal(prev => Math.max(0, prev - 1));
  };



  const handleGenerateReport = async (e, log) => {
    e.stopPropagation();
    if (log.entite_type !== 'RFC') {
      setReportModal({ open: true, error: "Le rapport d'audit n'est disponible que pour les entités de type RFC.", data: null, loading: false });
      return;
    }

    setReportModal({ open: true, error: null, data: null, loading: true });
    try {
      console.log('[AuditLog] Generating report for RFC ID:', log.entite_id);
      
      // Extraction résiliente (le backend renvoie { success, data: { rapport } })
      // L'intercepteur axiosClient.js retourne déjà response.data
      const result = await auditService.getFullRfcReport(log.entite_id);
      console.log('[AuditLog] Report raw result:', result);
      
      // On cherche l'objet rapport soit dans .data.rapport, soit directement dans .rapport
      const rapport = result?.data?.rapport || result?.rapport || (result?.id_rfc ? result : null);
      
      if (!rapport) {
        console.error('[AuditLog] No rapport object found in result:', result);
        throw new Error('Les données du rapport sont introuvables ou le format est incorrect.');
      }

      if (!rapport.audit_trail || !Array.isArray(rapport.audit_trail)) {
        console.error('[AuditLog] audit_trail is missing or not an array:', rapport);
        throw new Error("L'historique d'audit (audit_trail) est manquant pour cette RFC.");
      }
      
      setReportModal({ open: true, data: rapport, loading: false });
    } catch (error) {
      console.error('Error generating audit report:', error);
      setToast({ msg: error.message || 'Erreur lors de la génération du rapport.', type: 'error' });
      setReportModal({ open: false, data: null, loading: false });
    }
  };

  const getActionClass = (action) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return 'action-create';
      case 'UPDATE': return 'action-update';
      case 'DELETE': return 'action-delete';
      case 'APPROVE': return 'action-approve';
      case 'REJECT': return 'action-reject';
      default: return 'action-default';
    }
  };

  const formatValue = (val) => {
    if (!val) return <span className="audit-empty-value">— Aucune donnée —</span>;
    let data = val;
    if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
      try {
        data = JSON.parse(val);
      } catch {
        return val;
      }
    }
    
    if (typeof data === 'object' && data !== null) {
      return (
        <div className="audit-data-list">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="audit-data-row">
              <span className="audit-data-key">{key.replace(/_/g, ' ')}</span>
              <span className="audit-data-val">
                {typeof value === 'boolean' ? (value ? 'Oui' : 'Non') : String(value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return String(data);
  };

  return (
    <div className="audit-page">
      {toast.msg && (
        <Toast 
          msg={toast.msg} 
          type={toast.type} 
          onClose={() => setToast({ msg: '', type: '' })} 
        />
      )}
      <div className="premium-header-card">
        <div className="premium-header-left">
          <div className="premium-header-icon" style={{ background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}><FiActivity /></div>
          <div className="premium-header-text">
            <h1>Journaux d'audit</h1>
            <p>Consultez les journaux d'audit et supervisez les modifications effectuées sur le système ·</p>
          </div>
        </div>
        <div className="premium-header-actions">
          <button 
            className="btn-create-premium" 
            onClick={fetchLogs} 
            disabled={loading}
            style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: 'white' }}
          >
            <FiRefreshCw className={loading ? 'spin' : ''} /> Actualiser
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '220px' }}>
            <FiSearch size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}/>
            <input 
              type="text" 
              name="action" 
              placeholder="Action (ex: CREATE...)" 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{
                width: '100%', padding: '0.6rem 0.9rem 0.6rem 2.4rem',
                borderRadius: '10px', border: '1.5px solid #e2e8f0',
                fontSize: '0.9rem', boxSizing: 'border-box',
                transition: 'border-color 0.2s',
              }}
            />
          </div>
            <FiUser className="filter-icon" />
            <select 
              name="id_user" 
              value={filterUser} 
              onChange={e => { setFilterUser(e.target.value); setPage(1); }}
              style={{
                padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
                minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
              }}
            >
              <option value="">Tous les utilisateurs</option>
              {users.map(u => (
                <option key={u.id_user} value={u.id_user}>
                  {u.prenom_user} {u.nom_user}
                </option>
              ))}
            </select>

            <FiLayers className="filter-icon" />
            <select 
              name="entite_type" 
              value={filterType} 
              onChange={e => { setFilterType(e.target.value); setPage(1); }}
              style={{
                padding: '0.6rem 2.2rem 0.6rem 1rem', borderRadius: '10px', border: '1.5px solid #e2e8f0',
                fontSize: '0.875rem', background: '#f8fafc', cursor: 'pointer', fontWeight: '500',
                minWidth: '150px', appearance: 'none', WebkitAppearance: 'none',
                backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center',
              }}
              >
              <option value="">Toutes les entités</option>
              <option value="RFC">RFC</option>
              <option value="CHANGEMENT">Changement</option>
              <option value="TACHE">Tâche</option>
              <option value="CI">Élément de Configuration</option>
              <option value="USER">Utilisateur</option>
            </select>
          {(search || filterType || filterUser) && (
          <button 
            onClick={() => { setSearch(''); setFilterType(''); setFilterUser(''); setPage(1); }}
            style={{
              padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid #7c3aed',
              fontSize: '0.875rem', background: '#f5f3ff', color: '#7c3aed', 
              cursor: 'pointer', fontWeight: '600'
            }}
          >
            Réinitialiser
          </button>
          )}
        </div>

      <div className="audit-table-container glass-card">
        {loading ? (
          <div className="loading-state">
            <FiRefreshCw className="spinning" />
            <p>Chargement des journaux...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="empty-state">
            <FiDatabase />
            <p>Aucun journal trouvé pour ces critères.</p>
          </div>
        ) : (
          <table className="audit-table">
            <thead>
              <tr>
                <th className="sticky-col-first">Utilisateur & Horodatage</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Ancienne Valeur</th>
                <th className="th-new-val">Nouvelle Valeur</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id_log} onClick={() => handleRowClick(log)} className="audit-row" style={{ cursor: 'pointer' }}>
                  <td className="td-user sticky-col-first">
                    <div className="user-avatar">
                      {log.utilisateur?.prenom_user?.[0]}{log.utilisateur?.nom_user?.[0]}
                    </div>
                    <span>{log.utilisateur?.prenom_user} {log.utilisateur?.nom_user}</span>
                  </td>
                  <td className="td-date">
                    <FiClock />
                    {new Date(log.date_action).toLocaleString()}
                  </td>
                  <td>
                    <span className={`action-badge ${getActionClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="td-entite">
                    <span className={`entite-badge ${log.entite_type?.toLowerCase()}`}>
                      {log.entite_type}
                    </span>
                  </td>
                  <td className="td-old-val">
                    <div className="audit-val-container ancient-val-box">{formatValue(log.ancienne_val)}</div>
                  </td>
                  <td className="td-new-val">
                    <div className="audit-val-container premium-new-box">{formatValue(log.nouvelle_val)}</div>
                  </td>
                  <td className="text-right">
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button 
                        className="action-circle-btn report" 
                        onClick={(e) => handleGenerateReport(e, log)}
                        title="Générer Rapport d'Audit"
                        style={{ background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe' }}
                      >
                        <FiFileText size={14} />
                      </button>
                      <button 
                        className="action-circle-btn delete" 
                        onClick={(e) => handleDeleteLog(e, log.id_log)}
                        title="Supprimer"
                      >
                        <FiTrash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="audit-footer">
          <div className="pagination">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
            >Précédent</button>
            <span>Page {page} sur {Math.ceil(total / limit)}</span>
            <button 
              disabled={page >= Math.ceil(total / limit)} 
              onClick={() => setPage(p => p + 1)}
            >Suivant</button>
          </div>
        </div>
      </div>

      {isModalOpen && selectedLog && (
        <div className="modal-backdrop-cab" onClick={closeModal}>
          <div className="modal-box-cab glass-card-cab audit-detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-top-rfc-style">
              <div className="modal-header-content">
                <FiActivity />
                <h3>Détails du Journal d'Audit</h3>
              </div>
              <button className="modal-close-btn" onClick={closeModal}><FiX /></button>
            </div>

            <div className="modal-body-rfc-style">
              <div className="audit-detail-grid">
                <div className="detail-item full-width">
                  <label><FiClock /> Date & Heure</label>
                  <p>{new Date(selectedLog.date_action).toLocaleString()}</p>
                </div>

                <div className="detail-item">
                  <label><FiUser /> Utilisateur</label>
                  <div className="user-info-detail">
                    <div className="user-avatar">
                      {selectedLog.utilisateur?.prenom_user?.[0]}{selectedLog.utilisateur?.nom_user?.[0]}
                    </div>
                    <div>
                      <p className="user-name">{selectedLog.utilisateur?.prenom_user} {selectedLog.utilisateur?.nom_user}</p>
                      <p className="user-email">{selectedLog.utilisateur?.email_user}</p>
                    </div>
                  </div>
                </div>

                <div className="detail-item">
                  <label><FiActivity /> Action & Entité</label>
                  <div className="action-entite-info">
                    <span className={`action-badge ${getActionClass(selectedLog.action)}`}>
                      {selectedLog.action}
                    </span>
                    <span className={`entite-badge ${selectedLog.entite_type?.toLowerCase()}`}>
                      {selectedLog.entite_type}
                    </span>
                  </div>
                </div>

                <div className="detail-item full-width">
                  <label><FiLayers /> ID de l'Entité</label>
                  <p className="td-id">{selectedLog.entite_id}</p>
                </div>

                <div className="detail-values-comparison">
                  <div className="value-box old">
                    <label>Ancienne Valeur</label>
                    <div className="value-content">
                      {formatValue(selectedLog.ancienne_val)}
                    </div>
                  </div>
                  <div className="value-box new">
                    <label>Nouvelle Valeur</label>
                    <div className="value-content premium-new-box">
                      {formatValue(selectedLog.nouvelle_val)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer-rfc-style">
              <button className="btn-close-audit" onClick={closeModal}>Fermer</button>
            </div>
          </div>
        </div>
      )}

      {reportModal.open && (
        <div className="modal-backdrop-cab" onClick={() => setReportModal({ open: false, data: null, loading: false })}>
          <div className="modal-box-cab glass-card-cab audit-report-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px', width: '95%' }}>
            <div className="modal-top-rfc-style" style={{ 
              background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              position: 'relative',
              padding: '1.5rem 2.5rem 1.5rem 1.5rem' // More padding on right for X
            }}>
              <div className="modal-header-content">
                <FiFileText style={{ color: 'white' }} />
                <h3 style={{ color: 'white', margin: 0 }}>Rapport d'Audit Complet - {reportModal.data?.resume?.code_rfc || 'Chargement...'}</h3>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <button 
                  onClick={() => window.print()} 
                  className="no-print"
                  style={{ 
                    background: 'rgba(255,255,255,0.2)', 
                    border: '1px solid rgba(255,255,255,0.4)', 
                    color: 'white', 
                    padding: '0.4rem 0.8rem', 
                    borderRadius: '8px', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.5rem', 
                    fontSize: '0.8rem', 
                    fontWeight: '600' 
                  }}
                >
                  <FiPrinter /> Imprimer
                </button>
                <button 
                  onClick={() => setReportModal({ open: false, data: null, loading: false })} 
                  className="no-print"
                  style={{ 
                    position: 'absolute',
                    top: '1.2rem',
                    right: '1.2rem',
                    background: 'rgba(0,0,0,0.1)', 
                    border: 'none', 
                    color: 'white', 
                    cursor: 'pointer', 
                    display: 'flex', 
                    padding: '0.4rem',
                    borderRadius: '50%',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.2)'}
                  onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.1)'}
                >
                  <FiX size={20} />
                </button>
              </div>
            </div>

            <div className="modal-body-rfc-style report-print-area">
              {reportModal.loading ? (
                <div className="loading-state">
                  <FiRefreshCw className="spinning" />
                  <p>Génération du rapport d'audit en cours...</p>
                </div>
              ) : reportModal.error ? (
                <div className="empty-state" style={{ color: '#dc2626' }}>
                  <FiAlertTriangle size={48} />
                  <h3 style={{ marginTop: '1rem' }}>Erreur de génération</h3>
                  <p>{reportModal.error}</p>
                </div>
              ) : reportModal.data ? (
                <div className="audit-report-content">
                  <div className="report-header-info">
                    <div className="report-section-title">Informations RFC</div>
                    <div className="report-grid">
                      <div className="report-item">
                        <label>Code RFC</label>
                        <span>{reportModal.data.resume.code_rfc}</span>
                      </div>
                      <div className="report-item">
                        <label>Statut Actuel</label>
                        <span className={`status-badge ${reportModal.data.resume.statut.toLowerCase()}`}>{reportModal.data.resume.libelle_statut}</span>
                      </div>
                      <div className="report-item">
                        <label>Titre</label>
                        <span>{reportModal.data.resume.titre_rfc}</span>
                      </div>
                      <div className="report-item">
                        <label>Demandeur</label>
                        <span>{reportModal.data.resume.demandeur}</span>
                      </div>
                    </div>
                  </div>

                  <div className="report-section-title" style={{ marginTop: '2rem' }}>Journal d'Audit Détaillé (GetAuditTrailByRfc)</div>
                  <div className="report-audit-table-wrapper">
                    <table className="report-audit-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Action</th>
                          <th>Acteur</th>
                          <th>Entité</th>
                          <th>Modifications</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportModal.data.audit_trail.map((log, idx) => (
                          <tr key={idx}>
                            <td className="report-td-date">{new Date(log.date).toLocaleString()}</td>
                            <td><span className={`action-badge ${getActionClass(log.action)}`}>{log.action}</span></td>
                            <td className="report-td-actor">{log.acteur}</td>
                            <td><span className={`entite-badge ${log.entite_type.toLowerCase()}`}>{log.entite_type}</span></td>
                            <td className="report-td-diff">
                              {log.avant || log.apres ? (
                                <div className="diff-container">
                                  {log.avant && (
                                    <div className="diff-old">
                                      <div className="diff-label">Ancien</div>
                                      <div className="audit-val-container ancient-val-box">
                                        {formatValue(log.avant)}
                                      </div>
                                    </div>
                                  )}
                                  {log.apres && (
                                    <div className="diff-new premium-new-box">
                                      <div className="diff-label">Nouveau</div>
                                      <div className="audit-val-container premium-new-box" style={{ background: 'transparent', border: 'none', padding: 0, boxShadow: 'none' }}>
                                        {formatValue(log.apres)}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : <span className="no-diff">Aucun changement de valeur</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <FiAlertTriangle />
                  <p>Données du rapport indisponibles.</p>
                </div>
              )}
            </div>

            <div className="modal-footer-rfc-style no-print">
              <button className="btn-close-audit" onClick={() => setReportModal({ open: false, data: null, loading: false })}>Fermer le rapport</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLog;
