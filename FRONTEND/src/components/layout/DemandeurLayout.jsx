import { FiGrid, FiFileText } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/demandeur', icon: <FiGrid />,     label: 'Tableau de Bord', end: true },
  { path: '/mes-rfcs',  icon: <FiFileText />, label: 'Mes Demandes (RFC)' },
];

const DemandeurLayout = ({ children }) => (
  <RoleLayout
    navItems={NAV_ITEMS}
    brandName="ITIL CASNOS"
    roleName="Espace Demandeur"
    headerTitle="Espace Demandeur"
    roleLabel="Demandeur"
  >
    {children}
  </RoleLayout>
);

export default DemandeurLayout;
