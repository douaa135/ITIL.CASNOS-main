// ============================================================
// RoleLayout.jsx — Composant layout partagé pour tous les rôles
// Chaque layout de rôle instancie ce composant avec ses propres
// navItems, brandName, roleName, et headerTitle.
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { FiLogOut, FiUser, FiChevronDown, FiBell, FiMenu } from 'react-icons/fi';
import { useAuth } from '../../context/AuthContext';
import { getUserInitials } from '../../utils/helpers';
import NotificationCenter from './NotificationCenter';
import './layouts.css';

/**
 * @param {Array}  navItems      — [{ path, icon, label, end? }]
 * @param {string} brandName     — Titre du sidebar (ex: "Change Manager")
 * @param {string} roleName      — Sous-titre du sidebar (ex: "Portail Implémentation")
 * @param {string} headerTitle   — Titre affiché dans le header
 * @param {string} roleLabel     — Label rôle affiché sous le nom user
 * @param {React.ReactNode} children — Si fourni, remplace <Outlet>
 */
const RoleLayout = ({
  navItems = [],
  brandName = 'ITIL CASNOS',
  roleName = '',
  headerTitle = 'Espace ITIL',
  roleLabel = '',
  children,
}) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Ferme le dropdown au clic extérieur
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="itil-layout">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <aside className={`itil-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="itil-sidebar-header">
          <img src="/logo.png" alt="CASNOS" className="itil-sidebar-logo" />
          <div>
            <span className="itil-sidebar-brand">{brandName}</span>
            {roleName && (
              <span className="itil-sidebar-subbrand">{roleName}</span>
            )}
          </div>
        </div>

        <nav className="itil-sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) =>
                `itil-nav-item ${isActive ? 'active' : ''}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <span className="itil-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge != null && (
                <span className="itil-nav-item-badge">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="itil-sidebar-logout">
          <button className="itil-logout-btn" onClick={handleLogout}>
            <FiLogOut />
            <span>Déconnexion</span>
          </button>
        </div>

        <div className="itil-sidebar-footer">DMSI System • v1.0</div>
      </aside>

      {/* ── Main ────────────────────────────────────────────── */}
      <main className="itil-main">
        {/* Header */}
        <header className="itil-header">
          <div className="header-left">
            <button
              className="mobile-menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FiMenu />
            </button>
            <h2 className="itil-page-title">{headerTitle}</h2>
          </div>

          <div className="header-right">
            <NotificationCenter />

            {/* User profile + dropdown */}
            <div
              className="itil-user-profile"
              ref={dropdownRef}
              onClick={() => setShowDropdown((v) => !v)}
            >
              <div className="itil-user-info-text" style={{ textAlign: 'right' }}>
                <span className="itil-user-name">
                  {user?.prenom_user} {user?.nom_user}
                </span>
                <span className="itil-user-role-label">
                  {roleLabel || user?.roles?.[0] || 'Utilisateur'}
                </span>
              </div>
              <div className="itil-avatar">
                {getUserInitials(user)}
                <div className="itil-avatar-arrow">
                  <FiChevronDown />
                </div>
              </div>

              {showDropdown && (
                <div className="itil-dropdown">
                  <div className="itil-dropdown-email">{user?.email_user}</div>
                  <button
                    className="itil-dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDropdown(false);
                      navigate('/profile');
                    }}
                  >
                    <FiUser /> Mon Profil
                  </button>
                  <button
                    className="itil-dropdown-item danger"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                  >
                    <FiLogOut /> Déconnexion
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="itil-content-inner">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
};

export default RoleLayout;
