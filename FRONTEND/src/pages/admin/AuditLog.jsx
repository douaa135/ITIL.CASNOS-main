import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiActivity, FiSearch, FiFilter, FiRefreshCw, FiUser, 
  FiClock, FiDatabase, FiLayers, FiEye, FiArrowRight, FiX, FiTrash2, FiCheckCircle, FiAlertTriangle, FiCalendar
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
  const [filterType, setFilterType] = useState('ALL');
  const [filterUser, setFilterUser] = useState('ALL');
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [hasFetched, setHasFetched] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const activeFilters = {
        page,
        limit,
        entite_type: filterType !== 'ALL' ? filterType : undefined,
        id_user: filterUser !== 'ALL' ? filterUser : undefined,
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
      // Structure standard : { success, data: { data: [...] } }
      const list = result?.data?.data || result?.data || [];
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

  const handleDeleteLog = (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Voulez-vous vraiment supprimer cette entrée du journal d\'audit ?')) return;
    setLogs(currentLogs => currentLogs.filter(l => l.id_log !== id));
    setTotal(prev => Math.max(0, prev - 1));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
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
          {(search || filterType !== 'ALL' || filterUser !== 'ALL' ) && (
          <button 
            onClick={() => { setSearch(''); setFilterType('ALL'); setFilterUser('ALL');}}
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
                <th>Date & Heure</th>
                <th>Utilisateur</th>
                <th>Action</th>
                <th>Entité</th>
                <th>Ancienne Valeur</th>
                <th className="th-new-val">Nouvelle Valeur</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id_log} onClick={() => handleRowClick(log)} className="clickable-row">
                  <td className="td-date">
                    <FiClock />
                    {new Date(log.date_action).toLocaleString()}
                  </td>
                  <td className="td-user">
                    <div className="user-avatar">
                      {log.utilisateur?.prenom_user?.[0]}{log.utilisateur?.nom_user?.[0]}
                    </div>
                    <span>{log.utilisateur?.prenom_user} {log.utilisateur?.nom_user}</span>
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
                    <button 
                      className="action-circle-btn delete" 
                      onClick={(e) => handleDeleteLog(e, log.id_log)}
                      title="Supprimer"
                    >
                      <FiTrash2 size={14} />
                    </button>
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
    </div>
  );
};

export default AuditLog;
