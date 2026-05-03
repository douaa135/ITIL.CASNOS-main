import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import authService from './services/authService';
import { ROLE_ROUTES } from './utils/constants';

// ── Layouts ───────────────────────────────────────────────────
import AdminLayout          from './components/layout/AdminLayout';
import DemandeurLayout      from './components/layout/DemandeurLayout';
import ChangeManagerLayout  from './components/layout/ChangeManagerLayout';
import ImplementerLayout    from './components/layout/ImplementerLayout';
import ServiceDeskLayout    from './components/layout/ServiceDeskLayout';
import CabLayout            from './components/layout/CabLayout';

// ── Pages communes ────────────────────────────────────────────
import Login   from './pages/Login';
import Profile from './pages/Profile';
import Notifications from './pages/Notifications';

// ── Admin ─────────────────────────────────────────────────────
import AdminSystemDashboard from './pages/admin/AdminSystemDashboard';
import UserManagement       from './pages/admin/UserManagement';
import CiManagement         from './pages/admin/CiManagement';
import AuditLog             from './pages/admin/AuditLog';
import BroadcastCenter      from './pages/admin/BroadcastCenter';
import EnvironmentManagement from './pages/admin/SystemSettings';
import AdminChangementList  from './pages/admin/AdminChangementList';
import DirectionManagement  from './pages/admin/DirectionManagement';
import TaskManagement from './pages/admin/TaskManagement';
import AdminCabManagement from './pages/admin/AdminCabManagement';


// ── Demandeur ─────────────────────────────────────────────────
import DemandeurDashboard from './pages/demandeur/DemandeurDashboard';
import RfcList            from './pages/demandeur/RfcList';
import RfcCreate          from './pages/demandeur/RfcCreate';
import RfcDetail          from './pages/demandeur/RfcDetail';
import RfcReview          from './pages/demandeur/RfcReview';
import RfcHistory         from './pages/demandeur/RfcHistory';

// ── Change Manager ────────────────────────────────────────────
import ChangeManagerDashboard from './pages/changemanager/ChangeManagerDashboard';
import RfcManagement          from './pages/changemanager/RfcManagement';
import RfcEvaluation          from './pages/changemanager/RfcEvaluation';
import RfcEdit                from './pages/changemanager/RfcEdit';
import CabManagement          from './pages/changemanager/CabManagement';
import ChangeManagement       from './pages/changemanager/ChangeManagement';
import ChangeCalendar         from './pages/changemanager/ChangeCalendar';
import ImplementationTracker  from './pages/changemanager/ImplementationTracker';

// ── Implémenteur ──────────────────────────────────────────────
import ImplementerDashboard from './pages/implementeur/ImplementerDashboard';
import MyTasks              from './pages/implementeur/MyTasks';

// ── Service Desk ──────────────────────────────────────────────
import ServiceDeskDashboard from './pages/servicedesk/ServiceDeskDashboard';
import InquiryHub           from './pages/servicedesk/InquiryHub';
import Broadcaster          from './pages/servicedesk/Broadcaster';

// ── CAB ───────────────────────────────────────────────────────
import CabDashboard       from './pages/cab/CabDashboard';
import RfcEvaluationList  from './pages/cab/RfcEvaluationList';
import RfcEvaluationForm  from './pages/cab/RfcEvaluationForm';
import CabMeetings        from './pages/cab/CabMeetings';

// ─────────────────────────────────────────────────────────────
// ProtectedRoute — redirige vers /login si non authentifié
// ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const user = authService.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

// ─────────────────────────────────────────────────────────────
// DashboardRedirect — redirige selon le rôle
// ─────────────────────────────────────────────────────────────
const DashboardRedirect = () => {
  const user = authService.getCurrentUser();
  const role = user?.roles?.[0];
  const destination = ROLE_ROUTES[role] ?? '/login';
  return <Navigate to={destination} replace />;
};

// ─────────────────────────────────────────────────────────────
// ProfileWrapper — entoure Profile avec le bon layout selon le rôle
// ─────────────────────────────────────────────────────────────
const ProfileWrapper = () => {
  const user = authService.getCurrentUser();
  const role = user?.roles?.[0];

  const layouts = {
    ADMIN:          AdminLayout,
    CHANGE_MANAGER: ChangeManagerLayout,
    DEMANDEUR:      DemandeurLayout,
    SERVICE_DESK:   ServiceDeskLayout,
    IMPLEMENTEUR:   ImplementerLayout,
    MEMBRE_CAB:     CabLayout,
  };

  const Layout = layouts[role];
  if (!Layout) return <div style={{ padding: '2rem' }}><Profile /></div>;
  return <Layout><Profile /></Layout>;
};

const NotificationsWrapper = () => {
  const user = authService.getCurrentUser();
  const role = user?.roles?.[0];

  const layouts = {
    ADMIN:          AdminLayout,
    CHANGE_MANAGER: ChangeManagerLayout,
    DEMANDEUR:      DemandeurLayout,
    SERVICE_DESK:   ServiceDeskLayout,
    IMPLEMENTEUR:   ImplementerLayout,
    MEMBRE_CAB:     CabLayout,
  };

  const Layout = layouts[role];
  if (!Layout) return <div style={{ padding: '2rem' }}><Notifications /></div>;
  return <Layout><Notifications /></Layout>;
};

// ─────────────────────────────────────────────────────────────
// Placeholder pour les sections en cours de développement
// ─────────────────────────────────────────────────────────────
const Placeholder = ({ title }) => (
  <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem' }}>
      {title}
    </h1>
    <div style={{
      background: 'white', padding: '3rem', borderRadius: '16px',
      border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b',
    }}>
      <p style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>
        Module en cours de développement
      </p>
      <p>Cette section correspond aux spécifications ITIL configurées.</p>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────
// App — Arbre de routes
// ─────────────────────────────────────────────────────────────
function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />

          {/* Redirect root */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

          {/* Profile & Notifications (layout dynamique selon le rôle) */}
          <Route path="/profile" element={<ProtectedRoute><ProfileWrapper /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsWrapper /></ProtectedRoute>} />

          {/* ── Admin ────────────────────────────────────────── */}
          <Route path="/admin-system" element={
            <ProtectedRoute><AdminLayout><AdminSystemDashboard /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/users" element={
            <ProtectedRoute><AdminLayout><UserManagement /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/rfcs" element={
            <ProtectedRoute><AdminLayout><RfcManagement /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/cis" element={
            <ProtectedRoute><AdminLayout><CiManagement /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/audit" element={
            <ProtectedRoute><AdminLayout><AuditLog /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/broadcast" element={
            <ProtectedRoute><AdminLayout><BroadcastCenter /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/settings" element={
            <ProtectedRoute><AdminLayout><EnvironmentManagement /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/cab" element={
            <ProtectedRoute><AdminLayout><AdminCabManagement /></AdminLayout></ProtectedRoute>
          } />

          <Route path="/admin-system/cab/meetings" element={
            <ProtectedRoute><AdminLayout><CabMeetings /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/changes" element={
            <ProtectedRoute><AdminLayout><AdminChangementList /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/directions" element={
            <ProtectedRoute><AdminLayout><DirectionManagement /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/environments" element={
            <ProtectedRoute><AdminLayout><EnvironmentManagement /></AdminLayout></ProtectedRoute>
          } />
          <Route path="/admin-system/tasks" element={
            <ProtectedRoute><AdminLayout><TaskManagement /></AdminLayout></ProtectedRoute>
          } />

          {/* ── Demandeur ────────────────────────────────────── */}
          <Route element={<ProtectedRoute><DemandeurLayout /></ProtectedRoute>}>
            <Route path="/demandeur"        element={<DemandeurDashboard />} />
            <Route path="/mes-rfcs"         element={<RfcList />} />
            <Route path="/historique"       element={<RfcHistory />} />
            <Route path="/rfcs/new"         element={<RfcCreate />} />
            <Route path="/rfcs/:id"         element={<RfcDetail />} />
            <Route path="/rfcs/:id/review"  element={<RfcReview />} />
          </Route>

          {/* ── Change Manager ───────────────────────────────── */}
          <Route element={<ProtectedRoute><ChangeManagerLayout /></ProtectedRoute>}>
            <Route path="/manager"                    element={<ChangeManagerDashboard />} />
            <Route path="/manager/rfcs"               element={<RfcManagement />} />
            <Route path="/manager/rfcs/:id/evaluation"  element={<RfcEvaluation />} />
            <Route path="/manager/cab"                element={<CabManagement />} />
            <Route path="/manager/changements"        element={<ChangeManagement />} />
            <Route path="/manager/calendar"           element={<ChangeCalendar />} />
            <Route path="/manager/implementation"     element={<ImplementationTracker />} />
            <Route path="/rfcs/:id/edit"              element={<RfcEdit />} />
          </Route>

          {/* ── Implémenteur ─────────────────────────────────── */}
          <Route element={<ProtectedRoute><ImplementerLayout /></ProtectedRoute>}>
            <Route path="/implementer"         element={<ImplementerDashboard />} />
            <Route path="/implementer/tasks"   element={<MyTasks />} />
            <Route path="/implementer/history" element={<Placeholder title="Historique d'exécution" />} />
          </Route>

          {/* ── Service Desk ─────────────────────────────────── */}
          <Route element={<ProtectedRoute><ServiceDeskLayout /></ProtectedRoute>}>
            <Route path="/servicedesk"           element={<ServiceDeskDashboard />} />
            <Route path="/servicedesk/inquiry"   element={<InquiryHub />} />
            <Route path="/servicedesk/calendar"  element={<ChangeCalendar />} />
            <Route path="/servicedesk/broadcast" element={<Broadcaster />} />
          </Route>

          {/* ── CAB ──────────────────────────────────────────── */}
          <Route element={<ProtectedRoute><CabLayout /></ProtectedRoute>}>
            <Route path="/cab"                      element={<CabDashboard />} />
            <Route path="/cab/rfcs"                 element={<RfcEvaluationList />} />
            <Route path="/cab/rfcs/:id/evaluate"    element={<RfcEvaluationForm />} />
            <Route path="/cab/meetings"             element={<CabMeetings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
