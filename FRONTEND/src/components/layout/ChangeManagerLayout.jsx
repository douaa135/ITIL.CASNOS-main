import React, { useState } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  FiGrid, FiFileText, FiCalendar, FiUsers,
  FiLogOut, FiBell, FiChevronDown, FiMenu,
  FiActivity, FiCheckSquare, FiAlertCircle, FiUser
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './ChangeManagerLayout.css';
import './LayoutCommon.css';

const ChangeManagerLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const menuItems = [
        { path: '/manager', icon: <FiGrid />, label: 'Tableau de Bord' },
        { path: '/manager/rfcs', icon: <FiFileText />, label: 'Évaluation et Impact' },
        { path: '/manager/cab', icon: <FiUsers />, label: 'Planification CAB' },
        { path: '/cab', icon: <FiShield />, label: 'CAB Dashboard' },
        { path: '/manager/implementation', icon: <FiCheckSquare />, label: 'Suivi Implémentation' },
    ];

    return (
        <div className="manager-container">
            {/* Sidebar - Managerial Blue/Slate */}
            <aside className="manager-sidebar">
                <div className="sidebar-header">
                    <div className="logo-box">
                        <img src="/logo.png" alt="CASNOS Logo" className="cm-sidebar-logo" />
                        <div className="logo-text">
                            <span className="brand">Change Manager</span>
                            <span className="role-tag">Portail Implémentation</span>
                        </div>
                    </div>
                </div>
                
                <nav className="sidebar-nav">
                    <NavLink to="/manager" end className={({ isActive }) => `manager-nav-item ${isActive ? 'active' : ''}`}>
                        <FiGrid className="nav-icon" />
                        <span className="nav-label">Tableau de Bord</span>
                    </NavLink>

                    <NavLink to="/manager/rfcs" className={({ isActive }) => `manager-nav-item ${isActive ? 'active' : ''}`}>
                        <FiFileText className="nav-icon" />
                        <span className="nav-label">Évaluation et Impact</span>
                    </NavLink>

                    <NavLink to="/manager/cab" className={({ isActive }) => `manager-nav-item ${isActive ? 'active' : ''}`}>
                        <FiUsers className="nav-icon" />
                        <span className="nav-label">Planification CAB</span>
                    </NavLink>

                    <NavLink to="/cab" className={({ isActive }) => `manager-nav-item ${isActive ? 'active' : ''}`}>
                        <FiShield className="nav-icon" />
                        <span className="nav-label">CAB Dashboard</span>
                    </NavLink>

                    <NavLink to="/manager/changements" className={({ isActive }) => `manager-nav-item ${isActive ? 'active' : ''}`}>
                        <FiFileText className="nav-icon" />
                        <span className="nav-label">Gestion des changements</span>
                    </NavLink>

                    <NavLink to="/manager/implementation" className={({ isActive }) => `manager-nav-item ${isActive ? 'active' : ''}`}>
                        <FiCheckSquare className="nav-icon" />
                        <span className="nav-label">Suivi Implémentation</span>
                    </NavLink>

                    <div className="sidebar-logout-container">
                        <button 
                            onClick={handleLogout}
                            className="common-logout-btn"
                        >
                            <span className="nav-icon"><FiLogOut /></span>
                            <span className="nav-label">Déconnexion</span>
                        </button>
                    </div>
                </nav>

                <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div className="system-status" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.8rem', fontWeight: 'bold' }}>
                        <div className="status-dot" style={{ width: '8px', height: '8px', background: '#10b981', borderRadius: '50%', boxShadow: '0 0 8px #10b981' }}></div>
                        <span>Système Opérationnel</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="manager-main">
                {/* Header Moderne */}
                <header className="manager-header">
                    <div className="header-left">
                        <button className="mobile-menu-btn"><FiMenu /></button>
                        <h2 className="header-title">Espace Change Manager</h2>
                    </div>

                    <div className="header-right">
                        <div 
                          className={`manager-user-profile ${showDropdown ? 'open' : ''}`} 
                          onClick={() => setShowDropdown(!showDropdown)}
                          style={{ position: 'relative', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px' }}
                        >
                            <div className="user-info" style={{ textAlign: 'right' }}>
                                <span className="user-name" style={{ display: 'block', fontWeight: '700', fontSize: '0.9rem', color: 'white' }}>{user?.prenom_user} {user?.nom_user}</span>
                                <span className="user-role-label" style={{ display: 'block', fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: '500' }}>Gestionnaire de Changement</span>
                            </div>
                            <div className="avatar-premium">
                                {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
                                <div className="dropdown-arrow-premium">
                                    <FiChevronDown />
                                </div>
                            </div>

                            {showDropdown && (
                               <div className="user-option-menu">
                                 <div className="dropdown-email" style={{ padding: '0.75rem 1rem', fontSize: '0.75rem', color: '#64748b', borderBottom: '1px solid #f1f5f9', marginBottom: '0.25rem' }}>
                                    {user?.email_user}
                                </div>
                                 <button className="menu-item-btn" onClick={() => { setShowDropdown(false); navigate('/profile'); }}>
                                  <FiUser /> <span>Mon Profil</span>
                                </button>
                                 <button className="menu-item-btn red" onClick={handleLogout}>
                                  <FiLogOut /> <span>Déconnexion</span>
                                </button>
                              </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="manager-inner-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default ChangeManagerLayout;
