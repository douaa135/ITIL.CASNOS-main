import {
  FiGrid, FiUsers, FiDatabase, FiFileText, FiSliders, FiClipboard, FiRefreshCw, FiBriefcase, FiGlobe, FiCheckSquare, FiCalendar, FiActivity, FiRadio
} from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/admin',       icon: <FiGrid />,     label: 'Tableau de Bord', end: true },
  { path: '/admin/users', icon: <FiUsers />,    label: 'Comptes et RBAC' },
  { path: '/admin/rfcs',  icon: <FiClipboard />, label: 'Gestion RFC', end: true },
  { path: '/admin/changes', icon: <FiRefreshCw />, label: 'Gestion Changements' },
  { path: '/admin/tasks', icon: <FiCheckSquare />, label: 'Gestion Tâches' },
  { path: '/admin/cab', icon: <FiUsers />, label: 'CAB', end: true },
  { path: '/admin/cab/meetings', icon: <FiCalendar />, label: 'Réunions CAB' },
  { path: '/admin/planning', icon: <FiCalendar />, label: 'Planification' },
  { path: '/admin/implementation', icon: <FiActivity />, label: 'Suivi Implémentation' },
  { path: '/admin/reports', icon: <FiFileText />, label: 'Rapports ITIL' },

  { path: '/admin/directions', icon: <FiBriefcase />, label: 'Directions' },
  { path: '/admin/environments', icon: <FiGlobe />, label: 'Env & Workflow' },
  { path: '/admin/cis',   icon: <FiDatabase />, label: 'Gestion des CIs' },
  { path: '/admin/broadcast', icon: <FiRadio />, label: 'Centre de Diffusion' },

  { path: '/admin/rfcs/history', icon: <FiClipboard />, label: 'Historique' },
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
