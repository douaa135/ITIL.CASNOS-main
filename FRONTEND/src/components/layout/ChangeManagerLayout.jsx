import { FiGrid, FiFileText, FiUsers, FiCheckSquare, FiShield } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/manager',                end: true, icon: <FiGrid />,        label: 'Tableau de Bord' },
  { path: '/manager/rfcs',                      icon: <FiFileText />,    label: 'Évaluation & Impact' },
  { path: '/manager/cab',                       icon: <FiUsers />,       label: 'Planification CAB' },
  { path: '/manager/changements',               icon: <FiFileText />,    label: 'Gestion Changements' },
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
