import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  FiGrid, FiCheckSquare, FiLogOut,
  FiChevronDown, FiActivity,
  FiUser, FiMail, FiBriefcase, FiShield, FiX
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './ImplementerLayout.css';
import './LayoutCommon.css';

const ImplementerLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const profileRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="impl-layout">
      {/* Sidebar - Teal/Emerald Theme */}
      <aside className="impl-sidebar">
        <div className="impl-sidebar-header">
          <div className="impl-logo-container">
            <span className="impl-logo-text">ITIL Implementer</span>
          </div>
        </div>

        <nav className="impl-sidebar-nav">
          <NavLink to="/implementer/tasks" className={({ isActive }) => `impl-nav-item ${isActive ? 'active' : ''}`}>
            <FiCheckSquare className="impl-nav-icon" />
            <span>Mes Tâches</span>
            <span className="impl-nav-badge">4</span>
          </NavLink>

          <NavLink to="/implementer/history" className={({ isActive }) => `impl-nav-item ${isActive ? 'active' : ''}`}>
            <FiActivity className="impl-nav-icon" />
            <span>Historique</span>
          </NavLink>

          <NavLink to="/implementer" end className={({ isActive }) => `impl-nav-item ${isActive ? 'active' : ''}`}>
            <FiGrid className="impl-nav-icon" />
            <span>Tableau de Bord</span>
          </NavLink>

          <div className="sidebar-logout-container">
            <button 
              onClick={handleLogout}
              className="common-logout-btn"
            >
              <FiLogOut className="impl-nav-icon" />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>

        <div className="impl-sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            <span>DMSI System • v1.0</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="impl-main-content">
        <header className="impl-header">
          <div className="header-left">
             <h2 className="impl-page-title">Espace Implémenteur</h2>
          </div>

          <div className="header-right">
            <div 
              className={`impl-user-profile ${showDropdown ? 'open' : ''}`} 
              onClick={() => setShowDropdown(!showDropdown)}
              ref={profileRef}
            >
                <div className="impl-user-text">
                    <span className="impl-user-name">{user?.prenom_user} {user?.nom_user}</span>
                    <span className="impl-user-role">Implémenteur Technique</span>
                </div>
                <div className="impl-avatar">
                   {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
                </div>
                <FiChevronDown className={`impl-chevron ${showDropdown ? 'rotated' : ''}`} />

                {showDropdown && (
                  <div className="impl-profile-dropdown" onClick={e => e.stopPropagation()}>
                    {/* Header du profil */}
                    <div className="profile-dropdown-header">
                      <div className="profile-dropdown-avatar">
                        {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
                      </div>
                      <div className="profile-dropdown-identity">
                        <strong>{user?.prenom_user} {user?.nom_user}</strong>
                        <span className="profile-role-badge">Implémenteur</span>
                      </div>
                    </div>

                    {/* Détails du profil */}
                    <div className="profile-dropdown-details">
                      <div className="profile-detail-row">
                        <FiMail className="detail-icon" />
                        <span>{user?.email_user || 'N/A'}</span>
                      </div>
                      <div className="profile-detail-row">
                        <FiShield className="detail-icon" />
                        <span>{user?.roles?.[0] || 'IMPLEMENTEUR'}</span>
                      </div>
                      {user?.direction && (
                        <div className="profile-detail-row">
                          <FiBriefcase className="detail-icon" />
                          <span>{user.direction}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="profile-dropdown-actions">
                      <button className="profile-action-btn" onClick={() => { setShowDropdown(false); navigate('/profile'); }} style={{ color: '#047857' }}>
                        <FiUser /> Mon Profil
                      </button>
                      <button className="profile-action-btn logout" onClick={handleLogout}>
                        <FiLogOut /> Déconnexion
                      </button>
                    </div>
                  </div>
                )}
            </div>
          </div>
        </header>

        <div className="impl-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ImplementerLayout;
