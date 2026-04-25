import {
  FiGrid, FiUsers, FiDatabase, FiFileText, FiSliders, FiClipboard, FiRadio, FiRefreshCw
} from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/admin-system',       icon: <FiGrid />,     label: 'Tableau de Bord', end: true },
  { path: '/admin-system/users', icon: <FiUsers />,    label: 'Comptes et RBAC' },
  { path: '/admin-system/rfcs',  icon: <FiClipboard />, label: 'Gestion RFC' },
  { path: '/admin-system/changes', icon: <FiRefreshCw />, label: 'Gestion Changements' },
  { path: '/admin-system/cis',   icon: <FiDatabase />, label: 'Référentiel CIs' },
  { path: '/admin-system/broadcast', icon: <FiRadio />, label: 'Diffusion de Masse' },
  { path: '/admin-system/audit', icon: <FiFileText />, label: "Journaux d'Audit" },
  { path: '/admin-system/settings', icon: <FiSliders />, label: 'Paramétrages système' },
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
