import { FiGrid, FiCheckSquare, FiActivity } from 'react-icons/fi';
import RoleLayout from './RoleLayout';

const NAV_ITEMS = [
  { path: '/implementer',         end: true, icon: <FiGrid />,        label: 'Tableau de Bord' },
  { path: '/implementer/tasks',              icon: <FiCheckSquare />, label: 'Mes Tâches' },
  { path: '/implementer/history',            icon: <FiActivity />,    label: 'Historique' },
];

const ImplementerLayout = ({ children }) => (
  <RoleLayout
    navItems={NAV_ITEMS}
    brandName="ITIL Implementer"
    roleName="Exécution des changements"
    headerTitle="Espace Implémenteur"
    roleLabel="Implémenteur Technique"
  >
    {children}
  </RoleLayout>
);

export default ImplementerLayout;
