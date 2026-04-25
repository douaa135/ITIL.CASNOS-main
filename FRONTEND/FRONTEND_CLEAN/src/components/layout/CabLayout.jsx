import { FiGrid, FiTarget, FiCalendar } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/cab',          end: true, icon: <FiGrid />,     label: 'Tableau de Bord' },
  { path: '/cab/rfcs',               icon: <FiTarget />,   label: 'Évaluation RFCs' },
  { path: '/cab/meetings',           icon: <FiCalendar />, label: 'Réunions & PV' },
];

const CabLayout = ({ children }) => (
  <RoleLayout
    navItems={NAV_ITEMS}
    brandName="Membre CAB"
    roleName="Comité Consultatif"
    headerTitle="Espace CAB"
    roleLabel="Expert CAB"
  >
    {children}
  </RoleLayout>
);

export default CabLayout;
