import { FiHome, FiSearch, FiRadio } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/servicedesk',          end: true, icon: <FiHome />,   label: 'Tableau de Bord' },
  { path: '/servicedesk/inquiry',             icon: <FiSearch />, label: 'Analyse & Évaluation' },
  { path: '/servicedesk/broadcast',           icon: <FiRadio />,  label: 'Diffusions' },
];

const ServiceDeskLayout = ({ children }) => (
  <RoleLayout
    navItems={NAV_ITEMS}
    brandName="Service Desk"
    roleName="Portail opérationnel"
    headerTitle="Portail Service Desk"
    roleLabel="Service Desk"
  >
    {children}
  </RoleLayout>
);

export default ServiceDeskLayout;
