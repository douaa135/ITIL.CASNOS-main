import {
  FiGrid, FiUsers, FiDatabase, FiFileText, FiSliders, FiClipboard, FiRefreshCw, FiBriefcase, FiGlobe, FiCheckSquare, FiCalendar
} from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/admin',       icon: <FiGrid />,     label: 'Tableau de Bord', end: true },
  { path: '/admin/users', icon: <FiUsers />,    label: 'Comptes et RBAC' },
  { path: '/admin/rfcs',  icon: <FiClipboard />, label: 'Gestion RFC' },
  { path: '/admin/changes', icon: <FiRefreshCw />, label: 'Gestion Changements' },
  { path: '/admin/cab', icon: <FiUsers />, label: 'CAB', end: true },
  { path: '/admin/cab/meetings', icon: <FiCalendar />, label: 'Réunions CAB' },
  { path: '/admin/directions', icon: <FiBriefcase />, label: 'Directions' },
  { path: '/admin/environments', icon: <FiGlobe />, label: 'Environnements & Réf' },
  { path: '/admin/tasks', icon: <FiCheckSquare />, label: 'Gestion Tâches' },
  { path: '/admin/cis',   icon: <FiDatabase />, label: 'Référentiel CIs' },

  { path: '/admin/audit', icon: <FiFileText />, label: "Journaux d'Audit" },
];

const AdminLayout = ({ children }) => (
  <RoleLayout
    navItems={NAV_ITEMS}
    brandName="ITIL Admin"
    roleName="Administration Système"
    headerTitle="Espace Administration"
    roleLabel="Administrateur Système"
  >
    {children}
  </RoleLayout>
);

export default AdminLayout;
