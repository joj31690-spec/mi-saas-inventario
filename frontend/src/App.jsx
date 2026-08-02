import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import BusinessSelection from './pages/BusinessSelection';
import AdminDashboard from './pages/AdminDashboard';
import WorkerDashboard from './pages/WorkerDashboard';
import Inventory from './pages/Inventory';
import Menu from './pages/Menu';
import Users from './pages/Users';
import Personal from './pages/Personal';
import Sales from './pages/Sales';
import Finances from './pages/Finances';
import AdminLayout from './components/AdminLayout';
import SaasAdminLayout from './layouts/SaasAdminLayout';
import UserManagement from './pages/SaasAdmin/UserManagement';
import { BusinessProvider, useBusiness } from './context/BusinessContext';

function AppContent() {
  const { selectedBusiness, isLoading } = useBusiness();

  // Protege las rutas basadas en el rol del sistema (ADMIN o CEO)
  const ProtectedRoute = ({ children, requireBusiness = true, allowedSystemRole = 'CEO', requiredBusinessRole = null }) => {
    const token = localStorage.getItem('token');
    const systemRole = localStorage.getItem('systemRole');
    
    if (!token) return <Navigate to="/" replace />;
    if (systemRole !== allowedSystemRole) {
      // Si un ADMIN intenta entrar a rutas de CEO
      if (systemRole === 'ADMIN') return <Navigate to="/saas-admin" replace />;
      // Si un CEO intenta entrar a rutas de ADMIN
      if (systemRole === 'CEO') return <Navigate to="/businesses" replace />;
      return <Navigate to="/" replace />;
    }
    
    if (requireBusiness && allowedSystemRole === 'CEO') {
      if (isLoading) return <div>Cargando sesión...</div>;
      if (!selectedBusiness) return <Navigate to="/businesses" replace />;
      
      if (requiredBusinessRole && selectedBusiness.role !== requiredBusinessRole) {
        return <Navigate to="/admin" replace />;
      }
    }
    
    return children;
  };

  return (
    <Routes>
      <Route path="/" element={<Login />} />

      {/* Rutas exclusivas del Administrador del SaaS */}
      <Route 
        path="/saas-admin" 
        element={
          <ProtectedRoute allowedSystemRole="ADMIN" requireBusiness={false}>
            <SaasAdminLayout>
              <UserManagement />
            </SaasAdminLayout>
          </ProtectedRoute>
        } 
      />

      {/* Selector de Negocios para CEOs */}
      <Route 
        path="/businesses" 
        element={
          <ProtectedRoute allowedSystemRole="CEO" requireBusiness={false}>
            <BusinessSelection />
          </ProtectedRoute>
        } 
      />
      
      {/* Rutas del Dashboard del Negocio (CEOs) */}
      <Route 
        path="/admin" 
        element={
          <ProtectedRoute allowedSystemRole="CEO">
            <AdminLayout>
              <AdminDashboard />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/inventory" 
        element={
          <ProtectedRoute allowedSystemRole="CEO">
            <AdminLayout>
              <Inventory />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/menu" 
        element={
          <ProtectedRoute allowedSystemRole="CEO">
            <AdminLayout>
              <Menu />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/users" 
        element={
          <ProtectedRoute allowedSystemRole="CEO">
            <AdminLayout>
              <Users />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/personal" 
        element={
          <ProtectedRoute allowedSystemRole="CEO">
            <AdminLayout>
              <Personal />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/sales" 
        element={
          <ProtectedRoute allowedSystemRole="CEO">
            <AdminLayout>
              <Sales />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/admin/finances" 
        element={
          <ProtectedRoute allowedSystemRole="CEO" requiredBusinessRole="CEO">
            <AdminLayout>
              <Finances />
            </AdminLayout>
          </ProtectedRoute>
        } 
      />

      <Route path="/trabajador" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <Router>
      <BusinessProvider>
        <AppContent />
      </BusinessProvider>
    </Router>
  );
}

export default App;
