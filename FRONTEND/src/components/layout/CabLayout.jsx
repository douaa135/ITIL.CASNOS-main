import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  FiGrid, FiFileText, FiTarget,
  FiLogOut, FiMenu, FiChevronDown, FiUser, FiCalendar
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './CabLayout.css';
import './LayoutCommon.css';

const CabLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="cab-container">
            {/* Sidebar */}
            <aside className={`cab-sidebar ${mobileOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="logo-box">
                        <img src="/logo.png" alt="CASNOS Logo" className="cab-sidebar-logo" />
                        <div className="logo-text">
                            <span className="brand">Membre CAB</span>
                            <span className="role-tag">Comité Consultatif</span>
                        </div>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    <NavLink to="/cab" end className={({ isActive }) => `cab-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <FiGrid className="nav-icon" />
                        <span className="nav-label">Tableau de Bord</span>
                    </NavLink>

                    <NavLink to="/cab/rfcs" className={({ isActive }) => `cab-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <FiTarget className="nav-icon" />
                        <span className="nav-label">Évaluation RFCs</span>
                    </NavLink>

                    <NavLink to="/cab/meetings" className={({ isActive }) => `cab-nav-item ${isActive ? 'active' : ''}`} onClick={() => setMobileOpen(false)}>
                        <FiCalendar className="nav-icon" />
                        <span className="nav-label">Réunions & PV</span>
                    </NavLink>

                    <div className="sidebar-logout-container" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <button 
                            onClick={handleLogout}
                            className="common-logout-btn"
                        >
                            <span className="nav-icon"><FiLogOut /></span>
                            <span className="nav-label">Déconnexion</span>
                        </button>
                    </div>
                </nav>
            </aside>

            {/* Main Content Area */}
            <main className="cab-main">
                {/* Header */}
                <header className="cab-header">
                    <div className="header-left">
                        <button className="mobile-menu-btn" onClick={() => setMobileOpen(!mobileOpen)}><FiMenu /></button>
                        <h2 className="header-title">Espace CAB</h2>
                    </div>

                    <div className="header-right">
                        <div 
                          className={`manager-user-profile ${showDropdown ? 'open' : ''}`} 
                          onClick={() => setShowDropdown(!showDropdown)}
                          style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                        >
                            <div className="user-info" style={{ textAlign: 'right' }}>
                                <span className="user-name" style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: '#1e293b' }}>{user?.prenom_user} {user?.nom_user}</span>
                                <span className="user-role-label" style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: '500' }}>Expert CAB</span>
                            </div>
                            <div className="avatar-premium" style={{ background: '#1e3a8a', color: 'white' }}>
                                {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
                                <div className="dropdown-arrow-premium" style={{ background: 'white', color: '#1e3a8a' }}>
                                    <FiChevronDown />
                                </div>
                            </div>

                            {showDropdown && (
                               <div className="user-option-menu" style={{ position: 'absolute', top: '100%', right: '0', background: 'white', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', borderRadius: '8px', overflow: 'hidden', minWidth: '200px', zIndex: 50, border: '1px solid #e2e8f0', marginTop: '10px' }}>
                                 <div className="dropdown-email" style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
                                    {user?.email_user}
                                </div>
                                 <button className="menu-item-btn" style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#334155' }} onClick={() => { setShowDropdown(false); navigate('/profile'); }}>
                                  <FiUser /> <span>Mon Profil</span>
                                </button>
                                 <button className="menu-item-btn red" style={{ width: '100%', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444' }} onClick={handleLogout}>
                                  <FiLogOut /> <span>Déconnexion</span>
                                </button>
                              </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="cab-inner-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default CabLayout;
