import { FiGrid, FiTarget, FiCalendar } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/cab/meetings',           icon: <FiCalendar />, label: 'Réunions CAB' },
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
