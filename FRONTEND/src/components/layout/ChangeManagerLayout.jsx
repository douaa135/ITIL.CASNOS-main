import { FiGrid, FiFileText, FiUsers, FiCheckSquare, FiShield, FiCalendar, FiClipboard, FiRefreshCw, FiActivity } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/manager',                end: true, icon: <FiGrid />,        label: 'Tableau de Bord' },
  { path: '/manager/rfcs',                end: true, icon: <FiClipboard />,    label: 'Gestion RFC' },
  { path: '/manager/changements',               icon: <FiRefreshCw />,    label: 'Gestion Changements' },
  { path: '/manager/tasks',                     icon: <FiCheckSquare />, label: 'Gestion Tâches' },
  { path: '/manager/cab',                       icon: <FiShield />,      label: 'Comité CAB', end: true },
  { path: '/manager/cab/meetings',              icon: <FiCalendar />,       label: 'Réunions CAB' },
  { path: '/manager/planning',                  icon: <FiCalendar />,    label: 'Planification' },
  { path: '/manager/implementation',            icon: <FiActivity />, label: 'Suivi Implémentation' },
  { path: '/manager/rfcs/history',              icon: <FiClipboard />,    label: 'Historique' },
];

const ChangeManagerLayout = ({ children }) => (
  <RoleLayout
    navItems={NAV_ITEMS}
    brandName="Change Manager"
    roleName="Portail Implémentation"
    headerTitle="Espace Change Manager"
    roleLabel="Gestionnaire de Changement"
  >
    {children}
  </RoleLayout>
);

export default ChangeManagerLayout;
