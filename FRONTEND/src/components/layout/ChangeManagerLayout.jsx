import { FiGrid, FiFileText, FiUsers, FiCheckSquare, FiShield } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/manager',                end: true, icon: <FiGrid />,        label: 'Tableau de Bord' },
  { path: '/manager/rfcs',                      icon: <FiFileText />,    label: 'Évaluation & Impact' },
  { path: '/manager/changements',               icon: <FiFileText />,    label: 'Gestion Changements' },
  { path: '/manager/tasks',                     icon: <FiCheckSquare />, label: 'Gestion Tâches' },
  { path: '/manager/cab',                       icon: <FiShield />,      label: 'Comité CAB', end: true },
  { path: '/manager/cab/meetings',              icon: <FiUsers />,       label: 'Réunions CAB' },
  { path: '/manager/implementation',            icon: <FiCheckSquare />, label: 'Suivi Implémentation' },
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
