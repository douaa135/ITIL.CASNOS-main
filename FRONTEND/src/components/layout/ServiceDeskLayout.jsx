import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  FiHome, FiSearch, FiRadio, 
  FiLogOut, FiSettings, FiBell, FiChevronDown, 
  FiMenu, FiCalendar, FiArrowUpRight, FiUser
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './ServiceDeskLayout.css';
import './LayoutCommon.css';

const ServiceDeskLayout = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={`sd-layout ${!isSidebarOpen ? 'sidebar-closed' : ''}`}>
      {/* Sidebar - ITIL Blue Theme */}
      <aside className="sd-sidebar">
        <div className="sd-sidebar-header">
          <div className="sd-logo-container">
            <div className="sd-logo-icon">SD</div>
            <span className="sd-logo-text">Service Desk</span>
          </div>
          <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <FiMenu />
          </button>
        </div>

        <nav className="sd-sidebar-nav">
          <NavLink to="/servicedesk/inquiry" className={({ isActive }) => `sd-nav-item ${isActive ? 'active' : ''}`}>
            <FiSearch className="sd-nav-icon" />
            <span>Analyse et Évaluation</span>
          </NavLink>

          <NavLink to="/servicedesk/broadcast" className={({ isActive }) => `sd-nav-item ${isActive ? 'active' : ''}`}>
            <FiRadio className="sd-nav-icon" />
            <span>Diffusions</span>
          </NavLink>

          <NavLink to="/servicedesk" end className={({ isActive }) => `sd-nav-item ${isActive ? 'active' : ''}`}>
            <FiHome className="sd-nav-icon" />
            <span>Tableau de Bord</span>
          </NavLink>

          <div className="sidebar-logout-container">
            <button 
              onClick={handleLogout}
              className="common-logout-btn"
            >
              <FiLogOut className="sd-nav-icon" />
              <span>Déconnexion</span>
            </button>
          </div>
        </nav>

        <div className="sd-sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
            <span>CASNOS ITIL v1.0</span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="sd-main-content">
        <header className="sd-header">
           <div className="header-left">
              <h2 className="sd-page-title">Portail Service Desk</h2>
           </div>

           <div className="header-right">


             <div 
               className={`sd-user-profile ${showDropdown ? 'open' : ''}`} 
               onClick={() => setShowDropdown(!showDropdown)}
             >
                  <div className="sd-user-info">
                      <span className="sd-user-name">{user?.prenom_user} {user?.nom_user}</span>
                      <span className="sd-user-role">Service Desk</span>
                  </div>
                  <div className="avatar-premium">
                     {user?.nom_user?.[0]}{user?.prenom_user?.[0]}
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

        <div className="sd-content-inner">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default ServiceDeskLayout;
