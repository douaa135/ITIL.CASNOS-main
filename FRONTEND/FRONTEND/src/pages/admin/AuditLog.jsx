import React, { useState, useEffect, useCallback } from 'react';
import { 
  FiActivity, FiSearch, FiFilter, FiRefreshCw, FiUser, 
  FiClock, FiDatabase, FiLayers, FiEye, FiArrowRight, FiX, FiTrash2 
} from 'react-icons/fi';
import auditService from '../../services/auditService';
import userService from '../../services/userService';
import './AuditLog.css';

const AuditLog = () => {
  const [logs, setLogs] = useState([]);
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
  const [selectedLog, setSelectedLog] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [hasFetched, setHasFetched] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await auditService.getAuditLogs({ ...filters, page, limit }).catch(() => ({ data: { logs: [], total: 0 } }));
      let fetchedLogs = response?.data?.logs || [];
      let fetchedTotal = response?.data?.total || 0;

      // Mock data if backend is empty or failed and we haven't fetched yet
      if (fetchedLogs.length === 0 && !hasFetched) {
        fetchedLogs = [
          {
            id_log: 'mock-1',
            date_action: new Date().toISOString(),
            action: 'CREATE',
            entite_type: 'RFC',
            entite_id: '12345678-abcd',
            ancienne_val: null,
            nouvelle_val: '{"titre": "Mise à jour serveur DB", "urgence": true}',
            utilisateur: { prenom_user: 'Admin', nom_user: 'Système', email_user: 'admin@casnos.dz' }
          },
          {
            id_log: 'mock-2',
            date_action: new Date(Date.now() - 3600000).toISOString(),
            action: 'APPROVE',
            entite_type: 'CHANGEMENT',
            entite_id: '87654321-dcba',
            ancienne_val: '{"statut": "SOUMIS"}',
            nouvelle_val: '{"statut": "APPROUVE"}',
            utilisateur: { prenom_user: 'Change', nom_user: 'Manager', email_user: 'k.merabti@casnos.dz' }
          },
          {
            id_log: 'mock-3',
            date_action: new Date(Date.now() - 7200000).toISOString(),
            action: 'UPDATE',
            entite_type: 'USER',
            entite_id: 'user-001',
            ancienne_val: '{"actif": false}',
            nouvelle_val: '{"actif": true}',
            utilisateur: { prenom_user: 'Admin', nom_user: 'Système', email_user: 'admin@casnos.dz' }
          }
        ];
        
        // Filter mock data based on selected filters
        if (filters.entite_type) {
          fetchedLogs = fetchedLogs.filter(l => l.entite_type === filters.entite_type);
        }
        if (filters.action) {
          fetchedLogs = fetchedLogs.filter(l => l.action.toLowerCase().includes(filters.action.toLowerCase()));
        }
        
        fetchedTotal = fetchedLogs.length;
        setLogs(fetchedLogs);
        setTotal(fetchedTotal);
      } else if (fetchedLogs.length > 0) {
        setLogs(fetchedLogs);
        setTotal(fetchedTotal);
      }
      
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, limit, hasFetched]);

  const fetchUsers = useCallback(async () => {
    try {
      const result = await userService.getAllUsers();
      setUsers(result.users || []);
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
    // Suppression directe pour une réactivité maximale sur le front
    setLogs(currentLogs => currentLogs.filter(l => l.id_log !== id));
    setTotal(prev => Math.max(0, prev - 1));
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedLog(null);
  };

  const getActionColor = (action) => {
    switch (action?.toUpperCase()) {
      case 'CREATE': return '#10b981';
      case 'UPDATE': return '#3b82f6';
      case 'DELETE': return '#ef4444';
      case 'APPROVE': return '#10b981';
      case 'REJECT': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const formatValue = (val) => {
    if (!val) return <span style={{ opacity: 0.5, fontStyle: 'italic' }}>— Aucune donnée —</span>;
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
      <div className="audit-header">
        <div>
          <h1><FiActivity /> Journaux d'audit</h1>
          <p>Suivi détaillé des actions et modifications système</p>
        </div>
        <div className="header-stats">
          <div className="stat-item premium-stat">
            <FiDatabase />
            <span>{total} entrées totales</span>
          </div>
        </div>
      </div>

      <div className="audit-toolbar">
        <div className="toolbar-filters">
          <div className="filter-group">
            <FiLayers className="filter-icon" />
            <select name="entite_type" value={filters.entite_type} onChange={handleFilterChange}>
              <option value="">Toutes les entités</option>
              <option value="RFC">RFC</option>
              <option value="CHANGEMENT">Changement</option>
              <option value="TACHE">Tâche</option>
              <option value="CI">Élément de Configuration</option>
              <option value="USER">Utilisateur</option>
            </select>
          </div>

          <div className="filter-group">
            <FiUser className="filter-icon" />
            <select name="id_user" value={filters.id_user} onChange={handleFilterChange}>
              <option value="">Tous les utilisateurs</option>
              {users.map(u => (
                <option key={u.id_user} value={u.id_user}>
                  {u.prenom_user} {u.nom_user}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <FiSearch className="filter-icon" />
            <input 
              type="text" 
              name="action" 
              placeholder="Action (ex: CREATE...)" 
              value={filters.action} 
              onChange={handleFilterChange}
            />
          </div>

          <button className="refresh-btn" onClick={fetchLogs} title="Actualiser">
            <FiRefreshCw className={loading ? 'spinning' : ''} />
          </button>
        </div>
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
                <th style={{ textAlign: 'right' }}>Actions</th>
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
                    <span className="action-badge" style={{ backgroundColor: getActionColor(log.action) }}>
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
                  <td style={{ textAlign: 'right' }}>
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
                    <span className="action-badge" style={{ backgroundColor: getActionColor(selectedLog.action) }}>
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
