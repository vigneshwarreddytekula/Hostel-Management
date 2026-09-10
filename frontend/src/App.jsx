import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Layout from './components/Layout';
import Protected from './components/Protected';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import HostelSearch from './pages/HostelSearch';
import HostelDetail from './pages/HostelDetail';
import TenantDashboard from './pages/TenantDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Notifications from './pages/Notifications';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="search" element={<HostelSearch />} />
            <Route path="hostels/:id" element={<HostelDetail />} />
            <Route
              path="tenant"
              element={<Protected roles={['TENANT']}><TenantDashboard /></Protected>}
            />
            <Route
              path="owner"
              element={<Protected roles={['OWNER', 'ADMIN']}><OwnerDashboard /></Protected>}
            />
            <Route
              path="admin"
              element={<Protected roles={['ADMIN']}><AdminDashboard /></Protected>}
            />
            <Route
              path="notifications"
              element={<Protected><Notifications /></Protected>}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
