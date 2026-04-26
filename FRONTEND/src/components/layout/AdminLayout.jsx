import React, { useState } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { 
  FiGrid, FiUsers, FiLogOut, FiSettings, 
  FiBell, FiChevronDown, FiMenu,
  FiDatabase, FiFileText, FiSliders, FiTool, FiUser
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './AdminLayout.css';
import './LayoutCommon.css';

const AdminLayout = ({ children }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="admin-layout">
      {/* Sidebar - Blue Premium */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-logo-container">
            <img src="/logo.png" alt="CASNOS Logo" className="admin-sidebar-logo" />
            <span className="admin-logo-text">ITIL Admin</span>
          </div>
        </div>

        <nav className="admin-sidebar-nav">
          <NavLink to="/admin-system/users" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiUsers className="admin-nav-icon" />
            <span>Comptes et RBAC</span>
          </NavLink>

          <NavLink to="/admin-system/change-types" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiSliders className="admin-nav-icon" />
            <span>Types Changement</span>
          </NavLink>

          <NavLink to="/admin-system/cis" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiDatabase className="admin-nav-icon" />
            <span>Référentiel CIs</span>
          </NavLink>

          <NavLink to="/admin-system/audit" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiFileText className="admin-nav-icon" />
            <span>Journaux d'Audit</span>
          </NavLink>

          <NavLink to="/admin-system" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
            <FiGrid className="admin-nav-icon" />
            <span>Tableau de Bord</span>
          </NavLink>

          <div className="sidebar-logout-container">
            <button 
              onClick={handleLogout}
              className="common-logout-btn"
            >
              <FiLogOut className="admin-nav-icon" />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>

        <div className="admin-sidebar-footer-hint" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            <span>DMSI System • v1.0</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main-content">
        {/* Header Bleu Administration */}
        <header className="admin-header">
          <div className="header-left">
            <button className="mobile-menu-btn"><FiMenu /></button>
            <h2 className="admin-page-title">Espace Administration</h2>
          </div>

          <div className="header-right">
            <div className="header-actions">
                <button className="admin-action-btn"><FiBell /><span className="badge"></span></button>
            </div>
            
            <div 
              className={`admin-user-profile ${showDropdown ? 'open' : ''}`} 
              onClick={() => setShowDropdown(!showDropdown)}
              style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1000 }}
            >
                <div className="admin-user-info" style={{ textAlign: 'right' }}>
                    <span className="admin-user-name" style={{ display: 'block', fontWeight: '700', fontSize: '0.95rem', color: 'white' }}>{user?.prenom_user} {user?.nom_user}</span>
                    <span className="admin-user-role" style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>Administrateur Système</span>
                </div>
                <div className="avatar-premium">
                   {(user?.prenom_user?.[0] || 'A') + (user?.nom_user?.[0] || '')}
                   <div className="dropdown-arrow-premium">
                      <FiChevronDown />
                   </div>
                </div>

                {showDropdown && (
                  <div className="sd-logout-dropdown">
                    <div className="dropdown-email">
                        {user?.email_user}
                    </div>
                    <button className="sd-logout-dropdown-item" onClick={() => { setShowDropdown(false); navigate('/profile'); }} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0.75rem 0.5rem', border: 'none', background: 'transparent', color: '#1e40af', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontWeight: '600' }}>
                      <FiUser /> <span>Mon Profil</span>
                    </button>
                    <button className="sd-logout-dropdown-item logout" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '0.75rem 0.5rem', border: 'none', background: 'transparent', color: '#ef4444', cursor: 'pointer', borderRadius: '8px', textAlign: 'left', fontWeight: '600' }}>
                      <FiLogOut /> <span>Déconnexion</span>
                    </button>
                  </div>
                )}
            </div>
          </div>
        </header>

        <div className="admin-content-inner">
          {children}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
