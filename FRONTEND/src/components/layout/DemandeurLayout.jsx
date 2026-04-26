import React from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { 
  FiGrid, FiFileText, FiRotateCcw, FiLogOut, 
  FiUser, FiBell, FiChevronDown, FiMenu 
} from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import './DemandeurLayout.css';
import './LayoutCommon.css';

const DemandeurLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = React.useState(false);

    const menuItems = [
        { path: '/demandeur', icon: <FiGrid />, label: 'Tableau de Bord' },
        { path: '/mes-rfcs', icon: <FiFileText />, label: 'Mes Demandes (RFC)' },
    ];

    return (
        <div className="demandeur-container">
            {/* Sidebar */}
            <aside className="demandeur-sidebar">
                <div className="sidebar-logo">
                    <img src="/logo.png" alt="CASNOS Logo" />
                    <span>ITIL CASNOS</span>
                </div>
                
                <nav className="sidebar-nav">
                    {menuItems.map((item, idx) => (
                        <NavLink 
                            key={idx} 
                            to={item.path} 
                            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="nav-icon">{item.icon}</span>
                            <span className="nav-label">{item.label}</span>
                        </NavLink>
                    ))}

                    <div style={{ marginTop: 'auto', padding: '1rem 0.75rem' }}>
                        <button 
                            onClick={logout}
                            style={{ 
                                display: 'flex', alignItems: 'center', gap: '12px', width: '100%', 
                                padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', 
                                border: '1px solid rgba(255,255,255,0.1)', color: 'white', 
                                borderRadius: '8px', cursor: 'pointer', fontWeight: '500' 
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        >
                            <FiLogOut />
                            <span>Déconnexion</span>
                        </button>
                    </div>
                </nav>
                <div className="sidebar-footer" style={{ padding: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
                    <span>DMSI System • v1.0</span>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="demandeur-main">
                {/* Header Premium Blue Demandeur */}
                <header className="demandeur-header">
                    <div className="header-left">
                        <button className="mobile-menu-btn"><FiMenu /></button>
                        <h2 className="page-title">Espace Demandeur</h2>
                    </div>

                    <div className="header-right">
                        <div className="header-actions">
                            <button className="action-btn" style={{ background: 'rgba(255, 255, 255, 0.1)', border: 'none', color: 'white', width: '40px', height: '40px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' }}>
                                <FiBell />
                                <span style={{ position: 'absolute', top: '10px', right: '10px', width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--demandeur-primary)' }}></span>
                            </button>
                        </div>

                        <div 
                          className={`user-profile ${showDropdown ? 'open' : ''}`} 
                          onClick={() => setShowDropdown(!showDropdown)}
                        >
                            <div className="user-info">
                                <span className="user-name">{user?.prenom_user} {user?.nom_user}</span>
                                <span className="user-role">{user?.roles?.[0] || 'Demandeur'}</span>
                            </div>
                            <div className="user-avatar">
                                {user?.prenom_user?.[0]}{user?.nom_user?.[0]}
                                <div style={{ position: 'absolute', bottom: '-5px', right: '-15px', fontSize: '0.7rem' }}>
                                    <FiChevronDown />
                                </div>
                            </div>

                            {showDropdown && (
                              <div className="logout-dropdown">
                                <div className="dropdown-email">
                                    {user?.email_user}
                                </div>
                                <button className="sd-logout-dropdown-item" onClick={() => { setShowDropdown(false); navigate('/profile'); }}>
                                  <FiUser /> <span>Mon Profil</span>
                                </button>
                                <button className="sd-logout-dropdown-item logout" onClick={logout}>
                                  <FiLogOut /> <span>Déconnexion</span>
                                </button>
                              </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="demandeur-content">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default DemandeurLayout;
