import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AuthService from './services/auth.service';
import { AuthProvider } from './context/AuthContext';
import AdminSystemDashboard from './pages/admin/AdminSystemDashboard';
import UserManagement from './pages/admin/UserManagement';
import AdminLayout from './components/layout/AdminLayout';
import Profile from './pages/common/Profile';
import { FiUser } from 'react-icons/fi';

// Demandeur Imports
import MesRfcs from './pages/demandeur/demandeur';
import RfcCreate from './pages/demandeur/RfcCreate';
import RfcDetail from './pages/demandeur/RfcDetail';
import RfcReview from './pages/demandeur/RfcReview';
import DemandeurDashboard from './pages/demandeur/DemandeurDashboard';
import HistoriqueRfc from './pages/demandeur/HistoriqueRfc';
import DemandeurLayout from './components/layout/DemandeurLayout';

// Change Manager Imports
import ChangeManagerLayout from './components/layout/ChangeManagerLayout';
import ChangeManagerDashboard from './pages/changemanager/Dashboard';
import RfcManagement from './pages/changemanager/RfcManagement';
import RfcEvaluation from './pages/changemanager/RfcEvaluation';
import RfcEdit from './pages/changemanager/RfcEdit';
import CabManagement from './pages/changemanager/CabManagement';

import ChangeCalendar from './pages/changemanager/ChangeCalendar';
import ImplementationTracker from './pages/changemanager/ImplementationTracker';
import ChangeManagement from './pages/changemanager/ChangeManagement';

// Implementer Imports
import ImplementerLayout from './components/layout/ImplementerLayout';
import ImplementerDashboard from './pages/implementeur/Dashboard';
import MyTasks from './pages/implementeur/MyTasks';

// Service Desk Imports
import ServiceDeskLayout from './components/layout/ServiceDeskLayout';
import ServiceDeskDashboard from './pages/servicedesk/Dashboard';
import InquiryHub from './pages/servicedesk/InquiryHub';
import Broadcaster from './pages/servicedesk/Broadcaster';

// CAB Imports
import CabDashboard from './pages/cab/dashboard';
import CabLayout from './components/layout/CabLayout';
import RfcEvaluationList from './pages/cab/RfcEvaluationList';
import RfcEvaluationForm from './pages/cab/RfcEvaluationForm';
import CabMeetings from './pages/cab/CabMeetings';




// Simple ProtectedRoute component
const ProtectedRoute = ({ children }) => {
  const user = AuthService.getCurrentUser();
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Smart Dashboard Redirector
const DashboardPlaceholder = () => {
  const user = AuthService.getCurrentUser();
  const role = user?.roles?.[0]; // Assuming first role is primary

  if (role === 'ADMIN_SYSTEME') return <Navigate to="/admin-system" replace />;
  if (role === 'CHANGE_MANAGER') return <Navigate to="/manager" replace />;
  if (role === 'MEMBRE_CAB') return <Navigate to="/cab" replace />;
  if (role === 'DEMANDEUR') return <Navigate to="/demandeur" replace />;
  if (role === 'SERVICE_DESK') return <Navigate to="/servicedesk" replace />;
  if (role === 'IMPLEMENTEUR') return <Navigate to="/implementer/tasks" replace />;

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Dashboard ITIL CASNOS</h1>
      <p>Bienvenue, {user?.prenom_user} {user?.nom_user} !</p>
      <p>Rôle : {user?.roles?.join(', ')}</p>
      <button 
        onClick={() => { AuthService.logout(); window.location.reload(); }}
        style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
      >
        Se déconnecter
      </button>
    </div>
  );
};

const AdminPlaceholder = ({ title }) => (
  <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
    <h1 style={{ fontSize: '1.8rem', fontWeight: '800', color: '#0f172a', marginBottom: '1rem' }}>{title}</h1>
    <div style={{ background: 'white', padding: '3rem', borderRadius: '16px', border: '1px dashed #cbd5e1', textAlign: 'center', color: '#64748b' }}>
      <p style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '0.5rem' }}>Module en cours de développement</p>
      <p>Cette section correspond aux spécifications UML de la configuration ITIL.</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <DashboardPlaceholder />
              </ProtectedRoute>
            } 
          />
          <Route path="/admin-system" element={<ProtectedRoute><AdminLayout><AdminSystemDashboard /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin-system/users" element={<ProtectedRoute><AdminLayout><UserManagement /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin-system/change-types" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Configuration des types de changements" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin-system/cis" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Gestion du référentiel CIs" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin-system/audit" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Journaux d'audit Logs" /></AdminLayout></ProtectedRoute>} />
          <Route path="/admin-system/settings" element={<ProtectedRoute><AdminLayout><AdminPlaceholder title="Paramétrages système" /></AdminLayout></ProtectedRoute>} />
          
          {/* Demandeur Routes */}
          <Route element={<ProtectedRoute><DemandeurLayout /></ProtectedRoute>}>
            <Route path="/demandeur" element={<DemandeurDashboard />} />
            <Route path="/mes-rfcs" element={<MesRfcs />} />
            <Route path="/historique" element={<HistoriqueRfc />} />
            <Route path="/rfcs/new" element={<RfcCreate />} />
            <Route path="/rfcs/:id" element={<RfcDetail />} />
            <Route path="/rfcs/:id/review" element={<RfcReview />} />
          </Route>

          {/* Change Manager Routes */}
          <Route element={<ProtectedRoute><ChangeManagerLayout /></ProtectedRoute>}>
            <Route path="/manager" element={<ChangeManagerDashboard />} />
            <Route path="/manager/rfcs" element={<RfcManagement />} />
            <Route path="/rfcs/:id/edit" element={<RfcEdit />} />
            <Route path="/manager/cab" element={<CabManagement />} />
            <Route path="/manager/changements" element={<ChangeManagement />} />
            <Route path="/manager/calendar" element={<ChangeCalendar />} />
            <Route path="/manager/implementation" element={<ImplementationTracker />} />
          </Route>

          {/* Implementer Routes */}
          <Route element={<ProtectedRoute><ImplementerLayout /></ProtectedRoute>}>
            <Route path="/implementer" element={<ImplementerDashboard />} />
            <Route path="/implementer/tasks" element={<MyTasks />} />
            <Route path="/implementer/history" element={<AdminPlaceholder title="Historique d'exécution" />} />
          </Route>

          {/* Service Desk Routes */}
          <Route element={<ProtectedRoute><ServiceDeskLayout /></ProtectedRoute>}>
            <Route path="/servicedesk" element={<ServiceDeskDashboard />} />
            <Route path="/servicedesk/inquiry" element={<InquiryHub />} />
            <Route path="/servicedesk/calendar" element={<ChangeCalendar />} />
            <Route path="/servicedesk/broadcast" element={<Broadcaster />} />
          </Route>

          {/* CAB Routes */}
          <Route element={<ProtectedRoute><CabLayout /></ProtectedRoute>}>
            <Route path="/cab" element={<CabDashboard />} />
            <Route path="/cab/rfcs" element={<RfcEvaluationList />} />
            <Route path="/cab/rfcs/:id/evaluate" element={<RfcEvaluationForm />} />
            <Route path="/cab/meetings" element={<CabMeetings />} />
          </Route>
          
          <Route path="/profile" element={
            <ProtectedRoute>
              {/* Dynamic layout selection based on role or simple default */}
              <DashboardWrapper>
                <Profile />
              </DashboardWrapper>
            </ProtectedRoute>
          } />
          
          <Route path="/rfcs" element={<Navigate to="/demandeur" replace />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Wrapper to provide layout for standalone pages like Profile
const DashboardWrapper = ({ children }) => {
  const user = AuthService.getCurrentUser();
  const role = user?.roles?.[0];

  if (role === 'ADMIN_SYSTEME') return <AdminLayout>{children}</AdminLayout>;
  if (role === 'CHANGE_MANAGER') return <ChangeManagerLayout>{children}</ChangeManagerLayout>;
  if (role === 'DEMANDEUR') return <DemandeurLayout>{children}</DemandeurLayout>;
  if (role === 'SERVICE_DESK') return <ServiceDeskLayout>{children}</ServiceDeskLayout>;
  if (role === 'IMPLEMENTEUR') return <ImplementerLayout>{children}</ImplementerLayout>;
  if (role === 'MEMBRE_CAB') return <CabLayout>{children}</CabLayout>;

  return <div style={{ padding: '2rem' }}>{children}</div>;
};

export default App;
