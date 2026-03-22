import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './store/auth';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { VmList } from './pages/VmList';
import { VmDetail } from './pages/VmDetail';
import { CreateVm } from './pages/CreateVm';
import { Hypervisors } from './pages/Hypervisors';
import { Templates } from './pages/Templates';
import { Logs } from './pages/Logs';
import { Settings } from './pages/Settings';
import { Updates } from './pages/Updates';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-950">
        <div className="text-surface-500">Caricamento...</div>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
}

export default function App() {
  const { checkAuth, isAuthenticated } = useAuth();

  useEffect(() => { checkAuth(); }, []);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <Login />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="vms" element={<VmList />} />
          <Route path="vms/:hypervisorId/:vmId" element={<VmDetail />} />
          <Route path="create" element={<CreateVm />} />
          <Route path="hypervisors" element={<Hypervisors />} />
          <Route path="templates" element={<Templates />} />
          <Route path="logs" element={<Logs />} />
          <Route path="settings" element={<Settings />} />
          <Route path="updates" element={<Updates />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
